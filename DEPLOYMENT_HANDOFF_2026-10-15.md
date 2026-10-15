# NOVA AI 챗봇 작업 및 배포 인수인계

- 작성일: 2026-10-15 (Asia/Seoul)
- 프로젝트 폴더: `C:\Users\User\Desktop\ma\web\ai-chatbot`
- GitHub 저장소: https://github.com/unnyappy87/ai-chatbot
- 배포 브랜치: `main`

## 1. 서비스 구성

```text
포트폴리오(GitHub Pages)
  -> NOVA 챗봇 프론트엔드(Render Static Site)
  -> NOVA 챗봇 백엔드(Render Web Service)
  -> Hugging Face Inference Providers
```

- 챗봇 프론트엔드: https://nova-chat-g5g4.onrender.com
- 챗봇 백엔드: https://nova-api-cgsd.onrender.com
- 백엔드 상태 확인: https://nova-api-cgsd.onrender.com/api/health

## 2. 오늘 완료한 작업

### 백엔드

- `HF_TOKEN`이 있으면 오래된 `DEMO_MODE=1` 설정이 남아 있어도 실제 AI 모드를 우선하도록 수정했다.
- 기존 환경변수 이름 `HF_MODEL`, `HF_FALLBACK_MODEL`과 새 이름 `MODEL_ID`, `FALLBACK_MODEL_ID`를 모두 지원하도록 수정했다.
- 로컬 상태 확인에서 다음 결과를 확인했다.

```json
{
  "status": "ok",
  "model": "Qwen/Qwen3-32B",
  "token_configured": true,
  "demo": false
}
```

### 프론트엔드

- React/Vite 프론트엔드의 변경 파일을 Git에 포함했다.
- 프로덕션 빌드가 성공했다.
- 린트는 오류 없이 경고만 발생했다.

### Git 및 보안

- 상위 `.gitignore`에 `.env`, 가상환경, `node_modules`, `dist`, 캐시, 로그 및 `backend/token.md` 제외 규칙을 추가했다.
- `backend/token.md`는 로컬에 남기고 Git 추적에서는 제거했다.
- `.env`, `venv`, `node_modules`, `dist`가 커밋되지 않은 것을 확인했다.
- 비밀 토큰 형태가 스테이징 파일에서 발견되지 않은 것을 확인했다.
- 다음 커밋을 GitHub `main` 브랜치에 푸시했다.

```text
8a6fb5b Prepare NOVA chatbot for deployment
```

- 로컬 `HEAD`와 `origin/main`이 동일한 커밋임을 확인했다.

## 3. Render 설정

### 백엔드 Web Service

권장 환경변수 이름은 다음과 같다. 실제 토큰 값은 이 문서나 Git에 기록하지 않는다.

```env
HF_TOKEN=<Render의 비밀 환경변수로만 저장>
MODEL_ID=Qwen/Qwen3-8B
FALLBACK_MODEL_ID=Qwen/Qwen2.5-7B-Instruct
DEMO_MODE=0
ALLOWED_ORIGINS=https://nova-chat-g5g4.onrender.com
PYTHON_VERSION=3.14.8
```

주의: `PYTHON_VERSION` 값에는 `Python`이라는 단어를 붙이지 않고 숫자만 넣는다.

백엔드 배포 설정:

```text
Branch: main
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Health Check Path: /api/health
```

### 프론트엔드 Static Site

```env
VITE_API_URL=https://nova-api-cgsd.onrender.com
```

프론트엔드 배포 설정:

```text
Branch: main
Root Directory: frontend
Build Command: npm ci && npm run build
Publish Directory: dist
```

프론트와 백엔드의 CORS 연결은 다음처럼 구성되어 있다.

```text
프론트: https://nova-chat-g5g4.onrender.com
백엔드: https://nova-api-cgsd.onrender.com
백엔드 ALLOWED_ORIGINS: https://nova-chat-g5g4.onrender.com
```

Render에서 최신 커밋 `8a6fb5b`가 초록색 체크와 함께 배포된 것을 확인했다. 백엔드와 프론트엔드 두 서비스 모두 같은 커밋인지 각각 확인해야 한다.

## 4. 중요한 보안 상태

- 대화 중 Hugging Face 토큰이 캡처 화면에 노출되었다.
- 캡처에 보인 모든 토큰은 폐기해야 한다.
- 마지막으로 캡처에 보인 토큰도 노출된 것으로 간주하고 폐기한 뒤 새 토큰을 발급해야 한다.
- 최종 새 토큰은 다음 두 곳에만 저장한다.
  - 로컬 `backend/.env`
  - Render 백엔드 서비스의 `HF_TOKEN`
- 토큰은 GitHub, 프론트엔드 환경변수, 문서, 캡처에 포함하지 않는다.
- Render 화면을 캡처할 때는 값이 점으로 가려진 상태인지 확인한다.

