import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "../api";

const STORAGE_KEY = "nova-chat-history";

// 고유 ID 만들기 (http 환경 등 randomUUID가 없을 때를 대비한 대체 코드 포함)
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// 새로고침해도 대화가 남도록 브라우저(localStorage)에서 불러오기
function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function useChat() {
  const [messages, setMessages] = useState(loadHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  // 대화가 바뀔 때마다 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // 질문 보내기 (base: 어디까지의 대화에 이어붙일지)
  const send = useCallback(
    async (text, base = messages) => {
      const content = text.trim();
      if (!content || loading) return;

      setError("");
      const userMsg = { id: uid(), role: "user", content };
      const botMsg = { id: uid(), role: "assistant", content: "" };

      // 서버에는 최근 20개 대화만 보냅니다 (속도·사용량 절약)
      const history = [...base, userMsg]
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));

      setMessages([...base, userMsg, botMsg]);
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(history, {
          signal: controller.signal,
          onToken: (token) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsg.id ? { ...m, content: m.content + token } : m
              )
            ),
        });
      } catch (e) {
        // 사용자가 직접 중지한 경우(AbortError)는 에러로 보여주지 않아요
        if (e.name !== "AbortError") {
          setError(e.message || "알 수 없는 오류가 발생했어요.");
        }
      } finally {
        // 내용이 하나도 없는 빈 답변 말풍선은 제거
        setMessages((prev) =>
          prev.filter((m) => !(m.id === botMsg.id && m.content === ""))
        );
        setLoading(false);
        abortRef.current = null;
      }
    },
    [messages, loading]
  );

  // 답변 생성 중지
  const stop = useCallback(() => abortRef.current?.abort(), []);

  // 마지막 질문 다시 보내기
  const retry = useCallback(() => {
    const idx = messages.map((m) => m.role).lastIndexOf("user");
    if (idx === -1) return;
    send(messages[idx].content, messages.slice(0, idx));
  }, [messages, send]);

  // 새 대화 시작
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
  }, []);

  return { messages, loading, error, send, stop, retry, reset };
}