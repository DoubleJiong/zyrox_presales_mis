# 代码质量评估报告

**项目**：售前管理系统（presales_app）  
**日期**：2025 年  
**评审范围**：`src/` 全目录（auth、RBAC、安全中间件、数据库层、API 路由、modules）  
**评审依据**：代码静态分析 + 逻辑追踪验证（所有问题均已直接阅读源码确认，非自动工具扫描）

---

## 总体评级

| 维度 | 评级 | 说明 |
|------|----|------|
| 安全性 | ⚠️ 中等 | 已有基础防护体系，但存在 3 个对安全产生实际影响的问题 |
| 代码质量 | ✅ 良好 | 结构清晰，命名规范，模块边界明确 |
| 架构设计 | ✅ 良好 | Next.js App Router + Drizzle ORM 使用合理 |
| 性能 | ⚠️ 待改进 | 数据库连接池和分页限制有多处不一致 |
| 可维护性 | ✅ 良好 | 模块化程度高，配置集中 |

---

## 一、安全性问题

### 🔴 高危（Critical）

#### S-1：登录接口用户枚举漏洞

**文件**：[src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts#L52)  
**OWASP**：A05 – Security Misconfiguration / A07 – Identification and Authentication Failures

当前代码在用户不存在和密码错误场景下，返回了**不同的错误消息**，攻击者可据此枚举出系统中有效的用户名/邮箱：

```typescript
// line 52 - 用户不存在
return NextResponse.json({ success: false, error: '用户不存在' }, { status: 401 });

// line 82 - 密码错误
return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
```

**修复建议**：统一返回中性消息，不区分两种失败原因：

```typescript
// 统一错误消息，防止用户枚举
return NextResponse.json(
  { success: false, error: '邮箱或密码不正确' },
  { status: 401 }
);
```

---

#### S-2：SSE 端点 CORS 使用通配符 `*`

**文件**：[src/app/api/events/route.ts](src/app/api/events/route.ts#L48)  
**OWASP**：A05 – Security Misconfiguration

SSE 实时推送端点对 OPTIONS 预检和 POST 错误响应均设置了最宽泛的跨域策略：

```typescript
// line 48 - OPTIONS 预检
'Access-Control-Allow-Origin': '*'

// line 163 - SSE 错误响应
'Access-Control-Allow-Origin': '*', // 允许跨域
```

该端点经过认证保护（`getValidatedAuthContext`），但通配符 CORS 允许任意域名发出预检请求，与系统整体严格安全策略不一致。

**修复建议**：改为根据配置的允许域名列表返回显式 Origin，或限制为同域（删除该头）：

```typescript
const allowedOrigin = process.env.ALLOWED_ORIGIN || new URL(request.url).origin;
'Access-Control-Allow-Origin': allowedOrigin
```

---

### 🟡 中高危（High）

#### S-3：权限缓存失效函数存在但从未在角色变更路径调用

**文件**：[src/lib/rbac.ts](src/lib/rbac.ts#L37)  
**影响**：角色/权限变更后，当前活跃用户最多需 5 分钟才能生效

`clearPermissionCache(userId)` 和 `clearAllPermissionCache()` 已在 `rbac.ts` 中定义，但在全代码库搜索中未发现任何调用方（用户角色修改 API、管理员后台等均未调用）。这意味着：

- 管理员修改某用户角色后，该用户最多在 5 分钟内仍持有旧权限
- 在高权限降级场景下（如撤销管理员权限），风险窗口为 5 分钟

```typescript
// rbac.ts — 已定义但未被调用
export function clearPermissionCache(userId: number): void {
  permissionCache.delete(userId);
}
```

**修复建议**：在 `src/app/api/users/[id]/route.ts` 的角色变更（PATCH）成功后调用：

```typescript
import { clearPermissionCache } from '@/lib/rbac';
// 角色变更成功后
clearPermissionCache(userId);
```

---

#### S-4：IP 地址信任 X-Forwarded-For 未做代理验证

**文件**：[src/lib/security.ts](src/lib/security.ts) — `getClientIp()`

限流逻辑使用 X-Forwarded-For 的**第一个值**作为客户端 IP，该值可被恶意客户端直接伪造（如 `X-Forwarded-For: 1.2.3.4`），导致限流可被轻易绕过：

```typescript
const forwarded = req.headers.get('x-forwarded-for');
if (forwarded) {
  return forwarded.split(',')[0].trim(); // 可被客户端伪造
}
```

**修复建议**：若应用部署在已知反向代理后（Nginx/CloudFlare），应取 X-Forwarded-For 的**最后一个**（最内层代理追加的）IP，或直接使用反向代理设置的 `X-Real-IP` 头（不允许客户端设置）。

---

### 🟡 中危（Medium）

#### S-5：CSP 策略含 `unsafe-inline` 和 `unsafe-eval` 削弱保护

**文件**：[src/lib/security.ts](src/lib/security.ts#L349)

系统已设置 CSP 头（值得肯定），但其中 `script-src` 包含 `'unsafe-inline'` 和 `'unsafe-eval'`，实际上大幅削弱了 XSS 防护效果：

```
"script-src 'self' 'unsafe-inline' 'unsafe-eval';"
```

**修复建议**：Next.js 支持基于 nonce 的 CSP，可移除 `unsafe-inline`；若三方库必须 eval，至少移除 `unsafe-inline` 并引入 nonce 机制。这是较长期的改进项，但当前 CSP **在 XSS 层面基本无效**。

---

#### S-6：生产环境 CSRF/限流状态存储为进程内 Map，非分布式安全

**文件**：[src/lib/security.ts](src/lib/security.ts#L57), [src/lib/rbac.ts](src/lib/rbac.ts#L27)

代码注释本身已诚实说明：

```typescript
// Token存储（生产环境应使用Redis）
const csrfTokenStore = new Map<...>();

// 限流存储（生产环境应使用Redis）
const rateLimitStore = new Map<...>();

// rbac.ts
const permissionCache = new Map<number, {...}>();
```

**单实例部署下不构成问题**。若将来引入多节点/水平扩展（如 PM2 cluster、K8s 多副本），三处 Map 均需替换为 Redis（或 Valkey/Dragonfly）。

**当前评级**：已知技术债，单节点部署可接受；扩容前必须处理。

---

## 二、性能问题

### P-1：数据库连接池最大值过小

**文件**：[src/db/index.ts](src/db/index.ts#L23)

```typescript
max: 5,  // 最大 5 个连接
connect_timeout: 15,
```

PostgreSQL 的默认最大连接数（`max_connections`）通常为 100。对于有 70+ 个 API 路由的应用，并发高峰期 5 个连接极易触发排队等待，导致 API 响应延迟上升。

**修复建议**：根据实际并发量调整，建议 `max: 20`，高并发场景可至 `max: 50`（需同时评估 PostgreSQL 端的 `max_connections` 配置）。

---

### P-2：分页上限不一致——多处 API 路由无最大页大小限制

以下 API 路由对 `pageSize` 参数使用了无上限的 `parseInt()`，客户端可传入极大值（如 `pageSize=100000`）触发全表扫描：

| 文件 | 问题 |
|------|------|
| [src/app/api/alert-rules/route.ts](src/app/api/alert-rules/route.ts#L13) | `parseInt(searchParams.get('pageSize') \|\| '20')` 无上限 |
| [src/app/api/contract-bids/route.ts](src/app/api/contract-bids/route.ts#L14) | 同上 |
| [src/app/api/contract-acceptances/route.ts](src/app/api/contract-acceptances/route.ts#L14) | 同上 |
| [src/app/api/contract-items/route.ts](src/app/api/contract-items/route.ts#L14) | 同上，默认值 50 |
| [src/app/api/follows/route.ts](src/app/api/follows/route.ts#L18) | 同上 |
| [src/app/api/work-logs/route.ts](src/app/api/work-logs/route.ts#L21) | 同上 |
| [src/app/api/knowledge/search/route.ts](src/app/api/knowledge/search/route.ts#L15) | 同上 |
| [src/app/api/notifications/route.ts](src/app/api/notifications/route.ts#L14) | 同上 |

对比：`src/lib/pagination.ts` 已正确使用 `Math.min(100, ...)`；`src/lib/api-pagination.ts` 使用了 `Math.min(maxPageSize, ...)`。

**修复建议**：统一使用 `src/lib/pagination.ts` 中的 `parsePaginationParams()`，或对所有直接 `parseInt` 处补充 `Math.min(100, ...)` 上限。

---

## 三、代码质量问题

### Q-1：JWT 访问令牌有效期 7 天偏长

**文件**：`src/lib/jwt.ts`

```typescript
const JWT_EXPIRES_IN = '7d';        // 访问令牌 7 天
const JWT_REFRESH_EXPIRES_IN = '30d'; // 刷新令牌 30 天
```

通常访问令牌建议为 15 min – 1 hour；虽然系统已实现完整的令牌黑名单（`revokeToken` / `isTokenBlacklisted`），长期令牌一旦被盗取，攻击者在主动吊销前可长达 7 天内合法使用。

**修复建议**：访问令牌缩短至 `1h` 或 `4h`；刷新令牌可保持 `30d`。需确保刷新流程正常工作。

---

### Q-2：`loginLogs` 只记录密码错误，"用户不存在" 无记录

**文件**：[src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts)

查看源码发现，仅在密码验证失败后（line ~75）写入 `loginLogs`；用户名/邮箱不存在时（line 52）直接返回，**不写审计日志**。这会导致针对不存在用户的枚举扫描在日志中完全不可见。

**修复建议**：在用户不存在分支也写入一条匿名/安全的失败日志（不记录尝试的邮箱明文，可记录请求 IP 和时间窗口）。

---

## 四、确认正确的安全实现（无需修改）

以下是本次评审中发现**之前评估有误**的结论，实际实现比预期更完整：

| 项目 | 结论 |
|------|------|
| **JWT 令牌吊销** | ✅ **已完整实现**：`revokeToken()`、`isTokenBlacklisted()`、`isTokenBlacklistedByHash()` 均已实现，且在令牌验证路径上调用，状态存储于数据库（`tokenBlacklist` 表），非内存 |
| **接口限流实际生效** | ✅ **已生效**：`performSecurityChecks()` 在 line 391 调用 `checkRateLimit()`，登录接口使用更严格的 15分钟/10次限流配置 |
| **CSRF Token 熵强度** | ✅ **强度充足**：`crypto.getRandomValues(new Uint8Array(32))` 生成 256 位密码安全随机数，hex 编码不损失熵值 |
| **安全响应头** | ✅ **已完整设置**：X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy、CSP（见 S-5 改进建议） |
| **密码审计日志** | ✅ **已实现**：`writePasswordAuditLog` 覆盖密码重置/修改场景 |
| **SQL 注入防护** | ✅ **模式完整**：11 条正则规则覆盖主流注入手法（UNION、注释绕过、布尔盲注、多语句），且使用了组合结构匹配以降低误报 |

---

## 五、汇总与优先级

| 优先级 | ID | 问题 | 文件 | 工作量 |
|--------|----|------|------|--------|
| 🔴 立即修复 | S-1 | 登录用户枚举 | `auth/login/route.ts` | 5 min |
| 🔴 立即修复 | S-2 | SSE 端点通配符 CORS | `events/route.ts` | 10 min |
| 🟡 本周修复 | S-3 | 权限缓存未在角色变更时清除 | `users/[id]/route.ts` | 30 min |
| 🟡 本周修复 | Q-2 | 用户不存在时缺少登录日志 | `auth/login/route.ts` | 15 min |
| 🟡 本周修复 | P-1 | 数据库连接池 max:5 过小 | `db/index.ts` | 5 min |
| 🟡 本周修复 | P-2 | API 分页无上限（8+ 路由） | 多个 route.ts | 30 min |
| 🟡 近期修复 | S-4 | X-Forwarded-For 可伪造 | `security.ts` | 30 min |
| 🔵 规划改进 | Q-1 | JWT 访问令牌有效期 7d | `jwt.ts` | 1h（含测试） |
| 🔵 规划改进 | S-5 | CSP 含 unsafe-inline/eval | `security.ts` | 3-5d |
| 🔵 扩容前处理 | S-6 | 进程内 Map 状态（非 Redis） | `security.ts`, `rbac.ts` | 1-2w |

---

## 六、架构亮点（值得保留的好实践）

1. **Drizzle ORM 参数化查询** — 所有 DB 操作通过 ORM 执行，根本性避免 SQL 注入，安全层的 SQL 检测是额外防线
2. **统一认证中间件** — `proxy.ts` + `getValidatedAuthContext()` 强制保护所有 API 路由
3. **RBAC 权限模型** — 角色-权限体系设计清晰，`API_PERMISSIONS` 映射完整
4. **令牌黑名单持久化** — 黑名单存 DB 而非内存，重启后仍有效，设计合理
5. **登录成功/失败日志** — `sys_login_log` 表记录 IP、UserAgent、时间，安全审计基础完善
6. **模块化结构** — `src/modules/` 下的 identity、stats 等模块边界清晰，便于维护

---

*报告生成：基于源码直接阅读验证，非自动扫描工具输出。所有行号引用已核实。*
