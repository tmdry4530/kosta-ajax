# WeatherEats JS 로직 설명서

이 문서는 `js/` 폴더 기준으로 현재 구현된 JavaScript 구조와 데이터 흐름을 빠르게 이해하기 위한 문서입니다.
HTML/CSS보다는 **모듈 역할 분리, 상태 흐름, API 연결 방식**에 집중합니다.

---

## 1. 전체 구조 요약

현재 프로젝트의 JS는 아래 7개 파일로 구성됩니다.

- `config.js` : API 키 보관
- `common.js` : 공통 상수, 유틸, 공통 UI 함수
- `weather.js` : OpenWeatherMap 호출 + 날씨 데이터 정규화 + 추천 로직
- `kakao.js` : Kakao Local 검색 + 역지오코딩 + 지도 SDK 제어 + fallback 데이터
- `favorites.js` : 즐겨찾기 localStorage CRUD
- `main.js` : 홈 화면 진입점
- `search.js` : 검색 화면 진입점

즉 구조는 아래처럼 나뉩니다.

- **공통 기반**: `common.js`
- **외부 API 계층**: `weather.js`, `kakao.js`
- **저장 계층**: `favorites.js` + recent search localStorage
- **페이지 컨트롤러**: `main.js`, `search.js`

---

## 1-1. 왜 이런 기술을 사용했는가

이 프로젝트는 학교 과제 조건상 **React/Vue/Angular 없이 순수 HTML/CSS/JavaScript + jQuery + AJAX**로 구현해야 했습니다.
그래서 기술 선택도 “과제 제약 안에서 가장 안정적으로 구현 가능한가”를 기준으로 했습니다.

### jQuery를 사용한 이유
- 과제 요구사항에 맞는 기술 스택
- DOM 선택, 이벤트 바인딩, AJAX 호출을 빠르게 구현 가능
- 별도 번들러 없이 `<script>` 로드만으로 사용 가능
- 작은 프로젝트에서 학습/발표용으로 구조 설명이 쉬움

### AJAX(`$.ajax`)를 사용한 이유
- OpenWeatherMap / Kakao Local API를 브라우저에서 직접 호출해야 함
- jQuery와 자연스럽게 연결됨
- `.done()` / `.fail()` 체인으로 성공/실패 흐름을 명확히 분리 가능

### OpenWeatherMap을 사용한 이유
- 현재 날씨와 5일 예보를 모두 제공
- 무료 플랜으로 과제 구현 범위 충족
- 날씨 상태/기온/습도/풍속 데이터를 메뉴 추천 로직에 연결하기 쉬움

### Kakao Local / Kakao Maps를 사용한 이유
- 국내 맛집 검색과 지도 표시가 자연스러움
- 한국 주소 체계와 행정동 기반 역지오코딩에 유리함
- 맛집 추천 서비스라는 주제에 가장 직접적으로 연결됨

### localStorage를 사용한 이유
- 별도 백엔드 없이도 즐겨찾기/최근 검색을 저장할 수 있음
- GitHub Pages 같은 정적 배포 환경에서도 동작
- 새로고침 후에도 사용자 상태를 유지할 수 있음

### GitHub Pages 정적 배포 구조를 유지한 이유
- 학교 과제 제출/공유가 쉬움
- 서버 구축 없이도 배포 가능
- 정적 프론트엔드 구조를 설명하기 쉬움

---

## 2. 전역 네임스페이스 구조

모든 파일은 같은 전역 네임스페이스를 공유합니다.

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
- 전역 변수 오염을 줄일 수 있고
- 파일 간 결합도를 낮추면서 필요한 기능만 호출할 수 있습니다.

왜 이런 방식을 썼는가:
- ES Module이나 번들러를 쓰지 않는 조건이라 `import/export` 대신 네임스페이스 패턴이 필요했기 때문
- 파일을 나눠도 서로 접근 가능한 공통 진입점이 있어야 했기 때문
- 발표 시 “기능별 모듈이 어디에 붙는지” 설명하기 쉬움

---

## 3. 파일별 역할

### 3-1. `js/config.js`

