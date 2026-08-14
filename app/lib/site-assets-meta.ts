export type SiteAsset = { key: string; url: string; alt: string };

/** 素材位定义：key -> 默认图（未在后台设置时回退）。纯数据，无服务端依赖，可被客户端安全引用。 */
const DEFAULTS: Record<string, { url: string; alt: string }> = {
  "home.hero": { url: "/hero-vinyl.png", alt: "" },
  "about.blueLight": { url: "/images/about-blue-light-zine.webp", alt: "蓝色投影与装置现场的纸刊拼贴作品" },
  "about.wall": { url: "/images/about-sunday-wall-zine.webp", alt: "Sunday Service Shenzhen 海报墙的纸刊拼贴作品" },
  "archive.kendrick": { url: "/images/kendrick-lamar.webp", alt: "Kendrick Lamar 肖像" },
  "archive.kanye": { url: "/images/kanye-west-cutout.webp", alt: "Kanye West 演出人物抠图" },
  "archive.lauryn": { url: "/images/lauryn-hill-cutout.webp", alt: "Lauryn Hill 演出人物抠图" },
  "submit.libraryBg": { url: "/api/media/file/uploads/site-assets/submit.libraryBg/vinyl-rack.png", alt: "" },
};

export const SITE_ASSET_KEYS = Object.keys(DEFAULTS);

/** 素材位的中文显示名（管理后台用）。 */
export const SITE_ASSET_LABELS: Record<string, string> = {
  "home.hero": "首页黑胶唱片",
  "about.blueLight": "关于页 · 蓝色投影拼贴",
  "about.wall": "关于页 · 海报墙拼贴",
  "archive.kendrick": "人物专题 · Kendrick Lamar",
  "archive.kanye": "人物专题 · Kanye West",
  "archive.lauryn": "人物专题 · Lauryn Hill",
  "submit.libraryBg": "提交资料页 · 背景图",
};

export const SITE_ASSET_LABELS_EN: Record<string, string> = {
  "home.hero": "Homepage vinyl record",
  "about.blueLight": "About · Blue-light collage",
  "about.wall": "About · Poster-wall collage",
  "archive.kendrick": "Artist feature · Kendrick Lamar",
  "archive.kanye": "Artist feature · Kanye West",
  "archive.lauryn": "Artist feature · Lauryn Hill",
  "submit.libraryBg": "Archive submission · Background",
};

export const SITE_ASSET_DEFAULTS = DEFAULTS;
