import { useEffect, useRef, useState } from "react";
const MAX = 4000; // 백엔드의 글자 수 제한과 같아야 해요
export default function Composer ({ onSend, onStop, loading}) {
    const [text, setText] = useState("");
    const ref = useRef(null);
    // 글이 길어지면 입력창 높이가 자동으로 늘어납니다 (최대 200px)
     useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  const submit = () => {
    if (!text.trim() || loading) return;
    onSend(text);
    setText("");
  };

  const onKeyDown = (e) => {
    // 한글 입력 중(글자 조합 중)의 Enter는 무시해야
    // 마지막 글자가 중복 전송되는 버그가 생기지 않아요
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        maxLength={MAX}
        placeholder="메시지를 입력하세요…  (Enter 전송 · Shift+Enter 줄바꿈)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />

      {text.length > MAX * 0.8 && (
        <span className="counter">
          {text.length}/{MAX}
        </span>
      )}

      {loading ? (
        <button className="send stop" onClick={onStop} aria-label="생성 중지">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <button
          className="send"
          onClick={submit}
          disabled={!text.trim()}
          aria-label="전송"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path
              d="M12 19V5M5 12l7-7 7 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}