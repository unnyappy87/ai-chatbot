import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { useChat } from "./hooks/useChat.js";
import { useSpeechInput, useSpeechOutput } from "./hooks/useSpeech.js";
import { LANGS, detectLang, greetingFor } from "./lib/lang.js";
import Composer from "./components/Composer.jsx";
import Message from "./components/Message.jsx";
import {
  Logo, IconPlus, IconClock, IconSun, IconMoon, IconClose, IconTrash, IconMenu,
} from "./components/Icons.jsx";

const PERSONAS = [
  { id: "guide", label: "포트폴리오 가이드" },
  { id: "assistant", label: "어시스턴트" },
  { id: "teacher", label: "선생님" },
  { id: "coder", label: "코딩 멘토" },
  { id: "translator", label: "번역가" },
];

const VOICE_LANGS = [
  { code: "ko-KR", label: "KO" },
  { code: "en-US", label: "EN" },
  { code: "ja-JP", label: "JA" },
  { code: "es-ES", label: "ES" },
  { code: "zh-CN", label: "ZH" },
];

const SUGGESTIONS = {
  guide: [
    "LeeSuJi는 어떤 디자이너인가요?",
    "대표 프로젝트를 소개해 주세요",
    "사용하는 기술과 도구가 궁금해요",
    "이 챗봇은 어떻게 만들어졌나요?",
  ],
  assistant: [
    "면접에서 자기소개를 잘하는 방법 알려줘",
    "Explain what an API is with a pizza shop analogy",
    "東京で2泊3日の旅行プランを作って",
    "Dame 3 ideas para un portafolio web",
  ],
  teacher: [
    "CSS flexbox를 초등학생도 이해하게 설명해줘",
    "React의 state가 뭐야?",
    "What is a REST API in simple words?",
  ],
  coder: [
    "버튼 hover 애니메이션 CSS 예제 알려줘",
    "fetch로 API 호출하는 방법",
    "Explain async/await with a short example",
  ],
  translator: [
    "안녕하세요, 만나서 반갑습니다",
    "Where is the nearest subway station?",
    "ありがとうございます、とても助かりました",
  ],
};

/* 시간대별 인사말 + 다국어 순환 */
function Greeting() {
  const g = useMemo(() => greetingFor(new Date().getHours()), []);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % g.world.length), 2600);
    return () => clearInterval(t);
  }, [g]);
  return (
    <>
      <h1 className="title">
        <span className="lead">{g.lead}</span> <span className="grad">{g.em}</span>
      </h1>
      <p className="ticker" aria-hidden>
        <span key={i}>{g.world[i]}</span>
      </p>
    </>
  );
}

/* 대화 에너지 미터 */
function Energy({ usage }) {
  if (!usage) return null;
  const pct = Math.max(0, Math.min(100, Math.round((usage.remaining / usage.limit) * 100)));
  const low = usage.remaining <= 3;
  return (
    <div
      className={`energy ${low ? "low" : ""}`}
      title="무료 AI를 아껴 쓰려고 한 시간에 보낼 수 있는 대화 수를 제한해요. 시간이 지나면 조금씩 회복돼요."
    >
      <span className="energy-label">에너지</span>
      <span className="energy-bar"><i style={{ width: `${pct}%` }} /></span>
      <b>{usage.remaining}/{usage.limit}</b>
    </div>
  );
}

