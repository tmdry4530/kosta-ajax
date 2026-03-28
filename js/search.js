'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var state = {
    lat: app.constants.defaultCoords.lat,
    lon: app.constants.defaultCoords.lon,
    keyword: '',
    page: 1,
    filter: 'all',
    places: [],
    visiblePlaces: [],
    meta: null,
    focusPlaceId: ''
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
      if (state.filter === 'all') {
        return true;
      }

      return place.categoryName.indexOf(state.filter) !== -1;
    });
  }

  function renderResults() {
    cache.$resultsList.empty();

    if (!state.visiblePlaces.length) {
      cache.$resultsList.html('<div class="empty-state is-visible"><h3>주변에 찾는 맛집이 없어요.</h3><p>다른 키워드나 카테고리로 다시 검색해보세요.</p></div>');
      cache.$resultsCount.text('조건에 맞는 결과가 없어요.');
      app.kakao.renderMarkers([]);
      return;
    }

    var html = state.visiblePlaces.map(function(place, index) {
      var favoriteLabel = app.favorites.renderFavoriteButtonLabel(place.id);

      return [
        '<article class="result-card" data-place-id="' + app.utils.escapeHtml(place.id) + '">',
        '  <div class="result-card-header">',
        '    <div>',
        '      <div class="result-card-title">' + (index + 1) + '. ' + app.utils.escapeHtml(place.placeName) + '</div>',
        '      <p class="result-card-subtitle">' + app.utils.escapeHtml(place.categoryName || '카테고리 정보 없음') + '</p>',
        '    </div>',
        '    <span class="result-badge">' + app.utils.escapeHtml(place.distance ? place.distance + 'm' : place.categoryLabel) + '</span>',
        '  </div>',
        '  <div class="result-card-meta">',
        '    <p>📍 ' + app.utils.escapeHtml(place.addressName || '주소 정보 없음') + '</p>',
        '    <p>☎ ' + app.utils.escapeHtml(place.phone || '전화번호 없음') + '</p>',
        '  </div>',
        '  <div class="result-card-actions">',
        '    <button class="button button-secondary favorite-toggle" type="button">' + app.utils.escapeHtml(favoriteLabel) + '</button>',
        '    <a class="button button-ghost" href="' + app.utils.escapeHtml(place.placeUrl) + '" target="_blank" rel="noreferrer">카카오맵 링크</a>',
        '  </div>',
        '</article>'
      ].join('');
    }).join('');

    cache.$resultsList.html(html);
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
  }

  function search(keyword, page) {
    state.keyword = keyword;
    state.page = page || 1;

    app.ui.showBanner(cache.$status, 'info', '맛집을 찾고 있어요.');
    cache.$resultsList.html('<div class="skeleton-block" style="height: 220px;"></div>');

    app.kakao.searchPlaces(state.keyword, state.lat, state.lon, state.page, app.constants.pageSize)
      .done(function(response) {
        state.meta = response.meta || null;
        state.places = $.map(response.documents || [], normalizePlace);
        filterPlaces();
        renderResults();
        renderPagination();
        cache.$mapSummary.text('"' + state.keyword + '" 키워드로 내 주변 3km를 검색했어요.');
        app.utils.updateAddressBar({
          keyword: state.keyword,
          lat: state.lat,
          lon: state.lon,
          page: state.page,
          filter: state.filter === 'all' ? '' : state.filter,
          placeId: ''
        });
        app.ui.showBanner(cache.$status, 'success', '검색 결과를 불러왔어요.');
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
          app.kakao.setCenter(state.lat, state.lon);
          app.ui.hideManualLocationForm(cache.$manualLocation);
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
      app.utils.updateAddressBar({
        keyword: state.keyword,
        lat: state.lat,
        lon: state.lon,
        page: state.page,
        filter: state.filter === 'all' ? '' : state.filter,
        placeId: ''
      });
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
    state.focusPlaceId = params.placeId || '';

    cache.$input.val(state.keyword);
    $('.filter-chip').removeClass('is-active').filter('[data-filter="' + state.filter + '"]').addClass('is-active');

    app.kakao.loadSdk()
      .done(function() {
        app.kakao.createMap('map', state.lat, state.lon);
        cache.$mapSummary.text('기본 위치로 지도를 준비했어요.');

        if (state.keyword) {
          search(state.keyword, state.page);
          return;
        }

        renderInitialEmpty();
        app.ui.showBanner(cache.$status, 'info', '추천 카드 또는 직접 검색으로 맛집을 찾아보세요.');
      })
      .fail(function(error) {
        app.ui.showBanner(cache.$status, 'error', (error && error.message ? error.message : '지도 기능을 불러오지 못했어요.') + ' 리스트 검색은 계속 사용할 수 있어요.');
        cache.$mapSummary.text('지도를 불러오지 못했지만 리스트 검색은 가능해요.');

        if (state.keyword) {
          search(state.keyword, state.page);
          return;
        }

        renderInitialEmpty();
      });
  });
})(window, window.jQuery);
