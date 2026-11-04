(() => {
  "use strict";

  const root = document.documentElement;
  const STORE_KEY = "wulon-spec-motion";
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const DEFAULTS = {
    enabled: true,
    speed: 1,
    intensity: 1,
    reduced: false,
    collapsed: true,
    effects: {
      press: true,
      pop: true,
      refocus: true,
      ticker: true,
      stagger: true,
      gesture: true,
      typing: true,
    },
  };

  const safeGet = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const safeSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode / file:// */
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadConfig() {
    let stored = {};
    try {
      stored = JSON.parse(safeGet(STORE_KEY) || "{}") || {};
    } catch {
      stored = {};
    }
    return {
      ...DEFAULTS,
      ...stored,
      effects: { ...DEFAULTS.effects, ...(stored.effects || {}) },
    };
  }

  let config = loadConfig();
  const running = new WeakMap();
  const activeAnimations = new Set();
  const activeSprings = new Set();
  const springs = new Map();
  let dock = null;
  let persistTimer = 0;

  function persist() {
    clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      safeSet(STORE_KEY, JSON.stringify(config));
    }, 120);
  }

  function flushPersist() {
    clearTimeout(persistTimer);
    safeSet(STORE_KEY, JSON.stringify(config));
  }

  window.addEventListener("pagehide", flushPersist);

  function effectiveReduced() {
    return Boolean(config.reduced || reduceQuery.matches);
  }

  function timeFactor() {
    if (!config.enabled) return 0;
    return (1 / config.speed) * (effectiveReduced() ? 0.65 : 1);
  }

  function intensityFactor() {
    return config.enabled && !effectiveReduced() ? config.intensity : 0;
  }

  function allowed(effect) {
    if (!config.enabled) return false;
    return effect ? config.effects[effect] !== false : true;
  }

  function tokenMs(name, fallback) {
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function tokenEase(name, fallback) {
    const value = getComputedStyle(root).getPropertyValue(name).trim();
    return value || fallback;
  }

  function tunedDuration(name, fallback) {
    return tokenMs(name, fallback) * timeFactor();
  }

  function getConfig() {
    return {
      ...config,
      effects: { ...config.effects },
      reduced: effectiveReduced(),
    };
  }

  function apply(persistChange = true) {
    config.speed = clamp(Number(config.speed) || 1, 0.5, 2);
    config.intensity = clamp(
      Number.isFinite(Number(config.intensity)) ? Number(config.intensity) : 1,
      0,
      1.5,
    );
    const reduced = effectiveReduced();
    const time = timeFactor();
    const distance = intensityFactor();

    root.style.setProperty("--wu-motion-time", String(time));
    root.style.setProperty("--wu-motion-distance", String(distance));
    root.style.setProperty("--wu-motion-blur", String(distance));
    root.dataset.motion = !config.enabled
      ? "off"
      : reduced
        ? "reduced"
        : "full";
    root.dataset.motionPress = config.effects.press ? "on" : "off";

    syncDock();
    if (persistChange) persist();
    document.dispatchEvent(
      new CustomEvent("wulon:motionchange", { detail: getConfig() }),
    );
  }

  /* --------------------------------------------------------------------------
     Profiles and WAAPI
     -------------------------------------------------------------------------- */

  const PROFILES = {
    menu: {
      duration: "--wu-dur-pop",
      easing: "--wu-ease-out",
      scale: 0.95,
      rise: 0,
      blur: 1.5,
    },
    menuOut: {
      duration: "--wu-dur-menu-out",
      easing: "--wu-ease-out",
      scale: 0.97,
      rise: 0,
      blur: 1.5,
    },
    modal: {
      duration: "--wu-dur-modal",
      easing: "--wu-ease-out",
      scale: 0.96,
      rise: 0,
      blur: 2,
    },
    modalOut: {
      duration: "--wu-dur-modal-out",
      easing: "--wu-ease-out",
      scale: 0.98,
      rise: 0,
      blur: 2,
    },
    toast: {
      duration: "--wu-dur-toast",
      easing: "--wu-ease-toast",
      scale: 1,
      rise: 14,
      blur: 1.5,
    },
    toastOut: {
      duration: "--wu-dur-toast-out",
      easing: "--wu-ease-toast",
      scale: 1,
      rise: 10,
      blur: 1.5,
    },
    fade: {
      duration: "--wu-dur-modal-out",
      easing: "--wu-ease-out",
      scale: 1,
      rise: 0,
      blur: 0,
    },
  };

  function geometry(profile) {
    const i = intensityFactor();
    return {
      scale: 1 - (1 - profile.scale) * i,
      rise: profile.rise * i,
      blur: (profile.blur || 0) * i,
    };
  }

  function capture(el) {
    const previous = running.get(el);
    if (!previous) return null;
    const computed = getComputedStyle(el);
    const start = {
      opacity: Number.parseFloat(computed.opacity),
      transform: computed.transform,
      filter: computed.filter,
    };
    previous.cancel();
    activeAnimations.delete(previous);
    running.delete(el);
    return start;
  }

  function trackAnimation(el, animation) {
    running.set(el, animation);
    activeAnimations.add(animation);
    animation.finished
      .then(() => {
        activeAnimations.delete(animation);
        if (running.get(el) === animation) {
          running.delete(el);
          animation.cancel();
        }
      })
      .catch(() => {
        activeAnimations.delete(animation);
      });
  }

  function enter(el, options = {}) {
    if (!el) return null;
    const profileName = options.profile || "menu";
    const effect = options.effect || "pop";
    if (!allowed(effect)) return null;

    if (options.origin) {
      el.style.transformOrigin = `${options.origin.x || "center"} ${
        options.origin.y || "center"
      }`;
    }

    const profile = PROFILES[profileName] || PROFILES.menu;
    const start = capture(el);
    const reduced = effectiveReduced();
    const duration = tunedDuration(profile.duration, 200);
    if (duration <= 0) return null;

    let keyframes;
    if (reduced) {
      keyframes = [{ opacity: start ? start.opacity : 0 }, { opacity: 1 }];
    } else {
      const { scale, rise, blur } = geometry(profile);
      const fromTransform =
        start && start.transform !== "none"
          ? start.transform
          : `scale(${scale}) translate3d(0, ${rise}px, 0)`;
      const fromFilter =
        start && start.filter !== "none"
          ? start.filter
          : `blur(${blur}px)`;
      keyframes = [
        {
          opacity: start ? start.opacity : 0,
          transform: fromTransform,
          filter: fromFilter,
        },
        {
          opacity: 1,
          transform: "scale(1) translate3d(0, 0, 0)",
          filter: "blur(0px)",
        },
      ];
    }

    const animation = el.animate(keyframes, {
      duration,
      easing: tokenEase(profile.easing, "ease-out"),
      fill: "both",
    });
    trackAnimation(el, animation);
    return animation;
  }

  function leave(el, options = {}) {
    if (!el) {
      options.onFinish?.();
      return null;
    }
    const effect = options.effect || "pop";
    if (!allowed(effect)) {
      options.onFinish?.();
      return null;
    }

    const profileName = options.profile || "menuOut";
    const profile = PROFILES[profileName] || PROFILES.menuOut;
    const start = capture(el);
    const reduced = effectiveReduced();
    const duration = tunedDuration(profile.duration, 150);
    if (duration <= 0) {
      options.onFinish?.();
      return null;
    }

    let keyframes;
    if (reduced) {
      keyframes = [{ opacity: start ? start.opacity : 1 }, { opacity: 0 }];
    } else {
      const { scale, rise, blur } = geometry(profile);
      const fromOpacity = start ? start.opacity : 1;
      const fromTransform =
        start && start.transform !== "none"
          ? start.transform
          : "scale(1) translate3d(0, 0, 0)";
      const fromFilter =
        start && start.filter !== "none" ? start.filter : "blur(0px)";
      const toFilter = `blur(${blur}px)`;
      keyframes = [
        {
          opacity: fromOpacity,
          transform: fromTransform,
          filter: fromFilter,
        },
        {
          opacity: 0,
          transform: `scale(${scale}) translate3d(0, ${rise}px, 0)`,
          filter: toFilter,
        },
      ];
    }

    const animation = el.animate(keyframes, {
      duration,
      easing: tokenEase(profile.easing, "ease-out"),
      fill: "both",
    });
    running.set(el, animation);
    activeAnimations.add(animation);

    let done = false;
    animation.finished
      .then(() => {
        if (done) return;
        done = true;
        activeAnimations.delete(animation);
        if (options.onFinish) {
          if (running.get(el) === animation) running.delete(el);
          options.onFinish();
          animation.cancel();
        }
        // With no onFinish the finished fill is the caller's final state;
        // keep it in `running` so a later enter/leave starts from it.
      })
      .catch(() => {
        activeAnimations.delete(animation);
      });
    return animation;
  }

  /* --------------------------------------------------------------------------
     Refocus: new data arrives blurred, then resolves. Filter is expensive, so
     the blur stays at 3px and the duration stays under 300ms.
     -------------------------------------------------------------------------- */

  function refocus(el, options = {}) {
    if (!el) return null;
    if (options.text !== undefined) el.textContent = options.text;
    const effect = options.effect || "refocus";
    if (!allowed(effect)) return null;

    const start = capture(el);
    const reduced = effectiveReduced();
    const duration = tunedDuration("--wu-dur-refocus", 260);
    if (duration <= 0) return null;

    let keyframes;
    if (reduced) {
      keyframes = [{ opacity: start ? start.opacity : 0.6 }, { opacity: 1 }];
    } else {
      const i = intensityFactor();
      const blur = 3 * i;
      const rise = 2 * i;
      const scale = 1 - 0.015 * i;
      const fromFilter =
        start && start.filter !== "none" ? start.filter : `blur(${blur}px)`;
      const fromTransform =
        start && start.transform !== "none"
          ? start.transform
          : `translate3d(0, ${rise}px, 0) scale(${scale})`;
      keyframes = [
        {
          opacity: start ? start.opacity : 0.55,
          filter: fromFilter,
          transform: fromTransform,
          offset: 0,
        },
        {
          opacity: 0.8,
          filter: `blur(${blur * 0.35}px)`,
          transform: `translate3d(0, ${rise * 0.4}px, 0) scale(${
            1 - (1 - scale) * 0.55
          })`,
          offset: 0.45,
        },
        {
          opacity: 1,
          filter: "blur(0px)",
          transform: "translate3d(0, 0, 0) scale(1)",
          offset: 1,
        },
      ];
    }

    const animation = el.animate(keyframes, {
      duration,
      easing: tokenEase("--wu-ease-refocus", "ease-out"),
      fill: "both",
    });
    trackAnimation(el, animation);
    return animation;
  }

  function update(el, text, options = {}) {
    return refocus(el, { ...options, text });
  }

  /* --------------------------------------------------------------------------
     Spring engine. Response is the time to reach the target; damping 1 is
     critically damped. Both are Apple's designer-facing spring parameters.
     -------------------------------------------------------------------------- */

  function springValue(options = {}) {
    const from = Number(options.from) || 0;
    const to = Number(options.to) || 0;
    const response = clamp(Number(options.response) || 0.4, 0.12, 1.2);
    const damping = clamp(Number(options.damping) || 1, 0.35, 2);
    const velocity = Number(options.velocity) || 0;
    const onUpdate = options.onUpdate || (() => {});
    const onComplete = options.onComplete;

    if (!config.enabled || effectiveReduced() || Math.abs(to - from) < 0.0001) {
      onUpdate(to);
      onComplete?.();
      return () => {};
    }

    const omega = (2 * Math.PI) / response;
    const stiffness = omega * omega;
    const dampingCoef = 2 * damping * omega;
    const distance = Math.abs(to - from) || 1;
    const positionEpsilon = Math.max(0.0005, distance * 0.0008);
    const velocityEpsilon = Math.max(0.01, distance * 0.015);
    let x = from;
    let v = velocity;
    let previous = performance.now();
    let frame = 0;
    let stopped = false;

    const cancel = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      activeSprings.delete(cancel);
    };

    const step = (now) => {
      if (stopped) return;
      const dt = Math.min((now - previous) / 1000, 0.064);
      previous = now;
      const substeps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / substeps;
      for (let index = 0; index < substeps; index += 1) {
        const acceleration = -stiffness * (x - to) - dampingCoef * v;
        v += acceleration * h;
        x += v * h;
      }
      onUpdate(x);
      if (Math.abs(x - to) < positionEpsilon && Math.abs(v) < velocityEpsilon) {
        x = to;
        onUpdate(to);
        stopped = true;
        activeSprings.delete(cancel);
        onComplete?.();
        return;
      }
      frame = requestAnimationFrame(step);
    };

    activeSprings.add(cancel);
    frame = requestAnimationFrame(step);
    return cancel;
  }

  function formatValue(value, options) {
    if (typeof options.format === "function") return options.format(value);
    const digits = Number.isInteger(options.decimals)
      ? options.decimals
      : 0;
    return value.toLocaleString(document.documentElement.lang || "en", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function count(el, to, options = {}) {
    if (!el) return null;
    const effect = options.effect || "ticker";
    if (!allowed(effect)) {
      const value = Number(to) || 0;
      el.dataset.motionValue = String(value);
      el.textContent = formatValue(value, options);
      return null;
    }

    const previous = springs.get(el);
    if (previous) previous();
    springs.delete(el);

    // Read the currently displayed value, not the previous target: a second
    // click mid-flight must continue from what the reader can see.
    const raw = el.textContent ?? "0";
    const from = Number(String(raw).replace(/[^\d.-]/g, "")) || 0;
    const target = Number(to) || 0;
    el.dataset.motionValue = String(target);

    if (!config.enabled || effectiveReduced()) {
      el.textContent = formatValue(target, options);
      return null;
    }

    if (Math.abs(target - from) < 0.0001) {
      el.textContent = formatValue(target, options);
      return null;
    }

    const cancel = springValue({
      from,
      to: target,
      response: options.response || 0.4,
      damping: options.damping || 1,
      onUpdate: (value) => {
        el.textContent = formatValue(value, options);
      },
      onComplete: () => {
        springs.delete(el);
      },
    });
    springs.set(el, cancel);
    return cancel;
  }

  /* --------------------------------------------------------------------------
     Stagger: decorative, 30–80ms apart, never blocks input.
     -------------------------------------------------------------------------- */

  function stagger(container, options = {}) {
    if (!container) return [];
    const effect = options.effect || "stagger";
    if (!allowed(effect)) return [];

    const selector = options.selector || "[data-motion-item]";
    const items = Array.from(container.querySelectorAll(selector));
    if (!items.length) return [];

    const duration = tunedDuration("--wu-dur-stagger", 320);
    if (duration <= 0) return [];

    const reduced = effectiveReduced();
    const step =
      Number(options.step) || tokenMs("--wu-dur-stagger-step", 45);
    const stepMs = step * timeFactor();
    const rise = 8 * intensityFactor();

    return items.map((el, index) => {
      const previous = running.get(el);
      if (previous) {
        previous.cancel();
        activeAnimations.delete(previous);
        running.delete(el);
      }
      let keyframes;
      if (reduced) {
        keyframes = [{ opacity: 0 }, { opacity: 1 }];
      } else {
        keyframes = [
          {
            opacity: 0,
            transform: `translate3d(0, ${rise}px, 0)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
        ];
      }
      const animation = el.animate(keyframes, {
        duration,
        delay: index * stepMs,
        easing: tokenEase("--wu-ease-out", "ease-out"),
        fill: "both",
      });
      trackAnimation(el, animation);
      return animation;
    });
  }

  /* --------------------------------------------------------------------------
     Gesture physics: 1:1 tracking, velocity history, momentum projection, and
     rubber-banded bounds. track() is the primitive; drag() adds a transform.
     -------------------------------------------------------------------------- */

  function project(velocity, deceleration = 0.998) {
    return ((velocity / 1000) * deceleration) / (1 - deceleration);
  }

  function rubberband(overshoot, dimension, constant = 0.55) {
    const size = Math.max(1, dimension);
    return (
      (overshoot * size * constant) /
      (size + constant * Math.abs(overshoot))
    );
  }

  function track(element, options = {}) {
    if (!element) return { destroy() {} };

    const axis = options.axis === "y" ? "y" : "x";
    const getPosition = options.getPosition || (() => 0);
    const rubber = Number.isFinite(Number(options.rubberband))
      ? Number(options.rubberband)
      : 0.55;
    const preventDefault = options.preventDefault !== false;

    let dragging = false;
    let pointerId = null;
    let startPointer = 0;
    let startPosition = 0;
    let position = 0;
    let raw = 0;
    let history = [];

    const bound = (name) =>
      typeof options[name] === "function" ? options[name]() : options[name];

    const sample = (value) => {
      history.push({ time: performance.now(), position: value });
      if (history.length > 8) history.shift();
    };

    const velocity = () => {
      if (history.length < 2) return 0;
      const last = history[history.length - 1];
      let first = last;
      for (let index = history.length - 2; index >= 0; index -= 1) {
        if (last.time - history[index].time > 100) break;
        first = history[index];
      }
      const dt = last.time - first.time;
      return dt > 0 ? ((last.position - first.position) / dt) * 1000 : 0;
    };

    const onPointerDown = (event) => {
      if (!allowed("gesture")) return;
      if (event.isPrimary === false) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (options.canStart && options.canStart(event) === false) return;

      options.onStart?.({ event });
      dragging = true;
      pointerId = event.pointerId;
      startPointer = axis === "x" ? event.clientX : event.clientY;
      startPosition = getPosition();
      position = startPosition;
      raw = startPosition;
      history = [{ time: performance.now(), position: startPosition }];
      element.classList.add("is-dragging");

      try {
        element.setPointerCapture(pointerId);
      } catch {
        /* capture is best-effort */
      }
      if (preventDefault && event.cancelable) event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const current = axis === "x" ? event.clientX : event.clientY;
      raw = startPosition + (current - startPointer);

      const minimum = bound("min");
      const maximum = bound("max");
      const dimension =
        typeof options.dimension === "function"
          ? options.dimension()
          : options.dimension ||
            (axis === "x" ? element.clientWidth : element.clientHeight) ||
            1;

      let next = raw;
      if (Number.isFinite(minimum) && raw < minimum) {
        next = minimum - rubberband(minimum - raw, dimension, rubber);
      } else if (Number.isFinite(maximum) && raw > maximum) {
        next = maximum + rubberband(raw - maximum, dimension, rubber);
      }

      position = next;
      sample(position);
      options.onMove?.({
        position,
        raw,
        velocity: velocity(),
        event,
      });

      if (preventDefault && event.cancelable) event.preventDefault();
    };

    const finish = (event, cancelled) => {
      if (!dragging) return;
      dragging = false;
      const releaseVelocity = velocity();
      const projected = position + project(releaseVelocity);
      element.classList.remove("is-dragging");
      if (pointerId !== null && element.hasPointerCapture?.(pointerId)) {
        try {
          element.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
      }
      const state = {
        position,
        raw,
        velocity: releaseVelocity,
        projected,
        cancelled,
        event,
      };
      pointerId = null;
      options.onEnd?.(state);
    };

    const onPointerUp = (event) => {
      if (event.pointerId === pointerId) finish(event, false);
    };
    const onPointerCancel = (event) => {
      if (event.pointerId === pointerId) finish(event, true);
    };
    const onLostCapture = (event) => {
      if (event.pointerId === pointerId) finish(event, true);
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", onPointerUp);
    element.addEventListener("pointercancel", onPointerCancel);
    element.addEventListener("lostpointercapture", onLostCapture);

    return {
      destroy() {
        element.removeEventListener("pointerdown", onPointerDown);
        element.removeEventListener("pointermove", onPointerMove);
        element.removeEventListener("pointerup", onPointerUp);
        element.removeEventListener("pointercancel", onPointerCancel);
        element.removeEventListener("lostpointercapture", onLostCapture);
      },
      get position() {
        return position;
      },
    };
  }

  function drag(element, options = {}) {
    if (!element) return { destroy() {} };
    const axis = options.axis === "y" ? "y" : "x";
    const rotate = Number(options.rotate) || 0;

    return track(element, {
      ...options,
      axis,
      onMove(state) {
        const degrees = rotate ? state.position / rotate : 0;
        element.style.transform =
          axis === "x"
            ? `translate3d(${state.position}px, 0, 0)${
                degrees ? ` rotate(${degrees}deg)` : ""
              }`
            : `translate3d(0, ${state.position}px, 0)`;
        options.onMove?.(state);
      },
    });
  }

  /* --------------------------------------------------------------------------
     Hot-swap dock
     -------------------------------------------------------------------------- */

  function formatSpeed(value) {
    return `${Number(value.toFixed(2))}×`;
  }

  function syncDock() {
    if (!dock) return;
    const toggle = dock.querySelector("[data-motion-enabled]");
    if (toggle) {
      toggle.setAttribute("aria-checked", String(config.enabled));
    }
    const speed = dock.querySelector("[data-motion-speed]");
    const speedValue = dock.querySelector("[data-motion-speed-value]");
    if (speed) speed.value = String(config.speed);
    if (speedValue) speedValue.textContent = formatSpeed(config.speed);

    const intensity = dock.querySelector("[data-motion-intensity]");
    const intensityValue = dock.querySelector(
      "[data-motion-intensity-value]",
    );
    if (intensity) intensity.value = String(config.intensity);
    if (intensityValue) {
      intensityValue.textContent = `${Math.round(config.intensity * 100)}%`;
    }

    const reduced = dock.querySelector("[data-motion-reduced]");
    if (reduced) {
      reduced.checked = effectiveReduced();
      reduced.disabled = reduceQuery.matches;
      const label = reduced.closest(".wu-check");
      if (label) {
        if (reduceQuery.matches) label.dataset.system = "";
        else delete label.dataset.system;
      }
    }

    dock.querySelectorAll("[data-motion-effect]").forEach((input) => {
      input.checked = config.effects[input.dataset.motionEffect] !== false;
    });

    const expanded = !("collapsed" in dock.dataset);
    const collapse = dock.querySelector("[data-motion-dock-toggle]");
    if (collapse) collapse.setAttribute("aria-expanded", String(expanded));
  }

  function setCollapsed(collapsed) {
    if (!dock) return;
    config.collapsed = collapsed;
    if (collapsed) dock.dataset.collapsed = "";
    else delete dock.dataset.collapsed;
    syncDock();
    persist();
  }

  function initDock() {
    dock = document.querySelector("[data-motion-dock]");
    if (!dock) return;

    if (config.collapsed) dock.dataset.collapsed = "";
    else delete dock.dataset.collapsed;

    const collapse = dock.querySelector("[data-motion-dock-toggle]");
    collapse?.addEventListener("click", () => {
      setCollapsed(!("collapsed" in dock.dataset));
    });

    const enabled = dock.querySelector("[data-motion-enabled]");
    enabled?.addEventListener("click", () => {
      config.enabled = enabled.getAttribute("aria-checked") === "true";
      apply();
    });

    const speed = dock.querySelector("[data-motion-speed]");
    speed?.addEventListener("input", () => {
      config.speed = clamp(Number(speed.value) || 1, 0.5, 2);
      apply();
    });

    const intensity = dock.querySelector("[data-motion-intensity]");
    intensity?.addEventListener("input", () => {
      config.intensity = clamp(Number(intensity.value) || 0, 0, 1.5);
      apply();
    });

    const reduced = dock.querySelector("[data-motion-reduced]");
    reduced?.addEventListener("change", () => {
      config.reduced = reduced.checked || reduceQuery.matches;
      apply();
    });

    dock.querySelectorAll("[data-motion-effect]").forEach((input) => {
      input.addEventListener("change", () => {
        config.effects[input.dataset.motionEffect] = input.checked;
        apply();
      });
    });

    dock.querySelector("[data-motion-reset]")?.addEventListener("click", () => {
      config = {
        ...DEFAULTS,
        collapsed: Boolean(dock.dataset.collapsed),
        reduced: reduceQuery.matches,
        effects: { ...DEFAULTS.effects },
      };
      apply();
    });
  }

  reduceQuery.addEventListener("change", () => {
    apply();
  });

  function configure(patch = {}) {
    if (typeof patch.enabled === "boolean") config.enabled = patch.enabled;
    if (Number.isFinite(Number(patch.speed))) {
      config.speed = clamp(Number(patch.speed), 0.5, 2);
    }
    if (Number.isFinite(Number(patch.intensity))) {
      config.intensity = clamp(Number(patch.intensity), 0, 1.5);
    }
    if (typeof patch.reduced === "boolean") config.reduced = patch.reduced;
    if (patch.effects) {
      config.effects = { ...config.effects, ...patch.effects };
    }
    apply();
    return getConfig();
  }

  /* --------------------------------------------------------------------------
     Gallery bindings
     -------------------------------------------------------------------------- */

  function closestNumber(el) {
    return Number(el.dataset.motionValue ?? el.dataset.value ?? "0") || 0;
  }

  function bindDemos() {
    document.querySelectorAll("[data-motion-refocus]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.querySelector(
          button.dataset.motionRefocus || "",
        );
        if (!target) return;
        const next = 900 + Math.floor(Math.random() * 1700);
        const text = next.toLocaleString(document.documentElement.lang || "en");
        // A watched value animates itself on mutation; an unwatched one needs
        // the explicit text + refocus call.
        if (target.hasAttribute("data-motion-refocus-watch")) {
          target.textContent = text;
        } else {
          refocus(target, { text });
        }
      });
    });

    document
      .querySelectorAll("[data-motion-ticker-step]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const target =
            button
              .closest(".wu-panel")
              ?.querySelector("[data-motion-ticker]") ||
            document.querySelector("[data-motion-ticker]");
          if (!target) return;
          const step = Number(button.dataset.motionTickerStep) || 1;
          count(target, closestNumber(target) + step);
        });
      });

    document
      .querySelectorAll("[data-motion-ticker-random]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const target =
            button
              .closest(".wu-panel")
              ?.querySelector("[data-motion-ticker]") ||
            document.querySelector("[data-motion-ticker]");
          if (!target) return;
          const delta = Math.round((Math.random() - 0.35) * 420);
          count(target, closestNumber(target) + delta);
        });
      });

    document.querySelectorAll("[data-motion-replay]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.querySelector(
          button.dataset.motionReplay || "",
        );
        if (target) stagger(target);
      });
    });
  }

  function initValueWatchers() {
    document
      .querySelectorAll("[data-motion-refocus-watch]")
      .forEach((element) => {
        new MutationObserver(() => {
          refocus(element);
        }).observe(element, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
  }

  function initReveal() {
    const targets = document.querySelectorAll("[data-motion-reveal]");
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => stagger(target));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          stagger(entry.target);
        });
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
  }

  function initSheetDemo() {
    const stage = document.querySelector("[data-sheet-demo]");
    if (!stage) return;
    const sheet = stage.querySelector("[data-sheet]");
    const scrim = stage.querySelector("[data-sheet-scrim]");
    const handle = stage.querySelector("[data-sheet-handle]");
    const openButton = stage.querySelector("[data-sheet-open]");
    const closeButton = stage.querySelector("[data-sheet-close]");
    if (!sheet || !scrim || !handle) return;

    let y = 0;
    let spring = null;
    const cancelSpring = () => {
      if (spring) {
        spring();
        spring = null;
      }
    };

    const applyY = (value) => {
      y = value;
      sheet.style.transform = `translate3d(0, ${value}px, 0)`;
      const height = sheet.offsetHeight || 1;
      const progress = 1 - Math.min(1, Math.max(0, value / height));
      scrim.style.opacity = String(progress);
    };

    const settle = (target, velocity, closeAfter) => {
      cancelSpring();
      const finishClose = () => {
        if (!closeAfter || sheet.hidden) return;
        const focusInside = sheet.contains(document.activeElement);
        cancelSpring();
        stage.removeAttribute("data-open");
        sheet.hidden = true;
        scrim.hidden = true;
        if (openButton) {
          openButton.hidden = false;
          if (focusInside) openButton.focus({ preventScroll: true });
        }
      };
      const closeAt = (sheet.offsetHeight || 240) * 0.97;

      spring = springValue({
        from: y,
        to: target,
        velocity,
        response: 0.4,
        damping: 1,
        onUpdate: (value) => {
          applyY(value);
          // Hide as the sheet clears the stage; the spring tail is invisible.
          if (closeAfter && value >= closeAt) finishClose();
        },
        onComplete: () => {
          spring = null;
          finishClose();
        },
      });
    };

    const openSheet = (animated = true) => {
      cancelSpring();
      const focusFromButton = document.activeElement === openButton;
      stage.dataset.open = "";
      sheet.hidden = false;
      scrim.hidden = false;
      if (openButton) openButton.hidden = true;
      if (focusFromButton) handle.focus({ preventScroll: true });
      const height = sheet.offsetHeight || 240;
      if (!animated) {
        applyY(0);
        scrim.style.opacity = "1";
        return;
      }
      applyY(height);
      settle(0, 0, false);
    };

    const closeSheet = (velocity = 0) => {
      if (sheet.hidden) return;
      cancelSpring();
      settle(sheet.offsetHeight || 240, velocity, true);
    };

    // The markup starts open so the handle is immediately visible.
    if (stage.hasAttribute("data-open")) {
      sheet.hidden = false;
      scrim.hidden = false;
      if (openButton) openButton.hidden = true;
      applyY(0);
      scrim.style.opacity = "1";
    } else {
      applyY(sheet.offsetHeight || 240);
      scrim.style.opacity = "0";
    }

    openButton?.addEventListener("click", () => openSheet(true));
    closeButton?.addEventListener("click", () => closeSheet(0));
    scrim.addEventListener("click", () => closeSheet(0));
    handle.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Escape") {
        event.preventDefault();
        closeSheet(0);
      }
    });

    track(handle, {
      axis: "y",
      min: -36,
      max: () => sheet.offsetHeight || 240,
      getPosition: () => y,
      onStart: cancelSpring,
      onMove: (state) => applyY(state.position),
      onEnd: ({ position, projected, velocity, cancelled }) => {
        const height = sheet.offsetHeight || 240;
        if (cancelled) {
          settle(0, 0, false);
          return;
        }
        if (Math.abs(position) < 8 && Math.abs(velocity) < 80) {
          settle(0, 0, false);
          return;
        }
        const dismiss =
          position > height * 0.4 ||
          (Math.abs(velocity) > 250 && projected > height * 0.85) ||
          projected > height * 1.1;
        if (dismiss) closeSheet(velocity);
        else settle(0, velocity, false);
      },
    });
  }

  function initSwipeDemo() {
    const stage = document.querySelector("[data-swipe-demo]");
    if (!stage) return;
    const card = stage.querySelector("[data-swipe-card]");
    const reset = stage.querySelector("[data-swipe-reset]");
    const keep = stage.querySelector("[data-swipe-keep]");
    const archive = stage.querySelector("[data-swipe-archive]");
    if (!card) return;

    const threshold = 90;
    let x = 0;
    let spring = null;
    let dismissDirection = 1;
    const cancelSpring = () => {
      if (spring) {
        spring();
        spring = null;
      }
    };

    const applyX = (value) => {
      x = value;
      const rotation = Math.max(-14, Math.min(14, value / 24));
      card.style.transform = `translate3d(${value}px, 0, 0) rotate(${rotation}deg)`;
      const progress = Math.min(1, Math.abs(value) / (threshold * 1.5));
      if (keep) keep.style.opacity = value > 0 ? String(progress) : "0";
      if (archive) {
        archive.style.opacity = value < 0 ? String(progress) : "0";
      }
    };

    const settle = (target, velocity, dismiss) => {
      cancelSpring();
      const finishDismiss = () => {
        if (!dismiss || card.hidden) return;
        const hadFocus = document.activeElement === card;
        cancelSpring();
        card.hidden = true;
        if (reset) {
          reset.hidden = false;
          if (hadFocus) reset.focus({ preventScroll: true });
        }
        if (keep) keep.style.opacity = "0";
        if (archive) archive.style.opacity = "0";
      };
      const exitAt = stage.clientWidth / 2 + card.offsetWidth / 2;

      spring = springValue({
        from: x,
        to: target,
        velocity,
        response: 0.4,
        damping: 1,
        onUpdate: (value) => {
          applyX(value);
          // The card is already off-stage; don't wait for the spring's tail
          // to settle before revealing the reset affordance.
          if (dismiss && Math.abs(value) >= exitAt) finishDismiss();
        },
        onComplete: () => {
          spring = null;
          finishDismiss();
        },
      });
    };

    const resetCard = () => {
      cancelSpring();
      card.hidden = false;
      if (reset) reset.hidden = true;
      card.focus({ preventScroll: true });
      const target =
        dismissDirection * (stage.clientWidth + card.offsetWidth);
      applyX(target);
      // Come back from the side it left, not from thin air.
      settle(0, 0, false);
    };

    reset?.addEventListener("click", resetCard);

    card.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (card.hidden) return;
      const direction = event.key === "ArrowRight" ? 1 : -1;
      dismissDirection = direction;
      const target =
        direction * (stage.clientWidth + card.offsetWidth);
      settle(target, 0, true);
    });

    track(card, {
      axis: "x",
      preventDefault: false,
      getPosition: () => x,
      onStart: cancelSpring,
      onMove: (state) => applyX(state.position),
      onEnd: ({ position, projected, velocity, cancelled }) => {
        if (cancelled) {
          settle(0, 0, false);
          return;
        }
        const dismiss =
          Math.abs(position) > threshold ||
          (Math.abs(velocity) > 250 &&
            Math.abs(projected) > threshold);
        if (!dismiss) {
          settle(0, velocity, false);
          return;
        }
        const direction = Math.sign(projected || position || 1);
        dismissDirection = direction;
        const target = direction * (stage.clientWidth + card.offsetWidth);
        settle(target, velocity, true);
      },
    });
  }

  function enhanceCaretFields() {
    document.querySelectorAll("input.wu-input").forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      if (input.closest("[data-caret-field]")) return;
      const type = (input.getAttribute("type") || "text").toLowerCase();
      if (!["text", "search", "email", "url", "tel"].includes(type)) return;

      const wrap = document.createElement("span");
      wrap.className = "wu-caret-field";
      wrap.setAttribute("data-caret-field", "");
      const maxWidth = input.style.maxWidth || getComputedStyle(input).maxWidth;
      if (maxWidth && maxWidth !== "none") wrap.style.maxWidth = maxWidth;
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);

      const selectionLayer = document.createElement("span");
      selectionLayer.className = "wu-caret-selection-layer";
      selectionLayer.setAttribute("aria-hidden", "true");
      const selection = document.createElement("span");
      selection.className = "wu-caret-selection";
      selection.setAttribute("data-caret-selection", "");
      selectionLayer.appendChild(selection);
      wrap.insertBefore(selectionLayer, input);

      const caretLayer = document.createElement("span");
      caretLayer.className = "wu-caret-layer";
      caretLayer.setAttribute("aria-hidden", "true");
      const caret = document.createElement("span");
      caret.className = "wu-caret";
      caret.setAttribute("data-caret", "");
      caretLayer.appendChild(caret);
      wrap.appendChild(caretLayer);

      input.classList.add("wu-caret-input");
      input.setAttribute("data-caret-input", "");
    });
  }

  function initCaretDemo() {
    document.querySelectorAll("[data-caret-field]").forEach((field) => {
      const input = field.querySelector("[data-caret-input]");
      const caret = field.querySelector("[data-caret]");
      const selection = field.querySelector("[data-caret-selection]");
      if (!input || !caret || !selection) return;
      if (!(input instanceof HTMLInputElement)) return;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      let idleTimer = 0;
      let wasSelecting = false;
      let pointerSelecting = false;
      let anchorIndex = 0;
      let selectionAnchorIndex = 0;
      let selectionAnchorX = 0;
      let selectionLeadingX = 0;
      let selectionTargetX = 0;
      let selectionFrame = 0;
      let selectionFrameTime = 0;
      const renderSelection = () => {
        const left = Math.min(selectionAnchorX, selectionLeadingX);
        const width = Math.abs(selectionLeadingX - selectionAnchorX);
        selection.style.transform = `translateX(${left}px)`;
        selection.style.width = `${width}px`;
      };
      const cancelSelectionFrame = () => {
        if (selectionFrame) {
          cancelAnimationFrame(selectionFrame);
          selectionFrame = 0;
        }
      };
      const tickSelection = (now) => {
        selectionFrame = 0;
        if (field.classList.contains("is-static")) {
          selectionLeadingX = selectionTargetX;
          renderSelection();
          return;
        }
        if (!selectionFrameTime) selectionFrameTime = now;
        const dt = Math.min(50, now - selectionFrameTime);
        selectionFrameTime = now;
        const diff = selectionTargetX - selectionLeadingX;
        const tau = pointerSelecting ? 45 : 85;
        const factor = 1 - Math.exp(-dt / tau);
        selectionLeadingX += diff * factor;
        if (Math.abs(diff) < 0.2) {
          selectionLeadingX = selectionTargetX;
          renderSelection();
          return;
        }
        renderSelection();
        selectionFrame = requestAnimationFrame(tickSelection);
      };
      const startSelectionFrame = () => {
        if (field.classList.contains("is-static")) {
          selectionLeadingX = selectionTargetX;
          renderSelection();
          return;
        }
        if (!selectionFrame) {
          selectionFrameTime = 0;
          selectionFrame = requestAnimationFrame(tickSelection);
        }
      };
      const measure = (text) => {
        if (!context) return 0;
        const style = getComputedStyle(input);
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        let width = context.measureText(text).width;
        const spacing = Number.parseFloat(style.letterSpacing);
        if (Number.isFinite(spacing)) width += spacing * text.length;
        return width;
      };

      const sync = () => {
        clearTimeout(idleTimer);
        idleTimer = 0;
        const value = input.value;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? start;
        const style = getComputedStyle(input);
        const padding = Number.parseFloat(style.paddingLeft) || 0;
        const scroll = input.scrollLeft || 0;
        const startX = padding + measure(value.slice(0, start)) - scroll;
        const endX = padding + measure(value.slice(0, end)) - scroll;
        const focused = document.activeElement === input;
        const isSelecting = focused && end > start;
        if (!isSelecting) anchorIndex = start;

        if (isSelecting) {
          const direction = input.selectionDirection;
          if (!wasSelecting) {
            selectionAnchorIndex =
              direction === "backward"
                ? end
                : direction === "forward"
                  ? start
                  : anchorIndex;
          }
          const anchorX =
            padding + measure(value.slice(0, selectionAnchorIndex)) - scroll;
          const targetX =
            selectionAnchorIndex <= start ? endX : startX;

          selection.classList.remove("is-ending");
          selection.classList.add("is-tracking");
          selection.style.opacity = "1";
          if (!wasSelecting) {
            cancelSelectionFrame();
            selectionAnchorX = anchorX;
            selectionLeadingX = anchorX;
            selectionTargetX = targetX;
            renderSelection();
            startSelectionFrame();
          } else {
            const delta = anchorX - selectionAnchorX;
            selectionAnchorX = anchorX;
            selectionLeadingX += delta;
            selectionTargetX = targetX;
            renderSelection();
            startSelectionFrame();
          }

          caret.classList.remove("is-visible", "is-idle");
          wasSelecting = true;
          return;
        }

        cancelSelectionFrame();
        selection.classList.remove("is-tracking");
        if (wasSelecting) {
          selection.classList.add("is-ending");
          selection.style.transform = `translateX(${startX}px)`;
          selection.style.width = "0px";
          selection.style.opacity = "0";
          wasSelecting = false;
        }

        caret.style.transform = `translateX(${startX - 1}px)`;
        caret.classList.toggle("is-visible", focused);
        caret.classList.remove("is-idle");
        if (focused && !field.classList.contains("is-static")) {
          idleTimer = window.setTimeout(() => {
            if (
              document.activeElement === input &&
              input.selectionStart === input.selectionEnd
            ) {
              caret.classList.add("is-idle");
            }
          }, 400);
        }
      };

      const syncMode = () => {
        field.classList.toggle(
          "is-static",
          !allowed("typing") || effectiveReduced(),
        );
        sync();
      };

      input.addEventListener("focus", sync);
      input.addEventListener("blur", sync);
      input.addEventListener("input", sync);
      input.addEventListener("select", sync);
      input.addEventListener("keyup", sync);
      input.addEventListener("pointerdown", () => {
        pointerSelecting = true;
      });
      window.addEventListener(
        "pointerup",
        () => {
          pointerSelecting = false;
        },
        true,
      );
      window.addEventListener(
        "pointercancel",
        () => {
          pointerSelecting = false;
        },
        true,
      );
      input.addEventListener("pointerup", sync);
      input.addEventListener("scroll", sync, { passive: true });
      document.addEventListener("selectionchange", () => {
        if (document.activeElement === input) sync();
      });
      window.addEventListener("resize", sync);
      document.addEventListener("wulon:localechange", sync);
      document.addEventListener("wulon:motionchange", syncMode);
      if (document.fonts?.ready) document.fonts.ready.then(sync);
      syncMode();
    });
  }

  initDock();
  apply(false);
  bindDemos();
  initValueWatchers();
  initReveal();
  initSheetDemo();
  initSwipeDemo();
  enhanceCaretFields();
  initCaretDemo();

  window.WulonMotion = {
    configure,
    reset: () => configure(DEFAULTS),
    enter,
    leave,
    refocus,
    update,
    count,
    stagger,
    track,
    drag,
    project,
    rubberband,
    spring: springValue,
    get config() {
      return getConfig();
    },
    get enabled() {
      return config.enabled;
    },
    get reduced() {
      return effectiveReduced();
    },
    refresh: () => apply(false),
  };
})();
