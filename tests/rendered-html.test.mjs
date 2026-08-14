import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import test, { after, before } from "node:test";

const templateRoot = new URL("../", import.meta.url);
const port = 41000 + (process.pid % 1000);
const baseUrl = `http://127.0.0.1:${port}`;
let server;
let serverOutput = "";

before(async () => {
  // 跨平台启动：Windows 下 node_modules/.bin/vinext 是 .cmd 包装器，spawn 需带 shell: true；
  // cmd 把 "/" 当参数开关且不识别 "./" 前缀，因此 Windows 必须用反斜杠路径。
  const isWin = process.platform === "win32";
  const vinextBin = isWin ? "node_modules\\.bin\\vinext" : "node_modules/.bin/vinext";
  server = spawn(vinextBin, ["dev", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, NEXT_PUBLIC_COMMUNITY_ENABLED: "true", WRANGLER_LOG_PATH: ".wrangler/wrangler-test.log" },
    stdio: ["ignore", "pipe", "pipe"],
    ...(isWin ? { shell: true } : {}),
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });

  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`本地测试服务器未启动：\n${serverOutput}`);
});

after(() => {
  if (!server) return;
  // 忽略 kill 后的 ESRCH 等错误事件
  server.on("error", () => {});
  if (process.platform === "win32") {
    // Windows 下 SIGTERM 只杀 cmd 包装器，需用 taskkill /T 结束整棵进程树
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }
});

async function render(pathname = "/") {
  return fetch(`${baseUrl}${pathname}`, { headers: { accept: "text/html" } });
}

test("server-renders the Sunday Service CN homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>Sunday Service CN<\/title>/i);
  assert.match(html, /中国最大的欧美音乐社群/);
  assert.match(html, />SUNDAY</);
  assert.match(html, />SERVICE CN</);
  assert.match(html, /Kendrick Lamar/);
  assert.match(html, /The Life of Pablo/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("server-renders every public and system route", async () => {
  const routes = [
    ["/community", "社区"],
    ["/community/kendrick-ranking", "Kendrick Lamar 专辑排序"],
    ["/database", "资料库"],
    ["/exhibitions", "展厅"],
    ["/events", "活动"],
    ["/about", "关于"],
    ["/account", "账户"],
    ["/login", "登录"],
    ["/register", "注册"],
    ["/submit/library", "提交资料"],
    ["/submit/exhibition", "申请展览"],
    ["/admin", "管理后台"],
  ];

  for (const [pathname, title] of routes) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.match(html, new RegExp(`<title>${title} — Sunday Service CN<\\/title>`, "i"));
  }
});

test("keeps the product contract and data bindings in source control", async () => {
  const [page, layout, packageJson, prd, sitemap, testPlan, hosting, auth, upload, styles, schema, profile, accessForm] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../docs/PRD.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/SITEMAP.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/TEST_PLAN.md", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/client-upload.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/account-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/member-access-form.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<InteractiveHero heroUrl=/);
  assert.match(layout, /lang="zh-CN"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(prd, /单一中文界面/);
  assert.match(sitemap, /community\/kendrick-ranking/);
  assert.match(testPlan, /减少动态效果/);
  assert.match(hosting, /"d1"\s*:\s*"DB"/);
  assert.match(hosting, /"r2"\s*:\s*"MEDIA"/);
  assert.match(auth, /requireAdmin/);
  assert.match(upload, /chunkSize = 640 \* 1024/);
  assert.match(styles, /\.live-feed[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /"Songti SC"/);
  assert.match(styles, /line-height:\s*1\.02/);
  assert.match(schema, /phoneVerifiedAt/);
  assert.match(schema, /avatarUrl/);
  assert.match(profile, /uploadMedia/);
  assert.match(accessForm, /邮箱或手机号/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});
