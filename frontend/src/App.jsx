import { useEffect, useRef, useState } from "react";
import "./App.css";
import { API_URL } from "./api";
import { useChat } from "./hooks/useChat";
import Welcome from "./components/Welcome";
import MessageItem from "./components/MessageItem";
import Composer from "./components/Composer";

export default function App() {
  const { messages, loading, error, send, stop, retry, reset } = useChat();
  const scrollRef = useRef(null);

  // 🌗 다크/라이트 테마 (선택값은 브라우저에 저장)
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 🟢 서버 연결 상태 표시
  // Render 무료 서버는 한동안 안 쓰면 잠들어서, 깨어날 때까지 5초마다 확인해요
  const [status, setStatus] = useState("connecting");
  const [model, setModel] = useState("Qwen3");
  useEffect(() => {
    let alive = true;
    let tries = 0;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error("not ok");
        const data = await res.json();
        if (!alive) return;
        setStatus("online");
        setModel(data.model?.split("/").pop() || "Qwen3");
      } catch {
        if (!alive) return;
        tries += 1;
        if (tries >= 15) {
          setStatus("offline");
        } else {
          setStatus("connecting");
          setTimeout(check, 5000);
        }
      }
    };

    check();
    return () => {
      alive = false;
    };
  }, []);

  // 📜 메시지가 새로 생기면(내가 질문하면) 맨 아래로 이동
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // 📜 답변이 한 글자씩 늘어날 때: 맨 아래 근처를 보고 있을 때만 따라 내려가요
  // (위로 올려서 읽는 중이면 방해하지 않아요)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, error]);

  const statusText = {
    online: "온라인",
    connecting: "서버 깨우는 중…",
    offline: "연결 안 됨",
  }[status];

  const lastId = messages[messages.length - 1]?.id;

  return (
    <div className="app">
      {/* 움직이는 오로라 배경 */}
      <div className="aurora" aria-hidden="true">
        <i className="blob b1" />
        <i className="blob b2" />
        <i className="blob b3" />
      </div>

      {/* 상단 헤더 */}
      <header className="header">
        <div className="brand">
          <div className="logo">✦</div>
          <div>
            <h2>Nova</h2>
            <p className={`status ${status}`}>
              <span className="dot" />
              {statusText} · {model}
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="테마 변경"
            title="테마 변경"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="pill-btn" onClick={reset} disabled={!messages.length}>
            ＋ 새 대화
          </button>
        </div>
      </header>

      {/* 대화 영역 */}
      <main className="chat-scroll" ref={scrollRef}>
        <div className="chat-inner">
          {messages.length === 0 ? (
            <Welcome onPick={(t) => send(t)} />
          ) : (
            messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                streaming={loading && m.id === lastId && m.role === "assistant"}
              />
            ))
          )}

          {error && (
            <div className="error-box" role="alert">
              <span>⚠️ {error}</span>
              <button onClick={retry}>다시 시도</button>
            </div>
          )}
        </div>
      </main>

      {/* 입력창 */}
      <footer className="footer">
        <div className="chat-inner">
          <Composer onSend={(t) => send(t)} onStop={stop} loading={loading} />
          <p className="disclaimer">
            Nova는 실수할 수 있어요. 중요한 정보는 꼭 다시 확인하세요.
          </p>
        </div>
      </footer>
    </div>
  );
}