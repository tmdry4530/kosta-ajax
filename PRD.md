# 🍽️ WeatherEats — "오늘 뭐 먹지?"

> 날씨 기반 맛집 추천 웹 애플리케이션

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | WeatherEats (오늘 뭐 먹지?) |
| **유형** | 개인 프로젝트 — Open API를 이용한 웹 프론트엔드 |
| **기술 스택** | HTML5, CSS3, JavaScript (ES6), jQuery, AJAX |
| **사용 API** | OpenWeatherMap API, Kakao Local API, Kakao Maps SDK |
| **배포** | GitHub Pages |

### 핵심 컨셉

현재 위치의 날씨 정보를 기반으로 어울리는 음식 카테고리를 자동 추천하고, 주변 맛집을 카카오맵과 함께 검색·탐색할 수 있는 서비스.

---

## 2. 사용 API 상세

### 2-1. OpenWeatherMap API (무료)

- **용도**: 현재 날씨 조회 + 5일 예보
- **엔드포인트**:
  - 현재 날씨: `GET https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=kr`
  - 5일 예보: `GET https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=kr`
- **키 발급**: https://openweathermap.org/api → Sign Up → API Keys
- **무료 한도**: 60회/분, 1,000,000회/월
- **응답 주요 필드**:
  - `weather[0].main` — 날씨 상태 (Clear, Rain, Snow, Clouds 등)
  - `weather[0].icon` — 아이콘 코드
  - `main.temp` — 현재 기온 (°C)
  - `main.humidity` — 습도 (%)
  - `wind.speed` — 풍속

### 2-2. Kakao Local API (무료)

- **용도**: 키워드로 주변 음식점 검색
- **엔드포인트**:
  - 키워드 검색: `GET https://dapi.kakao.com/v2/local/search/keyword.json?query={검색어}&x={lon}&y={lat}&radius=3000&category_group_code=FD6`
- **헤더**: `Authorization: KakaoAK {REST_API_KEY}`
- **키 발급**: https://developers.kakao.com → 앱 생성 → REST API 키
- **무료 한도**: 100,000회/일
- **응답 주요 필드**:
  - `documents[].place_name` — 가게명
  - `documents[].category_name` — 카테고리
  - `documents[].address_name` — 주소
  - `documents[].phone` — 전화번호
  - `documents[].place_url` — 카카오맵 링크
  - `documents[].x`, `documents[].y` — 좌표

### 2-3. Kakao Maps SDK (무료)

- **용도**: 지도 렌더링 + 맛집 마커 표시
- **로드**: `<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey={JS_KEY}&libraries=services"></script>`
- **키**: 같은 앱의 JavaScript 키 사용

---

## 3. 날씨 → 음식 매핑 로직

날씨 상태와 기온을 조합하여 추천 음식 카테고리를 결정한다.

### 기온 기반 기본 매핑

| 조건 | 추천 카테고리 | 검색 키워드 |
|------|-------------|------------|
| 🌧️ 비/눈 올 때 | 전, 파전, 막걸리 | `파전`, `전 맛집`, `막걸리` |
| 🥶 5°C 이하 (매우 추움) | 국밥, 찌개, 탕 | `국밥`, `찌개 맛집`, `샤브샤브` |
| 🧥 5~12°C (쌀쌀) | 라멘, 국수, 수제비 | `라멘`, `칼국수`, `수제비` |
| 🌤️ 13~22°C (선선/따뜻) | 한식, 분식, 카페 | `한식 맛집`, `분식`, `브런치` |
| ☀️ 23~30°C (더움) | 냉면, 초밥, 샐러드 | `냉면`, `초밥`, `샐러드` |
| 🔥 30°C 초과 (폭염) | 빙수, 아이스크림, 냉면 | `빙수`, `아이스크림`, `냉면 맛집` |

### 특수 조건

| 조건 | 추가 추천 |
|------|----------|
| 습도 80% 이상 (무더움) | 팥빙수, 냉방 맛집 |
| 풍속 10m/s 이상 (강풍) | 포장 가능 맛집, 배달 |
| 미세먼지 나쁨 (선택) | 실내 맛집, 카페 |

