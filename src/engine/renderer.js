// renderer.js — GPU presentation + post-processing layer (Phase 1 seam, Phase 2 FX).
//
// The game renders, exactly as before, to an offscreen 2D canvas at the fixed
// internal resolution (VIEW_W x VIEW_H). Each frame this module uploads that
// finished frame as a texture and presents it to the visible canvas. When the
// FX preset is "off" it's a straight NEAREST passthrough (pixel-identical to the
// original direct-to-canvas path). Otherwise it runs a small post-processing
// chain during the upscale:
//
//   scene ──▶ bright-pass ──▶ blur H ──▶ blur V ─┐ (half-res bloom)
//      └─────────────────────────────────────────┴─▶ finalize ──▶ screen
//                              (composite + grade + vignette + CRT)
//
// When WebGL2 is unavailable it falls back to a plain 2D blit (no FX).
//
// Pixel-art crispness: the scene texture is sampled NEAREST and the visible
// canvas keeps its internal-resolution drawing buffer, integer-upscaled by CSS.

// ---- presets ---------------------------------------------------------------
// A preset is a flat set of effect parameters. "off" short-circuits to a copy.
const PRESETS = {
  off: null,
  soft: {
    bloomThreshold: 0.62,
    bloomKnee: 0.25,
    bloomAmount: 0.55,
    saturation: 1.12,
    contrast: 1.05,
    vignette: 0.28,
    scanline: 0.0,
    aberration: 0.0,
    curvature: 0.0,
  },
  crt: {
    bloomThreshold: 0.6,
    bloomKnee: 0.25,
    bloomAmount: 0.6,
    saturation: 1.15,
    contrast: 1.08,
    vignette: 0.42,
    scanline: 0.35,
    aberration: 0.0018,
    curvature: 0.12,
  },
};
export const FX_PRESETS = Object.keys(PRESETS); // ["off","soft","crt"]

// ---- shaders ---------------------------------------------------------------
const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG_COPY = `#version 300 es
precision highp float;
uniform sampler2D uTex;
in vec2 vUv;
out vec4 frag;
void main() { frag = texture(uTex, vUv); }`;

const FRAG_BRIGHT = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uThreshold, uKnee;
in vec2 vUv;
out vec4 frag;
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(uThreshold, uThreshold + uKnee, l);
  frag = vec4(c * k, 1.0);
}`;

// separable 9-tap Gaussian
const FRAG_BLUR = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;     // texel step along one axis (already includes radius)
in vec2 vUv;
out vec4 frag;
void main() {
  float w[5] = float[5](0.227027, 0.194595, 0.121622, 0.054054, 0.016216);
  vec3 sum = texture(uTex, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 o = uDir * float(i);
    sum += texture(uTex, vUv + o).rgb * w[i];
    sum += texture(uTex, vUv - o).rgb * w[i];
  }
  frag = vec4(sum, 1.0);
}`;

const FRAG_FINAL = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomAmt, uSat, uContrast, uVignette, uScan, uAberr, uCurve;
uniform vec2 uRes;
in vec2 vUv;
out vec4 frag;

void main() {
  vec2 uv = vUv;

  // barrel curvature (CRT) — bends the image outward from centre
  if (uCurve > 0.0) {
    vec2 cc = uv * 2.0 - 1.0;
    cc *= 1.0 + uCurve * dot(cc, cc);
    uv = cc * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      frag = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
  }

  // chromatic aberration — split channels radially from centre
  vec3 col;
  if (uAberr > 0.0) {
    vec2 dir = (uv - 0.5);
    col.r = texture(uScene, uv + dir * uAberr).r;
    col.g = texture(uScene, uv).g;
    col.b = texture(uScene, uv - dir * uAberr).b;
  } else {
    col = texture(uScene, uv).rgb;
  }

  // additive bloom
  col += texture(uBloom, uv).rgb * uBloomAmt;

  // grade: contrast around 0.5, then saturation
  col = (col - 0.5) * uContrast + 0.5;
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);

  // scanlines
  if (uScan > 0.0) {
    float s = 0.5 + 0.5 * cos(uv.y * uRes.y * 3.14159265);
    col *= 1.0 - uScan * s;
  }

  // vignette
  if (uVignette > 0.0) {
    vec2 d = uv - 0.5;
    float v = smoothstep(0.75, 0.2, dot(d, d) * 2.0);
    col *= mix(1.0, v, uVignette);
  }

  frag = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// ---- gl helpers ------------------------------------------------------------
function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader compile failed: " + log);
  }
  return sh;
}

function makeProgram(gl, fragSrc, names) {
  const p = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("program link failed: " + gl.getProgramInfoLog(p));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  const u = {};
  for (const n of names) u[n] = gl.getUniformLocation(p, n);
  return { prog: p, u };
}

