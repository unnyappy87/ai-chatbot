// 백엔드 주소 (.env의 VITE_API_URL을 사용)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
/**
 * 서버에 대화를 보내고, 답변이 한 조각씩 도착할 때마다 onToken을 호출합니다.
 * signal: 사용자가 '중지' 버튼을 누르면 요청을 취소하기 위한 장치
 */
export async function streamChat(messages, { onToken, signal }) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`서버 오류가 발생했어요 (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n"); // SSE는 빈 줄로 구분됩니다
    buffer = events.pop(); // 덜 도착한 마지막 조각은 보관
    for (const ev of events) {
      const line = ev.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      const parsed = JSON.parse(data);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.content) onToken(parsed.content);
    }
  }
}