---

## 4. 페이지 구성

### 4-1. 메인 페이지 (`index.html`)

```
┌──────────────────────────────────────────────┐
│  🍽️ WeatherEats            [위치변경] [즐겨찾기] │  ← 헤더/네비게이션
├──────────────────────────────────────────────┤
│                                              │
│   ┌─────────────────────────────────┐        │
│   │  📍 안양시 동안구                  │        │
│   │  🌧️ 비  17°C  습도 82%           │        │  ← 날씨 카드
│   │  "비 오는 날엔 파전에 막걸리죠!"    │        │
│   └─────────────────────────────────┘        │
│                                              │
│   오늘의 추천 메뉴                             │
│   ┌────────┐ ┌────────┐ ┌────────┐          │
│   │ 🥘     │ │ 🫓     │ │ 🍶     │          │  ← 추천 카테고리 카드
│   │ 해물탕  │ │ 파전   │ │ 막걸리  │          │     (클릭 시 맛집 검색)
│   │ 12개   │ │ 8개    │ │ 5개    │          │
│   └────────┘ └────────┘ └────────┘          │
│                                              │
│   📅 이번 주 날씨 미리보기                      │
│   ┌──┬──┬──┬──┬──┐                          │
│   │월│화│수│목│금│                            │  ← 5일 예보 바
│   │☀️│🌧│🌧│⛅│☀️│                            │
│   │18│15│14│17│20│                           │
│   └──┴──┴──┴──┴──┘                          │
│                                              │
├──────────────────────────────────────────────┤
│  © 2026 WeatherEats | GitHub                 │  ← 푸터
└──────────────────────────────────────────────┘
```

**기능 상세:**
- 페이지 로드 시 `navigator.geolocation`으로 현위치 감지
- jQuery AJAX로 OpenWeatherMap API 호출 → 날씨 카드 렌더링
- 날씨 매핑 로직으로 추천 카테고리 3~4개 카드 표시
- 카테고리 카드 클릭 → 맛집 검색 페이지로 이동 (해당 키워드 전달)
- 5일 예보 데이터로 하단 예보 바 렌더링

### 4-2. 맛집 검색 페이지 (`search.html`)

```
┌──────────────────────────────────────────────┐
│  🍽️ WeatherEats            [홈] [즐겨찾기]     │
├──────────────────────────────────────────────┤
│                                              │
│  🔍 [    검색어 입력    ] [검색]  [내 주변 3km] │  ← 검색 바
│                                              │
│  카테고리 필터:                                 │
│  [전체] [한식] [중식] [일식] [양식] [카페]       │  ← 필터 탭
│                                              │
│  ┌───────────────────┬──────────────────┐    │
│  │                   │ 📋 검색 결과 (12) │    │
│  │                   │                  │    │
│  │    🗺️ 카카오맵     │ 1. 황소국밥 ⭐4.2 │    │
│  │                   │    동안구 123     │    │
│  │   [📍] [📍] [📍]  │    ☎ 031-1234    │    │
│  │                   │    [♡ 즐겨찾기]   │    │
│  │                   │ ───────────────  │    │  ← 지도 + 리스트 분할
│  │                   │ 2. 원조파전집     │    │
│  │                   │    동안구 456     │    │
│  │                   │    [♡ 즐겨찾기]   │    │
│  │                   │ ───────────────  │    │
│  │                   │ 3. ...           │    │
│  └───────────────────┴──────────────────┘    │
│                                              │
│  [◀ 이전]  1  2  3  [다음 ▶]                  │  ← 페이지네이션
│                                              │
└──────────────────────────────────────────────┘
```

**기능 상세:**
- 메인에서 전달된 키워드 또는 직접 입력한 키워드로 검색
- jQuery AJAX → 카카오 로컬 API 호출
- 검색 결과를 리스트로 렌더링 + 카카오맵에 마커 표시
- 리스트 아이템 호버 시 해당 마커 하이라이트
- 마커 클릭 시 인포윈도우에 가게 정보 표시
- 즐겨찾기 버튼 → localStorage에 저장
- 카테고리 필터 탭으로 결과 필터링
- 페이지네이션 (API의 page 파라미터 활용)

