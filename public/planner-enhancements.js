(() => {
  "use strict";

  const VERSION = "3.2.0";
  const API = "/api";
  const DEFAULT_CENTER = [31.2989, 120.5853];
  const nativeFetch = window.fetch.bind(window);

  const cache = {
    me: null,
    spaces: [],
    membersBySpace: new Map(),
    eventsBySpace: new Map(),
    placesBySpace: new Map(),
    activitiesBySpace: new Map(),
    revisionBySpace: new Map(),
  };

  const eventEnhancement = {
    eventId: null,
    selectedPlaceId: null,
    pendingPlace: null,
    selectedSpaceIds: [],
    deleteMode: "detach",
  };

  const ui = {
    overlay: null,
    activeTab: "map",
    map: null,
    markerLayer: null,
    pickerMap: null,
    pickerMarker: null,
    plannerResult: null,
    plannerEvents: [],
    smartPendingPlace: null,
    refreshToken: 0,
  };

  const ACTIVITY_LIBRARY = [
    ["一起做一顿饭", "居家", "轻松"], ["尝试复刻一道网红菜", "居家", "轻松"], ["做一次主题火锅", "美食", "轻松"],
    ["找一家没吃过的小店", "美食", "轻松"], ["一起去早市吃早餐", "美食", "早起"], ["去夜市边走边吃", "美食", "夜晚"],
    ["带上零食去野餐", "户外", "轻松"], ["去公园铺毯子晒太阳", "户外", "轻松"], ["找一条河边散步", "户外", "轻松"],
    ["来一次城市徒步", "户外", "运动"], ["爬一座不太累的山", "户外", "运动"], ["看一次日出", "户外", "早起"],
    ["看一次日落", "户外", "浪漫"], ["去露营或天幕野炊", "户外", "进阶"], ["骑行探索一条新路线", "户外", "运动"],
    ["一起去划船", "户外", "运动"], ["去植物园慢慢逛", "自然", "轻松"], ["去动物园看喜欢的动物", "自然", "轻松"],
    ["去看一场电影", "文娱", "轻松"], ["看一场话剧或音乐剧", "文娱", "体验"], ["去听一场现场音乐", "文娱", "夜晚"],
    ["去KTV唱歌", "文娱", "热闹"], ["玩一次密室逃脱", "游戏", "刺激"], ["组队玩剧本杀", "游戏", "进阶"],
    ["去桌游店玩新游戏", "游戏", "轻松"], ["一起打保龄球", "运动", "轻松"], ["去打羽毛球", "运动", "运动"],
    ["体验一次攀岩", "运动", "挑战"], ["去游泳", "运动", "运动"], ["一起滑冰或轮滑", "运动", "挑战"],
    ["去逛博物馆", "文化", "轻松"], ["去逛美术馆", "文化", "轻松"], ["去看一个临时展览", "文化", "体验"],
    ["找一家书店各选一本书", "文化", "安静"], ["去图书馆安静待半天", "文化", "安静"], ["逛一次古镇或老街", "文化", "轻松"],
    ["拍一组城市街头照片", "摄影", "创作"], ["互相拍一组主题照片", "摄影", "创作"], ["寻找城市里最有意思的门牌", "摄影", "探索"],
    ["做一次陶艺", "手作", "体验"], ["做一次银饰或皮具", "手作", "体验"], ["一起画画或涂鸦", "手作", "轻松"],
    ["拼一幅大拼图", "居家", "安静"], ["一起搭积木", "居家", "轻松"], ["做一次甜品或蛋糕", "美食", "手作"],
    ["去花市挑一盆植物", "生活", "轻松"], ["逛家居店设计理想房间", "生活", "轻松"], ["去二手市场淘宝", "探索", "轻松"],
    ["各自用固定预算给对方挑礼物", "互动", "有趣"], ["交换一天的歌单", "互动", "轻松"], ["一起整理共同照片", "互动", "回忆"],
    ["玩一次真心话大冒险", "互动", "热闹"], ["每个人讲一个最近的故事", "互动", "轻松"], ["一起写未来一年想做的事", "互动", "规划"],
    ["随机坐一班公交到陌生站下车", "探索", "冒险"], ["在地图上随机抽一个街区", "探索", "冒险"], ["只靠硬币决定接下来往哪走", "探索", "冒险"],
    ["去一个从没去过的地铁终点站", "探索", "冒险"], ["找城市最高处看风景", "探索", "体验"], ["探访一座小众建筑", "探索", "文化"],
    ["去做一次志愿活动", "公益", "意义"], ["一起去流浪动物机构帮忙", "公益", "意义"], ["参加一次环保捡跑", "公益", "运动"],
    ["给未来的彼此写一封信", "互动", "回忆"], ["录一段共同播客", "创作", "有趣"], ["拍一个一分钟小短片", "创作", "有趣"],
    ["一起制作旅行路线图", "规划", "轻松"], ["策划一次周边一日游", "旅行", "规划"], ["坐高铁去邻近城市吃一顿饭", "旅行", "冒险"],
    ["去泡温泉", "放松", "轻松"], ["体验一次按摩或足疗", "放松", "轻松"], ["找一家安静咖啡馆发呆", "放松", "安静"],
    ["去江边或湖边吹风", "放松", "轻松"], ["找个地方看云", "放松", "安静"], ["一起做一次冥想或瑜伽", "放松", "安静"],
    ["参加一次公开课或讲座", "学习", "成长"], ["一起学一个小技能", "学习", "成长"], ["去体验一节舞蹈课", "学习", "运动"],
    ["学做一种咖啡或饮品", "学习", "美食"], ["一起练习一门外语一小时", "学习", "成长"], ["互相教对方一个擅长的东西", "学习", "互动"],
    ["去看一场球赛", "赛事", "热闹"], ["一起参加城市跑或趣味赛", "赛事", "运动"], ["去现场看电竞比赛", "赛事", "热闹"],
    ["举办一次主题穿搭日", "有趣", "创作"], ["用同一种颜色穿搭出门", "有趣", "摄影"], ["尝试一次不看手机的半日活动", "挑战", "安静"],
    ["每人带一道菜办小型聚餐", "聚会", "美食"], ["组织一次交换闲置物品", "聚会", "有趣"], ["办一次家庭影院之夜", "聚会", "轻松"],
    ["一起去唱一次露天K歌", "有趣", "热闹"], ["去电玩城比赛", "游戏", "热闹"], ["拍一次大头贴", "摄影", "轻松"],
    ["去尝试一个季节限定活动", "季节", "体验"], ["雨天一起踩水散步", "季节", "浪漫"], ["冬天一起喝热饮看夜景", "季节", "浪漫"],
    ["春天去看花", "季节", "自然"], ["夏天去玩水", "季节", "户外"], ["秋天去捡落叶做标本", "季节", "手作"],
  ].map((item, index) => ({ id: `builtin-${index + 1}`, title: item[0], category: item[1], tag: item[2] }));

  function parseUrl(input) {
    try {
      if (input instanceof Request) return new URL(input.url, location.origin);
      return new URL(String(input), location.origin);
    } catch {
      return null;
    }
  }

  function bodyToObject(body) {
    if (typeof body !== "string") return null;
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function jsonResponse(message, status = 500) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  window.fetch = async function enhancedFetch(input, init = {}) {
    const url = parseUrl(input);
    const method = String(init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    let nextInput = input;
    let nextInit = init;

    try {
      if (url && url.origin === location.origin && /^\/api\/(spaces\/[^/]+\/events|events\/[^/]+)$/.test(url.pathname)) {
        if ((method === "POST" || method === "PATCH") && typeof init.body === "string") {
          const payload = bodyToObject(init.body);
          if (payload) {
            const activeSpaceId = getActiveSpaceId();
            const isSmartSubmission = !document.querySelector("#event-form")
              && Boolean(document.querySelector("#smart-form"))
              && (payload.source === "rules" || payload.source === "ai");
            const formState = isSmartSubmission
              ? { selectedPlaceId: null, pendingPlace: ui.smartPendingPlace, spaceIds: Array.isArray(payload.spaceIds) ? payload.spaceIds : [], deleteMode: "detach" }
              : readEventEnhancementForm();
            if (activeSpaceId) payload.currentSpaceId = activeSpaceId;
            if (formState.spaceIds.length) payload.spaceIds = formState.spaceIds;

            if (formState.selectedPlaceId) {
              const selected = findCachedPlace(activeSpaceId, formState.selectedPlaceId);
              payload.placeId = formState.selectedPlaceId;
              if (selected) {
                payload.location = selected.name;
                payload.placeAddress = selected.address || "";
                payload.latitude = selected.latitude;
                payload.longitude = selected.longitude;
              }
            } else if (formState.pendingPlace) {
              const pending = formState.pendingPlace;
              if (pending.saveToLibrary && activeSpaceId) {
                const created = await requestJsonNative(`${API}/spaces/${activeSpaceId}/places`, {
                  method: "POST",
                  body: {
                    name: pending.name,
                    address: pending.address,
                    latitude: pending.latitude,
                    longitude: pending.longitude,
                    category: pending.category || "其他",
                    status: pending.status || "planned",
                    notes: pending.notes || "由日程地图标点创建",
                  },
                });
                payload.placeId = created.place.id;
                payload.location = created.place.name;
                payload.placeAddress = created.place.address || "";
                payload.latitude = created.place.latitude;
                payload.longitude = created.place.longitude;
                await loadPlaces(activeSpaceId, true);
              } else {
                payload.placeId = null;
                payload.location = pending.name || payload.location || "地图标记点";
                payload.placeAddress = pending.address || "";
                payload.latitude = pending.latitude;
                payload.longitude = pending.longitude;
              }
            }

            nextInit = {
              ...init,
              headers: { ...(init.headers || {}), "content-type": "application/json" },
              body: JSON.stringify(payload),
            };
          }
        }

        if (method === "DELETE" && /^\/api\/events\//.test(url.pathname)) {
          const activeSpaceId = getActiveSpaceId();
          if (activeSpaceId && !url.searchParams.has("spaceId")) url.searchParams.set("spaceId", activeSpaceId);
          if (!url.searchParams.has("mode")) url.searchParams.set("mode", eventEnhancement.deleteMode || "detach");
          nextInput = url.toString();
        }
      }
    } catch (error) {
      return jsonResponse(error instanceof Error ? error.message : "地图或同步设置处理失败", 400);
    }

    const response = await nativeFetch(nextInput, nextInit);
    if (response.ok && url && method === "POST" && /^\/api\/spaces\/[^/]+\/events$/.test(url.pathname) && ui.smartPendingPlace) {
      ui.smartPendingPlace = null;
    }
    if (url && url.origin === location.origin && url.pathname.startsWith("/api/") && response.ok) {
      void response.clone().json().then((payload) => absorbApiResponse(url, method, payload)).catch(() => undefined);
    }
    return response;
  };

  function absorbApiResponse(url, method, payload) {
    if (!payload || typeof payload !== "object") return;
    if (url.pathname === "/api/bootstrap") {
      cache.me = payload.user || cache.me;
      cache.spaces = Array.isArray(payload.spaces) ? payload.spaces : cache.spaces;
    }
    const spaceMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)$/);
    if (spaceMatch && method === "GET") {
      if (Array.isArray(payload.members)) cache.membersBySpace.set(spaceMatch[1], payload.members);
    }
    const eventsMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)\/events$/);
    if (eventsMatch && method === "GET") {
      if (Array.isArray(payload.events)) cache.eventsBySpace.set(eventsMatch[1], payload.events);
      if (Number.isFinite(payload.revision)) cache.revisionBySpace.set(eventsMatch[1], payload.revision);
    }
    const placesMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)\/places$/);
    if (placesMatch && method === "GET" && Array.isArray(payload.places)) {
      cache.placesBySpace.set(placesMatch[1], payload.places);
    }
    const activitiesMatch = url.pathname.match(/^\/api\/spaces\/([^/]+)\/activities$/);
    if (activitiesMatch && method === "GET" && Array.isArray(payload.activities)) {
      cache.activitiesBySpace.set(activitiesMatch[1], payload.activities);
    }
  }

  async function requestJsonNative(path, options = {}) {
    const response = await nativeFetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: options.body === undefined ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    if (!response.ok) {
      const message = payload && payload.error ? String(payload.error) : `请求失败（${response.status}）`;
      throw new Error(message);
    }
    return payload;
  }

  function getActiveSpaceId() {
    return document.querySelector("#space-select")?.value || localStorage.getItem("activeSpaceId") || null;
  }

  function getActiveSpace() {
    const id = getActiveSpaceId();
    return cache.spaces.find((space) => space.id === id) || null;
  }

  function isActiveSpaceAdmin() {
    const role = getActiveSpace()?.role;
    return role === "owner" || role === "admin";
  }

  function getMembers(spaceId = getActiveSpaceId()) {
    return spaceId ? cache.membersBySpace.get(spaceId) || [] : [];
  }

  function findCachedPlace(spaceId, placeId) {
    if (!spaceId || !placeId) return null;
    return (cache.placesBySpace.get(spaceId) || []).find((place) => place.id === placeId) || null;
  }

  async function ensureBootstrap() {
    if (cache.spaces.length && cache.me) return;
    const payload = await requestJsonNative(`${API}/bootstrap`);
    cache.me = payload.user;
    cache.spaces = payload.spaces || [];
  }

  async function ensureSpaceData(spaceId, force = false) {
    if (!spaceId) return;
    if (force || !cache.membersBySpace.has(spaceId)) {
      const payload = await requestJsonNative(`${API}/spaces/${spaceId}`);
      cache.membersBySpace.set(spaceId, payload.members || []);
    }
    await Promise.all([loadPlaces(spaceId, force), loadActivities(spaceId, force)]);
  }

  async function loadPlaces(spaceId, force = false) {
    if (!spaceId) return [];
    if (!force && cache.placesBySpace.has(spaceId)) return cache.placesBySpace.get(spaceId) || [];
    const payload = await requestJsonNative(`${API}/spaces/${spaceId}/places?status=all`);
    const places = payload.places || [];
    cache.placesBySpace.set(spaceId, places);
    return places;
  }

  async function loadActivities(spaceId, force = false) {
    if (!spaceId) return [];
    if (!force && cache.activitiesBySpace.has(spaceId)) return cache.activitiesBySpace.get(spaceId) || [];
    const payload = await requestJsonNative(`${API}/spaces/${spaceId}/activities`);
    const activities = payload.activities || [];
    cache.activitiesBySpace.set(spaceId, activities);
    return activities;
  }

  async function loadEventsForRange(spaceId, start, end) {
    const payload = await requestJsonNative(`${API}/spaces/${spaceId}/events?start=${start}&end=${end}`);
    cache.eventsBySpace.set(spaceId, payload.events || []);
    return payload.events || [];
  }

  function resetEventEnhancement(isNew = true) {
    eventEnhancement.eventId = isNew ? null : eventEnhancement.eventId;
    eventEnhancement.selectedPlaceId = null;
    eventEnhancement.pendingPlace = null;
    eventEnhancement.selectedSpaceIds = [];
    eventEnhancement.deleteMode = "detach";
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const eventButton = target.closest("[data-event-id]");
    if (eventButton) {
      eventEnhancement.eventId = eventButton.getAttribute("data-event-id");
      resetEventEnhancement(false);
    }
    if (target.closest("#new-event-btn, #day-add-event, #detail-add-event")) resetEventEnhancement(true);
    if (target.closest("#smart-add-btn")) ui.smartPendingPlace = null;
  }, true);

  const observer = new MutationObserver(() => enhanceCurrentDom());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", enhanceCurrentDom);
  window.addEventListener("load", enhanceCurrentDom);

  function enhanceCurrentDom() {
    suppressNativeMapUi();
    injectPlannerEntry();
    injectEventEnhancements();
    injectSmartEnhancements();
  }

  function suppressNativeMapUi() {
    document.querySelectorAll('[data-view="map"], #planner-view-btn').forEach((element) => element.remove());
    const nativeMap = document.querySelector("#shared-map");
    if (nativeMap && !document.querySelector("#planner-enhancement-overlay")) {
      document.querySelector('[data-view="month"]')?.click();
    }
  }

  function injectPlannerEntry() {
    const commandbar = document.querySelector(".space-commandbar");
    if (commandbar && !commandbar.querySelector("#map-planner-btn")) {
      const button = document.createElement("button");
      button.className = "command-btn planner-command";
      button.id = "map-planner-btn";
      button.type = "button";
      button.innerHTML = `
        <span class="command-icon">${icon("map")}</span>
        <span class="command-copy"><strong>地图与随机规划</strong><small>标点、投票、抽日期与活动</small></span>`;
      button.addEventListener("click", () => void openPlanner("map"));
      commandbar.appendChild(button);
    }

  }

  function injectEventEnhancements() {
    const form = document.querySelector("#event-form");
    if (!form || form.querySelector("#event-map-sync-fields")) return;
    const activeSpaceId = getActiveSpaceId();
    if (form.querySelector(".place-event-block") || form.querySelector(".sync-space-block")) {
      enhanceNativeEventForm(form, activeSpaceId);
      return;
    }
    if (!activeSpaceId) return;

    const cachedEvent = eventEnhancement.eventId
      ? (cache.eventsBySpace.get(activeSpaceId) || []).find((item) => item.id === eventEnhancement.eventId)
      : null;
    if (cachedEvent) {
      eventEnhancement.selectedPlaceId = cachedEvent.placeId || null;
      eventEnhancement.pendingPlace = cachedEvent.latitude != null && cachedEvent.longitude != null && !cachedEvent.placeId
        ? {
            name: cachedEvent.location || "地图标记点",
            address: cachedEvent.placeAddress || "",
            latitude: cachedEvent.latitude,
            longitude: cachedEvent.longitude,
            saveToLibrary: false,
            status: "planned",
          }
        : null;
      eventEnhancement.selectedSpaceIds = Array.isArray(cachedEvent.spaceIds) && cachedEvent.spaceIds.length
        ? cachedEvent.spaceIds.slice()
        : [activeSpaceId];
    } else {
      eventEnhancement.selectedSpaceIds = [activeSpaceId];
    }

    const section = document.createElement("section");
    section.id = "event-map-sync-fields";
    section.className = "event-enhancement-section form-group full";
    section.innerHTML = renderEventEnhancementSection(activeSpaceId, cachedEvent);

    const grid = form.querySelector(".form-grid");
    if (grid) grid.appendChild(section);
    else form.insertBefore(section, form.querySelector(".modal-actions"));

    form.addEventListener("submit", () => readEventEnhancementForm(), true);
    bindEventEnhancementHandlers(section, activeSpaceId, cachedEvent);
    void ensureBootstrap().then(() => ensureSpaceData(activeSpaceId)).then(() => refreshEventEnhancementSection(activeSpaceId, cachedEvent)).catch(() => undefined);
  }

  function enhanceNativeEventForm(form, activeSpaceId) {
    if (!activeSpaceId || form.dataset.mapPlannerEnhanced === "1") return;
    form.dataset.mapPlannerEnhanced = "1";
    const select = form.querySelector('#event-place-select, select[name="placeId"]');
    const currentValue = select?.value || "";
    eventEnhancement.selectedPlaceId = currentValue || null;
    const existingButton = form.querySelector("#open-map-from-event");
    if (existingButton) {
      const button = existingButton.cloneNode(true);
      button.textContent = "在地图上标点";
      button.title = "直接点击地图选择位置，不进入另一张共享地图";
      existingButton.replaceWith(button);
      button.addEventListener("click", () => {
        const locationInput = form.querySelector('input[name="location"]');
        const latInput = form.querySelector('input[name="latitude"]');
        const lonInput = form.querySelector('input[name="longitude"]');
        const addressInput = form.querySelector('input[name="placeAddress"]');
        const latitude = Number(latInput?.value);
        const longitude = Number(lonInput?.value);
        void openMapPicker({
          title: "为这条日程直接标点",
          initialName: locationInput?.value || "",
          initialPlace: Number.isFinite(latitude) && Number.isFinite(longitude) && latInput?.value && lonInput?.value
            ? { latitude, longitude, name: locationInput?.value || "地图标记点", address: addressInput?.value || "" }
            : null,
          onConfirm: (place) => {
            eventEnhancement.selectedPlaceId = null;
            eventEnhancement.pendingPlace = place;
            if (select) select.value = "";
            if (locationInput) locationInput.value = place.name;
            if (addressInput) addressInput.value = place.address || "";
            if (latInput) latInput.value = String(place.latitude);
            if (lonInput) lonInput.value = String(place.longitude);
          },
        });
      });
    }
    select?.addEventListener("change", () => {
      eventEnhancement.selectedPlaceId = select.value || null;
      if (select.value) eventEnhancement.pendingPlace = null;
    });
  }

  function injectSmartEnhancements() {
    const draftCard = document.querySelector(".draft-card");
    if (!draftCard || draftCard.querySelector("#smart-pick-map")) return;
    const actions = draftCard.querySelector(".inline-actions") || draftCard;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "smart-pick-map";
    button.className = "secondary-btn smart-pick-map";
    button.innerHTML = `${icon("pin")} 地图直接标点`;
    button.addEventListener("click", () => {
      const initialName = readDraftLocationText();
      void openMapPicker({
        title: "为智能日程确认地点",
        initialName: initialName === "未填写" ? "" : initialName,
        initialPlace: ui.smartPendingPlace,
        onConfirm: (place) => {
          ui.smartPendingPlace = place;
          const note = draftCard.querySelector("#smart-picked-place-note") || document.createElement("div");
          note.id = "smart-picked-place-note";
          note.className = "smart-picked-place-note";
          note.textContent = `已标点：${place.name} · ${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`;
          if (!note.parentElement) draftCard.insertBefore(note, actions);
        },
      });
    });
    actions.prepend(button);
  }

  function readDraftLocationText() {
    const terms = Array.from(document.querySelectorAll(".draft-card dt"));
    const locationTerm = terms.find((term) => term.textContent?.trim() === "地点");
    return locationTerm?.nextElementSibling?.textContent?.trim().split("\n")[0] || "";
  }

  function renderEventEnhancementSection(activeSpaceId, cachedEvent) {
    const spaces = cache.spaces.length ? cache.spaces : [{ id: activeSpaceId, name: "当前空间", icon: "◫" }];
    const canChangeSpaces = !cachedEvent || cachedEvent.createdBy === cache.me?.id;
    const placeLabel = eventEnhancement.selectedPlaceId
      ? (findCachedPlace(activeSpaceId, eventEnhancement.selectedPlaceId)?.name || "已选择地点")
      : eventEnhancement.pendingPlace
        ? eventEnhancement.pendingPlace.name
        : "尚未在地图上标点";
    return `
      <div class="event-enhancement-card">
        <div class="event-enhancement-head">
          <div>${icon("pin")}<span><strong>地点标定</strong><small>可直接在地图上点选，不需要先搜索</small></span></div>
          <button type="button" class="secondary-btn" id="event-pick-map">在地图上标点</button>
        </div>
        <div class="event-place-row">
          <select class="field" id="event-place-select">
            <option value="">不关联地点库</option>
            ${(cache.placesBySpace.get(activeSpaceId) || []).map((place) => `<option value="${escapeAttr(place.id)}" ${place.id === eventEnhancement.selectedPlaceId ? "selected" : ""}>${escapeHtml(place.name)}${place.status ? ` · ${placeStatusLabel(place.status)}` : ""}</option>`).join("")}
          </select>
          <div class="selected-location-summary" id="event-location-summary">${escapeHtml(placeLabel)}</div>
          <button type="button" class="ghost-btn" id="event-clear-place">清除标点</button>
        </div>
      </div>
      <div class="event-enhancement-card">
        <div class="event-enhancement-head compact-head">
          <div>${icon("layers")}<span><strong>同步到其他空间</strong><small>同一事件只保存一份，修改后所有空间同步</small></span></div>
        </div>
        <div class="sync-space-grid">
          ${spaces.map((space) => {
            const checked = eventEnhancement.selectedSpaceIds.includes(space.id) || space.id === activeSpaceId;
            const disabled = space.id === activeSpaceId || !canChangeSpaces;
            return `<label class="sync-space-option ${disabled && space.id !== activeSpaceId ? "readonly" : ""}"><input type="checkbox" data-sync-space="${escapeAttr(space.id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}/><span>${escapeHtml(space.icon || "◫")} ${escapeHtml(space.name)}</span>${space.id === activeSpaceId ? `<small>当前空间</small>` : ""}</label>`;
          }).join("")}
        </div>
        ${cachedEvent && Array.isArray(cachedEvent.spaceIds) && cachedEvent.spaceIds.length > 1 ? `
          <label class="delete-mode-row">删除这条多空间日程时
            <select class="field" id="event-delete-mode">
              <option value="detach">只从当前空间移除</option>
              <option value="all" ${cachedEvent.createdBy === cache.me?.id ? "" : "disabled"}>从全部空间彻底删除</option>
            </select>
          </label>` : ""}
      </div>`;
  }

  function refreshEventEnhancementSection(activeSpaceId, cachedEvent) {
    const section = document.querySelector("#event-map-sync-fields");
    if (!section) return;
    section.innerHTML = renderEventEnhancementSection(activeSpaceId, cachedEvent);
    bindEventEnhancementHandlers(section, activeSpaceId, cachedEvent);
  }

  function bindEventEnhancementHandlers(section, activeSpaceId, cachedEvent) {
    section.querySelector("#event-pick-map")?.addEventListener("click", () => {
      const locationInput = document.querySelector('#event-form input[name="location"]');
      void openMapPicker({
        title: "为日程在地图上标点",
        initialName: locationInput?.value || cachedEvent?.location || "",
        initialPlace: eventEnhancement.pendingPlace || (cachedEvent?.latitude != null ? {
          latitude: cachedEvent.latitude,
          longitude: cachedEvent.longitude,
          name: cachedEvent.location || "地图标记点",
          address: cachedEvent.placeAddress || "",
        } : null),
        onConfirm: (place) => {
          eventEnhancement.selectedPlaceId = null;
          eventEnhancement.pendingPlace = place;
          if (locationInput && !locationInput.value.trim()) locationInput.value = place.name;
          const summary = document.querySelector("#event-location-summary");
          if (summary) summary.textContent = `${place.name} · ${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}`;
          const select = document.querySelector("#event-place-select");
          if (select) select.value = "";
        },
      });
    });

    section.querySelector("#event-place-select")?.addEventListener("change", (event) => {
      const value = event.target.value;
      eventEnhancement.selectedPlaceId = value || null;
      eventEnhancement.pendingPlace = null;
      const place = findCachedPlace(activeSpaceId, value);
      const locationInput = document.querySelector('#event-form input[name="location"]');
      if (place && locationInput) locationInput.value = place.name;
      const summary = document.querySelector("#event-location-summary");
      if (summary) summary.textContent = place ? `${place.name}${place.address ? ` · ${place.address}` : ""}` : "尚未在地图上标点";
    });

    section.querySelector("#event-clear-place")?.addEventListener("click", () => {
      eventEnhancement.selectedPlaceId = null;
      eventEnhancement.pendingPlace = null;
      const select = document.querySelector("#event-place-select");
      if (select) select.value = "";
      const summary = document.querySelector("#event-location-summary");
      if (summary) summary.textContent = "尚未在地图上标点";
    });

    section.querySelectorAll("[data-sync-space]").forEach((input) => {
      input.addEventListener("change", () => {
        eventEnhancement.selectedSpaceIds = Array.from(section.querySelectorAll("[data-sync-space]:checked")).map((item) => item.getAttribute("data-sync-space")).filter(Boolean);
        if (!eventEnhancement.selectedSpaceIds.includes(activeSpaceId)) eventEnhancement.selectedSpaceIds.unshift(activeSpaceId);
      });
    });

    section.querySelector("#event-delete-mode")?.addEventListener("change", (event) => {
      eventEnhancement.deleteMode = event.target.value === "all" ? "all" : "detach";
    });
  }

  function readEventEnhancementForm() {
    const section = document.querySelector("#event-map-sync-fields");
    const nativeForm = document.querySelector("#event-form");
    if (section) {
      const activeSpaceId = getActiveSpaceId();
      eventEnhancement.selectedSpaceIds = Array.from(section.querySelectorAll("[data-sync-space]:checked")).map((item) => item.getAttribute("data-sync-space")).filter(Boolean);
      if (activeSpaceId && !eventEnhancement.selectedSpaceIds.includes(activeSpaceId)) eventEnhancement.selectedSpaceIds.unshift(activeSpaceId);
      const mode = section.querySelector("#event-delete-mode")?.value;
      eventEnhancement.deleteMode = mode === "all" ? "all" : "detach";
    } else if (nativeForm) {
      const activeSpaceId = getActiveSpaceId();
      eventEnhancement.selectedSpaceIds = Array.from(nativeForm.querySelectorAll('input[name="spaceIds"]:checked')).map((item) => item.value).filter(Boolean);
      if (activeSpaceId && !eventEnhancement.selectedSpaceIds.includes(activeSpaceId)) eventEnhancement.selectedSpaceIds.unshift(activeSpaceId);
      const select = nativeForm.querySelector('#event-place-select, select[name="placeId"]');
      if (select?.value) {
        eventEnhancement.selectedPlaceId = select.value;
        eventEnhancement.pendingPlace = null;
      }
    }
    return {
      selectedPlaceId: eventEnhancement.selectedPlaceId,
      pendingPlace: eventEnhancement.pendingPlace,
      spaceIds: eventEnhancement.selectedSpaceIds.slice(),
      deleteMode: eventEnhancement.deleteMode,
    };
  }

  async function openPlanner(tab = "map") {
    try {
      await ensureBootstrap();
      const spaceId = getActiveSpaceId();
      if (!spaceId) throw new Error("请先创建或加入一个空间");
      await ensureSpaceData(spaceId, true);
      ui.activeTab = tab;
      createPlannerOverlay();
      renderPlannerOverlay();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "无法打开地图规划", true);
    }
  }

  function createPlannerOverlay() {
    document.querySelector("#planner-enhancement-overlay")?.remove();
    const overlay = document.createElement("div");
    overlay.id = "planner-enhancement-overlay";
    overlay.className = "planner-overlay";
    overlay.innerHTML = `<section class="planner-shell"><header class="planner-header"><div><span class="planner-logo">${icon("compass")}</span><span><strong>地图与随机规划</strong><small>当前空间：${escapeHtml(getActiveSpace()?.name || "共享空间")}</small></span></div><button class="planner-close" id="planner-close" aria-label="关闭">×</button></header><div id="planner-content"></div></section>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#planner-close")?.addEventListener("click", closePlanner);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closePlanner(); });
    ui.overlay = overlay;
  }

  function closePlanner() {
    if (ui.map) { ui.map.remove(); ui.map = null; }
    ui.overlay?.remove();
    ui.overlay = null;
  }

  function renderPlannerOverlay() {
    const root = document.querySelector("#planner-content");
    if (!root) return;
    root.innerHTML = `
      <nav class="planner-tabs">
        <button data-planner-tab="map" class="${ui.activeTab === "map" ? "active" : ""}">${icon("map")}<span>共享地图</span></button>
        <button data-planner-tab="activities" class="${ui.activeTab === "activities" ? "active" : ""}">${icon("sparkles")}<span>想做的事情</span></button>
        <button data-planner-tab="random" class="${ui.activeTab === "random" ? "active" : ""}">${icon("dice")}<span>随机规划</span></button>
      </nav>
      <div class="planner-tab-body">${ui.activeTab === "map" ? renderMapTab() : ui.activeTab === "activities" ? renderActivitiesTab() : renderRandomTab()}</div>`;
    root.querySelectorAll("[data-planner-tab]").forEach((button) => button.addEventListener("click", () => {
      if (ui.map) { ui.map.remove(); ui.map = null; }
      ui.activeTab = button.getAttribute("data-planner-tab");
      renderPlannerOverlay();
    }));
    if (ui.activeTab === "map") bindMapTab();
    if (ui.activeTab === "activities") bindActivitiesTab();
    if (ui.activeTab === "random") bindRandomTab();
  }

  function placeRecords(spaceId = getActiveSpaceId()) {
    return cache.placesBySpace.get(spaceId) || [];
  }

  function activityRecords(spaceId = getActiveSpaceId()) {
    return cache.activitiesBySpace.get(spaceId) || [];
  }

  function renderMapTab() {
    const places = placeRecords();
    const statusCounts = {
      all: places.length,
      wishlist: places.filter((place) => place.status === "wishlist").length,
      planned: places.filter((place) => place.status === "planned").length,
      visited: places.filter((place) => place.status === "visited").length,
    };
    return `
      <section class="map-layout">
        <aside class="map-sidebar">
          <div class="planner-section-head"><div><h3>空间地点库</h3><p>直接在地图上点击标点，也可以搜索后确认。</p></div><button class="primary-btn" id="add-place-pin">${icon("pin")} 地图标点</button></div>
          <div class="place-stat-grid">
            <button data-place-filter="all" class="active"><strong>${statusCounts.all}</strong><span>全部</span></button>
            <button data-place-filter="wishlist"><strong>${statusCounts.wishlist}</strong><span>想去</span></button>
            <button data-place-filter="planned"><strong>${statusCounts.planned}</strong><span>已计划</span></button>
            <button data-place-filter="visited"><strong>${statusCounts.visited}</strong><span>去过</span></button>
          </div>
          <div class="place-search-row"><input class="field" id="place-map-search" placeholder="搜索地点（可选）"/><button class="secondary-btn" id="place-map-search-btn">搜索</button></div>
          <div id="place-search-results" class="place-search-results"></div>
          <div id="place-list" class="place-list">${renderPlaceList(places)}</div>
        </aside>
        <div class="map-canvas-wrap"><div id="shared-map-canvas" class="shared-map-canvas"></div><div class="map-tip">点击地图上的任意位置即可标点；不会读取或共享你的实时位置。</div></div>
      </section>`;
  }

  function renderPlaceList(places) {
    if (!places.length) return `<div class="planner-empty"><span>${icon("pin")}</span><strong>还没有地点</strong><p>点击“地图标点”，在地图上选一个位置。</p></div>`;
    return places.map((place) => `
      <article class="place-card" data-place-card="${escapeAttr(place.id)}" data-status="${escapeAttr(place.status)}">
        <button class="place-focus" data-focus-place="${escapeAttr(place.id)}">
          <span class="place-status-icon status-${escapeAttr(place.status)}">${placeStatusIcon(place.status)}</span>
          <span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.address || `${coordinateLabel(place.latitude, place.longitude) || "未标坐标"}`)}</small></span>
        </button>
        <div class="place-meta"><span>${placeStatusLabel(place.status)}</span><span>${escapeHtml(place.category || "其他")}</span><span>${place.relatedEventCount || 0} 次关联</span></div>
        <div class="place-actions"><button class="like-btn ${place.liked ? "active" : ""}" data-like-place="${escapeAttr(place.id)}">♥ ${place.likeCount || 0}</button><button class="ghost-btn" data-plan-place="${escapeAttr(place.id)}">安排</button>${place.canManage ? `<button class="ghost-btn" data-edit-place="${escapeAttr(place.id)}">编辑</button>` : ""}</div>
      </article>`).join("");
  }

  function bindMapTab() {
    const spaceId = getActiveSpaceId();
    const places = placeRecords(spaceId);
    initSharedMap(places);

    document.querySelector("#add-place-pin")?.addEventListener("click", () => void openMapPicker({
      title: "在共享地图上添加地点",
      onConfirm: async (place) => {
        try {
          await requestJsonNative(`${API}/spaces/${spaceId}/places`, {
            method: "POST",
            body: {
              name: place.name,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
              category: place.category || "其他",
              status: place.status || "wishlist",
              notes: place.notes || "",
            },
          });
          await loadPlaces(spaceId, true);
          showToast("地点已加入共享地图");
          renderPlannerOverlay();
        } catch (error) { showToast(error.message, true); }
      },
    }));

    document.querySelectorAll("[data-place-filter]").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll("[data-place-filter]").forEach((item) => item.classList.toggle("active", item === button));
      const filter = button.getAttribute("data-place-filter");
      document.querySelectorAll("[data-place-card]").forEach((card) => {
        card.hidden = filter !== "all" && card.getAttribute("data-status") !== filter;
      });
      updateMapMarkers(filter);
    }));

    document.querySelector("#place-map-search-btn")?.addEventListener("click", () => void searchPlaceFromMap());
    document.querySelector("#place-map-search")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); void searchPlaceFromMap(); }
    });

    document.querySelectorAll("[data-focus-place]").forEach((button) => button.addEventListener("click", () => focusPlace(button.getAttribute("data-focus-place"))));
    document.querySelectorAll("[data-like-place]").forEach((button) => button.addEventListener("click", () => void togglePlaceLike(button.getAttribute("data-like-place"))));
    document.querySelectorAll("[data-plan-place]").forEach((button) => button.addEventListener("click", () => {
      ui.activeTab = "random";
      ui.plannerResult = { presetPlaceId: button.getAttribute("data-plan-place") };
      renderPlannerOverlay();
    }));
    document.querySelectorAll("[data-edit-place]").forEach((button) => button.addEventListener("click", () => void editPlace(button.getAttribute("data-edit-place"))));
  }

  function initSharedMap(places) {
    const L = window.L;
    const container = document.querySelector("#shared-map-canvas");
    if (!L || !container) return;
    if (ui.map) ui.map.remove();
    const withCoords = places.filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
    const center = withCoords.length ? [withCoords[0].latitude, withCoords[0].longitude] : DEFAULT_CENTER;
    ui.map = L.map(container, { zoomControl: true }).setView(center, withCoords.length ? 12 : 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(ui.map);
    ui.markerLayer = L.layerGroup().addTo(ui.map);
    updateMapMarkers("all");
    ui.map.on("click", (event) => {
      void openMapPicker({
        title: "添加这个地图位置",
        initialPlace: { latitude: event.latlng.lat, longitude: event.latlng.lng, name: "", address: "" },
        onConfirm: async (place) => {
          try {
            await requestJsonNative(`${API}/spaces/${getActiveSpaceId()}/places`, { method: "POST", body: place });
            await loadPlaces(getActiveSpaceId(), true);
            showToast("地点已添加");
            renderPlannerOverlay();
          } catch (error) { showToast(error.message, true); }
        },
      });
    });
    window.setTimeout(() => ui.map?.invalidateSize(), 80);
  }

  function updateMapMarkers(filter = "all") {
    const L = window.L;
    if (!ui.map || !ui.markerLayer || !L) return;
    ui.markerLayer.clearLayers();
    const places = placeRecords().filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && (filter === "all" || place.status === filter));
    const bounds = [];
    places.forEach((place) => {
      const marker = L.marker([place.latitude, place.longitude], { title: place.name });
      marker.bindPopup(`<strong>${escapeHtml(place.name)}</strong><br/><span>${escapeHtml(place.address || placeStatusLabel(place.status))}</span><br/><button class="leaflet-plan-button" data-leaflet-plan="${escapeAttr(place.id)}">安排这里</button>`);
      marker.on("popupopen", () => {
        document.querySelector(`[data-leaflet-plan="${cssEscape(place.id)}"]`)?.addEventListener("click", () => {
          ui.activeTab = "random";
          ui.plannerResult = { presetPlaceId: place.id };
          renderPlannerOverlay();
        });
      });
      marker.addTo(ui.markerLayer);
      marker.__placeId = place.id;
      bounds.push([place.latitude, place.longitude]);
    });
    if (bounds.length > 1) ui.map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }

  function focusPlace(placeId) {
    const place = placeRecords().find((item) => item.id === placeId);
    if (!place || !ui.map || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return;
    ui.map.setView([place.latitude, place.longitude], 15, { animate: true });
    ui.markerLayer?.eachLayer((layer) => { if (layer.__placeId === placeId) layer.openPopup(); });
  }

  async function searchPlaceFromMap() {
    const input = document.querySelector("#place-map-search");
    const root = document.querySelector("#place-search-results");
    const query = input?.value.trim();
    if (!query || !root) return;
    root.innerHTML = `<div class="search-loading">正在搜索…</div>`;
    try {
      const results = await nominatimSearch(query);
      root.innerHTML = results.length ? results.slice(0, 5).map((item, index) => `<button data-search-result="${index}"><strong>${escapeHtml(item.display_name.split(",")[0])}</strong><small>${escapeHtml(item.display_name)}</small></button>`).join("") : `<div class="planner-empty small">没有找到结果，可以直接在地图上点击标点。</div>`;
      root.querySelectorAll("[data-search-result]").forEach((button) => button.addEventListener("click", () => {
        const item = results[Number(button.getAttribute("data-search-result"))];
        void openMapPicker({
          title: "确认搜索到的地点",
          initialName: item.display_name.split(",")[0],
          initialPlace: { name: item.display_name.split(",")[0], address: item.display_name, latitude: Number(item.lat), longitude: Number(item.lon) },
          onConfirm: async (place) => {
            try {
              await requestJsonNative(`${API}/spaces/${getActiveSpaceId()}/places`, { method: "POST", body: place });
              await loadPlaces(getActiveSpaceId(), true);
              showToast("地点已添加");
              renderPlannerOverlay();
            } catch (error) { showToast(error.message, true); }
          },
        });
      }));
    } catch (error) {
      root.innerHTML = `<div class="planner-empty small">${escapeHtml(error.message)}</div>`;
    }
  }

  async function togglePlaceLike(placeId) {
    try {
      await requestJsonNative(`${API}/places/${placeId}/like?spaceId=${encodeURIComponent(getActiveSpaceId())}`, { method: "POST", body: {} });
      await loadPlaces(getActiveSpaceId(), true);
      renderPlannerOverlay();
    } catch (error) { showToast(error.message, true); }
  }

  async function editPlace(placeId) {
    const place = placeRecords().find((item) => item.id === placeId);
    if (!place) return;
    void openMapPicker({
      title: "编辑地点",
      initialName: place.name,
      initialPlace: place,
      onConfirm: async (updated) => {
        try {
          await requestJsonNative(`${API}/places/${placeId}`, { method: "PATCH", body: updated });
          await loadPlaces(getActiveSpaceId(), true);
          showToast("地点已更新");
          renderPlannerOverlay();
        } catch (error) { showToast(error.message, true); }
      },
      allowDelete: true,
      onDelete: async () => {
        if (!confirm(`确认删除“${place.name}”吗？相关日程会保留文字地点。`)) return;
        try {
          await requestJsonNative(`${API}/places/${placeId}`, { method: "DELETE" });
          await loadPlaces(getActiveSpaceId(), true);
          showToast("地点已删除");
          renderPlannerOverlay();
        } catch (error) { showToast(error.message, true); }
      },
    });
  }

  function renderActivitiesTab() {
    const records = activityRecords();
    const categories = ["全部", ...new Set(ACTIVITY_LIBRARY.map((item) => item.category))];
    return `
      <section class="activity-layout">
        <div class="activity-hero"><div><h3>一起可以做的事情</h3><p>内置 99 个轻松、有趣或带一点冒险的活动。加入空间库后，大家可以点赞投票，再和地点、空闲日期组合。</p></div><button class="primary-btn" id="add-custom-activity">＋ 自定义活动</button></div>
        <div class="activity-stats"><span><strong>${records.length}</strong> 已加入空间库</span><span><strong>${records.filter((item) => item.liked).length}</strong> 我点赞的</span><span><strong>${records.reduce((sum, item) => sum + (item.likeCount || 0), 0)}</strong> 总投票</span></div>
        <div class="activity-toolbar"><input class="field" id="activity-search" placeholder="搜索做饭、爬山、野炊、拍照……"/><div class="activity-categories">${categories.map((category, index) => `<button data-activity-category="${escapeAttr(category)}" class="${index === 0 ? "active" : ""}">${escapeHtml(category)}</button>`).join("")}</div></div>
        <div class="activity-grid" id="activity-grid">${renderActivityGrid(records)}</div>
      </section>`;
  }

  function renderActivityGrid(records, query = "", category = "全部") {
    const byTitle = new Map(records.map((record) => [record.title, record]));
    const items = ACTIVITY_LIBRARY.filter((item) => (!query || `${item.title}${item.category}${item.tag}`.includes(query)) && (category === "全部" || item.category === category));
    const custom = records.filter((record) => !ACTIVITY_LIBRARY.some((item) => item.title === record.title) && (!query || `${record.title}${record.notes || ""}`.includes(query)) && (category === "全部" || record.category === category));
    const cards = [
      ...items.map((item) => ({ title: item.title, category: item.category, tag: item.tag, record: byTitle.get(item.title) || null })),
      ...custom.map((record) => ({ title: record.title, category: record.category || "自定义", tag: record.tag || "空间自定义", record })),
    ];
    if (!cards.length) return `<div class="planner-empty"><strong>没有匹配的活动</strong><p>换一个关键词，或添加自定义活动。</p></div>`;
    return cards.map((item) => `
      <article class="activity-card ${item.record ? "in-space" : ""}">
        <div class="activity-card-head"><span>${activityEmoji(item.category)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.tag)}</small></div></div>
        <div class="activity-card-actions">
          ${item.record ? `<button class="like-btn ${item.record.liked ? "active" : ""}" data-like-activity="${escapeAttr(item.record.id)}">♥ ${item.record.likeCount || 0}</button><button class="secondary-btn" data-use-activity="${escapeAttr(item.record.id)}">拿去规划</button>` : `<button class="ghost-btn" data-add-activity="${escapeAttr(item.title)}" data-category="${escapeAttr(item.category)}">加入空间库</button>`}
        </div>
      </article>`).join("");
  }

  function bindActivitiesTab() {
    const search = document.querySelector("#activity-search");
    let category = "全部";
    const rerender = () => {
      const grid = document.querySelector("#activity-grid");
      if (grid) grid.innerHTML = renderActivityGrid(activityRecords(), search?.value.trim() || "", category);
      bindActivityCardActions();
    };
    search?.addEventListener("input", rerender);
    document.querySelectorAll("[data-activity-category]").forEach((button) => button.addEventListener("click", () => {
      category = button.getAttribute("data-activity-category") || "全部";
      document.querySelectorAll("[data-activity-category]").forEach((item) => item.classList.toggle("active", item === button));
      rerender();
    }));
    document.querySelector("#add-custom-activity")?.addEventListener("click", () => void addCustomActivity());
    bindActivityCardActions();
  }

  function bindActivityCardActions() {
    document.querySelectorAll("[data-add-activity]").forEach((button) => button.addEventListener("click", () => void addActivityToSpace(button.getAttribute("data-add-activity"), button.getAttribute("data-category"))));
    document.querySelectorAll("[data-like-activity]").forEach((button) => button.addEventListener("click", () => void toggleActivityLike(button.getAttribute("data-like-activity"))));
    document.querySelectorAll("[data-use-activity]").forEach((button) => button.addEventListener("click", () => {
      ui.activeTab = "random";
      ui.plannerResult = { presetActivityId: button.getAttribute("data-use-activity") };
      renderPlannerOverlay();
    }));
  }

  async function addActivityToSpace(title, category, tag = "") {
    if (!title) return;
    if (activityRecords().some((record) => record.title === title)) return showToast("已经在空间活动库中");
    try {
      await requestJsonNative(`${API}/spaces/${getActiveSpaceId()}/activities`, {
        method: "POST",
        body: { title, category: category || "其他", tag, notes: "" },
      });
      await loadActivities(getActiveSpaceId(), true);
      showToast("已加入空间活动库");
      renderPlannerOverlay();
    } catch (error) { showToast(error.message, true); }
  }

  async function addCustomActivity() {
    const name = prompt("输入想一起做的事情：");
    if (!name?.trim()) return;
    const category = prompt("输入分类（例如：户外、美食、居家）：", "自定义") || "自定义";
    await addActivityToSpace(name.trim(), category.trim());
  }

  async function toggleActivityLike(id) {
    try {
      await requestJsonNative(`${API}/activities/${id}/like`, { method: "POST", body: {} });
      await loadActivities(getActiveSpaceId(), true);
      renderPlannerOverlay();
    } catch (error) { showToast(error.message, true); }
  }

  function renderRandomTab() {
    const members = getMembers();
    const spaces = cache.spaces;
    const today = new Date();
    const start = localDate(today);
    const endDate = new Date(today); endDate.setDate(endDate.getDate() + 30);
    const end = localDate(endDate);
    const activeSpaceId = getActiveSpaceId();
    const admin = isActiveSpaceAdmin();
    const presetPlaceId = ui.plannerResult?.presetPlaceId || "";
    const presetActivityId = ui.plannerResult?.presetActivityId || "";
    return `
      <section class="random-layout">
        <div class="random-config">
          <div class="planner-section-head"><div><h3>生成一次共同计划</h3><p>先计算共同空闲，再结合地点、活动投票和过往偏好。配置 AI 时由 AI 优化选择，未配置时使用规则权重规划。</p></div><span class="algorithm-badge">${getActiveSpace()?.hasAI ? "AI + 规则" : "规则规划"}</span></div>
          <div class="random-form-grid">
            <fieldset><legend>参与成员</legend><div class="planner-member-grid">${members.map((member) => `<label style="--member:${member.color}"><input type="checkbox" data-plan-member="${escapeAttr(member.id)}" ${member.isMe || admin ? "checked" : ""} ${!admin && !member.isMe ? "disabled" : ""}/><i></i><span>${escapeHtml(member.displayName)}</span></label>`).join("")}</div>${!admin ? `<small>普通成员只能直接给自己创建；邀请其他成员仍需对方确认。</small>` : ""}</fieldset>
            <fieldset><legend>日期范围</legend><div class="two-fields"><label>开始<input class="field" type="date" id="plan-start-date" value="${start}"/></label><label>结束<input class="field" type="date" id="plan-end-date" value="${end}"/></label></div></fieldset>
            <fieldset><legend>时间偏好</legend><div class="two-fields"><label>时段<select class="field" id="plan-period"><option value="morning">上午 09:00—12:00</option><option value="afternoon" selected>下午 13:00—18:00</option><option value="evening">晚上 18:00—23:00</option><option value="day">白天 09:00—18:00</option></select></label><label>需要时长<select class="field" id="plan-duration"><option value="60">1小时</option><option value="120" selected>2小时</option><option value="180">3小时</option><option value="240">4小时</option><option value="360">6小时</option></select></label></div></fieldset>
            <fieldset><legend>地点池</legend><select class="field" id="plan-place-pool"><option value="wishlist">优先想去地点</option><option value="all">全部地点</option><option value="visited">去过的地点</option><option value="planned">已经计划的地点</option><option value="none">不指定地点</option></select><select class="field" id="plan-place-fixed"><option value="">随机选择</option>${placeRecords().map((place) => `<option value="${escapeAttr(place.id)}" ${place.id === presetPlaceId ? "selected" : ""}>${escapeHtml(place.name)} · ${placeStatusLabel(place.status)}</option>`).join("")}</select></fieldset>
            <fieldset><legend>活动池</legend><select class="field" id="plan-activity-pool"><option value="liked">优先大家点赞的活动</option><option value="space">空间活动库</option><option value="builtin">全部 99 件事情</option><option value="none">只安排地点</option></select><select class="field" id="plan-activity-fixed"><option value="">随机选择</option>${activityRecords().map((activity) => `<option value="${escapeAttr(activity.id)}" ${activity.id === presetActivityId ? "selected" : ""}>${escapeHtml(activity.title)} · ♥${activity.likeCount || 0}</option>`).join("")}</select></fieldset>
            <fieldset class="full-fieldset"><legend>这次有什么偏好（可不填）</legend><input class="field" id="plan-preference" maxlength="240" placeholder="例如：不要太累、想在室内、预算低一点、最好有点新鲜感"/></fieldset>
            <fieldset class="full-fieldset"><legend>同步到空间</legend><div class="sync-space-grid">${spaces.map((space) => `<label class="sync-space-option"><input type="checkbox" data-plan-space="${escapeAttr(space.id)}" ${space.id === activeSpaceId ? "checked disabled" : ""}/><span>${escapeHtml(space.icon || "◫")} ${escapeHtml(space.name)}</span>${space.id === activeSpaceId ? `<small>当前空间</small>` : ""}</label>`).join("")}</div></fieldset>
          </div>
          <button class="roulette-button" id="run-random-plan">${icon("dice")}<span><strong>转一下</strong><small>找共同空闲并随机组合</small></span></button>
        </div>
        <div class="random-result" id="random-result">${renderRandomResult(ui.plannerResult && ui.plannerResult.date ? ui.plannerResult : null)}</div>
      </section>`;
  }

  function bindRandomTab() {
    bindOnce(document.querySelector("#run-random-plan"), "randomRun", () => void runRandomPlanner());
    bindOnce(document.querySelector("#confirm-random-plan"), "randomConfirm", () => void confirmRandomPlan());
    bindOnce(document.querySelector("#reroll-place"), "rerollPlace", () => rerollPart("place"));
    bindOnce(document.querySelector("#reroll-activity"), "rerollActivity", () => rerollPart("activity"));
    bindOnce(document.querySelector("#reroll-date"), "rerollDate", () => void runRandomPlanner({ keepPlace: true, keepActivity: true }));
  }

  function bindOnce(element, key, handler) {
    if (!element || element.dataset[key] === "1") return;
    element.dataset[key] = "1";
    element.addEventListener("click", handler);
  }

  function renderRandomResult(result) {
    if (!result) return `<div class="roulette-empty"><span>${icon("dice")}</span><strong>等待转出一个计划</strong><p>系统会避开所选成员已有日程，组合一个共同空闲时间、地点和活动。</p></div>`;
    return `
      <div class="result-label">${result.mode === "ai" ? "AI 推荐计划" : "规则推荐计划"}</div>
      <div class="result-date"><span>${escapeHtml(formatDateZh(result.date))}</span><strong>${escapeHtml(result.startTime)}—${escapeHtml(result.endTime)}</strong><button id="reroll-date" title="只换日期">↻</button></div>
      <div class="result-combination">
        <article><small>去哪里</small><strong>${escapeHtml(result.place?.name || "地点待定")}</strong><span>${escapeHtml(result.place?.address || (result.place ? placeStatusLabel(result.place.status) : "可稍后补充"))}</span><button id="reroll-place">换一个地点</button></article>
        <div class="plus-sign">＋</div>
        <article><small>做什么</small><strong>${escapeHtml(result.activity?.title || "自由活动")}</strong><span>${escapeHtml(result.activity ? activityCategory(result.activity) : "随意安排")}</span><button id="reroll-activity">换一件事情</button></article>
      </div>
      <div class="result-members">参与：${escapeHtml(result.memberNames.join("、"))}</div>
      <div class="result-title-preview">将创建：<strong>${escapeHtml(result.title)}</strong></div>
      ${result.reason ? `<div class="result-reason">${escapeHtml(result.reason)}</div>` : ""}
      <button class="primary-btn wide" id="confirm-random-plan">确认创建并同步到日历</button>`;
  }

  async function runRandomPlanner(options = {}) {
    const button = document.querySelector("#run-random-plan");
    if (button) { button.disabled = true; button.classList.add("rolling"); }
    try {
      const spaceId = getActiveSpaceId();
      const members = getMembers(spaceId);
      const memberIds = Array.from(document.querySelectorAll("[data-plan-member]:checked")).map((item) => item.getAttribute("data-plan-member")).filter(Boolean);
      if (!memberIds.length) throw new Error("至少选择一位成员");
      const start = document.querySelector("#plan-start-date")?.value;
      const end = document.querySelector("#plan-end-date")?.value;
      if (!start || !end || end < start) throw new Error("日期范围不正确");
      const days = dateDiff(start, end);
      if (days > 92) throw new Error("一次最多规划未来 93 天");
      const period = document.querySelector("#plan-period")?.value || "afternoon";
      const duration = Number(document.querySelector("#plan-duration")?.value || 120);
      const events = await loadEventsForRange(spaceId, start, end);
      const slots = findCommonFreeSlots(start, end, period, duration, memberIds, events);
      if (!slots.length) throw new Error("这个范围内没有找到共同空闲时段，请扩大日期范围或缩短时长");

      let placeCandidates = plannerPlaceCandidates();
      let activityCandidates = plannerActivityCandidates();
      if (options.keepPlace && ui.plannerResult?.place) placeCandidates = [ui.plannerResult.place];
      if (options.keepActivity && ui.plannerResult?.activity) activityCandidates = [ui.plannerResult.activity];
      const preference = document.querySelector("#plan-preference")?.value?.trim() || "";

      let recommended = null;
      try {
        const payload = await requestJsonNative(`${API}/spaces/${spaceId}/planner/recommend`, {
          method: "POST",
          body: {
            memberIds,
            slots: slots.slice(0, 60),
            placeIds: placeCandidates.map((place) => place.id).filter(Boolean),
            activities: activityCandidates.map((activity) => ({
              id: activity.id,
              title: activity.title,
              category: activity.category,
              tag: activity.tag || "",
              builtin: Boolean(activity.builtin),
            })),
            preference,
          },
        });
        recommended = payload.recommendation || null;
      } catch (error) {
        console.warn("planner recommendation fallback", error);
      }

      const slot = recommended?.slot || randomChoice(slots);
      const place = recommended ? recommended.place : weightedRandom(placeCandidates, (item) => 1 + (item.likeCount || 0) * 2);
      const activity = recommended ? recommended.activity : weightedRandom(activityCandidates, (item) => 1 + (item.likeCount || 0) * 2);
      const selectedSpaces = Array.from(document.querySelectorAll("[data-plan-space]:checked")).map((item) => item.getAttribute("data-plan-space")).filter(Boolean);
      if (!selectedSpaces.includes(spaceId)) selectedSpaces.unshift(spaceId);
      const memberNames = memberIds.map((id) => members.find((member) => member.id === id)?.displayName).filter(Boolean);
      const title = recommended?.title || buildPlannerTitle(place, activity);
      ui.plannerResult = {
        ...slot,
        place: place || null,
        activity: activity || null,
        title,
        reason: recommended?.reason || "已避开成员现有日程，并按空间投票权重选择地点和活动。",
        mode: recommended?.mode || "rules",
        memberIds,
        memberNames,
        spaceIds: selectedSpaces,
      };
      const resultRoot = document.querySelector("#random-result");
      if (resultRoot) {
        resultRoot.classList.add("is-spinning");
        window.setTimeout(() => {
          resultRoot.innerHTML = renderRandomResult(ui.plannerResult);
          resultRoot.classList.remove("is-spinning");
          bindRandomTab();
        }, 600);
      }
    } catch (error) {
      showToast(error.message, true);
    } finally {
      if (button) { button.disabled = false; button.classList.remove("rolling"); }
    }
  }

  function plannerPlaceCandidates() {
    const fixed = document.querySelector("#plan-place-fixed")?.value;
    if (fixed) return placeRecords().filter((place) => place.id === fixed);
    const pool = document.querySelector("#plan-place-pool")?.value || "wishlist";
    if (pool === "none") return [];
    let candidates = placeRecords();
    if (pool !== "all") candidates = candidates.filter((place) => place.status === pool);
    if (!candidates.length && pool === "wishlist") candidates = placeRecords();
    return candidates;
  }

  function plannerActivityCandidates() {
    const fixed = document.querySelector("#plan-activity-fixed")?.value;
    if (fixed) return activityRecords().filter((item) => item.id === fixed);
    const pool = document.querySelector("#plan-activity-pool")?.value || "liked";
    if (pool === "none") return [];
    const records = activityRecords();
    if (pool === "space") return records;
    if (pool === "liked") {
      const voted = records.filter((item) => (item.likeCount || 0) > 0);
      return voted.length ? voted : records;
    }
    return ACTIVITY_LIBRARY.map((item) => ({ ...item, builtin: true }));
  }

  function choosePlannerPlace() {
    return weightedRandom(plannerPlaceCandidates(), (place) => 1 + (place.likeCount || 0) * 2);
  }

  function choosePlannerActivity() {
    return weightedRandom(plannerActivityCandidates(), (activity) => 1 + (activity.likeCount || 0) * 3);
  }

  function rerollPart(part) {
    if (!ui.plannerResult?.date) return;
    if (part === "place") ui.plannerResult.place = choosePlannerPlace();
    else ui.plannerResult.activity = choosePlannerActivity();
    ui.plannerResult.title = buildPlannerTitle(ui.plannerResult.place, ui.plannerResult.activity);
    const root = document.querySelector("#random-result");
    if (root) root.innerHTML = renderRandomResult(ui.plannerResult);
    bindRandomTab();
  }

  async function confirmRandomPlan() {
    const result = ui.plannerResult;
    if (!result?.date) return;
    const button = document.querySelector("#confirm-random-plan");
    if (button) button.disabled = true;
    try {
      const spaceId = getActiveSpaceId();
      let placeId = result.place?.id && !String(result.place.id).startsWith("builtin-") ? result.place.id : null;
      const payload = {
        title: result.title,
        startDate: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        allDay: false,
        location: result.place?.name || "",
        placeId,
        placeAddress: result.place?.address || "",
        latitude: result.place?.latitude ?? null,
        longitude: result.place?.longitude ?? null,
        companions: "",
        notes: result.activity ? `随机规划活动：${result.activity.title}` : "由随机规划生成",
        assignedUserIds: result.memberIds,
        source: result.mode === "ai" ? "ai" : "rules",
        spaceIds: result.spaceIds,
      };
      await requestJsonNative(`${API}/spaces/${spaceId}/events`, { method: "POST", body: payload });
      showToast("随机计划已创建并同步到日历");
      ui.plannerResult = null;
      closePlanner();
      window.setTimeout(() => location.reload(), 450);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function findCommonFreeSlots(startDate, endDate, period, duration, memberIds, events) {
    const windows = {
      morning: [9 * 60, 12 * 60],
      afternoon: [13 * 60, 18 * 60],
      evening: [18 * 60, 23 * 60],
      day: [9 * 60, 18 * 60],
    };
    const [windowStart, windowEnd] = windows[period] || windows.afternoon;
    const results = [];
    for (const date of dateRange(startDate, endDate)) {
      const dateEvents = events.filter((event) => event.startDate === date && event.assignedUserIds.some((id) => memberIds.includes(id)));
      if (dateEvents.some((event) => event.allDay && event.assignedUserIds.some((id) => memberIds.includes(id)))) continue;
      for (let start = windowStart; start + duration <= windowEnd; start += 30) {
        const end = start + duration;
        const conflict = dateEvents.some((event) => {
          if (event.allDay || !event.startTime) return true;
          const eventStart = timeMinutes(event.startTime);
          const eventEnd = timeMinutes(event.endTime || addMinutesText(event.startTime, 60));
          return event.assignedUserIds.some((id) => memberIds.includes(id)) && start < eventEnd && end > eventStart;
        });
        if (!conflict) results.push({ date, startTime: minutesText(start), endTime: minutesText(end) });
      }
    }
    return results;
  }

  async function openMapPicker(options) {
    const L = window.L;
    if (!L) return showToast("地图组件尚未加载，请刷新页面重试", true);
    document.querySelector("#map-picker-overlay")?.remove();
    const initial = options.initialPlace || null;
    const overlay = document.createElement("div");
    overlay.id = "map-picker-overlay";
    overlay.className = "map-picker-overlay";
    overlay.innerHTML = `
      <section class="map-picker-shell">
        <header><div><strong>${escapeHtml(options.title || "地图标点")}</strong><small>点击地图任意位置放置标记</small></div><button id="map-picker-close">×</button></header>
        <div class="map-picker-search"><input class="field" id="picker-search-input" placeholder="搜索地址（可选，也可以直接点地图）"/><button class="secondary-btn" id="picker-search-btn">搜索</button></div>
        <div id="map-picker-results" class="picker-results"></div>
        <div id="map-picker-canvas" class="map-picker-canvas"></div>
        <form id="map-picker-form" class="map-picker-form">
          <label>地点名称<input class="field" id="picker-name" required maxlength="120" value="${escapeAttr(options.initialName || initial?.name || "")}" placeholder="例如：湖边草坪、常去的咖啡馆"/></label>
          <label>详细地址<input class="field" id="picker-address" maxlength="240" value="${escapeAttr(initial?.address || "")}" placeholder="可不填"/></label>
          <div class="two-fields"><label>分类<input class="field" id="picker-category" maxlength="40" value="${escapeAttr(initial?.category || "其他")}"/></label><label>状态<select class="field" id="picker-status"><option value="wishlist" ${initial?.status === "wishlist" ? "selected" : ""}>想去</option><option value="planned" ${initial?.status === "planned" || !initial?.status ? "selected" : ""}>已计划</option><option value="visited" ${initial?.status === "visited" ? "selected" : ""}>去过</option></select></label></div>
          <div class="coordinate-box"><span id="picker-coordinate">${initial && Number.isFinite(initial.latitude) ? coordinateLabel(initial.latitude, initial.longitude) : "请在地图上点击一个位置"}</span><button type="button" class="ghost-btn" id="picker-reverse">获取附近地址</button></div>
          <label class="switch-line picker-save-switch"><input type="checkbox" id="picker-save-library" ${options.fromEvent === false ? "" : "checked"}/><span><strong>同时加入当前空间地点库</strong><small>以后可直接复用、点赞和统计去过次数。</small></span></label>
          <label>备注<textarea class="field" id="picker-notes" maxlength="800">${escapeHtml(initial?.notes || "")}</textarea></label>
          <footer>${options.allowDelete ? `<button type="button" class="danger-btn" id="picker-delete">删除地点</button>` : `<span></span>`}<div><button type="button" class="ghost-btn" id="picker-cancel">取消</button><button type="submit" class="primary-btn">确认标点</button></div></footer>
        </form>
      </section>`;
    document.body.appendChild(overlay);
    let selected = initial && Number.isFinite(initial.latitude) && Number.isFinite(initial.longitude)
      ? { latitude: Number(initial.latitude), longitude: Number(initial.longitude) }
      : null;
    const center = selected ? [selected.latitude, selected.longitude] : firstMapCenter();
    ui.pickerMap = L.map(overlay.querySelector("#map-picker-canvas")).setView(center, selected ? 15 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(ui.pickerMap);
    if (selected) ui.pickerMarker = L.marker([selected.latitude, selected.longitude]).addTo(ui.pickerMap);
    ui.pickerMap.on("click", (event) => {
      selected = { latitude: event.latlng.lat, longitude: event.latlng.lng };
      if (ui.pickerMarker) ui.pickerMarker.setLatLng(event.latlng);
      else ui.pickerMarker = L.marker(event.latlng).addTo(ui.pickerMap);
      overlay.querySelector("#picker-coordinate").textContent = coordinateLabel(selected.latitude, selected.longitude);
    });
    window.setTimeout(() => ui.pickerMap?.invalidateSize(), 80);

    const close = () => { ui.pickerMap?.remove(); ui.pickerMap = null; ui.pickerMarker = null; overlay.remove(); };
    overlay.querySelector("#map-picker-close")?.addEventListener("click", close);
    overlay.querySelector("#picker-cancel")?.addEventListener("click", close);
    overlay.querySelector("#picker-search-btn")?.addEventListener("click", () => void pickerSearch(overlay, (item) => {
      selected = { latitude: Number(item.lat), longitude: Number(item.lon) };
      ui.pickerMap.setView([selected.latitude, selected.longitude], 16);
      if (ui.pickerMarker) ui.pickerMarker.setLatLng([selected.latitude, selected.longitude]);
      else ui.pickerMarker = L.marker([selected.latitude, selected.longitude]).addTo(ui.pickerMap);
      overlay.querySelector("#picker-name").value ||= item.display_name.split(",")[0];
      overlay.querySelector("#picker-address").value = item.display_name;
      overlay.querySelector("#picker-coordinate").textContent = coordinateLabel(selected.latitude, selected.longitude);
    }));
    overlay.querySelector("#picker-search-input")?.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); overlay.querySelector("#picker-search-btn")?.click(); } });
    overlay.querySelector("#picker-reverse")?.addEventListener("click", async () => {
      if (!selected) return showToast("请先在地图上点击位置", true);
      try {
        const address = await nominatimReverse(selected.latitude, selected.longitude);
        overlay.querySelector("#picker-address").value = address;
        if (!overlay.querySelector("#picker-name").value.trim()) overlay.querySelector("#picker-name").value = address.split(",")[0] || "地图标记点";
      } catch (error) { showToast(error.message, true); }
    });
    overlay.querySelector("#picker-delete")?.addEventListener("click", async () => { await options.onDelete?.(); close(); });
    overlay.querySelector("#map-picker-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!selected) return showToast("请先在地图上点击一个位置", true);
      const name = overlay.querySelector("#picker-name").value.trim();
      if (!name) return showToast("请输入地点名称", true);
      const value = {
        name,
        address: overlay.querySelector("#picker-address").value.trim(),
        latitude: Math.round(selected.latitude * 1e6) / 1e6,
        longitude: Math.round(selected.longitude * 1e6) / 1e6,
        category: overlay.querySelector("#picker-category").value.trim() || "其他",
        status: overlay.querySelector("#picker-status").value,
        notes: overlay.querySelector("#picker-notes").value.trim(),
        saveToLibrary: overlay.querySelector("#picker-save-library").checked,
      };
      close();
      await options.onConfirm?.(value);
    });
  }

  async function pickerSearch(overlay, onChoose) {
    const input = overlay.querySelector("#picker-search-input");
    const root = overlay.querySelector("#map-picker-results");
    const query = input.value.trim();
    if (!query) return;
    root.innerHTML = `<div class="search-loading">正在搜索…</div>`;
    try {
      const results = await nominatimSearch(query);
      root.innerHTML = results.slice(0, 5).map((item, index) => `<button type="button" data-picker-result="${index}"><strong>${escapeHtml(item.display_name.split(",")[0])}</strong><small>${escapeHtml(item.display_name)}</small></button>`).join("") || `<div class="search-loading">没有结果，请直接点击地图。</div>`;
      root.querySelectorAll("[data-picker-result]").forEach((button) => button.addEventListener("click", () => {
        onChoose(results[Number(button.getAttribute("data-picker-result"))]);
        root.innerHTML = "";
      }));
    } catch (error) { root.innerHTML = `<div class="search-loading">${escapeHtml(error.message)}</div>`; }
  }

  let lastNominatimAt = 0;
  async function nominatimSearch(query) {
    await nominatimWait();
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=zh-CN&q=${encodeURIComponent(query)}`;
    const response = await nativeFetch(url, { headers: { Accept: "application/json" } });
    lastNominatimAt = Date.now();
    if (!response.ok) throw new Error("地点搜索服务暂时不可用");
    return await response.json();
  }

  async function nominatimReverse(lat, lon) {
    await nominatimWait();
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=zh-CN&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const response = await nativeFetch(url, { headers: { Accept: "application/json" } });
    lastNominatimAt = Date.now();
    if (!response.ok) throw new Error("暂时无法获取附近地址");
    const payload = await response.json();
    return payload.display_name || "";
  }

  async function nominatimWait() {
    const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  function firstMapCenter() {
    const place = placeRecords().find((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    return place ? [place.latitude, place.longitude] : DEFAULT_CENTER;
  }

  function buildPlannerTitle(place, activity) {
    const activityName = activity?.title || "自由活动";
    if (place && activity) return `${place.name} · ${activityName}`;
    if (place) return `去${place.name}`;
    return activityName;
  }

  function activityCategory(activity) {
    return String(activity.category || "活动");
  }

  function weightedRandom(items, weightFn) {
    if (!items?.length) return null;
    const weights = items.map((item) => Math.max(0.01, Number(weightFn(item)) || 1));
    let random = Math.random() * weights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < items.length; index += 1) {
      random -= weights[index];
      if (random <= 0) return items[index];
    }
    return items[items.length - 1];
  }

  function randomChoice(items) {
    return items?.length ? items[Math.floor(Math.random() * items.length)] : null;
  }

  function dateRange(start, end) {
    const result = [];
    const current = parseLocalDate(start);
    const last = parseLocalDate(end);
    while (current <= last) {
      result.push(localDate(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  function dateDiff(start, end) {
    return Math.round((parseLocalDate(end).getTime() - parseLocalDate(start).getTime()) / 86400000);
  }

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseLocalDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDateZh(value) {
    const date = parseLocalDate(value);
    const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${week}`;
  }

  function timeMinutes(value) {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  }

  function minutesText(value) {
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function addMinutesText(value, minutes) {
    return minutesText(Math.min(1439, timeMinutes(value) + minutes));
  }

  function placeStatusLabel(status) {
    return status === "visited" ? "去过" : status === "planned" ? "已计划" : "想去";
  }

  function placeStatusIcon(status) {
    return status === "visited" ? "✓" : status === "planned" ? "▣" : "★";
  }

  function activityEmoji(category) {
    const map = { 户外: "⛰", 美食: "🍲", 居家: "⌂", 文娱: "🎬", 游戏: "🎲", 运动: "⚽", 文化: "⌘", 摄影: "◉", 手作: "✂", 旅行: "✈", 放松: "☕", 学习: "✎", 聚会: "♬", 探索: "⌖", 自然: "❀" };
    return map[category] || "✦";
  }

  function coordinateLabel(lat, lon) {
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}` : "";
  }

  function cssEscape(value) {
    return window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function showToast(message, isError = false) {
    const root = document.querySelector("#toast-root") || document.body;
    const toast = document.createElement("div");
    toast.className = `toast planner-toast ${isError ? "error" : ""}`;
    toast.textContent = message;
    root.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }

  function icon(name) {
    const paths = {
      map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
      pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
      compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
      sparkles: '<path d="m12 3-1.2 3.1L8 7.4l2.8 1.3L12 12l1.2-3.3L16 7.4l-2.8-1.3L12 3Z"/><path d="m5 13-.8 2.1L2 16l2.2.9L5 19l.8-2.1L8 16l-2.2-.9L5 13Z"/>',
      dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
    };
    return `<svg class="planner-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
  }

  console.info(`[共享空间日历] 地图与随机规划增强层 v${VERSION} 已加载`);
})();
