(() => {
  const root = document.documentElement;
  const THEME_KEY = "wulon-spec-theme";
  const PALETTE_KEY = "wulon-spec-palette";
  const LOCALE_KEY = "wulon-spec-locale";
  const PALETTES = {
    green: { label: "West Lake Green" },
    white: { label: "Silver Needle" },
    red: { label: "Keemun" },
    yellow: { label: "Junshan" },
    puer: { label: "Yunnan Puer" },
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

  const savedTheme = safeGet(THEME_KEY);
  const savedPalette = safeGet(PALETTE_KEY);
  const savedLocale = safeGet(LOCALE_KEY);
  const params = new URLSearchParams(window.location.search);
  const requestedTheme = params.get("theme");
  const requestedPalette = params.get("palette");
  const requestedLocale = params.get("lang");
  const LOCALE_IDS = window.WulonI18n
    ? window.WulonI18n.locales.map((locale) => locale.id)
    : ["zh-CN", "en"];
  const isLocale = (value) => LOCALE_IDS.includes(value);
  const initialLocale = isLocale(requestedLocale)
    ? requestedLocale
    : isLocale(savedLocale)
      ? savedLocale
      : "zh-CN";
  const initialTheme =
    requestedTheme === "light" || requestedTheme === "dark"
      ? requestedTheme
      : savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "dark";
  const candidatePalette = requestedPalette || savedPalette;
  const initialPalette =
    candidatePalette && PALETTES[candidatePalette] ? candidatePalette : "green";

  root.classList.toggle("dark", initialTheme === "dark");
  root.dataset.palette = initialPalette;

  function applyTheme(theme) {
    root.classList.toggle("dark", theme === "dark");
    safeSet(THEME_KEY, theme);
    document.querySelectorAll("[data-theme-value]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeValue === theme),
      );
    });
    updateColors();
    document.dispatchEvent(
      new CustomEvent("wulon:themechange", { detail: { theme } }),
    );
  }

  function applyPalette(palette) {
    if (!PALETTES[palette]) return;
    root.dataset.palette = palette;
    safeSet(PALETTE_KEY, palette);
    const label = document.querySelector("#paletteLabel");
    if (label) {
      label.dataset.palette = palette;
      label.textContent = window.WulonI18n
        ? window.WulonI18n.paletteName(palette)
        : PALETTES[palette].label;
    }
    document.querySelectorAll("[data-palette-value]").forEach((button) => {
      button.setAttribute(
        "aria-checked",
        String(button.dataset.paletteValue === palette),
      );
    });
    updateColors();
  }

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function updateColors() {
    document.querySelectorAll("[data-hex-of]").forEach((node) => {
      const value = cssVar(node.dataset.hexOf);
      if (value) node.textContent = value;
    });
    const dot = document.querySelector("#paletteDot");
    if (dot) dot.style.background = cssVar("--ds-brand-600");
  }

  /* --------------------------------------------------------------------------
     Dropdown menu
     One wrapper is one menu:
       <div class="wu-menu-wrap" data-menu>
         <button data-menu-toggle aria-haspopup="menu">…</button>
         <div class="wu-menu" role="menu" hidden>…</div>
       </div>
     Menus are positioned fixed from the trigger, so a table or card with
     overflow clipping never cuts them off. Arrow keys, Home/End, typeahead,
     Escape, outside click, and focus return all live here; page code only
     reacts to the item it cares about.
     -------------------------------------------------------------------------- */

  const menuState = new WeakMap();
  const openMenus = new Set();
  let menuSeq = 0;
  let typeahead = "";
  let typeaheadTimer = 0;

  function menuItems(menu) {
    return Array.from(
      menu.querySelectorAll(
        '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"]',
      ),
    ).filter(
      (item) =>
        !item.disabled && item.getAttribute("aria-disabled") !== "true",
    );
  }

  /* Runs again on open so items added to an existing menu after init still
     receive a role and enter the roving tabindex. */
  function prepareMenu(menu) {
    if (!menu.getAttribute("role")) menu.setAttribute("role", "menu");
    menu.querySelectorAll(".wu-menu-label").forEach((label) => {
      label.setAttribute("role", "presentation");
    });
    menu.querySelectorAll(".wu-menu-sep").forEach((separator) => {
      separator.setAttribute("role", "separator");
    });
    menu.querySelectorAll(".wu-menu-item").forEach((item) => {
      if (!item.getAttribute("role")) item.setAttribute("role", "menuitem");
      item.tabIndex = -1;
    });
  }

  function setRoving(menu, active) {
    menuItems(menu).forEach((item) => {
      item.tabIndex = item === active ? 0 : -1;
    });
  }

  function positionMenu(ctrl) {
    const { menu, toggle } = ctrl;
    const trigger = toggle.getBoundingClientRect();
    const edge = 8;
    const gap = 6;

    // A reused menu must not inherit the previous viewport's height cap.
    menu.style.maxHeight = "";
    menu.style.minWidth = "";
    if (ctrl.wrap.dataset.menuWidth === "trigger") {
      menu.style.minWidth = `${Math.ceil(trigger.width)}px`;
    }
    let panel = menu.getBoundingClientRect();

    const maxLeft = Math.max(edge, window.innerWidth - panel.width - edge);
    let left = trigger.left;
    if (left > maxLeft) left = trigger.right - panel.width;
    left = Math.max(edge, Math.min(left, maxLeft));

    let top = trigger.bottom + gap;
    const below = window.innerHeight - edge - top;
    const above = trigger.top - gap - edge;

    if (panel.height > below && above >= panel.height) {
      top = trigger.top - gap - panel.height;
    } else if (panel.height > below) {
      // Neither side fits: keep the menu below the trigger and let it scroll
      // instead of sliding up over the control that opened it.
      menu.style.maxHeight = `${Math.max(96, below)}px`;
      panel = menu.getBoundingClientRect();
    }

    top = Math.max(
      edge,
      Math.min(top, window.innerHeight - panel.height - edge),
    );

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;

    const originX = left <= trigger.left + 1 ? "left" : "right";
    const originY = top < trigger.top ? "bottom" : "top";
    ctrl.origin = `${originX} ${originY}`;
    menu.style.transformOrigin = ctrl.origin;
  }

  function closeMenu(ctrl, returnFocus = false) {
    if (!ctrl || ctrl.menu.hidden || ctrl.closing) return;
    ctrl.toggle.setAttribute("aria-expanded", "false");
    delete ctrl.wrap.dataset.open;
    delete ctrl.wrap.dataset.keyboard;
    openMenus.delete(ctrl);

    if (returnFocus) ctrl.toggle.focus({ preventScroll: true });

    const finish = () => {
      if (!ctrl.closing) return;
      ctrl.closing = false;
      ctrl.leaveAnim = null;
      ctrl.menu.hidden = true;
      ctrl.menu.style.pointerEvents = "";
    };

    ctrl.closing = true;
    ctrl.menu.style.pointerEvents = "none";
    ctrl.leaveAnim =
      window.WulonMotion?.leave(ctrl.menu, {
        profile: "menuOut",
        effect: "pop",
        onFinish: finish,
      }) || null;
    if (!ctrl.leaveAnim) finish();
  }

  function closeAllMenus(returnFocus = false) {
    Array.from(openMenus).forEach((ctrl) => closeMenu(ctrl, returnFocus));
  }

  function openMenu(ctrl, options = {}) {
    const { menu, toggle, wrap } = ctrl;
    if (!menu.hidden && !ctrl.closing) return;

    if (ctrl.closing) {
      ctrl.leaveAnim?.cancel();
      ctrl.leaveAnim = null;
      ctrl.closing = false;
      menu.style.pointerEvents = "";
    }
    closeAllMenus(false);

    prepareMenu(menu);
    const items = menuItems(menu);
    if (!items.length) return;

    typeahead = "";
    menu.hidden = false;
    wrap.dataset.open = "";
    if (options.keyboard) wrap.dataset.keyboard = "";
    else delete wrap.dataset.keyboard;
    toggle.setAttribute("aria-expanded", "true");
    openMenus.add(ctrl);
    positionMenu(ctrl);
    window.WulonMotion?.enter(menu, { profile: "menu", effect: "pop" });

    let target = items[0];
    if (options.to === "last") {
      target = items[items.length - 1];
    } else if (options.to === "checked") {
      target =
        items.find(
          (item) =>
            item.getAttribute("aria-checked") === "true" ||
            item.getAttribute("aria-selected") === "true",
        ) || items[0];
    }

    setRoving(menu, target);
    target.focus({ preventScroll: true });
  }

  function setChecked(item) {
    const role = item.getAttribute("role");
    if (role === "menuitemradio") {
      const menu = item.closest(".wu-menu");
      if (!menu) return;
      menu.querySelectorAll('[role="menuitemradio"]').forEach((peer) => {
        peer.setAttribute("aria-checked", String(peer === item));
      });
    } else if (role === "option") {
      const menu = item.closest(".wu-menu");
      if (!menu) return;
      menu.querySelectorAll('[role="option"]').forEach((peer) => {
        peer.setAttribute("aria-selected", String(peer === item));
      });
    } else if (role === "menuitemcheckbox") {
      item.setAttribute(
        "aria-checked",
        item.getAttribute("aria-checked") === "true" ? "false" : "true",
      );
    }
  }

  function typeaheadMatch(items, character) {
    typeahead += character.toLowerCase();
    clearTimeout(typeaheadTimer);
    typeaheadTimer = window.setTimeout(() => {
      typeahead = "";
    }, 600);
    return items.find((item) =>
      item.textContent.trim().toLowerCase().startsWith(typeahead),
    );
  }

  function initMenus(scope = document) {
    const wraps = [];
    if (scope.matches && scope.matches("[data-menu]")) wraps.push(scope);
    wraps.push(...scope.querySelectorAll("[data-menu]"));

    wraps.forEach((wrap) => {
      if (menuState.has(wrap)) return;
      const toggle = wrap.querySelector("[data-menu-toggle]");
      const menu = wrap.querySelector("[data-menu-popup], .wu-menu");
      if (!toggle || !menu) return;

      if (!toggle.id) toggle.id = `wu-menu-button-${++menuSeq}`;
      if (!menu.id) menu.id = `wu-menu-${++menuSeq}`;
      const kind =
        wrap.dataset.menuKind === "listbox" ||
        menu.getAttribute("role") === "listbox"
          ? "listbox"
          : "menu";
      if (!menu.getAttribute("role")) menu.setAttribute("role", kind);
      prepareMenu(menu);
      if (
        !menu.hasAttribute("aria-labelledby") &&
        !menu.hasAttribute("aria-label")
      ) {
        menu.setAttribute("aria-labelledby", toggle.id);
      }
      toggle.setAttribute("aria-haspopup", kind);
      toggle.setAttribute("aria-controls", menu.id);
      toggle.setAttribute("aria-expanded", "false");

      const ctrl = {
        wrap,
        toggle,
        menu,
        closing: false,
        leaveAnim: null,
        origin: null,
      };
      menuState.set(wrap, ctrl);

      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (menu.hidden || ctrl.closing) {
          // `detail: 0` is keyboard activation (Enter/Space) on the trigger.
          openMenu(ctrl, { to: "checked", keyboard: event.detail === 0 });
        } else {
          closeMenu(ctrl, true);
        }
      });

      toggle.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          openMenu(ctrl, {
            to: event.key === "ArrowUp" ? "last" : "checked",
            keyboard: true,
          });
        }
      });

      menu.addEventListener("click", (event) => {
        const item = event.target.closest(
          '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"]',
        );
        if (!item || !menu.contains(item)) return;
        if (item.disabled || item.getAttribute("aria-disabled") === "true") {
          return;
        }
        setChecked(item);
        const value =
          item.dataset.paletteValue ??
          item.dataset.localeValue ??
          item.dataset.value ??
          null;
        closeMenu(ctrl, true);
        item.dispatchEvent(
          new CustomEvent("wu:menuselect", {
            bubbles: true,
            detail: { item, value, role: item.getAttribute("role") },
          }),
        );
      });

      menu.addEventListener("keydown", (event) => {
        const items = menuItems(menu);
        if (!items.length) return;
        const currentIndex = items.indexOf(document.activeElement);
        let next = null;

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const base =
            currentIndex === -1
              ? event.key === "ArrowUp"
                ? items.length
                : -1
              : currentIndex;
          const offset = event.key === "ArrowDown" ? 1 : -1;
          next = items[(base + offset + items.length) % items.length];
        } else if (event.key === "Home") {
          next = items[0];
        } else if (event.key === "End") {
          next = items[items.length - 1];
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeMenu(ctrl, true);
          return;
        } else if (event.key === "Tab") {
          closeMenu(ctrl, false);
          return;
        } else if (
          event.key.length === 1 &&
          event.key !== " " &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          const match = typeaheadMatch(items, event.key);
          if (match) {
            event.preventDefault();
            wrap.dataset.keyboard = "";
            setRoving(menu, match);
            match.focus({ preventScroll: true });
          }
          return;
        } else {
          return;
        }

        event.preventDefault();
        wrap.dataset.keyboard = "";
        setRoving(menu, next);
        next.focus({ preventScroll: true });
      });
    });
  }

  /* A listbox select reuses the menu surface, positioning, keyboard, motion,
     and focus return. The trigger keeps the field value and an optional hidden
     input for form submission. */
  function initSelects() {
    document.querySelectorAll("[data-select]").forEach((wrap) => {
      const value = wrap.querySelector("[data-select-value]");
      const input = wrap.querySelector("[data-select-input]");
      const options = Array.from(wrap.querySelectorAll('[role="option"]'));
      if (!options.length) return;

      const render = (option) => {
        options.forEach((item) => {
          item.setAttribute("aria-selected", String(item === option));
        });
        const label = option.dataset.label || option.textContent.trim();
        if (value) value.textContent = label;
        wrap.dataset.value = option.dataset.value || label;
      };

      options.forEach((option) => {
        option.addEventListener("click", () => {
          render(option);
          if (input) {
            input.value = option.dataset.value || option.textContent.trim();
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
      });

      const selected =
        options.find(
          (option) => option.getAttribute("aria-selected") === "true",
        ) || options[0];
      render(selected);
      if (input && value) input.value = selected.dataset.value || value.textContent;
    });
  }

  document.addEventListener("pointerdown", (event) => {
    Array.from(openMenus).forEach((ctrl) => {
      if (!ctrl.wrap.contains(event.target)) closeMenu(ctrl, false);
    });
  });

  document.addEventListener("focusin", (event) => {
    Array.from(openMenus).forEach((ctrl) => {
      if (!ctrl.wrap.contains(event.target)) closeMenu(ctrl, false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMenus(true);
      closeDialog();
    }
  });

  window.addEventListener("resize", () => closeAllMenus(false));
  window.addEventListener(
    "scroll",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".wu-menu")
      ) {
        return;
      }
      closeAllMenus(false);
    },
    true,
  );

  /* Wrap the text node so a label can truncate without clipping the control's
     own underline or press transform. */
  function wrapLabelText(button, className) {
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    }
    nodes.forEach((node) => {
      const label = document.createElement("span");
      label.className = className;
      label.textContent = node.nodeValue.trim();
      node.replaceWith(label);
    });
  }

  /* Generic segmented controls. The theme switch also lives inside one. */
  document.querySelectorAll("[data-segmented]").forEach((group) => {
    const buttons = Array.from(group.querySelectorAll("button"));
    buttons.forEach((button) => wrapLabelText(button, "wu-segmented-label"));
    const indicator = document.createElement("span");
    indicator.className = "wu-segmented-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.style.transition = "none";
    group.append(indicator);
    group.classList.add("has-indicator");

    function placeIndicator() {
      const active = buttons.find(
        (button) => button.getAttribute("aria-pressed") === "true",
      );
      if (!active) return;
      indicator.style.setProperty("--wu-seg-x", `${active.offsetLeft}px`);
      indicator.style.setProperty(
        "--wu-seg-w",
        `${active.getBoundingClientRect().width}px`,
      );
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((item) => {
          item.setAttribute("aria-pressed", String(item === button));
        });
        if (button.dataset.themeValue) applyTheme(button.dataset.themeValue);
        requestAnimationFrame(placeIndicator);
      });
    });

    placeIndicator();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        indicator.style.transition = "";
        placeIndicator();
      });
    });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(placeIndicator);
      buttons.forEach((button) => observer.observe(button));
      observer.observe(group);
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(placeIndicator));
    }
    window.addEventListener("resize", placeIndicator);
    document.addEventListener("wulon:localechange", () => {
      requestAnimationFrame(placeIndicator);
    });
    document.addEventListener("wulon:themechange", () => {
      requestAnimationFrame(placeIndicator);
    });
  });

  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.themeValue));
  });

  document.querySelectorAll("[data-palette-value]").forEach((button) => {
    button.addEventListener("click", () =>
      applyPalette(button.dataset.paletteValue),
    );
  });

  /* The locale list belongs to i18n.js. Building the menu from it means a new
     language never needs a second copy of the option markup. */
  function buildLocaleMenu() {
    const menu = document.querySelector("#localeMenu");
    if (!menu || !window.WulonI18n) return;
    if (menu.querySelector("[data-locale-value]")) return;
    const SVG = "http://www.w3.org/2000/svg";

    window.WulonI18n.locales.forEach(({ id, label }) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "wu-menu-item";
      item.setAttribute("role", "menuitemradio");
      item.dataset.localeValue = id;
      item.setAttribute("aria-checked", "false");

      const text = document.createElement("span");
      text.lang = id;
      text.setAttribute("data-i18n-ignore", "");
      text.textContent = label;

      const check = document.createElementNS(SVG, "svg");
      check.setAttribute("class", "wu-icon wu-menu-check");
      check.setAttribute("aria-hidden", "true");
      const use = document.createElementNS(SVG, "use");
      use.setAttribute("href", "#i-check");
      check.append(use);

      item.append(text, check);
      menu.append(item);
    });
  }

  buildLocaleMenu();

  document.querySelectorAll("[data-locale-value]").forEach((button) => {
    button.addEventListener("click", () =>
      applyLocale(button.dataset.localeValue),
    );
  });

  /* Tabs */
  document.querySelectorAll("[data-tabs]").forEach((tabs, index) => {
    const panelHost = tabs.parentElement;
    const buttons = Array.from(tabs.querySelectorAll("[data-tab]"));
    buttons.forEach((button) => wrapLabelText(button, "wu-tab-label"));
    const panels = Array.from(panelHost.querySelectorAll("[data-panel]"));
    const groupId = tabs.id || `tabs-${index + 1}`;
    const indicator = document.createElement("span");
    indicator.className = "wu-tab-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.style.transition = "none";
    tabs.append(indicator);
    tabs.classList.add("has-indicator");

    buttons.forEach((button) => {
      const panel = panels.find(
        (item) => item.dataset.panel === button.dataset.tab,
      );
      button.id = button.id || `${groupId}-tab-${button.dataset.tab}`;
      if (!panel) return;
      panel.id = panel.id || `${groupId}-panel-${panel.dataset.panel}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", button.id);
      panel.tabIndex = 0;
      button.setAttribute("aria-controls", panel.id);
    });

    function placeIndicator() {
      const active = buttons.find(
        (button) => button.getAttribute("aria-selected") === "true",
      );
      if (!active) return;
      const left = active.offsetLeft + 8;
      const width = Math.max(0, active.getBoundingClientRect().width - 16);
      indicator.style.setProperty("--wu-tab-x", `${left}px`);
      indicator.style.setProperty("--wu-tab-w", `${width}px`);
    }

    function select(name) {
      buttons.forEach((button) => {
        const selected = button.dataset.tab === name;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== name;
      });
      placeIndicator();
    }

    function moveFocus(button, delta) {
      const current = buttons.indexOf(button);
      if (current < 0) return;
      const next = (current + delta + buttons.length) % buttons.length;
      buttons[next].focus();
      select(buttons[next].dataset.tab);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => select(button.dataset.tab));
      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") moveFocus(button, 1);
        else if (event.key === "ArrowLeft") moveFocus(button, -1);
        else if (event.key === "Home") {
          buttons[0].focus();
          select(buttons[0].dataset.tab);
        } else if (event.key === "End") {
          const last = buttons[buttons.length - 1];
          last.focus();
          select(last.dataset.tab);
        } else {
          return;
        }
        event.preventDefault();
      });
    });

    const initial =
      buttons.find(
        (button) => button.getAttribute("aria-selected") === "true",
      ) || buttons[0];
    if (initial) select(initial.dataset.tab);

    requestAnimationFrame(() => {
      indicator.style.transition = "";
      placeIndicator();
    });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(placeIndicator);
      buttons.forEach((button) => observer.observe(button));
      observer.observe(tabs);
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(placeIndicator));
    }
    window.addEventListener("resize", placeIndicator);
    document.addEventListener("wulon:localechange", () => {
      requestAnimationFrame(placeIndicator);
    });
  });

  /* Swatches: copy the resolved value, not the raw var() expression. */
  const status = document.querySelector("#copyStatus");
  let statusTimer = 0;
  function showStatus(message) {
    if (!status) return;
    status.textContent = message;
    status.style.opacity = "1";
    clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.style.opacity = "0";
    }, 1800);
  }

  document.querySelectorAll("[data-copy-var]").forEach((button) => {
    button.addEventListener("click", async () => {
      const name = button.dataset.copyVar;
      const value = cssVar(name);
      if (!value) return;
      try {
        await navigator.clipboard.writeText(`${name}: ${value}`);
        const copied = window.WulonI18n ? window.WulonI18n.t("Copied") : "Copied";
        showStatus(`${copied} ${name}: ${value}`);
      } catch {
        showStatus(`${name}: ${value}`);
      }
    });
  });

  /* Switches: all are buttons with role="switch". */
  document.querySelectorAll(".wu-switch").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const next = button.getAttribute("aria-checked") !== "true";
      button.setAttribute("aria-checked", String(next));
    });
  });

  /* Range fill + custom thumb. The native thumb is transparent; the visible
     thumb is positioned from the same percentage as the fill, so both can
     ease together. */
  document.querySelectorAll(".wu-range").forEach((input) => {
    if (input.parentElement?.classList.contains("wu-range-wrap")) return;
    const wrap = document.createElement("span");
    wrap.className = "wu-range-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const thumb = document.createElement("span");
    thumb.className = "wu-range-thumb";
    thumb.setAttribute("aria-hidden", "true");
    wrap.appendChild(thumb);

    const paint = () => {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const value = Number(input.value || 0);
      const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      input.style.setProperty("--wu-range", `${percent}%`);
      const width = input.getBoundingClientRect().width;
      const x = (percent / 100) * Math.max(0, width - 16);
      thumb.style.setProperty("--wu-thumb-x", `${x}px`);
    };
    input.addEventListener("input", paint);
    paint();
    requestAnimationFrame(() => {
      input.classList.add("is-ready");
      wrap.classList.add("is-ready");
    });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(paint);
      observer.observe(input);
      observer.observe(wrap);
    }
  });

  /* Rows with a secondary action: right-click or Shift+F10 opens the same
     action menu at the pointer instead of at the ellipsis. */
  document.querySelectorAll("[data-row-context]").forEach((row) => {
    const toggle = row.querySelector("[data-menu-toggle]");
    const menu = row.querySelector(".wu-menu");
    const wrap = row.querySelector("[data-menu]");
    if (!toggle || !menu || !wrap) return;
    row.setAttribute("aria-haspopup", "menu");

    const openAt = (x, y) => {
      if (!wrap.hasAttribute("data-open")) toggle.click();
      row.classList.add("is-context");
      const panel = menu.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(x, window.innerWidth - panel.width - 8),
      );
      const top = Math.max(
        8,
        Math.min(y, window.innerHeight - panel.height - 8),
      );
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
      menu.style.transformOrigin = "top left";
    };

    row.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".wu-menu")) return;
      event.preventDefault();
      row.focus({ preventScroll: true });
      openAt(event.clientX, event.clientY);
    });
    row.addEventListener("keydown", (event) => {
      if (
        event.key !== "ContextMenu" &&
        !(event.shiftKey && event.key === "F10")
      ) {
        return;
      }
      event.preventDefault();
      const trigger = toggle.getBoundingClientRect();
      openAt(trigger.left, trigger.bottom + 6);
    });
    new MutationObserver(() => {
      if (menu.hidden) row.classList.remove("is-context");
    }).observe(menu, { attributes: true, attributeFilter: ["hidden"] });
  });

  /* Dialog */
  const backdrop = document.querySelector("#demo-dialog");
  const dialog = backdrop ? backdrop.querySelector(".wu-dialog") : null;
  let lastFocus = null;
  let dialogClosing = false;
  let dialogLeave = null;

  function openDialog() {
    if (!backdrop) return;
    if (dialogClosing) {
      dialogLeave?.cancel();
      dialogLeave = null;
      dialogClosing = false;
      backdrop.hidden = false;
      backdrop.style.pointerEvents = "";
    } else {
      if (!backdrop.hidden) return;
      lastFocus = document.activeElement;
      backdrop.hidden = false;
    }

    document.body.style.overflow = "hidden";
    window.WulonMotion?.enter(backdrop, { profile: "fade", effect: "pop" });
    if (dialog) {
      window.WulonMotion?.enter(dialog, { profile: "modal", effect: "pop" });
    }

    const field = backdrop.querySelector(
      "input:not([disabled]), textarea:not([disabled])",
    );
    const focusable =
      field || backdrop.querySelector("button:not([disabled])");
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (!backdrop || backdrop.hidden || dialogClosing) return;

    const finish = () => {
      if (!dialogClosing) return;
      dialogClosing = false;
      dialogLeave = null;
      backdrop.hidden = true;
      backdrop.style.pointerEvents = "";
      document.body.style.overflow = "";
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus({ preventScroll: true });
      }
    };

    dialogClosing = true;
    backdrop.style.pointerEvents = "none";
    const backdropLeave = window.WulonMotion?.leave(backdrop, {
      profile: "fade",
      effect: "pop",
      onFinish: finish,
    });
    const dialogLeaveAnimation = dialog
      ? window.WulonMotion?.leave(dialog, {
          profile: "modalOut",
          effect: "pop",
        })
      : null;
    dialogLeave = {
      cancel() {
        backdropLeave?.cancel();
        dialogLeaveAnimation?.cancel();
      },
    };
    if (!backdropLeave && !dialogLeaveAnimation) finish();
  }

  document.querySelectorAll("[data-dialog-open]").forEach((button) => {
    button.addEventListener("click", openDialog);
  });
  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", closeDialog);
  });
  if (backdrop) {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeDialog();
    });
  }
  if (dialog) {
    dialog.addEventListener("click", (event) => event.stopPropagation());
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !backdrop || backdrop.hidden || dialogClosing) return;
      const focusable = Array.from(
        dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* Toast */
  const toast = document.querySelector("#demo-toast");
  const toastButton = document.querySelector("[data-toast-show]");
  let toastTimer = 0;
  if (toastButton && toast) {
    toastButton.addEventListener("click", () => {
      toast.hidden = false;
      window.WulonMotion?.enter(toast, { profile: "toast", effect: "pop" });
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        const leaveAnimation = window.WulonMotion?.leave(toast, {
          profile: "toastOut",
          effect: "pop",
          onFinish: () => {
            toast.hidden = true;
          },
        });
        if (!leaveAnimation) toast.hidden = true;
      }, 4200);
    });
  }

  /* Scroll spy */
  const navLinks = Array.from(document.querySelectorAll(".wu-nav a[href^='#']"));
  const sections = Array.from(document.querySelectorAll("section[id], header[id]"));
  const mobileTitle = document.querySelector("[data-mobile-title]");
  function setCurrent(id) {
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    syncMobileTitle();
  }
  function syncMobileTitle() {
    if (!mobileTitle) return;
    const current = navLinks.find(
      (link) => link.getAttribute("aria-current") === "true",
    );
    if (current) mobileTitle.textContent = current.textContent.trim();
  }

  /* Mobile navigation drawer */
  const shell = document.querySelector(".wu-shell");
  const sidebar = document.querySelector("#siteSidebar");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navClose = document.querySelector("[data-nav-close]");
  const navScrim = document.querySelector("[data-nav-scrim]");
  const main = document.querySelector(".wu-main");
  const mobileQuery = window.matchMedia("(max-width: 960px)");
  let lastNavFocus = null;

  function setNav(open, restoreFocus = false) {
    const mobile = mobileQuery.matches;
    const next = mobile && open;
    shell.toggleAttribute("data-nav-open", next);
    navToggle?.setAttribute("aria-expanded", String(next));
    if (mobile) {
      sidebar?.setAttribute("aria-hidden", String(!next));
      sidebar?.toggleAttribute("inert", !next);
      main?.toggleAttribute("inert", next);
    } else {
      sidebar?.removeAttribute("aria-hidden");
      sidebar?.removeAttribute("inert");
      main?.removeAttribute("inert");
    }
    document.body.style.overflow = next ? "hidden" : "";
    if (next) {
      lastNavFocus =
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body
          ? document.activeElement
          : navToggle;
      navClose?.focus({ preventScroll: true });
    } else if (restoreFocus) {
      const focusTarget =
        lastNavFocus &&
        lastNavFocus !== document.body &&
        !sidebar?.contains(lastNavFocus)
          ? lastNavFocus
          : navToggle;
      focusTarget?.focus({ preventScroll: true });
      // The anchor's default hash navigation runs after this click handler.
      window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 0);
    }
  }

  if (shell && sidebar && navToggle) {
    navToggle.addEventListener("click", () => setNav(!shell.hasAttribute("data-nav-open")));
    navClose?.addEventListener("click", () => setNav(false, true));
    navScrim?.addEventListener("click", () => setNav(false, true));
    sidebar.querySelectorAll("a[href^='#']").forEach((link) => {
      link.addEventListener("click", () => {
        if (shell.hasAttribute("data-nav-open")) setNav(false, true);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !shell.hasAttribute("data-nav-open")) {
        return;
      }
      if (document.querySelector(".wu-menu:not([hidden])")) return;
      setNav(false, true);
    });
    sidebar.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !shell.hasAttribute("data-nav-open")) return;
      const focusable = Array.from(
        sidebar.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    mobileQuery.addEventListener("change", () => setNav(false));
    setNav(false);
  }

  const sidebarNav = document.querySelector(".wu-sidebar-nav");
  if (sidebarNav) {
    const syncSidebarScroll = () => {
      sidebarNav.classList.toggle(
        "is-scrollable",
        sidebarNav.scrollHeight > sidebarNav.clientHeight + 1,
      );
    };
    syncSidebarScroll();
    window.addEventListener("resize", syncSidebarScroll);
    if ("ResizeObserver" in window) {
      new ResizeObserver(syncSidebarScroll).observe(sidebarNav);
    }
  }

  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: [0, 1] },
    );
    sections.forEach((section) => observer.observe(section));
  }

  function applyLocale(locale) {
    const next = isLocale(locale) ? locale : "zh-CN";
    safeSet(LOCALE_KEY, next);
    if (window.WulonI18n) window.WulonI18n.apply(next);
    syncMobileTitle();
  }

  /* Keep the initial state in sync with localStorage and current markup. */
  initSelects();
  initMenus();
  applyTheme(initialTheme);
  applyPalette(initialPalette);
  applyLocale(initialLocale);

  window.WulonMenu = {
    init: initMenus,
    closeAll: closeAllMenus,
  };

  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      setCurrent(window.location.hash.slice(1));
      window.setTimeout(() => target.scrollIntoView({ block: "start" }), 60);
    }
  }
})();