export default function App() {
  const chat = useChat();
  const [input, setInput] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("nova-theme") || "light");
  const [voiceIdx, setVoiceIdx] = useState(() => {
    const n = Number(localStorage.getItem("nova-voice-idx"));
    return Number.isInteger(n) && n >= 0 && n < VOICE_LANGS.length ? n : 0;
  });
  const bottomRef = useRef(null);

  const voice = VOICE_LANGS[voiceIdx];
  const speechIn = useSpeechInput({ lang: voice.code, onText: setInput });
  const speechOut = useSpeechOutput();

  const { active, usage } = chat;
  const isEmpty = active.messages.length === 0;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("nova-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: chat.loading ? "auto" : "smooth" });
  }, [active.messages, chat.loading]);

  const locked = !!usage && usage.remaining <= 0 && !chat.loading;
  const lockedText =
    usage && usage.dailyRemaining <= 0
      ? "오늘 준비한 대화를 모두 사용했어요. 내일 다시 만나요."
      : `에너지가 모두 소진됐어요. 약 ${Math.max(1, Math.ceil((usage?.resetIn || 60) / 60))}분 뒤에 회복돼요.`;

  const handleSend = () => {
    if (speechIn.listening) speechIn.cancel();
    const text = input.trim();
    if (!text) return;
    setInput("");
    chat.send(text);
  };

  const cycleVoice = () => {
    if (speechIn.listening) speechIn.stop();
    const next = (voiceIdx + 1) % VOICE_LANGS.length;
    setVoiceIdx(next);
    localStorage.setItem("nova-voice-idx", String(next));
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const statusText = {
    checking: "연결 중",
    waking: "서버를 깨우는 중… 최대 1분",
    online: `Nova · ${(chat.server?.model || "").split("/").pop()}`,
    offline: "연결 안 됨 · 다시 시도",
  }[chat.server?.state];

  const renderComposer = (focus) => (
    <Composer
      value={input}
      onChange={setInput}
      onSend={handleSend}
      onStop={chat.stop}
      loading={chat.loading}
      persona={active.persona}
      onPersona={chat.setPersona}
      personas={PERSONAS}
      length={chat.length}
      onLength={chat.setLength}
      speech={speechIn}
      voice={voice}
      onCycleVoice={cycleVoice}
      locked={locked}
      lockedText={lockedText}
      focusOnMount={focus}
    />
  );

  const suggestions = (SUGGESTIONS[active.persona] || SUGGESTIONS.assistant).slice(0, 4);

  return (
    <div className="app">
      <div className="bg" aria-hidden><i /><i /><i /></div>

      {/* ───── 왼쪽 아이콘 레일 ───── */}
      <nav className="rail" aria-label="메인 메뉴">
        <div className="rail-logo"><Logo /></div>
        <button type="button" onClick={chat.newChat} title="새 대화" aria-label="새 대화"><IconPlus /></button>
        <button type="button" onClick={() => setDrawer(true)} title="대화 기록" aria-label="대화 기록"><IconClock /></button>
        <div className="rail-bottom">
          <button type="button" onClick={toggleTheme} title="테마 바꾸기" aria-label="테마 바꾸기">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </nav>

      {/* ───── 대화 기록 서랍 ───── */}
      <aside className={`drawer ${drawer ? "open" : ""}`} aria-hidden={!drawer}>
        <div className="drawer-head">
          <b>대화 기록</b>
          <button type="button" onClick={() => setDrawer(false)} aria-label="닫기"><IconClose /></button>
        </div>
        <button
          type="button"
          className="pill ink wide"
          onClick={() => { chat.newChat(); setDrawer(false); }}
        >
          <IconPlus width={16} height={16} /> 새 대화
        </button>
        <div className="drawer-list">
          {chat.chats.map((c) => (
            <div
              key={c.id}
              className={`item ${c.id === active.id ? "on" : ""}`}
              onClick={() => { chat.openChat(c.id); setDrawer(false); }}
            >
              <span>{c.title}</span>
              <button
                type="button"
                aria-label="대화 삭제"
                onClick={(e) => { e.stopPropagation(); chat.deleteChat(c.id); }}
              >
                <IconTrash width={16} height={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="pill soft wide" onClick={toggleTheme}>
          {theme === "dark" ? "라이트 모드로" : "다크 모드로"}
        </button>
      </aside>
      <div className={`scrim ${drawer ? "show" : ""}`} onClick={() => setDrawer(false)} />

      {/* ───── 메인 ───── */}
      <main className="stage">
        <header className="top">
          <div className="top-left">
            <button type="button" className="menu-btn" onClick={() => setDrawer(true)} aria-label="메뉴">
              <IconMenu />
            </button>
            <button
              type="button"
              className={`status ${chat.server?.state}`}
              onClick={() => chat.server?.state === "offline" && chat.checkServer()}
            >
              <i /><span>{statusText}</span>
            </button>
          </div>
          <div className="top-right">
            <Energy usage={usage} />
            <button type="button" className="pill soft hide-sm" onClick={chat.exportChat} disabled={isEmpty}>
              내보내기
            </button>
            <button type="button" className="pill ink" onClick={chat.newChat}>새 대화</button>
          </div>
        </header>

        {isEmpty ? (
          <section className="hero">
            <Greeting />
            <p className="sub">무엇이든 물어보세요. 어떤 언어로 말해도 같은 언어로 답해요.</p>
            {renderComposer(false)}
            <div className="suggest">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => chat.send(s)}>
                  <em>{detectLang(s)?.label}</em>{s}
                </button>
              ))}
            </div>
            <p className="hint">추천 질문은 저장된 답변이면 에너지를 쓰지 않아요 ⚡</p>
          </section>
        ) : (
          <>
            <section className="scroll">
              <div className="thread">
                {active.messages.map((m, i) => (
                  <Message
                    key={m.id}
                    message={m}
                    isLast={i === active.messages.length - 1}
                    canRegenerate={!chat.loading}
                    onRegenerate={chat.regenerate}
                    speaking={speechOut.speakingId === m.id}
                    onSpeak={() =>
                      speechOut.speak(m.id, m.content, (detectLang(m.content) || LANGS.ko).speech)
                    }
                    speechSupported={speechOut.supported}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            </section>
            <div className="dock">{renderComposer(true)}</div>
          </>
        )}

        <footer className="legal">
          <p>AI 답변은 오류가 있을 수 있습니다. 중요한 정보는 반드시 다시 확인해 주세요.</p>
          <p>무료 AI를 아껴 쓰기 위해 한 시간에 {usage?.limit ?? 12}번까지 대화할 수 있어요.</p>
        </footer>
      </main>
    </div>
  );
}