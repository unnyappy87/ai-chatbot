import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 복사 버튼이 달린 코드 블록
function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const codeEl = children; // <pre> 안의 <code> 요소
  const className = codeEl?.props?.className || "";
  const lang = className.replace("language-", "") || "code";
  const text = String(codeEl?.props?.children ?? "").replace(/\n$/, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 복사 권한이 없는 환경에서는 조용히 무시 */
    }
  };

  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span>{lang}</span>
        <button onClick={copy}>{copied ? "✓ 복사됨" : "복사"}</button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export default function MessageItem({ message, streaming }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const waiting = streaming && message.content === ""; // 첫 글자가 오기 전

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* 무시 */
    }
  };

  return (
    <div className={`msg ${isUser ? "user" : "bot"}`}>
      <div className="avatar" aria-hidden="true">
        {isUser ? "🙂" : "✦"}
      </div>

      <div className="bubble-wrap">
        <div className="bubble">
          {isUser ? (
            <p className="user-text">{message.content}</p>
          ) : waiting ? (
            <div className="dots" aria-label="답변 생성 중">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <div className="md">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                  a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {streaming && <span className="cursor" />}
            </div>
          )}
        </div>

        {!isUser && !streaming && message.content && (
          <button className="copy-btn" onClick={copyAll}>
            {copied ? "✓ 복사됨" : "📋 복사"}
          </button>
        )}
      </div>
    </div>
  );
}