### 4-3. 즐겨찾기 페이지 (`favorites.html`)

```
┌──────────────────────────────────────────────┐
│  🍽️ WeatherEats               [홈] [검색]     │
├──────────────────────────────────────────────┤
│                                              │
│  ⭐ 내 즐겨찾기 (5개)          [전체삭제]       │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ 1. 황소국밥              [삭제] [지도] │    │
│  │    📍 안양시 동안구 123               │    │
│  │    ☎ 031-1234-5678                  │    │
│  │    🏷️ 한식 > 국밥                    │    │
│  │    📅 저장일: 2026.03.29             │    │
│  ├──────────────────────────────────────┤    │
│  │ 2. 원조파전집            [삭제] [지도] │    │
│  │    📍 안양시 만안구 456               │    │
│  │    ...                              │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  즐겨찾기가 없을 때:                           │
│  ┌──────────────────────────────────────┐    │
│  │   ⭐ 아직 즐겨찾기가 없어요!           │    │
│  │   [맛집 검색하러 가기]                 │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

**기능 상세:**
- localStorage에서 저장된 맛집 리스트 불러와서 렌더링
- 개별 삭제 / 전체 삭제
- "지도" 버튼 클릭 시 검색 페이지로 이동 (해당 좌표 중심)
- 빈 상태(Empty State) UI 처리

---

## 5. 디렉토리 구조

```
WeatherEats/
├── index.html              # 메인 페이지 (날씨 + 추천)
├── search.html             # 맛집 검색 페이지
├── favorites.html          # 즐겨찾기 페이지
├── css/
│   ├── reset.css           # CSS 리셋
│   ├── common.css          # 공통 스타일 (헤더, 푸터, 변수)
│   ├── main.css            # 메인 페이지 스타일
│   ├── search.css          # 검색 페이지 스타일
│   └── favorites.css       # 즐겨찾기 페이지 스타일
├── js/
│   ├── config.js           # API 키 설정 (gitignore 대상)
│   ├── common.js           # 공통 유틸 (위치 감지, 헤더 렌더링)
│   ├── weather.js          # 날씨 API 호출 + 매핑 로직
│   ├── kakao.js            # 카카오 API 호출 + 지도 관리
│   ├── favorites.js        # localStorage CRUD
│   ├── main.js             # 메인 페이지 로직
│   └── search.js           # 검색 페이지 로직
├── img/
│   ├── weather/            # 날씨 아이콘 (또는 API 아이콘 사용)
│   └── food/               # 음식 카테고리 일러스트
├── .gitignore
└── README.md
```

---

## 6. 핵심 jQuery/AJAX 코드 패턴

### 6-1. 날씨 API 호출

```javascript
// weather.js
function getWeather(lat, lon) {
  return $.ajax({
    url: 'https://api.openweathermap.org/data/2.5/weather',
    method: 'GET',
    data: {
      lat: lat,
      lon: lon,
      appid: CONFIG.WEATHER_API_KEY,
      units: 'metric',
      lang: 'kr'
    }
  });
}

// 호출
getWeather(37.3943, 126.9568)
  .done(function(data) {
    renderWeatherCard(data);
    const foods = mapWeatherToFood(data);
    renderFoodCards(foods);
  })
  .fail(function(err) {
    console.error('날씨 정보를 불러올 수 없습니다.', err);
  });
