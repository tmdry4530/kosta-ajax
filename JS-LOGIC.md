# WeatherEats JS 로직 설명서

이 문서는 `js/` 폴더의 코드 흐름만 빠르게 이해하기 위한 문서입니다.
HTML/CSS 설명보다 **JavaScript 파일 간 역할 분리와 데이터 흐름**에 집중합니다.

---

## 1. 전체 구조 요약

이 프로젝트의 JS는 크게 6개 역할로 나뉩니다.

- `config.js` : API 키 보관
- `common.js` : 공통 상수, 공통 유틸, 공통 UI 함수
- `weather.js` : OpenWeatherMap 호출 + 날씨 데이터 정규화
- `kakao.js` : Kakao Local 검색 + Kakao 지도 제어 + fallback 데이터 생성
- `favorites.js` : localStorage CRUD
- `main.js` : 메인 페이지 진입 로직
- `search.js` : 검색 페이지 진입 로직

즉,

- **공통 기반**: `common.js`
- **외부 API 계층**: `weather.js`, `kakao.js`
- **저장소 계층**: `favorites.js`
- **페이지 진입점**: `main.js`, `search.js`

---

## 2. 전역 네임스페이스 구조

모든 JS는 아래 네임스페이스를 공유합니다.

```js
window.WeatherEats = window.WeatherEats || {};
```

여기에 기능별 모듈이 붙습니다.

- `WeatherEats.constants`
- `WeatherEats.utils`
- `WeatherEats.ui`
- `WeatherEats.weather`
- `WeatherEats.kakao`
- `WeatherEats.favorites`

이 구조 덕분에:
- 전역 오염을 줄일 수 있고
- 페이지별 파일이 서로 필요한 기능만 호출할 수 있습니다.

---

## 3. 파일별 역할

### 3-1. `js/config.js`

역할:
- 외부 API 키를 보관합니다.

사용처:
- `weather.js`가 `WEATHER_API_KEY` 사용
- `kakao.js`가 `KAKAO_REST_KEY`, `KAKAO_JS_KEY` 사용

---

### 3-2. `js/common.js`

역할:
- 앱 전체에서 공통으로 쓰는 유틸과 UI 함수를 모아둔 파일입니다.

핵심 구성:

#### `WeatherEats.constants`
- 즐겨찾기 storage key
- 기본 좌표
- 검색 반경
- 페이지 크기

#### `WeatherEats.utils`
- `escapeHtml()` : XSS 방지용 문자열 escape
- `formatTemperature()` : 온도 표시 형식 정리
- `formatSavedDate()` : 즐겨찾기 저장일 표시 형식 정리
- `getQueryParams()` : URL 쿼리 파라미터 읽기
- `buildQueryString()` : 쿼리 문자열 생성
- `moveToPage()` : 쿼리 포함 페이지 이동
- `updateAddressBar()` : 현재 URL 쿼리 갱신
- `normalizeCoordinate()` : 위경도 숫자 변환
- `isConfigReady()` : API 키 존재 여부 확인
- `rejectDeferred()` : jQuery Deferred reject 헬퍼
- `buildApiErrorMessage()` : API 응답 상태코드별 사용자 메시지 생성
- `getCurrentPosition()` : Geolocation API 호출

#### `WeatherEats.ui`
- `showBanner()` / `hideBanner()` : 상단 상태 메시지 제어
- `setTheme()` : 날씨에 맞는 body theme class 적용
- `renderManualLocationForm()` : 위치 권한 실패 시 수동 좌표 입력 폼 생성
- `hideManualLocationForm()` : 수동 입력 폼 숨김
- `renderEmptyState()` / `hideEmptyState()` : 빈 상태 UI 제어

즉 `common.js`는
**다른 모든 JS 파일의 기반 라이브러리** 역할을 합니다.

---

### 3-3. `js/weather.js`

역할:
- OpenWeatherMap API 호출
- 날씨 데이터를 화면에서 쓰기 좋은 구조로 정규화
- 날씨 → 음식 추천 로직 수행

핵심 함수:

#### `fetchCurrentWeather(lat, lon)`
- 현재 날씨 API 호출

#### `fetchForecast(lat, lon)`
- 5일 예보 API 호출

#### `normalizeCurrentWeather(data)`
- OpenWeatherMap 원본 응답을 아래 구조로 변환

```js
{
  locationName,
  weatherMain,
  description,
  icon,
  temp,
  humidity,
  windSpeed,
  recommendations,
  extraMessages,
  summaryMessage,
  themeClass
}
```

#### `buildRecommendation(weatherData)`
- PRD의 핵심 로직
- 비/눈 우선
- 그 다음 기온 기준
- 습도/풍속은 보조 메시지 추가

