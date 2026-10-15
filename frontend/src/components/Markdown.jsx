import { useState } from "react";

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text, k) {
  return text.split(INLINE).map((p, i) => {
    if (!p) return null;
    const key = `${k}-${i}`;
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`"))
      return <code key={key} className="inline-code">{p.slice(1, -1)}</code>;
    if (p.length > 4 && p.startsWith("**") && p.endsWith("**"))
      return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (p.length > 2 && p.startsWith("*") && p.endsWith("*"))
      return <em key={key}>{p.slice(1, -1)}</em>;
    const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (m)
      return (
        <a key={key} href={m[2]} target="_blank" rel="noreferrer noopener">{m[1]}</a>
      );
    return p;
  });
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 무시 */
    }
  };
  return (
    <div className="codeblock">
      <div className="codeblock-bar">
        <span className="codeblock-lang">{lang || "code"}</span>
        <button type="button" onClick={copy}>{copied ? "복사됨" : "복사"}</button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

const RE_UL = /^\s*[-*]\s+/;
const RE_OL = /^\s*\d+[.)]\s+/;
const RE_START = /^(```|#{1,3}\s|\s*[-*]\s+|\s*\d+[.)]\s+|>)/;

function parse(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push({ t: "code", lang: fence[1], code: code.join("\n") });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { blocks.push({ t: "h", level: h[1].length, text: h[2] }); i++; continue; }
    if (RE_UL.test(line)) {
      const items = [];
      while (i < lines.length && RE_UL.test(lines[i])) items.push(lines[i++].replace(RE_UL, ""));
      blocks.push({ t: "ul", items });
      continue;
    }
    if (RE_OL.test(line)) {
      const items = [];
      while (i < lines.length && RE_OL.test(lines[i])) items.push(lines[i++].replace(RE_OL, ""));
      blocks.push({ t: "ol", items });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ t: "quote", text: q.join("\n") });
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !RE_START.test(lines[i])) para.push(lines[i++]);
    if (para.length === 0) para.push(lines[i++]);
    blocks.push({ t: "p", text: para.join("\n") });
  }
  return blocks;
}

const withBreaks = (text, k) =>
  text.split("\n").map((ln, idx, arr) => (
    <span key={`${k}-${idx}`}>
      {inline(ln, `${k}-${idx}`)}
      {idx < arr.length - 1 && <br />}
    </span>
  ));

export default function Markdown({ text }) {
  return (
    <div className="md">
      {parse(text).map((b, i) => {
        const key = `b${i}`;
        if (b.t === "code") return <CodeBlock key={key} lang={b.lang} code={b.code} />;
        if (b.t === "h") {
          const Tag = `h${b.level + 2}`;
          return <Tag key={key}>{inline(b.text, key)}</Tag>;
        }
        if (b.t === "ul")
          return <ul key={key}>{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ul>;
        if (b.t === "ol")
          return <ol key={key}>{b.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ol>;
        if (b.t === "quote") return <blockquote key={key}>{withBreaks(b.text, key)}</blockquote>;
        return <p key={key}>{withBreaks(b.text, key)}</p>;
      })}
    </div>
  );
}