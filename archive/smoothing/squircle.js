/* Reusable shape host.
   A shape is any function that returns a closed SVG path in local pixels.
   The host supplies the same four layers for every shape:
     fill (clipped) / outline / focus ring / shadow (CSS filter).
   `squircle` is only one registered builder; triangles or blobs can be
   registered with WulonShape.register(name, builder). */
(() => {
  if (!window.CSS || !CSS.supports("clip-path", 'path("M 0 0")')) return;

  const SMOOTHING = 0.6;
  const builders = new Map();
  const mounted = new WeakSet();
  const resizeCallbacks = new WeakMap();
  const resizeQueue = new Set();
  let resizeFrame = 0;
  const cache = new Map();
  const SVG_NS = "http://www.w3.org/2000/svg";

  const sharedResize =
    "ResizeObserver" in window
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            resizeQueue.add(entry.target);
          }
          if (!resizeFrame) {
            resizeFrame = 1;
            queueMicrotask(() => {
              resizeFrame = 0;
              const queued = [...resizeQueue];
              resizeQueue.clear();
              for (const element of queued) {
                resizeCallbacks.get(element)?.();
              }
            });
          }
        })
      : null;

  function observe(element, callback) {
    if (!sharedResize) return;
    resizeCallbacks.set(element, callback);
    sharedResize.observe(element);
  }

  const rad = (degrees) => (degrees * Math.PI) / 180;
  const fmt = (value) => Number(value.toFixed(4));

  function radiusOf(element) {
    const style = getComputedStyle(element);
    const corners = [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ].map(parseFloat);
    if (corners.some((value) => !Number.isFinite(value))) return null;
    if (Math.max(...corners) - Math.min(...corners) > 0.5) return null;
    return corners[0];
  }

  function sizeOf(element) {
    /* Use the layout box, never getBoundingClientRect: press/pop/sheet
       animations apply transforms, and reading the transformed rect would
       feed scaled dimensions back into the path mid-animation. */
    const style = getComputedStyle(element);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      if (style.boxSizing === "border-box") {
        return { width, height };
      }
      return {
        width:
          width +
          (parseFloat(style.paddingLeft) || 0) +
          (parseFloat(style.paddingRight) || 0) +
          (parseFloat(style.borderLeftWidth) || 0) +
          (parseFloat(style.borderRightWidth) || 0),
        height:
          height +
          (parseFloat(style.paddingTop) || 0) +
          (parseFloat(style.paddingBottom) || 0) +
          (parseFloat(style.borderTopWidth) || 0) +
          (parseFloat(style.borderBottomWidth) || 0),
      };
    }
    return {
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  }

  /* Figma corner smoothing: arc radius R, outer budget p = (1 + 0.6) R.
     The guard is deliberate: if p cannot fit, return null and let the host
     fall back to the ordinary border-radius. */
  function squirclePath({ width, height, radius }) {
    if (!Number.isFinite(radius) || radius <= 0) return null;
    const budget = Math.min(width, height) / 2;
    const p = (1 + SMOOTHING) * radius;
    if (p > budget - 0.01) return null;

    const key = `${width.toFixed(3)}x${height.toFixed(3)}:${radius.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);

    const arcMeasure = 90 * (1 - SMOOTHING);
    const arcSectionLength =
      Math.sin(rad(arcMeasure / 2)) * radius * Math.SQRT2;
    const angleAlpha = (90 - arcMeasure) / 2;
    const p3ToP4Distance = radius * Math.tan(rad(angleAlpha / 2));
    const angleBeta = 45 * SMOOTHING;
    const c = p3ToP4Distance * Math.cos(rad(angleBeta));
    const d = c * Math.tan(rad(angleBeta));
    const b = (p - arcSectionLength - c - d) / 3;
    const a = 2 * b;

    const F = fmt;
    const T = F(width);
    const H = F(height);
    const R = F(radius);
    const P = F(p);
    const A = F(a);
    const B = F(b);
    const C = F(c);
    const D = F(d);
    const ARC = F(arcSectionLength);

    const path =
      `M ${F(width - p)} 0 ` +
      `c ${A} 0 ${F(a + b)} 0 ${F(a + b + c)} ${D} ` +
      `a ${R} ${R} 0 0 1 ${ARC} ${ARC} ` +
      `c ${D} ${C} ${D} ${F(b + c)} ${D} ${F(a + b + c)} ` +
      `L ${T} ${F(height - p)} ` +
      `c 0 ${A} 0 ${F(a + b)} ${F(-d)} ${F(a + b + c)} ` +
      `a ${R} ${R} 0 0 1 ${F(-arcSectionLength)} ${ARC} ` +
      `c ${F(-c)} ${D} ${F(-(b + c))} ${D} ${F(-(a + b + c))} ${D} ` +
      `L ${P} ${H} ` +
      `c ${F(-a)} 0 ${F(-(a + b))} 0 ${F(-(a + b + c))} ${F(-d)} ` +
      `a ${R} ${R} 0 0 1 ${F(-arcSectionLength)} ${F(-arcSectionLength)} ` +
      `c ${F(-d)} ${F(-c)} ${F(-d)} ${F(-(b + c))} ${F(-d)} ${F(-(a + b + c))} ` +
      `L 0 ${P} ` +
      `c 0 ${F(-a)} 0 ${F(-(a + b))} ${D} ${F(-(a + b + c))} ` +
      `a ${R} ${R} 0 0 1 ${ARC} ${F(-arcSectionLength)} ` +
      `c ${C} ${F(-d)} ${F(b + c)} ${F(-d)} ${F(a + b + c)} ${F(-d)} Z`;

    cache.set(key, path);
    return path;
  }

  function register(name, builder) {
    builders.set(name, builder);
  }

  function createFill() {
    const fill = document.createElement("span");
    fill.className = "wu-shape-fill";
    fill.setAttribute("aria-hidden", "true");
    return fill;
  }

  function createOutline() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("wu-shape-outline");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    for (const className of [
      "wu-shape-border",
      "wu-shape-focus-glow",
      "wu-shape-focus",
    ]) {
      const path = document.createElementNS(SVG_NS, "path");
      path.classList.add(className);
      svg.appendChild(path);
    }
    return svg;
  }

  function mount(element, options = {}) {
    if (mounted.has(element)) return;
    const shapeName =
      options.shape ||
      element.dataset.shape ||
      DEFAULT_SHAPE;
    const builder =
      typeof shapeName === "function"
        ? shapeName
        : builders.get(shapeName);
    if (!builder) return;

    mounted.add(element);
    element.classList.add("wu-shape-host");

    const fill = createFill();
    const outline = createOutline();
    element.insertBefore(fill, element.firstChild);
    element.appendChild(outline);

    const focusTarget =
      options.focusTarget === undefined
        ? element
        : options.focusTarget;

    const syncFocus = () => {
      const visible = !!(
        focusTarget &&
        focusTarget.matches(":focus-visible")
      );
      element.classList.toggle("is-focus-visible", visible);
    };

    if (focusTarget) {
      focusTarget.addEventListener("focus", () => {
        requestAnimationFrame(syncFocus);
      });
      focusTarget.addEventListener("blur", syncFocus);
      focusTarget.addEventListener("keydown", () => {
        requestAnimationFrame(syncFocus);
      });
      focusTarget.addEventListener("pointerdown", () => {
        element.classList.remove("is-focus-visible");
      });
    }

    const fallback = (reason) => {
      element.dataset.shapeState = "round";
      element.dataset.shapeReason = reason;
      fill.hidden = true;
      outline.hidden = true;
      fill.style.clipPath = "";
      element.classList.remove("is-focus-visible");
    };

    const update = () => {
      const { width, height } = sizeOf(element);
      if (width < 1 || height < 1) {
        fallback("unmeasured");
        return;
      }

      let path = null;
      try {
        path = builder({
          width,
          height,
          radius: radiusOf(element),
          element,
          options,
        });
      } catch (error) {
        fallback("builder-error");
        return;
      }

      if (!path) {
        fallback("unbounded");
        return;
      }

      element.dataset.shapeState = "on";
      element.dataset.shapeReason = "";
      fill.hidden = false;
      fill.style.clipPath = `path("${path}")`;
      fill.style.webkitClipPath = `path("${path}")`;
      outline.hidden = false;
      outline.setAttribute("viewBox", `0 0 ${width} ${height}`);
      outline.setAttribute("width", width);
      outline.setAttribute("height", height);
      outline.querySelectorAll("path").forEach((node) => {
        node.setAttribute("d", path);
      });
    };

    update();
    observe(element, update);
  }

  /* Smoothing is opt-in. A component only gets a path when it explicitly
     carries data-shape (or is mounted through the API). The library's default
     look is therefore the original native radius, not a global rewrite. */
  function scan(root = document) {
    root.querySelectorAll("[data-shape]").forEach((element) => {
      if (!element.classList.contains("wu-shape-host")) mount(element);
    });
  }

  register("squircle", squirclePath);

  /* Lisse's clothoid is G2: curvature ramps continuously from the straight
     edge into the central arc. It is the default because a curvature jump is
     not acceptable for this library. The vendored path-only build is MIT. */
  function clothoidPath({ width, height, radius }) {
    if (!window.LissePath || !Number.isFinite(radius) || radius <= 0) {
      return null;
    }
    const budget = Math.min(width, height) / 2;
    if ((1 + SMOOTHING) * radius > budget - 0.01) return null;
    return window.LissePath.generatePath(width, height, {
      radius,
      curve: "clothoid",
      smoothing: SMOOTHING,
      preserveSmoothing: false,
    });
  }

  register("clothoid", clothoidPath);

  function sheetPath({ width, height, element }) {
    if (!window.LissePath) return null;
    const style = getComputedStyle(element);
    const corners = {
      topLeft: parseFloat(style.borderTopLeftRadius) || 0,
      topRight: parseFloat(style.borderTopRightRadius) || 0,
      bottomRight: parseFloat(style.borderBottomRightRadius) || 0,
      bottomLeft: parseFloat(style.borderBottomLeftRadius) || 0,
    };
    if (!Object.values(corners).some(Boolean)) return null;
    const corner = (radius) => ({
      radius,
      curve: "clothoid",
      smoothing: SMOOTHING,
      preserveSmoothing: false,
    });
    return window.LissePath.generatePath(width, height, {
      topLeft: corner(corners.topLeft),
      topRight: corner(corners.topRight),
      bottomRight: corner(corners.bottomRight),
      bottomLeft: corner(corners.bottomLeft),
    });
  }

  register("sheet", sheetPath);

  const DEFAULT_SHAPE = window.LissePath ? "clothoid" : "squircle";
  scan();

  const mutation = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches("[data-shape]") && !node.classList.contains("wu-shape-host")) {
          mount(node);
        }
        node.querySelectorAll?.("[data-shape]").forEach((element) => {
          if (!element.classList.contains("wu-shape-host")) mount(element);
        });
      }
    }
  });
  mutation.observe(document.body, { childList: true, subtree: true });

  window.WulonShape = {
    register,
    mount,
    scan,
    path: squirclePath,
    isSupported: true,
  };
})();
