interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  CALENDAR_KV: KVNamespaceLike;
  ASSETS: Fetcher;
}

type SpaceRole = "owner" | "admin" | "member";
type InviteStatus = "pending" | "accepted" | "declined" | "cancelled";
type RequestStatus = "pending" | "approved" | "declined";
type EventSource = "manual" | "rules" | "ai";
type PlaceStatus = "wishlist" | "planned" | "visited";

interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  /** 经过前端压缩后的 PNG/JPEG/WebP Data URL。 */
  avatarDataUrl?: string;
  passwordHash: string;
  isPlatformAdmin: boolean;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

interface SpaceAISettings {
  enabled: boolean;
  endpoint: string;
  model: string;
  apiKey?: string;
  updatedAt: string;
  updatedBy: string;
}

interface StoredSpace {
  id: string;
  name: string;
  description: string;
  icon: string;
  ownerId: string;
  inviteCode: string;
  allowMemberInvites: boolean;
  ai: SpaceAISettings | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredSpaceMember {
  spaceId: string;
  userId: string;
  role: SpaceRole;
  color: string;
  joinedAt: string;
}

interface StoredSpaceInvitation {
  id: string;
  spaceId: string;
  inviterId: string;
  inviteeId: string;
  status: InviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

interface StoredJoinRequest {
  id: string;
  spaceId: string;
  userId: string;
  status: RequestStatus;
  createdAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
}

interface StoredEvent {
  id: string;
  /** 首次创建事件的空间。保留该字段用于兼容旧数据。 */
  spaceId: string;
  /** 同一事件可以出现在多个空间，公共字段只保存一份。 */
  spaceIds: string[];
  /** 每个空间分别保存该空间内的归属成员。 */
  assignmentsBySpace: Record<string, string[]>;
  title: string;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  location: string;
  placeId: string | null;
  placeAddress: string;
  latitude: number | null;
  longitude: number | null;
  companions: string;
  notes: string;
  createdBy: string;
  /** 兼容旧前端，读取时会被当前空间的 assignmentsBySpace 覆盖。 */
  assignedUserIds: string[];
  source: EventSource;
  createdAt: string;
  updatedAt: string;
}

interface StoredPlace {
  id: string;
  spaceId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  status: PlaceStatus;
  notes: string;
  createdBy: string;
  likedByUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface StoredActivity {
  id: string;
  spaceId: string;
  title: string;
  category: string;
  tag: string;
  notes: string;
  createdBy: string;
  likedByUserIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface AppData {
  version: 4;
  revision: number;
  users: StoredUser[];
  sessions: StoredSession[];
  spaces: StoredSpace[];
  spaceMembers: StoredSpaceMember[];
  spaceInvitations: StoredSpaceInvitation[];
  joinRequests: StoredJoinRequest[];
  events: StoredEvent[];
  places: StoredPlace[];
  activities: StoredActivity[];
  updatedAt: string;
}

interface LegacyData {
  version?: number;
  users?: Array<{
    id: string;
    username: string;
    displayName: string;
    color?: string;
    passwordHash: string;
    isAdmin?: boolean;
    createdAt: string;
  }>;
  sessions?: StoredSession[];
  events?: Array<{
    id: string;
    title: string;
    startDate: string;
    startTime: string | null;
    endTime: string | null;
    allDay: boolean;
    location?: string;
    companions?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    memberIds?: string[];
  }>;
  ai?: {
    enabled?: boolean;
    endpoint?: string;
    model?: string;
    apiKey?: string;
  } | null;
  updatedAt?: string;
}

interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  avatarDataUrl: string;
  isPlatformAdmin: boolean;
}

interface PublicSpace {
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
}

interface PublicMember {
  id: string;
  username: string;
  displayName: string;
  avatarDataUrl: string;
  role: SpaceRole;
  color: string;
  joinedAt: string;
  isMe: boolean;
}

interface EventDraft {
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
}

interface SpaceContext {
  space: StoredSpace;
  membership: StoredSpaceMember;
  members: StoredSpaceMember[];
  isAdmin: boolean;
}

interface CookingPlanTask {
  id: string;
  label: string;
  dish: string;
  lane: string;
  startMinute: number;
  endMinute: number;
  note: string;
}

interface CookingPlanResult {
  source: "ai";
  serveAt: string;
  burners: number;
  startClock: string;
  totalMinutes: number;
  summary: string;
  tips: string[];
  tasks: CookingPlanTask[];
}


const DATA_KEY = "calendar-data.json";
const SESSION_COOKIE = "space_calendar_session";
const SESSION_DAYS = 90;
const KV_WRITE_INTERVAL_MS = 1_100;
const DEFAULT_COLORS = [
  "#4F7CF7",
  "#F29A55",
  "#54B68B",
  "#9A6CF0",
  "#E05F79",
  "#2E9CCB",
  "#B38A45",
  "#697386",
  "#DD6B45",
  "#4EAFB1",
];
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

let mutationQueue: Promise<unknown> = Promise.resolve();
let lastKvWriteAt = 0;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError
        ? error.message
        : error instanceof Error
          ? `服务器处理失败：${error.message}`
          : "服务器处理失败";
      return json({ error: message }, status);
    }
  },
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const path = url.pathname;

  if (method === "GET" && path === "/api/health") {
    const { data } = await loadData(env);
    return json({ ok: true, storage: `KV/${DATA_KEY}`, version: data.version, revision: data.revision });
  }

  if (method === "GET" && path === "/api/setup/status") {
    const { data } = await loadData(env);
    return json({ needsSetup: data.users.length === 0 });
  }

  if (method === "POST" && path === "/api/setup") {
    assertSameOrigin(request);
    const body = await readJson<{ username?: string; displayName?: string; password?: string }>(request);
    const username = normalizeUsername(body.username);
    const displayName = cleanText(body.displayName, 30);
    const password = String(body.password ?? "");
    validateAccountInput(username, displayName, password);

    const result = await mutateData(env, async (data) => {
      if (data.users.length > 0) throw new HttpError(409, "系统已经初始化");
      const now = new Date().toISOString();
      const user: StoredUser = {
        id: crypto.randomUUID(),
        username,
        displayName,
        passwordHash: await hashPassword(password),
        isPlatformAdmin: true,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      };
      const space = createSpaceRecord(user.id, "我的共享空间", "第一个共享日历空间", "✦");
      data.users.push(user);
      data.spaces.push(space);
      data.spaceMembers.push({
        spaceId: space.id,
        userId: user.id,
        role: "owner",
        color: DEFAULT_COLORS[0],
        joinedAt: now,
      });
      return { userId: user.id, spaceId: space.id };
    });
    return json({ ok: true, ...result }, 201);
  }

  if (method === "POST" && path === "/api/register") {
    assertSameOrigin(request);
    const body = await readJson<{ username?: string; displayName?: string; password?: string }>(request);
    const username = normalizeUsername(body.username);
    const displayName = cleanText(body.displayName, 30);
    const password = String(body.password ?? "");
    validateAccountInput(username, displayName, password);

    const user = await mutateData(env, async (data) => {
      if (data.users.length === 0) throw new HttpError(409, "请先创建平台管理员账号");
      if (data.users.some((item) => item.username === username)) throw new HttpError(409, "用户名已被使用");
      const now = new Date().toISOString();
      const stored: StoredUser = {
        id: crypto.randomUUID(),
        username,
        displayName,
        passwordHash: await hashPassword(password),
        isPlatformAdmin: false,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      };
      data.users.push(stored);
      return toSessionUser(stored);
    });
    return json({ user }, 201);
  }

  if (method === "POST" && path === "/api/login") {
    assertSameOrigin(request);
    const body = await readJson<{ username?: string; password?: string }>(request);
    const username = normalizeUsername(body.username);
    const password = String(body.password ?? "");
    const rawToken = randomToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();

    const user = await mutateData(env, async (data) => {
      const stored = data.users.find((item) => item.username === username);
      if (!stored || !(await verifyPassword(password, stored.passwordHash))) {
        throw new HttpError(401, "用户名或密码错误");
      }
      if (stored.disabled) throw new HttpError(403, "账号已被管理员停用");
      const now = new Date().toISOString();
      data.sessions = data.sessions.filter((item) => item.expiresAt > now && item.tokenHash !== tokenHash);
      data.sessions.push({ tokenHash, userId: stored.id, expiresAt, createdAt: now });
      return toSessionUser(stored);
    });

    return json(
      { user },
      200,
      { "set-cookie": sessionCookie(rawToken, expiresAt, url.protocol === "https:") },
    );
  }

