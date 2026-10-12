// 첫 화면: 다국어 예시 질문 카드 (누르면 바로 질문이 전송돼요)
const SUGGESTIONS = [
    {flag: "🇰🇷", lang: "한국어", text: "면접에서 자기소개를 잘하는 방법 알려줘"},
    {flag: "🇺🇸", lang: "English", text: "Explain how the internet works like I'm 10"},
    {flag: "🇯🇵", lang: "日本語", text: "おすすめの勉強方法を教えてください"},
    {flag: "🇪🇸", lang: "Español", text: "Dame ideas para un proyecto de portafolio"},
];
export default function Welcome({ onPick}) {
    return (
        <section className="welcome">
           <div className="welcome-orb" aria-hidden="true">
              <span />
            </div>
            <h1 className="welcome-title">
                안녕하세요, <span className="gradient-text">Nova</span> 입니다
            </h1>
            <p className="welcome-sub">
                한국어·English·日本語·中文·Español … 어떤 언어로든 편하게 물어보세요.
            </p>
            <div className="suggestions">
                {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s.lang}
                      className="suggestion"
                      style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                      onClick={() => onPick(s.text)}
                    >
                     <span className="suggestion-lang">
                       {s.flag} {s.lang}
                     </span>
                     <span className="suggestion-text">{s.text}</span>
                   </button>
                ))}
            </div>
        </section>
    );
}
