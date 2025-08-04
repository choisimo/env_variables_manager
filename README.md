# Environment Variables Manager 🔧

<div align="center">
  <img src="images/preview.png" alt="Environment Variables Manager - Main Interface" width="800"/>
</div>

## 📖 프로젝트 개요

**Environment Variables Manager**는 여러 프로젝트의 환경변수 파일(.env)을 중앙에
서 효율적으로 관리할 수 있는 웹 기반 도구입니다. 복잡한 개발 환경에서 흩어져 있
는 환경변수들을 한 곳에서 체계적으로 관리하고, AI 도우미를 통해 스마트한 환경변
수 관리가 가능합니다.

### ✨ 주요 특징

-   🌐 **웹 기반 인터페이스**: 직관적이고 사용하기 쉬운 웹 UI
-   📁 **다중 파일 관리**: 여러 프로젝트의 .env 파일을 동시에 관리
-   🔍 **자동 스캔**: 디렉토리 내 .env 파일 자동 탐지
-   💾 **자동 백업**: 변경 사항 저장 시 자동 백업 생성
-   🤖 **AI 도우미**: GPT, Gemini, Claude 등 다양한 AI 모델을 통한 스마트 관리
-   🖥️ **통합 터미널**: 웹에서 직접 터미널 접근 (로컬/SSH 지원)
-   ⚡ **성능 모니터링**: 실시간 성능 추적 및 메트릭 수집
-   🔒 **보안 관리**: 민감한 정보 마스킹 및 권한 관리

## 🖼️ 주요 기능 스크린샷

### 1. 메인 대시보드

<img src="images/preview-001.png" alt="메인 대시보드 - 파일 목록 및 관리" width="600"/>

_여러 환경변수 파일을 한눈에 보고 관리할 수 있는 메인 인터페이스_

### 2. 환경변수 편집기

<img src="images/preview-002.png" alt="환경변수 편집 인터페이스" width="400"/>

_개별 환경변수를 실시간으로 편집하고 저장할 수 있는 편집기_

### 3. 파일 업로드 및 스캔

<img src="images/preview-003.png" alt="파일 업로드 및 디렉토리 스캔" width="300"/>

_드래그 앤 드롭으로 파일 업로드하거나 디렉토리 스캔을 통한 자동 등록_

### 4. 터미널 통합

<img src="images/preview-004.png" alt="통합 터미널 인터페이스" width="600"/>

_웹에서 직접 터미널에 접근하여 명령어 실행 및 파일 관리_

### 5. AI 도우미 설정

<img src="images/preview-005.png" alt="AI 도우미 설정 화면" width="600"/>

_다양한 AI 모델 API 키 설정 및 선호 모델 선택_

### 6. AI 채팅 인터페이스

<img src="images/preview-006.png" alt="AI 채팅 인터페이스" width="600"/>

_AI와 대화하며 환경변수 관리에 대한 조언과 자동 수정 기능_

### 7. 성능 모니터링

<img src="images/preview-007.png" alt="성능 모니터링 대시보드" width="600"/>

_실시간 시스템 리소스 모니터링 및 성능 메트릭 추적_

### 8. 고급 기능들

<img src="images/preview-008.png" alt="고급 기능 및 설정" width="600"/>

_백업, 다운로드, 환경별 설정 파일 생성 등 고급 관리 기능_

## 🚀 시작하기

### 필수 요구사항

-   Node.js 16.0 이상
-   npm 또는 yarn
-   최신 웹 브라우저 (Chrome, Firefox, Safari, Edge)

### 설치 및 실행

1. **프로젝트 클론**

    ```bash
    git clone [repository-url]
    cd env_variables_manager
    ```

2. **의존성 설치**

    ```bash
    npm install
    ```

3. **환경 설정**

    ```bash
    cp .env.example .env
    # 필요에 따라 .env 파일 수정
    ```

4. **개발 서버 실행**

    ```bash
    npm run dev
    ```

5. **브라우저에서 접속**
    ```
    http://localhost:3001
    ```

### 프로덕션 배포

```bash
npm start
```

## 🔧 주요 기능 상세

### 1. 환경변수 파일 관리

#### 파일 추가 방법

-   **직접 경로 입력**: 특정 파일 경로를 직접 입력하여 등록
-   **디렉토리 스캔**: 지정된 디렉토리에서 .env 파일 자동 탐지
-   **파일 업로드**: 드래그 앤 드롭으로 파일 업로드
-   **자동 탐지**: 프로젝트 실행 시 주변 디렉토리에서 자동 탐지

#### 편집 기능

-   ✏️ 실시간 환경변수 편집
-   ➕ 새로운 환경변수 추가
-   🗑️ 기존 환경변수 삭제
-   💾 자동 백업 생성
-   📥 다양한 형태로 다운로드

### 2. AI 도우미 통합

#### 지원하는 AI 모델

-   **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
-   **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Pro/Flash
-   **OpenRouter**: Claude 3.5 Sonnet, Llama 3.1, Mistral Large

#### AI 기능

-   🤖 환경변수 관련 질문 답변
-   ⚡ 자동 환경변수 수정/추가/삭제
-   🔒 보안 모범 사례 제안
-   📋 설정 파일 구조화 조언
-   🎯 현재 프로젝트 맞춤형 답변

### 3. 통합 터미널

#### 터미널 기능

-   🖥️ 로컬 터미널 접근
-   🌐 SSH 원격 서버 연결
-   📁 파일별 디렉토리 터미널 열기
-   🔄 실시간 명령어 실행
-   📱 반응형 터미널 인터페이스