```

### 6-2. 카카오 로컬 API 호출

```javascript
// kakao.js
function searchPlaces(keyword, lat, lon, page) {
  return $.ajax({
    url: 'https://dapi.kakao.com/v2/local/search/keyword.json',
    method: 'GET',
    headers: {
      'Authorization': 'KakaoAK ' + CONFIG.KAKAO_REST_KEY
    },
    data: {
      query: keyword,
      y: lat,
      x: lon,
      radius: 3000,
      category_group_code: 'FD6',
      page: page || 1,
      size: 10
    }
  });
}
```

### 6-3. 날씨 → 음식 매핑

```javascript
// weather.js
function mapWeatherToFood(weatherData) {
  const temp = weatherData.main.temp;
  const weather = weatherData.weather[0].main;
  const humidity = weatherData.main.humidity;
  let recommendations = [];

  // 비/눈 최우선
  if (weather === 'Rain' || weather === 'Drizzle') {
    recommendations = [
      { emoji: '🫓', name: '파전', keyword: '파전 맛집' },
      { emoji: '🍶', name: '막걸리', keyword: '막걸리' },
      { emoji: '🥘', name: '해물탕', keyword: '해물탕' }
    ];
  } else if (weather === 'Snow') {
    recommendations = [
      { emoji: '🍲', name: '찌개', keyword: '찌개 맛집' },
      { emoji: '☕', name: '핫초코', keyword: '카페' },
      { emoji: '🥟', name: '만두', keyword: '만두 맛집' }
    ];
  }
  // 기온 기반
  else if (temp <= 5) {
    recommendations = [
      { emoji: '🥘', name: '국밥', keyword: '국밥' },
      { emoji: '🍲', name: '찌개', keyword: '찌개 맛집' },
      { emoji: '🫕', name: '샤브샤브', keyword: '샤브샤브' }
    ];
  } else if (temp <= 12) {
    recommendations = [
      { emoji: '🍜', name: '라멘', keyword: '라멘' },
      { emoji: '🍝', name: '칼국수', keyword: '칼국수' },
      { emoji: '🥘', name: '수제비', keyword: '수제비' }
    ];
  } else if (temp <= 22) {
    recommendations = [
      { emoji: '🍚', name: '한식', keyword: '한식 맛집' },
      { emoji: '🍢', name: '분식', keyword: '분식' },
      { emoji: '🥐', name: '브런치', keyword: '브런치 카페' }
    ];
  } else if (temp <= 30) {
    recommendations = [
      { emoji: '🍜', name: '냉면', keyword: '냉면' },
      { emoji: '🍣', name: '초밥', keyword: '초밥' },
      { emoji: '🥗', name: '샐러드', keyword: '샐러드' }
    ];
  } else {
    recommendations = [
      { emoji: '🍧', name: '빙수', keyword: '빙수' },
      { emoji: '🍦', name: '아이스크림', keyword: '아이스크림' },
      { emoji: '🍜', name: '냉면', keyword: '냉면 맛집' }
    ];
  }

  return recommendations;
}
```

---

## 7. 데이터 흐름

```
[사용자 접속]
     │
     ▼
[Geolocation API] ──→ 위치 좌표 획득 (lat, lon)
     │
     ├──→ [OpenWeatherMap API] ──→ 날씨 데이터 수신
     │         │
     │         ▼
     │    [매핑 로직] ──→ 추천 음식 카테고리 결정
     │         │
     │         ▼
     │    [메인 페이지 렌더링] ──→ 날씨 카드 + 추천 카드
     │
     └──→ [사용자 카테고리 클릭]
               │
               ▼
          [Kakao Local API] ──→ 주변 맛집 검색 결과
               │
               ├──→ [리스트 렌더링]
               └──→ [카카오맵 마커 표시]
                         │
                         ▼
                    [즐겨찾기 저장] ──→ localStorage
```

---

## 8. UI/UX 디자인 가이드

### 컬러 팔레트

| 용도 | 컬러 | 코드 |
|------|------|------|
| Primary | 따뜻한 오렌지 | `#FF6B35` |
| Secondary | 소프트 블루 | `#4ECDC4` |
| Background | 크림 화이트 | `#FFF8F0` |
| Card BG | 화이트 | `#FFFFFF` |
| Text | 다크 그레이 | `#2D3436` |
| Sub Text | 미디엄 그레이 | `#636E72` |
| Accent (비) | 레인 블루 | `#74B9FF` |
| Accent (눈) | 스노우 화이트 | `#DFE6E9` |
| Accent (맑음) | 선샤인 옐로 | `#FFEAA7` |