  if (method === "POST" && path === "/api/logout") {
    assertSameOrigin(request);
    const token = getCookie(request, SESSION_COOKIE);
    if (token) {
      const tokenHash = await sha256Hex(token);
      await mutateData(env, (data) => {
        data.sessions = data.sessions.filter((item) => item.tokenHash !== tokenHash);
        return null;
      });
    }
    return json(
      { ok: true },
      200,
      { "set-cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}` },
    );
  }

  const { user, data: authData } = await requireUser(request, env);

  if (method === "GET" && path === "/api/me") {
    const stored = requireUserInData(authData, user.id);
    return json({
      user: toSessionUser(stored),
      profile: {
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        spaceCount: authData.spaceMembers.filter((member) => member.userId === stored.id).length,
      },
    });
  }

  if (method === "PATCH" && path === "/api/me") {
    assertSameOrigin(request);
    const body = await readJson<{
      displayName?: string;
      avatarDataUrl?: string | null;
      currentPassword?: string;
      newPassword?: string;
    }>(request);
    const rawToken = getCookie(request, SESSION_COOKIE);
    const currentTokenHash = rawToken ? await sha256Hex(rawToken) : "";
    const updated = await mutateData(env, async (data) => {
      const stored = requireUserInData(data, user.id);

      if (body.displayName !== undefined) {
        const displayName = cleanText(body.displayName, 30);
        if (!displayName) throw new HttpError(400, "昵称不能为空");
        stored.displayName = displayName;
      }

      if (body.avatarDataUrl !== undefined) {
        stored.avatarDataUrl = normalizeAvatarDataUrl(body.avatarDataUrl);
      }

      if (body.newPassword !== undefined && String(body.newPassword).length > 0) {
        const currentPassword = String(body.currentPassword ?? "");
        const newPassword = String(body.newPassword);
        if (!currentPassword) throw new HttpError(400, "请输入当前密码");
        if (!(await verifyPassword(currentPassword, stored.passwordHash))) {
          throw new HttpError(400, "当前密码不正确");
        }
        if (newPassword.length < 6) throw new HttpError(400, "新密码至少 6 位");
        if (newPassword === currentPassword) throw new HttpError(400, "新密码不能与当前密码相同");
        stored.passwordHash = await hashPassword(newPassword);
        data.sessions = data.sessions.filter(
          (session) => session.userId !== stored.id || session.tokenHash === currentTokenHash,
        );
      }

      stored.updatedAt = new Date().toISOString();
      return {
        user: toSessionUser(stored),
        profile: {
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
          spaceCount: data.spaceMembers.filter((member) => member.userId === stored.id).length,
        },
      };
    });
    return json(updated);
  }

  if (method === "GET" && path === "/api/bootstrap") {
    return json(buildBootstrap(authData, user.id));
  }

  if (method === "GET" && path === "/api/admin/users") {
    requirePlatformAdmin(user);
    return json({
      users: authData.users
        .map((item) => ({
          id: item.id,
          username: item.username,
          displayName: item.displayName,
          avatarDataUrl: item.avatarDataUrl ?? "",
          isPlatformAdmin: item.isPlatformAdmin,
          disabled: item.disabled,
          createdAt: item.createdAt,
          spaces: authData.spaceMembers.filter((member) => member.userId === item.id).length,
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    });
  }

  const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserMatch && method === "PATCH") {
    assertSameOrigin(request);
    requirePlatformAdmin(user);
    const targetId = cleanId(adminUserMatch[1]);
    const body = await readJson<{ disabled?: boolean; password?: string }>(request);
    const updated = await mutateData(env, async (data) => {
      const target = requireUserInData(data, targetId);
      if (target.id === user.id && body.disabled === true) throw new HttpError(400, "不能停用当前管理员账号");
      if (typeof body.disabled === "boolean") target.disabled = body.disabled;
      if (body.password !== undefined) {
        const password = String(body.password);
        if (password.length < 6) throw new HttpError(400, "新密码至少 6 位");
        target.passwordHash = await hashPassword(password);
        data.sessions = data.sessions.filter((item) => item.userId !== target.id);
      }
      target.updatedAt = new Date().toISOString();
      return { id: target.id, disabled: target.disabled };
    });
    return json({ ok: true, user: updated });
  }

  if (method === "POST" && path === "/api/spaces") {
    assertSameOrigin(request);
    const body = await readJson<{ name?: string; description?: string; icon?: string }>(request);
    const name = cleanText(body.name, 40);
    if (!name) throw new HttpError(400, "请输入空间名称");
    const space = await mutateData(env, (data) => {
      const stored = createSpaceRecord(user.id, name, cleanText(body.description, 160), cleanText(body.icon, 4) || "✦");
      data.spaces.push(stored);
      data.spaceMembers.push({
        spaceId: stored.id,
        userId: user.id,
        role: "owner",
        color: suggestColor(data, stored.id),
        joinedAt: stored.createdAt,
      });
      return stored;
    });
    return json({ space: publicSpaceFromData(await getFreshData(env), user.id, space.id) }, 201);
  }

  if (method === "POST" && path === "/api/spaces/join-requests") {
    assertSameOrigin(request);
    const body = await readJson<{ inviteCode?: string }>(request);
    const inviteCode = cleanText(body.inviteCode, 24).toUpperCase();
    if (!inviteCode) throw new HttpError(400, "请输入空间邀请码");
    const requestRecord = await mutateData(env, (data) => {
      const space = data.spaces.find((item) => item.inviteCode === inviteCode);
      if (!space) throw new HttpError(404, "没有找到这个空间");
      if (data.spaceMembers.some((item) => item.spaceId === space.id && item.userId === user.id)) {
        throw new HttpError(409, "你已经在这个空间中");
      }
      const existing = data.joinRequests.find(
        (item) => item.spaceId === space.id && item.userId === user.id && item.status === "pending",
      );
      if (existing) throw new HttpError(409, "加入申请已经提交，请等待管理员处理");
      const now = new Date().toISOString();
      const stored: StoredJoinRequest = {
        id: crypto.randomUUID(),
        spaceId: space.id,
        userId: user.id,
        status: "pending",
        createdAt: now,
        respondedAt: null,
        respondedBy: null,
      };
      data.joinRequests.push(stored);
      return { id: stored.id, spaceName: space.name };
    });
    return json({ request: requestRecord }, 201);
  }

  if (method === "GET" && path === "/api/invitations") {
    const invitations = authData.spaceInvitations
      .filter((item) => item.inviteeId === user.id && item.status === "pending")
      .map((item) => ({
        id: item.id,
        spaceId: item.spaceId,
        spaceName: authData.spaces.find((space) => space.id === item.spaceId)?.name ?? "未知空间",
        inviterName: authData.users.find((account) => account.id === item.inviterId)?.displayName ?? "未知用户",
        createdAt: item.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ invitations });
  }

  const invitationResponseMatch = path.match(/^\/api\/invitations\/([^/]+)\/respond$/);
  if (invitationResponseMatch && method === "POST") {
    assertSameOrigin(request);
    const invitationId = cleanId(invitationResponseMatch[1]);
    const body = await readJson<{ decision?: string }>(request);
    const decision = body.decision === "accept" ? "accept" : body.decision === "decline" ? "decline" : null;
    if (!decision) throw new HttpError(400, "无效的处理方式");
    await mutateData(env, (data) => {
      const invitation = data.spaceInvitations.find((item) => item.id === invitationId);
      if (!invitation || invitation.inviteeId !== user.id || invitation.status !== "pending") {
        throw new HttpError(404, "邀请不存在或已经处理");
      }
      invitation.status = decision === "accept" ? "accepted" : "declined";
      invitation.respondedAt = new Date().toISOString();
      if (decision === "accept") {
        if (!data.spaceMembers.some((item) => item.spaceId === invitation.spaceId && item.userId === user.id)) {
          data.spaceMembers.push({
            spaceId: invitation.spaceId,
            userId: user.id,
            role: "member",
            color: suggestColor(data, invitation.spaceId),
            joinedAt: invitation.respondedAt,
          });
        }
        data.joinRequests = data.joinRequests.map((item) =>
          item.spaceId === invitation.spaceId && item.userId === user.id && item.status === "pending"
            ? { ...item, status: "approved", respondedAt: invitation.respondedAt, respondedBy: invitation.inviterId }
            : item,
        );
      }
      return null;
    });
    return json({ ok: true });
  }

  const spaceMatch = path.match(/^\/api\/spaces\/([^/]+)$/);
  if (spaceMatch && method === "GET") {
    const spaceId = cleanId(spaceMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    return json({
      space: publicSpaceFromData(authData, user.id, spaceId),
      members: publicMembers(authData, context, user.id),
      ai: publicAI(context.space, context.isAdmin),
    });
  }

  if (spaceMatch && method === "PATCH") {
    assertSameOrigin(request);
    const spaceId = cleanId(spaceMatch[1]);
    const body = await readJson<{
      name?: string;
      description?: string;
      icon?: string;
      allowMemberInvites?: boolean;
      regenerateInviteCode?: boolean;
    }>(request);
    await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      requireSpaceAdmin(context);
      if (body.name !== undefined) {
        const name = cleanText(body.name, 40);
        if (!name) throw new HttpError(400, "空间名称不能为空");
        context.space.name = name;
      }
      if (body.description !== undefined) context.space.description = cleanText(body.description, 160);
      if (body.icon !== undefined) context.space.icon = cleanText(body.icon, 4) || "✦";
      if (typeof body.allowMemberInvites === "boolean") context.space.allowMemberInvites = body.allowMemberInvites;
      if (body.regenerateInviteCode) context.space.inviteCode = generateInviteCode();
      context.space.updatedAt = new Date().toISOString();
      return null;
    });
    const fresh = await getFreshData(env);
    return json({ space: publicSpaceFromData(fresh, user.id, spaceId) });
  }

  if (spaceMatch && method === "DELETE") {
    assertSameOrigin(request);
    const spaceId = cleanId(spaceMatch[1]);
    await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      if (context.membership.role !== "owner") throw new HttpError(403, "只有空间所有者可以解散空间");
      data.spaces = data.spaces.filter((item) => item.id !== spaceId);
      data.spaceMembers = data.spaceMembers.filter((item) => item.spaceId !== spaceId);
      data.spaceInvitations = data.spaceInvitations.filter((item) => item.spaceId !== spaceId);
      data.joinRequests = data.joinRequests.filter((item) => item.spaceId !== spaceId);
      const removedPlaceIds = new Set(data.places.filter((item) => item.spaceId === spaceId).map((item) => item.id));
      data.events = data.events
        .map((event) => {
          if (eventSpaceIds(event).includes(spaceId)) {
            event.spaceIds = eventSpaceIds(event).filter((id) => id !== spaceId);
            delete event.assignmentsBySpace[spaceId];
            if (event.spaceId === spaceId && event.spaceIds.length) event.spaceId = event.spaceIds[0];
            event.assignedUserIds = event.assignmentsBySpace[event.spaceId] ?? [];
          }
          if (event.placeId && removedPlaceIds.has(event.placeId)) event.placeId = null;
          return event;
        })
        .filter((event) => event.spaceIds.length > 0);
      data.places = data.places.filter((item) => item.spaceId !== spaceId);
      data.activities = data.activities.filter((item) => item.spaceId !== spaceId);
      return null;
    });
    return json({ ok: true });
  }

  const membersMatch = path.match(/^\/api\/spaces\/([^/]+)\/members$/);
  if (membersMatch && method === "GET") {
    const spaceId = cleanId(membersMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    return json({ members: publicMembers(authData, context, user.id) });
  }

  const memberMatch = path.match(/^\/api\/spaces\/([^/]+)\/members\/([^/]+)$/);
  if (memberMatch && method === "PATCH") {
    assertSameOrigin(request);
    const spaceId = cleanId(memberMatch[1]);
    const targetUserId = cleanId(memberMatch[2]);
    const body = await readJson<{ color?: string; role?: SpaceRole }>(request);
    await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      const target = data.spaceMembers.find((item) => item.spaceId === spaceId && item.userId === targetUserId);
      if (!target) throw new HttpError(404, "成员不存在");

      if (body.color !== undefined) {
        const canEditColor = targetUserId === user.id || context.isAdmin;
        if (!canEditColor) throw new HttpError(403, "只能修改自己的颜色");
        const color = normalizeColor(body.color);
        assertColorAvailable(data, spaceId, targetUserId, color);
        target.color = color;
      }

      if (body.role !== undefined) {
        if (context.membership.role !== "owner") throw new HttpError(403, "只有空间所有者可以调整角色");
        if (target.userId === context.space.ownerId) throw new HttpError(400, "不能修改空间所有者角色");
        if (body.role !== "admin" && body.role !== "member") throw new HttpError(400, "无效角色");
        target.role = body.role;
      }
      context.space.updatedAt = new Date().toISOString();
      return null;
    });
    const fresh = await getFreshData(env);
    const context = requireSpaceContext(fresh, user.id, spaceId);
    return json({ members: publicMembers(fresh, context, user.id) });
  }

