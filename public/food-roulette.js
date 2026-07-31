(() => {
  "use strict";

  const VERSION = "3.3.0";
  const API = "/api";
  const library = Array.isArray(window.SHARED_CALENDAR_FOOD_LIBRARY)
    ? window.SHARED_CALENDAR_FOOD_LIBRARY
    : [];
  const nativeFetch = window.fetch.bind(window);

  const CATEGORY_LABELS = {
    cold: "凉菜",
    main: "主菜",
    veg: "素菜",
    soup: "汤羹",
    staple: "主食",
  };

  const state = {
    overlay: null,
    activeTab: "roulette",
    menu: [],
    plan: null,
    aiPlan: null,
    recipe: null,
    spaces: [],
    me: null,
    members: [],
    activeSpace: null,
    rotation: 0,
    spinning: false,
    options: {
      diners: 4,
      cuisine: "all",
      flavor: "all",
      burners: 2,
      avoid: "",
      variety: true,
      counts: { cold: 1, main: 2, veg: 1, soup: 1, staple: 1 },
      staples: ["白米饭", "杂粮饭", "蛋炒饭", "馒头", "猪肉白菜饺子", "葱油拌面"],
    },
  };

  const observer = new MutationObserver(() => injectEntry());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", injectEntry);
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLSelectElement && event.target.id === "space-select") {
      state.activeSpace = null;
      state.members = [];
    }
  });

  function injectEntry() {
    const commandbar = document.querySelector(".space-commandbar");
    if (!commandbar || commandbar.querySelector("#food-roulette-btn")) return;
    const button = document.createElement("button");
    button.className = "command-btn food-command";
    button.id = "food-roulette-btn";
    button.title = "按人数、口味和菜品结构随机生成一桌菜";
    button.innerHTML = `
      <span class="command-icon">${icon("utensils")}</span>
      <span class="command-copy"><strong>美食轮盘</strong><small>抽菜单、看菜谱与烹饪排程</small></span>`;
    const planner = commandbar.querySelector("#map-planner-btn");
    if (planner?.nextSibling) commandbar.insertBefore(button, planner.nextSibling);
    else commandbar.appendChild(button);
    button.addEventListener("click", () => void openFoodRoulette());
  }

  async function openFoodRoulette() {
    if (!library.length) {
      toast("菜谱库没有加载成功，请刷新页面", true);
      return;
    }
    await loadContext();
    if (!getActiveSpaceId()) {
      toast("请先选择一个空间", true);
      return;
    }
    state.activeTab = "roulette";
    state.plan = null;
    state.aiPlan = null;
    renderOverlay();
  }

  async function loadContext() {
    try {
      const bootstrap = await requestJson(`${API}/bootstrap`);
      state.spaces = Array.isArray(bootstrap.spaces) ? bootstrap.spaces : [];
      state.me = bootstrap.user || null;
      const spaceId = getActiveSpaceId();
      if (spaceId) {
        const result = await requestJson(`${API}/spaces/${spaceId}`);
        state.activeSpace = result.space || state.spaces.find((item) => item.id === spaceId) || null;
        state.members = Array.isArray(result.members) ? result.members : [];
      }
    } catch (error) {
      console.warn("food roulette context", error);
    }
  }

  function getActiveSpaceId() {
    const select = document.querySelector("#space-select");
    if (select instanceof HTMLSelectElement && select.value) return select.value;
    return localStorage.getItem("activeSpaceId") || state.activeSpace?.id || "";
  }

  function renderOverlay() {
    document.querySelector("#food-roulette-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "food-roulette-overlay";
    overlay.className = "food-overlay";
    overlay.innerHTML = `
      <section class="food-shell" role="dialog" aria-modal="true">
        <header class="food-header">
          <div class="food-header-title">
            <span class="food-logo">${icon("utensils")}</span>
            <span><strong>美食轮盘</strong><small>${escapeHtml(state.activeSpace?.name || "当前空间")} · ${library.length} 道家庭菜谱</small></span>
          </div>
          <button class="food-close" id="food-close" aria-label="关闭">×</button>
        </header>
        <nav class="food-tabs">
          <button data-food-tab="roulette" class="${state.activeTab === "roulette" ? "active" : ""}">${icon("wheel")}<span>抽一桌菜</span></button>
          <button data-food-tab="menu" class="${state.activeTab === "menu" ? "active" : ""}" ${state.menu.length ? "" : "disabled"}>${icon("book")}<span>菜单与菜谱</span></button>
          <button data-food-tab="schedule" class="${state.activeTab === "schedule" ? "active" : ""}" ${state.menu.length ? "" : "disabled"}>${icon("timeline")}<span>烹饪排程</span></button>
        </nav>
        <div class="food-content">${renderActiveTab()}</div>
        ${state.recipe ? renderRecipeDrawer(state.recipe) : ""}
      </section>`;
    document.body.appendChild(overlay);
    state.overlay = overlay;
    bindOverlayHandlers();
  }

  function renderActiveTab() {
    if (state.activeTab === "menu") return renderMenuTab();
    if (state.activeTab === "schedule") return renderScheduleTab();
    return renderRouletteTab();
  }

  function renderRouletteTab() {
    const options = state.options;
    const defaults = options.counts;
    return `
      <div class="food-layout">
        <section class="food-panel food-controls">
          <div class="food-section-head">
            <div><h3>先确定这顿饭怎么吃</h3><p>人数决定默认菜量，所有数量仍可手动调整。</p></div>
            <span class="food-badge">不依赖 AI</span>
          </div>
          <div class="food-form-grid">
            <label>用餐人数
              <select id="food-diners" class="food-field">
                ${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}" ${index + 1 === options.diners ? "selected" : ""}>${index + 1} 人</option>`).join("")}
              </select>
            </label>
            <label>偏好菜系
              <select id="food-cuisine" class="food-field">
                <option value="all" ${options.cuisine === "all" ? "selected" : ""}>不限菜系</option>
                ${unique(library.map((dish) => dish.cuisine)).sort((a, b) => a.localeCompare(b, "zh-CN")).map((item) => `<option value="${escapeAttr(item)}" ${options.cuisine === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
              </select>
            </label>
            <label>整体口味
              <select id="food-flavor" class="food-field">
                <option value="all" ${options.flavor === "all" ? "selected" : ""}>什么都可以</option>
                <option value="not-spicy" ${options.flavor === "not-spicy" ? "selected" : ""}>不吃辣</option>
                <option value="spicy" ${options.flavor === "spicy" ? "selected" : ""}>偏辣</option>
                <option value="light" ${options.flavor === "light" ? "selected" : ""}>清淡少油</option>
                <option value="sweet-sour" ${options.flavor === "sweet-sour" ? "selected" : ""}>酸甜口</option>
              </select>
            </label>
            <label>灶台数量
              <select id="food-burners" class="food-field">
                <option value="1" ${options.burners === 1 ? "selected" : ""}>1 个灶台</option>
                <option value="2" ${options.burners === 2 ? "selected" : ""}>2 个灶台</option>
                <option value="3" ${options.burners === 3 ? "selected" : ""}>3 个灶台</option>
              </select>
            </label>
            <label class="food-full">不吃或过敏的食材
              <input id="food-avoid" class="food-field" value="${escapeAttr(options.avoid)}" placeholder="例如：花生、香菜、海鲜；用顿号或逗号分隔" />
            </label>
          </div>

          <div class="food-structure-head"><strong>菜品结构</strong><button id="food-auto-structure" class="food-link">按人数重新推荐</button></div>
          <div class="food-count-grid">
            ${countInput("cold", "凉菜", defaults.cold)}
            ${countInput("main", "主菜", defaults.main)}
            ${countInput("veg", "素菜", defaults.veg)}
            ${countInput("soup", "汤", defaults.soup)}
            ${countInput("staple", "主食", defaults.staple)}
          </div>
          <div class="food-staple-head"><strong>允许抽到的主食</strong><small>可同时勾选多个；主食数量为 0 时不会使用。</small></div>
          <div class="food-staple-pool">${renderStaplePool(options.staples)}</div>
          <label class="food-switch"><input id="food-variety" type="checkbox" ${options.variety ? "checked" : ""} /><span><strong>自动避免重复</strong><small>尽量不连续抽到同类肉、相似做法和相同口味。</small></span></label>
        </section>

        <section class="food-panel food-wheel-panel">
          <div class="food-wheel-wrap">
            <div class="food-pointer"></div>
            <div class="food-wheel" id="food-wheel" style="--food-rotation:${state.rotation}deg">
              ${renderWheelLabels(sample(library, 12))}
              <div class="food-wheel-center"><span>今天</span><strong>吃什么</strong></div>
            </div>
          </div>
          <button class="food-spin-btn" id="food-spin" ${state.spinning ? "disabled" : ""}>${state.spinning ? "正在转…" : "开始转盘"}</button>
          <p class="food-wheel-note">轮盘会按人数、口味、菜系和菜品数量生成完整菜单，而不是只抽一道菜。</p>
        </section>
      </div>
      ${state.menu.length ? renderMenuSummary() : `<section class="food-empty"><span>${icon("sparkles")}</span><strong>还没有生成菜单</strong><p>先调整人数与菜品结构，然后点击“开始转盘”。</p></section>`}`;
  }

  function countInput(name, label, value) {
    return `<label><span>${label}</span><input id="food-count-${name}" type="number" min="0" max="8" value="${value}" /></label>`;
  }

  function renderStaplePool(selected) {
    const preferred = ["白米饭", "杂粮饭", "蛋炒饭", "扬州炒饭", "馒头", "花卷", "猪肉白菜饺子", "三鲜饺子", "葱油拌面", "番茄鸡蛋面", "馄饨", "小米粥"];
    const active = new Set(Array.isArray(selected) ? selected : []);
    return preferred.map((name) => `<label><input type="checkbox" data-food-staple="${escapeAttr(name)}" ${active.has(name) ? "checked" : ""}/><span>${escapeHtml(name)}</span></label>`).join("");
  }

  function renderWheelLabels(items) {
    return items.map((dish, index) => {
      const angle = index * (360 / items.length) + 15;
      return `<span class="food-wheel-label" style="--angle:${angle}deg"><b>${escapeHtml(shortName(dish.name, 6))}</b></span>`;
    }).join("");
  }

  function renderMenuSummary() {
    return `<section class="food-panel generated-menu">
      <div class="food-section-head"><div><h3>这次抽到的菜单</h3><p>${getDiners()} 人份 · ${state.menu.length} 道 · 预计总备餐 ${estimateTotalMinutes(state.menu)} 分钟</p></div><div class="food-inline-actions"><button id="food-reroll" class="food-secondary">全部重抽</button><button id="food-open-menu" class="food-primary">查看菜谱</button></div></div>
      <div class="food-menu-grid">${state.menu.map(renderMenuCard).join("")}</div>
    </section>`;
  }

  function renderMenuCard(dish) {
    return `<article class="food-menu-card" data-food-dish="${dish.id}">
      <div class="food-menu-card-top"><span class="food-category food-category-${dish.category}">${CATEGORY_LABELS[dish.category]}</span><button class="food-swap" data-food-swap="${dish.id}" title="换一道同类菜">↻</button></div>
      <strong>${escapeHtml(dish.name)}</strong>
      <small>${escapeHtml(dish.cuisine)} · ${escapeHtml(dish.flavor)} · ${dish.prepMinutes + dish.cookMinutes}分钟</small>
      <div>${dish.tags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}</div>
      <button class="food-text-btn" data-food-recipe="${dish.id}">查看做法</button>
    </article>`;
  }

  function renderMenuTab() {
    if (!state.menu.length) return `<div class="food-empty"><strong>请先生成菜单</strong></div>`;
    const diners = getDiners();
    return `<section class="food-panel food-menu-detail">
      <div class="food-section-head">
        <div><h3>${diners} 人份菜单</h3><p>食材用量按 2 人基础份量自动折算；“适量”类调味品仍需边做边尝。</p></div>
        <div class="food-inline-actions"><button id="food-back-roulette" class="food-secondary">返回轮盘</button><button id="food-go-schedule" class="food-primary">规划烹饪顺序</button></div>
      </div>
      <div class="food-menu-sections">
        ${Object.keys(CATEGORY_LABELS).map((category) => renderMenuCategory(category, diners)).join("")}
      </div>
      <section class="food-shopping-card">
        <div><h4>合并采购清单</h4><p>相同食材会自动汇总；调味品只列一次。</p></div>
        <div class="food-shopping-list">${renderShoppingList(diners)}</div>
      </section>
    </section>`;
  }

  function renderMenuCategory(category, diners) {
    const items = state.menu.filter((dish) => dish.category === category);
    if (!items.length) return "";
    return `<section class="food-menu-category"><header><span class="food-category food-category-${category}">${CATEGORY_LABELS[category]}</span><strong>${items.length} 道</strong></header><div>${items.map((dish) => `
      <article class="food-recipe-row">
        <div><strong>${escapeHtml(dish.name)}</strong><small>${escapeHtml(dish.cuisine)} · ${escapeHtml(dish.flavor)} · ${dish.difficulty}</small></div>
        <div class="food-time-pills"><span>备菜 ${dish.prepMinutes}分</span><span>烹饪 ${dish.cookMinutes}分</span>${dish.passiveMinutes ? `<span>等待 ${dish.passiveMinutes}分</span>` : ""}</div>
        <button class="food-secondary" data-food-recipe="${dish.id}">材料与步骤</button>
      </article>`).join("")}</div></section>`;
  }

  function renderShoppingList(diners) {
    const merged = new Map();
    for (const dish of state.menu) {
      for (const ingredient of dish.ingredients) {
        const key = ingredient.name;
        if (!merged.has(key)) merged.set(key, []);
        merged.get(key).push(scaleAmount(ingredient.amount, diners));
      }
    }
    return [...merged.entries()].map(([name, amounts]) => `<span><strong>${escapeHtml(name)}</strong><small>${escapeHtml(mergeAmounts(amounts))}</small></span>`).join("");
  }

  function renderScheduleTab() {
    if (!state.menu.length) return `<div class="food-empty"><strong>请先生成菜单</strong></div>`;
    const plan = state.aiPlan || state.plan || buildRulePlan();
    state.plan = state.plan || plan;
    return `<section class="food-panel food-schedule-panel">
      <div class="food-section-head">
        <div><h3>烹饪甘特图</h3><p>${plan.source === "ai" ? "AI 已在规则排程基础上优化并行顺序" : "根据锅具、灶台和菜品特性自动生成的规则排程"}</p></div>
        <span class="food-badge ${plan.source === "ai" ? "ai" : ""}">${plan.source === "ai" ? "AI 排程" : "规则排程"}</span>
      </div>
      <div class="food-schedule-options">
        <label>开饭时间<input id="food-serve-at" class="food-field" type="time" value="${escapeAttr(plan.serveAt || "18:30")}" /></label>
        <label>灶台数量<select id="food-schedule-burners" class="food-field"><option value="1" ${plan.burners === 1 ? "selected" : ""}>1 个</option><option value="2" ${plan.burners === 2 ? "selected" : ""}>2 个</option><option value="3" ${plan.burners === 3 ? "selected" : ""}>3 个</option></select></label>
        <button id="food-rebuild-plan" class="food-secondary">重新计算</button>
        <button id="food-ai-plan" class="food-primary" ${state.activeSpace?.hasAI ? "" : "disabled"}>${state.activeSpace?.hasAI ? "AI 优化排程" : "空间未配置 AI"}</button>
      </div>
      <div class="food-plan-summary"><strong>${escapeHtml(plan.summary)}</strong><span>建议 ${plan.startClock} 开始 · 共约 ${plan.totalMinutes} 分钟 · ${plan.tasks.length} 个步骤</span></div>
      ${renderGantt(plan)}
      <div class="food-plan-tips">${(plan.tips || []).map((tip) => `<span>${icon("check")} ${escapeHtml(tip)}</span>`).join("")}</div>
      <section class="food-plan-list"><h4>按时间执行</h4>${[...plan.tasks].sort((a, b) => a.startMinute - b.startMinute).map((task) => `<article><time>${minuteToClock(plan.startClock, task.startMinute)}</time><i style="--lane-color:${laneColor(task.lane)}"></i><div><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.dish || task.lane)} · ${task.endMinute - task.startMinute} 分钟${task.note ? ` · ${escapeHtml(task.note)}` : ""}</small></div></article>`).join("")}</section>
      <div class="food-calendar-box">
        <div><strong>把“做饭”加入日历</strong><small>日程从开始备菜到开饭，菜单与采购清单会写入备注。</small></div>
        <label>日期<input id="food-event-date" class="food-field" type="date" value="${todayString()}" /></label>
        <button id="food-add-calendar" class="food-primary">加入当前空间日历</button>
      </div>
    </section>`;
  }

  function renderGantt(plan) {
    const lanes = unique(plan.tasks.map((task) => task.lane));
    const horizon = Math.max(plan.totalMinutes, ...plan.tasks.map((task) => task.endMinute));
    const ticks = makeTicks(horizon);
    return `<div class="food-gantt-scroll"><div class="food-gantt" style="--gantt-minutes:${horizon}">
      <div class="food-gantt-header"><div>工作区</div><div>${ticks.map((tick) => `<span style="left:${(tick / horizon) * 100}%">${minuteToClock(plan.startClock, tick)}</span>`).join("")}</div></div>
      ${lanes.map((lane) => `<div class="food-gantt-row"><div><i style="background:${laneColor(lane)}"></i><strong>${escapeHtml(lane)}</strong></div><div>${ticks.map((tick) => `<em style="left:${(tick / horizon) * 100}%"></em>`).join("")}${plan.tasks.filter((task) => task.lane === lane).map((task) => `<button data-food-task="${escapeAttr(task.id)}" style="left:${(task.startMinute / horizon) * 100}%;width:${Math.max(1.6, ((task.endMinute - task.startMinute) / horizon) * 100)}%;--task-color:${laneColor(lane)}" title="${escapeAttr(task.label)}"><strong>${escapeHtml(shortName(task.label, 12))}</strong><small>${task.endMinute - task.startMinute}分</small></button>`).join("")}</div></div>`).join("")}
    </div></div>`;
  }

  function renderRecipeDrawer(dish) {
    const diners = getDiners();
    return `<div class="food-recipe-backdrop" id="food-recipe-close-area"><aside class="food-recipe-drawer" onclick="event.stopPropagation()">
      <header><div><span class="food-category food-category-${dish.category}">${CATEGORY_LABELS[dish.category]}</span><h3>${escapeHtml(dish.name)}</h3><p>${escapeHtml(dish.cuisine)} · ${escapeHtml(dish.flavor)} · ${dish.difficulty}</p></div><button id="food-recipe-close">×</button></header>
      <div class="food-recipe-meta"><span>备菜 ${dish.prepMinutes} 分</span><span>烹饪 ${dish.cookMinutes} 分</span>${dish.passiveMinutes ? `<span>等待 ${dish.passiveMinutes} 分</span>` : ""}<span>${escapeHtml(dish.equipment)}</span></div>
      <section><h4>${diners} 人份食材</h4><div class="food-ingredient-list">${dish.ingredients.map((item) => `<span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(scaleAmount(item.amount, diners))}</small></span>`).join("")}</div></section>
      <section><h4>家庭简化做法</h4><ol class="food-step-list">${dish.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></section>
      <div class="food-safety"><strong>厨房提醒</strong>${escapeHtml(dish.safety)}</div>
      <footer><button class="food-primary" id="food-recipe-to-plan">用这桌菜单生成排程</button></footer>
    </aside></div>`;
  }

  function bindOverlayHandlers() {
    const root = state.overlay;
    if (!root) return;
    root.querySelector("#food-close")?.addEventListener("click", closeFoodRoulette);
    root.addEventListener("click", (event) => {
      if (event.target === root) closeFoodRoulette();
    });
    root.querySelectorAll("[data-food-tab]").forEach((button) => button.addEventListener("click", () => {
      if (button.disabled) return;
      state.activeTab = button.getAttribute("data-food-tab") || "roulette";
      state.recipe = null;
      renderOverlay();
    }));

    root.querySelector("#food-diners")?.addEventListener("change", () => applyRecommendedStructure());
    root.querySelector("#food-auto-structure")?.addEventListener("click", applyRecommendedStructure);
    root.querySelector("#food-spin")?.addEventListener("click", spinAndGenerate);
    root.querySelector("#food-reroll")?.addEventListener("click", spinAndGenerate);
    root.querySelector("#food-open-menu")?.addEventListener("click", () => { state.activeTab = "menu"; renderOverlay(); });
    root.querySelector("#food-back-roulette")?.addEventListener("click", () => { state.activeTab = "roulette"; renderOverlay(); });
    root.querySelector("#food-go-schedule")?.addEventListener("click", () => { state.activeTab = "schedule"; state.plan = buildRulePlan(); renderOverlay(); });

    root.querySelectorAll("[data-food-recipe]").forEach((button) => button.addEventListener("click", () => {
      state.recipe = library.find((dish) => dish.id === button.getAttribute("data-food-recipe")) || null;
      renderOverlay();
    }));
    root.querySelectorAll("[data-food-swap]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      swapDish(button.getAttribute("data-food-swap") || "");
    }));
    root.querySelector("#food-recipe-close")?.addEventListener("click", closeRecipe);
    root.querySelector("#food-recipe-close-area")?.addEventListener("click", closeRecipe);
    root.querySelector("#food-recipe-to-plan")?.addEventListener("click", () => { state.recipe = null; state.activeTab = "schedule"; state.plan = buildRulePlan(); renderOverlay(); });

    root.querySelector("#food-rebuild-plan")?.addEventListener("click", rebuildPlanFromControls);
    root.querySelector("#food-ai-plan")?.addEventListener("click", () => void optimizePlanWithAI());
    root.querySelector("#food-add-calendar")?.addEventListener("click", () => void addMealToCalendar());
  }

  function closeRecipe() {
    state.recipe = null;
    renderOverlay();
  }

  function closeFoodRoulette() {
    state.overlay?.remove();
    state.overlay = null;
    state.recipe = null;
  }

  function applyRecommendedStructure() {
    const diners = getDiners();
    const recommended = recommendedStructure(diners);
    state.options.counts = { ...recommended };
    for (const [category, value] of Object.entries(recommended)) {
      const input = document.querySelector(`#food-count-${category}`);
      if (input instanceof HTMLInputElement) input.value = String(value);
    }
  }

  function recommendedStructure(diners) {
    if (diners <= 1) return { cold: 0, main: 1, veg: 1, soup: 0, staple: 1 };
    if (diners <= 2) return { cold: 1, main: 1, veg: 1, soup: 1, staple: 1 };
    if (diners <= 4) return { cold: 1, main: 2, veg: 1, soup: 1, staple: 1 };
    if (diners <= 6) return { cold: 1, main: 3, veg: 2, soup: 1, staple: 1 };
    if (diners <= 8) return { cold: 2, main: 4, veg: 2, soup: 1, staple: 2 };
    return { cold: 2, main: 5, veg: 3, soup: 2, staple: 2 };
  }

  function spinAndGenerate() {
    if (state.spinning) return;
    state.spinning = true;
    state.rotation += 1440 + Math.round(Math.random() * 720);
    const wheel = document.querySelector("#food-wheel");
    if (wheel instanceof HTMLElement) wheel.style.setProperty("--food-rotation", `${state.rotation}deg`);
    const button = document.querySelector("#food-spin");
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
      button.textContent = "正在转…";
    }
    window.setTimeout(() => {
      try {
        state.menu = generateMenu(readRouletteOptions());
        state.plan = null;
        state.aiPlan = null;
      } catch (error) {
        toast(error instanceof Error ? error.message : "生成菜单失败", true);
      } finally {
        state.spinning = false;
        renderOverlay();
        document.querySelector(".generated-menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 1550);
  }

  function readRouletteOptions() {
    const diners = getDiners();
    const counts = {};
    for (const category of Object.keys(CATEGORY_LABELS)) {
      const value = Number(document.querySelector(`#food-count-${category}`)?.value || 0);
      counts[category] = Math.max(0, Math.min(8, Number.isFinite(value) ? Math.round(value) : 0));
    }
    if (Object.values(counts).reduce((sum, value) => sum + value, 0) === 0) throw new Error("至少选择一道菜");
    const options = {
      diners,
      counts,
      cuisine: document.querySelector("#food-cuisine")?.value || "all",
      flavor: document.querySelector("#food-flavor")?.value || "all",
      avoid: splitWords(document.querySelector("#food-avoid")?.value || ""),
      variety: document.querySelector("#food-variety")?.checked !== false,
      burners: Number(document.querySelector("#food-burners")?.value || state.options.burners || 2),
      staples: [...document.querySelectorAll("[data-food-staple]:checked")].map((input) => input.getAttribute("data-food-staple")).filter(Boolean),
    };
    state.options = {
      ...state.options,
      ...options,
      avoid: String(document.querySelector("#food-avoid")?.value || ""),
      counts: { ...counts },
    };
    return options;
  }

  function generateMenu(options) {
    const result = [];
    const usedNames = new Set();
    const usedProteins = new Map();
    const usedMethods = new Map();
    for (const category of Object.keys(CATEGORY_LABELS)) {
      const count = options.counts[category] || 0;
      for (let index = 0; index < count; index += 1) {
        const candidates = filteredPool(category, options).filter((dish) => !usedNames.has(dish.name));
        const relaxed = candidates.length ? candidates : library.filter((dish) => dish.category === category && !usedNames.has(dish.name));
        if (!relaxed.length) continue;
        const dish = weightedPick(relaxed, (item) => dishWeight(item, options, usedProteins, usedMethods));
        result.push(dish);
        usedNames.add(dish.name);
        for (const protein of proteinGroups(dish)) usedProteins.set(protein, (usedProteins.get(protein) || 0) + 1);
        usedMethods.set(dish.method, (usedMethods.get(dish.method) || 0) + 1);
      }
    }
    return result;
  }

  function filteredPool(category, options) {
    return library.filter((dish) => {
      if (dish.category !== category) return false;
      if (category === "staple" && Array.isArray(options.staples) && options.staples.length && !options.staples.includes(dish.name)) return false;
      if (options.cuisine !== "all" && dish.cuisine !== options.cuisine) return false;
      if (options.flavor === "not-spicy" && dish.flavor === "麻辣") return false;
      if (options.flavor === "spicy" && dish.flavor !== "麻辣") return false;
      if (options.flavor === "sweet-sour" && dish.flavor !== "酸甜") return false;
      if (options.avoid.some((word) => dish.name.includes(word) || dish.coreIngredients.some((item) => item.includes(word)))) return false;
      return true;
    });
  }

  function dishWeight(dish, options, proteins, methods) {
    let weight = 10;
    if (dish.tags.includes("热门家常")) weight += 8;
    if (options.flavor === "light" && (dish.flavor === "清淡" || ["steam", "soup"].includes(dish.method))) weight += 12;
    if (options.flavor === "all" && dish.flavor === "家常咸鲜") weight += 2;
    if (options.variety) {
      for (const protein of proteinGroups(dish)) weight /= 1 + (proteins.get(protein) || 0) * 2.2;
      weight /= 1 + (methods.get(dish.method) || 0) * 0.65;
    }
    return Math.max(0.2, weight);
  }

  function proteinGroups(dish) {
    const text = `${dish.name} ${dish.coreIngredients.join(" ")}`;
    const groups = [];
    const rules = [
      ["猪肉", /猪|肉丝|排骨|五花|猪蹄|肥肠|腰花|猪肝/],
      ["鸡肉", /鸡/], ["鸭肉", /鸭/], ["牛肉", /牛/], ["羊肉", /羊/],
      ["鱼类", /鱼|带鱼|三文鱼/], ["虾蟹贝", /虾|蟹|蛤|蚝|扇贝|鱿鱼|墨鱼|蛏子/],
      ["蛋类", /蛋/], ["豆制品", /豆腐|豆皮|腐竹|千张/],
    ];
    for (const [name, pattern] of rules) if (pattern.test(text)) groups.push(name);
    return groups.length ? groups : [dish.category === "veg" ? "蔬菜" : dish.category];
  }

  function swapDish(id) {
    const index = state.menu.findIndex((dish) => dish.id === id);
    if (index < 0) return;
    const current = state.menu[index];
    const used = new Set(state.menu.map((dish) => dish.id));
    const pool = library.filter((dish) => dish.category === current.category && !used.has(dish.id));
    if (!pool.length) return;
    state.menu[index] = sample(pool, 1)[0];
    state.plan = null;
    state.aiPlan = null;
    renderOverlay();
  }

  function buildRulePlan(overrides = {}) {
    const serveAt = overrides.serveAt || document.querySelector("#food-serve-at")?.value || "18:30";
    const burners = Number(overrides.burners || document.querySelector("#food-schedule-burners")?.value || document.querySelector("#food-burners")?.value || state.options.burners || 2);
    const tasks = [];
    const occupancies = new Map();
    const raw = [];
    let estimated = Math.max(70, ...state.menu.map((dish) => dish.prepMinutes + dish.passiveMinutes + dish.cookMinutes + finishOffset(dish)));
    estimated += Math.max(0, state.menu.length - 4) * 12;

    const ordered = [...state.menu].sort((a, b) => {
      const priority = { soup: 0, staple: 1, cold: 2, main: 3, veg: 4 };
      return priority[a.category] - priority[b.category] || b.cookMinutes - a.cookMinutes;
    });

    for (const dish of ordered) {
      const laneBase = equipmentLane(dish);
      const lane = laneBase === "灶台" ? chooseCookingLane(occupancies, burners) : laneBase;
      const desiredEnd = estimated - finishOffset(dish);
      const cook = reserveBackward(occupancies, lane, desiredEnd, dish.cookMinutes);
      raw.push({ id: `${dish.id}-cook`, label: `烹饪 ${dish.name}`, dish: dish.name, lane, startMinute: cook.start, endMinute: cook.end, note: cookingNote(dish) });

      let anchor = cook.start;
      if (dish.passiveMinutes > 0) {
        const passive = reserveBackward(occupancies, "腌制/等待", anchor, dish.passiveMinutes, false);
        raw.push({ id: `${dish.id}-passive`, label: `${dish.name} 腌制/焖置`, dish: dish.name, lane: "腌制/等待", startMinute: passive.start, endMinute: passive.end, note: "此阶段可并行处理其他菜" });
        anchor = passive.start;
      }
      const prep = reserveBackward(occupancies, "备菜台", anchor, dish.prepMinutes);
      raw.push({ id: `${dish.id}-prep`, label: `准备 ${dish.name}`, dish: dish.name, lane: "备菜台", startMinute: prep.start, endMinute: prep.end, note: prepNote(dish) });
    }

    const minStart = Math.min(0, ...raw.map((task) => task.startMinute));
    const shift = -minStart;
    for (const task of raw) {
      task.startMinute += shift;
      task.endMinute += shift;
      tasks.push(task);
    }
    const totalMinutes = Math.max(...tasks.map((task) => task.endMinute), estimated + shift);
    const startClock = subtractMinutes(serveAt, totalMinutes);
    return {
      source: "rules",
      serveAt,
      burners,
      startClock,
      totalMinutes,
      summary: `先处理汤、炖菜和主食，最后集中炒素菜与快炒主菜，尽量让所有菜同时热着上桌。`,
      tips: buildPlanTips(state.menu, burners),
      tasks,
    };
  }

  function finishOffset(dish) {
    if (dish.category === "veg") return 0;
    if (dish.method === "stirfry" || dish.method === "fry" || dish.method === "panfry") return 5;
    if (dish.category === "main") return 8;
    if (dish.category === "staple") return 10;
    if (dish.category === "soup" || dish.method === "braise") return 15;
    if (dish.category === "cold") return 20;
    return 10;
  }

  function equipmentLane(dish) {
    if (dish.equipment === "电饭煲") return "电饭煲";
    if (dish.equipment === "烤箱") return "烤箱";
    if (dish.equipment === "冷菜台") return "冷菜台";
    if (dish.equipment === "蒸锅") return "蒸锅";
    if (dish.equipment === "粥锅") return "汤锅";
    if (["汤锅", "炖锅", "煮锅"].includes(dish.equipment)) return "汤锅";
    return "灶台";
  }

  function chooseCookingLane(occupancies, burners) {
    let best = "灶台 1";
    let least = Infinity;
    for (let index = 1; index <= Math.max(1, burners); index += 1) {
      const lane = `灶台 ${index}`;
      const total = (occupancies.get(lane) || []).reduce((sum, item) => sum + item.end - item.start, 0);
      if (total < least) { least = total; best = lane; }
    }
    return best;
  }

  function reserveBackward(occupancies, lane, desiredEnd, duration, exclusive = true) {
    let end = desiredEnd;
    let start = end - Math.max(1, duration);
    if (exclusive) {
      const slots = occupancies.get(lane) || [];
      let moved = true;
      while (moved) {
        moved = false;
        for (const slot of slots) {
          if (start < slot.end && end > slot.start) {
            end = slot.start - 2;
            start = end - Math.max(1, duration);
            moved = true;
          }
        }
      }
      slots.push({ start, end });
      occupancies.set(lane, slots);
    }
    return { start, end };
  }

  function buildPlanTips(menu, burners) {
    const tips = [
      "所有肉类与水产先切配，再彻底清洗刀具和砧板后处理即食凉菜。",
      `当前按 ${burners} 个灶台排程；某一步提前完成时，可先保温，不要让素菜久放。`,
    ];
    if (menu.some((dish) => dish.category === "staple" && dish.equipment === "电饭煲")) tips.push("米饭最先启动，跳到保温后焖10分钟再开盖翻松。");
    if (menu.some((dish) => dish.category === "soup" || dish.method === "braise")) tips.push("汤和炖菜先上火，微沸阶段可以腾出手完成大部分备菜。");
    if (menu.some((dish) => dish.category === "cold")) tips.push("凉菜可提前拌好冷藏，但叶菜类和脆口食材建议临近开饭再淋汁。");
    return tips;
  }

  function prepNote(dish) {
    if (dish.category === "cold") return "即食食材与生肉分开用刀和砧板";
    if (proteinGroups(dish).some((item) => !["蔬菜", "蛋类", "豆制品", "staple"].includes(item))) return "切配后清洁台面，肉类可同时腌制";
    return "洗净切配，按成熟速度分开放置";
  }

  function cookingNote(dish) {
    if (dish.category === "veg") return "临近开饭再炒，保持颜色和口感";
    if (dish.category === "soup") return "保持微沸，最后再调盐";
    if (dish.category === "staple") return "完成后保温，避免反复开盖";
    return dish.safety.includes("熟透") ? "确认中心完全熟透" : "边做边尝，最后校正咸淡";
  }

  function rebuildPlanFromControls() {
    const serveAt = document.querySelector("#food-serve-at")?.value || "18:30";
    const burners = Number(document.querySelector("#food-schedule-burners")?.value || 2);
    state.aiPlan = null;
    state.plan = buildRulePlan({ serveAt, burners });
    renderOverlay();
  }

  async function optimizePlanWithAI() {
    const spaceId = getActiveSpaceId();
    if (!spaceId || !state.activeSpace?.hasAI) return;
    const serveAt = document.querySelector("#food-serve-at")?.value || state.plan?.serveAt || "18:30";
    const burners = Number(document.querySelector("#food-schedule-burners")?.value || state.plan?.burners || 2);
    const rulePlan = buildRulePlan({ serveAt, burners });
    const button = document.querySelector("#food-ai-plan");
    if (button instanceof HTMLButtonElement) { button.disabled = true; button.textContent = "AI 正在优化…"; }
    try {
      const payload = await requestJson(`${API}/spaces/${spaceId}/food/cooking-plan`, {
        method: "POST",
        body: {
          diners: getDiners(),
          serveAt,
          burners,
          dishes: state.menu.map((dish) => ({
            id: dish.id,
            name: dish.name,
            category: dish.category,
            equipment: dish.equipment,
            prepMinutes: dish.prepMinutes,
            cookMinutes: dish.cookMinutes,
            passiveMinutes: dish.passiveMinutes,
            steps: dish.steps,
            safety: dish.safety,
          })),
          rulePlan,
        },
      });
      state.aiPlan = payload.plan;
      state.plan = rulePlan;
      renderOverlay();
      toast("AI 已优化烹饪排程");
    } catch (error) {
      toast(error instanceof Error ? error.message : "AI 排程失败，已保留规则排程", true);
      state.aiPlan = null;
      state.plan = rulePlan;
      renderOverlay();
    }
  }

  async function addMealToCalendar() {
    const spaceId = getActiveSpaceId();
    if (!spaceId || !state.menu.length) return;
    const plan = state.aiPlan || state.plan || buildRulePlan();
    const date = document.querySelector("#food-event-date")?.value || todayString();
    const names = state.menu.map((dish) => dish.name);
    const notes = [
      `菜单：${names.join("、")}`,
      `人数：${getDiners()}人`,
      `建议 ${plan.startClock} 开始备菜，${plan.serveAt} 开饭。`,
      "采购：" + plainShoppingList(getDiners()),
    ].join("\n");
    try {
      await requestJson(`${API}/spaces/${spaceId}/events`, {
        method: "POST",
        body: {
          title: `一起做饭：${names.slice(0, 3).join("、")}${names.length > 3 ? `等${names.length}道` : ""}`,
          startDate: date,
          allDay: false,
          startTime: plan.startClock,
          endTime: plan.serveAt,
          location: "",
          companions: "",
          notes,
          assignedUserIds: state.me?.id ? [state.me.id] : [],
          source: "rules",
          spaceIds: [spaceId],
        },
      });
      toast("做饭计划已加入当前空间日历");
    } catch (error) {
      toast(error instanceof Error ? error.message : "加入日历失败", true);
    }
  }

  function plainShoppingList(diners) {
    const merged = new Map();
    for (const dish of state.menu) for (const item of dish.ingredients) {
      if (!merged.has(item.name)) merged.set(item.name, []);
      merged.get(item.name).push(scaleAmount(item.amount, diners));
    }
    return [...merged.entries()].map(([name, amounts]) => `${name}${mergeAmounts(amounts)}`).join("、");
  }

  function getDiners() {
    const control = document.querySelector("#food-diners");
    const value = control instanceof HTMLSelectElement ? Number(control.value) : Number(state.options.diners || 4);
    const diners = Number.isFinite(value) ? Math.max(1, Math.min(12, Math.round(value))) : 4;
    state.options.diners = diners;
    return diners;
  }

  function estimateTotalMinutes(menu) {
    const long = Math.max(...menu.map((dish) => dish.prepMinutes + dish.passiveMinutes + dish.cookMinutes), 0);
    return Math.max(45, Math.round(long + Math.max(0, menu.length - 3) * 10));
  }

  function scaleAmount(amount, diners) {
    if (!amount || amount === "适量") return amount || "适量";
    const factor = diners / 2;
    const match = String(amount).match(/^(\d+(?:\.\d+)?)(克|毫升|个|根|块|片|只|把|碗)$/);
    if (!match) return amount;
    let value = Number(match[1]) * factor;
    const unit = match[2];
    if (["个", "根", "块", "片", "只", "把", "碗"].includes(unit)) value = Math.max(1, Math.ceil(value));
    else value = value >= 100 ? Math.round(value / 10) * 10 : Math.round(value);
    return `${value}${unit}`;
  }

  function mergeAmounts(amounts) {
    const meaningful = unique(amounts.filter(Boolean));
    if (meaningful.includes("适量")) return "适量";
    if (meaningful.length === 1) return meaningful[0];
    return meaningful.slice(0, 2).join("＋");
  }

  function weightedPick(items, weightFn) {
    const weighted = items.map((item) => ({ item, weight: Math.max(0, Number(weightFn(item)) || 0) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (total <= 0) return items[Math.floor(Math.random() * items.length)];
    let cursor = Math.random() * total;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
  }

  function sample(items, count) {
    const copy = [...items];
    const result = [];
    while (copy.length && result.length < count) {
      result.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return result;
  }

  function splitWords(value) {
    return String(value).split(/[、,，;；\s]+/).map((item) => item.trim()).filter(Boolean);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function shortName(value, max) {
    const chars = [...String(value)];
    return chars.length > max ? `${chars.slice(0, max).join("")}…` : chars.join("");
  }

  function makeTicks(total) {
    const step = total > 180 ? 30 : total > 90 ? 20 : 15;
    const ticks = [];
    for (let value = 0; value <= total; value += step) ticks.push(value);
    if (ticks[ticks.length - 1] !== total) ticks.push(total);
    return ticks;
  }

  function subtractMinutes(clock, minutes) {
    const [hour, minute] = clock.split(":").map(Number);
    let total = hour * 60 + minute - minutes;
    while (total < 0) total += 1440;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function minuteToClock(startClock, offset) {
    const [hour, minute] = startClock.split(":").map(Number);
    const total = (hour * 60 + minute + Math.round(offset)) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function laneColor(lane) {
    const colors = ["#4f7cf7", "#e56d55", "#54a883", "#9266dc", "#d7a43e", "#3e9bbd", "#8a6a4b", "#bd5c91"];
    let hash = 0;
    for (const char of lane) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return colors[hash % colors.length];
  }

  function todayString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  async function requestJson(path, options = {}) {
    const response = await nativeFetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: options.body === undefined ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    if (!response.ok) {
      throw new Error(payload && typeof payload === "object" && payload.error ? String(payload.error) : `请求失败（${response.status}）`);
    }
    return payload;
  }

  function toast(message, error = false) {
    let root = document.querySelector("#toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      document.body.appendChild(root);
    }
    const element = document.createElement("div");
    element.className = `toast ${error ? "error" : ""}`;
    element.textContent = message;
    root.appendChild(element);
    window.setTimeout(() => element.remove(), 3500);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function icon(name) {
    const paths = {
      utensils: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"/>',
      wheel: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 5M12 12 5 8M12 12l-3 8"/>',
      book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 1V4Z"/><path d="M7 4v16"/>',
      timeline: '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>',
      sparkles: '<path d="m12 3-1.2 3.1L8 7.4l2.8 1.3L12 12l1.2-3.3L16 7.4l-2.8-1.3L12 3Z"/><path d="m5 13-.8 2.1L2 16l2.2.9L5 19l.8-2.1L8 16l-2.2-.9L5 13Z"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
    };
    return `<svg class="food-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.utensils}</svg>`;
  }
})();
