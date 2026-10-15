import { useCallback, useEffect, useRef, useState } from "react";

const SPEECH_ERRORS = {
  "not-allowed": "마이크 권한이 꺼져 있어요. 주소창 왼쪽 자물쇠에서 마이크를 허용해 주세요.",
  "service-not-allowed": "이 브라우저에서는 음성 인식을 사용할 수 없어요.",
  "audio-capture": "마이크를 찾을 수 없어요. 연결 상태를 확인해 주세요.",
  network: "음성 인식 서버에 연결하지 못했어요.",
  "language-not-supported": "선택한 언어는 음성 인식을 지원하지 않아요.",
};

// 음성 입력: 마이크로 말하면 글자로 바꿔줘요
export function useSpeechInput({ lang, onText }) {
  const SR =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const cancelledRef = useRef(false);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(t);
  }, [error]);

  const start = useCallback(
    (baseText = "") => {
      if (!SR || recRef.current) return;
      setError("");
      cancelledRef.current = false;

      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = true;
      const base = baseText ? baseText.replace(/\s+$/, "") + " " : "";

      rec.onstart = () => setListening(true);
      rec.onresult = (e) => {
        if (cancelledRef.current) return;
        let transcript = "";
        for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
        onTextRef.current(base + transcript);
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        setError(SPEECH_ERRORS[e.error] || `음성 인식 오류 (${e.error})`);
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
      };

      recRef.current = rec;
      try {
        rec.start();
      } catch {
        recRef.current = null;
        setListening(false);
      }
    },
    [SR, lang]
  );

  const stop = useCallback(() => recRef.current?.stop(), []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    recRef.current?.abort();
    setListening(false);
  }, []);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      recRef.current?.abort();
    },
    []
  );

  return { supported: !!SR, listening, error, start, stop, cancel };
}

const toPlain = (md) =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .slice(0, 900);

// 읽어주기: 브라우저 내장 기능이라 AI 사용량이 들지 않아요
export function useSpeechOutput() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speakingId, setSpeakingId] = useState(null);

  const speak = (id, text, langCode = "ko-KR") => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (speakingId === id) {
      synth.cancel();
      setSpeakingId(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(toPlain(text));
    u.lang = langCode;
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    synth.speak(u);
  };

  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel();
    },
    [supported]
  );

  return { supported, speakingId, speak };
}