  if (memberMatch && method === "DELETE") {
    assertSameOrigin(request);
    const spaceId = cleanId(memberMatch[1]);
    const targetUserId = cleanId(memberMatch[2]);
    await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      const target = data.spaceMembers.find((item) => item.spaceId === spaceId && item.userId === targetUserId);
      if (!target) throw new HttpError(404, "成员不存在");
      if (target.role === "owner") throw new HttpError(400, "空间所有者不能退出或被移除");
      const isSelf = targetUserId === user.id;
      if (!isSelf) {
        requireSpaceAdmin(context);
        if (target.role === "admin" && context.membership.role !== "owner") {
          throw new HttpError(403, "只有空间所有者可以移除管理员");
        }
      }
      data.spaceMembers = data.spaceMembers.filter((item) => !(item.spaceId === spaceId && item.userId === targetUserId));
      data.events = data.events.map((event) => {
        if (!eventSpaceIds(event).includes(spaceId)) return event;
        const remaining = eventAssignments(event, spaceId).filter((id) => id !== targetUserId);
        event.assignmentsBySpace[spaceId] = remaining;
        if (event.spaceId === spaceId) event.assignedUserIds = remaining;
        event.updatedAt = new Date().toISOString();
        return event;
      });
      return null;
    });
    return json({ ok: true });
  }

  const inviteMatch = path.match(/^\/api\/spaces\/([^/]+)\/invitations$/);
  if (inviteMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(inviteMatch[1]);
    const body = await readJson<{ username?: string }>(request);
    const username = normalizeUsername(body.username);
    const invitation = await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      if (!context.isAdmin && !context.space.allowMemberInvites) throw new HttpError(403, "当前空间不允许普通成员邀请");
      const invitee = data.users.find((item) => item.username === username);
      if (!invitee || invitee.disabled) throw new HttpError(404, "没有找到可邀请的账号");
      if (invitee.id === user.id) throw new HttpError(400, "不能邀请自己");
      if (data.spaceMembers.some((item) => item.spaceId === spaceId && item.userId === invitee.id)) {
        throw new HttpError(409, "对方已经在空间中");
      }
      const existing = data.spaceInvitations.find(
        (item) => item.spaceId === spaceId && item.inviteeId === invitee.id && item.status === "pending",
      );
      if (existing) throw new HttpError(409, "已经向该用户发送过邀请");
      const stored: StoredSpaceInvitation = {
        id: crypto.randomUUID(),
        spaceId,
        inviterId: user.id,
        inviteeId: invitee.id,
        status: "pending",
        createdAt: new Date().toISOString(),
        respondedAt: null,
      };
      data.spaceInvitations.push(stored);
      return { id: stored.id, inviteeName: invitee.displayName };
    });
    return json({ invitation }, 201);
  }

  if (inviteMatch && method === "GET") {
    const spaceId = cleanId(inviteMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    requireSpaceAdmin(context);
    const invitations = authData.spaceInvitations
      .filter((item) => item.spaceId === spaceId)
      .map((item) => ({
        id: item.id,
        inviteeName: authData.users.find((account) => account.id === item.inviteeId)?.displayName ?? "未知用户",
        inviteeUsername: authData.users.find((account) => account.id === item.inviteeId)?.username ?? "",
        inviterName: authData.users.find((account) => account.id === item.inviterId)?.displayName ?? "未知用户",
        status: item.status,
        createdAt: item.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ invitations });
  }

  const joinRequestsMatch = path.match(/^\/api\/spaces\/([^/]+)\/join-requests$/);
  if (joinRequestsMatch && method === "GET") {
    const spaceId = cleanId(joinRequestsMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    requireSpaceAdmin(context);
    const requests = authData.joinRequests
      .filter((item) => item.spaceId === spaceId)
      .map((item) => ({
        id: item.id,
        userId: item.userId,
        displayName: authData.users.find((account) => account.id === item.userId)?.displayName ?? "未知用户",
        username: authData.users.find((account) => account.id === item.userId)?.username ?? "",
        status: item.status,
        createdAt: item.createdAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ requests });
  }

  const joinResponseMatch = path.match(/^\/api\/join-requests\/([^/]+)\/respond$/);
  if (joinResponseMatch && method === "POST") {
    assertSameOrigin(request);
    const requestId = cleanId(joinResponseMatch[1]);
    const body = await readJson<{ decision?: string }>(request);
    const decision = body.decision === "approve" ? "approve" : body.decision === "decline" ? "decline" : null;
    if (!decision) throw new HttpError(400, "无效的处理方式");
    await mutateData(env, (data) => {
      const joinRequest = data.joinRequests.find((item) => item.id === requestId);
      if (!joinRequest || joinRequest.status !== "pending") throw new HttpError(404, "申请不存在或已经处理");
      const context = requireSpaceContext(data, user.id, joinRequest.spaceId);
      requireSpaceAdmin(context);
      joinRequest.status = decision === "approve" ? "approved" : "declined";
      joinRequest.respondedAt = new Date().toISOString();
      joinRequest.respondedBy = user.id;
      if (decision === "approve" && !data.spaceMembers.some((item) => item.spaceId === joinRequest.spaceId && item.userId === joinRequest.userId)) {
        data.spaceMembers.push({
          spaceId: joinRequest.spaceId,
          userId: joinRequest.userId,
          role: "member",
          color: suggestColor(data, joinRequest.spaceId),
          joinedAt: joinRequest.respondedAt,
        });
      }
      return null;
    });
    return json({ ok: true });
  }

  const placesMatch = path.match(/^\/api\/spaces\/([^/]+)\/places$/);
  if (placesMatch && method === "GET") {
    const spaceId = cleanId(placesMatch[1]);
    requireSpaceContext(authData, user.id, spaceId);
    const status = url.searchParams.get("status");
    const eventPlaceIds = new Set(
      authData.events
        .filter((event) => eventSpaceIds(event).includes(spaceId) && event.placeId)
        .map((event) => event.placeId as string),
    );
    const places = authData.places
      .filter((place) => place.spaceId === spaceId || eventPlaceIds.has(place.id))
      .map((place) => publicPlace(authData, place, user.id, spaceId))
      .filter((place) => !status || status === "all" || place.status === status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return json({ places, revision: authData.revision });
  }

  if (placesMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(placesMatch[1]);
    const body = await readJson<Record<string, unknown>>(request);
    const place = await mutateData(env, (data) => {
      requireSpaceContext(data, user.id, spaceId);
      const now = new Date().toISOString();
      const stored: StoredPlace = {
        id: crypto.randomUUID(),
        spaceId,
        ...normalizePlaceInput(body),
        createdBy: user.id,
        likedByUserIds: [],
        createdAt: now,
        updatedAt: now,
      };
      data.places.push(stored);
      return publicPlace(data, stored, user.id);
    });
    return json({ place }, 201);
  }

  const placeMatch = path.match(/^\/api\/places\/([^/]+)$/);
  if (placeMatch && method === "PATCH") {
    assertSameOrigin(request);
    const placeId = cleanId(placeMatch[1]);
    const body = await readJson<Record<string, unknown>>(request);
    const place = await mutateData(env, (data) => {
      const stored = data.places.find((item) => item.id === placeId);
      if (!stored) throw new HttpError(404, "地点不存在");
      const context = requireSpaceContext(data, user.id, stored.spaceId);
      if (!context.isAdmin && stored.createdBy !== user.id) throw new HttpError(403, "只能修改自己添加的地点");
      Object.assign(stored, normalizePlaceInput(body, stored), { updatedAt: new Date().toISOString() });
      data.events.forEach((event) => {
        if (event.placeId === stored.id) {
          event.location = stored.name;
          event.placeAddress = stored.address;
          event.latitude = stored.latitude;
          event.longitude = stored.longitude;
          event.updatedAt = stored.updatedAt;
        }
      });
      return publicPlace(data, stored, user.id);
    });
    return json({ place });
  }

  if (placeMatch && method === "DELETE") {
    assertSameOrigin(request);
    const placeId = cleanId(placeMatch[1]);
    await mutateData(env, (data) => {
      const stored = data.places.find((item) => item.id === placeId);
      if (!stored) throw new HttpError(404, "地点不存在");
      const context = requireSpaceContext(data, user.id, stored.spaceId);
      if (!context.isAdmin && stored.createdBy !== user.id) throw new HttpError(403, "只能删除自己添加的地点");
      data.places = data.places.filter((item) => item.id !== placeId);
      data.events.forEach((event) => {
        if (event.placeId === placeId) event.placeId = null;
      });
      return null;
    });
    return json({ ok: true });
  }

  const placeLikeMatch = path.match(/^\/api\/places\/([^/]+)\/like$/);
  if (placeLikeMatch && method === "POST") {
    assertSameOrigin(request);
    const placeId = cleanId(placeLikeMatch[1]);
    const place = await mutateData(env, (data) => {
      const stored = data.places.find((item) => item.id === placeId);
      if (!stored) throw new HttpError(404, "地点不存在");
      const requestedViewSpaceId = url.searchParams.get("spaceId");
      const accessibleSpaceId = requestedViewSpaceId
        && placeVisibleInSpace(data, stored.id, requestedViewSpaceId)
        && data.spaceMembers.some((member) => member.spaceId === requestedViewSpaceId && member.userId === user.id)
        ? requestedViewSpaceId
        : findAccessiblePlaceSpace(data, stored, user.id);
      requireSpaceContext(data, user.id, accessibleSpaceId);
      stored.likedByUserIds = stored.likedByUserIds.includes(user.id)
        ? stored.likedByUserIds.filter((id) => id !== user.id)
        : [...stored.likedByUserIds, user.id];
      stored.updatedAt = new Date().toISOString();
      return publicPlace(data, stored, user.id, accessibleSpaceId);
    });
    return json({ place });
  }

  const activitiesMatch = path.match(/^\/api\/spaces\/([^/]+)\/activities$/);
  if (activitiesMatch && method === "GET") {
    const spaceId = cleanId(activitiesMatch[1]);
    requireSpaceContext(authData, user.id, spaceId);
    const activities = authData.activities
      .filter((activity) => activity.spaceId === spaceId)
      .map((activity) => publicActivity(authData, activity, user.id))
      .sort((a, b) => b.likeCount - a.likeCount || b.updatedAt.localeCompare(a.updatedAt));
    return json({ activities, revision: authData.revision });
  }

  if (activitiesMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(activitiesMatch[1]);
    const body = await readJson<Record<string, unknown>>(request);
    const activity = await mutateData(env, (data) => {
      requireSpaceContext(data, user.id, spaceId);
      const normalized = normalizeActivityInput(body);
      const duplicate = data.activities.find(
        (item) => item.spaceId === spaceId && item.title.localeCompare(normalized.title, "zh-CN", { sensitivity: "base" }) === 0,
      );
      if (duplicate) throw new HttpError(409, "这件事情已经在当前空间活动库中");
      const now = new Date().toISOString();
      const stored: StoredActivity = {
        id: crypto.randomUUID(),
        spaceId,
        ...normalized,
        createdBy: user.id,
        likedByUserIds: [],
        createdAt: now,
        updatedAt: now,
      };
      data.activities.push(stored);
      return publicActivity(data, stored, user.id);
    });
    return json({ activity }, 201);
  }

  const activityMatch = path.match(/^\/api\/activities\/([^/]+)$/);
  if (activityMatch && method === "PATCH") {
    assertSameOrigin(request);
    const activityId = cleanId(activityMatch[1]);
    const body = await readJson<Record<string, unknown>>(request);
    const activity = await mutateData(env, (data) => {
      const stored = data.activities.find((item) => item.id === activityId);
      if (!stored) throw new HttpError(404, "活动不存在");
      const context = requireSpaceContext(data, user.id, stored.spaceId);
      if (!context.isAdmin && stored.createdBy !== user.id) throw new HttpError(403, "只能修改自己添加的活动");
      const normalized = normalizeActivityInput(body, stored);
      const duplicate = data.activities.find(
        (item) => item.id !== stored.id && item.spaceId === stored.spaceId
          && item.title.localeCompare(normalized.title, "zh-CN", { sensitivity: "base" }) === 0,
      );
      if (duplicate) throw new HttpError(409, "当前空间已经有同名活动");
      Object.assign(stored, normalized, { updatedAt: new Date().toISOString() });
      return publicActivity(data, stored, user.id);
    });
    return json({ activity });
  }

  if (activityMatch && method === "DELETE") {
    assertSameOrigin(request);
    const activityId = cleanId(activityMatch[1]);
    await mutateData(env, (data) => {
      const stored = data.activities.find((item) => item.id === activityId);
      if (!stored) throw new HttpError(404, "活动不存在");
      const context = requireSpaceContext(data, user.id, stored.spaceId);
      if (!context.isAdmin && stored.createdBy !== user.id) throw new HttpError(403, "只能删除自己添加的活动");
      data.activities = data.activities.filter((item) => item.id !== activityId);
      return null;
    });
    return json({ ok: true });
  }

  const activityLikeMatch = path.match(/^\/api\/activities\/([^/]+)\/like$/);
  if (activityLikeMatch && method === "POST") {
    assertSameOrigin(request);
    const activityId = cleanId(activityLikeMatch[1]);
    const activity = await mutateData(env, (data) => {
      const stored = data.activities.find((item) => item.id === activityId);
      if (!stored) throw new HttpError(404, "活动不存在");
      requireSpaceContext(data, user.id, stored.spaceId);
      stored.likedByUserIds = stored.likedByUserIds.includes(user.id)
        ? stored.likedByUserIds.filter((id) => id !== user.id)
        : [...stored.likedByUserIds, user.id];
      stored.updatedAt = new Date().toISOString();
      return publicActivity(data, stored, user.id);
    });
    return json({ activity });
  }

  const plannerRecommendMatch = path.match(/^\/api\/spaces\/([^/]+)\/planner\/recommend$/);
  if (plannerRecommendMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(plannerRecommendMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    const body = await readJson<{
      memberIds?: string[];
      slots?: Array<{ date?: string; startTime?: string; endTime?: string }>;
      placeIds?: string[];
      activities?: Array<{ id?: string; title?: string; category?: string; tag?: string; builtin?: boolean }>;
      preference?: string;
    }>(request);
    const recommendation = await recommendPlan(authData, context, user.id, body);
    return json({ recommendation });
  }

  const eventsMatch = path.match(/^\/api\/spaces\/([^/]+)\/events$/);
  if (eventsMatch && method === "GET") {
    const spaceId = cleanId(eventsMatch[1]);
    requireSpaceContext(authData, user.id, spaceId);
    const start = requireDate(url.searchParams.get("start"));
    const end = requireDate(url.searchParams.get("end"));
    const events = authData.events
      .filter((event) => eventSpaceIds(event).includes(spaceId) && event.startDate >= start && event.startDate <= end)
      .sort(compareEvents)
      .map((event) => publicEvent(event, spaceId));
    return json({ events, revision: authData.revision });
  }

  if (eventsMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(eventsMatch[1]);
    const body = await readJson<Record<string, unknown>>(request);
    const event = await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      const normalized = normalizeEventInput(data, context, user.id, body);
      const spaceIds = normalizeEventSpaceIds(data, user.id, spaceId, body.spaceIds);
      const assignmentsBySpace = buildAssignmentsBySpace(data, user.id, spaceId, spaceIds, normalized.assignedUserIds);
      const now = new Date().toISOString();
      const stored: StoredEvent = {
        id: crypto.randomUUID(),
        spaceId,
        spaceIds,
        assignmentsBySpace,
        ...normalized,
        assignedUserIds: assignmentsBySpace[spaceId] ?? [user.id],
        createdBy: user.id,
        source: normalizeEventSource(body.source),
        createdAt: now,
        updatedAt: now,
      };
      data.events.push(stored);
      touchPlaceForEvent(data, stored);
      return publicEvent(stored, spaceId);
    });
    return json({ event }, 201);
  }

  const eventMatch = path.match(/^\/api\/events\/([^/]+)$/);
  if (eventMatch && method === "PATCH") {
    assertSameOrigin(request);
    const eventId = cleanId(eventMatch[1]);
    const body = await readJson<Record<string, unknown>>(request);
    const event = await mutateData(env, (data) => {
      const stored = data.events.find((item) => item.id === eventId);
      if (!stored) throw new HttpError(404, "日程不存在");
      const currentSpaceId = cleanText(body.currentSpaceId, 100) || findAccessibleEventSpace(data, stored, user.id);
      const context = requireSpaceContext(data, user.id, currentSpaceId);
      assertCanManageEvent(context, stored, user.id, currentSpaceId);
      const normalized = normalizeEventInput(data, context, user.id, body, stored, currentSpaceId);
      const previousSpaceIds = eventSpaceIds(stored);
      const requestedSpaceIds = Array.isArray(body.spaceIds) && stored.createdBy === user.id
        ? normalizeEventSpaceIds(data, user.id, currentSpaceId, body.spaceIds)
        : previousSpaceIds;
      const assignmentsBySpace: Record<string, string[]> = {};
      for (const linkedSpaceId of requestedSpaceIds) {
        if (linkedSpaceId === currentSpaceId) {
          assignmentsBySpace[linkedSpaceId] = normalized.assignedUserIds;
        } else {
          const valid = new Set(data.spaceMembers.filter((member) => member.spaceId === linkedSpaceId).map((member) => member.userId));
          const previous = stored.assignmentsBySpace?.[linkedSpaceId] ?? stored.assignedUserIds;
          const filtered = previous.filter((id) => valid.has(id));
          assignmentsBySpace[linkedSpaceId] = filtered.length ? filtered : valid.has(user.id) ? [user.id] : [];
        }
      }
      Object.assign(stored, normalized, {
        spaceIds: requestedSpaceIds,
        assignmentsBySpace,
        assignedUserIds: assignmentsBySpace[stored.spaceId] ?? assignmentsBySpace[currentSpaceId] ?? [user.id],
        updatedAt: new Date().toISOString(),
      });
      if (!stored.spaceIds.includes(stored.spaceId)) stored.spaceId = stored.spaceIds[0];
      touchPlaceForEvent(data, stored);
      return publicEvent(stored, currentSpaceId);
    });
    return json({ event });
  }

  if (eventMatch && method === "DELETE") {
    assertSameOrigin(request);
    const eventId = cleanId(eventMatch[1]);
    const currentSpaceId = cleanId(url.searchParams.get("spaceId"));
    const mode = url.searchParams.get("mode") === "all" ? "all" : "detach";
    await mutateData(env, (data) => {
      const stored = data.events.find((item) => item.id === eventId);
      if (!stored) throw new HttpError(404, "日程不存在");
      if (!eventSpaceIds(stored).includes(currentSpaceId)) throw new HttpError(404, "当前空间中没有这条日程");
      const context = requireSpaceContext(data, user.id, currentSpaceId);
      assertCanManageEvent(context, stored, user.id, currentSpaceId);
      if (mode === "all") {
        if (stored.createdBy !== user.id) throw new HttpError(403, "只有日程创建者可以从全部空间彻底删除");
        data.events = data.events.filter((item) => item.id !== eventId);
      } else {
        stored.spaceIds = eventSpaceIds(stored).filter((id) => id !== currentSpaceId);
        delete stored.assignmentsBySpace[currentSpaceId];
        if (stored.spaceIds.length === 0) {
          data.events = data.events.filter((item) => item.id !== eventId);
        } else {
          if (stored.spaceId === currentSpaceId) stored.spaceId = stored.spaceIds[0];
          stored.assignedUserIds = stored.assignmentsBySpace[stored.spaceId] ?? [];
          stored.updatedAt = new Date().toISOString();
        }
      }
      return null;
    });
    return json({ ok: true });
  }

  const parseMatch = path.match(/^\/api\/spaces\/([^/]+)\/parse$/);
  if (parseMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(parseMatch[1]);
    const body = await readJson<{ text?: string; anchorYear?: number; anchorMonth?: number; referenceDate?: string }>(request);
    const text = cleanText(body.text, 500);
    if (!text) throw new HttpError(400, "请输入要识别的日程");
    const context = requireSpaceContext(authData, user.id, spaceId);
    const members = publicMembers(authData, context, user.id);
    const anchorYear = normalizeInteger(body.anchorYear, 2000, 2100) ?? new Date().getFullYear();
    const anchorMonth = normalizeInteger(body.anchorMonth, 1, 12) ?? new Date().getMonth() + 1;
    const referenceDate = body.referenceDate && isDateString(body.referenceDate)
      ? body.referenceDate
      : localDateString(new Date());

    let draft: EventDraft | null = null;
    if (context.space.ai?.enabled && context.space.ai.endpoint && context.space.ai.model && context.space.ai.apiKey) {
      try {
        draft = await parseWithAI(text, context, members, user.id, anchorYear, anchorMonth, referenceDate);
      } catch (error) {
        console.warn("AI parse fallback:", error);
      }
    }
    if (!draft) draft = parseWithRules(text, anchorYear, anchorMonth, referenceDate, members, user.id, context.isAdmin);
    if (!draft) {
      throw new HttpError(422, "没有识别到明确日期。可以说“18号”“8月18号”“周日”“下周三”或“下下周五”。");
    }
    return json({ draft });
  }

  const foodCookingPlanMatch = path.match(/^\/api\/spaces\/([^/]+)\/food\/cooking-plan$/);
  if (foodCookingPlanMatch && method === "POST") {
    assertSameOrigin(request);
    const spaceId = cleanId(foodCookingPlanMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    if (!context.space.ai?.enabled || !context.space.ai.endpoint || !context.space.ai.model || !context.space.ai.apiKey) {
      throw new HttpError(409, "当前空间还没有配置 AI，已可继续使用规则烹饪排程");
    }
    const body = await readJson<{
      diners?: number;
      serveAt?: string;
      burners?: number;
      dishes?: unknown[];
      rulePlan?: unknown;
    }>(request);
    const plan = await planCookingWithAI(context, body);
    return json({ plan });
  }

  const aiMatch = path.match(/^\/api\/spaces\/([^/]+)\/ai$/);
  if (aiMatch && method === "GET") {
    const spaceId = cleanId(aiMatch[1]);
    const context = requireSpaceContext(authData, user.id, spaceId);
    return json({ ai: publicAI(context.space, context.isAdmin) });
  }

  if (aiMatch && method === "PUT") {
    assertSameOrigin(request);
    const spaceId = cleanId(aiMatch[1]);
    const body = await readJson<{ enabled?: boolean; endpoint?: string; model?: string; apiKey?: string }>(request);
    await mutateData(env, (data) => {
      const context = requireSpaceContext(data, user.id, spaceId);
      requireSpaceAdmin(context);
      const previous = context.space.ai;
      const endpoint = cleanEndpoint(body.endpoint ?? previous?.endpoint ?? "");
      const model = cleanText(body.model ?? previous?.model ?? "", 120);
      const apiKeyInput = String(body.apiKey ?? "").trim();
      const enabled = Boolean(body.enabled);
      if (enabled && (!endpoint || !model || (!apiKeyInput && !previous?.apiKey))) {
        throw new HttpError(400, "启用 AI 前请填写 URL、Model Name 和 API Key");
      }
      context.space.ai = {
        enabled,
        endpoint,
        model,
        apiKey: apiKeyInput || previous?.apiKey,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      };
      context.space.updatedAt = context.space.ai.updatedAt;
      return null;
    });
    const fresh = await getFreshData(env);
    const context = requireSpaceContext(fresh, user.id, spaceId);
    return json({ ai: publicAI(context.space, true) });
  }

  throw new HttpError(404, "接口不存在");
}

function buildBootstrap(data: AppData, userId: string): {
  user: SessionUser;
  spaces: PublicSpace[];
  invitations: Array<{ id: string; spaceId: string; spaceName: string; inviterName: string; createdAt: string }>;
} {
  const user = requireUserInData(data, userId);
  const spaces = data.spaceMembers
    .filter((member) => member.userId === userId)
    .map((member) => publicSpaceFromData(data, userId, member.spaceId))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const invitations = data.spaceInvitations
    .filter((item) => item.inviteeId === userId && item.status === "pending")
    .map((item) => ({
      id: item.id,
      spaceId: item.spaceId,
      spaceName: data.spaces.find((space) => space.id === item.spaceId)?.name ?? "未知空间",
      inviterName: data.users.find((account) => account.id === item.inviterId)?.displayName ?? "未知用户",
      createdAt: item.createdAt,
    }));
  return { user: toSessionUser(user), spaces, invitations };
}

function createSpaceRecord(ownerId: string, name: string, description: string, icon: string): StoredSpace {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    description,
    icon,
    ownerId,
    inviteCode: generateInviteCode(),
    allowMemberInvites: false,
    ai: null,
    createdAt: now,
    updatedAt: now,
  };
}

function publicSpaceFromData(data: AppData, userId: string, spaceId: string): PublicSpace {
  const space = data.spaces.find((item) => item.id === spaceId);
  const membership = data.spaceMembers.find((item) => item.spaceId === spaceId && item.userId === userId);
  if (!space || !membership) throw new HttpError(404, "空间不存在或你尚未加入");
  const isAdmin = membership.role === "owner" || membership.role === "admin";
  return {
    id: space.id,
    name: space.name,
    description: space.description,
    icon: space.icon,
    role: membership.role,
    color: membership.color,
    memberCount: data.spaceMembers.filter((item) => item.spaceId === spaceId).length,
    allowMemberInvites: space.allowMemberInvites,
    inviteCode: isAdmin ? space.inviteCode : undefined,
    hasAI: Boolean(space.ai?.enabled && space.ai.endpoint && space.ai.model && space.ai.apiKey),
    createdAt: space.createdAt,
  };
}

function publicMembers(data: AppData, context: SpaceContext, currentUserId: string): PublicMember[] {
  return context.members
    .map((membership) => {
      const account = requireUserInData(data, membership.userId);
      return {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        avatarDataUrl: account.avatarDataUrl ?? "",
        role: membership.role,
        color: membership.color,
        joinedAt: membership.joinedAt,
        isMe: account.id === currentUserId,
      };
    })
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.displayName.localeCompare(b.displayName, "zh-CN"));
}

function publicAI(space: StoredSpace, canManage: boolean): {
  enabled: boolean;
  endpoint: string;
  model: string;
  hasKey: boolean;
  canManage: boolean;
} {
  return {
    enabled: Boolean(space.ai?.enabled),
    endpoint: canManage ? space.ai?.endpoint ?? "" : "",
    model: canManage ? space.ai?.model ?? "" : "",
    hasKey: Boolean(space.ai?.apiKey),
    canManage,
  };
}

function eventSpaceIds(event: StoredEvent): string[] {
  const ids = Array.isArray(event.spaceIds) && event.spaceIds.length ? event.spaceIds : [event.spaceId];
  return uniqueStrings(ids).filter(Boolean);
}

function eventAssignments(event: StoredEvent, spaceId: string): string[] {
  const bySpace = event.assignmentsBySpace && typeof event.assignmentsBySpace === "object"
    ? event.assignmentsBySpace[spaceId]
    : undefined;
  return Array.isArray(bySpace) ? [...bySpace] : spaceId === event.spaceId ? [...event.assignedUserIds] : [];
}

function publicEvent(event: StoredEvent, currentSpaceId = event.spaceId): StoredEvent {
  return {
    ...event,
    spaceId: currentSpaceId,
    spaceIds: eventSpaceIds(event),
    assignmentsBySpace: Object.fromEntries(
      eventSpaceIds(event).map((spaceId) => [spaceId, eventAssignments(event, spaceId)]),
    ),
    assignedUserIds: eventAssignments(event, currentSpaceId),
  };
}

function normalizeEventInput(
  data: AppData,
  context: SpaceContext,
  actorId: string,
  body: Record<string, unknown>,
  existing?: StoredEvent,
  currentSpaceId = context.space.id,
): Pick<StoredEvent,
  | "title" | "startDate" | "startTime" | "endTime" | "allDay"
  | "location" | "placeId" | "placeAddress" | "latitude" | "longitude"
  | "companions" | "notes" | "assignedUserIds"
> {
  const title = cleanText(body.title ?? existing?.title, 100);
  if (!title) throw new HttpError(400, "请输入事项名称");
  const startDate = requireDate(String(body.startDate ?? existing?.startDate ?? ""));
  const allDay = body.allDay === undefined ? Boolean(existing?.allDay) : Boolean(body.allDay);
  const startTime = allDay ? null : normalizeTime(body.startTime ?? existing?.startTime);
  const endTime = allDay ? null : normalizeTime(body.endTime ?? existing?.endTime);
  if (!allDay && !startTime) throw new HttpError(400, "非全天日程需要开始时间");
  if (startTime && endTime && endTime <= startTime) throw new HttpError(400, "结束时间必须晚于开始时间");

  const validMemberIds = new Set(context.members.map((item) => item.userId));
  const previousAssignments = existing ? eventAssignments(existing, currentSpaceId) : [actorId];
  let assignedUserIds = Array.isArray(body.assignedUserIds)
    ? uniqueStrings(body.assignedUserIds.map(String)).filter((id) => validMemberIds.has(id))
    : previousAssignments.filter((id) => validMemberIds.has(id));

  if (context.isAdmin) {
    if (assignedUserIds.length === 0) assignedUserIds = validMemberIds.has(actorId) ? [actorId] : [];
  } else {
    assignedUserIds = [actorId];
  }

  const hasExplicitPlaceId = Object.prototype.hasOwnProperty.call(body, "placeId");
  const explicitPlaceId = body.placeId === null || body.placeId === "" ? null : cleanText(body.placeId, 100);
  const placeId = hasExplicitPlaceId ? explicitPlaceId : existing?.placeId ?? null;
  const preservesExistingSharedPlace = Boolean(existing && placeId && placeId === existing.placeId);
  const place = placeId ? data.places.find((item) => item.id === placeId) : undefined;
  const canUseSelectedPlace = !placeId
    || Boolean(place && (preservesExistingSharedPlace || !hasExplicitPlaceId || placeVisibleInSpace(data, place.id, currentSpaceId)));
  if (hasExplicitPlaceId && !canUseSelectedPlace) throw new HttpError(404, "所选地点不在当前空间的地点库或同步日程中");

  const location = place?.name ?? cleanText(body.location ?? existing?.location, 120);
  const placeAddress = place?.address ?? cleanText(body.placeAddress ?? existing?.placeAddress, 240);
  const latitude = place?.latitude ?? normalizeCoordinate(body.latitude, existing?.latitude ?? null, -90, 90);
  const longitude = place?.longitude ?? normalizeCoordinate(body.longitude, existing?.longitude ?? null, -180, 180);

  return {
    title,
    startDate,
    startTime,
    endTime,
    allDay,
    location,
    placeId: place?.id ?? placeId,
    placeAddress,
    latitude,
    longitude,
    companions: cleanText(body.companions ?? existing?.companions, 160),
    notes: cleanText(body.notes ?? existing?.notes, 1200),
    assignedUserIds,
  };
}

function normalizeEventSpaceIds(data: AppData, actorId: string, currentSpaceId: string, value: unknown): string[] {
  const requested = Array.isArray(value) ? uniqueStrings(value.map(String)) : [currentSpaceId];
  if (!requested.includes(currentSpaceId)) requested.unshift(currentSpaceId);
  const joined = new Set(data.spaceMembers.filter((member) => member.userId === actorId).map((member) => member.spaceId));
  const valid = requested.filter((spaceId) => joined.has(spaceId) && data.spaces.some((space) => space.id === spaceId));
  if (!valid.length) throw new HttpError(400, "至少选择一个你已加入的空间");
  return valid;
}

function buildAssignmentsBySpace(
  data: AppData,
  actorId: string,
  currentSpaceId: string,
  spaceIds: string[],
  currentAssignments: string[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const spaceId of spaceIds) {
    if (spaceId === currentSpaceId) {
      result[spaceId] = [...currentAssignments];
      continue;
    }
    const members = new Set(data.spaceMembers.filter((member) => member.spaceId === spaceId).map((member) => member.userId));
    result[spaceId] = members.has(actorId) ? [actorId] : [];
  }
  return result;
}

function findAccessibleEventSpace(data: AppData, event: StoredEvent, actorId: string): string {
  const joined = new Set(data.spaceMembers.filter((member) => member.userId === actorId).map((member) => member.spaceId));
  const found = eventSpaceIds(event).find((spaceId) => joined.has(spaceId));
  if (!found) throw new HttpError(403, "你无法访问这条日程所在的空间");
  return found;
}

function assertCanManageEvent(context: SpaceContext, event: StoredEvent, actorId: string, currentSpaceId: string): void {
  if (context.isAdmin) return;
  const assignments = eventAssignments(event, currentSpaceId);
  const isOwnSimpleEvent = event.createdBy === actorId && assignments.length === 1 && assignments[0] === actorId;
  if (!isOwnSimpleEvent) throw new HttpError(403, "普通成员只能修改或删除自己的日程");
}

function normalizePlaceInput(body: Record<string, unknown>, existing?: StoredPlace): Pick<StoredPlace,
  "name" | "address" | "latitude" | "longitude" | "category" | "status" | "notes"
> {
  const name = cleanText(body.name ?? existing?.name, 120);
  if (!name) throw new HttpError(400, "请输入地点名称");
  const statusValue = String(body.status ?? existing?.status ?? "wishlist");
  const status: PlaceStatus = statusValue === "planned" ? "planned" : statusValue === "visited" ? "visited" : "wishlist";
  return {
    name,
    address: cleanText(body.address ?? existing?.address, 240),
    latitude: normalizeCoordinate(body.latitude, existing?.latitude ?? null, -90, 90),
    longitude: normalizeCoordinate(body.longitude, existing?.longitude ?? null, -180, 180),
    category: cleanText(body.category ?? existing?.category, 40) || "其他",
    status,
    notes: cleanText(body.notes ?? existing?.notes, 800),
  };
}

function normalizeCoordinate(value: unknown, fallback: number | null, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new HttpError(400, "地点坐标不正确");
  return Math.round(number * 1_000_000) / 1_000_000;
}

function publicPlace(data: AppData, place: StoredPlace, currentUserId: string, viewSpaceId = place.spaceId): StoredPlace & {
  liked: boolean;
  likeCount: number;
  relatedEventCount: number;
  nextEventDate: string | null;
  isLocal: boolean;
  canManage: boolean;
  originSpaceName: string;
} {
  const related = data.events.filter((event) => event.placeId === place.id && eventSpaceIds(event).includes(viewSpaceId));
  const today = localDateString(new Date());
  const next = related.filter((event) => event.startDate >= today).sort(compareEvents)[0];
  const hasPastEvent = related.some((event) => event.startDate < today);
  const effectiveStatus: PlaceStatus = hasPastEvent
    ? "visited"
    : next && place.status === "wishlist"
      ? "planned"
      : place.status;
  const sourceMembership = data.spaceMembers.find((member) => member.spaceId === place.spaceId && member.userId === currentUserId);
  return {
    ...place,
    status: effectiveStatus,
    likedByUserIds: [...place.likedByUserIds],
    liked: place.likedByUserIds.includes(currentUserId),
    likeCount: place.likedByUserIds.length,
    relatedEventCount: related.length,
    nextEventDate: next?.startDate ?? null,
    isLocal: place.spaceId === viewSpaceId,
    canManage: Boolean(sourceMembership && (sourceMembership.role === "owner" || sourceMembership.role === "admin" || place.createdBy === currentUserId)),
    originSpaceName: data.spaces.find((space) => space.id === place.spaceId)?.name ?? "其他空间",
  };
}

function normalizeActivityInput(body: Record<string, unknown>, existing?: StoredActivity): Pick<StoredActivity,
  "title" | "category" | "tag" | "notes"
> {
  const title = cleanText(body.title ?? existing?.title, 120);
  if (!title) throw new HttpError(400, "请输入活动名称");
  return {
    title,
    category: cleanText(body.category ?? existing?.category, 40) || "其他",
    tag: cleanText(body.tag ?? existing?.tag, 40),
    notes: cleanText(body.notes ?? existing?.notes, 800),
  };
}

function publicActivity(data: AppData, activity: StoredActivity, currentUserId: string): StoredActivity & {
  liked: boolean;
  likeCount: number;
  canManage: boolean;
} {
  const membership = data.spaceMembers.find(
    (member) => member.spaceId === activity.spaceId && member.userId === currentUserId,
  );
  return {
    ...activity,
    likedByUserIds: [...activity.likedByUserIds],
    liked: activity.likedByUserIds.includes(currentUserId),
    likeCount: activity.likedByUserIds.length,
    canManage: Boolean(
      membership
      && (membership.role === "owner" || membership.role === "admin" || activity.createdBy === currentUserId)
    ),
  };
}

async function recommendPlan(
  data: AppData,
  context: SpaceContext,
  actorId: string,
  body: {
    memberIds?: string[];
    slots?: Array<{ date?: string; startTime?: string; endTime?: string }>;
    placeIds?: string[];
    activities?: Array<{ id?: string; title?: string; category?: string; tag?: string; builtin?: boolean }>;
    preference?: string;
  },
): Promise<{
  slot: { date: string; startTime: string; endTime: string };
  place: ReturnType<typeof publicPlace> | null;
  activity: (ReturnType<typeof publicActivity> | { id: string; title: string; category: string; tag: string; builtin: true }) | null;
  title: string;
  reason: string;
  mode: "rules" | "ai";
}> {
  const validMemberIds = new Set(context.members.map((member) => member.userId));
  let memberIds = Array.isArray(body.memberIds)
    ? uniqueStrings(body.memberIds.map(String)).filter((id) => validMemberIds.has(id))
    : [actorId];
  if (!context.isAdmin) memberIds = [actorId];
  if (!memberIds.length) memberIds = [actorId];

  const slots = (Array.isArray(body.slots) ? body.slots : [])
    .slice(0, 60)
    .map((slot) => {
      const date = isDateString(String(slot.date ?? "")) ? String(slot.date) : "";
      const startTime = safeNormalizeTime(slot.startTime);
      const endTime = safeNormalizeTime(slot.endTime);
      return date && startTime && endTime && endTime > startTime ? { date, startTime, endTime } : null;
    })
    .filter((slot): slot is { date: string; startTime: string; endTime: string } => Boolean(slot));
  if (!slots.length) throw new HttpError(400, "没有可用于规划的共同空闲时段");

  const requestedPlaceIds = Array.isArray(body.placeIds) ? uniqueStrings(body.placeIds.map(String)) : [];
  const places = data.places.filter((place) =>
    placeVisibleInSpace(data, place.id, context.space.id)
    && (!requestedPlaceIds.length || requestedPlaceIds.includes(place.id))
  );

  const suppliedActivities = (Array.isArray(body.activities) ? body.activities : []).slice(0, 120);
  const activities = suppliedActivities.map((candidate, index) => {
    const id = cleanText(candidate.id, 100) || `client-${index + 1}`;
    const stored = data.activities.find((activity) => activity.id === id && activity.spaceId === context.space.id);
    if (stored) return { kind: "stored" as const, value: stored };
    const title = cleanText(candidate.title, 120);
    if (!title) return null;
    return {
      kind: "builtin" as const,
      value: {
        id,
        title,
        category: cleanText(candidate.category, 40) || "其他",
        tag: cleanText(candidate.tag, 40),
        builtin: true as const,
      },
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const selectedMembers = new Set(memberIds);
  const placeScore = (place: StoredPlace): number => {
    const memberLikes = place.likedByUserIds.filter((id) => selectedMembers.has(id)).length;
    const statusBonus = place.status === "wishlist" ? 2.2 : place.status === "planned" ? 1.3 : 0.8;
    return 1 + memberLikes * 4 + place.likedByUserIds.length * 0.7 + statusBonus;
  };
  const activityScore = (candidate: typeof activities[number]): number => {
    if (candidate.kind === "builtin") return 1;
    const memberLikes = candidate.value.likedByUserIds.filter((id) => selectedMembers.has(id)).length;
    return 1 + memberLikes * 4 + candidate.value.likedByUserIds.length * 0.7;
  };

  const deterministic = () => {
    const slot = randomChoiceCrypto(slots);
    const placeStored = places.length ? weightedRandomCrypto(places, placeScore) : null;
    const activityCandidate = activities.length ? weightedRandomCrypto(activities, activityScore) : null;
    const place = placeStored ? publicPlace(data, placeStored, actorId, context.space.id) : null;
    const activity = activityCandidate
      ? activityCandidate.kind === "stored"
        ? publicActivity(data, activityCandidate.value, actorId)
        : activityCandidate.value
      : null;
    const activityTitle = activity?.title ?? "自由安排";
    const title = place && activity ? `${place.name} · ${activityTitle}` : place?.name ?? activityTitle;
    return {
      slot,
      place,
      activity,
      title,
      reason: buildRuleRecommendationReason(data, context.space.id, memberIds, placeStored, activityCandidate),
      mode: "rules" as const,
    };
  };

  const fallback = deterministic();
  const ai = context.space.ai;
  if (!ai?.enabled || !ai.endpoint || !ai.model || !ai.apiKey) return fallback;

  try {
    const profile = buildPlannerPreferenceProfile(data, context.space.id, memberIds);
    const slotOptions = slots.slice(0, 30).map((slot, index) => ({ index, ...slot }));
    const placeOptions = places.slice(0, 30).map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      status: place.status,
      votes: place.likedByUserIds.filter((id) => selectedMembers.has(id)).length,
    }));
    const activityOptions = activities.slice(0, 50).map((candidate) => candidate.kind === "stored"
      ? {
          id: candidate.value.id,
          title: candidate.value.title,
          category: candidate.value.category,
          tag: candidate.value.tag,
          votes: candidate.value.likedByUserIds.filter((id) => selectedMembers.has(id)).length,
        }
      : { ...candidate.value, votes: 0 });
    const prompt = [
      "你是私人共享日历中的活动规划助手。请基于共同空闲时间、成员投票和历史偏好，从给定候选中选一个自然、有趣但不过度复杂的计划。",
      "只能返回 JSON，不得编造候选之外的 slotIndex、placeId 或 activityId。地点和活动都允许为 null。",
      `成员偏好摘要：${profile}`,
      `用户补充偏好：${cleanText(body.preference, 240) || "无"}`,
      `可选时间：${JSON.stringify(slotOptions)}`,
      `可选地点：${JSON.stringify(placeOptions)}`,
      `可选活动：${JSON.stringify(activityOptions)}`,
      '返回字段：{"slotIndex":0,"placeId":"或null","activityId":"或null","title":"计划标题","reason":"一句简短理由"}',
    ].join("\n");
    const aiResult = await callAIJson(ai, prompt);
    const slotIndex = normalizeInteger(aiResult.slotIndex, 0, slotOptions.length - 1) ?? -1;
    if (slotIndex < 0) return fallback;
    const placeId = aiResult.placeId == null ? null : cleanText(aiResult.placeId, 100);
    const activityId = aiResult.activityId == null ? null : cleanText(aiResult.activityId, 100);
    const placeStored = placeId ? places.find((place) => place.id === placeId) ?? null : null;
    const activityCandidate = activityId
      ? activities.find((candidate) => candidate.value.id === activityId) ?? null
      : null;
    const place = placeStored ? publicPlace(data, placeStored, actorId, context.space.id) : null;
    const activity = activityCandidate
      ? activityCandidate.kind === "stored"
        ? publicActivity(data, activityCandidate.value, actorId)
        : activityCandidate.value
      : null;
    const defaultTitle = place && activity
      ? `${place.name} · ${activity.title}`
      : place?.name ?? activity?.title ?? "一起安排点有意思的事";
    return {
      slot: slots[slotIndex],
      place,
      activity,
      title: cleanText(aiResult.title, 100) || defaultTitle,
      reason: cleanText(aiResult.reason, 240) || "根据共同空闲时间和空间偏好生成。",
      mode: "ai",
    };
  } catch (error) {
    console.warn("AI planner fallback:", error);
    return fallback;
  }
}

function buildRuleRecommendationReason(
  data: AppData,
  spaceId: string,
  memberIds: string[],
  place: StoredPlace | null,
  activity: { kind: "stored"; value: StoredActivity } | { kind: "builtin"; value: { category: string } } | null,
): string {
  const memberSet = new Set(memberIds);
  const parts = ["已避开所选成员现有日程"];
  if (place) {
    const votes = place.likedByUserIds.filter((id) => memberSet.has(id)).length;
    parts.push(votes ? `地点有 ${votes} 位参与成员想去` : place.status === "wishlist" ? "地点来自想去清单" : "地点来自空间地点库");
  }
  if (activity?.kind === "stored") {
    const votes = activity.value.likedByUserIds.filter((id) => memberSet.has(id)).length;
    parts.push(votes ? `活动有 ${votes} 位参与成员点赞` : "活动来自空间活动库");
  } else if (activity) {
    parts.push(`活动来自${activity.value.category}灵感库`);
  }
  const pastCount = data.events.filter(
    (event) => eventSpaceIds(event).includes(spaceId) && event.startDate < localDateString(new Date())
      && eventAssignments(event, spaceId).some((id) => memberSet.has(id)),
  ).length;
  if (pastCount) parts.push("参考了空间过往安排");
  return `${parts.join("，")}。`;
}

function buildPlannerPreferenceProfile(data: AppData, spaceId: string, memberIds: string[]): string {
  const memberSet = new Set(memberIds);
  const categoryCounts = new Map<string, number>();
  const add = (category: string, weight = 1) => {
    const key = cleanText(category, 40) || "其他";
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + weight);
  };
  for (const place of data.places.filter((item) => placeVisibleInSpace(data, item.id, spaceId))) {
    const likes = place.likedByUserIds.filter((id) => memberSet.has(id)).length;
    if (likes) add(`地点:${place.category}`, likes * 3);
    if (place.status === "visited") add(`去过:${place.category}`, 1);
  }
  for (const activity of data.activities.filter((item) => item.spaceId === spaceId)) {
    const likes = activity.likedByUserIds.filter((id) => memberSet.has(id)).length;
    if (likes) add(`活动:${activity.category}`, likes * 3);
  }
  const recentTitles = data.events
    .filter((event) => eventSpaceIds(event).includes(spaceId) && eventAssignments(event, spaceId).some((id) => memberSet.has(id)))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 20)
    .map((event) => event.title);
  const ranked = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key]) => key);
  return `偏好标签：${ranked.join("、") || "暂无明显偏好"}；近期安排：${recentTitles.join("、") || "暂无历史记录"}`;
}

