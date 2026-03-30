# AGENTS.md — WeatherEats 워크스페이스 운영 계약서

> 이 문서는 WeatherEats 프로젝트에서 에이전트가 따라야 할 행동 규칙, 작업 합의, 위임 규칙, 키워드 감지, 실행 프로토콜을 정의한다.

---

## 1. 프로젝트 컨텍스트

| 항목 | 내용 |
|------|------|
| **프로젝트명** | WeatherEats (오늘 뭐 먹지?) |
| **유형** | 학교 과제 — Open API 기반 웹 프론트엔드 |
| **기술 스택** | HTML5, CSS3, JavaScript (ES6), jQuery 3.x, AJAX |
| **사용 API** | OpenWeatherMap API, Kakao Local API, Kakao Maps SDK |
| **배포** | GitHub Pages (`tmdry4530.github.io`) |
| **제약 사항** | React/Vue/Angular 사용 금지 — 순수 jQuery + AJAX만 허용 |

---

## 2. 운영 원칙 (Operating Principles)

1. **직접 해결 우선**: 안전하게 직접 해결할 수 있으면 묻지 말고 바로 진행한다.
2. **되돌릴 수 있는 단순한 다음 단계**는 확인 없이 실행한다.
3. **낯선 API는 공식 문서부터 확인**: OpenWeatherMap, Kakao API 사용 시 반드시 공식 문서의 파라미터/응답 스키마를 참조한다.
4. **jQuery 패턴 준수**: `$.ajax()`, `$.get()`, `$.post()` 사용. `fetch()`, `axios` 사용 금지.
5. **ES Module 사용 금지**: `<script src="">` 방식으로 로드. `import/export` 구문 사용하지 않는다.
6. **빌드 도구 없음**: webpack, vite, parcel 등 번들러 사용 금지. 정적 파일만으로 동작해야 한다.
7. **간결함 우선**: 과도한 추상화 금지. 학교 과제 수준에 맞는 깔끔하고 읽기 쉬운 코드를 작성한다.

---

## 3. 작업 합의 (Working Agreements)

### 코드 작성 규칙

- 모든 JS 파일 상단에 `'use strict';` 선언
- 변수명/함수명은 **camelCase**, CSS 클래스명은 **kebab-case**
- jQuery 선택자 캐싱: 반복 사용하는 `$()` 선택자는 변수에 저장
- AJAX 호출 시 반드시 `.done()` + `.fail()` 체이닝으로 에러 핸들링
- `console.log` 디버깅 코드는 커밋 전 제거

### 파일 수정 규칙

- 리팩터 작업 전에 **기존 동작을 브라우저에서 확인**하고 시작
- **추가보다 삭제 우선** — 불필요한 코드/주석은 바로 제거
- 새 라이브러리/CDN 의존성은 **명시적 요청 없이 추가 금지**
- CSS는 파일별 분리 유지 (`common.css`, `main.css`, `search.css`, `favorites.css`)

### 커밋 규칙

- 커밋 메시지 형식: `feat:`, `fix:`, `style:`, `docs:`, `refactor:`
- 한 커밋에 한 기능/수정만 포함
- `config.js`는 기본적으로 `.gitignore` 대상이지만, 학교 과제 제출/데모용 저장소에서는 예외적으로 추적할 수 있음

---

## 4. 디렉토리 구조 계약

