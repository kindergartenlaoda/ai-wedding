# 多角度项目改进计划

> **日期**: 2026-02-26
> **来源**: 架构师 / UI-UX 设计师 / 产品经理 三方联合评审
> **目标**: 梳理当前项目所有已识别问题，按优先级排列，形成可执行的改进路线图

---

## 目录

- [一、问题总览](#一问题总览)
- [二、架构师提出的问题](#二架构师提出的问题)
- [三、UI/UX 设计师提出的问题](#三uiux-设计师提出的问题)
- [四、产品经理提出的问题](#四产品经理提出的问题)
- [五、执行路线图](#五执行路线图)
- [六、里程碑定义](#六里程碑定义)

---

## 一、问题总览

| 编号 | 来源 | 严重程度 | 标题 | 状态 |
|------|------|---------|------|------|
| A-01 | 架构师 | P0-高 | ID 验证类型不匹配（UUID vs CUID） | **已完成** (Sprint 1) |
| A-02 | 架构师 | P0-高 | 生成服务硬编码模型名 | **已完成** (Sprint 1) |
| A-03 | 架构师 | P0-高 | 零自动化测试覆盖 | 待建设 |
| A-04 | 架构师 | P1-中 | 人脸检测 Hook 被禁用 | 待修复 |
| A-05 | 架构师 | P1-中 | 文档与代码不同步 | **已完成** (Sprint 1) |
| A-06 | 架构师 | P1-中 | SSR 守卫默认关闭 | **已完成** (Sprint 1) |
| A-07 | 架构师 | P2-低 | API 客户端层抽象不足 | 待重构 |
| A-08 | 架构师 | P2-低 | 缺少 API 速率限制 | 待建设 |
| U-01 | UI/UX | P0-高 | 导航菜单项过多 | **已完成** (Sprint 3) |
| U-02 | UI/UX | P0-高 | 首页 Hero 缺少案例展示 | **已完成** (Sprint 3) |
| U-03 | UI/UX | P0-高 | 定价页面无法购买但入口可见 | **已完成** (Sprint 1+2) |
| U-04 | UI/UX | P1-中 | 游客与登录用户体验断裂 | **已完成** (Sprint 3) |
| U-05 | UI/UX | P1-中 | 管理端与用户端视觉割裂 | 待统一 |
| U-06 | UI/UX | P1-中 | 空状态设计单一 | **已完成** (Sprint 3) |
| U-07 | UI/UX | P1-中 | 域图标辨识度不足 | 待增强 |
| U-08 | UI/UX | P2-低 | 加载状态方案不统一 | 待统一 |
| U-09 | UI/UX | P2-低 | 无深色/浅色模式切换 | 待评估 |
| P-01 | 产品 | P0-紧急 | 支付流程未上线 | **已完成** (Sprint 2) |
| P-02 | 产品 | P0-紧急 | 新用户无免费积分引导 | **已完成** (Sprint 2) |
| P-03 | 产品 | P0-高 | 首屏转化率低（无案例对比） | **已完成** (Sprint 3) |
| P-04 | 产品 | P1-高 | 邀请系统前端 UI 缺失 | 待建设 |
| P-05 | 产品 | P1-高 | 缺少中国支付方式 | 待评估 |
| P-06 | 产品 | P1-中 | 无数据分析面板 | 待建设 |
| P-07 | 产品 | P2-中 | 画廊缺少社区互动（评论等） | 待设计 |
| P-08 | 产品 | P2-低 | SEO 优化不足 | 待优化 |

---

## 二、架构师提出的问题

### A-01 [P0-高] ID 验证类型不匹配（UUID vs CUID）

**问题描述**:
`app/lib/validations.ts` 中 `CreateProjectSchema` 使用 `z.string().uuid()` 验证 `templateId`，但 Prisma schema 中 Template 的主键使用 `@default(cuid())` 生成。CUID 格式与 UUID 不同，导致所有合法的 template ID 在验证时都会失败。

**影响范围**: 创建项目 API (`POST /api/projects`)

**修复方案**:
1. 将 `templateId: z.string().uuid()` 改为 `templateId: z.string().min(1)`（或使用 cuid 格式校验）
2. 排查其他 Zod schema 中是否有类似的 uuid 验证问题

**涉及文件**:
- `app/lib/validations.ts`

**预估工时**: 0.5h

---

### A-02 [P0-高] 生成服务硬编码模型名

**问题描述**:
`app/lib/generation-service.ts` 中 `generateAsAuthenticated()` 方法直接写死 `model: 'gemini-2.5-flash-image'`，绕过了数据库 `model_configs` 表的动态配置机制。当切换 AI 模型时需要改代码而非改配置。

**影响范围**: 认证用户的图片生成流程

**修复方案**:
1. 从 `model_configs` 表读取当前活跃的 `generate_image` 类型配置
2. 将模型名、API endpoint、API key 等全部从配置读取
3. 提供 fallback 机制：如果无活跃配置，使用环境变量中的默认值

**涉及文件**:
- `app/lib/generation-service.ts`
- 可能需要新增 `app/lib/model-config-service.ts`

**预估工时**: 2h

---

### A-03 [P0-高] 零自动化测试覆盖

**问题描述**:
项目无任何自动化测试框架（无 Jest、Vitest、Playwright）。当前仅靠 `pnpm lint` + `pnpm typecheck` + `pnpm build` 作为质量门，无法捕获逻辑回归。

**影响范围**: 全局代码质量和迭代安全性

**修复方案**:
1. **Phase 1**: 引入 Vitest，配置 `vitest.config.ts`，为核心工具函数编写单元测试
   - `app/lib/validations.ts` — 验证 schema 行为
   - `app/lib/errors.ts` — 错误处理逻辑
   - `app/lib/prompt-strategies/` — Prompt 生成逻辑
2. **Phase 2**: 为关键 API 路由编写集成测试
   - `/api/auth/register` — 注册流程
   - `/api/generate-single` — 单张生成（含积分扣减）
   - `/api/orders/create` — 订单创建
3. **Phase 3**: 引入 Playwright，覆盖核心用户流程 E2E
   - 注册 → 首次生成 → 查看结果
   - 模板浏览 → 收藏 → 创建项目

**涉及文件**:
- 新增 `vitest.config.ts`
- 新增 `tests/` 目录结构
- 修改 `package.json` 添加 test 脚本

**预估工时**: Phase 1: 4h / Phase 2: 6h / Phase 3: 8h

---

### A-04 [P1-中] 人脸检测 Hook 被禁用

**问题描述**:
`usePhotoUpload` 中的 `identifyPerson` 始终返回通过，`useImageIdentification` 也始终返回 `hasPerson: true`。但 `useParallelPhotoUpload` 仍然调用真实的 identify-image API，行为不一致。

**影响范围**: 照片上传质量检查流程

**修复方案**:
1. 确认人脸检测是否为必需功能（与产品经理协商）
2. 如果需要：恢复 `identifyPerson` 的真实调用逻辑，统一使用 `useParallelPhotoUpload` 的实现
3. 如果不需要：彻底移除相关代码，避免"假"检测给用户造成误解

**涉及文件**:
- `app/hooks/usePhotoUpload.ts`
- `app/hooks/useImageIdentification.ts`
- `app/hooks/useParallelPhotoUpload.ts`

**预估工时**: 2h

---

### A-05 [P1-中] 文档与代码不同步

**问题描述**:
多个 CLAUDE.md 文件仍引用已删除的 `single_generations` 表和对应的 API 路由。数据库已通过迁移将单张生成统一到 `generations` 表（使用 `generation_type` 字段区分），但文档未同步更新。

**影响范围**: AI 辅助开发效率和新成员上手速度

**修复方案**:
1. 更新根目录 `CLAUDE.md` 中的数据模型描述和 API 路由列表
2. 更新 `app/api/CLAUDE.md`（如存在）中的路由清单
3. 更新 `prisma/CLAUDE.md`（如存在）中的模型描述
4. 添加自动化脚本检测文档引用的模型/路由是否存在

**涉及文件**:
- `CLAUDE.md`
- `app/api/CLAUDE.md`
- `prisma/CLAUDE.md`

**预估工时**: 2h

---

### A-06 [P1-中] SSR 守卫默认关闭

**问题描述**:
`middleware.ts` 中 `ENABLE_SSR_GUARD` 环境变量默认为 false。受保护路由（`/dashboard`、`/results/*`、`/create`）在服务端无认证校验，完全依赖客户端 `AuthContext` 判断——导致未登录用户可短暂看到空白 Dashboard 再被跳转。

**影响范围**: 用户体验（闪白屏）和安全性

**修复方案**:
1. 评估开启 SSR 守卫对开发体验的影响
2. 生产环境默认开启 `ENABLE_SSR_GUARD=true`
3. 在 `.env.example` 中明确标注此变量的作用和推荐值

**涉及文件**:
- `middleware.ts`
- `.env.example`
- 部署文档

**预估工时**: 1h

---

### A-07 [P2-低] API 客户端层抽象不足

**问题描述**:
`app/lib/api-client.ts` 提供了 `authFetch` 封装，但大多数 Hook 直接使用 `fetch(..., { credentials: 'include' })`，未统一错误处理、重试逻辑和请求日志。

**影响范围**: 代码一致性、错误处理可靠性

**修复方案**:
1. 扩展 `authFetch`，添加统一的错误解析（JSON error body → `AppError`）
2. 添加可选的重试机制（针对 5xx 和网络错误）
3. 逐步将所有 Hook 中的 `fetch` 调用替换为 `authFetch`

**涉及文件**:
- `app/lib/api-client.ts`
- `app/hooks/*.ts`（约 15 个文件）

**预估工时**: 4h

---

### A-08 [P2-低] 缺少 API 速率限制

**问题描述**:
除 `generate-image` 路由有简单限流外，其余 40 个 API 路由无速率限制，易受滥用攻击。

**影响范围**: 系统稳定性和成本控制

**修复方案**:
1. 在中间件层引入基于 IP/用户的速率限制（推荐 `upstash/ratelimit` 或内存方案）
2. 区分限制等级：生成类 API（严格）vs CRUD API（宽松）vs 公开 API（中等）
3. 返回标准 `429 Too Many Requests` 响应和 `Retry-After` 头

**涉及文件**:
- `middleware.ts` 或新增 `app/lib/rate-limit.ts`
- 关键 API 路由文件

**预估工时**: 4h

---

## 三、UI/UX 设计师提出的问题

### U-01 [P0-高] 导航菜单项过多

**问题描述**:
主导航包含 7+ 个入口（模板、创建、生成单张、画廊、价格、案例、我的项目），加上管理员链接可达 8-9 个。信息架构过于扁平，用户认知负担重。

**影响范围**: 全站导航体验、新用户首次认知

**改进方案**:
1. **精简主导航为 5 项**:
   - 首页 | 创建（合并"创建"和"生成单张"为子入口）| 画廊 | 定价 | 我的
2. "模板"并入"创建"流程的第一步
3. "案例"并入首页或画廊
4. 管理员入口移至用户菜单下拉

**涉及文件**:
- `app/components/Header.tsx`
- `app/shared/HeaderBridge.tsx`

**预估工时**: 3h

---

### U-02 [P0-高] 首页 Hero 缺少案例展示

**问题描述**:
当前 Hero 区域有 `HeroProcessAnimation` 动画和域选择卡片，但没有真实的 AI 生成效果展示。用户无法在 3 秒内理解"这个产品能做什么"。

**影响范围**: 首屏转化率

**改进方案**:
1. 添加 Before/After 对比轮播组件，展示 3-5 个域的真实案例
2. 每个案例：原图 → AI 生成效果，支持滑动对比
3. 下方添加"查看更多案例"链接到画廊

**涉及文件**:
- `app/components/HomePage.tsx`
- 新增 `app/components/BeforeAfterShowcase.tsx`

**预估工时**: 6h

---

### U-03 [P0-高] 定价页面无法购买但入口可见

**问题描述**:
定价页面展示三档方案（$19.99 / $49.99 / $99.99），点击购买后弹出 Toast "支付功能尚未开放"。入口可见但功能不可用，造成用户期望落差和信任损失。

**影响范围**: 用户信任、转化意愿

**改进方案**:
- **短期**: 将购买按钮改为"联系客服购买"或"即将上线，敬请期待"，添加微信二维码
- **长期**: 打通 Stripe 支付流程（见 P-01）

**涉及文件**:
- `app/components/PricingPage.tsx`

**预估工时**: 短期 1h / 长期见 P-01

---

### U-04 [P1-中] 游客与登录用户体验断裂

**问题描述**:
游客可以走完批量生成流程（选域 → 选模板 → 上传 → 生成），但生成结果无法保存。注册提示出现太晚，用户投入精力后才发现需要登录。

**影响范围**: 注册转化率

**改进方案**:
1. 在上传步骤前提示"登录后可保存作品"，引导注册
2. 生成完成后展示结果但加水印，注册后去水印并保存
3. 或调整为：游客可预览模板和效果，但生成需登录

**涉及文件**:
- `app/components/step-flow/StepUpload.tsx`
- `app/components/step-flow/StepGenerate.tsx`
- `app/lib/generation-service.ts`

**预估工时**: 4h

---

### U-05 [P1-中] 管理端与用户端视觉割裂

**问题描述**:
管理端使用 shadcn 默认亮色主题和 `AdminLayout`，与用户端的暗色金色主题完全不同。视觉上像两个不同的产品。

**影响范围**: 管理员体验一致性

**改进方案**:
1. 管理端复用用户端的暗色主题和 CSS 变量
2. 管理端导航使用侧边栏布局，保持 shadcn 组件但适配暗色

**涉及文件**:
- `app/admin/` 下所有页面和布局文件
- 管理端组件的样式调整

**预估工时**: 6h

---

### U-06 [P1-中] 空状态设计单一

**问题描述**:
Dashboard 的空状态仅有简单文字和一个 CTA 按钮，缺少引导性插图或动画，不够友好。

**影响范围**: 新用户首次进入 Dashboard 的体验

**改进方案**:
1. 为"无项目"、"无作品"、"无收藏"设计不同的插图和引导文案
2. 添加快速操作引导（如"创建你的第一个作品"步骤卡片）

**涉及文件**:
- `app/components/Dashboard/EmptyState.tsx`

**预估工时**: 3h

---

### U-07 [P1-中] 域图标辨识度不足

**问题描述**:
域选择器使用 Lucide 线性图标 + 颜色背景，但多个域的图标较相似（如 portrait 和 id_photo），辨识度不够。

**影响范围**: 域选择效率

**改进方案**:
1. 为每个域设计专属的插图或更具区分度的图标
2. 添加域示例缩略图，让用户直观看到该域的效果风格

**涉及文件**:
- `app/components/step-flow/StepDomain.tsx`
- `app/types/domain.ts`（图标映射）

**预估工时**: 4h

---

### U-08 [P2-低] 加载状态方案不统一

**问题描述**:
部分页面使用 `CardSkeleton` 骨架屏，部分使用 `Loading` 组件（Spinner），还有直接写 "加载中..." 文字的，体验不一致。

**影响范围**: 整体视觉一致性

**改进方案**:
1. 制定加载状态规范：列表页用骨架屏、操作按钮用 Spinner、全页加载用品牌 Loading
2. 统一替换所有加载状态实现

**涉及文件**:
- 涉及约 10-15 个组件文件

**预估工时**: 3h

---

### U-09 [P2-低] 无深色/浅色模式切换

**问题描述**:
CSS 变量层已定义暗色模式 token，但用户无法切换。当前默认暗色，部分用户可能偏好浅色。

**影响范围**: 用户偏好适配

**改进方案**:
1. 评估是否需要——当前暗色主题是品牌调性的核心部分
2. 如需支持：添加 `next-themes` 或自定义 ThemeProvider，在 Header 添加切换入口
3. 建议暂不实施，保持品牌一致性

**涉及文件**:
- `app/layout.tsx`
- `app/globals.css`
- `app/components/Header.tsx`

**预估工时**: 4h（如实施）

---

## 四、产品经理提出的问题

### P-01 [P0-紧急] 支付流程未上线

**问题描述**:
积分体系和订单模型已设计完成，Stripe 集成代码已就绪（webhook handler 存在），但实际支付通道未配置。用户无法购买积分，产品无收入来源。

**影响范围**: 商业化 — 无收入 = 无商业模式

**改进方案**:
1. **Phase 1 — Stripe 上线**:
   - 配置 Stripe 密钥和 webhook 地址
   - 在定价页面集成 Stripe Checkout 跳转
   - 测试完整支付 → webhook → 积分到账流程
2. **Phase 2 — 中国支付**（见 P-05）
3. **Phase 3 — 支付后体验**:
   - 支付成功页面
   - 邮件/站内通知
   - 积分到账动画

**涉及文件**:
- `app/components/PricingPage.tsx`
- `app/api/orders/create/route.ts`
- `app/api/orders/webhook/stripe/route.ts`
- `.env` 配置
- 新增 `app/components/PaymentSuccessPage.tsx`

**预估工时**: Phase 1: 6h / Phase 2: 16h / Phase 3: 4h

---

### P-02 [P0-紧急] 新用户无免费积分引导

**问题描述**:
Prisma schema 中 `credits @default(50)` 表明新用户注册时有 50 积分，但缺少以下环节：
- 无 Onboarding 引导告知用户有免费额度
- 无"首次生成"引导流程
- 无积分用途说明

**影响范围**: 新用户激活率

**改进方案**:
1. 注册成功后显示 Onboarding Modal（"恭喜！你获得了 50 免费积分"）
2. 引导第一步操作（"立即创建你的第一个作品"）
3. 在 Dashboard 首次访问时展示积分使用说明

**涉及文件**:
- `app/components/Dashboard/OnboardingModal.tsx`（已存在，需增强）
- `app/contexts/AuthContext.tsx`（注册后触发）
- 新增积分说明组件

**预估工时**: 4h

---

### P-03 [P0-高] 首屏转化率低

**问题描述**:
首页缺少以下转化关键要素：
- 真实案例 Before/After 对比
- 用户评价/社会证明
- 数据佐证（如"已为 XX 位用户生成 XX 张照片"）
- 明确的价值主张（3 秒内理解产品价值）

**影响范围**: 访客→注册转化率

**改进方案**:
1. Hero 区添加 Before/After 案例对比（与 U-02 合并）
2. 添加实时统计数据展示（用户数、生成数）
3. 整合精选用户评价（从画廊高赞作品中挑选）
4. 强化 CTA 文案（"30秒生成你的专属写真"）

**涉及文件**:
- `app/components/HomePage.tsx`
- 新增统计数据 API 和组件

**预估工时**: 8h

---

### P-04 [P1-高] 邀请系统前端 UI 缺失

**问题描述**:
后端邀请逻辑完整（`/api/invite/claim`，邀请者 +30、被邀请者 +70 积分），`invite_events` 表追踪审计。但前端缺少：
- 邀请链接生成/复制 UI
- 社交平台分享按钮
- 邀请记录查看页面
- 邀请奖励说明页面

Dashboard 中虽有 `InvitePanel` 组件，但功能需要增强。

**影响范围**: 用户增长 — 病毒传播系数（K 系数）为零

**改进方案**:
1. 增强 `InvitePanel`：显示邀请码、一键复制链接、分享到微信/微博
2. 添加邀请记录列表（谁通过你的邀请注册了）
3. 添加奖励进度条（"再邀请 X 人可获得额外奖励"）

**涉及文件**:
- `app/components/Dashboard/InvitePanel.tsx`（已存在）
- `app/components/ProfilePage.tsx`
- 可能需要新的 API 路由获取邀请记录

**预估工时**: 6h

---

### P-05 [P1-高] 缺少中国支付方式

**问题描述**:
当前仅有 Stripe 集成（主要覆盖信用卡和国际支付），缺少微信支付和支付宝——如果目标用户是中国市场，这是变现的致命缺失。

**影响范围**: 中国市场付费转化率

**改进方案**:
1. 评估目标市场（国际 vs 中国 vs 两者）
2. 如面向中国：
   - 集成微信支付（JSAPI / Native）
   - 集成支付宝（电脑网站支付 / 手机网站支付）
   - 或使用聚合支付平台（如 Stripe China、Ping++、YunGouOS）
3. 订单系统已支持多支付通道，需添加 provider 适配层

**涉及文件**:
- 新增支付适配层
- `app/api/orders/` 下新增 webhook 路由
- `app/components/PricingPage.tsx` 支付方式选择

**预估工时**: 16-24h（视方案复杂度）

---

### P-06 [P1-中] 无数据分析面板

**问题描述**:
系统已有下载追踪（`image_downloads`）、点赞追踪（`image_likes`）、积分交易记录（`credit_transactions`）等数据表，但缺少管理端分析面板。运营无法了解用户行为和业务数据。

**影响范围**: 数据驱动决策能力

**改进方案**:
1. **管理端 Dashboard**:
   - 核心指标卡片：日活、注册、生成次数、收入
   - 时间趋势图：7天/30天生成量、注册量
   - 域分布饼图：各域使用占比
   - 热门模板 Top 10 排行
2. **聚合 API**:
   - `GET /api/admin/analytics/overview` — 汇总数据
   - `GET /api/admin/analytics/trends` — 时间序列
   - `GET /api/admin/analytics/domains` — 域分布

**涉及文件**:
- 新增 `app/admin/analytics/page.tsx`
- 新增 `app/api/admin/analytics/` 路由
- 新增 `app/components/admin/AnalyticsDashboard.tsx`

**预估工时**: 12h

---

### P-07 [P2-中] 画廊缺少社区互动

**问题描述**:
画廊已有点赞和下载功能，但缺少评论、关注、收藏集等社交功能。用户之间无互动渠道，无法形成社区氛围。

**影响范围**: 用户留存和社区粘性

**改进方案**:
1. **Phase 1**: 添加评论功能（评论 + 回复）
2. **Phase 2**: 添加用户公开主页（作品集展示）
3. **Phase 3**: 添加关注/粉丝系统

**涉及文件**:
- Prisma schema 新增 `comments` 模型
- 新增评论相关 API 和组件
- `app/gallery/page.tsx` 增强

**预估工时**: Phase 1: 8h / Phase 2: 8h / Phase 3: 6h

---

### P-08 [P2-低] SEO 优化不足

**问题描述**:
页面缺少结构化元数据、Open Graph 标签、sitemap、robots.txt 等 SEO 基础设施。画廊和模板详情页缺少独立的 SEO 友好 URL。

**影响范围**: 搜索引擎自然流量

**改进方案**:
1. 为所有页面添加 `metadata` 导出（Next.js App Router 内置支持）
2. 添加 `app/sitemap.ts` 自动生成站点地图
3. 添加 `app/robots.ts`
4. 画廊作品和模板生成独立详情页（支持分享和搜索引擎索引）

**涉及文件**:
- 所有 `page.tsx` 文件添加 metadata
- 新增 `app/sitemap.ts`、`app/robots.ts`
- 新增模板详情页路由

**预估工时**: 6h

---

## 五、执行路线图

### Sprint 1 — 基础修复（1-2 天）
> 修复高危 Bug，确保核心功能正常

| 编号 | 任务 | 工时 | 负责角色 |
|------|------|------|---------|
| A-01 | 修复 ID 验证不匹配 | 0.5h | 架构师 |
| A-02 | 模型名从配置读取 | 2h | 架构师 |
| U-03 | 定价页按钮改为"联系客服" | 1h | 前端 |
| A-05 | 更新过时文档 | 2h | 架构师 |
| A-06 | 生产环境开启 SSR 守卫 | 1h | 架构师 |
| **合计** | | **6.5h** | |

### Sprint 2 — 商业化打通（3-5 天）
> 让产品有收入能力

| 编号 | 任务 | 工时 | 负责角色 |
|------|------|------|---------|
| P-01 Phase 1 | Stripe 支付上线 | 6h | 全栈 |
| P-02 | 新用户 Onboarding + 积分引导 | 4h | 前端+产品 |
| P-01 Phase 3 | 支付后体验优化 | 4h | 前端 |
| **合计** | | **14h** | |

### Sprint 3 — 转化率优化（3-5 天）
> 提升首屏体验和用户转化

| 编号 | 任务 | 工时 | 负责角色 |
|------|------|------|---------|
| U-01 | 精简导航结构 | 3h | 前端 |
| U-02 / P-03 | 首页案例展示 + Before/After | 8h | 前端+设计 |
| U-04 | 优化游客体验断裂 | 4h | 前端+产品 |
| U-06 | 增强空状态设计 | 3h | 前端 |
| **合计** | | **18h** | |

### Sprint 4 — 增长引擎（3-5 天）
> 启动病毒传播和社区建设

| 编号 | 任务 | 工时 | 负责角色 |
|------|------|------|---------|
| P-04 | 邀请系统前端 UI | 6h | 前端 |
| U-07 | 域图标增强 | 4h | 设计+前端 |
| P-08 | SEO 基础优化 | 6h | 前端 |
| **合计** | | **16h** | |

### Sprint 5 — 质量与可观测性（5-7 天）
> 建设测试基础设施和数据分析

| 编号 | 任务 | 工时 | 负责角色 |
|------|------|------|---------|
| A-03 Phase 1 | Vitest 单元测试 | 4h | 架构师 |
| A-03 Phase 2 | API 集成测试 | 6h | 架构师 |
| P-06 | 管理端数据分析面板 | 12h | 全栈 |
| A-08 | API 速率限制 | 4h | 架构师 |
| **合计** | | **26h** | |

### Sprint 6 — 体验打磨（5-7 天）
> 视觉统一和长尾优化

| 编号 | 任务 | 工时 | 负责角色 |
|------|------|------|---------|
| A-04 | 人脸检测功能定论 | 2h | 全栈 |
| A-07 | 统一 API 客户端 | 4h | 架构师 |
| U-05 | 管理端暗色主题 | 6h | 前端 |
| U-08 | 统一加载状态 | 3h | 前端 |
| P-05 | 中国支付方式评估/集成 | 16h | 全栈 |
| **合计** | | **31h** | |

### 远期 Backlog
| 编号 | 任务 | 工时 |
|------|------|------|
| A-03 Phase 3 | Playwright E2E 测试 | 8h |
| P-07 | 画廊社区功能（评论/关注） | 22h |
| U-09 | 深色/浅色模式切换 | 4h |

---

## 六、里程碑定义

| 里程碑 | 达成标准 | 目标时间 |
|--------|---------|---------|
| **M1: 基础健康** | A-01/A-02 修复，文档同步，SSR 守卫生产开启 | Sprint 1 完成 |
| **M2: 可商业化** | Stripe 支付上线，新用户 Onboarding 完成 | Sprint 2 完成 |
| **M3: 转化就绪** | 首页案例展示上线，导航精简，游客体验优化 | Sprint 3 完成 |
| **M4: 增长就绪** | 邀请 UI 上线，SEO 基础完成 | Sprint 4 完成 |
| **M5: 质量可控** | 核心路径测试覆盖 ≥60%，分析面板上线 | Sprint 5 完成 |
| **M6: 体验一致** | 视觉统一，加载一致，中国支付评估完成 | Sprint 6 完成 |

---

> **下一步**: 按 Sprint 顺序逐步执行，每个 Sprint 完成后进行回顾。P0 问题应在一周内全部解决。