export const Renderer = {
  mode: "uninit", // "gl" | "2d" | "lost"
  gl: null,
  preset: "soft",

  _display: null,
  _scene: null,
  _ctx2d: null,
  _W: 0,
  _H: 0,
  _bw: 0,
  _bh: 0,

  _sceneTex: null,
  _vao: null,
  _progs: null, // { copy, bright, blur, final }
  _fboA: null,
  _fboB: null, // half-res bloom ping-pong targets

  init(displayCanvas, sceneCanvas, w, h) {
    this._display = displayCanvas;
    this._scene = sceneCanvas;
    this._W = w;
    this._H = h;
    this._bw = Math.max(1, w >> 1);
    this._bh = Math.max(1, h >> 1);
    displayCanvas.width = w;
    displayCanvas.height = h;

    let gl = null;
    try {
      gl = displayCanvas.getContext("webgl2", {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      });
    } catch (_) {
      gl = null;
    }

    if (!gl) {
      this._initFallback();
      return this.mode;
    }

    try {
      this.gl = gl;
      this._setupGL();
      this.mode = "gl";
      displayCanvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.mode = "lost";
      });
      displayCanvas.addEventListener("webglcontextrestored", () => {
        try {
          this._setupGL();
          this.mode = "gl";
        } catch (_) {
          this._initFallback();
        }
      });
    } catch (err) {
      console.warn("WebGL2 init failed, using 2D fallback:", err && err.message);
      this.gl = null;
      this._initFallback();
    }
    return this.mode;
  },

  _initFallback() {
    this.mode = "2d";
    this._ctx2d = this._display.getContext("2d");
    this._ctx2d.imageSmoothingEnabled = false;
  },

  _setupGL() {
    const gl = this.gl;
    this._vao = gl.createVertexArray();
    this._sceneTex = this._makeTex(gl.NEAREST);
    this._fboA = this._makeFBO(this._bw, this._bh);
    this._fboB = this._makeFBO(this._bw, this._bh);
    this._progs = {
      copy: makeProgram(gl, FRAG_COPY, ["uTex"]),
      bright: makeProgram(gl, FRAG_BRIGHT, ["uTex", "uThreshold", "uKnee"]),
      blur: makeProgram(gl, FRAG_BLUR, ["uTex", "uDir"]),
      final: makeProgram(gl, FRAG_FINAL, [
        "uScene", "uBloom", "uBloomAmt", "uSat", "uContrast",
        "uVignette", "uScan", "uAberr", "uCurve", "uRes",
      ]),
    };
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);
  },

  _makeTex(filter) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  },

  _makeFBO(w, h) {
    const gl = this.gl;
    const tex = this._makeTex(gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  },

  // ---- public FX controls --------------------------------------------------
  setPreset(name) {
    if (PRESETS[name] !== undefined) this.preset = name;
    return this.preset;
  },
  cyclePreset() {
    const i = FX_PRESETS.indexOf(this.preset);
    this.preset = FX_PRESETS[(i + 1) % FX_PRESETS.length];
    return this.preset;
  },

  _draw(prog) {
    const gl = this.gl;
    gl.useProgram(prog.prog);
    gl.bindVertexArray(this._vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  },

  present() {
    if (this.mode === "2d") {
      this._ctx2d.clearRect(0, 0, this._W, this._H);
      this._ctx2d.drawImage(this._scene, 0, 0);
      return;
    }
    if (this.mode !== "gl") return; // context lost; skip frame

    const gl = this.gl;
    // upload the finished 2D frame (flip Y for GL convention)
    gl.bindTexture(gl.TEXTURE_2D, this._sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._scene);
    gl.bindVertexArray(this._vao);

    const fx = PRESETS[this.preset];
    if (!fx) {
      // passthrough straight to screen
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this._W, this._H);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this._sceneTex);
      gl.useProgram(this._progs.copy.prog);
      gl.uniform1i(this._progs.copy.u.uTex, 0);
      this._draw(this._progs.copy);
      gl.bindVertexArray(null);
      return;
    }

    // 1) bright-pass scene -> fboA (half res)
    gl.viewport(0, 0, this._bw, this._bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboA.fb);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sceneTex);
    gl.useProgram(this._progs.bright.prog);
    gl.uniform1i(this._progs.bright.u.uTex, 0);
    gl.uniform1f(this._progs.bright.u.uThreshold, fx.bloomThreshold);
    gl.uniform1f(this._progs.bright.u.uKnee, fx.bloomKnee);
    this._draw(this._progs.bright);

    // 2) separable blur, ping-pong A->B (H) ->A (V), two iterations for a wider kernel
    const blur = this._progs.blur;
    gl.useProgram(blur.prog);
    gl.uniform1i(blur.u.uTex, 0);
    const tx = 1 / this._bw,
      ty = 1 / this._bh;
    let src = this._fboA,
      dst = this._fboB;
    const passes = [
      [tx * 1.0, 0], [0, ty * 1.0],
      [tx * 2.0, 0], [0, ty * 2.0],
    ];
    for (const [dx, dy] of passes) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform2f(blur.u.uDir, dx, dy);
      this._draw(blur);
      const t = src;
      src = dst;
      dst = t;
    }
    const bloomTex = src.tex; // last written

    // 3) finalize: composite scene + bloom + grade + CRT -> screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this._W, this._H);
    const f = this._progs.final;
    gl.useProgram(f.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sceneTex);
    gl.uniform1i(f.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomTex);
    gl.uniform1i(f.u.uBloom, 1);
    gl.uniform1f(f.u.uBloomAmt, fx.bloomAmount);
    gl.uniform1f(f.u.uSat, fx.saturation);
    gl.uniform1f(f.u.uContrast, fx.contrast);
    gl.uniform1f(f.u.uVignette, fx.vignette);
    gl.uniform1f(f.u.uScan, fx.scanline);
    gl.uniform1f(f.u.uAberr, fx.aberration);
    gl.uniform1f(f.u.uCurve, fx.curvature);
    gl.uniform2f(f.u.uRes, this._W, this._H);
    this._draw(f);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null);
  },
};
