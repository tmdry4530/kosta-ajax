# WeatherEats

> 날씨 기반 메뉴 추천 + 주변 맛집 탐색 웹 애플리케이션

오늘 날씨에 어울리는 메뉴를 추천하고, 추천 메뉴로 주변 맛집을 지도와 함께 바로 검색할 수 있는 jQuery + AJAX 웹 서비스입니다.

## 배포 주소

- **GitHub Pages**: https://tmdry4530.github.io/kosta-ajax/
- 검색 페이지 예시: https://tmdry4530.github.io/kosta-ajax/search.html?keyword=%EB%A7%9B%EC%A7%91

## 기획 의도

"오늘 뭐 먹지?"는 누구나 매일 하는 고민입니다. 기존 맛집 검색 서비스에 **날씨라는 맥락**을 더해, 비 오는 날엔 파전, 더운 날엔 냉면처럼 날씨와 자연스럽게 연결되는 메뉴를 먼저 제안하고, 클릭 한 번으로 주변 맛집까지 탐색할 수 있도록 설계했습니다.

## 핵심 기능

### 메인 페이지
- 현재 위치 기반 날씨 조회 (기온, 습도, 풍속, 날씨 상태)
- 날씨 조건별 메뉴 추천 (3개) + 주변 맛집 개수 실시간 표시
- 5일 예보 미리보기

### 검색 페이지
- 키워드 검색 + 내 주변 3km 검색
- 카카오맵 마커와 리스트 양방향 연동 (마커 클릭 -> 리스트 스크롤, 리스트 호버 -> 마커 하이라이트)
- 카테고리 필터 (한식/중식/일식/양식/카페) + 정렬 (거리순/이름순/카테고리순)
- 즐겨찾기 저장 + 페이지네이션 + 최근 검색어

### 즐겨찾기 페이지
- 저장 목록 조회 (저장 날짜순 정렬)
- 개별 삭제 / 전체 삭제 (confirm 확인)
- 카카오맵 상세 페이지 바로가기

## 기술 스택

| 구분 | 기술 |
|------|------|
| 마크업 | HTML5 |
| 스타일 | CSS3 (반응형) |
| 스크립트 | JavaScript ES6, jQuery 3.7 |
| 비동기 통신 | AJAX (`$.ajax()`, `$.when()`) |
| 지도 | Kakao Maps SDK |
| 저장소 | localStorage |
| 배포 | GitHub Pages + GitHub Actions |

## 데이터 소스