#### `extractForecastDays(forecastData)`
- 3시간 단위 예보 데이터를
- 하루당 대표 데이터 1개로 압축해서
- 예보 바에 쓰기 좋은 형태로 변환

즉 `weather.js`는
**날씨 API 응답을 앱 도메인 데이터로 바꾸는 계층**입니다.

---

### 3-4. `js/kakao.js`

역할:
- Kakao Local API 검색
- Kakao Maps SDK 로드
- 지도 생성 / 마커 렌더링 / 인포윈도우 제어
- Kakao 서비스가 막힐 때 fallback 데모 데이터 제공

핵심 함수:

#### `searchPlaces(keyword, lat, lon, page, size, options)`
- Kakao Local API 검색의 핵심 함수
- 성공하면 실데이터 반환
- `403 OPEN_MAP_AND_LOCAL` 오류면 fallback 데이터 반환
- `options.forceFallback === true`면 강제 demo 모드 사용

#### `countPlaces(keyword, lat, lon)`
- 추천 카드에 표시할 주변 맛집 개수 계산용

#### `loadSdk()`
- Kakao Maps SDK를 동적으로 로드
- 이미 로드된 경우 재사용

#### `createMap(containerId, lat, lon)`
- 지도 생성

#### `renderMarkers(places, handlers)`
- 검색 결과를 바탕으로 마커 생성
- 클릭 시 인포윈도우 열기 + 콜백 실행

#### `focusMarker(placeId)`
- 특정 결과와 연결된 마커 강조 + 중심 이동

#### fallback 관련
- `buildFallbackDocuments()`
- `buildFallbackResponse()`

이 부분은 발표/스크린샷/데모 상황에서
실 API가 막혀도 검색 UI 전체가 죽지 않도록 만든 장치입니다.

즉 `kakao.js`는
**검색 API 계층 + 지도 제어 계층 + 데모 fallback 계층**을 함께 담당합니다.

---

### 3-5. `js/favorites.js`

역할:
- 즐겨찾기 데이터를 localStorage에 저장/조회/삭제
- 즐겨찾기 페이지 렌더링까지 담당

핵심 함수:

#### 저장소 함수
- `getFavorites()`
- `isFavorite(id)`
- `saveFavorite(place)`
- `removeFavorite(id)`
- `clearFavorites()`
- `toggleFavorite(place)`
- `renderFavoriteButtonLabel(id)`

#### 내부 함수
- `readFavorites()` : localStorage 읽기
- `writeFavorites(items)` : localStorage 저장
  - quota 초과 시 오래된 항목부터 줄이며 재시도
- `normalizeFavorite(place)` : 검색 결과 객체를 저장용 스키마로 변환

#### 페이지 렌더링 함수
- `renderFavoritesPage()` : 즐겨찾기 목록 화면 출력
- `bindFavoritesPageEvents()` : 삭제/전체삭제/지도 이동 이벤트 연결

중요 포인트:
- `favorites.js`는 단순 저장소 + 페이지 렌더링을 동시에 맡고 있음
- `favorites.html`에서는 이 파일 하나만으로 목록 UI가 동작함
- `search.js`에서는 이 파일을 저장소처럼 호출함

즉 `favorites.js`는
**로컬 영속 저장 계층**입니다.

---

### 3-6. `js/main.js`

역할:
- 메인 페이지 초기화
- 위치 요청
- 날씨 조회
- 추천 카드/예보 렌더링

흐름:

1. 페이지 로드
2. `requestCurrentLocation()` 실행
3. 위치 성공 시 현재 좌표로 날씨/예보 요청
4. 실패 시 기본 좌표 fallback + 수동 위치 입력 폼 제공
5. `loadWeatherByCoords()`에서 현재 날씨 + 예보 병렬 요청
6. 응답 성공 시
   - `renderWeatherCard()`
   - `renderForecast()`
   - `renderRecommendations()`
   - `updateRecommendationCounts()`
7. 추천 카드 클릭 시 `search.html`로 이동

핵심 함수:
- `renderWeatherCard()`
- `renderForecast()`
- `renderRecommendations()`
- `updateRecommendationCounts()`
- `loadWeatherByCoords()`
- `requestCurrentLocation()`
- `bindEvents()`

즉 `main.js`는
**메인 화면 전용 오케스트레이션 파일**입니다.

---

### 3-7. `js/search.js`

역할:
- 검색 페이지 상태 관리
- URL 쿼리 읽기
- 검색/필터/페이지네이션/즐겨찾기/지도 하이라이트 동작 연결

상태 객체:

```js
state = {
  lat,
  lon,
  keyword,
  page,
  filter,
  places,
  visiblePlaces,
  meta,
  focusPlaceId,
  demoMode
}
```

핵심 함수:

