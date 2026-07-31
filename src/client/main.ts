type SpaceRole = "owner" | "admin" | "member";
type ViewMode = "month" | "day";
type ModalName =
  | "event"
  | "smart"
  | "dayDetail"
  | "createSpace"
  | "joinSpace"
  | "notifications"
  | "spaceManage"
  | "platformAdmin"
  | null;

type User = {
  id: string;
  username: string;
  displayName: string;
  isPlatformAdmin: boolean;
};

type Space = {
  id: string;
  name: string;
  description: string;
  icon: string;
  role: SpaceRole;
  color: string;
  memberCount: number;
  allowMemberInvites: boolean;
  inviteCode?: string;
  hasAI: boolean;
  createdAt: string;
};

type Member = {
  id: string;
  username: string;
  displayName: string;
  role: SpaceRole;
  color: string;
  joinedAt: string;
  isMe: boolean;
};

type CalendarEvent = {
  id: string;
  spaceId: string;
  title: string;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string;
  companions: string;
  notes: string;
  createdBy: string;
  assignedUserIds: string[];
  source: "manual" | "rules" | "ai";
  createdAt: string;
  updatedAt: string;
};

type Invitation = {
  id: string;
  spaceId: string;
  spaceName: string;
  inviterName: string;
  createdAt: string;
};

type ManageInvitation = {
  id: string;
  inviteeName: string;
  inviteeUsername: string;
  inviterName: string;
  status: string;
  createdAt: string;
};

type JoinRequest = {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  status: string;
  createdAt: string;
};

type AISettings = {
  enabled: boolean;
  endpoint: string;
  model: string;
  hasKey: boolean;
  canManage: boolean;
};

type EventDraft = {
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string;
  companions: string;
  notes: string;
  assignedUserIds: string[];
  source: "rules" | "ai";
  explanation: string;
};

type PlatformUser = {
  id: string;
  username: string;
  displayName: string;
  isPlatformAdmin: boolean;
  disabled: boolean;
  createdAt: string;
  spaces: number;
};

type State = {
  loading: boolean;
  needsSetup: boolean;
  authMode: "login" | "register";
  me: User | null;
  spaces: Space[];
  activeSpaceId: string | null;
  activeSpace: Space | null;
  members: Member[];
  events: CalendarEvent[];
  invitations: Invitation[];
  manageInvitations: ManageInvitation[];
  joinRequests: JoinRequest[];
  ai: AISettings | null;
  platformUsers: PlatformUser[];
  viewYear: number;
  viewMonth: number;
  selectedDate: string;
  viewMode: ViewMode;
  visibleMemberIds: Set<string>;
  modal: ModalName;
  manageTab: "members" | "invite" | "settings" | "ai";
  editingEvent: CalendarEvent | null;
  draft: EventDraft | null;
  error: string | null;
  revision: number;
};

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("Missing #app");
const app = appRoot;

const today = new Date();
const state: State = {
  loading: true,
  needsSetup: false,
  authMode: "login",
  me: null,
  spaces: [],
  activeSpaceId: null,
  activeSpace: null,
  members: [],
  events: [],
  invitations: [],
  manageInvitations: [],
  joinRequests: [],
  ai: null,
  platformUsers: [],
  viewYear: today.getFullYear(),
  viewMonth: today.getMonth() + 1,
  selectedDate: localDateString(today),
  viewMode: "month",
  visibleMemberIds: new Set<string>(),
  modal: null,
  manageTab: "members",
  editingEvent: null,
  draft: null,
  error: null,
  revision: 0,
};

let pollTimer: number | null = null;
void bootstrap();

window.addEventListener("focus", () => {
  if (state.me && state.activeSpaceId && !state.modal) void refreshQuietly();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.me && state.activeSpaceId && !state.modal) void refreshQuietly();
});

async function bootstrap(): Promise<void> {
  registerServiceWorker();
  renderLoading();
  try {
    const setup = await api<{ needsSetup: boolean }>("/api/setup/status", { authOptional: true });
    state.needsSetup = setup.needsSetup;
    if (!state.needsSetup) {
      try {
        const me = await api<{ user: User }>("/api/me");
        state.me = me.user;
        await loadBootstrap();
      } catch (error) {
        if (!isUnauthorized(error)) throw error;
      }
    }
  } catch (error) {
    state.error = errorMessage(error);
  } finally {
    state.loading = false;
    render();
  }
}

async function loadBootstrap(preferredSpaceId?: string): Promise<void> {
  const data = await api<{ user: User; spaces: Space[]; invitations: Invitation[] }>("/api/bootstrap");
  state.me = data.user;
  state.spaces = data.spaces;
  state.invitations = data.invitations;
  const saved = preferredSpaceId ?? localStorage.getItem("activeSpaceId");
  const target = data.spaces.find((space) => space.id === saved)?.id ?? data.spaces[0]?.id ?? null;
  state.activeSpaceId = target;
  if (target) {
    localStorage.setItem("activeSpaceId", target);
    await loadSpace(target);
  } else {
    state.activeSpace = null;
    state.members = [];
    state.events = [];
  }
  startPolling();
}

async function loadSpace(spaceId: string): Promise<void> {
  const data = await api<{ space: Space; members: Member[]; ai: AISettings }>(`/api/spaces/${spaceId}`);
  state.activeSpace = data.space;
  state.members = data.members;
  state.ai = data.ai;
  if (state.visibleMemberIds.size === 0 || [...state.visibleMemberIds].every((id) => !data.members.some((member) => member.id === id))) {
    state.visibleMemberIds = new Set(data.members.map((member) => member.id));
  } else {
    state.visibleMemberIds = new Set([...state.visibleMemberIds].filter((id) => data.members.some((member) => member.id === id)));
  }
  await loadEvents();
}

async function loadEvents(): Promise<void> {
  if (!state.activeSpaceId) return;
  const range = currentLoadRange();
  const data = await api<{ events: CalendarEvent[]; revision: number }>(
    `/api/spaces/${state.activeSpaceId}/events?start=${range.start}&end=${range.end}`,
  );
  state.events = data.events;
  state.revision = data.revision;
}

async function refreshQuietly(): Promise<void> {
  try {
    const beforeRevision = state.revision;
    await loadEvents();
    if (beforeRevision !== state.revision) {
      const bootstrapData = await api<{ user: User; spaces: Space[]; invitations: Invitation[] }>("/api/bootstrap");
      state.spaces = bootstrapData.spaces;
      state.invitations = bootstrapData.invitations;
      state.activeSpace = state.spaces.find((space) => space.id === state.activeSpaceId) ?? state.activeSpace;
      render();
    }
  } catch {
    // 静默刷新失败不打断当前操作。
  }
}

function startPolling(): void {
  if (pollTimer !== null) window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => {
    if (!document.hidden && state.me && state.activeSpaceId && !state.modal) void refreshQuietly();
  }, 15_000);
}

function render(): void {
  if (state.loading) {
    renderLoading();
    return;
  }
  if (state.needsSetup) {
    renderSetup();
    return;
  }
  if (!state.me) {
    renderAuth();
    return;
  }
  renderApp();
}

function renderLoading(): void {
  app.innerHTML = `
    <main class="center-page">
      <section class="auth-card loading-card">
        <div class="brand-mark">日</div>
        <h1>共享空间日历</h1>
        <p>正在加载你的空间与日程…</p>
        <div class="loading-bar"><i></i></div>
      </section>
    </main>`;
}

