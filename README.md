# WeatherEats

현재 위치의 날씨를 기반으로 오늘 어울리는 메뉴를 추천하고, 주변 맛집을 카카오맵과 함께 탐색할 수 있는 jQuery + AJAX 웹 애플리케이션입니다.

## 주요 기능

- 현재 위치 기반 날씨 조회
- 날씨/기온/습도/풍속 기반 메뉴 추천
- 추천 메뉴별 주변 맛집 개수 확인
- 5일 예보 미리보기
- 키워드 기반 주변 맛집 검색
- 카테고리 필터, 페이지네이션, 지도 마커/인포윈도우 연동
- localStorage 기반 즐겨찾기 저장/삭제/전체삭제
- 모바일 우선 반응형 UI
- 위치 권한 거부, API 오류, 빈 결과 상태 처리

## 기술 스택

- HTML5
- CSS3
- JavaScript (ES6)
- jQuery 3.7
- AJAX
- OpenWeatherMap API
- Kakao Local API
- Kakao Maps SDK

## 디렉토리 구조

```text
WeatherEats/
├── index.html
├── search.html
├── favorites.html
├── css/
│   ├── reset.css
│   ├── common.css
│   ├── main.css
│   ├── search.css
│   └── favorites.css
├── js/
│   ├── config.js
│   ├── common.js
│   ├── weather.js
│   ├── kakao.js
│   ├── favorites.js
│   ├── main.js
│   └── search.js
├── img/
│   ├── weather/
│   └── food/
├── AGENTS.md
├── .gitignore
└── README.md
```

## 실행 방법

### 1. API 키 설정

`js/config.js`에 아래 값을 입력합니다.

```js
'use strict';

var CONFIG = {
  WEATHER_API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY',
  KAKAO_REST_KEY: 'YOUR_KAKAO_REST_API_KEY',
  KAKAO_JS_KEY: 'YOUR_KAKAO_JAVASCRIPT_KEY'
};
```

### 2. 로컬 서버 실행

정적 파일이라도 API/지도 SDK 동작을 위해 로컬 서버로 실행하는 것을 권장합니다.

```bash
python3 -m http.server 4173
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:4173/index.html
```

## API 준비 사항

### OpenWeatherMap
- Current Weather API
- 5 Day / 3 Hour Forecast API
- `units=metric`, `lang=kr` 사용

### Kakao Developers
- REST API 키 발급
- JavaScript 키 발급
- Web 플랫폼 도메인 등록
  - 개발: `http://localhost:4173`, `http://127.0.0.1:4173`
  - 배포: `https://tmdry4530.github.io`

## 페이지 설명

### index.html
- 위치 권한 요청
- 현재 날씨 카드 렌더링
- 추천 메뉴 카드 렌더링
- 5일 예보 표시
- 추천 카드 클릭 시 search.html로 이동

### search.html
- 키워드 검색
- 내 주변 3km 검색
- 카테고리 필터
- 지도 + 리스트 동기화
- 즐겨찾기 저장
- 페이지네이션

### favorites.html
- 저장한 즐겨찾기 목록
- 개별 삭제 / 전체 삭제
- 검색 페이지로 다시 이동

## 참고 사항

- `js/config.js`는 `.gitignore` 대상입니다.
- 브라우저에서 직접 API 키를 사용하므로 완전한 비밀 관리는 어렵습니다.
- 카카오 지도는 등록된 도메인에서만 정상 동작합니다.
- Kakao Local API가 `App disabled OPEN_MAP_AND_LOCAL service`를 반환하면 카카오 개발자 콘솔에서 지도/로컬 서비스를 활성화해야 합니다.
