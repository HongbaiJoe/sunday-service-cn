/**
 * 社区内容屏蔽词过滤模块
 *
 * 对应文档：docs/MODERATION_WORDS.md
 *
 * 用法：
 *   import { moderateContent } from "./moderation";
 *   const result = moderateContent(title, body);
 *   if (!result.passed) return json({ error: result.message }, 400);
 */

export type Severity = "P0" | "P1" | "P2";

export interface ModerationResult {
  passed: boolean;
  severity: Severity | null;
  category: string | null;
  matchedTerm: string | null;
  message: string;
}

const PASS: ModerationResult = {
  passed: true,
  severity: null,
  category: null,
  matchedTerm: null,
  message: "",
};

interface Rule {
  category: string;
  severity: Severity;
  /** 精确关键词列表（归一化后匹配） */
  keywords: string[];
  /** 正则模式列表（在原文上匹配） */
  patterns: RegExp[];
}

/* ------------------------------------------------------------------ */
/*  屏蔽词库                                                           */
/* ------------------------------------------------------------------ */

const rules: Rule[] = [
  /* ---- 3.1 种族歧视与民族仇恨 (P0) ---- */
  {
    category: "种族歧视与民族仇恨",
    severity: "P0",
    keywords: [
      "尼哥", "黑鬼", "黑奴", "白猪", "黄皮猴", "支那", "支那猪",
      "劣等民族", "劣等种族", "种族灭绝好", "黑猴子",
    ],
    patterns: [],
  },

  /* ---- 3.2 政治敏感 (P0) ---- */
  {
    category: "政治敏感",
    severity: "P0",
    keywords: [
      "港独", "台独", "藏独", "疆独", "港台独立", "台湾独立",
      "西藏独立", "东突厥斯坦", "颠覆政权", "推翻社会主义",
      "天安门事件", "六四事件", "法轮功", "法輪功",
      "全能神", "邪教组织", "反华", "辱华",
    ],
    patterns: [],
  },

  /* ---- 3.3 恐怖主义与极端主义 (P0) ---- */
  {
    category: "恐怖主义与极端主义",
    severity: "P0",
    keywords: [
      "基地组织", "伊斯兰国", "isIs", "isis", "塔利班",
      "博科圣地", "努斯拉阵线", "圣战", "杰哈德",
      "制造炸弹", "制作爆炸物", "炸弹制作",
    ],
    patterns: [],
  },

  /* ---- 3.4 人身攻击与侮辱 (P1) ---- */
  {
    category: "人身攻击与侮辱",
    severity: "P1",
    keywords: [
      "傻逼", "操你妈", "草泥马", "滚你妈", "你妈死了",
      "去死吧", "你去死", "弱智", "脑残", "废物",
      "贱人", "婊子", "狗东西", "畜生不如", "人渣",
      "死全家", "全家死光", "不得好死", "下地狱",
    ],
    patterns: [],
  },

  /* ---- 3.5 色情低俗 (P0) ---- */
  {
    category: "色情低俗",
    severity: "P0",
    keywords: [
      "招嫖", "约炮", "裸聊", "一夜情", "上门服务",
      "色情资源", "av下载", "种子下载", "裸体照片",
      "未成年色情", "儿童色情", "萝莉", "正太色情",
      "卖淫", "嫖娼", "找小姐", "包夜",
    ],
    patterns: [],
  },

  /* ---- 3.6 暴力与血腥 (P1) ---- */
  {
    category: "暴力与血腥",
    severity: "P1",
    keywords: [
      "杀人方法", "如何杀人", "自制武器", "自制枪支",
      "虐待动物", "虐杀猫狗", "活剥皮",
      "割腕", "烧炭自杀", "跳楼方法", "上吊方法",
      "自杀方法", "无痛自杀",
    ],
    patterns: [],
  },

  /* ---- 3.7 违法犯罪 — 毒品 (P0) ---- */
  {
    category: "违法犯罪-毒品",
    severity: "P0",
    keywords: [
      "冰毒", "海洛因", "大麻", "k粉", "摇头丸", "麻古",
      "可卡因", "鸦片", "吗啡", "冰毒制作", "制毒",
      "飞叶子", "溜冰", "吸毒", "拿货出货",
    ],
    patterns: [],
  },

  /* ---- 3.7 违法犯罪 — 赌博 (P0) ---- */
  {
    category: "违法犯罪-赌博",
    severity: "P0",
    keywords: [
      "赌球", "六合彩", "时时彩", "外围赌球", "网络赌场",
      "赌博网站", "百家乐", "龙虎斗", "赌资", "下注",
    ],
    patterns: [],
  },

  /* ---- 3.7 违法犯罪 — 诈骗 (P0) ---- */
  {
    category: "违法犯罪-诈骗",
    severity: "P0",
    keywords: [
      "刷单", "杀猪盘", "洗钱", "诈骗教程", "骗钱方法",
      "钓鱼网站", "盗号", "盗取密码", "银行卡复制",
    ],
    patterns: [],
  },

  /* ---- 3.7 违法犯罪 — 违禁品交易 (P0) ---- */
  {
    category: "违法犯罪-违禁品",
    severity: "P0",
    keywords: [
      "买枪", "卖枪", "枪支出售", "弹药出售", "管制刀具出售",
      "假身份证", "假护照", "假钞", "伪造货币",
      "销赃", "收赃",
    ],
    patterns: [],
  },

  /* ---- 3.8 地域歧视 (P1) ---- */
  {
    category: "地域歧视",
    severity: "P1",
    keywords: [
      "河南人偷井盖", "东北人都是黑社会",
      "地域黑", "某省人都是",
    ],
    patterns: [],
  },

  /* ---- 3.9 性别歧视与性取向歧视 (P1) ---- */
  {
    category: "性别歧视",
    severity: "P1",
    keywords: [
      "女人就该", "男人都是", "女拳", "男权至上",
      "基佬去死", "同性恋变态", "变性人有病",
    ],
    patterns: [],
  },

  /* ---- 3.10 宗教歧视 (P1) ---- */
  {
    category: "宗教歧视",
    severity: "P1",
    keywords: [
      "回民都是", "穆斯林都是恐怖分子", "佛教徒都是",
      "亵渎神灵", "宗教都是骗局",
    ],
    patterns: [],
  },

  /* ---- 3.11 邪教与封建迷信 (P0) ---- */
  {
    category: "邪教与封建迷信",
    severity: "P0",
    keywords: [
      "全能神", "实际神", "东方闪电", "呼喊派",
      "门徒会", "三赎基督", "血水圣灵",
      "驱邪消灾", "算命消灾", "破财消灾",
    ],
    patterns: [],
  },

  /* ---- 3.12 隐私泄露与人肉搜索 (P0) ---- */
  {
    category: "隐私泄露",
    severity: "P0",
    keywords: [
      "人肉他", "开盒他", "曝光住址", "曝光身份证",
      "曝光手机号", "他家地址是",
    ],
    patterns: [
      // 身份证号（18位或15位）
      /\b\d{17}[\dXx]\b/,
      // 手机号（11位，1开头）
      /\b1[3-9]\d{9}\b/,
      // 银行卡号（16-19位连续数字）
      /\b\d{16,19}\b/,
    ],
  },

  /* ---- 3.13 网络暴力与集体骚扰 (P1) ---- */
  {
    category: "网络暴力",
    severity: "P1",
    keywords: [
      "大家一起骂他", "组团去骂", "集体举报他",
      "挂他", "曝光他", "网暴他",
    ],
    patterns: [],
  },

  /* ---- 3.14 垃圾广告与恶意推广 (P2) ---- */
  {
    category: "垃圾广告",
    severity: "P2",
    keywords: [
      "加微信", "加qq群", "扫码进群", "加v信",
      "代购请联系", "微商招募", "月入过万",
      "刷量", "刷赞", "买粉", "出售账号",
    ],
    patterns: [],
  },

  /* ---- 3.15 未成年人保护 (P0) ---- */
  {
    category: "未成年人保护",
    severity: "P0",
    keywords: [
      "未成年色情", "儿童色情", "幼女", "正太",
      "引诱未成年人", "教唆未成年人",
      "校园霸凌方法", "欺负同学方法",
    ],
    patterns: [],
  },

  /* ---- 3.16 版权侵犯与盗版推广 (P1) ---- */
  {
    category: "版权侵犯",
    severity: "P1",
    keywords: [
      "破解付费音乐", "免费下载付费歌曲",
      "盗版音乐资源", "盗版专辑下载",
      "批量转载版权资源",
    ],
    patterns: [],
  },

  /* ---- 3.17 自残与心理健康危机 (P1) ---- */
  {
    category: "自残与心理健康危机",
    severity: "P1",
    keywords: [
      "想死", "不想活了", "活着没意思", "想结束一切",
      "割自己", "自残方法", "鼓励自残",
    ],
    patterns: [],
  },
];