역할:
- 외부 API 키를 보관합니다.

사용처:
- `weather.js` → `WEATHER_API_KEY`
- `kakao.js` → `KAKAO_REST_KEY`, `KAKAO_JS_KEY`

주의:
- 저장소 기본값은 placeholder일 수 있고
- GitHub Pages 배포 시에는 workflow가 실제 값을 주입합니다.

---

### 3-2. `js/common.js`

역할:
- 앱 전체에서 공통으로 쓰는 상수, 유틸, 공통 UI 함수를 제공합니다.

#### `WeatherEats.constants`
주요 상수:
- `favoriteStorageKey`
- `recentSearchStorageKey`
- `maxFavorites`
- `maxRecentSearches`
- `defaultCoords`
- `pageSize`
- `searchRadius`
- `geolocation`
  - `desiredAccuracy`
  - `manualPromptThreshold`
  - `retryAccuracyThreshold`
  - `timeout`
  - `retryTimeout`

#### `WeatherEats.utils`
주요 함수:
- `escapeHtml()` : XSS 방지용 문자열 escape
- `formatTemperature()` : 온도 표시 포맷
- `formatDistance()` : m / km 표시 포맷
- `formatSavedDate()` : 저장 날짜 포맷
- `getQueryParams()` : URL 쿼리 읽기
- `buildQueryString()` : URL 쿼리 생성
- `moveToPage()` : 쿼리 포함 페이지 이동
- `updateAddressBar()` : 현재 URL 갱신
- `normalizeCoordinate()` : 좌표 숫자 변환
- `isConfigValueReady()` : placeholder 키 여부까지 검사
- `isConfigReady()` : API 키 유효성 검사
- `rejectDeferred()` : jQuery Deferred reject 헬퍼
- `buildApiErrorMessage()` : API 오류 메시지 공통화
- `shouldPromptManualLocation()` : 위치 정확도가 낮을 때 수동 입력 유도 여부 판단
- `getCurrentPosition()` : 브라우저 Geolocation 호출

#### 현재 `getCurrentPosition()` 특징
예전보다 보강된 부분:
- `maximumAge: 0`으로 **오래된 캐시 좌표 사용 방지**
- `enableHighAccuracy: true`
- 정확도가 너무 낮으면 **한 번 더 재시도**
- 반환 구조에 `accuracy`, `fetchedAt`, `warning`, `retried` 포함 가능

즉 `common.js`는
**모든 페이지와 API 모듈이 의존하는 공통 기반 계층**입니다.

왜 분리했는가:
- 위치 유틸, 쿼리 유틸, 메시지 UI를 각 페이지마다 중복 작성하지 않기 위해
- 위치 정확도 보정, API 오류 메시지 정책 같은 규칙을 한 곳에서 관리하기 위해

#### `WeatherEats.ui`
주요 함수:
- `showBanner()` / `hideBanner()`
- `setTheme()`
- `renderManualLocationForm()` / `hideManualLocationForm()`
- `renderEmptyState()` / `hideEmptyState()`

수동 위치 입력 폼은
- 홈 화면 위치 재설정
- 검색 화면 위치 보정
- 저정밀 위치(1km 이상) 대응
에 재사용됩니다.

---

### 3-3. `js/weather.js`

역할:
- OpenWeatherMap API 호출
- 응답 정규화
- 날씨 기반 메뉴 추천 생성
- 홈 화면 주간 예보 데이터 생성

#### 핵심 함수

##### `fetchCurrentWeather(lat, lon)`
- 현재 날씨 API 호출

##### `fetchForecast(lat, lon)`
- 5일 예보 API 호출

##### `normalizeCurrentWeather(data)`
원본 응답을 홈 화면에서 쓰기 쉬운 구조로 정규화합니다.

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

##### `buildRecommendation(weatherData)`
핵심 추천 로직:
- 비/눈 우선
- 그 다음 기온 기준
- 습도/풍속은 보조 메시지 추가

##### `buildSummaryMessage(weatherMain, temp)`
날씨 카드의 한 줄 요약 생성

