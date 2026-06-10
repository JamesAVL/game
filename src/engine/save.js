// save.js — localStorage persistence, DOM-free. Lives outside core.js so the
// game-state layer (state.js, quests, perks) imports no canvas/document code
// and stays runnable under plain node (vitest).

const SAVE_KEY = "boosh_save_v1";

export const Save = {
  write(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; } },
  read() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  exists() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  // standalone settings (persist even before a game save exists)
  optGet(k, def) { try { const v = localStorage.getItem("boosh_opt_" + k); return v === null ? def : v; } catch (e) { return def; } },
  optSet(k, v) { try { localStorage.setItem("boosh_opt_" + k, v); } catch (e) {} },
};
