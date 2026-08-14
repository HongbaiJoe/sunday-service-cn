# 环境变量与平台配置登记表

> 本项目运行在 Cloudflare Workers（Next.js / Vinext）。所有密钥必须配置为
> Cloudflare 控制台 → Worker → 设置 → 变量与机密 中的 **Secret（机密）**，
> 严禁提交到仓库。本地开发用 `.dev.vars` 文件（已被 .gitignore 排除）。

## 必需环境变量（生产）

| 变量名 | 用途 | 示例值 | 敏感? | 生产配置方式 |
|---|---|---|---|---|
| `RESEND_API_KEY` | Resend 邮件发送验证码 | `re_xxxxxxxx` | **是** | Secret |
| `RESEND_FROM` | 发件人地址 | `SSCN 社区 <noreply@sundayservicecn.com>` | 否 | 环境变量 |
| `ADMIN_EMAILS` | 管理员白名单（逗号分隔，提升角色用） | `admin@sundayservice.cn,editor@sundayservice.cn` | 否（但注意） | 环境变量 |

## 可选环境变量（短信通道，当前前端已关闭）

| 变量名 | 用途 | 示例值 | 敏感? |
|---|---|---|---|
| `TENCENT_SECRET_ID` | 腾讯云访问密钥 ID | `AKIDxxxx` | **是** |
| `TENCENT_SECRET_KEY` | 腾讯云访问密钥 | `xxxx` | **是** |
| `TENCENT_SMS_SDK_APP_ID` | 腾讯云短信 SDK AppID | `1400xxxx` | 否 |
| `TENCENT_SMS_SIGN_NAME` | 短信签名 | `Sunday Service CN` | 否 |
| `TENCENT_SMS_TEMPLATE_ID` | 短信模板 ID | `1234567` | 否 |

> 手机号短信通道由前端 `app/components/member-access-form.tsx` 的
> `PHONE_CHANNEL_ENABLED` 开关控制，当前为 `false`（仅邮箱通道）。

## 平台绑定（wrangler.jsonc，非密钥）

| 绑定 | 类型 | 值 |
|---|---|---|
| `DB` | D1 数据库 | `sunday-service-db`（生产 database_id 见 wrangler.jsonc） |
| `MEDIA` | R2 存储桶 | `sunday-service-media` |
| `ASSETS` | 静态资源 | `dist/client` |
| `IMAGES` | Cloudflare Image Resizing | 由 Worker 配置 |

## 本地开发

- 本地 D1/R2 由 Wrangler 模拟，无需真实云资源。
- 本地邮箱验证码不会真实发送（开发预览模式直接登录）。
- `.dev.vars` 示例：

```bash
RESEND_API_KEY=re_test_only_placeholder
RESEND_FROM=SSCN 社区 <noreply@sundayservicecn.com>
ADMIN_EMAILS=admin@sundayservice.cn
```

## 密钥轮换提醒

- 部署完成后，请轮换对话中提供的 GitHub token、Cloudflare API Token、R2 Access Key、Resend API Key。
- GitHub token 建议改为仓库级 fine-grained token（仅 SHUJILAI/SS，contents: read/write）。
- Cloudflare API Token 建议收窄为仅 Worker 脚本 + D1 + R2 编辑权限。