async function callAIJson(ai: SpaceAISettings, prompt: string): Promise<Record<string, unknown>> {
  const endpoint = normalizeChatEndpoint(ai.endpoint);
  const requestBody: Record<string, unknown> = {
    model: ai.model,
    messages: [
      { role: "system", content: "你只输出合法 JSON 对象。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.25,
    response_format: { type: "json_object" },
  };
  let response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ai.apiKey}` },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok && response.status === 400) {
    delete requestBody.response_format;
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify(requestBody),
    });
  }
  if (!response.ok) throw new Error(`AI 接口调用失败（${response.status}）`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = parseJsonObject(payload.choices?.[0]?.message?.content ?? "");
  if (!parsed) throw new Error("AI 返回格式不正确");
  return parsed;
}

function safeNormalizeTime(value: unknown): string | null {
  try {
    return normalizeTime(value);
  } catch {
    return null;
  }
}

function randomChoiceCrypto<T>(items: T[]): T {
  if (!items.length) throw new HttpError(400, "没有可选项");
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return items[bytes[0] % items.length];
}

function weightedRandomCrypto<T>(items: T[], weight: (item: T) => number): T {
  if (!items.length) throw new HttpError(400, "没有可选项");
  const weights = items.map((item) => Math.max(0.01, Number(weight(item)) || 0.01));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff * total;
  let cursor = random;
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return items[index];
  }
  return items[items.length - 1];
}

function placeVisibleInSpace(data: AppData, placeId: string, spaceId: string): boolean {
  const place = data.places.find((item) => item.id === placeId);
  if (!place) return false;
  return place.spaceId === spaceId
    || data.events.some((event) => event.placeId === placeId && eventSpaceIds(event).includes(spaceId));
}

function findAccessiblePlaceSpace(data: AppData, place: StoredPlace, actorId: string): string {
  const joined = new Set(data.spaceMembers.filter((member) => member.userId === actorId).map((member) => member.spaceId));
  if (joined.has(place.spaceId)) return place.spaceId;
  const linkedSpace = data.events
    .filter((event) => event.placeId === place.id)
    .flatMap((event) => eventSpaceIds(event))
    .find((spaceId) => joined.has(spaceId));
  if (!linkedSpace) throw new HttpError(403, "你无法访问这个地点");
  return linkedSpace;
}

function touchPlaceForEvent(data: AppData, event: StoredEvent): void {
  if (!event.placeId) return;
  const place = data.places.find((item) => item.id === event.placeId);
  if (!place) return;
  const today = localDateString(new Date());
  if (event.startDate < today) place.status = "visited";
  else if (place.status !== "visited") place.status = "planned";
  place.updatedAt = new Date().toISOString();
}

function normalizeEventSource(value: unknown): EventSource {
  return value === "ai" ? "ai" : value === "rules" ? "rules" : "manual";
}

function parseWithRules(
  text: string,
  anchorYear: number,
  anchorMonth: number,
  referenceDate: string,
  members: PublicMember[],
  actorId: string,
  isAdmin: boolean,
): EventDraft | null {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const dateResult = parseNaturalDate(normalizedText, anchorYear, anchorMonth, referenceDate);
  if (!dateResult) return null;
  const timeResult = parseNaturalTime(normalizedText);
  const matchedMemberIds = members
    .filter((member) => containsMemberName(normalizedText, member))
    .map((member) => member.id);
  let assignedUserIds = isAdmin && matchedMemberIds.length > 0 ? matchedMemberIds : [actorId];
  assignedUserIds = uniqueStrings(assignedUserIds);

  const location = extractLocation(normalizedText);
  const companions = extractExternalCompanions(normalizedText, members);
  const title = deriveTitle(normalizedText, dateResult.matchedText, timeResult.matchedTexts, location, companions, members, isAdmin);

  return {
    title: title || "新日程",
    date: dateResult.date,
    startTime: timeResult.startTime,
    endTime: timeResult.endTime,
    allDay: !timeResult.startTime,
    location,
    companions,
    notes: "",
    assignedUserIds,
    source: "rules",
    explanation: `${dateResult.explanation}${timeResult.explanation ? `；${timeResult.explanation}` : "；未提到时间，按全天处理"}`,
  };
}

async function parseWithAI(
  text: string,
  context: SpaceContext,
  members: PublicMember[],
  actorId: string,
  anchorYear: number,
  anchorMonth: number,
  referenceDate: string,
): Promise<EventDraft | null> {
  const ai = context.space.ai;
  if (!ai?.enabled || !ai.apiKey) return null;
  const memberLines = members.map((member) => `${member.displayName}(@${member.username}, id=${member.id})`).join("、");
  const actor = members.find((member) => member.id === actorId);
  const permissionText = context.isAdmin
    ? "当前用户是空间管理员，可以给一个或多个空间成员创建日程。"
    : `当前用户是普通成员，只能给自己创建日程；assignedUserIds 必须仅为 ${actorId}。`;
  const prompt = [
    "你是共享日历的结构化解析器。只返回一个 JSON 对象，不要解释。",
    `当前参考日期：${referenceDate}。当前正在查看：${anchorYear}年${anchorMonth}月。`,
    "规则：只说‘几号’时使用当前查看月份；说‘几月几号’时使用当前年份；‘周几’是参考日期所在周；‘下周几’加一周；‘下下周几’加两周。",
    permissionText,
    `当前用户：${actor?.displayName ?? actorId}。空间成员：${memberLines}。`,
    "字段：title,date(YYYY-MM-DD),startTime(HH:mm或null),endTime(HH:mm或null),allDay,location,companions,notes,assignedUserIds。",
    "必须完整理解中文或数字时间。例如‘下午三点到五点’必须返回 startTime=15:00、endTime=17:00；只说开始时间时才默认一小时。",
    "location 只写地点名称，不要把活动动作混入地点；外部朋友只写进 companions，不要编造用户 ID。",
    `用户输入：${text}`,
  ].join("\n");

  const endpoint = normalizeChatEndpoint(ai.endpoint);
  const requestBody = {
    model: ai.model,
    messages: [
      { role: "system", content: "你只输出合法 JSON。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  };

  let response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok && response.status === 400) {
    const fallbackBody = { ...requestBody } as Record<string, unknown>;
    delete fallbackBody.response_format;
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify(fallbackBody),
    });
  }

  if (!response.ok) throw new HttpError(502, `AI 接口调用失败（${response.status}）`);
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, "AI 没有返回可解析内容");
  const parsed = parseJsonObject(content);
  if (!parsed) throw new HttpError(502, "AI 返回格式不是有效 JSON");

  const validIds = new Set(members.map((member) => member.id));
  let assignedUserIds = Array.isArray(parsed.assignedUserIds)
    ? uniqueStrings(parsed.assignedUserIds.map(String)).filter((id) => validIds.has(id))
    : [actorId];
  if (!context.isAdmin) assignedUserIds = [actorId];
  if (assignedUserIds.length === 0) assignedUserIds = [actorId];
  const date = isDateString(String(parsed.date ?? "")) ? String(parsed.date) : null;
  if (!date) return null;
  const startTime = normalizeTime(parsed.startTime);
  const endTime = normalizeTime(parsed.endTime);
  const allDay = Boolean(parsed.allDay) || !startTime;
  return {
    title: cleanText(parsed.title, 100) || "新日程",
    date,
    startTime: allDay ? null : startTime,
    endTime: allDay ? null : endTime,
    allDay,
    location: cleanText(parsed.location, 120),
    companions: cleanText(parsed.companions, 160),
    notes: cleanText(parsed.notes, 1200),
    assignedUserIds,
    source: "ai",
    explanation: "由空间 AI 解析，保存前请确认日期、时间范围、成员和地点。",
  };
}

async function planCookingWithAI(
  context: SpaceContext,
  body: {
    diners?: number;
    serveAt?: string;
    burners?: number;
    dishes?: unknown[];
    rulePlan?: unknown;
  },
): Promise<CookingPlanResult> {
  const ai = context.space.ai;
  if (!ai?.enabled || !ai.apiKey) throw new HttpError(409, "当前空间没有可用的 AI 配置");
  const diners = normalizeInteger(body.diners, 1, 20) ?? 4;
  const serveAt = body.serveAt ? normalizeTime(body.serveAt) : "18:30";
  if (!serveAt) throw new HttpError(400, "开饭时间不正确");
  const burners = normalizeInteger(body.burners, 1, 4) ?? 2;
  const dishes = Array.isArray(body.dishes)
    ? body.dishes.slice(0, 16).map((item, index) => normalizeCookingDish(item, index)).filter(Boolean)
    : [];
  if (dishes.length === 0) throw new HttpError(400, "请先生成菜单");

  const rulePlan = normalizeCookingRulePlan(body.rulePlan, serveAt, burners);
  const prompt = [
    "你是家庭厨房烹饪排程助手。请在给定规则排程基础上优化顺序和并行关系，只返回合法 JSON，不要输出 Markdown。",
    `用餐人数：${diners}人；开饭时间：${serveAt}；可用灶台：${burners}个。`,
    "目标：饭菜尽量同时完成；汤、炖菜、米饭先启动；叶菜和快炒菜临近开饭再做；生熟刀板分开；肉类和水产必须完全熟透。",
    "不得缩短到低于合理熟制时间，不得让同一个灶台、蒸锅、烤箱或备菜台的任务发生重叠。等待/腌制任务可与其他任务并行。",
    "返回字段：summary,totalMinutes,startClock,tips,tasks。tasks 每项字段：id,label,dish,lane,startMinute,endMinute,note。startMinute 从开始备菜算起，必须 >=0，endMinute 必须大于 startMinute。",
    `菜单：${JSON.stringify(dishes)}`,
    `规则排程：${JSON.stringify(rulePlan)}`,
  ].join("\n");

  const endpoint = normalizeChatEndpoint(ai.endpoint);
  const requestBody: Record<string, unknown> = {
    model: ai.model,
    messages: [
      { role: "system", content: "你只输出一个合法 JSON 对象。" },
      { role: "user", content: prompt },
    ],
    temperature: 0.15,
    response_format: { type: "json_object" },
  };

  let response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ai.apiKey}` },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok && response.status === 400) {
    delete requestBody.response_format;
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ai.apiKey}` },
      body: JSON.stringify(requestBody),
    });
  }
  if (!response.ok) throw new HttpError(502, `AI 烹饪排程调用失败（${response.status}）`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, "AI 没有返回烹饪排程");
  const parsed = parseJsonObject(content);
  if (!parsed) throw new HttpError(502, "AI 烹饪排程不是有效 JSON");

  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.slice(0, 80).map((item, index) => normalizeCookingTask(item, index)).filter((item): item is CookingPlanTask => Boolean(item))
    : [];
  if (tasks.length === 0) throw new HttpError(502, "AI 没有返回有效的烹饪步骤");
  const maxEnd = Math.max(...tasks.map((task) => task.endMinute));
  const totalMinutes = normalizeInteger(parsed.totalMinutes, maxEnd, 600) ?? maxEnd;
  const startClock = safeCookingClock(parsed.startClock) ?? safeCookingClock(rulePlan.startClock) ?? serveAt;
  const tips = Array.isArray(parsed.tips)
    ? parsed.tips.slice(0, 8).map((item) => cleanText(item, 180)).filter(Boolean)
    : [];
  return {
    source: "ai",
    serveAt,
    burners,
    startClock,
    totalMinutes: Math.max(totalMinutes, maxEnd),
    summary: cleanText(parsed.summary, 320) || "AI 已根据菜品耗时、锅具和开饭时间优化烹饪顺序。",
    tips: tips.length ? tips : ["按甘特图从上到下准备，快炒菜临近开饭再下锅。"],
    tasks,
  };
}

function normalizeCookingDish(value: unknown, index: number): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const name = cleanText(item.name, 100);
  if (!name) return null;
  const steps = Array.isArray(item.steps)
    ? item.steps.slice(0, 10).map((step) => cleanText(step, 260)).filter(Boolean)
    : [];
  return {
    id: cleanText(item.id, 100) || `dish-${index + 1}`,
    name,
    category: cleanText(item.category, 30),
    equipment: cleanText(item.equipment, 40),
    prepMinutes: normalizeInteger(item.prepMinutes, 1, 180) ?? 10,
    cookMinutes: normalizeInteger(item.cookMinutes, 1, 240) ?? 15,
    passiveMinutes: normalizeInteger(item.passiveMinutes, 0, 240) ?? 0,
    steps,
    safety: cleanText(item.safety, 240),
  };
}

function normalizeCookingRulePlan(value: unknown, serveAt: string, burners: number): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { serveAt, burners, startClock: serveAt, totalMinutes: 90, tasks: [] };
  }
  const input = value as Record<string, unknown>;
  const tasks = Array.isArray(input.tasks)
    ? input.tasks.slice(0, 80).map((item, index) => normalizeCookingTask(item, index)).filter(Boolean)
    : [];
  const maxEnd = tasks.length ? Math.max(...tasks.map((task) => task?.endMinute ?? 0)) : 90;
  return {
    serveAt,
    burners,
    startClock: safeCookingClock(input.startClock) ?? serveAt,
    totalMinutes: normalizeInteger(input.totalMinutes, 1, 600) ?? maxEnd,
    summary: cleanText(input.summary, 300),
    tips: Array.isArray(input.tips) ? input.tips.slice(0, 8).map((item) => cleanText(item, 160)).filter(Boolean) : [],
    tasks,
  };
}

function normalizeCookingTask(value: unknown, index: number): CookingPlanTask | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const label = cleanText(item.label, 120);
  const lane = cleanText(item.lane, 40);
  const startMinute = normalizeInteger(item.startMinute, 0, 600);
  const endMinute = normalizeInteger(item.endMinute, 1, 600);
  if (!label || !lane || startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  return {
    id: cleanText(item.id, 100) || `task-${index + 1}`,
    label,
    dish: cleanText(item.dish, 100),
    lane,
    startMinute,
    endMinute,
    note: cleanText(item.note, 240),
  };
}

function safeCookingClock(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(raw)) return null;
  const [hour, minute] = raw.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseNaturalDate(
  text: string,
  anchorYear: number,
  anchorMonth: number,
  referenceDate: string,
): { date: string; matchedText: string; explanation: string } | null {
  const fullMatch = text.match(/(?:(\d{4}|[二〇零一二三四五六七八九]{4})年)?\s*(\d{1,2}|[一二两三四五六七八九十]{1,3})月\s*(\d{1,2}|[一二两三四五六七八九十]{1,3})(?:日|号)/);
  if (fullMatch) {
    const year = fullMatch[1] ? parseChineseNumber(fullMatch[1]) : anchorYear;
    const month = parseChineseNumber(fullMatch[2]);
    const day = parseChineseNumber(fullMatch[3]);
    const date = safeDateString(year, month, day);
    if (!date) throw new HttpError(400, `${year}年${month}月没有${day}号`);
    return {
      date,
      matchedText: fullMatch[0],
      explanation: fullMatch[1] ? `识别为 ${date}` : `未说年份，按当前查看年份 ${year} 年，识别为 ${date}`,
    };
  }

  const relativeMatch = text.match(/今天|明天|后天/);
  if (relativeMatch) {
    const offset = relativeMatch[0] === "今天" ? 0 : relativeMatch[0] === "明天" ? 1 : 2;
    const base = parseLocalDate(referenceDate);
    base.setDate(base.getDate() + offset);
    const date = localDateString(base);
    return { date, matchedText: relativeMatch[0], explanation: `${relativeMatch[0]}识别为 ${date}` };
  }

  const weekdayMatch = text.match(/(下下周|下周|本周|这周|周|星期)([一二三四五六日天1-7])/);
  if (weekdayMatch) {
    const prefix = weekdayMatch[1];
    const weekday = chineseWeekdayToNumber(weekdayMatch[2]);
    const base = parseLocalDate(referenceDate);
    const currentDay = base.getDay() === 0 ? 7 : base.getDay();
    const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - currentDay + 1);
    const weekOffset = prefix === "下周" ? 7 : prefix === "下下周" ? 14 : 0;
    monday.setDate(monday.getDate() + weekOffset + weekday - 1);
    const date = localDateString(monday);
    const label = prefix === "周" || prefix === "星期" ? "本周" : prefix;
    return { date, matchedText: weekdayMatch[0], explanation: `${weekdayMatch[0]}按${label}定位为 ${date}` };
  }

  const dayOnlyMatch = text.match(/(\d{1,2}|[一二两三四五六七八九十]{1,3})(?:日|号)/);
  if (dayOnlyMatch) {
    const day = parseChineseNumber(dayOnlyMatch[1]);
    const date = safeDateString(anchorYear, anchorMonth, day);
    if (!date) throw new HttpError(400, `${anchorYear}年${anchorMonth}月没有${day}号`);
    return {
      date,
      matchedText: dayOnlyMatch[0],
      explanation: `只说了${day}号，按当前查看月份 ${anchorYear}年${anchorMonth}月，识别为 ${date}`,
    };
  }

  return null;
}

function parseNaturalTime(text: string): {
  startTime: string | null;
  endTime: string | null;
  matchedTexts: string[];
  explanation: string;
} {
  const timePattern = /(凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)?\s*(\d{1,2}|[零〇一二两三四五六七八九十]{1,3})(?:(?:[:：](\d{1,2}))|(?:点|时)(半|一刻|三刻|(?:\d{1,2}|[零〇一二两三四五六七八九十]{1,3})分?)?)/g;
  const matches = [...text.matchAll(timePattern)];
  if (matches.length === 0) return { startTime: null, endTime: null, matchedTexts: [], explanation: "" };
  const firstPeriod = matches[0][1] ?? "";
  const first = parseTimeMatch(matches[0]);
  if (!first) return { startTime: null, endTime: null, matchedTexts: [], explanation: "" };
  let end: string | null = null;
  let explicitRange = false;
  if (matches.length > 1) {
    const between = text.slice((matches[0].index ?? 0) + matches[0][0].length, matches[1].index ?? 0);
    if (/到|至|[-—~～]/.test(between)) {
      end = parseTimeMatch(matches[1], firstPeriod);
      explicitRange = Boolean(end);
    }
  }
  if (!end) end = addMinutesToTime(first, 60);
  return {
    startTime: first,
    endTime: end,
    matchedTexts: explicitRange ? [matches[0][0], matches[1][0]] : [matches[0][0]],
    explanation: explicitRange ? `时间范围识别为 ${first}–${end}` : `开始时间识别为 ${first}，未说结束时间，默认到 ${end}`,
  };
}

function parseTimeMatch(match: RegExpMatchArray, inheritedPeriod = ""): string | null {
  const period = match[1] ?? inheritedPeriod;
  let hour = parseChineseNumber(match[2]);
  let minute = 0;
  if (match[3]) minute = Number(match[3]);
  else if (match[4] === "半") minute = 30;
  else if (match[4] === "一刻") minute = 15;
  else if (match[4] === "三刻") minute = 45;
  else if (match[4]) minute = parseChineseNumber(match[4].replace(/分$/, ""));
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  if (["下午", "傍晚", "晚上", "夜里"].includes(period) && hour < 12) hour += 12;
  if (period === "中午" && hour < 11) hour += 12;
  if (period === "凌晨" && hour === 12) hour = 0;
  if (["早上", "上午"].includes(period) && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseChineseNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (/^[二〇零一三四五六七八九]{4}$/.test(value)) {
    return Number([...value].map((char) => digits[char]).join(""));
  }
  if (value === "十") return 10;
  const tenIndex = value.indexOf("十");
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : digits[value[tenIndex - 1]] ?? 0;
    const ones = tenIndex === value.length - 1 ? 0 : digits[value[tenIndex + 1]] ?? 0;
    return tens * 10 + ones;
  }
  return [...value].reduce((number, char) => number * 10 + (digits[char] ?? 0), 0);
}

function deriveTitle(
  text: string,
  dateMatched: string,
  timeMatched: string[],
  location: string,
  companions: string,
  members: PublicMember[],
  isAdmin: boolean,
): string {
  let result = text;
  if (dateMatched) result = result.replace(dateMatched, " ");
  for (const item of timeMatched) result = result.replace(item, " ");
  result = result
    .replace(/(?:从|到|至)\s*(?:凌晨|早上|上午|中午|下午|傍晚|晚上|夜里)?\s*(?:\d{1,2}|[零〇一二两三四五六七八九十]{1,3})(?:[:：点时](?:\d{0,2}|[零〇一二两三四五六七八九十]{0,3}))?\s*(?:分|半|一刻|三刻)?/g, " ")
    .replace(/(?:地点(?:是|在)?|地址(?:是|在)?)[：:]?\s*[^，。,；;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (location) result = result.replace(new RegExp(`(?:地点(?:是|在)?|地址(?:是|在)?|去|到|在)\\s*${escapeRegExp(location)}`), " ");
  if (companions) result = result.replace(new RegExp(`(?:和|跟|同)\\s*${escapeRegExp(companions)}(?:一起)?`, "g"), " ");
  if (isAdmin) {
    for (const member of members) {
      result = result
        .replace(new RegExp(escapeRegExp(member.displayName), "g"), " ")
        .replace(new RegExp(`@${escapeRegExp(member.username)}`, "g"), " ");
    }
    result = result.replace(/(?:给|为|和|与|及|、)+/g, " ").replace(/安排|创建(?:一个)?日程/g, " ");
  }
  result = result
    .replace(/(?:^|\s)(?:从|到|至)(?=\s|$)/g, " ")
    .replace(/[，,。；;：:]+/g, " ")
    .replace(/^\s*(?:我要|我想|记一下|添加|新增)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return result.slice(0, 100);
}

function extractLocation(text: string): string {
  const explicit = text.match(/(?:地点|地址)(?:是|在)?[：:]?\s*([^，。,；;]+)/);
  if (explicit) return cleanText(explicit[1], 120);

  const actionWords = [
    "吃饭", "聚餐", "看电影", "看展", "参观", "逛街", "散步", "打球", "健身", "爬山",
    "露营", "野餐", "野炊", "做饭", "唱歌", "拍照", "开会", "集合", "见面", "碰面", "玩",
  ];
  const actionPattern = actionWords.map(escapeRegExp).join("|");
  const goMatch = text.match(new RegExp(`去\\s*([^，。,；;]{2,50}?)(?=(?:${actionPattern})|[，。,；;]|$)`));
  const otherMatch = text.match(new RegExp(`(?:在|到)\\s*([^，。,；;]{2,50}?)(?=(?:${actionPattern})|[，。,；;]|$)`));
  const raw = cleanText(goMatch?.[1] ?? otherMatch?.[1], 120);
  if (!raw) return "";
  if (actionWords.some((word) => raw === word || raw === `一起${word}`)) return "";
  return raw.replace(/^(?:一起|我们|大家)\s*/, "").trim();
}

function extractExternalCompanions(text: string, members: PublicMember[]): string {
  const match = text.match(/(?:和|跟|同)([^，。,；;]{1,40}?)(?:一起)?(?:去|到|在|吃|看|玩|打|逛|参加|见|$)/);
  if (!match) return "";
  let candidate = cleanText(match[1], 80);
  for (const member of members) {
    candidate = candidate.replace(new RegExp(escapeRegExp(member.displayName), "g"), "");
    candidate = candidate.replace(new RegExp(`@${escapeRegExp(member.username)}`, "g"), "");
  }
  candidate = candidate.replace(/[、,，和跟与及\s]+$/g, "").trim();
  return candidate;
}

function containsMemberName(text: string, member: PublicMember): boolean {
  return text.includes(member.displayName) || text.includes(`@${member.username}`);
}

function requireSpaceContext(data: AppData, userId: string, spaceId: string): SpaceContext {
  const space = data.spaces.find((item) => item.id === spaceId);
  const membership = data.spaceMembers.find((item) => item.spaceId === spaceId && item.userId === userId);
  if (!space || !membership) throw new HttpError(404, "空间不存在或你尚未加入");
  const members = data.spaceMembers.filter((item) => item.spaceId === spaceId);
  return {
    space,
    membership,
    members,
    isAdmin: membership.role === "owner" || membership.role === "admin",
  };
}

function requireSpaceAdmin(context: SpaceContext): void {
  if (!context.isAdmin) throw new HttpError(403, "需要空间管理员权限");
}

function requirePlatformAdmin(user: SessionUser): void {
  if (!user.isPlatformAdmin) throw new HttpError(403, "需要平台管理员权限");
}

function requireUserInData(data: AppData, userId: string): StoredUser {
  const user = data.users.find((item) => item.id === userId);
  if (!user) throw new HttpError(401, "账号不存在");
  return user;
}

async function requireUser(request: Request, env: Env): Promise<{ user: SessionUser; data: AppData }> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) throw new HttpError(401, "请先登录");
  const tokenHash = await sha256Hex(token);
  const { data } = await loadData(env);
  const now = new Date().toISOString();
  const session = data.sessions.find((item) => item.tokenHash === tokenHash && item.expiresAt > now);
  if (!session) throw new HttpError(401, "登录状态已过期");
  const stored = requireUserInData(data, session.userId);
  if (stored.disabled) throw new HttpError(403, "账号已被停用");
  return { user: toSessionUser(stored), data };
}

function toSessionUser(user: StoredUser): SessionUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarDataUrl: user.avatarDataUrl ?? "",
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

function suggestColor(data: AppData, spaceId: string): string {
  const used = data.spaceMembers.filter((item) => item.spaceId === spaceId).map((item) => item.color.toUpperCase());
  const available = DEFAULT_COLORS.find((color) => !used.includes(color.toUpperCase()));
  if (available) return available;
  const hue = (used.length * 47 + 23) % 360;
  return hslToHex(hue, 62, 56);
}

function assertColorAvailable(data: AppData, spaceId: string, userId: string, color: string): void {
  const conflicts = data.spaceMembers
    .filter((item) => item.spaceId === spaceId && item.userId !== userId)
    .find((item) => colorDistance(item.color, color) < 48);
  if (conflicts) {
    const account = data.users.find((item) => item.id === conflicts.userId);
    throw new HttpError(409, `这个颜色与${account?.displayName ?? "其他成员"}太接近，请换一个`);
  }
}

function normalizeColor(value: unknown): string {
  const color = String(value ?? "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(color)) throw new HttpError(400, "颜色格式不正确");
  return color;
}

function colorDistance(a: string, b: string): number {
  const aa = hexToRgb(a);
  const bb = hexToRgb(b);
  return Math.sqrt((aa[0] - bb[0]) ** 2 + (aa[1] - bb[1]) ** 2 + (aa[2] - bb[2]) ** 2);
}

function hexToRgb(hex: string): [number, number, number] {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return `#${rgb.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function roleRank(role: SpaceRole): number {
  return role === "owner" ? 0 : role === "admin" ? 1 : 2;
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeChatEndpoint(endpoint: string): string {
  const clean = endpoint.replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(clean)) return clean;
  if (/\/v1$/i.test(clean)) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
}

