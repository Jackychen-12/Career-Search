export interface CampusEvent {
  id: string;
  company: string;
  title: string;
  type: "宣讲会" | "网申" | "笔试" | "面试" | "其他";
  date: string;
  time?: string;
  location?: string;
  school: string;
  url: string;
  source: "清华" | "北大" | "微信";
}

export interface WechatArticle {
  id: string;
  title: string;
  account: string;
  date: string;
  url: string;
  summary?: string;
}
