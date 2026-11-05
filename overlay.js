// Draws element boxes on a transparent canvas laid over the page, so the
// page's own styles (including any existing outlines) are never touched.
// Running this file a second time in the same frame turns it off again.
(() => {
  if (window.__cssOutlineOff) {
    window.__cssOutlineOff();
    return false;
  }

  const COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#00a3a3", "#d4a017", "#f032e6"];
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;" +
    "z-index:2147483647;margin:0;padding:0;border:0;background:none";
  document.documentElement.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = document.documentElement.clientWidth, h = window.innerHeight;
    if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
    if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    if (!document.body) return;

    // Walk the tree from <body>; each nesting level gets the next color.
    // Each entry carries the clip area of its ancestors (overflow: hidden etc.)
    // so elements hidden by clipping, visibility or opacity are skipped.
    const view = { l: 0, t: 0, r: w, b: h };
    const stack = [[document.body, 0, view, view]];
    while (stack.length) {
      const [el, depth, parentClip, parentAbsClip] = stack.pop();
      const cs = getComputedStyle(el);
      if (cs.display === "none") continue;
      const r = el.getBoundingClientRect();

      // Which ancestor clip applies depends on how the element is positioned.
      const pos = cs.position;
      const clip = pos === "fixed" ? view : pos === "absolute" ? parentAbsClip : parentClip;

      const box = intersect(clip, { l: r.left, t: r.top, r: r.right, b: r.bottom });
      if (r.width > 0 && r.height > 0 && box && isVisible(el)) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(clip.l, clip.t, clip.r - clip.l, clip.b - clip.t);
        ctx.clip();
        ctx.strokeStyle = COLORS[depth % COLORS.length];
        ctx.strokeRect(r.left + 0.5, r.top + 0.5, Math.max(r.width - 1, 0), Math.max(r.height - 1, 0));
        ctx.restore();
      }

      const clips = cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.contain.includes("paint");
      const childClip = clips ? intersect(clip, { l: r.left, t: r.top, r: r.right, b: r.bottom }) || EMPTY : clip;
      const establishesCB = pos !== "static" || cs.transform !== "none";
      const childAbsClip = establishesCB ? childClip : parentAbsClip;
      for (let c = el.lastElementChild; c; c = c.previousElementSibling) stack.push([c, depth + 1, childClip, childAbsClip]);
    }
  }

  const EMPTY = { l: 0, t: 0, r: 0, b: 0 };
  function intersect(a, b) {
    const l = Math.max(a.l, b.l), t = Math.max(a.t, b.t), r = Math.min(a.r, b.r), b2 = Math.min(a.b, b.b);
    return r > l && b2 > t ? { l, t, r, b: b2 } : null;
  }
  // Hidden via visibility, opacity: 0 (on itself or an ancestor) or content-visibility.
  function isVisible(el) {
    if (!el.checkVisibility) return true;
    return el.checkVisibility({
      opacityProperty: true, visibilityProperty: true,
      checkOpacity: true, checkVisibilityCSS: true, // older names for the same options
    });
  }

  // Redraw (at most once per frame) whenever something may have moved.
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  };
  const opts = { capture: true, passive: true };
  const events = ["scroll", "resize", "transitionend", "animationend", "load"];
  events.forEach((e) => window.addEventListener(e, schedule, opts));
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const timer = setInterval(schedule, 500); // catches animations and :hover changes

  window.__cssOutlineOff = () => {
    events.forEach((e) => window.removeEventListener(e, schedule, opts));
    observer.disconnect();
    clearInterval(timer);
    canvas.remove();
    delete window.__cssOutlineOff;
  };
  draw();
  return true;
})();