function cleanEndpoint(value: unknown): string {
  const endpoint = String(value ?? "").trim().replace(/\/+$/, "");
  if (!endpoint) return "";
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new HttpError(400, "AI URL 格式不正确");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new HttpError(400, "AI URL 必须使用 HTTPS");
  }
  return endpoint;
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function compareEvents(a: StoredEvent, b: StoredEvent): number {
  return a.startDate.localeCompare(b.startDate)
    || Number(b.allDay) - Number(a.allDay)
    || (a.startTime ?? "00:00").localeCompare(b.startTime ?? "00:00")
    || a.title.localeCompare(b.title, "zh-CN");
}

function validateAccountInput(username: string, displayName: string, password: string): void {
  if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new HttpError(400, "用户名需要 3–24 位小写字母、数字或下划线");
  if (!displayName) throw new HttpError(400, "请输入显示名称");
  if (password.length < 6) throw new HttpError(400, "密码至少 6 位");
}

function normalizeAvatarDataUrl(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const dataUrl = String(value).trim();
  if (dataUrl.length > 240_000) {
    throw new HttpError(413, "头像文件过大，请重新选择较小图片");
  }
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(dataUrl)) {
    throw new HttpError(400, "头像仅支持 PNG、JPEG 或 WebP 图片");
  }
  return dataUrl.replace(/[\r\n]/g, "");
}