#### `normalizePlace(doc)`
- Kakao 검색 결과를 화면용 객체로 정규화

#### `filterPlaces()`
- 현재 필터 값에 따라 `visiblePlaces` 계산

#### `renderResults()`
- 결과 리스트 HTML 생성
- 마커 렌더링도 함께 호출

#### `renderPagination()`
- 페이지 버튼 생성

#### `highlightCard(placeId, shouldScroll)`
- 리스트 hover / 마커 클릭 연동용

#### `search(keyword, page)`
- 검색 페이지의 핵심 함수
- 실데이터 or fallback 데이터를 받아서
  - 상태 갱신
  - 결과 렌더링
  - 페이지네이션 렌더링
  - URL 갱신
  - 상태 메시지 갱신

#### `bindEvents()`
- 검색 submit
- 내 주변 버튼
- 필터 탭 클릭
- 페이지네이션 클릭
- 리스트 hover
- 즐겨찾기 버튼 클릭

초기 진입 흐름:
1. URL 쿼리 읽기
2. `state` 초기화
3. demo 쿼리(`demo=1`) 확인
4. Kakao SDK 로드
5. 지도 생성
6. keyword가 있으면 바로 검색
7. 없으면 초기 빈 상태 표시

즉 `search.js`는
**검색 화면 전용 상태 머신 + 컨트롤러** 역할입니다.

---

## 4. 실제 데이터 흐름

### 메인 페이지

```text
main.js
 → common.js 위치 유틸 호출
 → weather.js 현재 날씨/예보 요청
 → weather.js 추천 로직 수행
 → main.js가 날씨 카드/추천 카드/예보 렌더링
 → 추천 카드 클릭 시 search.html 이동
```

### 검색 페이지

```text
search.js
 → common.js로 URL 파라미터 읽기
 → kakao.js로 검색 요청
 → 결과를 normalizePlace()
 → filterPlaces()
 → renderResults()
 → kakao.js가 지도 마커 렌더링
 → 즐겨찾기 클릭 시 favorites.js 저장
```

### 즐겨찾기 페이지

```text
favorites.js
 → localStorage 읽기
 → 목록 렌더링
 → 삭제 / 전체삭제 / 지도이동 처리
```

---

## 5. 페이지별 의존 관계

### index.html
로드 순서:
1. `config.js`
2. `common.js`
3. `weather.js`
4. `kakao.js`
5. `main.js`

### search.html
로드 순서:
1. `config.js`
2. `common.js`
3. `favorites.js`
4. `kakao.js`
5. `search.js`

### favorites.html
로드 순서:
1. `config.js`
2. `common.js`
3. `favorites.js`

중요한 이유:
- `main.js`, `search.js`는 직접 API를 때리지 않고
  앞서 로드된 공통 모듈을 사용함
- 그래서 **공통 모듈이 먼저 로드돼야 함**

---

## 6. 발표할 때 설명 포인트

발표에서는 아래처럼 설명하면 이해가 쉽습니다.

### 한 줄 요약
- `common.js`는 공통 기반
- `weather.js`와 `kakao.js`는 외부 API 계층
- `favorites.js`는 localStorage 계층
- `main.js`와 `search.js`는 페이지별 제어 계층

### 핵심 설계 포인트
1. **API 호출과 화면 로직을 분리했다**
   - 날씨/검색 API 처리는 별도 모듈
   - 페이지는 렌더링과 이벤트에 집중

2. **URL 쿼리로 페이지 간 상태를 넘긴다**
   - 추천 카드 클릭 → 검색 키워드/좌표 전달

3. **localStorage로 즐겨찾기를 영속 저장한다**
   - 새로고침해도 유지됨

4. **실 API 실패 시 fallback 경로도 준비했다**
   - 시연/발표 안정성 확보

---

## 7. 가장 중요한 함수 3개만 꼽으면

### `main.js > loadWeatherByCoords()`
- 메인 페이지 전체를 움직이는 중심 함수

### `search.js > search()`
- 검색 페이지 전체를 움직이는 중심 함수

### `favorites.js > toggleFavorite()`
- 검색/즐겨찾기 두 페이지를 연결하는 핵심 함수

---

## 8. 요약

이 프로젝트의 JS 로직은 다음 구조로 이해하면 됩니다.

```text
common.js      = 공통 기반
weather.js     = 날씨 API 계층
kakao.js       = 맛집 검색/지도 계층
favorites.js   = localStorage 계층
main.js        = 메인 페이지 제어
search.js      = 검색 페이지 제어
```

즉,
**공통 모듈 + API 모듈 + 저장 모듈 + 페이지 진입점** 구조로 나뉘어 있고,
각 파일이 역할을 비교적 명확하게 나눠 갖도록 구성되어 있습니다.
