# 邮箱验证码登录 · 开通指引（Resend）

网站已接入邮箱验证码注册/登录（Resend 邮件服务），代码已部署上线。当前只差 Resend 侧的配置。

## 你需要做的（约 15 分钟）

### 1. 注册 Resend 账号

1. 打开 https://resend.com 用邮箱注册（免费额度：每月 3,000 封，验证码邮件绰绰有余）
2. 注册后进入 Dashboard

### 2. 添加并验证域名

1. 左侧菜单 **Domains → Add Domain**
2. 输入你的发件域名，例如 `sundayservicecn.com`（如果域名解析在 Cloudflare，直接用同一个域名即可）
3. Resend 会给出 3 条 DNS 记录（SPF / DKIM / 可选 DMARC），复制到 Cloudflare DNS 解析里：
   - **SPF (TXT)**：`v=spf1 include:amazonses.com ~all` 或 Resend 提供的值
   - **DKIM (TXT)**：Resend 提供的 `resend._domainkey` 记录
   - **DMARC (TXT)**（可选）：`_dmarc` 记录
4. 回到 Resend 点击 **Verify**，等待状态变为 **Verified**（通常几分钟内）

> 如果不想验证自己的域名，也可以先跳过：Resend 允许向**已验证域名**发信，未验证域名只能发给自己注册时的邮箱做测试。正式上线建议完成域名验证。

### 3. 获取 API Key

1. 左侧菜单 **API Keys → Create API Key**
2. 权限选 **Sending access**（只发信，最小权限）
3. 创建后**只显示一次**，务必保存，格式为 `re_xxxxxxxx`

### 4. 把凭证交给我

把下面 2 个值发给我，我会：
1. 通过 API 配置到 Cloudflare Worker 的环境变量（Secret 加密存储，不会出现在代码里）
2. 用你的邮箱发一条真实验证码，端到端测试完整注册/登录流程

| 凭证 | 说明 | 示例 |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend API Keys 页面创建 | `re_xxxxxxxx` |
| `RESEND_FROM` | 发件人地址，格式 `名称 <邮箱>`，邮箱必须是已验证域名下的 | `SSCN 社区 <noreply@sundayservicecn.com>` |

## 常见问题

- **免费额度够吗？** 每月 3,000 封，验证码场景完全够用；超出后按量计费，很便宜。
- **验证码有效期多久？** 5 分钟，同一邮箱 60 秒内只能重发一次，最多 5 条未使用（与短信一致）。
- **登录后会话多久过期？** 30 天，登出会清除。
- **没配好之前线上什么状态？** 登录页会显示"邮件服务未配置"的提示，其他功能（浏览、资料库、展厅）不受影响。
- **收不到邮件？** 先检查 Resend 域名是否 Verified；再检查垃圾箱；SPF/DKIM 记录验证通过后一般 1-2 分钟内到达。