```
WeatherEats/
├── index.html              # 메인 (날씨 + 추천)
├── search.html             # 맛집 검색 (지도 + 리스트)
├── favorites.html          # 즐겨찾기
├── 404.html                # GitHub Pages 404 페이지
├── .github/
│   └── workflows/
│       └── pages.yml       # GitHub Pages Actions 배포 워크플로우
├── css/
│   ├── reset.css           # CSS 리셋
│   ├── common.css          # 공통 (헤더, 푸터, CSS 변수)
│   ├── main.css            # 메인 페이지
│   ├── search.css          # 검색 페이지
│   └── favorites.css       # 즐겨찾기 페이지
├── js/
│   ├── config.js           # API 키 (.gitignore 대상)
│   ├── common.js           # 공통 유틸 (위치 감지, 헤더 렌더링)
│   ├── weather.js          # 날씨 API + 매핑 로직
│   ├── kakao.js            # 카카오 API + 지도 관리
│   ├── favorites.js        # localStorage CRUD
│   ├── main.js             # 메인 페이지 진입점
│   └── search.js           # 검색 페이지 진입점
├── img/
│   ├── weather/            # 날씨 관련 이미지
│   └── food/               # 음식 카테고리 이미지
├── AGENTS.md               # 이 파일
├── JS-LOGIC.md             # JS 로직 설명 문서
├── .gitignore
└── README.md
```

**절대 규칙:**
- 이 구조 바깥에 파일을 생성하지 않는다.
- 새 폴더/파일 추가 시 이 섹션을 먼저 업데이트한다.
- `node_modules/`, `package.json` 등 Node.js 관련 파일 생성 금지.

---

## 5. API 사용 계약

### OpenWeatherMap API

| 항목 | 값 |
|------|-----|
| 기본 URL | `https://api.openweathermap.org/data/2.5/` |
| 인증 | 쿼리 파라미터 `appid={API_KEY}` |
| 필수 파라미터 | `units=metric`, `lang=kr` |
| 사용 엔드포인트 | `weather` (현재), `forecast` (5일 예보) |
| 무료 한도 | 60회/분 |
| 에러 처리 | 401→키 오류, 429→한도 초과, 기타→일반 에러 메시지 |

### Kakao Local API

| 항목 | 값 |
|------|-----|
| 기본 URL | `https://dapi.kakao.com/v2/local/search/keyword.json` |
| 인증 | 헤더 `Authorization: KakaoAK {REST_API_KEY}` |
| 필수 파라미터 | `category_group_code=FD6` (음식점) |
| 검색 반경 | 기본 3000m (3km) |
| 페이지 크기 | `size=10` |
| 에러 처리 | 401→키 오류, 기타→일반 에러 메시지 |

### Kakao Maps SDK

| 항목 | 값 |
|------|-----|
| 로드 방식 | `<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey={JS_KEY}&libraries=services">` |
| 지도 컨테이너 | `id="map"` 고정 |
| 기본 줌 레벨 | 5 (약 3km 반경) |

---

## 6. 위임 규칙 (Delegation Rules)

### 기본 자세: 직접 작업

이 프로젝트는 소규모 jQuery 프로젝트이므로 대부분의 작업을 직접 수행한다.

### 위임 조건

다음 조건을 **모두** 만족할 때만 위임을 고려한다:
- 3개 이상의 파일을 동시에 수정해야 하는 경우
- 병렬 처리가 순차 처리보다 명확히 빠른 경우
- 전문가 역할(보안, 성능)이 필요한 경우

### 위임 금지 사항

- 단일 파일 수정
- CSS 스타일링만 하는 작업
- 단순 버그 수정
- 주석/문서 추가

---

## 7. 키워드 감지 (Keyword Detection)

사용자 메시지에 아래 키워드가 포함되면 해당 스킬을 발동한다:

| 키워드 | 발동 스킬 | 동작 |
|--------|-----------|------|
| `"ralph"`, `"don't stop"`, `"keep going"`, `"끝까지"` | `$ralph` | 모든 페이지/기능을 연속 구현. 중간에 멈추지 않음 |
| `"autopilot"`, `"build me"`, `"다 만들어줘"` | `$autopilot` | HTML → CSS → JS 순서로 전체 자율 빌드 |
| `"plan this"`, `"let's plan"`, `"기획"` | `$plan` | PRD/와이어프레임/기술 스펙 작성 |
| `"interview"`, `"don't assume"`, `"물어봐"` | `$deep-interview` | 요구사항 심층 질문 (소크라틱 방식) |
| `"tdd"`, `"test first"` | `$tdd` | 테스트 먼저 작성 후 구현 |
| `"fix"`, `"안돼"`, `"에러"`, `"버그"` | `$build-fix` | 에러 진단 + 수정 |
| `"code review"`, `"리뷰"` | `$code-review` | 코드 품질/패턴 리뷰 |
| `"cancel"`, `"stop"`, `"취소"` | `$cancel` | 현재 모드 취소, 기본 모드로 복귀 |

