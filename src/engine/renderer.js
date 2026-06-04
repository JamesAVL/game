// renderer.js — GPU presentation layer (Phase 1).
//
// The game renders, exactly as before, to an offscreen 2D canvas at the fixed
// internal resolution (VIEW_W x VIEW_H). This module takes that finished frame,
// uploads it as a texture, and presents it to the visible canvas — optionally
// running a chain of post-processing shader passes during the upscale (added in
// the next step). When WebGL2 is unavailable it falls back to a plain 2D blit,
// which is pixel-identical to the original direct-to-canvas path.
//
// Pixel-art crispness is preserved two ways: the scene texture is sampled with
// NEAREST, and the visible canvas keeps its internal-resolution drawing buffer
// and is integer-upscaled by CSS (image-rendering: pixelated), just like before.

const VERT = `#version 300 es
// Single oversized triangle covering clip space — no vertex buffers needed.
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

function makeProgram(gl, fragSrc, vertSrc = VERT) {
  const p = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    throw new Error("program link failed: " + log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

export const Renderer = {
  mode: "uninit", // "gl" | "2d"
  gl: null,

  _display: null,
  _scene: null, // the offscreen 2D canvas the game draws into
  _ctx2d: null, // fallback 2D context on the display canvas
  _W: 0,
  _H: 0,

  _sceneTex: null,
  _vao: null,
  _copy: null, // passthrough program + uniforms

  init(displayCanvas, sceneCanvas, w, h) {
    this._display = displayCanvas;
    this._scene = sceneCanvas;
    this._W = w;
    this._H = h;
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
      // recover gracefully if the GL context is ever lost
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
    this._vao = gl.createVertexArray(); // empty VAO, required to draw in WebGL2

    this._sceneTex = this._makeTex();

    const prog = makeProgram(gl, FRAG_COPY);
    this._copy = { prog, uTex: gl.getUniformLocation(prog, "uTex") };

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);
  },

  _makeTex() {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  },

  // Upload the finished offscreen frame and present it to the screen.
  present() {
    if (this.mode === "2d") {
      this._ctx2d.clearRect(0, 0, this._W, this._H);
      this._ctx2d.drawImage(this._scene, 0, 0);
      return;
    }
    if (this.mode !== "gl") return; // context lost; skip this frame

    const gl = this.gl;
    // upload the 2D frame (flip Y so canvas top-left maps to GL convention)
    gl.bindTexture(gl.TEXTURE_2D, this._sceneTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._scene);

    gl.bindVertexArray(this._vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this._W, this._H);
    gl.useProgram(this._copy.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._sceneTex);
    gl.uniform1i(this._copy.uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  },
};