### 4. 성능 모니터링

#### 모니터링 항목

-   💾 메모리 사용량 추적
-   ⏱️ API 응답 시간 측정
-   📊 사용자 상호작용 분석
-   🚨 성능 알림 및 경고
-   📈 Core Web Vitals 측정

### 5. 보안 및 권한 관리

#### 보안 기능

-   🔐 민감한 정보 자동 마스킹
-   🛡️ 파일 권한 검증
-   📋 권한 문제 해결 가이드
-   🔒 안전한 백업 관리
-   ⚠️ 보안 경고 시스템

## 📁 프로젝트 구조

```
env_variables_manager/
├── 📄 server.js              # Express 서버 메인 파일
├── 📁 public/                # 클라이언트 정적 파일
│   ├── 🌐 index.html         # 메인 HTML 파일
│   ├── ⚡ app.js             # 클라이언트 JavaScript
│   └── 🎨 style.css         # 스타일시트
├── 📁 tests/                 # 테스트 파일
│   ├── 📁 unit/              # 단위 테스트
│   ├── 📁 integration/       # 통합 테스트
│   └── ⚙️ setup.js          # 테스트 설정
├── 📁 images/                # 프로젝트 스크린샷
├── 📁 uploads/               # 업로드된 파일 저장소
├── 📄 package.json           # 프로젝트 의존성
├── 📄 .env.example          # 환경변수 템플릿
└── 📄 README.md             # 프로젝트 문서 (이 파일)
```

## 🛠️ 개발 도구 및 스크립트

### NPM 스크립트

```bash
# 개발 서버 (nodemon 사용)
npm run dev

# 프로덕션 서버
npm start

# 테스트 실행
npm test

# 테스트 커버리지
npm run test

# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration

# E2E 테스트 (Cypress)
npm run test:e2e

# E2E 테스트 GUI 모드
npm run test:e2e:open

# 코드 린팅
npm run lint

# 코드 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format
```

### 개발 환경 설정

프로젝트는 다양한 개발 도구를 포함합니다:

-   **ESLint**: 코드 품질 관리
-   **Prettier**: 코드 포맷팅
-   **Jest**: 단위/통합 테스트
-   **Cypress**: E2E 테스트
-   **Nodemon**: 개발 시 자동 재시작

## 🔌 API 엔드포인트

### 환경변수 파일 관리

```http
GET    /api/env-files              # 파일 목록 조회
POST   /api/env-files              # 새 파일 등록
GET    /api/env-files/:id          # 특정 파일 내용 조회
PUT    /api/env-files/:id          # 파일 내용 업데이트
DELETE /api/env-files/:id          # 파일 등록 해제
POST   /api/env-files/:id/backup   # 백업 생성
GET    /api/env-files/:id/download # 파일 다운로드
```

### 파일 관리

```http
POST /api/upload           # 파일 업로드
POST /api/scan-directory   # 디렉토리 스캔
```

### 시스템 모니터링

```http
GET  /api/health    # 서버 상태 확인
GET  /api/metrics   # 성능 메트릭 조회
POST /api/metrics   # 클라이언트 메트릭 전송
```

## 🧪 테스트

프로젝트는 포괄적인 테스트 스위트를 포함합니다:

### 테스트 구조

-   **단위 테스트**: 개별 함수 및 모듈 테스트
-   **통합 테스트**: API 엔드포인트 및 워크플로우 테스트
-   **E2E 테스트**: 전체 사용자 시나리오 테스트

### 테스트 커버리지

프로젝트는 다음 커버리지 목표를 설정합니다:

-   **브랜치**: 80% 이상
-   **함수**: 80% 이상
-   **라인**: 80% 이상
-   **구문**: 80% 이상

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면:

1. 프로젝트를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

### 개발 가이드라인

-   코드 스타일: ESLint + Prettier 설정 준수
-   테스트: 새로운 기능에 대한 테스트 작성 필수
-   문서화: README 및 코드 주석 업데이트
-   커밋 메시지: 명확하고 설명적인 커밋 메시지 작성

## 📝 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 라이브러리들을 사용합니다:

-   **Express.js**: 웹 서버 프레임워크
-   **Socket.io**: 실시간 통신
-   **node-pty**: 터미널 에뮬레이션
-   **SSH2**: SSH 연결 지원
-   **Multer**: 파일 업로드 처리
-   **Jest**: 테스트 프레임워크
-   **Cypress**: E2E 테스트 도구

## 📞 지원 및 연락

문제가 발생하거나 질문이 있으시면 다음을 통해 연락주세요:

-   📧 이메일: [your-email@example.com]
-   🐛 이슈 트래커: [GitHub Issues](../../issues)
-   💬 토론: [GitHub Discussions](../../discussions)

## 🗺️ 로드맵

### 향후 계획

-   [ ] 🔧 **멀티 테넌트 지원**: 여러 팀/조직을 위한 분리된 환경
-   [ ] 🔄 **Git 통합**: 환경변수 변경사항 자동 커밋
-   [ ] 🌍 **국제화**: 다국어 지원 (영어, 일본어 등)
-   [ ] 📱 **모바일 앱**: React Native 기반 모바일 앱
-   [ ] 🔔 **알림 시스템**: 변경사항 및 보안 알림
-   [ ] 🔐 **암호화**: 민감한 데이터 암호화 저장
-   [ ] 📊 **고급 분석**: 사용 패턴 및 통계 분석
-   [ ] 🔌 **플러그인 시스템**: 확장 가능한 플러그인 아키텍처

---

<div align="center">
  <p>Made by nodove</p>
</div>
