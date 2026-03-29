'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var favoritesModule = app.favorites || {};

  function readFavorites() {
    var stored = window.localStorage.getItem(app.constants.favoriteStorageKey);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) || [];
    } catch (error) {
      return [];
    }
  }

  function writeFavorites(items) {
    var nextItems = items.slice();

    while (true) {
      try {
        window.localStorage.setItem(app.constants.favoriteStorageKey, JSON.stringify(nextItems));
        return nextItems;
      } catch (error) {
        if (!nextItems.length) {
          throw error;
        }

        nextItems.pop();
      }
    }
  }

  function normalizeFavorite(place) {
    return {
      id: place.id,
      place_name: place.placeName,
      category_name: place.categoryName,
      address_name: place.addressName,
      phone: place.phone,
      place_url: place.placeUrl,
      x: String(place.x),
      y: String(place.y),
      saved_at: place.savedAt || new Date().toISOString()
    };
  }

  favoritesModule.getFavorites = function() {
    return readFavorites().sort(function(a, b) {
      return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
    });
  };

  favoritesModule.isFavorite = function(id) {
    return favoritesModule.getFavorites().some(function(item) {
      return item.id === id;
    });
  };

  favoritesModule.saveFavorite = function(place) {
    var favorites = favoritesModule.getFavorites();
    var normalized = normalizeFavorite(place);
    var existingIndex = favorites.findIndex(function(item) {
      return item.id === normalized.id;
    });

    if (existingIndex !== -1) {
      favorites.splice(existingIndex, 1);
    }

    favorites.unshift(normalized);

    if (favorites.length > app.constants.maxFavorites) {
      favorites = favorites.slice(0, app.constants.maxFavorites);
    }

    writeFavorites(favorites);
    return normalized;
  };

  favoritesModule.removeFavorite = function(id) {
    var nextFavorites = favoritesModule.getFavorites().filter(function(item) {
      return item.id !== id;
    });

    writeFavorites(nextFavorites);
  };

  favoritesModule.clearFavorites = function() {
    window.localStorage.removeItem(app.constants.favoriteStorageKey);
  };

  favoritesModule.toggleFavorite = function(place) {
    if (favoritesModule.isFavorite(place.id)) {
      favoritesModule.removeFavorite(place.id);
      return false;
    }

    favoritesModule.saveFavorite(place);
    return true;
  };

  favoritesModule.renderFavoriteButtonLabel = function(id) {
    return favoritesModule.isFavorite(id) ? '♥ 저장됨' : '♡ 즐겨찾기';
  };

  function renderFavoritesPage() {
    var $status = $('#favorites-status');
    var $count = $('#favorites-count');
    var $list = $('#favorites-list');
    var $empty = $('#favorites-empty');
    var favorites = favoritesModule.getFavorites();

    app.ui.hideBanner($status);
    $list.empty();
    $count.text('총 ' + favorites.length + '개의 맛집을 저장했어요.');

    if (!favorites.length) {
      app.ui.renderEmptyState($empty, {
        title: '아직 즐겨찾기가 없어요!',
        description: '검색 페이지에서 마음에 드는 맛집을 저장해보세요.',
        actionText: '맛집 검색하러 가기',
        actionHref: 'search.html?keyword=맛집'
      });
      $('#clear-favorites-button').hide();
      return;
    }

    app.ui.hideEmptyState($empty);
    $('#clear-favorites-button').show();

    $.each(favorites, function(_, item) {
      var cardHtml = [
        '<article class="favorite-card" data-place-id="' + app.utils.escapeHtml(item.id) + '">',
        '  <div class="favorite-card-header">',
        '    <div class="favorite-card-main">',
        '      <div class="favorite-topline">',
        '        <span class="favorite-chip">저장됨</span>',
        '        <span class="favorite-chip favorite-chip-muted">' + app.utils.escapeHtml(app.utils.formatSavedDate(item.saved_at)) + '</span>',
        '      </div>',
        '      <h2 class="favorite-title">' + app.utils.escapeHtml(item.place_name) + '</h2>',
        '      <div class="favorite-meta">',
        '        <p>📍 ' + app.utils.escapeHtml(item.address_name || '주소 정보 없음') + '</p>',
        item.phone ? '        <p>☎ ' + app.utils.escapeHtml(item.phone) + '</p>' : '',
        '      </div>',
        '      <div class="favorite-tags">',
        '        <span class="favorite-tag">' + app.utils.escapeHtml(item.category_name || '카테고리 정보 없음') + '</span>',
        '      </div>',
        '    </div>',
        '    <div class="favorite-actions">',
        '      <button class="button button-secondary" type="button" data-action="open-map">지도</button>',
        '      <button class="button button-danger" type="button" data-action="remove">삭제</button>',
        '    </div>',
        '  </div>',
        '</article>'
      ].join('');

      $list.append(cardHtml);
    });
  }

  function bindFavoritesPageEvents() {
    $('#favorites-list').on('click', '[data-action="remove"]', function(event) {
      var placeId = $(event.currentTarget).closest('[data-place-id]').data('place-id');
      favoritesModule.removeFavorite(placeId);
      app.ui.showBanner($('#favorites-status'), 'success', '즐겨찾기에서 삭제했어요.');
      renderFavoritesPage();
    });

    $('#favorites-list').on('click', '[data-action="open-map"]', function(event) {
      var placeId = $(event.currentTarget).closest('[data-place-id]').data('place-id');
      var favorite = favoritesModule.getFavorites().find(function(item) {
        return item.id === placeId;
      });

      if (!favorite) {
        return;
      }

      app.utils.moveToPage('search.html', {
        keyword: favorite.place_name,
        lat: favorite.y,
        lon: favorite.x,
        placeId: favorite.id,
        page: 1
      });
    });

    $('#clear-favorites-button').on('click', function() {
      if (!window.confirm('저장한 즐겨찾기를 모두 삭제할까요?')) {
        return;
      }

      favoritesModule.clearFavorites();
      app.ui.showBanner($('#favorites-status'), 'success', '즐겨찾기를 모두 비웠어요.');
      renderFavoritesPage();
    });
  }

  $(function() {
    if ($('body').data('page') !== 'favorites') {
      return;
    }

    bindFavoritesPageEvents();
    renderFavoritesPage();
  });

  app.favorites = favoritesModule;
})(window, window.jQuery);