## 5. Hugging Face 사용량 상태

- 토큰과 백엔드 연결은 정상이다.
- 현재 AI 응답 오류는 인증 문제가 아니라 Hugging Face 계정의 무료 Inference Providers 크레딧 소진 때문이다.
- 새 토큰을 만들어도 같은 계정의 사용량은 초기화되지 않는다.
- 사용자는 다음 달 무료 크레딧 초기화까지 기다리기로 했다.
- 초기화 후 백엔드를 재시작하거나 Render에서 재배포한 다음 실제 질문을 다시 테스트한다.
- 프론트 화면의 `에너지 12/12`는 앱 자체 제한이며 Hugging Face 잔액과는 별개다.

## 6. 로컬 실행 방법

Git Bash에서 백엔드:

```bash
cd /c/Users/User/Desktop/ma/web/ai-chatbot/backend
./venv/Scripts/python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

백엔드 상태 확인:

```text
http://127.0.0.1:8000/api/health
```

다른 터미널에서 프론트엔드:

```bash
cd /c/Users/User/Desktop/ma/web/ai-chatbot/frontend
npm run dev
```

프론트엔드:

```text
http://localhost:5173
```

## 7. 포트폴리오에 넣는 권장 방식

현재는 포트폴리오 프로젝트 카드에 다음 두 버튼을 추가하는 방식을 우선 권장한다.

- 라이브 데모: https://nova-chat-g5g4.onrender.com
- GitHub: https://github.com/unnyappy87/ai-chatbot

권장 프로젝트 문구:

```text
NOVA 다국어 AI 챗봇
React와 FastAPI로 구현한 실시간 스트리밍 다국어 AI 챗봇
기획 · UI/UX 디자인 · 프론트엔드 · 백엔드 · 배포
```

기술 스택:

```text
React, Vite, JavaScript, CSS, FastAPI, Python,
Hugging Face Inference Providers, Render, GitHub
```

주요 기능:

- 다국어 질문 및 답변
- 실시간 스트리밍
- 포트폴리오 가이드와 여러 페르소나
- 답변 길이 선택
- 음성 입력과 읽어주기
- 대화 기록 저장
- Markdown 및 코드 블록
- 다시 생성, 복사, 다크 모드
- 사용량 제한과 캐시
- 반응형 UI

링크에는 새 창 보안 속성을 사용한다.

```html
<a
  href="https://nova-chat-g5g4.onrender.com"
  target="_blank"
  rel="noopener noreferrer"
>
  라이브 데모
</a>
```

iframe 삽입은 가능하지만, Render 무료 백엔드의 콜드 스타트와 Hugging Face 크레딧 오류가 포트폴리오 안에 직접 보일 수 있으므로 나중에 추가하는 것을 권장한다.

## 8. 포트폴리오 작업 시 요구사항

- 기존 포트폴리오 디자인 시스템과 레이아웃을 먼저 분석한다.
- 기존 프로젝트 카드의 마크업과 스타일을 재사용한다.
- NOVA를 기존 프로젝트들과 같은 수준의 카드 또는 상세 섹션으로 추가한다.
- 라이브 데모와 GitHub 버튼을 추가한다.
- 데스크톱, 태블릿, 모바일 반응형을 확인한다.
- 키보드 포커스와 이미지 대체 텍스트를 제공한다.
- 챗봇 토큰이나 백엔드 비밀정보를 포트폴리오 코드에 넣지 않는다.
- 관련 없는 기존 파일이나 사용자 변경사항은 건드리지 않는다.
- 수정 후 빌드 또는 정적 검사를 수행한다.
- 변경 내역을 검토한 뒤 포트폴리오 저장소에 커밋하고 GitHub Pages 배포 브랜치로 푸시한다.
- 배포된 실제 페이지에서 링크와 반응형 화면을 확인한다.

## 9. 다음 작업 체크리스트

- [ ] 마지막 캡처에 보인 Hugging Face 토큰 폐기
- [ ] 새 토큰을 로컬 `backend/.env`와 Render 백엔드에만 저장
- [ ] Render `PYTHON_VERSION`을 `3.14.8` 형식으로 저장
- [ ] Render 백엔드에 `DEMO_MODE=0` 설정
- [ ] 백엔드와 프론트엔드 모두 커밋 `8a6fb5b` 배포 확인
- [ ] 다음 달 HF 크레딧 초기화 후 실제 AI 답변 확인
- [ ] 포트폴리오 프로젝트 폴더를 Codex 작업공간으로 열기
- [ ] NOVA 프로젝트 카드와 링크 추가
- [ ] 포트폴리오 GitHub Pages 재배포
- [ ] 실제 배포 페이지에서 최종 확인