##### `extractForecastDays(forecastData)`
- 3시간 단위 예보를 하루 대표값으로 압축
- 5일 카드용 데이터로 변환

즉 `weather.js`는
**날씨 API 응답을 앱 도메인 데이터로 바꾸는 계층**입니다.

왜 따로 뒀는가:
- 홈 화면 파일(`main.js`)이 API 응답 구조까지 직접 알지 않게 하려고
- 날씨 추천 규칙을 한 군데서 수정할 수 있도록 하려고
- 발표할 때 “API 응답 → 앱 데이터 변환” 단계를 분리해 설명하기 좋기 때문

---

### 3-4. `js/kakao.js`

역할:
- Kakao Local 검색
- Kakao Maps SDK 동적 로드
- 지도 생성/마커 렌더링/인포윈도우 제어
- 좌표 → 행정동 역지오코딩
- Kakao 서비스 장애 시 fallback 데이터 제공

#### 설정 분리 포인트
현재는 Kakao 기능을 분리해서 검사합니다.
- 검색/역지오코딩 → `KAKAO_REST_KEY`
- 지도 SDK → `KAKAO_JS_KEY`

예전처럼 두 키를 한 번에 강제하지 않아서,
한 기능 실패가 다른 기능 전체를 불필요하게 막지 않도록 했습니다.

#### 핵심 함수

##### `searchPlaces(keyword, lat, lon, page, size, options)`
- Kakao Local 키워드 검색
- `forceFallback`이면 강제 demo 데이터 사용
- 특정 403 오류 시 fallback 결과 반환

##### `countPlaces(keyword, lat, lon)`
- 홈 추천 카드의 주변 맛집 개수 계산용

##### `reverseGeocodeRegion(lat, lon)`
- `coord2regioncode` 사용
- 행정동(`region_type === 'H'`) 우선 선택
- 홈 화면 위치명 보정에 사용

##### `loadSdk()`
- Kakao Maps SDK 동적 로드
- `autoload=false` + `kakao.maps.load()` 방식 사용
- 이미 로드된 경우 재사용

##### `createMap(containerId, lat, lon)`
- 지도 인스턴스 생성

##### `renderMarkers(places, handlers)`
- 검색 결과를 마커로 렌더링
- 클릭 시 인포윈도우 + 리스트 하이라이트 연동 가능

##### `openInfoWindow(placeId)`
- 마커용 인포윈도우 오픈

##### `focusMarker(placeId)`
- 특정 마커 강조 + 중심 이동

#### fallback 관련 함수
- `buildFallbackDocuments()`
- `buildFallbackResponse()`

즉 `kakao.js`는
**검색 API + 역지오코딩 + 지도 제어 + 데모 fallback**을 한 모듈에서 담당합니다.

왜 따로 뒀는가:
- 검색 페이지가 Kakao API 세부사항까지 직접 알지 않게 하려고
- 지도 SDK 로딩, 검색, 마커, 역지오코딩이 모두 Kakao 도메인에 속하기 때문
- 데모 fallback까지 한 모듈에 넣어야 시연 안정성을 확보하기 쉬웠기 때문

---

### 3-5. `js/favorites.js`

역할:
- 즐겨찾기 localStorage 저장/조회/삭제
- 즐겨찾기 페이지 렌더링

#### 저장소 함수
- `getFavorites()`
- `isFavorite(id)`
- `saveFavorite(place)`
- `removeFavorite(id)`
- `clearFavorites()`
- `toggleFavorite(place)`
- `renderFavoriteButtonLabel(id)`

#### 내부 함수
- `readFavorites()`
- `writeFavorites(items)`
  - 용량 초과 시 오래된 항목부터 제거하며 재시도
- `normalizeFavorite(place)`

#### 페이지 함수
- `renderFavoritesPage()`
- `bindFavoritesPageEvents()`

즉 `favorites.js`는
**로컬 영속 저장 + 즐겨찾기 화면 전용 렌더링 계층**입니다.

왜 localStorage 기반으로 갔는가:
- 백엔드 없이도 바로 저장 기능을 만들 수 있기 때문
- 과제 규모에서 서버 DB까지 두는 것보다 훨씬 단순하고 설명하기 쉬움
- 사용자가 직접 저장한 데이터를 새로고침 후에도 유지해야 했기 때문

