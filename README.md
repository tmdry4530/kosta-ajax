# WeatherEats

> 날씨 기반으로 오늘 어울리는 메뉴를 추천하고, 주변 맛집을 지도와 함께 탐색하는 jQuery + AJAX 웹 애플리케이션

## 1. 프로젝트 소개

WeatherEats는 현재 위치의 날씨를 불러와서 기온/날씨 상태에 맞는 메뉴를 추천하고,
추천 메뉴 또는 직접 입력한 키워드로 주변 맛집을 탐색할 수 있는 웹 서비스입니다.

과제 제출용 기준으로 아래 요소를 모두 포함합니다.

- Open API 연동
- AJAX 기반 데이터 요청/응답 처리
- 3페이지 이상 구성
- 사용자 인터랙션
- 반응형 UI
- 예외 상황 처리

## 2. 핵심 기능

### 메인 페이지
- 현재 위치 기반 날씨 조회
- 날씨/기온/습도/풍속 기반 메뉴 추천
- 추천 메뉴별 주변 맛집 개수 표시
- 5일 예보 미리보기
- 추천 카드 클릭 시 검색 페이지 이동

### 검색 페이지
- 키워드 검색
- 내 주변 3km 검색
- 카테고리 필터
- 카카오맵 마커 + 리스트 동기화
- 페이지네이션
- 즐겨찾기 저장

### 즐겨찾기 페이지
- 저장 목록 조회
- 개별 삭제 / 전체 삭제
- 검색 페이지로 다시 이동

## 3. 기술 스택

- HTML5
- CSS3
- JavaScript (ES6)
- jQuery 3.7
- AJAX
- OpenWeatherMap API
- Kakao Local API
- Kakao Maps SDK
- localStorage

## 4. 디렉토리 구조

```text
WeatherEats/
├── index.html
├── search.html
├── favorites.html
├── 404.html
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
├── JS-LOGIC.md
├── weathereats_ui_feedback.md
├── .gitignore
└── README.md
```

## 5. 실행 방법

### 1) API 키 설정

`js/config.js`에 아래 값을 입력합니다.

```js
'use strict';

var CONFIG = {
  WEATHER_API_KEY: 'YOUR_OPENWEATHERMAP_API_KEY',
  KAKAO_REST_KEY: 'YOUR_KAKAO_REST_API_KEY',
  KAKAO_JS_KEY: 'YOUR_KAKAO_JAVASCRIPT_KEY'
};
```

### 2) 로컬 서버 실행

```bash
python3 -m http.server 4173
```

### 3) 접속 주소

```text
http://127.0.0.1:4173/index.html
```


## 6. 배포 주소

- GitHub Pages: https://tmdry4530.github.io/kosta-ajax/
- 메인 페이지: https://tmdry4530.github.io/kosta-ajax/index.html
- 검색 페이지 예시: https://tmdry4530.github.io/kosta-ajax/search.html?keyword=%EB%A7%9B%EC%A7%91

## 7. 카카오 개발자 설정 체크리스트

### Kakao Maps / Local 사용 전 확인
- REST API 키 발급
- JavaScript 키 발급
- 카카오맵 사용 설정 ON
- Web 플랫폼 도메인 등록
  - `http://localhost:4173`
  - `http://127.0.0.1:4173`
  - 배포 시 `https://tmdry4530.github.io`

## 8. 발표/스크린샷용 데모 모드

실 API 대신 안정적인 예시 데이터를 사용해서 검색 화면을 연출하고 싶으면 `demo=1` 쿼리를 붙이면 됩니다.

예시:

```text
http://127.0.0.1:4173/search.html?keyword=맛집&lat=37.3943&lon=126.9568&page=1&demo=1
```

이 모드에서는:
- 검색 결과 리스트가 보기 좋은 더미 데이터로 채워짐
- 필터 / 페이지네이션 / 즐겨찾기 저장 흐름을 안정적으로 시연 가능
- 실제 Kakao 서비스가 잠시 불안정해도 화면 시연 가능

## 9. 실제 서비스 / 데모 fallback 동작

- Kakao Local API가 정상 동작하면 **실데이터 우선**으로 검색합니다.
- Kakao에서 `App disabled OPEN_MAP_AND_LOCAL service`를 반환하면 자동으로 **데모 데이터 fallback**을 보여줍니다.
- 따라서 발표/시연/스크린샷 상황에서도 UI 흐름이 끊기지 않습니다.

## 10. 예외 처리

- 위치 권한 거부 시 기본 좌표 fallback
- OpenWeatherMap / Kakao API 오류 메시지 분기
- 검색 결과 없음 상태 UI
- localStorage 저장 실패 시 오래된 즐겨찾기부터 줄여 재시도

## 11. 제출용 메모

- 기본 개발 흐름에서는 `js/config.js`를 `.gitignore`로 유지합니다.
- 다만 현재 저장소는 학교 과제 제출/데모용이라 `js/config.js`가 예외적으로 포함될 수 있습니다.
- 브라우저에서 직접 API 키를 사용하므로 완전한 비밀 관리는 어렵습니다.


## 12. 코드 이해용 문서

JS 로직만 빠르게 이해하고 싶다면 아래 문서를 보면 됩니다.

- `JS-LOGIC.md` : `js/` 폴더 기준 로직 흐름, 파일 역할, 데이터 흐름 설명

- `404.html` : GitHub Pages에서 잘못된 주소 접근 시 보여줄 사용자 안내 페이지

- `weathereats_ui_feedback.md` : 현재 UI에 대한 장점/개선점/우선순위 피드백 문서
