# Sunday Service CN

Sunday Service CN 是面向中文用户的欧美音乐线上社群。本仓库包含可运行网站、用户系统、社区、资料库、展厅申请流程和管理后台。

线上访问：https://sundayservicecn.com

公开仓库：https://github.com/SHUJILAI/SS

## 当前内容

- 巨型品牌首页、翻档案滚动交互与主要内容入口
- 用户登录、头像、改名、邮箱资料、成员/管理员权限
- 中英文界面切换；网站预置内容完整双语，用户内容保留原文并可附英文译文
- 社区发帖、回复、图片/视频/音频上传和双栏帖子流（代码已完成，正式引流前默认隐藏）
- 资料提交、展览申请及管理员审核
- 帖子、评论和用户管理，管理员操作记录及 JSON 备份
- 桌面与移动端响应式布局
- 产品需求、页面地图、设计参考、测试计划与图片许可记录

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
git clone https://github.com/SHUJILAI/SS.git
cd SS
npm ci
npm run dev
```

打开终端显示的本地网址。

社区默认关闭。需要内部验收时，在 `.env.local` 中加入 `NEXT_PUBLIC_COMMUNITY_ENABLED=true` 后重新启动；正式公开前保持 `false` 或不配置。

本地预览可在 `/login` 或 `/register` 输入邮箱/手机号建立测试身份，也可在 `/account` 使用快速成员/管理员入口。这些入口不会发送验证码，并且只在开发环境出现。

线上正式认证支持**邮箱**账号通道，注册时需同时设置密码：

- **邮箱 + 邮件验证码**（Resend）

登录时可用**密码**或**验证码**任一种。（手机号短信通道代码已保留，前端通过 `PHONE_CHANNEL_ENABLED` 开关隐藏，待腾讯云短信配置就绪后可随时恢复。）部署时需要为 Worker 配置以下环境变量：

| 变量 | 说明 |
| --- | --- |
| `TENCENT_SECRET_ID` | 腾讯云 API 密钥 ID（SecretId） |
| `TENCENT_SECRET_KEY` | 腾讯云 API 密钥 Key（SecretKey） |
| `TENCENT_SMS_SDK_APP_ID` | 短信应用 SDKAppID（腾讯云短信控制台） |
| `TENCENT_SMS_SIGN_NAME` | 短信签名（需审核通过，如"周日服务"） |
| `TENCENT_SMS_TEMPLATE_ID` | 验证码短信模板 ID（需审核通过，含 `{1}` 验证码和 `{2}` 有效期两个参数） |
| `RESEND_API_KEY` | Resend API Key（`re_` 开头，Sending access 权限即可） |
| `RESEND_FROM` | 发件人地址，格式 `名称 <邮箱>`，邮箱需在 Resend 已验证域名下 |

开通指引见 `docs/EMAIL_SETUP.md`（Resend 邮件）；手机号通道开通见 `docs/SMS_SETUP.md`（腾讯云短信，前端需将 `PHONE_CHANNEL_ENABLED` 置为 `true`）。

认证流程：
- `POST /api/auth/send-code`（发送验证码，支持 `channel: "phone" | "email"`，60 秒限频、5 分钟有效）→ `POST /api/auth/verify`（校验验证码，注册/登录并签发 30 天会话 Cookie，注册时需同时设置密码）
- `POST /api/auth/login`（手机号/邮箱 + 密码登录，签发会话 Cookie）
- `POST /api/auth/logout`（登出）

密码使用 PBKDF2-SHA256 加盐哈希（10 万次迭代，Cloudflare Workers Web Crypto 上限）存储，验证码与会话数据存入 D1（`sms_codes`、`sessions` 表），用户密码哈希存于 `users.password_hash`。

## 检查

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` 会先执行生产构建，再验证公开页面、账户/提交/后台页面、数据资源绑定与产品文档。

## 项目结构

- `app/`：页面、组件与全局视觉样式
- `app/api/`：用户、帖子、评论、媒体、资料、展览与后台接口
- `db/`、`drizzle/`：D1 数据结构及迁移
- `public/images/`：原型人物图片
- `docs/PRD.md`：本轮产品范围
- `docs/SITEMAP.md`：页面与用户路径
- `docs/TEST_PLAN.md`：测试范围
- `docs/DEPLOYMENT_HANDOFF.md`：GitHub 交付与正式上线缺口
- `docs/CLIENT_HANDOFF.md`：甲方本地测试、验收路径与上线步骤
- `docs/DESIGN_REFERENCES.md`：设计来源与使用边界
- `docs/ASSET_CREDITS.md`：图片许可和署名

## 技术形态

项目使用 Next.js 风格的 App Router、TypeScript 与 vinext；结构化数据存入 Cloudflare D1，媒体文件存入 R2。媒体通过 640 KB 分片上传，最终文件上限为 25 MB。

当前版本刻意不加入私信、积分、等级、通知、推荐算法和主站内展览制作器。展厅仅审核并展示用户独立制作的外部展览入口。

正式上线前的必做事项见 `docs/DEPLOYMENT_HANDOFF.md`。

面向甲方的逐步测试与上线说明见 `docs/CLIENT_HANDOFF.md`。源码采用 MIT 许可；照片、编辑内容、艺人姓名、专辑视觉和其他署名素材不因源码许可而自动获得再授权。