---

### 3-6. `js/main.js`

역할:
- 홈 화면 초기화
- 현재 위치 획득
- 날씨/예보/행정동 병렬 로드
- 추천 카드/예보 카드 렌더링
- 홈 → 검색 페이지 좌표 동기화

#### 상태 객체

```js
state = {
  lat,
  lon,
  accuracy,
  locationSource,
  locationDetails,
  locationWarning,
  updatedAt
}
```

#### 핵심 함수

##### `renderWeatherCard(weather)`
현재 홈 화면 카드에서 아래 정보를 함께 렌더링합니다.
- 행정동 기준 위치명
- 날씨 기준 도시명(OpenWeather)
- 온도 / 설명 / 습도 / 풍속
- 위치 출처(현재/직접입력/기본)
- 좌표 / 정확도 / 검색 반경 / 갱신 시각
- 데이터 출처 배지
- 위치 경고 메시지

##### `renderForecast(forecastItems)`
5일 예보 카드 렌더링

##### `renderRecommendations(recommendations)`
추천 메뉴 카드 렌더링

##### `updateRecommendationCounts(recommendations)`
각 추천 키워드별 주변 맛집 개수 비동기 갱신

##### `resolveLocationDetails(lat, lon)`
Kakao 역지오코딩 호출 래퍼

##### `showManualPromptForLowAccuracy(coords)`
- 위치 정확도가 1km 이상이면
- 홈 화면 수동 위치 입력 폼을 자동 표시

##### `syncNearbySearchLinks()`
- 홈의 `내 주변 맛집 찾기`
- `직접 검색하기`
- 하단 검색 링크
를 항상 최신 좌표 기반 URL로 유지

##### `loadWeatherByCoords(lat, lon, statusMessage, options)`
홈 화면 핵심 오케스트레이션 함수:
1. 상태 갱신
2. 홈 → 검색 링크 동기화
3. 날씨/예보/역지오코딩 병렬 요청
4. 성공 시 카드 렌더링
5. 실패 시 empty state 표시

##### `requestCurrentLocation()`
- 현재 위치 요청
- 실패 시 기본 좌표 fallback
- 필요 시 수동 위치 입력 폼 제공

##### `bindEvents()`
- 위치 다시 불러오기
- 홈의 검색 CTA 클릭
- 추천 카드 클릭 → `search.html` 이동

즉 `main.js`는
**홈 화면 전용 상태 관리 + 위치/날씨/검색 연결을 담당하는 컨트롤러**입니다.

왜 홈 전용 컨트롤러를 분리했는가:
- 홈 화면은 “위치 요청 → 날씨 조회 → 추천 생성 → 검색 페이지 이동” 흐름을 책임지기 때문
- 검색 화면과 책임이 달라서 한 파일에 섞으면 복잡도가 급격히 올라가기 때문

---

### 3-7. `js/search.js`

역할:
- 검색 페이지 상태 관리
- URL 쿼리 파라미터 복원
- 검색/필터/정렬/거리/이동시간/최근검색/즐겨찾기/지도 연동

#### 상태 객체

```js
state = {
  lat,
  lon,
  keyword,
  page,
  filter,
  sort,
  distanceLimit,
  travelMode,
  places,
  visiblePlaces,
  meta,
  focusPlaceId,
  accuracy,
  demoMode
}
```

#### 핵심 함수

##### `normalizePlace(doc)`
Kakao 검색 결과를 화면용 객체로 정규화

##### `filterPlaces()`
현재 조건으로 `visiblePlaces` 계산
- 카테고리 필터
- 거리 제한
- 정렬 옵션 반영

##### `estimateTravelTime(distance)`
- 도보 / 차량 기준의 단순 예상 시간 표시
- 실제 길찾기 API는 아니고 거리 기반 계산값

##### `readRecentSearches()` / `saveRecentSearch()` / `renderRecentSearches()`
최근 검색어 localStorage 관리

