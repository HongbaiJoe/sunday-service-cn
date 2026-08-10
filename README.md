# Sunday Service CN

Sunday Service CN 是面向中文用户的黑人音乐线上社群。本仓库包含可运行网站、用户系统、社区、资料库、展厅申请流程和管理后台。

公开仓库：https://github.com/HongbaiJoe/sunday-service-cn

## 当前内容

- 巨型品牌首页、翻档案滚动交互与主要内容入口
- 用户登录、头像、改名、手机号资料、成员/管理员权限
- 社区发帖、回复、图片/视频/音频上传和双栏帖子流
- 资料提交、展览申请及管理员审核
- 帖子、评论和用户管理，管理员操作记录及 JSON 备份
- 桌面与移动端响应式布局
- 产品需求、页面地图、设计参考、测试计划与图片许可记录

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
git clone https://github.com/HongbaiJoe/sunday-service-cn.git
cd sunday-service-cn
npm ci
npm run dev
```

打开终端显示的本地网址。

本地预览可在 `/login` 或 `/register` 输入邮箱/手机号建立测试身份，也可在 `/account` 使用快速成员/管理员入口。这些入口不会发送验证码，并且只在开发环境出现。当前线上托管环境使用 Sign in with ChatGPT；要让正式站点支持邮箱验证码或手机短信验证码，部署方必须接入第三方身份验证服务。

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