---

## 8. 에이전트 카탈로그

| 역할 | ID | 복잡도 | 설명 |
|------|----|--------|------|
| **탐색** | `explore` | 저 | 코드베이스 구조 파악, 파일 검색, 의존성 매핑 |
| **기획** | `planner` | 중 | 작업 분해, 우선순위 결정, 일정 수립 |
| **설계** | `architect` | 고 | 읽기 전용 분석, 트레이드오프 판단, API 설계 |
| **구현** | `executor` | 중~고 | HTML/CSS/JS 구현, 리팩터링 (기본 역할) |
| **디버그** | `debugger` | 중 | 근본 원인 분석, 콘솔 에러 추적, API 응답 디버깅 |
| **검증** | `verifier` | 저 | 브라우저 동작 확인, 체크리스트 검증, 크로스 브라우저 |

**구현 작업의 기본 역할은 `executor`이다.**

---

## 9. 파이프라인

### 기본 개발 파이프라인

```
explore → plan → execute → verify → fix (반복)
```

### 단계별 상세

1. **explore**: 현재 코드베이스 상태 파악, 수정 대상 파일 식별
2. **plan**: 작업 범위 정의, 파일별 수정 사항 목록화
3. **execute**: HTML → CSS → JS 순서로 구현
4. **verify**: 체크리스트 기반 검증 (아래 섹션 참조)
5. **fix**: 검증 실패 항목 수정 → verify 재실행

### 팀 파이프라인 (대규모 변경 시)

```
team-plan → team-prd → team-exec → team-verify → team-fix (반복)
```

---

## 10. 실행 프로토콜

### 작업 시작 전

1. 요청이 **광범위**하면 먼저 코드베이스를 탐색(`explore`)하고 계획(`plan`)을 세운다.
2. 요청이 **단순**하면 바로 구현(`execute`)한다.
3. API 관련 작업 시 해당 API 섹션(§5)을 재확인한다.

### 구현 순서

한 페이지를 작업할 때는 항상 이 순서를 따른다:

1. HTML 마크업 (시맨틱 태그, 접근성)
2. CSS 스타일링 (모바일 퍼스트)
3. JS 로직 (jQuery AJAX 호출, DOM 조작, 이벤트 바인딩)
4. 에러 핸들링 (API 실패, 위치 권한 거부, 빈 결과)
5. 반응형 확인

### 작업 완료 전 체크리스트

모든 작업을 완료하기 전에 반드시 아래 항목을 확인한다:

- [ ] 미완료 TODO/FIXME 주석이 없는가
- [ ] `console.log` 디버깅 코드가 제거되었는가
- [ ] jQuery AJAX 호출에 `.fail()` 에러 핸들링이 있는가
- [ ] API 키가 `config.js`에서 참조되는가 (하드코딩 금지)
- [ ] 모바일 뷰포트(375px)에서 레이아웃이 깨지지 않는가
- [ ] HTML이 W3C 기본 유효성을 통과하는가
- [ ] 빈 상태(Empty State) UI가 처리되어 있는가

---

## 11. 날씨 → 음식 매핑 규칙

이 로직은 프로젝트의 핵심이므로 별도로 문서화한다. 수정 시 이 섹션을 먼저 업데이트한다.

### 우선순위

1. **날씨 상태** (비/눈) → 최우선 적용
2. **기온** → 날씨 상태가 일반(맑음/흐림)일 때 적용
3. **습도/풍속** → 보조 조건으로 추가 추천

### 매핑 테이블