### 폰트

- 제목: `'Noto Sans KR', sans-serif` (Bold 700)
- 본문: `'Noto Sans KR', sans-serif` (Regular 400)
- CDN: `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap`

### 디자인 원칙

- 카드 기반 UI — 둥근 모서리 (`border-radius: 16px`), 부드러운 그림자
- 날씨에 따라 배경 그라데이션 변경 (맑음: 노랑→흰, 비: 파랑→회색)
- 음식 이모지를 적극 활용하여 직관적 UX
- 모바일 우선 반응형 (breakpoint: 768px)

---

## 9. localStorage 스키마

```javascript
// 키: 'weathereats_favorites'
// 값: JSON 문자열
[
  {
    "id": "kakao_12345678",        // 카카오 place id
    "place_name": "황소국밥",
    "category_name": "음식점 > 한식 > 국밥",
    "address_name": "경기 안양시 동안구 123",
    "phone": "031-1234-5678",
    "place_url": "https://place.map.kakao.com/12345678",
    "x": "126.9568",
    "y": "37.3943",
    "saved_at": "2026-03-29T14:30:00"
  }
]
```

---

## 10. API 키 관리

```javascript
// js/config.js (gitignore 대상)
const CONFIG = {
  WEATHER_API_KEY: 'your_openweathermap_api_key',
  KAKAO_REST_KEY: 'your_kakao_rest_api_key',
  KAKAO_JS_KEY: 'your_kakao_javascript_key'
};
```

```gitignore
# .gitignore
js/config.js
```

> ⚠️ GitHub Pages 배포 시 config.js가 gitignore되면 동작하지 않으므로,
> 제출용으로는 키를 포함하되 README에 "API 키 발급 필요" 안내를 작성한다.
> (학교 과제 수준에서는 키 노출 무방 — 무료 티어이므로)

---

## 11. 개발 일정 (예상)

| 일차 | 작업 내용 |
|------|----------|
| Day 1 | 프로젝트 셋업, HTML 마크업 (3페이지), CSS 기본 레이아웃 |
| Day 2 | 날씨 API 연동 + 날씨→음식 매핑 로직 구현 |
| Day 3 | 카카오 로컬 API 연동 + 검색 결과 리스트 렌더링 |
| Day 4 | 카카오맵 연동 (마커, 인포윈도우) |
| Day 5 | 즐겨찾기 기능 (localStorage CRUD) |
| Day 6 | 반응형 CSS + 날씨별 테마 전환 + 5일 예보 |
| Day 7 | 버그 수정, README 작성, GitHub Pages 배포 |

---

## 12. 평가 체크리스트

- [x] OpenAPI를 사용하여 데이터를 요청/응답 처리 (OpenWeatherMap + Kakao)
- [x] AJAX + jQuery 기반으로 구현
- [x] 응답 데이터를 가공하여 UI에 출력
- [x] GitHub에 게시 가능한 구조
- [x] 여러 페이지 구성 (3페이지)
- [x] 사용자 인터랙션 (검색, 필터, 즐겨찾기)
- [x] 반응형 디자인
- [x] 에러 처리 (위치 권한 거부, API 실패 등)

---

## 부록: API 키 발급 가이드

### OpenWeatherMap
1. https://openweathermap.org 접속 → Sign Up
2. 이메일 인증 완료
3. 로그인 → My API Keys → 기본 키 복사
4. 무료 플랜(Current Weather + 5 Day Forecast) 자동 활성화

### Kakao Developers
1. https://developers.kakao.com 접속 → 로그인
2. 내 애플리케이션 → 애플리케이션 추가
3. 앱 키 → REST API 키 + JavaScript 키 복사
4. 플랫폼 → Web → 사이트 도메인 등록
   - 개발: `http://localhost`, `http://127.0.0.1:5500`
   - 배포: `https://tmdry4530.github.io`