function renderSetup(): void {
  app.innerHTML = `
    <main class="center-page">
      <section class="auth-card setup-card">
        <div class="brand-row">
          <div class="brand-mark">日</div>
          <div><h1>创建平台管理员</h1><p>这是首次部署，只需要创建你的管理员账号。</p></div>
        </div>
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        <form id="setup-form" class="stack-form">
          <label>用户名<input class="field" name="username" autocomplete="username" placeholder="例如 liuchang" required pattern="[a-z0-9_]{3,24}" /></label>
          <label>显示名称<input class="field" name="displayName" placeholder="例如 刘畅" required maxlength="30" /></label>
          <label>密码<input class="field" type="password" name="password" autocomplete="new-password" placeholder="至少 6 位" required minlength="6" /></label>
          <button class="primary-btn wide" type="submit">创建管理员并进入</button>
        </form>
        <div class="soft-note">系统会同时创建你的第一个共享空间。之后其他人自行注册，再由空间管理员邀请加入。</div>
      </section>
    </main>`;
  document.querySelector<HTMLFormElement>("#setup-form")?.addEventListener("submit", (event) => void submitSetup(event));
}

async function submitSetup(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  setFormBusy(form, true);
  try {
    await api("/api/setup", {
      method: "POST",
      body: {
        username: formData.get("username"),
        displayName: formData.get("displayName"),
        password: formData.get("password"),
      },
      authOptional: true,
    });
    state.needsSetup = false;
    state.error = null;
    state.authMode = "login";
    toast("管理员创建成功，请登录");
    render();
  } catch (error) {
    state.error = errorMessage(error);
    renderSetup();
  } finally {
    setFormBusy(form, false);
  }
}

function renderAuth(): void {
  const register = state.authMode === "register";
  app.innerHTML = `
    <main class="center-page auth-page">
      <section class="auth-card">
        <div class="brand-row">
          <div class="brand-mark">日</div>
          <div><h1>共享空间日历</h1><p>一个账号，可以加入多个私人日历空间。</p></div>
        </div>
        <div class="auth-tabs">
          <button class="${!register ? "active" : ""}" data-auth-mode="login">登录</button>
          <button class="${register ? "active" : ""}" data-auth-mode="register">注册账号</button>
        </div>
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        <form id="auth-form" class="stack-form">
          <label>用户名<input class="field" name="username" autocomplete="username" required placeholder="小写字母、数字或下划线" /></label>
          ${register ? `<label>显示名称<input class="field" name="displayName" required maxlength="30" placeholder="在空间里显示的名字" /></label>` : ""}
          <label>密码<input class="field" type="password" name="password" autocomplete="${register ? "new-password" : "current-password"}" required minlength="6" /></label>
          <button class="primary-btn wide" type="submit">${register ? "创建账号" : "登录"}</button>
        </form>
        <div class="soft-note">注册账号后不会自动看到别人的日历，需要接受邀请或使用空间邀请码申请加入。</div>
      </section>
    </main>`;
  document.querySelectorAll<HTMLElement>("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode === "register" ? "register" : "login";
      state.error = null;
      renderAuth();
    });
  });
  document.querySelector<HTMLFormElement>("#auth-form")?.addEventListener("submit", (event) => void submitAuth(event));
}

async function submitAuth(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  setFormBusy(form, true);
  try {
    if (state.authMode === "register") {
      await api("/api/register", {
        method: "POST",
        body: {
          username: formData.get("username"),
          displayName: formData.get("displayName"),
          password: formData.get("password"),
        },
        authOptional: true,
      });
      state.authMode = "login";
      state.error = null;
      toast("注册成功，请登录");
      renderAuth();
      return;
    }
    const result = await api<{ user: User }>("/api/login", {
      method: "POST",
      body: { username: formData.get("username"), password: formData.get("password") },
      authOptional: true,
    });
    state.me = result.user;
    state.error = null;
    await loadBootstrap();
    render();
  } catch (error) {
    state.error = errorMessage(error);
    renderAuth();
  } finally {
    setFormBusy(form, false);
  }
}

