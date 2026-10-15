import { useEffect, useRef } from "react";
import { IconMic, IconArrowUp, IconStop } from "./Icons.jsx";
import Dropdown from "./Dropdown.jsx";
import { detectLang } from "../lib/lang.js";

const MAX = 1000;
const LENGTHS = [
  { id: "short", label: "짧게" },
  { id: "normal", label: "보통" },
  { id: "long", label: "자세히" },
];

export default function Composer({
  value, onChange, onSend, onStop, loading,
  persona, onPersona, personas,
  length, onLength,
  speech, voice, onCycleVoice,
  locked, lockedText, focusOnMount,
}) {
  const ref = useRef(null);
  const detected = detectLang(value);

  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [value]);

  const onKeyDown = (e) => {
    // 한글 조합 중 Enter는 무시 (두 번 전송 방지)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!loading && value.trim() && !locked) onSend();
    }
  };

  return (
    <div>
      {speech.error && <p className="voice-error" role="alert">{speech.error}</p>}

      <div className={`composer ${speech.listening ? "listening" : ""}`}>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX}
          disabled={locked}
          readOnly={speech.listening}
          placeholder={locked ? lockedText : speech.listening ? "말씀하세요…" : "무엇이든 물어보세요!"}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="composer-row">
          <div className="tools">
            <button
              type="button"
              className={`ibtn ${speech.listening ? "on" : ""}`}
              onClick={() => (speech.listening ? speech.stop() : speech.start(value))}
              disabled={!speech.supported || loading || locked}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "음성 입력 종료" : "음성 입력 시작"}
              title={speech.supported ? "음성으로 입력" : "이 브라우저는 음성 입력을 지원하지 않아요 (Chrome · Edge · Safari)"}
            >
              <IconMic />
            </button>

            {speech.supported && (
              <button type="button" className="chip" onClick={onCycleVoice} title="음성 인식 언어 바꾸기">
                {voice.label}
              </button>
            )}

            {speech.listening ? (
              <span className="wave" aria-hidden><i /><i /><i /><i /><i /></span>
            ) : (
              detected && <span className="detect" title="감지된 입력 언어">{detected.label} 감지</span>
            )}
            {value.length > 800 && <span className="count">{value.length}/{MAX}</span>}
          </div>

          <div className="opts">
            <Dropdown
              label="대화 모드"
              value={persona}
              onChange={onPersona}
              options={personas.map((p) => ({ value: p.id, label: p.label }))}
            />
            <Dropdown
              label="응답 길이"
              value={length}
              onChange={onLength}
              options={LENGTHS.map((l) => ({ value: l.id, label: l.label }))}
            />

            {loading ? (
              <button type="button" className="send stop" onClick={onStop} aria-label="생성 중지">
                <IconStop />
              </button>
            ) : (
              <button
                type="button"
                className="send"
                onClick={onSend}
                disabled={!value.trim() || locked}
                aria-label="전송"
              >
                <IconArrowUp />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}