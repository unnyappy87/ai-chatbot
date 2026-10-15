export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export class ChatError extends Error {
  constructor(message, code = "network", usage = null) {
    super(message);
    this.code = code;
    this.usage = usage;
  }
}

export async function fetchHealth() {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) throw new Error("not ok");
  return res.json();
}

export async function fetchUsage() {
  const res = await fetch(`${API_URL}/api/usage`);
  if (!res.ok) throw new Error("not ok");
  return res.json();
}

export async function streamChat({
  messages,
  persona,
  length,
  regenerate,
  signal,
  onToken,
  onMeta,
}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, persona, length, regenerate }),
      signal,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ChatError("서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.", "network");
  }

  if (!res.ok || !res.body) {
    throw new ChatError(
      res.status === 422
        ? "메시지가 너무 길거나 형식이 올바르지 않아요."
        : `서버 응답 오류 (${res.status})`,
      "server"
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop();

    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith("data:")) continue;

      let payload;
      try {
        payload = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }

      if (payload.error) {
        throw new ChatError(payload.error, payload.code || "unknown", payload.usage || null);
      }
      if (payload.token) onToken(payload.token);
      if (payload.model || payload.cached || payload.done) onMeta?.(payload);
    }
  }
}