/* ------------------------------------------------------------------ */
/*  归一化处理（对抗变体绕过）                                         */
/* ------------------------------------------------------------------ */

/**
 * 将文本归一化，去除干扰字符，统一为简体小写，
 * 以便关键词精确匹配能覆盖符号插入、大小写混写等绕过手段。
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    // 去除零宽字符
    .replace(/[\u200b-\u200f\u202a-\u202e\u00ad\ufeff]/g, "")
    // 去除所有空格和常见分隔符号
    .replace(/[\s\u3000\.\-_*/\\|~`!@#$%^&+=<>{}[\]()（）【】《》""''、，。！？；：·]/g, "")
    // 繁体转简体（基本映射，覆盖常见字）
    .replace(/臺/g, "台")
    .replace(/灣/g, "湾")
    .replace(/華/g, "华")
    .replace(/國/g, "国")
    .replace(/產/g, "产")
    .replace(/黨/g, "党")
    .replace(/東/g, "东")
    .replace(/獨/g, "独")
    .replace(/藏/g, "藏")
    .replace(/疆/g, "疆")
    .replace(/顛/g, "颠")
    .replace(/覆/g, "覆")
    .replace(/權/g, "权")
    .replace(/壇/g, "坛")
    .replace(/豬/g, "猪")
    .replace(/賤/g, "贱")
    .replace(/婊/g, "婊")
    .replace(/殺/g, "杀")
    .replace(/滅/g, "灭")
    .replace(/種/g, "种")
    .replace(/族/g, "族")
    .replace(/聖/g, "圣")
    .replace(/戰/g, "战")
    .replace(/製/g, "制")
    .replace(/彈/g, "弹")
    .replace(/藥/g, "药")
    .replace(/賣/g, "卖")
    .replace(/買/g, "买")
    .replace(/槍/g, "枪")
    .replace(/彈/g, "弹")
    .replace(/偽/g, "伪")
    .replace(/詐/g, "诈")
    .replace(/騙/g, "骗")
    .replace(/賭/g, "赌")
    .replace(/毒/g, "毒")
    .replace(/色/g, "色")
    .replace(/情/g, "情");
}

/* ------------------------------------------------------------------ */
/*  核心检测函数                                                       */
/* ------------------------------------------------------------------ */

/**
 * 检查单段文本是否命中屏蔽词。
 * 返回第一个命中的规则结果；未命中则返回 passed: true。
 */
export function moderateText(text: string): ModerationResult {
  if (!text) return PASS;

  const normalized = normalize(text);

  for (const rule of rules) {
    // 关键词匹配（在归一化后的文本上）
    for (const kw of rule.keywords) {
      const normalizedKw = normalize(kw);
      if (normalizedKw && normalized.includes(normalizedKw)) {
        return {
          passed: false,
          severity: rule.severity,
          category: rule.category,
          matchedTerm: kw,
          message: severityMessage(rule.severity, rule.category),
        };
      }
    }

    // 正则模式匹配（在原文上）
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return {
          passed: false,
          severity: rule.severity,
          category: rule.category,
          matchedTerm: pattern.source,
          message: severityMessage(rule.severity, rule.category),
        };
      }
    }
  }

  return PASS;
}

/**
 * 检查多段文本（如标题 + 正文 + 标签）。
 * 任一字段命中即返回拦截结果。
 */
export function moderateContent(...fields: string[]): ModerationResult {
  for (const field of fields) {
    const result = moderateText(field);
    if (!result.passed) return result;
  }
  return PASS;
}

/**
 * 判断是否为硬拦截（P0 级别，必须阻止发布）。
 */
export function isBlocked(result: ModerationResult): boolean {
  return !result.passed && (result.severity === "P0" || result.severity === "P1");
}

/* ------------------------------------------------------------------ */
/*  辅助                                                               */
/* ------------------------------------------------------------------ */

function severityMessage(severity: Severity, category: string): string {
  switch (severity) {
    case "P0":
      return `内容包含违规信息（${category}），已被拦截。如认为误判，请在账户页面发起申诉。`;
    case "P1":
      return `内容包含敏感信息（${category}），暂不公开。如认为误判，请在账户页面发起申诉。`;
    case "P2":
      return `内容包含疑似推广信息（${category}），已标记待审。`;
  }
}

/**
 * 获取自残/心理健康危机提示信息。
 * 当 moderateText 命中"自残与心理健康危机"类别时调用。
 */
export function crisisSupportMessage(): string {
  return "如果你正在经历困难，请知道你不是一个人。全国24小时心理援助热线：400-161-9995。";
}