function normalizeStoredAvatar(value: unknown): string {
  try {
    return normalizeAvatarDataUrl(value);
  } catch {
    return "";
  }
}

function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function cleanId(value: unknown): string {
  const id = String(value ?? "").trim();
  if (!id || id.length > 100) throw new HttpError(400, "无效 ID");
  return id;
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength);
}

function normalizeInteger(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function normalizeTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new HttpError(400, "时间格式应为 HH:mm");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new HttpError(400, "时间不合法");
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function requireDate(value: unknown): string {
  const date = String(value ?? "");
  if (!isDateString(date)) throw new HttpError(400, "日期格式不正确");
  return date;
}

function isDateString(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  return safeDateString(Number(match[1]), Number(match[2]), Number(match[3])) === value;
}

function safeDateString(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function chineseWeekdayToNumber(value: string): number {
  const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
  const number = map[value] ?? Number(value);
  return number >= 1 && number <= 7 ? number : 1;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function randomToken(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToBase64Url(bytes);
}

async function hashPassword(password: string): Promise<string> {
  // Cloudflare Workers Free 每次请求的 CPU 时间非常有限。
  // 高迭代 PBKDF2 会让首次初始化和登录直接触发 500，因此这里使用
  // 每个账号独立随机盐 + SHA-256。该方案适合这个小范围私人日历，
  // 同时避免在代码或 KV 中保存明文密码。
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await digestSaltedPassword(password, salt);
  return `sha256$v1$${bytesToBase64Url(salt)}$${bytesToBase64Url(digest)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");

  if (parts.length === 4 && parts[0] === "sha256" && parts[1] === "v1") {
    const salt = base64UrlToBytes(parts[2]);
    const expected = base64UrlToBytes(parts[3]);
    const actual = await digestSaltedPassword(password, salt);
    return timingSafeEqual(actual, expected);
  }

  // 兼容早期版本已经创建的 PBKDF2 密码。
  // 新创建或重置的密码都会自动使用上面的轻量方案。
  if (parts.length === 4 && parts[0] === "pbkdf2") {
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > 200_000) return false;
    const salt = base64UrlToBytes(parts[2]);
    const expected = base64UrlToBytes(parts[3]);
    const key = await crypto.subtle.importKey(
      "raw",
      bytesToArrayBuffer(new TextEncoder().encode(password)),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: bytesToArrayBuffer(salt), iterations },
      key,
      expected.byteLength * 8,
    );
    return timingSafeEqual(new Uint8Array(bits), expected);
  }

  return false;
}

async function digestSaltedPassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const input = new Uint8Array(salt.byteLength + passwordBytes.byteLength);
  input.set(salt, 0);
  input.set(passwordBytes, salt.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", bytesToArrayBuffer(input));
  return new Uint8Array(digest);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytesToArrayBuffer(new TextEncoder().encode(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

function sessionCookie(token: string, expiresAt: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Expires=${new Date(expiresAt).toUTCString()}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const url = new URL(request.url);
  if (origin !== url.origin) throw new HttpError(403, "请求来源不合法");
}

async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new HttpError(415, "请求必须使用 JSON");
  try {
    return await request.json() as T;
  } catch {
    throw new HttpError(400, "JSON 内容不正确");
  }
}

function json(value: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

async function getFreshData(env: Env): Promise<AppData> {
  const { data } = await loadData(env);
  return data;
}

async function loadData(env: Env): Promise<{ data: AppData; migrated: boolean }> {
  if (!env.CALENDAR_KV || typeof env.CALENDAR_KV.get !== "function") {
    throw new HttpError(503, "Cloudflare KV 绑定 CALENDAR_KV 不存在，请检查 wrangler.jsonc 或 Worker 的 Bindings 设置");
  }
  const raw = await env.CALENDAR_KV.get(DATA_KEY);
  if (!raw) return { data: emptyData(), migrated: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(500, "存储中的 calendar-data.json 已损坏");
  }
  const migrated = !isVersion4(parsed);
  const data = migrated ? migrateData(parsed) : sanitizeVersion4(parsed as AppData);
  if (migrated) await writeData(env, data);
  return { data, migrated };
}

function isVersion4(value: unknown): value is AppData {
  return Boolean(value && typeof value === "object" && (value as { version?: unknown }).version === 4);
}

function sanitizeVersion4(data: AppData): AppData {
  const spaces = Array.isArray(data.spaces) ? data.spaces : [];
  const validSpaceIds = new Set(spaces.map((space) => space.id));
  const events = (Array.isArray(data.events) ? data.events : []).map((event) => sanitizeEvent(event, validSpaceIds));
  const rawPlaces = Array.isArray(data.places) ? data.places : [];
  const migratedActivities = activityPlacesToActivities(rawPlaces);
  const places = rawPlaces
    .filter((place) => !isLegacyActivityPlace(place))
    .map(sanitizePlace);
  const activitySource = [
    ...(Array.isArray(data.activities) ? data.activities : []),
    ...migratedActivities,
  ];
  const activityMap = new Map<string, StoredActivity>();
  for (const activity of activitySource.map(sanitizeActivity)) {
    if (validSpaceIds.has(activity.spaceId)) activityMap.set(activity.id, activity);
  }
  const validPlaceIds = new Set(places.map((place) => place.id));
  for (const event of events) {
    if (event.placeId && !validPlaceIds.has(event.placeId)) event.placeId = null;
  }
  return {
    version: 4,
    revision: Number.isInteger(data.revision) ? data.revision : 0,
    users: (Array.isArray(data.users) ? data.users : []).map((account) => ({
      ...account,
      avatarDataUrl: normalizeStoredAvatar(account.avatarDataUrl),
    })),
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    spaces,
    spaceMembers: Array.isArray(data.spaceMembers) ? data.spaceMembers : [],
    spaceInvitations: Array.isArray(data.spaceInvitations) ? data.spaceInvitations : [],
    joinRequests: Array.isArray(data.joinRequests) ? data.joinRequests : [],
    events,
    places,
    activities: [...activityMap.values()],
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function sanitizePlace(place: StoredPlace): StoredPlace {
  return {
    ...place,
    address: place.address ?? "",
    latitude: Number.isFinite(place.latitude) ? place.latitude : null,
    longitude: Number.isFinite(place.longitude) ? place.longitude : null,
    category: place.category || "其他",
    status: place.status === "planned" ? "planned" : place.status === "visited" ? "visited" : "wishlist",
    notes: place.notes ?? "",
    likedByUserIds: Array.isArray(place.likedByUserIds) ? uniqueStrings(place.likedByUserIds) : [],
  };
}

function sanitizeActivity(activity: StoredActivity): StoredActivity {
  return {
    ...activity,
    title: cleanText(activity.title, 120) || "未命名活动",
    category: cleanText(activity.category, 40) || "其他",
    tag: cleanText(activity.tag, 40),
    notes: cleanText(activity.notes, 800),
    likedByUserIds: Array.isArray(activity.likedByUserIds) ? uniqueStrings(activity.likedByUserIds) : [],
  };
}

function isLegacyActivityPlace(place: StoredPlace): boolean {
  return String(place.category ?? "").startsWith("活动库:");
}

function activityPlacesToActivities(places: StoredPlace[]): StoredActivity[] {
  return places.filter(isLegacyActivityPlace).map((place) => ({
    id: place.id,
    spaceId: place.spaceId,
    title: place.name,
    category: String(place.category).replace(/^活动库:/, "") || "其他",
    tag: place.notes === "空间活动库" ? "" : cleanText(place.notes, 40),
    notes: place.notes === "空间活动库" ? "" : cleanText(place.notes, 800),
    createdBy: place.createdBy,
    likedByUserIds: Array.isArray(place.likedByUserIds) ? uniqueStrings(place.likedByUserIds) : [],
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  }));
}

function sanitizeEvent(event: StoredEvent, validSpaceIds?: Set<string>): StoredEvent {
  const rawSpaceIds = Array.isArray(event.spaceIds) && event.spaceIds.length ? event.spaceIds : [event.spaceId];
  const spaceIds = uniqueStrings(rawSpaceIds).filter((id) => !validSpaceIds || validSpaceIds.has(id));
  const fallbackSpaceId = spaceIds[0] ?? event.spaceId;
  const assignmentsBySpace: Record<string, string[]> = {};
  for (const spaceId of spaceIds) {
    const existing = event.assignmentsBySpace?.[spaceId];
    assignmentsBySpace[spaceId] = Array.isArray(existing)
      ? uniqueStrings(existing)
      : spaceId === event.spaceId && Array.isArray(event.assignedUserIds)
        ? uniqueStrings(event.assignedUserIds)
        : [];
  }
  return {
    ...event,
    spaceId: spaceIds.includes(event.spaceId) ? event.spaceId : fallbackSpaceId,
    spaceIds,
    assignmentsBySpace,
    location: event.location ?? "",
    placeId: event.placeId ?? null,
    placeAddress: event.placeAddress ?? "",
    latitude: Number.isFinite(event.latitude) ? event.latitude : null,
    longitude: Number.isFinite(event.longitude) ? event.longitude : null,
    companions: event.companions ?? "",
    notes: event.notes ?? "",
    assignedUserIds: assignmentsBySpace[spaceIds.includes(event.spaceId) ? event.spaceId : fallbackSpaceId] ?? [],
  };
}

function migrateData(input: unknown): AppData {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};

  if ((source.version === 3 || source.version === 4) && Array.isArray(source.users) && Array.isArray(source.spaces)) {
    const modern = source as unknown as {
      version: number;
      revision?: number;
      users: StoredUser[];
      sessions?: StoredSession[];
      spaces: StoredSpace[];
      spaceMembers?: StoredSpaceMember[];
      spaceInvitations?: StoredSpaceInvitation[];
      joinRequests?: StoredJoinRequest[];
      events?: StoredEvent[];
      places?: StoredPlace[];
      activities?: StoredActivity[];
      updatedAt?: string;
    };
    return sanitizeVersion4({
      version: 4,
      revision: Number.isInteger(modern.revision) ? Number(modern.revision) + 1 : 1,
      users: modern.users,
      sessions: modern.sessions ?? [],
      spaces: modern.spaces,
      spaceMembers: modern.spaceMembers ?? [],
      spaceInvitations: modern.spaceInvitations ?? [],
      joinRequests: modern.joinRequests ?? [],
      events: modern.events ?? [],
      places: modern.places ?? [],
      activities: modern.activities ?? [],
      updatedAt: new Date().toISOString(),
    });
  }

  if (source.version === 2 && Array.isArray(source.users) && Array.isArray(source.spaces)) {
    const v2 = source as unknown as {
      revision?: number;
      users: StoredUser[];
      sessions?: StoredSession[];
      spaces: StoredSpace[];
      spaceMembers?: StoredSpaceMember[];
      spaceInvitations?: StoredSpaceInvitation[];
      joinRequests?: StoredJoinRequest[];
      events?: StoredEvent[];
      places?: StoredPlace[];
      updatedAt?: string;
    };
    return sanitizeVersion4({
      version: 4,
      revision: Number.isInteger(v2.revision) ? Number(v2.revision) + 1 : 1,
      users: v2.users,
      sessions: v2.sessions ?? [],
      spaces: v2.spaces,
      spaceMembers: v2.spaceMembers ?? [],
      spaceInvitations: v2.spaceInvitations ?? [],
      joinRequests: v2.joinRequests ?? [],
      events: v2.events ?? [],
      places: v2.places ?? [],
      activities: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const legacy = source as unknown as LegacyData;
  const now = new Date().toISOString();
  const users: StoredUser[] = (legacy.users ?? []).map((user, index) => ({
    id: user.id,
    username: normalizeLegacyUsername(user.username, index),
    displayName: user.displayName,
    avatarDataUrl: "",
    passwordHash: user.passwordHash,
    isPlatformAdmin: Boolean(user.isAdmin) || index === 0,
    disabled: false,
    createdAt: user.createdAt || now,
    updatedAt: now,
  }));
  if (users.length === 0) return emptyData();
  const owner = users.find((item) => item.isPlatformAdmin) ?? users[0];
  const space = createSpaceRecord(owner.id, "原三人共享空间", "由旧版三人日历自动迁移", "◫");
  if (legacy.ai) {
    space.ai = {
      enabled: Boolean(legacy.ai.enabled),
      endpoint: legacy.ai.endpoint ?? "",
      model: legacy.ai.model ?? "",
      apiKey: legacy.ai.apiKey,
      updatedAt: now,
      updatedBy: owner.id,
    };
  }
  const legacyColorMap = new Map((legacy.users ?? []).map((item) => [item.id, item.color ?? ""]));
  const memberships: StoredSpaceMember[] = users.map((account, index) => ({
    spaceId: space.id,
    userId: account.id,
    role: account.id === owner.id ? "owner" : "member",
    color: normalizeLegacyColor(legacyColorMap.get(account.id), index),
    joinedAt: account.createdAt,
  }));
  const events: StoredEvent[] = (legacy.events ?? []).map((event) => {
    const assigned = event.memberIds?.filter((id) => users.some((account) => account.id === id)) ?? [event.createdBy];
    return {
      id: event.id,
      spaceId: space.id,
      spaceIds: [space.id],
      assignmentsBySpace: { [space.id]: assigned },
      title: event.title,
      startDate: event.startDate,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      location: event.location ?? "",
      placeId: null,
      placeAddress: "",
      latitude: null,
      longitude: null,
      companions: event.companions ?? "",
      notes: event.notes ?? "",
      createdBy: event.createdBy,
      assignedUserIds: assigned,
      source: "manual",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  });
  return {
    version: 4,
    revision: 1,
    users,
    sessions: Array.isArray(legacy.sessions) ? legacy.sessions : [],
    spaces: [space],
    spaceMembers: memberships,
    spaceInvitations: [],
    joinRequests: [],
    events,
    places: [],
    activities: [],
    updatedAt: now,
  };
}

function normalizeLegacyUsername(value: string, index: number): string {
  const normalized = String(value ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24);
  return normalized.length >= 3 ? normalized : `user${index + 1}`;
}

function normalizeLegacyColor(value: string | undefined, index: number): string {
  const color = String(value ?? "").toUpperCase();
  return /^#[0-9A-F]{6}$/.test(color) ? color : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function emptyData(): AppData {
  return {
    version: 4,
    revision: 0,
    users: [],
    sessions: [],
    spaces: [],
    spaceMembers: [],
    spaceInvitations: [],
    joinRequests: [],
    events: [],
    places: [],
    activities: [],
    updatedAt: new Date().toISOString(),
  };
}

async function mutateData<T>(env: Env, mutation: (data: AppData) => T | Promise<T>): Promise<T> {
  const run = mutationQueue.then(async () => {
    const { data } = await loadData(env);
    const result = await mutation(data);
    data.revision += 1;
    data.updatedAt = new Date().toISOString();
    pruneData(data);
    await writeData(env, data);
    return result;
  });
  mutationQueue = run.catch(() => undefined);
  return run;
}

function pruneData(data: AppData): void {
  const now = new Date().toISOString();
  data.sessions = data.sessions.filter((item) => item.expiresAt > now).slice(-2000);
  data.spaceInvitations = data.spaceInvitations
    .filter((item) => item.status === "pending" || Date.now() - Date.parse(item.createdAt) < 180 * 86_400_000)
    .slice(-5000);
  data.joinRequests = data.joinRequests
    .filter((item) => item.status === "pending" || Date.now() - Date.parse(item.createdAt) < 180 * 86_400_000)
    .slice(-5000);
}

async function writeData(env: Env, data: AppData): Promise<void> {
  if (!env.CALENDAR_KV || typeof env.CALENDAR_KV.put !== "function") {
    throw new HttpError(503, "Cloudflare KV 绑定 CALENDAR_KV 不存在，请检查 wrangler.jsonc 或 Worker 的 Bindings 设置");
  }
  const wait = Math.max(0, KV_WRITE_INTERVAL_MS - (Date.now() - lastKvWriteAt));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  try {
    await env.CALENDAR_KV.put(DATA_KEY, JSON.stringify(data));
    lastKvWriteAt = Date.now();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new HttpError(503, `日历数据写入 Cloudflare KV 失败：${detail}`);
  }
}