##### `renderDataNote()`
검색 데이터 출처 + 마지막 업데이트 시각 표시

##### `buildSuggestionKeywords()`
결과 없음 상태에서 대체 키워드 추천

##### `renderResults()`
검색 결과 리스트 HTML 생성
현재 결과 카드에는:
- 순번
- 거리
- 도보/차량 예상 시간
- 이름
- 카테고리
- 주소/전화번호
- 즐겨찾기 버튼
- 카카오맵 링크
가 표시됩니다.

##### `renderPagination()`
페이지네이션 렌더링

##### `highlightCard(placeId, shouldScroll)`
리스트와 지도 마커를 서로 연결

##### `renderMapFallback(message)` / `clearMapFallback()`
지도 실패 시 대체 안내 UI 처리

##### `showManualPromptForLowAccuracy(coords)`
- 검색 화면에서 현재 위치 정확도가 낮으면
- 수동 위치 입력 폼 자동 표시

##### `syncAddressBar()`
현재 검색 상태를 URL에 반영
반영되는 값:
- `keyword`
- `lat`, `lon`
- `page`
- `filter`
- `distance`
- `sort`
- `travel`
- `demo`

##### `search(keyword, page)`
검색 페이지 핵심 함수:
1. 상태 갱신
2. 최근 검색 저장
3. Kakao 검색 호출
4. 결과 정규화
5. 필터/정렬 적용
6. 결과/페이지네이션/지도/출처정보 렌더링
7. URL 갱신

##### `bindEvents()`
현재 연결된 이벤트:
- 검색 submit
- 내 주변 버튼
- 카테고리 필터 클릭
- 거리 필터 변경
- 정렬 변경
- 이동수단 변경
- 최근 검색 클릭
- 결과 없음 제안 키워드 클릭
- 페이지네이션 클릭
- 리스트 hover
- 즐겨찾기 토글

즉 `search.js`는
**검색 화면 전용 상태 머신 + UI 컨트롤러** 역할입니다.

왜 검색 로직을 별도 파일로 분리했는가:
- 검색 페이지는 상태가 가장 많고(UI, 필터, 정렬, 페이지네이션, 즐겨찾기, 지도 연동) 복잡도가 높기 때문
- 홈 화면과 완전히 다른 사용자 흐름을 가지기 때문
- 검색 상태를 URL과 동기화해야 해서 독립적인 컨트롤러가 필요했기 때문

---

## 4. 실제 데이터 흐름

### 홈 화면

```text
main.js
 → common.js 위치 유틸 호출
 → weather.js 현재 날씨/예보 요청
 → kakao.js 역지오코딩 요청
 → weather.js 추천 로직 수행
 → main.js가 날씨 카드/예보/추천 카드 렌더링
 → 추천 카드 또는 CTA 클릭 시 search.html 이동
```

### 검색 화면

```text
search.js
 → common.js로 URL 파라미터 읽기
 → kakao.js로 검색 요청
 → normalizePlace()
 → filterPlaces()
 → renderResults()
 → kakao.js가 지도 마커 렌더링
 → favorites.js로 즐겨찾기 저장
 → 최근 검색은 localStorage에 별도 저장
```

### 즐겨찾기 화면

```text
favorites.js
 → localStorage 읽기
 → 목록 렌더링
 → 삭제 / 전체삭제 / 지도이동 처리
```

---

## 5. 페이지별 의존 관계

### `index.html`
로드 순서:
1. `config.js`
2. `common.js`
3. `weather.js`
4. `kakao.js`
5. `main.js`

### `search.html`
로드 순서:
1. `config.js`
2. `common.js`
3. `favorites.js`
4. `kakao.js`
5. `search.js`

### `favorites.html`
로드 순서:
1. `config.js`
2. `common.js`
3. `favorites.js`

중요 포인트:
- 페이지 진입점(`main.js`, `search.js`)은 직접 구현 세부를 갖지 않고
  앞서 로드된 공통 모듈을 사용합니다.
- 그래서 공통 모듈이 반드시 먼저 로드되어야 합니다.

---

## 6. 현재 설계에서 중요한 포인트

