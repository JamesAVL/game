// Headless boot smoke test. Usage: node tests/smoke.mjs <url> <screenshot.png>
// Verifies the game boots with no console/page errors, assets load, and the
// Title scene is live (via the window.__BOOSH debug handle).
// Resolve Playwright from a declared devDep ("playwright") or, for ad-hoc local
// runs, from an absolute path in PW_PATH (e.g. a globally-installed copy).
const { chromium } = await import(process.env.PW_PATH || "playwright");

const url = process.argv[2] || "http://localhost:5173/";
const shot = process.argv[3] || "/tmp/boosh-smoke.png";

const errors = [];
const warnings = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  if (m.type() === "warning") warnings.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("requestfailed", (r) =>
  errors.push("REQFAIL: " + r.url() + " " + (r.failure()?.errorText || "")),
);

await page.goto(url, { waitUntil: "load", timeout: 20000 });

// boot overlay should hide once loadAll() resolves and the Title scene mounts
await page.waitForFunction(
  () => {
    const boot = document.getElementById("boot");
    const b = window.__BOOSH;
    return boot && boot.classList.contains("hidden") && b && b.Scenes && b.Scenes.top();
  },
  { timeout: 20000 },
);

// optional: force an FX preset for capture/verification (off | soft | crt)
if (process.env.SET_FX) {
  await page.evaluate((p) => window.__BOOSH?.Renderer?.setPreset(p), process.env.SET_FX);
  await new Promise((r) => setTimeout(r, 200));
}

const info = await page.evaluate(() => {
  const b = window.__BOOSH;
  const cv = document.getElementById("game");
  return {
    scene: b.Scenes.top()?.constructor?.name,
    sceneDepth: b.Scenes.size ? b.Scenes.size() : null,
    canvas: cv ? { w: cv.width, h: cv.height } : null,
    difficulty: b.GS?.data?.difficulty ?? null,
    renderer: b.Renderer?.mode ?? null,
  };
});

await new Promise((r) => setTimeout(r, 400)); // let a few frames render
await page.screenshot({ path: shot });
await browser.close();

console.log("scene:", info.scene, "| depth:", info.sceneDepth, "| canvas:", JSON.stringify(info.canvas), "| difficulty:", info.difficulty, "| renderer:", info.renderer);
if (warnings.length) console.log("warnings:", warnings.length, warnings.slice(0, 3));

// Assertions are minification-proof (no reliance on class names, which esbuild
// mangles in the production build): a clean boot means the overlay hid, exactly
// one scene (the title) is on the stack, the canvas is at internal resolution,
// and nothing logged an error.
const fail = (msg) => {
  console.error("FAIL — " + msg);
  process.exit(1);
};
if (errors.length) fail("errors:\n" + errors.map((e) => "  - " + e).join("\n"));
if (info.sceneDepth !== 1) fail(`expected a single (title) scene on the stack, got depth ${info.sceneDepth}`);
if (!info.scene) fail("no active scene after boot");
if (!info.canvas || info.canvas.w !== 960 || info.canvas.h !== 540) fail(`unexpected canvas ${JSON.stringify(info.canvas)} (want 960x540)`);
console.log("SMOKE OK:", url);
