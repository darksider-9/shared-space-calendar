(() => {
  "use strict";

  const VERSION = "3.4.0";
  const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
  const MAX_AVATAR_DATA_URL = 220_000;
  const state = {
    me: null,
    profile: null,
    spaces: [],
    membersBySpace: new Map(),
    pendingAvatar: undefined,
    modal: null,
    applying: false,
    memberLoadTimer: null,
  };

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("#user-menu-btn") : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void openProfileCenter();
  }, true);

  const observer = new MutationObserver(() => scheduleApply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", () => {
    scheduleApply();
    void refreshSessionData(false);
  });

  function scheduleApply() {
    if (state.applying) return;
    state.applying = true;
    requestAnimationFrame(() => {
      state.applying = false;
      applyProfileToPage();
      scheduleMemberRefresh();
    });
  }

  function scheduleMemberRefresh() {
    if (state.memberLoadTimer !== null) window.clearTimeout(state.memberLoadTimer);
    state.memberLoadTimer = window.setTimeout(() => {
      state.memberLoadTimer = null;
      const spaceId = getActiveSpaceId();
      if (spaceId && document.querySelector(".member-manage-card, .platform-user-list")) {
        void loadMembers(spaceId).then(applyProfileToPage).catch(() => undefined);
      }
    }, 180);
  }

  async function refreshSessionData(force = false) {
    if (state.me && !force) return state.me;
    try {
      const [meData, bootstrapData] = await Promise.all([
        requestJson("/api/me"),
        requestJson("/api/bootstrap"),
      ]);
      state.me = meData.user || null;
      state.profile = meData.profile || null;
      state.spaces = Array.isArray(bootstrapData.spaces) ? bootstrapData.spaces : [];
      applyProfileToPage();
      return state.me;
    } catch (error) {
      if (error && error.status === 401) return null;
      throw error;
    }
  }

  async function loadMembers(spaceId, force = false) {
    if (!force && state.membersBySpace.has(spaceId)) return state.membersBySpace.get(spaceId);
    const result = await requestJson(`/api/spaces/${encodeURIComponent(spaceId)}/members`);
    const members = Array.isArray(result.members) ? result.members : [];
    state.membersBySpace.set(spaceId, members);
    return members;
  }

  function applyProfileToPage() {
    const button = document.querySelector("#user-menu-btn");
    if (button) {
      button.setAttribute("title", "打开个人中心");
      button.setAttribute("aria-label", "打开个人中心");
      button.classList.add("profile-ready");

      const avatar = button.querySelector(".user-avatar");
      if (avatar && state.me) renderAvatarElement(avatar, state.me.avatarDataUrl, state.me.displayName);

      const copy = button.querySelector(".user-copy");
      if (copy && state.me) {
        const strong = copy.querySelector("strong");
        const small = copy.querySelector("small");
        if (strong) strong.textContent = state.me.displayName;
        if (small) small.textContent = "个人中心与账号设置";
      }

      button.querySelectorAll(":scope > svg").forEach((item) => item.remove());
      if (!button.querySelector(".profile-chevron")) {
        const chevron = document.createElement("span");
        chevron.className = "profile-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "⌄";
        button.appendChild(chevron);
      }
    }

    const activeSpaceId = getActiveSpaceId();
    const members = activeSpaceId ? state.membersBySpace.get(activeSpaceId) || [] : [];
    const memberMap = new Map(members.map((member) => [member.id, member]));

    document.querySelectorAll(".member-manage-card").forEach((card) => {
      const idElement = card.querySelector("[data-color-user], [data-role-user], [data-remove-member]");
      const userId = idElement?.dataset.colorUser || idElement?.dataset.roleUser || idElement?.dataset.removeMember;
      if (!userId) return;
      const member = memberMap.get(userId);
      const avatar = card.querySelector(".member-avatar");
      if (member && avatar) renderAvatarElement(avatar, member.avatarDataUrl, member.displayName);
    });

    document.querySelectorAll(".platform-user-list article").forEach((card) => {
      const idElement = card.querySelector("[data-toggle-user], [data-reset-password]");
      const userId = idElement?.dataset.toggleUser || idElement?.dataset.resetPassword;
      if (!userId) return;
      const member = [...state.membersBySpace.values()].flat().find((item) => item.id === userId);
      const avatar = card.querySelector(".member-avatar");
      if (member && avatar) renderAvatarElement(avatar, member.avatarDataUrl, member.displayName);
    });
  }

  function renderAvatarElement(container, dataUrl, displayName) {
    container.classList.toggle("has-profile-image", Boolean(dataUrl));
    if (dataUrl) {
      let image = container.querySelector("img.profile-avatar-image");
      if (!image) {
        container.textContent = "";
        image = document.createElement("img");
        image.className = "profile-avatar-image";
        image.alt = `${displayName || "用户"}的头像`;
        container.appendChild(image);
      }
      image.src = dataUrl;
      image.alt = `${displayName || "用户"}的头像`;
    } else {
      container.querySelectorAll("img.profile-avatar-image").forEach((image) => image.remove());
      container.textContent = initials(displayName || "我");
    }
  }

  async function openProfileCenter() {
    closeProfileCenter();
    const shell = document.createElement("div");
    shell.className = "profile-modal-backdrop";
    shell.innerHTML = `
      <section class="profile-modal" role="dialog" aria-modal="true" aria-label="个人中心">
        <header class="profile-modal-header">
          <div>
            <span class="profile-eyebrow">PERSONAL ACCOUNT</span>
            <h2>个人中心</h2>
          </div>
          <button class="profile-icon-button" type="button" data-profile-close aria-label="关闭">×</button>
        </header>
        <div class="profile-loading">
          <div class="profile-loading-ring"></div>
          <span>正在读取账号信息…</span>
        </div>
      </section>`;
    document.body.appendChild(shell);
    state.modal = shell;
    shell.addEventListener("click", (event) => {
      if (event.target === shell || event.target.closest("[data-profile-close]")) closeProfileCenter();
    });

    try {
      await refreshSessionData(true);
      if (!state.modal || state.modal !== shell || !state.me) return;
      renderProfileModal(shell);
    } catch (error) {
      const modal = shell.querySelector(".profile-modal");
      if (modal) modal.innerHTML = `<div class="profile-fatal">${escapeHtml(errorMessage(error))}<button class="profile-primary" data-profile-close>关闭</button></div>`;
    }
  }

  function closeProfileCenter() {
    if (state.modal) state.modal.remove();
    state.modal = null;
    state.pendingAvatar = undefined;
  }

  function renderProfileModal(shell) {
    const me = state.me;
    const profile = state.profile || {};
    const activeSpaceId = getActiveSpaceId();
    const defaultSpaceId = localStorage.getItem("activeSpaceId") || activeSpaceId || "";
    const roleText = me.isPlatformAdmin ? "平台管理员" : "普通账号";
    const createdAt = profile.createdAt ? formatDate(profile.createdAt) : "—";
    const avatarValue = state.pendingAvatar === undefined ? me.avatarDataUrl || "" : state.pendingAvatar || "";
    const modal = shell.querySelector(".profile-modal");
    if (!modal) return;

    modal.innerHTML = `
      <header class="profile-modal-header">
        <div>
          <span class="profile-eyebrow">PERSONAL ACCOUNT</span>
          <h2>个人中心</h2>
        </div>
        <button class="profile-icon-button" type="button" data-profile-close aria-label="关闭">×</button>
      </header>
      <div class="profile-modal-scroll">
        <section class="profile-hero">
          <div class="profile-avatar-editor">
            <div class="profile-avatar-preview" id="profile-avatar-preview"></div>
            <label class="profile-avatar-upload">
              <input id="profile-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" />
              <span>上传头像</span>
            </label>
            <button type="button" class="profile-text-button" id="profile-remove-avatar" ${avatarValue ? "" : "disabled"}>移除</button>
          </div>
          <div class="profile-identity">
            <span class="profile-role-badge">${roleText}</span>
            <h3>${escapeHtml(me.displayName)}</h3>
            <p>@${escapeHtml(me.username)}</p>
            <small>头像会在个人入口和空间成员管理中显示；昵称会同步到你加入的所有空间。</small>
          </div>
        </section>

        <form id="profile-basic-form" class="profile-section">
          <div class="profile-section-heading">
            <div><h3>基本资料</h3><p>用户名不可修改，昵称和头像为全局账号资料。</p></div>
          </div>
          <div class="profile-form-grid">
            <label class="profile-field full"><span>昵称</span><input name="displayName" maxlength="30" required value="${escapeAttr(me.displayName)}" /></label>
            <label class="profile-field"><span>用户名</span><input value="${escapeAttr(me.username)}" disabled /></label>
            <label class="profile-field"><span>默认进入空间</span>
              <select name="defaultSpaceId">
                ${state.spaces.length ? state.spaces.map((space) => `<option value="${escapeAttr(space.id)}" ${space.id === defaultSpaceId ? "selected" : ""}>${escapeHtml(space.icon || "✦")} ${escapeHtml(space.name)}</option>`).join("") : `<option value="">暂无空间</option>`}
              </select>
            </label>
          </div>
          <div class="profile-actions-row"><button class="profile-primary" type="submit">保存个人资料</button></div>
        </form>

        <section class="profile-stat-grid">
          <article><span>加入空间</span><strong>${Number(profile.spaceCount || state.spaces.length || 0)}</strong><small>昵称会同步更新</small></article>
          <article><span>账号类型</span><strong>${roleText}</strong><small>${me.isPlatformAdmin ? "可管理平台账号" : "按空间角色使用"}</small></article>
          <article><span>注册时间</span><strong>${createdAt}</strong><small>账号创建日期</small></article>
        </section>

        <form id="profile-password-form" class="profile-section">
          <div class="profile-section-heading">
            <div><h3>修改密码</h3><p>修改后，其他设备上的登录会失效，当前页面保持登录。</p></div>
          </div>
          <div class="profile-form-grid password-grid">
            <label class="profile-field full"><span>当前密码</span><input type="password" name="currentPassword" autocomplete="current-password" placeholder="输入当前密码" /></label>
            <label class="profile-field"><span>新密码</span><input type="password" name="newPassword" minlength="6" autocomplete="new-password" placeholder="至少 6 位" /></label>
            <label class="profile-field"><span>确认新密码</span><input type="password" name="confirmPassword" minlength="6" autocomplete="new-password" placeholder="再次输入" /></label>
          </div>
          <div class="profile-actions-row"><button class="profile-secondary" type="submit">更新密码</button></div>
        </form>

        <section class="profile-account-actions">
          <div><h3>登录与账号</h3><p>切换账号会返回登录页，并清除当前空间选择；退出登录会保留当前空间，便于下次继续。</p></div>
          <div class="profile-account-buttons">
            <button class="profile-secondary" type="button" id="profile-switch-account">切换账号</button>
            <button class="profile-danger" type="button" id="profile-logout">退出登录</button>
          </div>
        </section>
      </div>`;

    const preview = modal.querySelector("#profile-avatar-preview");
    if (preview) renderAvatarElement(preview, avatarValue, me.displayName);

    modal.querySelector("#profile-avatar-file")?.addEventListener("change", (event) => void handleAvatarFile(event));
    modal.querySelector("#profile-remove-avatar")?.addEventListener("click", () => {
      state.pendingAvatar = "";
      renderProfileModal(shell);
    });
    modal.querySelector("#profile-basic-form")?.addEventListener("submit", (event) => void saveBasicProfile(event));
    modal.querySelector("#profile-password-form")?.addEventListener("submit", (event) => void savePassword(event));
    modal.querySelector("#profile-switch-account")?.addEventListener("click", () => void logoutAccount(true));
    modal.querySelector("#profile-logout")?.addEventListener("click", () => void logoutAccount(false));
  }

  async function handleAvatarFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showProfileToast("仅支持 PNG、JPEG 或 WebP 图片", true);
      input.value = "";
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      showProfileToast("原图不能超过 8MB", true);
      input.value = "";
      return;
    }
    setModalBusy(true, "正在压缩头像…");
    try {
      state.pendingAvatar = await compressAvatar(file);
      if (state.modal) renderProfileModal(state.modal);
      showProfileToast("头像已准备好，点击“保存个人资料”后生效");
    } catch (error) {
      showProfileToast(errorMessage(error), true);
    } finally {
      setModalBusy(false);
    }
  }

  async function compressAvatar(file) {
    const image = await loadImage(file);
    let size = 320;
    let quality = 0.84;
    let result = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("当前浏览器无法处理头像");
      context.fillStyle = "#eef1f6";
      context.fillRect(0, 0, size, size);
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const edge = Math.min(sourceWidth, sourceHeight);
      const sx = (sourceWidth - edge) / 2;
      const sy = (sourceHeight - edge) / 2;
      context.drawImage(image, sx, sy, edge, edge, 0, 0, size, size);
      result = canvas.toDataURL("image/webp", quality);
      if (!result.startsWith("data:image/webp")) result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= MAX_AVATAR_DATA_URL) return result;
      size = Math.max(180, Math.round(size * 0.82));
      quality = Math.max(0.58, quality - 0.08);
    }
    if (result.length > MAX_AVATAR_DATA_URL) throw new Error("图片压缩后仍然过大，请换一张更简单的图片");
    return result;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("无法读取这张图片"));
      };
      image.src = url;
    });
  }

  async function saveBasicProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const displayName = String(data.get("displayName") || "").trim();
    if (!displayName) {
      showProfileToast("昵称不能为空", true);
      return;
    }
    setFormBusy(form, true);
    try {
      const body = { displayName };
      if (state.pendingAvatar !== undefined) body.avatarDataUrl = state.pendingAvatar;
      const result = await requestJson("/api/me", { method: "PATCH", body });
      state.me = result.user;
      state.profile = result.profile;
      state.pendingAvatar = undefined;
      const defaultSpaceId = String(data.get("defaultSpaceId") || "");
      if (defaultSpaceId) localStorage.setItem("activeSpaceId", defaultSpaceId);
      state.membersBySpace.clear();
      showProfileToast("个人资料已保存，正在刷新页面");
      window.setTimeout(() => location.reload(), 500);
    } catch (error) {
      showProfileToast(errorMessage(error), true);
      setFormBusy(form, false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") || "");
    const newPassword = String(data.get("newPassword") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    if (!currentPassword || !newPassword) {
      showProfileToast("请完整填写当前密码和新密码", true);
      return;
    }
    if (newPassword.length < 6) {
      showProfileToast("新密码至少 6 位", true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showProfileToast("两次输入的新密码不一致", true);
      return;
    }
    setFormBusy(form, true);
    try {
      const result = await requestJson("/api/me", {
        method: "PATCH",
        body: { currentPassword, newPassword },
      });
      state.me = result.user;
      state.profile = result.profile;
      form.reset();
      showProfileToast("密码已更新，其他设备需要重新登录");
    } catch (error) {
      showProfileToast(errorMessage(error), true);
    } finally {
      setFormBusy(form, false);
    }
  }

  async function logoutAccount(switching) {
    if (!switching && !confirm("确认退出当前账号吗？")) return;
    setModalBusy(true, switching ? "正在切换账号…" : "正在退出…");
    try {
      await requestJson("/api/logout", { method: "POST" });
    } catch {
      // 即使网络返回异常，也清理本地界面并重新进入登录页。
    } finally {
      if (switching) localStorage.removeItem("activeSpaceId");
      sessionStorage.setItem("profileLogoutReason", switching ? "switch" : "logout");
      location.reload();
    }
  }

  function setModalBusy(busy, label = "正在保存…") {
    const modal = state.modal?.querySelector(".profile-modal");
    if (!modal) return;
    modal.classList.toggle("is-busy", busy);
    let mask = modal.querySelector(".profile-busy-mask");
    if (busy && !mask) {
      mask = document.createElement("div");
      mask.className = "profile-busy-mask";
      modal.appendChild(mask);
    }
    if (mask) {
      mask.innerHTML = `<div class="profile-loading-ring"></div><span>${escapeHtml(label)}</span>`;
      mask.hidden = !busy;
    }
  }

  function setFormBusy(form, busy) {
    form.classList.toggle("is-busy", busy);
    form.querySelectorAll("input,select,button").forEach((element) => { element.disabled = busy; });
  }

  function showProfileToast(message, error = false) {
    const root = document.querySelector("#toast-root");
    if (!root) return;
    const item = document.createElement("div");
    item.className = `toast ${error ? "error" : ""}`;
    item.textContent = message;
    root.appendChild(item);
    window.setTimeout(() => item.remove(), 3400);
  }

  function getActiveSpaceId() {
    return document.querySelector("#space-select")?.value || localStorage.getItem("activeSpaceId") || "";
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: options.body === undefined ? undefined : { "content-type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    if (!response.ok) {
      const error = new Error(payload?.error || `请求失败（${response.status}）`);
      error.status = response.status;
      throw error;
    }
    return payload || {};
  }

  function initials(name) {
    return [...String(name || "").trim()].slice(-2).join("") || "我";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function errorMessage(error) {
    return error instanceof Error ? error.message : "操作失败";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  window.SharedCalendarProfile = {
    version: VERSION,
    open: openProfileCenter,
    refresh: () => refreshSessionData(true),
  };
})();
