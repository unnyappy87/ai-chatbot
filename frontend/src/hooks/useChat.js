import { useEffect, useRef, useState } from "react";
import { fetchHealth, fetchUsage, streamChat } from "../lib/api.js";

const STORAGE_KEY = "nova-v3-chats";
const LENGTH_KEY = "nova-v3-length";

const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const createChat = (persona = "guide") => ({
  id: uid(),
  title: "새 대화",
  persona,
  messages: [],
  updatedAt: Date.now(),
});

function loadChats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(raw) && raw.length) {
      return raw.map((c) => ({
        ...c,
        messages: (c.messages || []).map((m) => ({ ...m, streaming: false })),
      }));
    }
  } catch {
    /* 저장된 게 없으면 새로 시작 */
  }
  return [createChat()];
}

const toHistory = (messages) =>
  messages
    .filter((m) => m.content && !m.error)
    .map(({ role, content }) => ({ role, content }));

export function useChat() {
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(() => chats[0].id);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [server, setServer] = useState({ state: "checking", model: "" });
  const [length, setLengthState] = useState(() => {
    const v = localStorage.getItem(LENGTH_KEY);
    return ["short", "normal", "long"].includes(v) ? v : "normal";
  });

  const abortRef = useRef(null);
  const checkRef = useRef(0);

  const active = chats.find((c) => c.id === activeId) || chats[0];

  /* 서버 상태 확인 (Render 무료 서버는 잠들어 있을 수 있어요) */
  const checkServer = async () => {
    const myId = ++checkRef.current;
    setServer({ state: "waking", model: "" });
    for (let i = 0; i < 14; i++) {
      if (myId !== checkRef.current) return;
      try {
        const d = await fetchHealth();
        if (myId !== checkRef.current) return;
        setServer({ state: "online", model: d.model || "" });
        fetchUsage().then(setUsage).catch(() => {});
        return;
      } catch {
        /* 아직 안 깨어남 */
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    if (myId === checkRef.current) setServer({ state: "offline", model: "" });
  };

  useEffect(() => {
    checkServer();
    return () => {
      checkRef.current++;
    };
  }, []);

  /* 대화 저장 (답변 생성 중에는 쉬었다가 끝나면 저장) */
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {
      /* 용량 초과는 무시 */
    }
  }, [chats, loading]);

  const updateChat = (chatId, fn) =>
    setChats((prev) => prev.map((c) => (c.id === chatId ? fn(c) : c)));

  const patchMessage = (chatId, msgId, fn) =>
    updateChat(chatId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)),
    }));

  /* AI 답변 생성 (전송 / 다시 생성이 같이 사용) */
  const run = async ({ chatId, botId, persona, history, regenerate }) => {
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        messages: history,
        persona,
        length,
        regenerate,
        signal: controller.signal,
        onToken: (t) =>
          patchMessage(chatId, botId, (m) => ({ ...m, content: m.content + t })),
        onMeta: (meta) => {
          if (meta.cached) patchMessage(chatId, botId, (m) => ({ ...m, cached: true }));
          if (meta.usage) setUsage(meta.usage);
        },
      });
      patchMessage(chatId, botId, (m) => ({ ...m, streaming: false }));
    } catch (err) {
      if (err.name === "AbortError") {
        patchMessage(chatId, botId, (m) => ({ ...m, streaming: false, stopped: true }));
      } else {
        if (err.usage) setUsage(err.usage);
        patchMessage(chatId, botId, (m) => ({
          ...m,
          streaming: false,
          error: true,
          errorCode: err.code || "network",
          content: err.message || "알 수 없는 오류가 생겼어요.",
        }));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
      fetchUsage().then(setUsage).catch(() => {});
    }
  };

  const send = (text) => {
    const content = (text || "").trim();
    if (!content || loading) return;

    const chat = active;
    const userMsg = { id: uid(), role: "user", content };
    const botMsg = { id: uid(), role: "assistant", content: "", streaming: true };
    const history = toHistory([...chat.messages, userMsg]);

    updateChat(chat.id, (c) => ({
      ...c,
      title: c.messages.length === 0 ? content.slice(0, 24) : c.title,
      updatedAt: Date.now(),
      messages: [...c.messages, userMsg, botMsg],
    }));

    run({ chatId: chat.id, botId: botMsg.id, persona: chat.persona, history, regenerate: false });
  };

  const regenerate = () => {
    if (loading) return;
    const msgs = active.messages;
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant" || msgs.length < 2) return;

    patchMessage(active.id, last.id, (m) => ({
      ...m,
      content: "",
      streaming: true,
      error: false,
      errorCode: null,
      stopped: false,
      cached: false,
    }));

    run({
      chatId: active.id,
      botId: last.id,
      persona: active.persona,
      history: toHistory(msgs.slice(0, -1)),
      regenerate: true,
    });
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    if (loading) return;
    if (active.messages.length === 0) return;
    const c = createChat(active.persona);
    setChats((prev) => [c, ...prev]);
    setActiveId(c.id);
  };

  const openChat = (id) => {
    if (!loading) setActiveId(id);
  };

  const deleteChat = (id) => {
    if (loading) return;
    const rest = chats.filter((c) => c.id !== id);
    if (rest.length === 0) {
      const c = createChat();
      setChats([c]);
      setActiveId(c.id);
    } else {
      setChats(rest);
      if (id === activeId) setActiveId(rest[0].id);
    }
  };

  const setPersona = (persona) => updateChat(active.id, (c) => ({ ...c, persona }));

  const setLength = (v) => {
    setLengthState(v);
    localStorage.setItem(LENGTH_KEY, v);
  };

  /* 대화를 .md 파일로 저장 */
  const exportChat = () => {
    const lines = [`# ${active.title}`, ""];
    active.messages.forEach((m) => {
      if (!m.content) return;
      lines.push(m.role === "user" ? "## 나" : "## Nova", "", m.content, "");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    chats, active, loading, usage, server, length,
    send, regenerate, stop, newChat, openChat, deleteChat,
    setPersona, setLength, exportChat, checkServer,
  };
}