| API | 용도 | 엔드포인트 |
|-----|------|-----------|
| **OpenWeatherMap** | 현재 날씨 조회 | `/data/2.5/weather` |
| **OpenWeatherMap** | 5일 예보 조회 | `/data/2.5/forecast` |
| **Kakao Local** | 키워드 장소 검색 | `/v2/local/search/keyword` |
| **Kakao Local** | 좌표 -> 지역명 변환 (역지오코딩) | `/v2/local/geo/coord2regioncode` |
| **Kakao Maps SDK** | 지도 렌더링, 마커, 인포윈도우 | JavaScript SDK |
| **localStorage** | 즐겨찾기, 최근 검색어 저장 | 브라우저 내장 |

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                     브라우저                          │
├──────────┬──────────┬───────────┬───────────────────┤
│index.html│search.html│favorites.html│  404.html      │
├──────────┴──────────┴───────────┴───────────────────┤
│                    JS 모듈 구조                       │
│                                                      │
│  common.js   공통 유틸, 상수, UI 헬퍼                  │
│  weather.js  날씨 API 호출 + 메뉴 추천 로직             │
│  kakao.js    지도/검색 API 호출 + 마커 관리             │
│  favorites.js  즐겨찾기 CRUD (localStorage)           │
│  main.js     메인 페이지 컨트롤러                      │
│  search.js   검색 페이지 컨트롤러                      │
│  config.js   API 키 설정 (빌드 시 주입)                │
│                                                      │
├──────────────────────────────────────────────────────┤
│              AJAX ($.ajax / $.when)                   │
├────────────────────┬─────────────────────────────────┤
│  OpenWeatherMap API │        Kakao API               │
│  - 현재 날씨        │  - Local (키워드 검색)           │
│  - 5일 예보         │  - Local (역지오코딩)            │
│                    │  - Maps SDK (지도/마커)           │
└────────────────────┴─────────────────────────────────┘
```

**데이터 흐름**
1. 사용자 접속 -> `navigator.geolocation`으로 위치 획득 (실패 시 기본 좌표 fallback)
2. `$.when()`으로 날씨 + 예보 + 역지오코딩 3개 API 병렬 호출
3. 응답 데이터 정규화 -> 날씨 카드, 추천 메뉴, 예보 렌더링
4. 추천 카드 클릭 -> 검색 페이지로 키워드/좌표 전달 (URL 파라미터)
5. Kakao Local 검색 -> 결과 리스트 + 지도 마커 동기화
6. 즐겨찾기 토글 -> localStorage 저장/삭제

## 핵심 구현 포인트

### 1. `$.when()` 기반 AJAX 병렬 처리

메인 페이지 진입 시 3개의 독립적인 API를 `$.when()`으로 동시에 호출한다. 세 요청이 모두 resolve된 후에만 `.done()` 콜백이 실행되어 화면을 한 번에 렌더링하므로, 순차 호출 대비 latency를 1/3 수준으로 줄인다.

```js
// main.js — loadWeatherByCoords()
$.when(
  app.weather.fetchCurrentWeather(lat, lon),   // OpenWeatherMap /weather
  app.weather.fetchForecast(lat, lon),          // OpenWeatherMap /forecast
  resolveLocationDetails(lat, lon)              // Kakao 역지오코딩
).done(function(currentResponse, forecastResponse, locationDetails) {
  var weather = app.weather.normalizeCurrentWeather(currentResponse[0]);
  var forecast = app.weather.extractForecastDays(forecastResponse[0]);
  // 세 응답을 조합하여 날씨 카드 + 추천 메뉴 + 예보를 동시에 렌더링
}).fail(function(error) {
  // 하나라도 실패하면 에러 배너 표시
});
```

세 번째 `resolveLocationDetails()`는 내부에서 실패해도 `null`로 resolve하도록 래핑하여, Kakao 역지오코딩 장애가 전체 렌더링을 막지 않도록 설계했다.

### 2. 역지오코딩 (좌표 → 지역명 변환)

`navigator.geolocation`으로 받은 위도/경도를 Kakao Local `coord2regioncode` API에 AJAX 요청하여 사람이 읽을 수 있는 지역명으로 변환한다. 응답에 행정동(`H`)과 법정동(`B`) 두 종류가 포함되는데, `selectRegionDocument()`에서 행정동을 우선 선택한다.

```js
// kakao.js — reverseGeocodeRegion()
$.ajax({
  url: 'https://dapi.kakao.com/v2/local/geo/coord2regioncode.json',
  headers: { Authorization: 'KakaoAK ' + window.CONFIG.KAKAO_REST_KEY },
  data: { x: lon, y: lat, input_coord: 'WGS84' }
}).done(function(response) {
  var region = selectRegionDocument(response.documents); // H 타입 우선 선택
  // region.address_name → "경기도 안양시 동안구 평촌동"
});
```

### 3. 키워드 기반 장소 검색 (지오코딩 + 반경 검색)

검색 페이지에서 사용자가 입력한 키워드를 Kakao Local `search/keyword` API에 전송한다. 이때 좌표(`x`, `y`)와 반경(`radius: 3000`)을 함께 전달하여 **내 위치 기준 3km 이내**의 음식점(`category_group_code: 'FD6'`)만 필터링한다.

```js
// kakao.js — searchPlaces()
$.ajax({
  url: 'https://dapi.kakao.com/v2/local/search/keyword.json',
  headers: { Authorization: 'KakaoAK ' + window.CONFIG.KAKAO_REST_KEY },
  data: {
    query: keyword,
    x: lon, y: lat,
    radius: 3000,
    category_group_code: 'FD6',
    sort: 'distance',
    page: page,
    size: 10
  }
});
```

API 응답의 `meta.pageable_count`와 `meta.is_end`를 활용하여 클라이언트 사이드 페이지네이션을 구현했다.

### 4. Geolocation API 2단계 위치 획득

`navigator.geolocation.getCurrentPosition()`을 2단계로 호출한다.
1차 시도(timeout 12초)에서 정확도가 1,200m 이상이면 자동으로 2차 시도(timeout 20초)를 수행하여 더 정밀한 좌표를 확보한다. 2차도 실패하면 1차 결과를 warning과 함께 반환한다.

```js
// common.js — getCurrentPosition()
readPosition({ enableHighAccuracy: true, timeout: 12000 })
  .done(function(position) {
    if (position.accuracy <= 1200) {
      deferred.resolve(position);  // 정확도 충분 → 바로 사용
      return;
    }
    // 정확도 부족 → 2차 시도 (timeout 늘려서 재시도)
    readPosition({ enableHighAccuracy: true, timeout: 20000 })
      .done(function(retried) { deferred.resolve(retried); })
      .fail(function() {
        deferred.resolve($.extend({}, position, {
          warning: '위치 정확도가 다소 낮아요.'
        }));
      });
  });
