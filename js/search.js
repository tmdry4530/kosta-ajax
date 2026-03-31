'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var state = {
    lat: app.constants.defaultCoords.lat,
    lon: app.constants.defaultCoords.lon,
    keyword: '',
    page: 1,
    filter: 'all',
    sort: 'distance',
    distanceLimit: app.constants.searchRadius,
    travelMode: 'walk',
    places: [],
    visiblePlaces: [],
    meta: null,
    focusPlaceId: '',
    accuracy: null,
    demoMode: false,
    resultsCollapsed: false,
    expandedPlaceId: ''
  };
  var cache = {};

  function cacheElements() {
    cache.$status = $('#search-status');
    cache.$manualLocation = $('#manual-search-location');
    cache.$input = $('#search-input');
    cache.$resultsCount = $('#results-count');
    cache.$resultsList = $('#results-list');
    cache.$pagination = $('#pagination');
    cache.$mapSummary = $('#map-summary');
    cache.$distanceFilter = $('#distance-filter');
    cache.$sortFilter = $('#sort-filter');
    cache.$travelMode = $('#travel-mode');
    cache.$recentSearches = $('#recent-searches');
    cache.$dataNote = $('#search-data-note');
    cache.$resultsPanel = $('.results-panel');
    cache.$resultsPanelBody = $('#results-panel-body');
    cache.$resultsToggle = $('#results-toggle');
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function setResultsCollapsed(isCollapsed) {
    state.resultsCollapsed = Boolean(isCollapsed);
    cache.$resultsPanel.toggleClass('is-collapsed', state.resultsCollapsed);
    cache.$resultsToggle
      .attr('aria-expanded', String(!state.resultsCollapsed))
      .text(state.resultsCollapsed ? '리스트 펼치기' : '리스트 접기');
  }

  function syncExpandedCardState() {
    cache.$resultsList.find('.result-card').each(function(_, element) {
      var $card = $(element);
      var isExpanded = $card.data('place-id') === state.expandedPlaceId;

      $card.toggleClass('is-expanded', isExpanded);
      $card.find('.result-card-toggle').attr('aria-expanded', String(isExpanded));
      $card.find('.result-card-body').prop('hidden', !isExpanded);
      $card.find('.result-card-toggle-text').text(isExpanded ? '접기' : '펼치기');
    });
  }

  function setExpandedPlace(placeId) {
    state.expandedPlaceId = placeId || '';
    syncExpandedCardState();
  }

  function normalizePlace(doc) {
    var categoryParts = (doc.category_name || '').split(' > ');

    return {
      id: 'kakao_' + doc.id,
      placeName: doc.place_name,
      categoryName: doc.category_name || '',
      categoryLabel: categoryParts[categoryParts.length - 1] || '음식점',
      addressName: doc.road_address_name || doc.address_name || '',
      phone: doc.phone || '',
      placeUrl: doc.place_url || '',
      x: Number(doc.x),
      y: Number(doc.y),
      distance: doc.distance || ''
    };
  }

  function filterPlaces() {
    state.visiblePlaces = state.places.filter(function(place) {
      var distanceNumber = Number(place.distance || 0);

      if (place.distance && state.distanceLimit && distanceNumber > state.distanceLimit) {
        return false;
      }

      if (state.filter === 'all') {
        return true;
      }

      return place.categoryName.indexOf(state.filter) !== -1;
    });

    state.visiblePlaces.sort(function(a, b) {
      if (state.sort === 'name') {
        return a.placeName.localeCompare(b.placeName, 'ko');
      }

      if (state.sort === 'category') {
        return a.categoryLabel.localeCompare(b.categoryLabel, 'ko') || a.placeName.localeCompare(b.placeName, 'ko');
      }

      return Number(a.distance || Number.MAX_SAFE_INTEGER) - Number(b.distance || Number.MAX_SAFE_INTEGER);
    });
  }

  function estimateTravelTime(distance) {
    var distanceNumber = Number(distance || 0);
    var speed = state.travelMode === 'car' ? 400 : 70;

    if (!distanceNumber) {
      return '예상 시간 없음';
    }

    return Math.max(1, Math.round(distanceNumber / speed)) + '분';
  }

  function readRecentSearches() {
    var stored = window.localStorage.getItem(app.constants.recentSearchStorageKey);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) || [];
    } catch (error) {
      return [];
    }
  }

  function saveRecentSearch(keyword) {
    var trimmed = $.trim(keyword);
    var recent = readRecentSearches().filter(function(item) {
      return item !== trimmed;
    });

    if (!trimmed) {
      return;
    }

    recent.unshift(trimmed);
    window.localStorage.setItem(app.constants.recentSearchStorageKey, JSON.stringify(recent.slice(0, app.constants.maxRecentSearches)));
  }

  function renderRecentSearches() {
    var recent = readRecentSearches();

    if (!recent.length) {
      cache.$recentSearches.empty();
      return;
    }

    cache.$recentSearches.html([
      '<p class="search-select-label">최근 검색</p>',
      '<div class="recent-search-list">',
      recent.map(function(item) {
        return '<button class="recent-search-chip" type="button" data-keyword="' + app.utils.escapeHtml(item) + '">' + app.utils.escapeHtml(item) + '</button>';
      }).join(''),
      '</div>'
    ].join(''));
  }

  function syncAddressBar() {
    app.utils.updateAddressBar({
      keyword: state.keyword,
      lat: state.lat,
      lon: state.lon,
      page: state.page,
      filter: state.filter === 'all' ? '' : state.filter,
      distance: state.distanceLimit === app.constants.searchRadius ? '' : state.distanceLimit,
      sort: state.sort === 'distance' ? '' : state.sort,
      travel: state.travelMode === 'walk' ? '' : state.travelMode,
      placeId: '',
      demo: state.demoMode ? '1' : ''
    });
  }

  function renderDataNote() {
    var now = new Date();
    var timeLabel = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    cache.$dataNote.text('Kakao Local API 기준 · 마지막 업데이트 ' + timeLabel);
  }

  function buildSuggestionKeywords() {
    var suggestions = ['한식 맛집', '분식', '브런치 카페', '카페', '국밥', '초밥'];

    if (/비|파전|막걸리/.test(state.keyword)) {
      suggestions = ['파전 맛집', '해물탕', '막걸리', '칼국수'];
    } else if (/추움|국밥|찌개|샤브/.test(state.keyword)) {
      suggestions = ['국밥', '찌개 맛집', '샤브샤브', '라멘'];
    } else if (/더움|냉면|빙수|아이스크림/.test(state.keyword)) {
      suggestions = ['냉면', '빙수', '초밥', '샐러드'];
    }

    return suggestions.filter(function(item, index, array) {
      return array.indexOf(item) === index && item !== state.keyword;
    }).slice(0, 4);
  }

  function renderResults() {
    cache.$resultsList.empty();

    if (!state.visiblePlaces.length) {
      state.expandedPlaceId = '';
      var suggestions = buildSuggestionKeywords();
      var suggestionsHtml = suggestions.length
        ? '<div class="empty-suggestion-list">' + suggestions.map(function(keyword) {
          return '<button class="recent-search-chip" type="button" data-keyword="' + app.utils.escapeHtml(keyword) + '">' + app.utils.escapeHtml(keyword) + '</button>';
        }).join('') + '</div>'
        : '';

      cache.$resultsList.html('<div class="empty-state is-visible"><h3>주변에 찾는 맛집이 없어요.</h3><p>다른 거리나 카테고리로 다시 검색해보세요.</p>' + suggestionsHtml + '</div>');
      cache.$resultsCount.text('조건에 맞는 결과가 없어요.');
      app.kakao.renderMarkers([]);
      return;
    }

    if (state.expandedPlaceId) {
      var hasExpandedPlace = state.visiblePlaces.some(function(place) {
        return place.id === state.expandedPlaceId;
      });

      if (!hasExpandedPlace) {
        state.expandedPlaceId = '';
      }
    }

    if (!state.expandedPlaceId && !isMobileViewport()) {
      state.expandedPlaceId = state.visiblePlaces[0].id;
    }

    var html = state.visiblePlaces.map(function(place, index) {
      var favoriteLabel = app.favorites.renderFavoriteButtonLabel(place.id);
      var isExpanded = place.id === state.expandedPlaceId;

      return [
        '<article class="result-card ' + (isExpanded ? 'is-expanded' : '') + '" data-place-id="' + app.utils.escapeHtml(place.id) + '">',
        '  <button class="result-card-toggle" type="button" aria-expanded="' + String(isExpanded) + '">',
        '    <div class="result-card-header">',
        '      <div class="result-card-primary">',
        '        <div class="result-card-topline">',
        '          <span class="result-rank">No. ' + (index + 1) + '</span>',
        '          <span class="result-distance">' + app.utils.escapeHtml(place.distance ? place.distance + 'm' : '거리정보 없음') + '</span>',
        place.distance ? '          <span class="result-distance result-distance-alt">' + app.utils.escapeHtml((state.travelMode === 'car' ? '차량 ' : '도보 ') + estimateTravelTime(place.distance)) + '</span>' : '',
        '        </div>',
        '        <div class="result-card-title">' + app.utils.escapeHtml(place.placeName) + '</div>',
        '        <p class="result-card-subtitle">' + app.utils.escapeHtml(place.categoryName || '카테고리 정보 없음') + '</p>',
        '      </div>',
        '      <span class="result-card-toggle-text">' + (isExpanded ? '접기' : '펼치기') + '</span>',
        '    </div>',
        '  </button>',
        '  <div class="result-card-body" ' + (isExpanded ? '' : 'hidden') + '>',
        '    <div class="result-card-chips">',
        '      <span class="result-chip">' + app.utils.escapeHtml(place.categoryLabel) + '</span>',
        '      <span class="result-chip result-chip-location">내 주변 3km</span>',
        '    </div>',
        '    <div class="result-card-meta">',
        '      <p class="result-card-address">📍 ' + app.utils.escapeHtml(place.addressName || '주소 정보 없음') + '</p>',
        place.phone ? '      <p class="result-card-phone">☎ ' + app.utils.escapeHtml(place.phone) + '</p>' : '',
        '    </div>',
        '    <div class="result-card-actions">',
        '      <button class="button button-secondary favorite-toggle" type="button">' + app.utils.escapeHtml(favoriteLabel) + '</button>',
        '      <a class="button button-ghost" href="' + app.utils.escapeHtml(place.placeUrl) + '" target="_blank" rel="noreferrer">카카오맵 링크</a>',
        '    </div>',
        '  </div>',
        '</article>'
      ].join('');
    }).join('');

    cache.$resultsList.html(html);
    syncExpandedCardState();
    cache.$resultsCount.text('총 ' + state.places.length + '개 중 ' + state.visiblePlaces.length + '개를 표시하고 있어요.');

    app.kakao.renderMarkers(state.visiblePlaces, {
      onMarkerClick: function(place) {
        highlightCard(place.id, true);
      }
    });

    if (state.focusPlaceId) {
      highlightCard(state.focusPlaceId, true);
      state.focusPlaceId = '';
    }
  }

  function renderPagination() {
    cache.$pagination.empty();

    if (!state.meta) {
      return;
    }

    var totalPages = Math.max(1, Math.ceil(Math.min(state.meta.pageable_count || 0, 45) / app.constants.pageSize));
    var start = Math.max(1, state.page - 2);
    var end = Math.min(totalPages, state.page + 2);
    var buttons = [];

    if (state.page > 1) {
      buttons.push('<button class="page-button" type="button" data-page="' + (state.page - 1) + '">이전</button>');
    }

    for (var page = start; page <= end; page += 1) {
      buttons.push('<button class="page-button ' + (page === state.page ? 'is-active' : '') + '" type="button" data-page="' + page + '">' + page + '</button>');
    }

    if (state.page < totalPages && !state.meta.is_end) {
      buttons.push('<button class="page-button" type="button" data-page="' + (state.page + 1) + '">다음</button>');
    }

    cache.$pagination.html(buttons.join(''));
  }

  function highlightCard(placeId, shouldScroll) {
    if (shouldScroll && state.resultsCollapsed) {
      setResultsCollapsed(false);
    }

    if (shouldScroll) {
      setExpandedPlace(placeId);
    }

    cache.$resultsList.find('.result-card').removeClass('is-highlighted');
    cache.$resultsList.find('[data-place-id="' + placeId + '"]').addClass('is-highlighted');
    app.kakao.focusMarker(placeId);
    app.kakao.openInfoWindow(placeId);

    if (shouldScroll) {
      var target = cache.$resultsList.find('[data-place-id="' + placeId + '"]').get(0);
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  function renderInitialEmpty() {
    cache.$resultsList.html('<div class="empty-state is-visible"><h3>검색어를 입력해보세요.</h3><p>예: 국밥, 파전, 초밥, 브런치</p></div>');
    cache.$resultsCount.text('검색 전이에요. 추천 메뉴를 누르거나 직접 검색해보세요.');
    cache.$dataNote.text('Kakao Local API 기준 · 검색 전');
  }

  function renderMapFallback(message) {
    $('#map')
      .addClass('map-canvas-fallback')
      .html('<div class="map-empty-state"><h3>지도를 준비하지 못했어요.</h3><p>' + app.utils.escapeHtml(message || '카카오 지도 설정을 확인한 뒤 다시 시도해주세요.') + '</p></div>');
  }

  function clearMapFallback() {
    $('#map').removeClass('map-canvas-fallback').empty();
  }

  function showManualPromptForLowAccuracy(coords) {
    if (!app.utils.shouldPromptManualLocation(coords.accuracy)) {
      app.ui.hideManualLocationForm(cache.$manualLocation);
      return;
    }

    app.ui.showBanner(cache.$status, 'info', '현재 위치 정확도가 약 ' + app.utils.formatDistance(coords.accuracy) + '예요. 동네가 다르면 직접 수정해보세요.');
    app.ui.renderManualLocationForm(cache.$manualLocation, {
      title: '위치 오차가 커서 직접 보정할 수 있어요.',
      description: '현재 좌표를 기준으로 검색했지만 오차가 클 수 있어요. 원하는 위치로 바로 수정할 수 있어요.',
      lat: coords.lat,
      lon: coords.lon,
      submitText: '이 위치로 다시 검색',
      onSubmit: function(nextCoords) {
        state.lat = nextCoords.lat;
        state.lon = nextCoords.lon;
        state.accuracy = null;
        app.kakao.setCenter(state.lat, state.lon);
        search($.trim(cache.$input.val()) || state.keyword || '맛집', 1);
      }
    });
  }

  function search(keyword, page) {
    state.keyword = keyword;
    state.page = page || 1;
    saveRecentSearch(state.keyword);
    renderRecentSearches();

    app.ui.showBanner(cache.$status, 'info', '맛집을 찾고 있어요.');
    cache.$resultsList.html('<div class="skeleton-block" style="height: 220px;"></div>');

    app.kakao.searchPlaces(state.keyword, state.lat, state.lon, state.page, app.constants.pageSize, { forceFallback: state.demoMode })
      .done(function(response) {
        state.meta = response.meta || null;
        state.places = $.map(response.documents || [], normalizePlace);
        filterPlaces();
        renderResults();
        renderPagination();
        renderDataNote();
        cache.$mapSummary.text('“' + state.keyword + '” 키워드로 내 주변 ' + app.utils.formatDistance(state.distanceLimit) + '를 검색했어요.');
        syncAddressBar();
        if (state.meta && state.meta.fallback) {
          if (state.meta.fallback_reason === 'manual-demo') {
            app.ui.showBanner(cache.$status, 'info', '스크린샷/발표용 데모 모드 결과를 보여주고 있어요.');
            cache.$mapSummary.text('데모 모드로 “' + state.keyword + '” 결과를 보여주고 있어요.');
          } else {
            app.ui.showBanner(cache.$status, 'info', '카카오 서비스 설정이 비활성화되어 데모 맛집 데이터를 보여주고 있어요.');
            cache.$mapSummary.text('카카오 서비스가 비활성화되어 “' + state.keyword + '” 데모 결과를 보여주고 있어요.');
          }
        } else {
          app.ui.showBanner(cache.$status, 'success', '검색 결과를 불러왔어요.');
        }
      })
      .fail(function(error) {
        var message = app.utils.buildApiErrorMessage('kakao', error, '검색 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
        app.ui.showBanner(cache.$status, 'error', message);

        state.places = [];
        state.visiblePlaces = [];
        renderResults();
        renderPagination();
      });
  }

  function bindEvents() {
    $('#search-form').on('submit', function(event) {
      event.preventDefault();
      var keyword = $.trim(cache.$input.val()) || '맛집';
      state.filter = 'all';
      $('.filter-chip').removeClass('is-active').filter('[data-filter="all"]').addClass('is-active');
      search(keyword, 1);
    });

    $('#nearby-button').on('click', function() {
      app.utils.getCurrentPosition()
        .done(function(coords) {
          state.lat = coords.lat;
          state.lon = coords.lon;
          state.accuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : null;
          app.kakao.setCenter(state.lat, state.lon);

          if (coords.warning) {
            app.ui.showBanner(cache.$status, 'info', coords.warning + ' 그래도 현재 위치 기준으로 다시 검색해볼게요.');
          }

          showManualPromptForLowAccuracy(coords);

          search($.trim(cache.$input.val()) || state.keyword || '맛집', 1);
        })
        .fail(function(error) {
          app.ui.showBanner(cache.$status, 'info', error.message + ' 수동 위치 입력도 가능해요.');
          app.ui.renderManualLocationForm(cache.$manualLocation, {
            title: '검색 기준 위치를 직접 입력하기',
            description: '내 주변 검색이 안 될 때 원하는 지역의 위도/경도를 입력할 수 있어요.',
            lat: state.lat,
            lon: state.lon,
            onSubmit: function(coords) {
              state.lat = coords.lat;
              state.lon = coords.lon;
              state.accuracy = null;
              app.kakao.setCenter(state.lat, state.lon);
              search($.trim(cache.$input.val()) || state.keyword || '맛집', 1);
            }
          });
        });
    });

    $('.filter-group').on('click', '.filter-chip', function(event) {
      state.filter = $(event.currentTarget).data('filter');
      $('.filter-chip').removeClass('is-active');
      $(event.currentTarget).addClass('is-active');
      filterPlaces();
      renderResults();
      syncAddressBar();
    });

    cache.$distanceFilter.on('change', function() {
      state.distanceLimit = Number($(this).val()) || app.constants.searchRadius;
      filterPlaces();
      renderResults();
      renderPagination();
      syncAddressBar();
    });

    cache.$sortFilter.on('change', function() {
      state.sort = $(this).val() || 'distance';
      filterPlaces();
      renderResults();
      syncAddressBar();
    });

    cache.$travelMode.on('change', function() {
      state.travelMode = $(this).val() || 'walk';
      renderResults();
      syncAddressBar();
    });

    cache.$resultsToggle.on('click', function() {
      setResultsCollapsed(!state.resultsCollapsed);
    });

    cache.$recentSearches.on('click', '[data-keyword]', function(event) {
      var keyword = $(event.currentTarget).data('keyword');
      cache.$input.val(keyword);
      search(keyword, 1);
    });

    cache.$resultsList.on('click', '[data-keyword]', function(event) {
      var keyword = $(event.currentTarget).data('keyword');
      cache.$input.val(keyword);
      search(keyword, 1);
    });

    cache.$pagination.on('click', '.page-button', function(event) {
      var nextPage = Number($(event.currentTarget).data('page'));
      if (!nextPage || nextPage === state.page) {
        return;
      }

      search(state.keyword || '맛집', nextPage);
    });

    cache.$resultsList.on('mouseenter', '.result-card', function(event) {
      highlightCard($(event.currentTarget).data('place-id'), false);
    });

    cache.$resultsList.on('click', '.result-card-toggle', function(event) {
      var placeId = $(event.currentTarget).closest('.result-card').data('place-id');
      var nextExpandedId = state.expandedPlaceId === placeId ? '' : placeId;

      setExpandedPlace(nextExpandedId);
      highlightCard(placeId, false);
    });

    cache.$resultsList.on('click', '.favorite-toggle', function(event) {
      var $card = $(event.currentTarget).closest('.result-card');
      var placeId = $card.data('place-id');
      var place = state.places.find(function(item) {
        return item.id === placeId;
      });

      if (!place) {
        return;
      }

      var isSaved = app.favorites.toggleFavorite(place);
      $(event.currentTarget).text(isSaved ? '♥ 저장됨' : '♡ 즐겨찾기');
      app.ui.showBanner(cache.$status, isSaved ? 'success' : 'info', isSaved ? '즐겨찾기에 저장했어요.' : '즐겨찾기에서 삭제했어요.');
    });
  }

  $(function() {
    if ($('body').data('page') !== 'search') {
      return;
    }

    var params = app.utils.getQueryParams();
    cacheElements();
    bindEvents();

    state.lat = app.utils.normalizeCoordinate(params.lat) || app.constants.defaultCoords.lat;
    state.lon = app.utils.normalizeCoordinate(params.lon) || app.constants.defaultCoords.lon;
    state.keyword = params.keyword || '';
    state.page = Number(params.page || 1) || 1;
    state.filter = params.filter || 'all';
    state.sort = params.sort || 'distance';
    state.distanceLimit = Number(params.distance || app.constants.searchRadius) || app.constants.searchRadius;
    state.travelMode = params.travel || 'walk';
    state.focusPlaceId = params.placeId || '';
    state.demoMode = params.demo === '1';

    cache.$input.val(state.keyword);
    $('.filter-chip').removeClass('is-active').filter('[data-filter="' + state.filter + '"]').addClass('is-active');
    cache.$distanceFilter.val(String(state.distanceLimit));
    cache.$sortFilter.val(state.sort);
    cache.$travelMode.val(state.travelMode);
    renderRecentSearches();
    setResultsCollapsed(isMobileViewport());

    app.kakao.loadSdk()
      .done(function() {
        clearMapFallback();

        if (!app.kakao.createMap('map', state.lat, state.lon)) {
          renderMapFallback('지도 초기화에 실패했어요. 카카오 JavaScript 키와 등록 도메인을 확인해주세요.');
          cache.$mapSummary.text('지도를 초기화하지 못했어요. 검색 기능은 계속 사용할 수 있어요.');

          if (state.keyword) {
            search(state.keyword, state.page);
            return;
          }

          renderInitialEmpty();
          app.ui.showBanner(cache.$status, 'info', '지도는 없지만 검색 결과 리스트는 계속 확인할 수 있어요.');
          return;
        }

        cache.$mapSummary.text(state.demoMode ? '데모 모드 지도를 준비했어요.' : '기본 위치로 지도를 준비했어요.');

        if (state.keyword) {
          search(state.keyword, state.page);
          return;
        }

        renderInitialEmpty();
        app.ui.showBanner(cache.$status, 'info', '추천 카드 또는 직접 검색으로 맛집을 찾아보세요.');
      })
      .fail(function(error) {
        renderMapFallback(error && error.message ? error.message : '지도 기능을 불러오지 못했어요.');
        app.ui.showBanner(cache.$status, 'error', (error && error.message ? error.message : '지도 기능을 불러오지 못했어요.') + ' 검색도 앱 설정에 따라 함께 실패할 수 있어요.');
        cache.$mapSummary.text('지도를 불러오지 못했어요. 검색 기능은 계속 시도할 수 있어요.');

        if (state.keyword) {
          search(state.keyword, state.page);
          return;
        }

        renderInitialEmpty();
      });
  });
})(window, window.jQuery);