function renderApp(): void {
  const space = state.activeSpace;
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      ${state.spaces.length === 0 ? renderNoSpace() : space ? renderWorkspace() : renderNoSpace()}
    </div>
    ${renderModal()}`;
  attachAppHandlers();
}

function renderTopbar(): string {
  const activeId = state.activeSpaceId ?? "";
  return `
    <header class="topbar panel-glass">
      <div class="brand-compact"><div class="brand-mark small">日</div><div><strong>共享日历</strong><small>Space Calendar</small></div></div>
      <div class="space-switcher">
        <select id="space-select" class="field compact" aria-label="选择空间">
          ${state.spaces.map((space) => `<option value="${space.id}" ${space.id === activeId ? "selected" : ""}>${escapeHtml(space.icon)} ${escapeHtml(space.name)}</option>`).join("")}
        </select>
        <button class="icon-btn" id="create-space-btn" title="创建空间">＋</button>
        <button class="icon-btn" id="join-space-btn" title="申请加入空间">⌁</button>
      </div>
      <nav class="view-tabs">
        <button class="${state.viewMode === "month" ? "active" : ""}" data-view="month">月历</button>
        <button class="${state.viewMode === "day" ? "active" : ""}" data-view="day">日视图</button>
      </nav>
      <div class="top-actions">
        <button class="secondary-btn" id="smart-add-btn" ${state.activeSpaceId ? "" : "disabled"}>✦ 智能添加</button>
        <button class="icon-btn notification-btn" id="notifications-btn" title="空间邀请">◎${state.invitations.length ? `<b>${state.invitations.length}</b>` : ""}</button>
        ${state.me?.isPlatformAdmin ? `<button class="icon-btn" id="platform-admin-btn" title="平台管理">盾</button>` : ""}
        <button class="user-button" id="user-menu-btn"><span>${escapeHtml(initials(state.me?.displayName ?? "我"))}</span><i>${escapeHtml(state.me?.displayName ?? "")}</i></button>
      </div>
    </header>`;
}

function renderNoSpace(): string {
  return `
    <main class="empty-workspace panel-glass">
      <div class="empty-illustration">◫</div>
      <h2>还没有加入任何空间</h2>
      <p>创建自己的空间，或者使用别人发给你的邀请码申请加入。</p>
      <div class="inline-actions">
        <button class="primary-btn" id="empty-create-space">创建空间</button>
        <button class="secondary-btn" id="empty-join-space">输入邀请码</button>
      </div>
    </main>`;
}

function renderWorkspace(): string {
  return `
    <main class="workspace">
      ${renderCalendarToolbar()}
      ${state.viewMode === "month" ? renderMonthView() : renderDayView()}
    </main>`;
}

function renderCalendarToolbar(): string {
  const monthLabel = `${state.viewYear}年${state.viewMonth}月`;
  const dayLabel = formatFullDate(state.selectedDate);
  return `
    <section class="calendar-toolbar panel-glass">
      <div class="date-nav">
        <button class="icon-btn" id="prev-period">‹</button>
        <button class="date-title" id="date-title-btn">${state.viewMode === "month" ? monthLabel : dayLabel}<small>${escapeHtml(state.activeSpace?.name ?? "")}</small></button>
        <button class="icon-btn" id="next-period">›</button>
        <button class="ghost-btn" id="today-btn">今天</button>
      </div>
      <div class="member-filters">
        ${state.members.map((member) => {
          const active = state.visibleMemberIds.has(member.id);
          return `<button class="member-filter ${active ? "active" : ""}" data-member-filter="${member.id}" style="--member:${member.color}"><i></i>${escapeHtml(member.displayName)}</button>`;
        }).join("")}
      </div>
      <div class="toolbar-actions">
        <button class="secondary-btn" id="new-event-btn">＋ 新建日程</button>
        <button class="icon-btn" id="space-manage-btn" title="空间设置">⚙</button>
      </div>
    </section>`;
}

function renderMonthView(): string {
  const days = monthGridDays(state.viewYear, state.viewMonth);
  return `
    <section class="month-panel panel-glass">
      <div class="weekday-row">${["一", "二", "三", "四", "五", "六", "日"].map((day) => `<div>${day}</div>`).join("")}</div>
      <div class="month-grid">
        ${days.map((date) => renderDayCell(date)).join("")}
      </div>
    </section>`;
}

function renderDayCell(date: Date): string {
  const dateString = localDateString(date);
  const inMonth = date.getMonth() + 1 === state.viewMonth;
  const isToday = dateString === localDateString(new Date());
  const isSelected = dateString === state.selectedDate;
  const dayEvents = filteredEventsForDate(dateString);
  const memberSummaries = summarizeByMember(dayEvents);
  const displayed = memberSummaries.length > 3
    ? memberSummaries.slice(0, 2)
    : memberSummaries.slice(0, 3);
  const remaining = Math.max(0, memberSummaries.length - displayed.length);
  const subtleGradient = memberSummaries.length
    ? `linear-gradient(135deg, ${hexToRgba(memberSummaries[0].member.color, 0.06)}, rgba(232,235,241,.72) 54%)`
    : "none";
  return `
    <button class="day-cell ${inMonth ? "" : "outside"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}" data-day="${dateString}" style="--day-tint:${subtleGradient}">
      <div class="day-head"><span class="day-number">${date.getDate()}</span>${dayEvents.length ? `<small>${dayEvents.length}项</small>` : ""}</div>
      <div class="day-strips">
        ${displayed.map(({ member, events }) => `
          <div class="day-strip" style="--member:${member.color};--member-bg:${hexToRgba(member.color, 0.17)}">
            <i></i><strong>${escapeHtml(member.displayName)}</strong><span>${escapeHtml(eventSummary(events))}</span>
          </div>`).join("")}
        ${remaining ? `<div class="more-strip">还有 ${remaining} 位成员有安排</div>` : ""}
      </div>
    </button>`;
}

function renderDayView(): string {
  const visibleMembers = state.members.filter((member) => state.visibleMemberIds.has(member.id));
  const dayEvents = filteredEventsForDate(state.selectedDate);
  const allDayEvents = dayEvents.filter((event) => event.allDay);
  const timedEvents = dayEvents.filter((event) => !event.allDay && event.startTime);
  const hours = Array.from({ length: 19 }, (_, index) => index + 6);
  return `
    <section class="day-panel panel-glass">
      <div class="day-summary-head">
        <div><h2>${formatFullDate(state.selectedDate)}</h2><p>${visibleMembers.length} 位成员 · ${dayEvents.length} 项安排</p></div>
        <button class="primary-btn" id="day-add-event">＋ 添加当天日程</button>
      </div>
      ${allDayEvents.length ? `
        <div class="all-day-area">
          <div class="timeline-member-label"><strong>全天</strong><small>All day</small></div>
          <div class="all-day-cards">${allDayEvents.map((event) => renderCompactEvent(event)).join("")}</div>
        </div>` : ""}
      <div class="timeline-scroll">
        <div class="timeline" style="--timeline-hours:18">
          <div class="timeline-header">
            <div class="timeline-member-label"><strong>成员</strong><small>06:00—24:00</small></div>
            <div class="time-axis">${hours.map((hour) => `<span style="left:${((hour - 6) / 18) * 100}%">${String(hour).padStart(2, "0")}:00</span>`).join("")}</div>
          </div>
          ${visibleMembers.map((member) => renderMemberTimeline(member, timedEvents.filter((event) => event.assignedUserIds.includes(member.id)))).join("")}
        </div>
      </div>
      ${visibleMembers.length === 0 ? `<div class="empty-state">至少选择一位成员才能查看时间轴。</div>` : ""}
    </section>`;
}

function renderMemberTimeline(member: Member, events: CalendarEvent[]): string {
  return `
    <div class="timeline-row">
      <div class="timeline-member-label"><i style="background:${member.color}"></i><strong>${escapeHtml(member.displayName)}</strong><small>${roleLabel(member.role)}</small></div>
      <div class="timeline-track">
        ${Array.from({ length: 19 }, (_, index) => `<i class="gridline" style="left:${(index / 18) * 100}%"></i>`).join("")}
        ${events.map((event, index) => renderTimelineEvent(event, member, index)).join("")}
      </div>
    </div>`;
}

function renderTimelineEvent(event: CalendarEvent, member: Member, stackIndex: number): string {
  const start = Math.max(6 * 60, timeToMinutes(event.startTime ?? "06:00"));
  const end = Math.min(24 * 60, timeToMinutes(event.endTime ?? addMinutes(event.startTime ?? "06:00", 60)));
  const left = ((start - 6 * 60) / (18 * 60)) * 100;
  const width = Math.max(2.4, ((Math.max(end, start + 30) - start) / (18 * 60)) * 100);
  const top = 10 + (stackIndex % 2) * 31;
  return `<button class="timeline-event" data-event-id="${event.id}" style="left:${left}%;width:${width}%;top:${top}px;--member:${member.color};--member-bg:${hexToRgba(member.color, 0.24)}" title="${escapeHtml(event.title)}"><strong>${escapeHtml(event.title)}</strong><small>${event.startTime}–${event.endTime ?? ""}</small></button>`;
}

function renderCompactEvent(event: CalendarEvent): string {
  const colors = event.assignedUserIds.map((id) => state.members.find((member) => member.id === id)?.color).filter(Boolean) as string[];
  const color = colors[0] ?? "#697386";
  return `<button class="compact-event" data-event-id="${event.id}" style="--member:${color};--member-bg:${hexToRgba(color, .16)}"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(memberNames(event.assignedUserIds))}</span></button>`;
}

function renderModal(): string {
  if (!state.modal) return "";
  if (state.modal === "event") return renderEventModal();
  if (state.modal === "smart") return renderSmartModal();
  if (state.modal === "dayDetail") return renderDayDetailModal();
  if (state.modal === "createSpace") return renderCreateSpaceModal();
  if (state.modal === "joinSpace") return renderJoinSpaceModal();
  if (state.modal === "notifications") return renderNotificationsModal();
  if (state.modal === "spaceManage") return renderSpaceManageModal();
  if (state.modal === "platformAdmin") return renderPlatformAdminModal();
  return "";
}

function modalShell(title: string, body: string, className = ""): string {
  return `<div class="modal-backdrop" data-close-modal><section class="modal ${className}" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><header class="modal-header"><h2>${escapeHtml(title)}</h2><button class="icon-btn" id="close-modal">×</button></header>${body}</section></div>`;
}

function renderEventModal(): string {
  const event = state.editingEvent;
  const admin = isSpaceAdmin();
  const date = event?.startDate ?? state.selectedDate;
  const assigned = new Set(event?.assignedUserIds ?? [state.me?.id ?? ""]);
  const canDelete = event ? canManageEvent(event) : false;
  const editable = !event || canManageEvent(event);
  const disabled = editable ? "" : "disabled";
  return modalShell(event ? "编辑日程" : "新建日程", `
    <form id="event-form" class="modal-body">
      <div class="form-grid">
        <label class="form-group full">事项名称<input class="field" name="title" required maxlength="100" value="${escapeAttr(event?.title ?? "")}" placeholder="例如：和同学去看电影" ${disabled} /></label>
        <label class="form-group">日期<input class="field" type="date" name="startDate" required value="${date}" ${disabled} /></label>
        <label class="form-group check-group"><input type="checkbox" name="allDay" ${event?.allDay ?? true ? "checked" : ""} ${disabled} /><span>全天事项</span></label>
        <label class="form-group time-field">开始时间<input class="field" type="time" name="startTime" value="${event?.startTime ?? "09:00"}" ${disabled} /></label>
        <label class="form-group time-field">结束时间<input class="field" type="time" name="endTime" value="${event?.endTime ?? "10:00"}" ${disabled} /></label>
        <label class="form-group full">地点<input class="field" name="location" maxlength="120" value="${escapeAttr(event?.location ?? "")}" placeholder="可不填" ${disabled} /></label>
        <label class="form-group full">外部同行人<input class="field" name="companions" maxlength="160" value="${escapeAttr(event?.companions ?? "")}" placeholder="例如：高中同学小李（不需要平台账号）" ${disabled} /></label>
        <label class="form-group full">备注<textarea class="field" name="notes" maxlength="1200" ${disabled}>${escapeHtml(event?.notes ?? "")}</textarea></label>
        <div class="form-group full"><span class="field-label">日程归属成员</span>
          ${admin ? `<div class="member-select-grid">${state.members.map((member) => `<label class="member-option" style="--member:${member.color}"><input type="checkbox" name="assignedUserIds" value="${member.id}" ${assigned.has(member.id) ? "checked" : ""} ${editable ? "" : "disabled"} /><i></i><span>${escapeHtml(member.displayName)}</span></label>`).join("")}</div>` : `<div class="permission-box"><i style="background:${currentMember()?.color ?? "#697386"}"></i>普通成员只能直接给自己创建和管理日程。</div>`}
        </div>
      </div>
      <footer class="modal-actions">
        <div>${canDelete ? `<button type="button" class="danger-btn" id="delete-event-btn">删除</button>` : ""}</div>
        <div class="inline-actions"><button type="button" class="ghost-btn" id="cancel-modal">${editable ? "取消" : "关闭"}</button>${editable ? `<button type="submit" class="primary-btn">${event ? "保存修改" : "创建日程"}</button>` : ""}</div>
      </footer>
    </form>`);
}

function renderSmartModal(): string {
  const draft = state.draft;
  const examples = isSpaceAdmin()
    ? "例如：8月18号下午2点到4点，给小王和小李安排项目讨论，地点会议室A"
    : "例如：18号晚上7点和小李看电影；下周三下午3点去健身";
  return modalShell("智能添加日程", `
    <div class="modal-body smart-body">
      <div class="smart-intro"><span>✦</span><div><strong>${state.ai?.enabled ? "规则识别 + 空间 AI" : "轻量规则识别"}</strong><p>${isSpaceAdmin() ? "你是空间管理员，可以为多个成员分配日程。" : "你是普通成员，系统只会给你本人创建日程。"}</p></div></div>
      <form id="smart-form" class="smart-input-row">
        <textarea class="field" name="text" required maxlength="500" placeholder="${escapeAttr(examples)}"></textarea>
        <button class="primary-btn" type="submit">识别</button>
      </form>
      <div class="rule-hints">支持任意有效“几号”、几月几号、今天/明天/后天、周几、下周几、下下周几，以及上午/下午/晚上具体时间。</div>
      ${draft ? renderDraftPreview(draft) : `<div class="smart-empty"><i>⌁</i><p>输入一句自然语言，系统先生成预览，确认后才会写入日历。</p></div>`}
    </div>`);
}

function renderDraftPreview(draft: EventDraft): string {
  return `<section class="draft-card">
    <div class="draft-source"><span>${draft.source === "ai" ? "AI" : "规则"}</span>${escapeHtml(draft.explanation)}</div>
    <div class="draft-title">${escapeHtml(draft.title)}</div>
    <dl>
      <dt>日期</dt><dd>${formatFullDate(draft.date)}</dd>
      <dt>时间</dt><dd>${draft.allDay ? "全天" : `${draft.startTime ?? ""}–${draft.endTime ?? ""}`}</dd>
      <dt>成员</dt><dd>${escapeHtml(memberNames(draft.assignedUserIds))}</dd>
      <dt>地点</dt><dd>${escapeHtml(draft.location || "未填写")}</dd>
      <dt>外部同行人</dt><dd>${escapeHtml(draft.companions || "未填写")}</dd>
    </dl>
    <div class="inline-actions end"><button class="ghost-btn" id="clear-draft">重新输入</button><button class="primary-btn" id="confirm-draft">确认加入日历</button></div>
  </section>`;
}

function renderDayDetailModal(): string {
  const dayEvents = filteredEventsForDate(state.selectedDate);
  return modalShell(formatFullDate(state.selectedDate), `
    <div class="modal-body day-detail-body">
      <div class="day-detail-toolbar"><span>${dayEvents.length} 项安排</span><div class="inline-actions"><button class="secondary-btn" id="open-full-day">打开日视图</button><button class="primary-btn" id="detail-add-event">＋ 添加</button></div></div>
      ${state.members.filter((member) => state.visibleMemberIds.has(member.id)).map((member) => {
        const events = dayEvents.filter((event) => event.assignedUserIds.includes(member.id));
        return `<section class="member-day-section"><header><i style="background:${member.color}"></i><strong>${escapeHtml(member.displayName)}</strong><span>${events.length}项</span></header>${events.length ? events.map((event) => renderDayEventCard(event, member)).join("") : `<div class="member-free">当天暂无安排</div>`}</section>`;
      }).join("")}
    </div>`, "wide-modal");
}

function renderDayEventCard(event: CalendarEvent, member: Member): string {
  return `<button class="day-event-card" data-event-id="${event.id}" style="--member:${member.color};--member-bg:${hexToRgba(member.color, .13)}"><span class="event-time">${event.allDay ? "全天" : `${event.startTime ?? ""}${event.endTime ? `–${event.endTime}` : ""}`}</span><span><strong>${escapeHtml(event.title)}</strong><small>${[event.location, event.companions].filter(Boolean).map(escapeHtml).join(" · ") || "点击查看详情"}</small></span></button>`;
}

function renderCreateSpaceModal(): string {
  return modalShell("创建共享空间", `
    <form id="create-space-form" class="modal-body stack-form">
      <label>空间名称<input class="field" name="name" required maxlength="40" placeholder="例如：我们三个同学" /></label>
      <label>图标<input class="field" name="icon" maxlength="4" value="✦" placeholder="一个 Emoji 或符号" /></label>
      <label>空间简介<textarea class="field" name="description" maxlength="160" placeholder="这个空间用来做什么"></textarea></label>
      <div class="soft-note">创建后你会成为空间所有者，可以邀请成员、设置管理员和配置 AI。</div>
      <div class="modal-actions end"><button type="button" class="ghost-btn" id="cancel-modal">取消</button><button class="primary-btn" type="submit">创建空间</button></div>
    </form>`);
}

function renderJoinSpaceModal(): string {
  return modalShell("申请加入空间", `
    <form id="join-space-form" class="modal-body stack-form">
      <label>空间邀请码<input class="field code-input" name="inviteCode" required maxlength="24" placeholder="例如 ABCD2345" /></label>
      <div class="soft-note">提交后需要空间管理员同意。加入后才能看到该空间成员和日程。</div>
      <div class="modal-actions end"><button type="button" class="ghost-btn" id="cancel-modal">取消</button><button class="primary-btn" type="submit">提交申请</button></div>
    </form>`);
}

function renderNotificationsModal(): string {
  return modalShell("空间邀请", `
    <div class="modal-body">
      ${state.invitations.length ? `<div class="notification-list">${state.invitations.map((item) => `<article class="notification-card"><div class="space-icon">◫</div><div><strong>${escapeHtml(item.inviterName)} 邀请你加入</strong><h3>${escapeHtml(item.spaceName)}</h3><small>${formatDateTime(item.createdAt)}</small></div><div class="notification-actions"><button class="ghost-btn" data-invite-decline="${item.id}">拒绝</button><button class="primary-btn" data-invite-accept="${item.id}">接受</button></div></article>`).join("")}</div>` : `<div class="empty-state large">暂时没有待处理的空间邀请。</div>`}
    </div>`);
}

function renderSpaceManageModal(): string {
  const tab = state.manageTab;
  return modalShell("空间管理", `
    <div class="manage-layout">
      <aside class="manage-tabs">
        <button class="${tab === "members" ? "active" : ""}" data-manage-tab="members">成员与颜色</button>
        <button class="${tab === "invite" ? "active" : ""}" data-manage-tab="invite">邀请与申请</button>
        <button class="${tab === "settings" ? "active" : ""}" data-manage-tab="settings">空间设置</button>
        <button class="${tab === "ai" ? "active" : ""}" data-manage-tab="ai">AI 设置</button>
      </aside>
      <div class="manage-content">${renderManageContent()}</div>
    </div>`, "wide-modal manage-modal");
}

function renderManageContent(): string {
  if (state.manageTab === "members") return renderMembersManage();
  if (state.manageTab === "invite") return renderInviteManage();
  if (state.manageTab === "settings") return renderSettingsManage();
  return renderAIManage();
}

function renderMembersManage(): string {
  const owner = currentMember()?.role === "owner";
  return `<div class="manage-section"><div class="section-heading"><div><h3>成员与颜色</h3><p>颜色仅在当前空间生效，系统会阻止过于相近的颜色。</p></div><span>${state.members.length} 人</span></div>
    <div class="member-manage-list">${state.members.map((member) => `<article class="member-manage-card"><div class="member-avatar" style="background:${member.color}">${escapeHtml(initials(member.displayName))}</div><div class="member-info"><strong>${escapeHtml(member.displayName)}${member.isMe ? "（我）" : ""}</strong><small>@${escapeHtml(member.username)} · ${roleLabel(member.role)}</small></div><label class="color-control"><input type="color" value="${member.color}" data-color-user="${member.id}" ${member.isMe || isSpaceAdmin() ? "" : "disabled"} /><span>${member.color}</span></label>${owner && member.role !== "owner" ? `<select class="field role-select" data-role-user="${member.id}"><option value="member" ${member.role === "member" ? "selected" : ""}>普通成员</option><option value="admin" ${member.role === "admin" ? "selected" : ""}>空间管理员</option></select>` : ""}${member.role !== "owner" && (member.isMe || isSpaceAdmin()) ? `<button class="danger-icon" data-remove-member="${member.id}" title="${member.isMe ? "退出空间" : "移除成员"}">×</button>` : ""}</article>`).join("")}</div>
  </div>`;
}

function renderInviteManage(): string {
  const canInvite = isSpaceAdmin() || Boolean(state.activeSpace?.allowMemberInvites);
  return `<div class="manage-section"><div class="section-heading"><div><h3>邀请与加入申请</h3><p>可以直接邀请已有账号，也可以把邀请码发给别人。</p></div></div>
    ${canInvite ? `<form id="invite-user-form" class="inline-form"><input class="field" name="username" required placeholder="输入对方用户名，例如 xiaowang" /><button class="primary-btn">发送邀请</button></form>` : `<div class="soft-note">当前空间仅管理员可以邀请成员。</div>`}
    ${isSpaceAdmin() ? `<div class="invite-code-card"><div><small>空间邀请码</small><strong>${escapeHtml(state.activeSpace?.inviteCode ?? "加载中")}</strong></div><button class="secondary-btn" id="copy-invite-code">复制</button><button class="ghost-btn" id="regenerate-code">重新生成</button></div>` : ""}
    ${isSpaceAdmin() ? `<h4 class="subheading">待处理申请</h4><div class="request-list">${state.joinRequests.filter((item) => item.status === "pending").length ? state.joinRequests.filter((item) => item.status === "pending").map((item) => `<article><div><strong>${escapeHtml(item.displayName)}</strong><small>@${escapeHtml(item.username)} · ${formatDateTime(item.createdAt)}</small></div><div class="inline-actions"><button class="ghost-btn" data-request-decline="${item.id}">拒绝</button><button class="primary-btn" data-request-approve="${item.id}">同意</button></div></article>`).join("") : `<div class="empty-state">暂无待处理申请</div>`}</div>` : ""}
    ${isSpaceAdmin() ? `<h4 class="subheading">邀请记录</h4><div class="history-list">${state.manageInvitations.slice(0, 20).map((item) => `<div><span>${escapeHtml(item.inviteeName)} <small>@${escapeHtml(item.inviteeUsername)}</small></span><b class="status-${item.status}">${statusLabel(item.status)}</b></div>`).join("") || `<div class="empty-state">暂无邀请记录</div>`}</div>` : ""}
  </div>`;
}

function renderSettingsManage(): string {
  const canManage = isSpaceAdmin();
  return `<form id="space-settings-form" class="manage-section stack-form"><div class="section-heading"><div><h3>空间设置</h3><p>空间名称、图标和成员邀请权限。</p></div></div>
    <label>空间名称<input class="field" name="name" maxlength="40" required value="${escapeAttr(state.activeSpace?.name ?? "")}" ${canManage ? "" : "disabled"} /></label>
    <label>图标<input class="field" name="icon" maxlength="4" value="${escapeAttr(state.activeSpace?.icon ?? "✦")}" ${canManage ? "" : "disabled"} /></label>
    <label>简介<textarea class="field" name="description" maxlength="160" ${canManage ? "" : "disabled"}>${escapeHtml(state.activeSpace?.description ?? "")}</textarea></label>
    <label class="switch-line"><input type="checkbox" name="allowMemberInvites" ${state.activeSpace?.allowMemberInvites ? "checked" : ""} ${canManage ? "" : "disabled"} /><span><strong>允许普通成员邀请账号</strong><small>被邀请者仍需主动接受。</small></span></label>
    ${canManage ? `<div class="inline-actions end"><button class="primary-btn" type="submit">保存设置</button></div>` : `<div class="soft-note">只有空间管理员可以修改这些设置。</div>`}
    ${currentMember()?.role === "owner" ? `<div class="danger-zone"><div><strong>解散空间</strong><p>会删除该空间的成员关系和全部日程，无法恢复。</p></div><button type="button" class="danger-btn" id="delete-space-btn">解散空间</button></div>` : ""}
  </form>`;
}

function renderAIManage(): string {
  if (!state.ai?.canManage) return `<div class="manage-section"><div class="section-heading"><div><h3>AI 设置</h3><p>AI 配置只对当前空间生效。</p></div></div><div class="permission-empty">只有空间所有者或管理员可以查看和修改 AI 配置。普通成员仍可使用管理员启用的智能添加功能。</div></div>`;
  return `<form id="ai-settings-form" class="manage-section stack-form"><div class="section-heading"><div><h3>空间 AI</h3><p>规则识别始终免费可用；规则无法理解时才调用你配置的 OpenAI 兼容接口。</p></div><span class="ai-state ${state.ai.enabled ? "on" : ""}">${state.ai.enabled ? "已启用" : "未启用"}</span></div>
    <label class="switch-line"><input type="checkbox" name="enabled" ${state.ai.enabled ? "checked" : ""} /><span><strong>启用空间 AI</strong><small>普通成员也能使用，但仍受权限限制。</small></span></label>
    <label>API URL<input class="field" name="endpoint" value="${escapeAttr(state.ai.endpoint)}" placeholder="https://api.example.com/v1" /></label>
    <label>Model Name<input class="field" name="model" value="${escapeAttr(state.ai.model)}" placeholder="例如 deepseek-chat" /></label>
    <label>API Key<input class="field" type="password" name="apiKey" placeholder="${state.ai.hasKey ? "已保存，留空表示不修改" : "请输入 API Key"}" /></label>
    <div class="soft-note">API Key 只保存在服务器端 JSON 中，普通成员和浏览器接口不会读取明文。这个项目没有额外加密密钥，因此请只用于你自己控制的私人空间。</div>
    <div class="inline-actions end"><button class="primary-btn" type="submit">保存 AI 设置</button></div>
  </form>`;
}

function renderPlatformAdminModal(): string {
  return modalShell("平台账号管理", `
    <div class="modal-body platform-admin-body">
      <div class="section-heading"><div><h3>全部账号</h3><p>平台管理员可以停用账号或重置密码，但不能直接查看用户密码。</p></div><span>${state.platformUsers.length} 个账号</span></div>
      <div class="platform-user-list">${state.platformUsers.map((account) => `<article><div class="member-avatar neutral">${escapeHtml(initials(account.displayName))}</div><div class="member-info"><strong>${escapeHtml(account.displayName)}${account.isPlatformAdmin ? " · 平台管理员" : ""}</strong><small>@${escapeHtml(account.username)} · ${account.spaces} 个空间 · ${account.disabled ? "已停用" : "正常"}</small></div><button class="${account.disabled ? "secondary-btn" : "danger-btn"}" data-toggle-user="${account.id}" data-disabled="${account.disabled ? "1" : "0"}">${account.disabled ? "恢复" : "停用"}</button><button class="ghost-btn" data-reset-password="${account.id}">重置密码</button></article>`).join("")}</div>
    </div>`, "wide-modal");
}

function attachAppHandlers(): void {
  document.querySelector<HTMLSelectElement>("#space-select")?.addEventListener("change", (event) => void switchSpace((event.target as HTMLSelectElement).value));
  document.querySelector("#create-space-btn")?.addEventListener("click", () => openModal("createSpace"));
  document.querySelector("#join-space-btn")?.addEventListener("click", () => openModal("joinSpace"));
  document.querySelector("#empty-create-space")?.addEventListener("click", () => openModal("createSpace"));
  document.querySelector("#empty-join-space")?.addEventListener("click", () => openModal("joinSpace"));
  document.querySelector("#smart-add-btn")?.addEventListener("click", () => { state.draft = null; openModal("smart"); });
  document.querySelector("#notifications-btn")?.addEventListener("click", () => openModal("notifications"));
  document.querySelector("#platform-admin-btn")?.addEventListener("click", () => void openPlatformAdmin());
  document.querySelector("#user-menu-btn")?.addEventListener("click", () => void logout());
  document.querySelector("#new-event-btn")?.addEventListener("click", () => openEventModal());
  document.querySelector("#day-add-event")?.addEventListener("click", () => openEventModal());
  document.querySelector("#space-manage-btn")?.addEventListener("click", () => void openSpaceManage());
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.viewMode = button.dataset.view === "day" ? "day" : "month";
    render();
  }));
  document.querySelector("#prev-period")?.addEventListener("click", () => changePeriod(-1));
  document.querySelector("#next-period")?.addEventListener("click", () => changePeriod(1));
  document.querySelector("#today-btn")?.addEventListener("click", () => void goToday());
  document.querySelectorAll<HTMLElement>("[data-member-filter]").forEach((button) => button.addEventListener("click", () => toggleMemberFilter(button.dataset.memberFilter ?? "")));
  document.querySelectorAll<HTMLElement>("[data-day]").forEach((cell) => cell.addEventListener("click", () => {
    state.selectedDate = cell.dataset.day ?? state.selectedDate;
    openModal("dayDetail");
  }));
  document.querySelectorAll<HTMLElement>("[data-event-id]").forEach((button) => button.addEventListener("click", () => {
    const event = state.events.find((item) => item.id === button.dataset.eventId);
    if (event) openEventModal(event);
  }));
  attachModalHandlers();
}

function attachModalHandlers(): void {
  document.querySelector("#close-modal")?.addEventListener("click", closeModal);
  document.querySelector("#cancel-modal")?.addEventListener("click", closeModal);
  document.querySelector<HTMLElement>("[data-close-modal]")?.addEventListener("click", closeModal);

  document.querySelector<HTMLFormElement>("#event-form")?.addEventListener("submit", (event) => void submitEvent(event));
  document.querySelector<HTMLInputElement>('input[name="allDay"]')?.addEventListener("change", updateTimeFieldState);
  updateTimeFieldState();
  document.querySelector("#delete-event-btn")?.addEventListener("click", () => void deleteCurrentEvent());

  document.querySelector<HTMLFormElement>("#smart-form")?.addEventListener("submit", (event) => void submitSmartParse(event));
  document.querySelector("#clear-draft")?.addEventListener("click", () => { state.draft = null; render(); });
  document.querySelector("#confirm-draft")?.addEventListener("click", () => void confirmDraft());

  document.querySelector("#open-full-day")?.addEventListener("click", () => { state.viewMode = "day"; closeModal(); });
  document.querySelector("#detail-add-event")?.addEventListener("click", () => openEventModal());

  document.querySelector<HTMLFormElement>("#create-space-form")?.addEventListener("submit", (event) => void submitCreateSpace(event));
  document.querySelector<HTMLFormElement>("#join-space-form")?.addEventListener("submit", (event) => void submitJoinSpace(event));

  document.querySelectorAll<HTMLElement>("[data-invite-accept]").forEach((button) => button.addEventListener("click", () => void respondInvitation(button.dataset.inviteAccept ?? "", "accept")));
  document.querySelectorAll<HTMLElement>("[data-invite-decline]").forEach((button) => button.addEventListener("click", () => void respondInvitation(button.dataset.inviteDecline ?? "", "decline")));

  document.querySelectorAll<HTMLElement>("[data-manage-tab]").forEach((button) => button.addEventListener("click", () => void changeManageTab(button.dataset.manageTab as State["manageTab"])));
  document.querySelectorAll<HTMLInputElement>("[data-color-user]").forEach((input) => input.addEventListener("change", () => void updateMember(input.dataset.colorUser ?? "", { color: input.value })));
  document.querySelectorAll<HTMLSelectElement>("[data-role-user]").forEach((select) => select.addEventListener("change", () => void updateMember(select.dataset.roleUser ?? "", { role: select.value as SpaceRole })));
  document.querySelectorAll<HTMLElement>("[data-remove-member]").forEach((button) => button.addEventListener("click", () => void removeMember(button.dataset.removeMember ?? "")));
  document.querySelector<HTMLFormElement>("#invite-user-form")?.addEventListener("submit", (event) => void inviteUser(event));
  document.querySelector("#copy-invite-code")?.addEventListener("click", () => void copyInviteCode());
  document.querySelector("#regenerate-code")?.addEventListener("click", () => void regenerateInviteCode());
  document.querySelectorAll<HTMLElement>("[data-request-approve]").forEach((button) => button.addEventListener("click", () => void respondJoinRequest(button.dataset.requestApprove ?? "", "approve")));
  document.querySelectorAll<HTMLElement>("[data-request-decline]").forEach((button) => button.addEventListener("click", () => void respondJoinRequest(button.dataset.requestDecline ?? "", "decline")));
  document.querySelector<HTMLFormElement>("#space-settings-form")?.addEventListener("submit", (event) => void saveSpaceSettings(event));
  document.querySelector("#delete-space-btn")?.addEventListener("click", () => void deleteSpace());
  document.querySelector<HTMLFormElement>("#ai-settings-form")?.addEventListener("submit", (event) => void saveAISettings(event));

  document.querySelectorAll<HTMLElement>("[data-toggle-user]").forEach((button) => button.addEventListener("click", () => void togglePlatformUser(button.dataset.toggleUser ?? "", button.dataset.disabled !== "1")));
  document.querySelectorAll<HTMLElement>("[data-reset-password]").forEach((button) => button.addEventListener("click", () => void resetPlatformPassword(button.dataset.resetPassword ?? "")));
}

function openModal(modal: ModalName): void {
  state.modal = modal;
  render();
}

function closeModal(): void {
  state.modal = null;
  state.editingEvent = null;
  state.draft = null;
  render();
}

function openEventModal(event: CalendarEvent | null = null): void {
  state.editingEvent = event;
  state.modal = "event";
  render();
}

async function switchSpace(spaceId: string): Promise<void> {
  if (!spaceId || spaceId === state.activeSpaceId) return;
  state.activeSpaceId = spaceId;
  state.visibleMemberIds = new Set();
  localStorage.setItem("activeSpaceId", spaceId);
  await loadSpace(spaceId);
  render();
}

function changePeriod(direction: number): void {
  if (state.viewMode === "day") {
    const date = parseLocalDate(state.selectedDate);
    date.setDate(date.getDate() + direction);
    state.selectedDate = localDateString(date);
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth() + 1;
  } else {
    const date = new Date(state.viewYear, state.viewMonth - 1 + direction, 1);
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth() + 1;
    state.selectedDate = localDateString(date);
  }
  void loadEvents().then(render);
}

async function goToday(): Promise<void> {
  const date = new Date();
  state.viewYear = date.getFullYear();
  state.viewMonth = date.getMonth() + 1;
  state.selectedDate = localDateString(date);
  await loadEvents();
  render();
}

function toggleMemberFilter(memberId: string): void {
  if (state.visibleMemberIds.has(memberId)) {
    if (state.visibleMemberIds.size > 1) state.visibleMemberIds.delete(memberId);
  } else {
    state.visibleMemberIds.add(memberId);
  }
  render();
}

async function submitEvent(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.activeSpaceId) return;
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const allDay = formData.get("allDay") === "on";
  const assignedUserIds = isSpaceAdmin()
    ? formData.getAll("assignedUserIds").map(String)
    : [state.me?.id ?? ""];
  const payload = {
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    allDay,
    startTime: allDay ? null : formData.get("startTime"),
    endTime: allDay ? null : formData.get("endTime"),
    location: formData.get("location"),
    companions: formData.get("companions"),
    notes: formData.get("notes"),
    assignedUserIds,
    source: state.editingEvent?.source ?? "manual",
  };
  setFormBusy(form, true);
  try {
    if (state.editingEvent) {
      await api(`/api/events/${state.editingEvent.id}`, { method: "PATCH", body: payload });
      toast("日程已更新");
    } else {
      await api(`/api/spaces/${state.activeSpaceId}/events`, { method: "POST", body: payload });
      toast("日程已创建");
    }
    state.modal = null;
    state.editingEvent = null;
    await loadEvents();
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function deleteCurrentEvent(): Promise<void> {
  if (!state.editingEvent) return;
  if (!confirm(`确认删除“${state.editingEvent.title}”吗？`)) return;
  try {
    await api(`/api/events/${state.editingEvent.id}`, { method: "DELETE" });
    toast("日程已删除");
    state.modal = null;
    state.editingEvent = null;
    await loadEvents();
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function submitSmartParse(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.activeSpaceId) return;
  const form = event.currentTarget as HTMLFormElement;
  const text = String(new FormData(form).get("text") ?? "");
  setFormBusy(form, true);
  try {
    const result = await api<{ draft: EventDraft }>(`/api/spaces/${state.activeSpaceId}/parse`, {
      method: "POST",
      body: {
        text,
        anchorYear: state.viewYear,
        anchorMonth: state.viewMonth,
        referenceDate: localDateString(new Date()),
      },
    });
    state.draft = result.draft;
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function confirmDraft(): Promise<void> {
  if (!state.activeSpaceId || !state.draft) return;
  const draft = state.draft;
  try {
    await api(`/api/spaces/${state.activeSpaceId}/events`, {
      method: "POST",
      body: {
        title: draft.title,
        startDate: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        allDay: draft.allDay,
        location: draft.location,
        companions: draft.companions,
        notes: draft.notes,
        assignedUserIds: draft.assignedUserIds,
        source: draft.source,
      },
    });
    state.selectedDate = draft.date;
    const date = parseLocalDate(draft.date);
    state.viewYear = date.getFullYear();
    state.viewMonth = date.getMonth() + 1;
    state.modal = null;
    state.draft = null;
    await loadEvents();
    toast("已加入日历");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function submitCreateSpace(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  setFormBusy(form, true);
  try {
    const result = await api<{ space: Space }>("/api/spaces", {
      method: "POST",
      body: { name: data.get("name"), icon: data.get("icon"), description: data.get("description") },
    });
    state.modal = null;
    await loadBootstrap(result.space.id);
    toast("空间已创建");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function submitJoinSpace(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const inviteCode = new FormData(form).get("inviteCode");
  setFormBusy(form, true);
  try {
    const result = await api<{ request: { spaceName: string } }>("/api/spaces/join-requests", { method: "POST", body: { inviteCode } });
    toast(`已申请加入“${result.request.spaceName}”`);
    closeModal();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function respondInvitation(invitationId: string, decision: "accept" | "decline"): Promise<void> {
  try {
    await api(`/api/invitations/${invitationId}/respond`, { method: "POST", body: { decision } });
    await loadBootstrap();
    state.modal = state.invitations.length ? "notifications" : null;
    toast(decision === "accept" ? "已加入空间" : "已拒绝邀请");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function openSpaceManage(): Promise<void> {
  state.manageTab = "members";
  state.modal = "spaceManage";
  await loadManageData();
  render();
}

async function loadManageData(): Promise<void> {
  if (!state.activeSpaceId || !isSpaceAdmin()) return;
  try {
    const [inviteData, requestData] = await Promise.all([
      api<{ invitations: ManageInvitation[] }>(`/api/spaces/${state.activeSpaceId}/invitations`),
      api<{ requests: JoinRequest[] }>(`/api/spaces/${state.activeSpaceId}/join-requests`),
    ]);
    state.manageInvitations = inviteData.invitations;
    state.joinRequests = requestData.requests;
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function changeManageTab(tab: State["manageTab"]): Promise<void> {
  state.manageTab = tab;
  if (tab === "invite") await loadManageData();
  render();
}

async function updateMember(userId: string, body: { color?: string; role?: SpaceRole }): Promise<void> {
  if (!state.activeSpaceId) return;
  try {
    const result = await api<{ members: Member[] }>(`/api/spaces/${state.activeSpaceId}/members/${userId}`, { method: "PATCH", body });
    state.members = result.members;
    const mine = result.members.find((member) => member.id === state.me?.id);
    if (mine && state.activeSpace) state.activeSpace.color = mine.color;
    toast(body.color ? "成员颜色已更新" : "成员角色已更新");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
    render();
  }
}

async function removeMember(userId: string): Promise<void> {
  if (!state.activeSpaceId) return;
  const member = state.members.find((item) => item.id === userId);
  if (!member || !confirm(member.isMe ? "确认退出这个空间吗？" : `确认移除${member.displayName}吗？`)) return;
  try {
    await api(`/api/spaces/${state.activeSpaceId}/members/${userId}`, { method: "DELETE" });
    if (member.isMe) {
      state.modal = null;
      await loadBootstrap();
    } else {
      await loadSpace(state.activeSpaceId);
    }
    toast(member.isMe ? "已退出空间" : "成员已移除");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function inviteUser(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.activeSpaceId) return;
  const form = event.currentTarget as HTMLFormElement;
  const username = new FormData(form).get("username");
  setFormBusy(form, true);
  try {
    const result = await api<{ invitation: { inviteeName: string } }>(`/api/spaces/${state.activeSpaceId}/invitations`, { method: "POST", body: { username } });
    toast(`已邀请${result.invitation.inviteeName}`);
    form.reset();
    await loadManageData();
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function copyInviteCode(): Promise<void> {
  const code = state.activeSpace?.inviteCode;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast("邀请码已复制");
  } catch {
    prompt("请复制邀请码", code);
  }
}

async function regenerateInviteCode(): Promise<void> {
  if (!state.activeSpaceId || !confirm("重新生成后，旧邀请码将失效。确认继续吗？")) return;
  try {
    const result = await api<{ space: Space }>(`/api/spaces/${state.activeSpaceId}`, { method: "PATCH", body: { regenerateInviteCode: true } });
    state.activeSpace = result.space;
    state.spaces = state.spaces.map((space) => space.id === result.space.id ? result.space : space);
    toast("邀请码已重新生成");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function respondJoinRequest(requestId: string, decision: "approve" | "decline"): Promise<void> {
  try {
    await api(`/api/join-requests/${requestId}/respond`, { method: "POST", body: { decision } });
    await loadManageData();
    if (state.activeSpaceId) await loadSpace(state.activeSpaceId);
    toast(decision === "approve" ? "已同意加入申请" : "已拒绝加入申请");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function saveSpaceSettings(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.activeSpaceId) return;
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  setFormBusy(form, true);
  try {
    const result = await api<{ space: Space }>(`/api/spaces/${state.activeSpaceId}`, {
      method: "PATCH",
      body: {
        name: data.get("name"),
        icon: data.get("icon"),
        description: data.get("description"),
        allowMemberInvites: data.get("allowMemberInvites") === "on",
      },
    });
    state.activeSpace = result.space;
    state.spaces = state.spaces.map((space) => space.id === result.space.id ? result.space : space);
    toast("空间设置已保存");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function deleteSpace(): Promise<void> {
  if (!state.activeSpaceId || !state.activeSpace) return;
  const name = prompt(`请输入空间名称“${state.activeSpace.name}”以确认解散：`);
  if (name !== state.activeSpace.name) return;
  try {
    await api(`/api/spaces/${state.activeSpaceId}`, { method: "DELETE" });
    state.modal = null;
    await loadBootstrap();
    toast("空间已解散");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function saveAISettings(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.activeSpaceId) return;
  const form = event.currentTarget as HTMLFormElement;
  const data = new FormData(form);
  setFormBusy(form, true);
  try {
    const result = await api<{ ai: AISettings }>(`/api/spaces/${state.activeSpaceId}/ai`, {
      method: "PUT",
      body: {
        enabled: data.get("enabled") === "on",
        endpoint: data.get("endpoint"),
        model: data.get("model"),
        apiKey: data.get("apiKey"),
      },
    });
    state.ai = result.ai;
    if (state.activeSpace) state.activeSpace.hasAI = result.ai.enabled && result.ai.hasKey;
    toast("AI 设置已保存");
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  } finally {
    setFormBusy(form, false);
  }
}

async function openPlatformAdmin(): Promise<void> {
  try {
    const result = await api<{ users: PlatformUser[] }>("/api/admin/users");
    state.platformUsers = result.users;
    state.modal = "platformAdmin";
    render();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function togglePlatformUser(userId: string, disabled: boolean): Promise<void> {
  try {
    await api(`/api/admin/users/${userId}`, { method: "PATCH", body: { disabled } });
    await openPlatformAdmin();
    toast(disabled ? "账号已停用" : "账号已恢复");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function resetPlatformPassword(userId: string): Promise<void> {
  const password = prompt("输入新密码（至少 6 位）：");
  if (!password) return;
  try {
    await api(`/api/admin/users/${userId}`, { method: "PATCH", body: { password } });
    toast("密码已重置，该账号需要重新登录");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function logout(): Promise<void> {
  if (!confirm("确认退出当前账号吗？")) return;
  try {
    await api("/api/logout", { method: "POST" });
  } finally {
    state.me = null;
    state.spaces = [];
    state.activeSpace = null;
    state.activeSpaceId = null;
    state.modal = null;
    if (pollTimer !== null) window.clearInterval(pollTimer);
    render();
  }
}

function updateTimeFieldState(): void {
  const allDay = document.querySelector<HTMLInputElement>('input[name="allDay"]')?.checked ?? false;
  document.querySelectorAll<HTMLInputElement>(".time-field input").forEach((input) => { input.disabled = allDay; });
  document.querySelectorAll<HTMLElement>(".time-field").forEach((field) => field.classList.toggle("disabled", allDay));
}

function currentLoadRange(): { start: string; end: string } {
  const monthStart = new Date(state.viewYear, state.viewMonth - 1, 1);
  const gridStart = startOfCalendarWeek(monthStart);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  const selected = parseLocalDate(state.selectedDate);
  const start = selected < gridStart ? selected : gridStart;
  const end = selected > gridEnd ? selected : gridEnd;
  return { start: localDateString(start), end: localDateString(end) };
}

function monthGridDays(year: number, month: number): Date[] {
  const start = startOfCalendarWeek(new Date(year, month - 1, 1));
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function startOfCalendarWeek(date: Date): Date {
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekday + 1);
}

function filteredEventsForDate(date: string): CalendarEvent[] {
  return state.events.filter((event) => event.startDate === date && event.assignedUserIds.some((id) => state.visibleMemberIds.has(id)));
}

function summarizeByMember(events: CalendarEvent[]): Array<{ member: Member; events: CalendarEvent[] }> {
  return state.members
    .filter((member) => state.visibleMemberIds.has(member.id))
    .map((member) => ({ member, events: events.filter((event) => event.assignedUserIds.includes(member.id)) }))
    .filter((item) => item.events.length > 0);
}

function eventSummary(events: CalendarEvent[]): string {
  const first = [...events].sort(eventSort)[0];
  if (!first) return "";
  if (events.length === 1) return `${first.allDay ? "全天" : first.startTime ?? ""} ${first.title}`.trim();
  return `${first.allDay ? "全天" : first.startTime ?? ""} ${first.title} · +${events.length - 1}`.trim();
}

function eventSort(a: CalendarEvent, b: CalendarEvent): number {
  return Number(b.allDay) - Number(a.allDay) || (a.startTime ?? "00:00").localeCompare(b.startTime ?? "00:00");
}

function memberNames(ids: string[]): string {
  const names = ids.map((id) => state.members.find((member) => member.id === id)?.displayName).filter(Boolean) as string[];
  return names.length ? names.join("、") : "当前用户";
}

function currentMember(): Member | null {
  return state.members.find((member) => member.id === state.me?.id) ?? null;
}

function isSpaceAdmin(): boolean {
  return state.activeSpace?.role === "owner" || state.activeSpace?.role === "admin";
}

function canManageEvent(event: CalendarEvent): boolean {
  if (isSpaceAdmin()) return true;
  return event.createdBy === state.me?.id && event.assignedUserIds.length === 1 && event.assignedUserIds[0] === state.me?.id;
}

function roleLabel(role: SpaceRole): string {
  return role === "owner" ? "所有者" : role === "admin" ? "管理员" : "成员";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: "待处理", accepted: "已接受", declined: "已拒绝", cancelled: "已取消", approved: "已同意" };
  return map[status] ?? status;
}

function formatFullDate(value: string): string {
  const date = parseLocalDate(value);
  const weekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekday}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function addMinutes(time: string, amount: number): string {
  const total = Math.min(1439, timeToMinutes(time) + amount);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function initials(name: string): string {
  return [...name.trim()].slice(-2).join("") || "我";
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value: unknown): string {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function setFormBusy(form: HTMLFormElement, busy: boolean): void {
  form.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("button,input,textarea,select")
    .forEach((element) => { element.disabled = busy; });
  form.classList.toggle("is-busy", busy);
}

function toast(message: string, type: "normal" | "error" = "normal"): void {
  const root = document.querySelector<HTMLDivElement>("#toast-root");
  if (!root) return;
  const element = document.createElement("div");
  element.className = `toast ${type === "error" ? "error" : ""}`;
  element.textContent = message;
  root.appendChild(element);
  window.setTimeout(() => element.remove(), 3200);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; authOptional?: boolean } = {},
): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: options.body === undefined ? undefined : { "content-type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // ignore invalid JSON
  }
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : `请求失败（${response.status}）`;
    if (response.status === 401 && !options.authOptional) {
      state.me = null;
      state.modal = null;
    }
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作失败";
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
  }
}