```

정확도가 1,000m 이상이면 `shouldPromptManualLocation()`이 `true`를 반환하여 수동 위도/경도 입력 폼을 표시한다.

### 5. 지도-리스트 양방향 연동

Kakao Maps SDK의 `Marker`, `InfoWindow`, 이벤트 리스너를 활용하여 지도와 리스트 간 양방향 인터랙션을 구현했다.

```js
// 마커 클릭 → 리스트 카드 스크롤 + 하이라이트
kakao.maps.event.addListener(marker, 'click', function() {
  mapModule.openInfoWindow(place.id);     // 인포윈도우 표시
  activateMarker(place.id);               // 마커 zIndex 올림
  callbacks.onMarkerClick(place);          // → highlightCard() 호출
});

// 리스트 카드 hover → 마커 포커스
cache.$resultsList.on('mouseenter', '.result-card', function(event) {
  highlightCard($(event.currentTarget).data('place-id'), false);
});
```

`highlightCard()`는 CSS 클래스 토글(`.is-highlighted`), `scrollIntoView()`, 마커 zIndex 변경, 인포윈도우 열기를 한 함수에서 처리한다.

### 6. localStorage 안전 저장 (Graceful Degradation)

즐겨찾기 저장 시 `localStorage.setItem()`이 `QuotaExceededError`로 실패하면, 가장 오래된 항목을 하나씩 `pop()`하며 재시도하는 while 루프를 돌린다.

```js
// favorites.js — writeFavorites()
function writeFavorites(items) {
  var nextItems = items.slice();
  while (true) {
    try {
      window.localStorage.setItem(key, JSON.stringify(nextItems));
      return nextItems;
    } catch (error) {
      if (!nextItems.length) throw error;  // 빈 배열인데도 실패 → 복구 불가
      nextItems.pop();                      // 가장 오래된 항목 제거 후 재시도
    }
  }
}
```

### 7. Kakao Maps SDK 동적 로딩

검색 페이지 진입 시 `<script>` 태그를 동적으로 생성하여 Kakao Maps SDK를 비동기 로드한다. `autoload=false` 옵션으로 SDK 로드 후 `kakao.maps.load()` 콜백에서 초기화를 제어하며, jQuery Deferred로 래핑하여 `loadSdk().done()`으로 후속 로직을 체이닝한다.

```js
// kakao.js — loadSdk()
var script = document.createElement('script');
script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + CONFIG.KAKAO_JS_KEY + '&libraries=services';
script.async = true;
script.onload = function() {
  window.kakao.maps.load(function() {  // SDK 내부 초기화 완료 후
    deferred.resolve(window.kakao);
  });
};
document.head.appendChild(script);
```

중복 로딩 방지를 위해 `sdkPromise`를 캐싱하고, 이미 로드된 경우 즉시 resolve한다.

