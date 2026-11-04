(() => {
  const root = document.querySelector("[data-motion-lab]");
  if (!root || !window.WulonMotion) return;

  const DEFAULT = {
    duration: 160,
    indicator: 160,
    response: 0.4,
    damping: 1,
    threshold: 40,
  };

  const controls = {
    duration: root.querySelector("#lab-duration"),
    indicator: root.querySelector("#lab-indicator"),
    response: root.querySelector("#lab-response"),
    damping: root.querySelector("#lab-damping"),
    threshold: root.querySelector("#lab-threshold"),
  };
  const outputs = {};
  root.querySelectorAll("[data-lab-value]").forEach((output) => {
    outputs[output.dataset.labValue] = output;
  });
  const readouts = {};
  root.querySelectorAll("[data-lab-readout]").forEach((readout) => {
    readouts[readout.dataset.labReadout] = readout;
  });

  let state = { ...DEFAULT };

  function readState() {
    state = {
      duration: Number(controls.duration.value) || DEFAULT.duration,
      indicator: Number(controls.indicator.value) || DEFAULT.indicator,
      response: Number(controls.response.value) || DEFAULT.response,
      damping: Number(controls.damping.value) || DEFAULT.damping,
      threshold: Number(controls.threshold.value) || DEFAULT.threshold,
    };
  }

  function render() {
    readState();
    root.style.setProperty("--lab-duration", `${state.duration}ms`);
    root.style.setProperty("--lab-indicator", `${state.indicator}ms`);
    outputs.duration.textContent = `${Math.round(state.duration)}ms`;
    outputs.indicator.textContent = `${Math.round(state.indicator)}ms`;
    outputs.response.textContent = `${state.response.toFixed(2)}s`;
    outputs.damping.textContent = state.damping.toFixed(2);
    outputs.threshold.textContent = `${Math.round(state.threshold)}%`;
    readouts.tabs.textContent = `${Math.round(state.indicator)}ms`;
    readouts.segmented.textContent = `${Math.round(state.indicator)}ms`;
    readouts.sheet.textContent = `${state.response.toFixed(2)}s / ${state.damping.toFixed(2)}`;
    readouts.card.textContent = `${Math.round(state.threshold)}%`;
  }

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", render);
  });
  render();

  function durationMs() {
    const raw = getComputedStyle(root).getPropertyValue("--lab-duration").trim();
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : state.duration;
  }

  /* ------------------------------------------------------------------------
     Sheet: CSS handles open/close; release uses the real spring engine.
     ------------------------------------------------------------------------ */
  const sheetStage = root.querySelector("[data-lab-sheet]");
  const sheet = root.querySelector("[data-lab-sheet-panel]");
  const sheetOpen = root.querySelector("[data-lab-sheet-open]");
  const sheetClose = root.querySelector("[data-lab-sheet-close]");
  const sheetHandle = root.querySelector("[data-lab-sheet-handle]");
  let sheetIsOpen = false;
  let sheetSpring = null;
  let sheetDrag = null;

  function setSheetY(value) {
    sheet.style.transform = `translate3d(0, ${value}px, 0)`;
  }

  function clearSheetInline() {
    sheet.style.removeProperty("transform");
  }

  function openSheet() {
    sheetSpring?.();
    sheetSpring = null;
    clearSheetInline();
    sheetIsOpen = true;
    sheet.classList.add("is-open");
    sheet.inert = false;
    sheet.removeAttribute("aria-hidden");
    sheetOpen.hidden = true;
    sheetOpen.setAttribute("aria-expanded", "true");
    sheetClose?.focus({ preventScroll: true });
  }

  function closeSheet(focus = true) {
    if (!sheetIsOpen) return;
    sheetSpring?.();
    sheetSpring = null;
    sheetDrag = null;
    sheetIsOpen = false;
    sheet.classList.remove("is-dragging");
    // Pin the current visual position, then let the closed class animate from
    // that position instead of jumping when the inline drag transform is
    // removed.
    const current = getComputedStyle(sheet).transform;
    sheet.style.transition = "none";
    sheet.style.transform = current;
    sheet.classList.remove("is-open");
    void sheet.offsetHeight;
    sheet.style.removeProperty("transition");
    sheet.style.removeProperty("transform");
    sheetOpen.hidden = false;
    sheetOpen.setAttribute("aria-expanded", "false");
    if (focus) sheetOpen.focus({ preventScroll: true });
    sheet.inert = true;
    sheet.setAttribute("aria-hidden", "true");
  }

  sheetOpen?.addEventListener("click", openSheet);
  sheetClose?.addEventListener("click", closeSheet);

  sheetHandle?.addEventListener("pointerdown", (event) => {
    if (!sheetIsOpen) return;
    event.preventDefault();
    sheetSpring?.();
    sheetSpring = null;
    sheetDrag = {
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      distance: 0,
      velocity: 0,
    };
    sheet.classList.add("is-dragging");
    sheet.style.transition = "none";
    sheetHandle.setPointerCapture(event.pointerId);
  });

  sheetHandle?.addEventListener("pointermove", (event) => {
    if (!sheetDrag) return;
    const distance = Math.max(0, event.clientY - sheetDrag.startY);
    const now = performance.now();
    const elapsed = Math.max(1, now - sheetDrag.lastTime);
    sheetDrag.velocity = ((event.clientY - sheetDrag.lastY) / elapsed) * 1000;
    sheetDrag.lastY = event.clientY;
    sheetDrag.lastTime = now;
    sheetDrag.distance = distance;
    setSheetY(distance);
  });

  function endSheetDrag() {
    if (!sheetDrag) return;
    const { distance, velocity } = sheetDrag;
    sheetDrag = null;
    sheet.classList.remove("is-dragging");
    sheet.style.removeProperty("transition");

    const threshold = sheetStage.clientHeight * (state.threshold / 100);
    const projected = distance + WulonMotion.project(velocity);
    const flick = velocity > 600 && projected > threshold * 1.35;
    if (distance > threshold || flick) {
      setSheetY(distance);
      requestAnimationFrame(closeSheet);
      return;
    }

    sheetSpring = WulonMotion.spring({
      from: distance,
      to: 0,
      response: state.response,
      damping: state.damping,
      velocity,
      onUpdate: setSheetY,
      onComplete: () => {
        sheetSpring = null;
        clearSheetInline();
      },
    });
  }

  sheetHandle?.addEventListener("pointerup", endSheetDrag);
  sheetHandle?.addEventListener("pointercancel", endSheetDrag);

  /* ------------------------------------------------------------------------
     Card: horizontal drag; threshold and spring are live. Non-spring exit
     uses the scoped duration.
     ------------------------------------------------------------------------ */
  const cardStage = root.querySelector("[data-lab-card-stage]");
  const card = root.querySelector("[data-lab-card]");
  const cardReset = root.querySelector("[data-lab-card-reset]");
  let cardSpring = null;
  let cardDrag = null;
  let cardDismissed = false;
  let cardTimer = 0;

  function setCardX(value) {
    card.style.transform = `translate3d(${value}px, 0, 0) rotate(${value / 24}deg)`;
  }

  function resetCard(animate = false) {
    cardSpring?.();
    cardSpring = null;
    cardDrag = null;
    window.clearTimeout(cardTimer);
    cardTimer = 0;
    cardDismissed = false;
    card.hidden = false;
    cardReset.hidden = true;
    card.style.opacity = "1";
    card.style.transition = animate
      ? `transform ${durationMs()}ms var(--wu-ease-out)`
      : "none";
    setCardX(0);
    if (animate) {
      requestAnimationFrame(() => {
        card.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
      });
      window.setTimeout(() => card.style.removeProperty("transition"), durationMs() + 32);
    } else {
      requestAnimationFrame(() => card.style.removeProperty("transition"));
    }
  }

  function flyCard(direction) {
    cardDismissed = true;
    const ms = durationMs();
    const distance = cardStage.clientWidth + card.offsetWidth;
    card.style.transition = `transform ${ms}ms var(--wu-ease-out), opacity ${ms}ms var(--wu-ease-out)`;
    card.style.transform = `translate3d(${direction * distance}px, 0, 0) rotate(${direction * 10}deg)`;
    card.style.opacity = "0";
    window.clearTimeout(cardTimer);
    cardTimer = window.setTimeout(() => {
      const hadFocus = document.activeElement === card;
      card.hidden = true;
      cardReset.hidden = false;
      cardTimer = 0;
      if (hadFocus) cardReset.focus({ preventScroll: true });
    }, ms);
  }

  card?.addEventListener("pointerdown", (event) => {
    if (cardDismissed) return;
    event.preventDefault();
    cardSpring?.();
    cardSpring = null;
    cardDrag = {
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      distance: 0,
      velocity: 0,
    };
    card.style.transition = "none";
    card.setPointerCapture(event.pointerId);
  });

  card?.addEventListener("pointermove", (event) => {
    if (!cardDrag) return;
    const distance = event.clientX - cardDrag.startX;
    const now = performance.now();
    const elapsed = Math.max(1, now - cardDrag.lastTime);
    cardDrag.velocity = ((event.clientX - cardDrag.lastX) / elapsed) * 1000;
    cardDrag.lastX = event.clientX;
    cardDrag.lastTime = now;
    cardDrag.distance = distance;
    setCardX(distance);
  });

  function endCardDrag() {
    if (!cardDrag) return;
    const { distance, velocity } = cardDrag;
    cardDrag = null;
    const threshold = cardStage.clientWidth * (state.threshold / 100);
    const projected = distance + WulonMotion.project(velocity);
    const flick = Math.abs(velocity) > 600 && Math.abs(projected) > threshold * 1.35;
    if (Math.abs(distance) > threshold || flick) {
      flyCard(Math.sign(distance) || Math.sign(projected) || 1);
      return;
    }
    cardSpring = WulonMotion.spring({
      from: distance,
      to: 0,
      response: state.response,
      damping: state.damping,
      velocity,
      onUpdate: setCardX,
      onComplete: () => {
        cardSpring = null;
        setCardX(0);
      },
    });
  }

  card?.addEventListener("pointerup", endCardDrag);
  card?.addEventListener("pointercancel", endCardDrag);
  card?.addEventListener("keydown", (event) => {
    if (cardDismissed) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    flyCard(event.key === "ArrowRight" ? 1 : -1);
  });
  cardReset?.addEventListener("click", () => {
    resetCard(true);
    card?.focus({ preventScroll: true });
  });

  root.querySelector("[data-lab-reset]")?.addEventListener("click", () => {
    Object.entries(DEFAULT).forEach(([key, value]) => {
      controls[key].value = String(value);
    });
    render();
    closeSheet(false);
    resetCard(false);
  });
})();
