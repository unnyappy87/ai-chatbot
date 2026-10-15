export const LANGS = {
  ko: { label: "KO", name: "한국어", speech: "ko-KR" },
  en: { label: "EN", name: "English", speech: "en-US" },
  ja: { label: "JA", name: "日本語", speech: "ja-JP" },
  zh: { label: "ZH", name: "中文", speech: "zh-CN" },
  es: { label: "ES", name: "Español", speech: "es-ES" },
};
/* 글자 종류를 세어서 어떤 언어인지 맞춰요 (서버 호출 없음, 토큰 0) */
export function detectLang(text = "") {
  let ko = 0,
    ja = 0,
    zh = 0,
    latin = 0,
    es = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x3131 && c <= 0x318e)) ko++;
    else if (c >= 0x3040 && c <= 0x30ff) ja++;
    else if (c >= 0x4e00 && c <= 0x9fff) zh++;
    else if (/[A-Za-z]/.test(ch)) latin++;
    if (/[¿¡ñáéíóúü]/i.test(ch)) es++;
  }
  if (ko + ja + zh + latin < 2) return null;
  if (ja > 0 && ja >= ko && ja + zh >= latin) return LANGS.ja;
  const max = Math.max(ko, zh, latin);
  if (ko === max) return LANGS.ko;
  if (zh === max) return LANGS.zh;
  return es > 0 ? LANGS.es : LANGS.en;
}
/* 시간대별 인사말 */
export function greetingFor(hour) {
  if (hour >= 5 && hour < 11) return { lead: "좋은", em: "아침입니다", world: ["Good morning", "おはようございます", "Buenos días", "早上好"] };
  if (hour >= 11 && hour < 17) return { lead: "좋은", em: "오후입니다", world: ["Good afternoon", "こんにちは", "Buenas tardes", "下午好"] };
  if (hour >= 17 && hour < 22) return { lead: "좋은", em: "저녁입니다", world: ["Good evening", "こんばんは", "Buenas noches", "晚上好"] };
  return { lead: "깊은", em: "밤이네요", world: ["Still up?", "こんばんは", "Buenas noches", "晚安"] };
}