### 6-1. 위치 흐름이 강화됨
- 오래된 브라우저 위치 캐시 사용 방지
- 정확도 낮으면 재시도
- 1km 이상 오차면 수동 위치 입력 자동 유도
- 홈과 검색 모두 같은 기준 사용

### 6-2. 홈 → 검색 상태 전달이 강화됨
- 홈의 주변 맛집 탐색 링크들이 고정 URL이 아니라
  **현재 메모리의 최신 좌표 기반**으로 동작합니다.

### 6-3. 검색 UX가 초기 버전보다 강화됨
- 카테고리 필터
- 거리 필터
- 정렬
- 이동수단 기준 시간 표시
- 최근 검색
- 결과 없음 추천 키워드
- 데이터 출처/업데이트 시각 표시

### 6-4. 신뢰도는 “가짜 데이터 표시 금지” 원칙 유지
- 리뷰 수 / 평점 데이터는 현재 Kakao Local 기본 응답에 없기 때문에
  임의 필드를 만들어 표시하지 않습니다.
- 지원 가능한 데이터만 UI에 노출합니다.

### 6-5. fallback을 왜 넣었는가
- 발표/시연 환경에서는 API 키 설정, 도메인 등록, 브라우저 위치 권한, 네트워크 상태 때문에 실패 가능성이 큼
- 그래서 검색 fallback, 지도 fallback UI, 위치 fallback을 둬서
  “서비스 흐름 자체가 완전히 끊기지 않도록” 설계했습니다.

---

## 7. 발표할 때 설명 포인트

발표에서는 아래처럼 설명하면 이해가 쉽습니다.

### 한 줄 요약
- `common.js`는 공통 기반
- `weather.js`, `kakao.js`는 외부 API 계층
- `favorites.js`는 로컬 저장 계층
- `main.js`, `search.js`는 페이지별 컨트롤러

### 핵심 설계 포인트
1. **API 호출과 화면 로직을 분리했다**
   - 날씨, 검색, 역지오코딩은 모듈화
   - 페이지 파일은 상태/렌더링/이벤트에 집중

2. **URL 쿼리로 페이지 간 상태를 넘긴다**
   - 키워드, 좌표, 필터, 정렬 상태 전달 가능

3. **localStorage를 두 군데에 활용한다**
   - 즐겨찾기 저장
   - 최근 검색 저장

4. **발표/시연 안정성을 고려했다**
   - 검색 fallback
   - 지도 fallback UI
   - 위치 fallback

5. **위치 정확도 문제를 UX로 보완했다**
   - 저정밀 위치 감지 시 수동 보정 유도

6. **기술 선택도 과제 조건에 맞춰 단순성을 우선했다**
   - 번들러 없이 정적 파일
   - jQuery + AJAX
   - localStorage 기반 저장

---

## 8. 가장 중요한 함수 5개

### `main.js > loadWeatherByCoords()`
홈 화면 전체를 움직이는 중심 함수

### `search.js > search()`
검색 화면 전체를 움직이는 중심 함수

### `common.js > getCurrentPosition()`
현재 위치 정확도 품질에 직접 영향을 주는 함수

### `kakao.js > searchPlaces()`
맛집 검색 전체의 핵심 API 함수

### `favorites.js > toggleFavorite()`
검색/즐겨찾기 두 화면을 연결하는 핵심 함수

---

## 9. 최종 요약

현재 WeatherEats의 JS 구조는 아래처럼 이해하면 됩니다.

```text
common.js      = 공통 기반 + 위치/유틸/UI
weather.js     = 날씨 API + 날씨 기반 추천
kakao.js       = 맛집 검색 + 역지오코딩 + 지도 + fallback
favorites.js   = localStorage 즐겨찾기
main.js        = 홈 화면 제어
search.js      = 검색 화면 제어
```

즉,
**공통 모듈 + API 모듈 + 저장 모듈 + 페이지 컨트롤러** 구조로 나뉘며,
최근에는 여기에 **위치 정확도 보정, 최근 검색, 데이터 출처 표시, 검색 보조 필터**가 추가된 상태입니다.