| 조건 | 카테고리 | 검색 키워드 |
|------|---------|------------|
| Rain / Drizzle | 전, 막걸리, 해물탕 | `파전 맛집`, `막걸리`, `해물탕` |
| Snow | 찌개, 카페, 만두 | `찌개 맛집`, `카페`, `만두 맛집` |
| temp ≤ 5°C | 국밥, 찌개, 샤브샤브 | `국밥`, `찌개 맛집`, `샤브샤브` |
| 5 < temp ≤ 12°C | 라멘, 칼국수, 수제비 | `라멘`, `칼국수`, `수제비` |
| 12 < temp ≤ 22°C | 한식, 분식, 브런치 | `한식 맛집`, `분식`, `브런치 카페` |
| 22 < temp ≤ 30°C | 냉면, 초밥, 샐러드 | `냉면`, `초밥`, `샐러드` |
| temp > 30°C | 빙수, 아이스크림, 냉면 | `빙수`, `아이스크림`, `냉면 맛집` |

---

## 12. localStorage 스키마

키: `weathereats_favorites`

```json
[
  {
    "id": "kakao_{place_id}",
    "place_name": "string",
    "category_name": "string",
    "address_name": "string",
    "phone": "string",
    "place_url": "string",
    "x": "string (경도)",
    "y": "string (위도)",
    "saved_at": "ISO 8601 string"
  }
]
```

**규칙:**
- 최대 저장 개수: 50개 (초과 시 가장 오래된 항목 자동 삭제)
- 중복 체크: `id` 기준으로 중복 저장 방지
- 저장/삭제 시 즉시 UI 갱신

---

## 13. 에러 핸들링 표준

모든 에러는 사용자 친화적 메시지로 표시한다.

| 상황 | 처리 |
|------|------|
| 위치 권한 거부 | "위치 권한이 필요해요! 설정에서 허용해주세요." + 수동 위치 입력 폼 |
| API 키 오류 (401) | "서비스 연결에 문제가 있어요. 잠시 후 다시 시도해주세요." |
| API 한도 초과 (429) | "요청이 너무 많아요. 잠시 후 다시 시도해주세요." |
| 네트워크 오류 | "인터넷 연결을 확인해주세요." |
| 검색 결과 없음 | "주변에 '{키워드}' 맛집을 찾지 못했어요. 다른 키워드로 검색해보세요." |
| localStorage 용량 초과 | 가장 오래된 즐겨찾기 자동 삭제 후 재시도 |

---

## 14. 상태 관리

이 프로젝트는 빌드 도구가 없으므로 `.omx/` 대신 아래 방식으로 상태를 관리한다:

- **세션 상태**: URL 쿼리 파라미터 (`?keyword=국밥&lat=37.39&lon=126.95`)
- **영속 상태**: `localStorage` (즐겨찾기)
- **런타임 상태**: 전역 변수 최소화, 페이지별 즉시실행함수(IIFE)로 스코프 격리

```javascript
// 페이지별 스코프 격리 패턴
(function() {
  'use strict';
  
  // 이 페이지의 상태
  var state = {
    weather: null,
    places: [],
    currentPage: 1
  };
  
  // jQuery ready
  $(function() {
    init();
  });
  
  function init() {
    // 초기화 로직
  }
})();
```

---

## 15. 배포 체크리스트

GitHub Pages 배포 전 최종 확인 사항:

- [ ] `config.js`에 유효한 API 키가 입력되어 있는가
- [ ] 카카오 개발자 콘솔에 배포 도메인이 등록되어 있는가 (`https://tmdry4530.github.io`)
- [ ] 모든 CDN 링크가 HTTPS인가
- [ ] 상대 경로로 파일을 참조하고 있는가 (절대 경로 `/` 금지)
- [ ] `README.md`에 프로젝트 설명, 스크린샷, API 키 발급 가이드가 포함되어 있는가
- [ ] 불필요한 `console.log`가 모두 제거되었는가
