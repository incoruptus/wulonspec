(() => {
  "use strict";

  const DEFAULT_LOCALE = "zh-CN";

  const LOCALES = [
    {
      id: "zh-CN",
      label: "简体中文",
      htmlLang: "zh-CN",
      title: "Wulon UI · 组件库",
      description:
        "Wulon UI：为 Caddy Wulon 应用提供可复用的颜色、字体与组件层。",
    },
    {
      id: "en",
      label: "English",
      htmlLang: "en",
      title: "Wulon UI · Component Library",
      description:
        "Wulon UI: a reusable token and component layer for Caddy Wulon apps.",
    },
  ];
  const LOCALE_BY_ID = new Map(LOCALES.map((locale) => [locale.id, locale]));

  /* Palette ids are stable; their labels are ordinary UI copy so they follow
     the active locale like every other string. */
  const PALETTE_LABELS = {
    green: "West Lake Green",
    white: "Silver Needle",
    red: "Keemun",
    yellow: "Junshan",
    puer: "Yunnan Puer",
  };

  /* English is the source string in index.html. Each entry only carries the
     locales that need a different text; add `ja: "..."` here and a locale
     record above to ship another language without touching the walker. */
  const UI = {
    Start: { zh: "开始" },
    Overview: { zh: "概览" },
    Foundations: { zh: "基础" },
    "Color & tea": { zh: "颜色与茶" },
    Type: { zh: "字体" },
    "Scale & shadow": { zh: "尺度与阴影" },
    Components: { zh: "组件" },
    Buttons: { zh: "按钮" },
    Forms: { zh: "表单" },
    Badges: { zh: "徽标" },
    Cards: { zh: "卡片" },
    Navigation: { zh: "导航" },
    Feedback: { zh: "反馈" },
    Data: { zh: "数据" },
    Overlays: { zh: "弹层" },
    Patterns: { zh: "组合" },
    "Page patterns": { zh: "页面模式" },
    Rules: { zh: "规则" },
    "A shared interface layer for Caddy Wulon apps.": {
      zh: "Caddy Wulon 应用共用的界面层。",
    },
    "Colors and components travel; status colors keep their meaning.": {
      zh: "颜色和组件可以跨应用复用，状态色保持原本的含义。",
    },
    "Component Library": { zh: "组件库" },
    Light: { zh: "浅色" },
    Dark: { zh: "深色" },
    "Tea palette": { zh: "茶色主题" },
    "West Lake Green": { zh: "西湖龙井" },
    "Silver Needle": { zh: "白毫银针" },
    Keemun: { zh: "祁门工夫" },
    Junshan: { zh: "君山银针" },
    "Yunnan Puer": { zh: "云南普洱" },
    "Wulon UI · foundations & components": {
      zh: "Wulon UI · 基础与组件",
    },
    "A quiet interface layer for Caddy Wulon apps.": {
      zh: "给 Caddy Wulon 应用的一层安静界面。",
    },
    "This library turns the tokens and controls already used in Caddy Wulon desktop and browser products into a small CSS system. The palette, type scale, radii, shadows, focus ring, and component states stay consistent while each product keeps its own content.": {
      zh: "这套库把 Caddy Wulon 桌面端与浏览器产品已经在用的令牌和控件整理成一套小型 CSS 系统。茶色、字号、圆角、阴影、焦点环和组件状态保持一致，每个产品保留自己的内容。",
    },
    "5 tea palettes": { zh: "5 套茶色" },
    "Light and dark": { zh: "明暗模式" },
    "No runtime dependencies": { zh: "零运行时依赖" },
    "Used in shipped interfaces": { zh: "已在真实界面使用" },
    "Tea palettes": { zh: "茶色系列" },
    "Silver Needle, West Lake Green, Keemun, Junshan, Yunnan Puer": {
      zh: "白毫银针、西湖龙井、祁门工夫、君山银针、云南普洱",
    },
    "Token modes": { zh: "令牌模式" },
    "The same variables recalculate contrast in light and dark mode": {
      zh: "同一组变量在明暗模式下重新计算对比度",
    },
    "Buttons, forms, badges, cards, navigation, feedback, overlays": {
      zh: "按钮、表单、徽标、卡片、导航、反馈、弹层",
    },
    "Surfaces, neutrals, brand, and status colors each have a job. A tea palette changes the brand and neutral base; it never changes what success, warning, or danger mean.": {
      zh: "表面、灰阶、品牌色和状态色各有分工。茶色只改变品牌与中性底色，成功、警告和危险的含义保持不变。",
    },
    "Surfaces and neutrals": { zh: "表面与灰阶" },
    "Click a swatch to copy its resolved value": {
      zh: "点击色卡复制当前变量的实际值",
    },
    Brand: { zh: "品牌色" },
    "Reserved for current position, primary action, focus, and progress": {
      zh: "只用于当前位置、主操作、焦点和进度",
    },
    Status: { zh: "状态色" },
    "Semantic and independent of the tea palette": {
      zh: "语义固定，不跟随茶色变化",
    },
    "In dark mode the checked track is usually light, so the thumb follows the brand ink color and turns dark. In light mode the same token stays light.": {
      zh: "深色模式下选中轨道通常偏亮，滑块因此跟随品牌墨色变深；浅色模式下同一个令牌保持浅色。",
    },
    "Sora carries the Latin shapes, a system sans handles Chinese, and Cascadia Code covers paths, versions, and commands.": {
      zh: "Sora 负责拉丁字形，中文交给系统无衬线字体，Cascadia Code 用于路径、版本和命令。",
    },
    Heading: { zh: "标题" },
    Copy: { zh: "正文" },
    Mono: { zh: "等宽" },
    "Spacing follows a 4px rhythm; radii have four steps; shadows describe elevation without becoming decoration.": {
      zh: "间距遵循 4px 节奏，圆角分为四档，阴影只表达层级。",
    },
    Spacing: { zh: "间距" },
    Radius: { zh: "圆角" },
    "Buttons 8 · Cards 12 · Overlays 16 · Pills 999": {
      zh: "按钮 8 · 卡片 12 · 弹层 16 · 胶囊 999",
    },
    Shadow: { zh: "阴影" },
    "Focus ring": { zh: "焦点环" },
    "A 2px ring plus a 4px tea glow replaces the browser default.": {
      zh: "2px 外环加 4px 茶色光晕，替换浏览器默认样式。",
    },
    "Default and accent buttons carry primary actions. Keep one emphasized action per screen, and reserve error for destructive work.": {
      zh: "Default 和 accent 承担主操作。每屏保留一个强调按钮，error 只用于破坏性操作。",
    },
    Variants: { zh: "变体" },
    "Sizes and states": { zh: "尺寸与状态" },
    "Inputs, selects, switches, checkboxes, and ranges share one height, radius, and focus ring. Labels sit above the control and hints sit below it.": {
      zh: "输入框、选择器、开关、复选和滑杆共用同一套高度、圆角和焦点环。标签在上，说明在下。",
    },
    Switch: { zh: "开关" },
    Checkbox: { zh: "复选" },
    Range: { zh: "滑杆" },
    "Segmented control": { zh: "分段控制" },
    "The checked thumb reads the brand ink token. A light track in dark mode gets a dark thumb; a dark track in light mode gets a light thumb.": {
      zh: "选中态滑块读取品牌墨色令牌。深色模式的浅轨道配深滑块，浅色模式的深轨道配浅滑块。",
    },
    "Badges & status": { zh: "徽标与状态" },
    "Badges use low-saturation fills for status. Solid badges are reserved for the current filter or a strong callout.": {
      zh: "徽标用低饱和色表达状态，实心徽标只用于当前筛选或强提示。",
    },
    Sizes: { zh: "尺寸" },
    "Cards & callouts": { zh: "卡片与提示" },
    "A card holds one group of related information. A callout gives a heading, an explanation, and a next step.": {
      zh: "卡片承载一组相关信息；提示卡给出标题、解释和下一步。",
    },
    Callouts: { zh: "提示卡" },
    "Empty state": { zh: "空状态" },
    "Tabs switch between peers, segmented controls switch modes, and breadcrumbs show hierarchy without carrying primary actions.": {
      zh: "标签页切换同级内容，分段控制切换模式，面包屑只表达层级。",
    },
    "Dropdown menu": { zh: "下拉菜单" },
    "Progress, skeletons, toasts, and tooltips share one hierarchy. Feedback says what happened and what the reader can do next.": {
      zh: "进度、骨架、Toast 和提示共用一套层级。反馈说明发生了什么，以及下一步能做什么。",
    },
    Toast: { zh: "Toast" },
    "Progress & skeleton": { zh: "进度与骨架" },
    Tooltip: { zh: "提示" },
    "Appears on hover or keyboard focus. It adds context and never holds the only copy of a message.": {
      zh: "悬停或键盘聚焦时出现，只补充上下文，不承载唯一信息。",
    },
    "Tables compare values, key-value rows describe one object, and code blocks carry paths, commands, and addresses.": {
      zh: "表格比较数值，键值对描述单个对象，代码块承载路径、命令和地址。",
    },
    "Key-value": { zh: "键值" },
    Code: { zh: "代码" },
    "Confirmation and editing live in a dialog. The title names the purpose, and the footer keeps one primary action.": {
      zh: "确认和编辑放在弹窗里。标题说明目的，底部保留一个主操作。",
    },
    "Backdrop click, Escape, and focus return are built in.": {
      zh: "支持遮罩点击、Esc 关闭和焦点返回。",
    },
    "Placed back in a page, the components should still preserve hierarchy, spacing, and one clear primary action.": {
      zh: "把组件放回页面，层级、间距和唯一的主操作仍然成立。",
    },
    "Usage rules": { zh: "使用规则" },
    "These rules matter more than any single component. Read them first when moving the library into another app.": {
      zh: "这些规则比单个组件更重要。把库带进另一个 app 时先读这里。",
    },
    Prefer: { zh: "推荐" },
    Avoid: { zh: "避免" },
    "Keep one primary action per screen, use status colors only for status, give every conclusion a next step, use the brand ink token for the checked switch thumb, and limit text to three levels.": {
      zh: "每屏一个主操作；状态色只表达状态；每个结论给出下一步；开关选中态使用品牌墨色令牌；文字层级最多三级。",
    },
    "Painting a page with brand color, using red for ordinary warnings, placing a white thumb on a white track, crowding a button with secondary copy, and leaving an error without an exit.": {
      zh: "用品牌色铺满页面；用红色表达普通警告；把白色滑块放在白色轨道上；在按钮里堆次要说明；让错误没有出口。",
    },
    "Using the library": { zh: "接入方式" },
    Copied: { zh: "已复制" },
    "Replace the product name and business components. Keep the palette, type, radii, focus, and status semantics.": {
      zh: "替换产品名和业务组件，保留茶色、字体、圆角、焦点和状态语义。",
    },
    "WulonSpec · A reusable color and component layer for Caddy Wulon apps": {
      zh: "WulonSpec · Caddy Wulon 应用可复用的颜色与组件层",
    },
    "COMPONENT SPEC · 1.0": { zh: "组件规范 · 1.0" },
    "Back to top": { zh: "返回顶部" },
    "Color mode": { zh: "颜色模式" },
    "Open navigation": { zh: "打开导航" },
    "Close navigation": { zh: "关闭导航" },
    Language: { zh: "语言" },
    Settings: { zh: "设置" },
    Appearance: { zh: "外观" },
    Palette: { zh: "茶色" },
    Actions: { zh: "操作" },
    Motion: { zh: "动效" },
    "Motion settings": { zh: "动效设置" },
    "Motion switch": { zh: "动效开关" },
    Enabled: { zh: "启用" },
    "Non-linear motion with a policy: instant response, trigger-anchored space, interruptible springs, and a gentler path when motion is reduced.": {
      zh: "有策略的非线性动效：即时响应、锚定触发点的空间关系、可中断的弹簧，以及减弱动效时更温和的路径。",
    },
    "Press & rebound": { zh: "按压与回弹" },
    "Refocus on change": { zh: "数据变化重聚焦" },
    "Number ticker": { zh: "数字滚动" },
    "Typing & selection": { zh: "键入与选择" },
    "Caret glides; selection grows from its anchor.": {
      zh: "光标平滑移动；选区从锚点展开。",
    },
    "Type, delete, or drag-select. The caret and highlight settle instead of jumping.": {
      zh: "键入、删除或拖选；光标与高亮会平滑落位，而不是瞬跳。",
    },
    Draft: { zh: "草稿" },
    Typing: { zh: "键入" },
    "Project views": { zh: "项目视图" },
    "Project type": { zh: "项目类型" },
    Mode: { zh: "模式" },
    "Stagger reveal": { zh: "错峰显现" },
    "Pop from trigger": { zh: "从触发点弹出" },
    Gestures: { zh: "手势交互" },
    "1:1 tracking, velocity handoff, momentum projection, rubber-banding": {
      zh: "1:1 跟手、速度交接、动量投影、边界回弹",
    },
    "Bottom sheet": { zh: "底部面板" },
    "Swipe card": { zh: "滑动卡片" },
    "Drag the handle down. A flick dismisses; a small pull springs back.": {
      zh: "向下拖动把手；快速一甩即可关闭；小幅拉动会弹回。",
    },
    "Drag left or right. Release past the threshold, or flick, to dismiss.": {
      zh: "向左或向右拖动；超过阈值或快速一甩即可关闭。",
    },
    Profiles: { zh: "配置档" },
    "Motion Lab": { zh: "动效实验台" },
    "Scoped: these controls tune only the four specimens; library tokens stay untouched.": {
      zh: "局部作用域：这些控件只调下面四个样本，不会改动 library token。",
    },
    Duration: { zh: "时长" },
    "Indicator speed": { zh: "指示器速度" },
    "Spring response": { zh: "弹簧响应" },
    "Spring damping": { zh: "弹簧阻尼" },
    "Gesture threshold": { zh: "手势阈值" },
    "Reset lab": { zh: "重置实验台" },
    "Scoped preview. Nothing here changes the library.": {
      zh: "局部预览。这里不会改动 library。",
    },
    Tabs: { zh: "标签页" },
    Segmented: { zh: "分段控制" },
    Sheet: { zh: "底部面板" },
    Card: { zh: "卡片" },
    "Indicator speed only.": { zh: "仅指示器速度。" },
    "Drag to dismiss; spring only.": { zh: "拖动关闭；仅弹簧回位。" },
    "Drag past the threshold to dismiss.": { zh: "拖过阈值即可关闭。" },
    "Tabs / Segmented": { zh: "标签页 / 分段控制" },
    "Sheet / Card": { zh: "底部面板 / 卡片" },
    "duration + spring + threshold": { zh: "时长 + 弹簧 + 阈值" },
    Policy: { zh: "策略" },
    Animate: { zh: "该动" },
    "Do not animate": { zh: "不该动" },
    Speed: { zh: "速度" },
    Intensity: { zh: "强度" },
    "Reduce motion": { zh: "减弱动效" },
    Reset: { zh: "重置" },
    "Scale starts on press, not release. The return uses the strong ease-out curve.": {
      zh: "缩放从按下开始，而不是松开；回程使用强 ease-out 曲线。",
    },
    "New data arrives blurred, then resolves. No hard cut and no crossfade ghosting.": {
      zh: "新数据先以模糊状态出现，再逐渐清晰。没有硬切，也没有交叉淡入的重影。",
    },
    "The value is a spring, not a tween; digits use tabular figures.": {
      zh: "数值由弹簧驱动而非固定补间；数字使用等宽字形。",
    },
    "30–80ms apart. Decorative, never input-blocking.": {
      zh: "间隔 30–80ms。仅作装饰，绝不阻塞输入。",
    },
    "Spatial consistency; no overshoot on a surface that just appeared": {
      zh: "空间一致；刚出现的表面不做回弹。",
    },
    "Menus scale from the trigger with transform-origin, then leave the same way.": {
      zh: "菜单以触发点为 transform-origin 缩放，并以同一路径离开。",
    },
    "One profile per interaction. The dock multiplies time and distance.": {
      zh: "每种交互一个配置档；底部面板会乘以时间和距离。",
    },
    "The dock at the bottom left tunes all of this live.": {
      zh: "左下角的动效面板可实时调整全部参数。",
    },
    "Feedback, legible state changes, spatial continuity, and content that would otherwise teleport.": {
      zh: "反馈、可读的状态变化、空间连续性，以及本来会瞬移的内容。",
    },
    "Keyboard repeats, high-frequency navigation, and decoration on data the reader is trying to read.": {
      zh: "键盘重复操作、高频导航，以及读者正在阅读的数据上的装饰动效。",
    },
    Press: { zh: "按压" },
    Pop: { zh: "弹出" },
    Menu: { zh: "菜单" },
    Refocus: { zh: "重聚焦" },
    Ticker: { zh: "滚动" },
    Stagger: { zh: "错峰" },
    Gesture: { zh: "手势" },
    Spring: { zh: "弹簧" },
    Effects: { zh: "效果" },
    "Strong ease-out. Scale 0.97 starts on pointer-down.": {
      zh: "强 ease-out；按下即缩放到 0.97。",
    },
    "Scale 0.95 from the trigger; exit the same path, slightly smaller.": {
      zh: "从触发点缩放到 0.95；沿同一路径、以略小的尺寸退出。",
    },
    "Blur 3px → 0, rise 2px, scale 0.985.": {
      zh: "模糊 3px → 0，上浮 2px，缩放 0.985。",
    },
    "Item duration and step. Opacity plus an 8px rise.": {
      zh: "单项时长与间隔；透明度加 8px 上浮。",
    },
    "Apple response and damping. Critically damped by default; bounce is earned by momentum.": {
      zh: "Apple 的 response 与 damping。默认临界阻尼；只有带速度的手势才配得上回弹。",
    },
    "Sheet and card thresholds; spring response 0.4; rubber-band 0.55.": {
      zh: "底部面板与滑动卡片的阈值；弹簧 response 0.4；边界回弹 0.55。",
    },
    "01 / COLOR": { zh: "01 / 颜色" },
    "02 / TYPE": { zh: "02 / 字体" },
    "03 / SCALE": { zh: "03 / 尺度" },
    "04 / MOTION": { zh: "04 / 动效" },
    "05 / BUTTON": { zh: "05 / 按钮" },
    "06 / FORM": { zh: "06 / 表单" },
    "07 / BADGE": { zh: "07 / 徽标" },
    "08 / CARD": { zh: "08 / 卡片" },
    "09 / NAV": { zh: "09 / 导航" },
    "10 / FEEDBACK": { zh: "10 / 反馈" },
    "11 / DATA": { zh: "11 / 数据" },
    "12 / OVERLAY": { zh: "12 / 弹层" },
    "13 / PATTERN": { zh: "13 / 组合" },
    "14 / RULES": { zh: "14 / 规则" },
  };

  const ATTRIBUTES = ["aria-label", "title", "placeholder", "alt", "data-tip"];

  /* Both directions matter: JS rewrites some labels after a locale change
     (palette name, copied toast), and a Chinese node must still be able to
     find its English source when the reader switches back. */
  const KEY_BY_TEXT = new Map();
  for (const [key, translations] of Object.entries(UI)) {
    KEY_BY_TEXT.set(key, key);
    for (const value of Object.values(translations)) {
      KEY_BY_TEXT.set(value, key);
    }
  }

  let current = DEFAULT_LOCALE;

  function message(key, locale) {
    if (locale === "en") return key;
    const lang = locale === "zh-CN" ? "zh" : locale;
    return UI[key] && UI[key][lang] ? UI[key][lang] : key;
  }

  function translateText(text, locale = current) {
    const key = KEY_BY_TEXT.get(text);
    return key ? message(key, locale) : text;
  }

  function isTranslatable(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (
      parent.closest(
        "script, style, svg, pre, code, textarea, .wu-code, [data-i18n-ignore]",
      )
    ) {
      return false;
    }
    return Boolean(node.nodeValue && node.nodeValue.trim());
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return isTranslatable(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = node.nodeValue;
      const core = original.trim();
      const translated = translateText(core);
      if (translated === core) continue;
      const lead = original.match(/^\s*/)[0];
      const trail = original.match(/\s*$/)[0];
      node.nodeValue = lead + translated + trail;
    }
  }

  function translateAttributes(root) {
    const selector = ATTRIBUTES.map((attribute) => `[${attribute}]`).join(",");
    const elements = root.querySelectorAll
      ? root.querySelectorAll(selector)
      : [];
    for (const element of elements) {
      if (element.closest("[data-i18n-ignore], .wu-code")) continue;
      for (const attribute of ATTRIBUTES) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const translated = translateText(value);
        if (translated !== value) element.setAttribute(attribute, translated);
      }
    }
  }

  function syncPaletteLabel() {
    const label = document.querySelector("#paletteLabel");
    if (!label) return;
    const palette =
      label.dataset.palette || document.documentElement.dataset.palette;
    if (palette) {
      label.dataset.palette = palette;
      const text = paletteName(palette);
      if (label.textContent !== text) label.textContent = text;
    }
  }

  function syncLocaleControls() {
    const label = document.querySelector("#localeLabel");
    const text = localeLabel(current);
    if (label) {
      /* The trigger shows a language name in its own language, so mark it
         with that language instead of the page language. */
      label.lang = current;
      if (label.textContent !== text) label.textContent = text;
    }

    /* Keep the current value in the button's accessible name; an aria-label
       of only "Language" would hide which language is active. */
    const button = document.querySelector("#localeButton");
    if (button) {
      const aria = `${message("Language", current)}: ${text}`;
      if (button.getAttribute("aria-label") !== aria) {
        button.setAttribute("aria-label", aria);
      }
    }

    document.querySelectorAll("[data-locale-value]").forEach((item) => {
      const checked = String(item.dataset.localeValue === current);
      if (item.getAttribute("aria-checked") !== checked) {
        item.setAttribute("aria-checked", checked);
      }
    });

    const select = document.querySelector("#localeSelect");
    if (select && select.value !== current) select.value = current;
  }

  function refresh() {
    if (!document.body) return;
    translateTextNodes(document.body);
    translateAttributes(document.body);
    syncPaletteLabel();
    syncLocaleControls();
  }

  function apply(locale) {
    const next = LOCALE_BY_ID.has(locale) ? locale : DEFAULT_LOCALE;
    current = next;
    const meta = LOCALE_BY_ID.get(next);
    document.documentElement.lang = meta.htmlLang;
    document.title = meta.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", meta.description);
    refresh();
    document.dispatchEvent(
      new CustomEvent("wulon:localechange", {
        detail: { locale: next },
      }),
    );
    return next;
  }

  function t(text) {
    return translateText(text);
  }

  function paletteName(id) {
    return t(PALETTE_LABELS[id] || id);
  }

  function localeLabel(id) {
    const locale = LOCALE_BY_ID.get(id);
    return locale ? locale.label : id;
  }

  /* Components added after the first pass (a toast, a menu, a table row)
     inherit the active locale without every caller remembering to refresh. */
  let refreshQueued = false;
  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      if (!document.body) return;
      translateTextNodes(document.body);
      translateAttributes(document.body);
    });
  }

  if (typeof MutationObserver === "function" && document.body) {
    new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        const target = mutation.target;
        const element =
          target.nodeType === 1 ? target : target.parentElement;
        return !element?.closest("[data-i18n-ignore]");
      });
      if (relevant) queueRefresh();
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES,
    });
  }

  window.WulonI18n = {
    apply,
    t,
    refresh,
    paletteName,
    localeLabel,
    translate: translateText,
    get locale() {
      return current;
    },
    get locales() {
      return LOCALES.map(({ id, label }) => ({ id, label }));
    },
  };
})();
