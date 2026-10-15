import { useMemo, useState } from "react";
import Markdown from "./Markdown.jsx";
import { IconCopy, IconCheck, IconRefresh, IconSpeaker, IconStop } from "./Icons.jsx";
import { detectLang } from "../lib/lang.js";

const RETRYABLE = ["network", "server", "timeout", "hf_busy", "unknown"];

export default function Message({
  message, isLast, canRegenerate, onRegenerate, speaking, onSpeak, speechSupported,
}) {
  const [copied, setCopied] = useState(false);

  const lang = useMemo(
    () => (message.role === "assistant" && !message.streaming && !message.error
      ? detectLang(message.content) : null),
    [message.content, message.streaming, message.error, message.role]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 무시 */
    }
  };
  if (message.role === "user") {
    return <article className="msg user">{message.content}</article>;
  }
  const hasText = Boolean(message.content);
  return (
    <article className={`msg bot ${isLast ? "last" : ""}`}>
        <header className="who">
        <span className="dot" />
        <b>Nova</b>
        {lang && <em className="badge">{lang.label}</em>}
        {message.cached && !message.streaming && (
          <em className="badge zap" title="저장된 답변이라 AI 사용량을 쓰지 않았어요">⚡ 저장된 답변</em>
        )}
      </header>
      <div className="body">
        {message.error ? (
          <div className="alert">
            <p>{message.content}</p>
            {isLast && canRegenerate && RETRYABLE.includes(message.errorCode) && (
              <button type="button" onClick={onRegenerate}>다시 시도</button>
            )}
          </div>
        ) : hasText ? (
          <>
            <Markdown text={message.content} />
            {message.streaming && <span className="cursor" />}
          </>
        ) : message.stopped ? (
          <p className="note">생성을 중지했어요.</p>
        ) : (
          <div className="typing" aria-label="답변 생성 중"><span /><span /><span /></div>
        )}
      </div>

      {!message.streaming && hasText && !message.error && (
        <div className="tools-raw">
            <button type="button" className="tbtn" onClick={copy}>
                {copied ? <IconCheck /> : <IconCopy />}
                <span>{copied ? "복사됨" : "복사"}</span>
            </button>
            {speechSupported && (
            <button type="button" className={`tbtn ${speaking ? "on" : ""}`} onClick={onSpeak}>
              {speaking ? <IconStop /> : <IconSpeaker />}
              <span>{speaking ? "멈추기" : "읽어주기"}</span>
            </button>
          )}
          {isLast && canRegenerate && (
            <button type="button" className="tbtn" onClick={onRegenerate}>
                <IconRefresh />
                <span>다시 생성</span>
            </button>
          )}
        </div>
      )}

    </article>
  );
}
