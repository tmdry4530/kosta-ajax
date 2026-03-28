'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var themeClasses = ['theme-default', 'theme-clear', 'theme-rain', 'theme-snow', 'theme-clouds', 'theme-hot'];

  app.constants = $.extend(true, {
    favoriteStorageKey: 'weathereats_favorites',
    maxFavorites: 50,
    defaultCoords: {
      lat: 37.3943,
      lon: 126.9568,
      label: '안양시 동안구'
    },
    pageSize: 10,
    searchRadius: 3000
  }, app.constants || {});

  app.utils = $.extend(app.utils || {}, {
    escapeHtml: function(value) {
      return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    formatTemperature: function(value) {
      return Math.round(Number(value || 0)) + '°C';
    },

    formatSavedDate: function(value) {
      if (!value) {
        return '-';
      }

      var date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');
    },

    getQueryParams: function() {
      var params = {};
      var search = new URLSearchParams(window.location.search);

      search.forEach(function(value, key) {
        params[key] = value;
      });

      return params;
    },

    buildQueryString: function(params) {
      var search = new URLSearchParams();

      $.each(params, function(key, value) {
        if (value !== undefined && value !== null && value !== '') {
          search.set(key, value);
        }
      });

      return search.toString();
    },

    moveToPage: function(path, params) {
      var queryString = app.utils.buildQueryString(params || {});
      window.location.href = queryString ? path + '?' + queryString : path;
    },

    updateAddressBar: function(params) {
      if (!window.history || !window.history.replaceState) {
        return;
      }

      var queryString = app.utils.buildQueryString(params || {});
      var nextUrl = queryString ? window.location.pathname + '?' + queryString : window.location.pathname;
      window.history.replaceState({}, '', nextUrl);
    },

    normalizeCoordinate: function(value) {
      var parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    },

    isConfigReady: function(keys) {
      var requiredKeys = keys || [];
      var isReady = typeof window.CONFIG !== 'undefined';

      if (!isReady) {
        return false;
      }

      return requiredKeys.every(function(key) {
        return Boolean(window.CONFIG[key]);
      });
    },

    rejectDeferred: function(message, code) {
      return $.Deferred(function(deferred) {
        deferred.reject({
          message: message,
          code: code || 'APP_ERROR'
        });
      }).promise();
    },

    buildApiErrorMessage: function(source, error, fallbackMessage) {
      var status = error && error.status;
      var defaultMessage = fallbackMessage || '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.';

      if (!error) {
        return defaultMessage;
      }

      if (error.message && !status) {
        return error.message;
      }

      if (status === 401) {
        return source === 'weather' ? '날씨 API 키를 다시 확인해주세요.' : '카카오 API 키를 다시 확인해주세요.';
      }

      if (status === 403) {
        return source === 'kakao' ? '카카오 앱에서 지도/로컬 서비스를 활성화해야 해요.' : defaultMessage;
      }

      if (status === 429) {
        return '요청이 많아요. 잠시 후 다시 시도해주세요.';
      }

      if (status === 0) {
        return '인터넷 연결 또는 CORS 설정을 확인해주세요.';
      }

      return defaultMessage;
    },

    getCurrentPosition: function() {
      return $.Deferred(function(deferred) {
        if (!navigator.geolocation) {
          deferred.reject({
            code: 'UNSUPPORTED',
            message: '이 브라우저에서는 위치 기능을 지원하지 않아요.'
          });
          return;
        }

        navigator.geolocation.getCurrentPosition(function(position) {
          deferred.resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        }, function(error) {
          var message = '위치 정보를 가져오지 못했어요.';

          if (error && error.code === error.PERMISSION_DENIED) {
            message = '위치 권한이 필요해요! 설정에서 허용해주세요.';
          }

          deferred.reject({
            code: error && error.code ? error.code : 'POSITION_ERROR',
            message: message
          });
        }, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000
        });
      }).promise();
    }
  });

  app.ui = $.extend(app.ui || {}, {
    showBanner: function($target, type, message) {
      if (!$target || !$target.length) {
        return;
      }

      $target.removeClass('is-info is-error is-success is-visible');

      if (!message) {
        $target.empty();
        return;
      }

      $target.addClass('is-visible is-' + (type || 'info')).html(app.utils.escapeHtml(message));
    },

    hideBanner: function($target) {
      if (!$target || !$target.length) {
        return;
      }

      $target.removeClass('is-info is-error is-success is-visible').empty();
    },

    setTheme: function(themeClass) {
      var $body = $('body');
      $body.removeClass(themeClasses.join(' '));
      $body.addClass(themeClass || 'theme-default');
    },

    renderManualLocationForm: function($container, options) {
      var settings = $.extend({
        title: '위치를 직접 입력할 수 있어요.',
        description: '위도와 경도를 입력하면 해당 위치 기준으로 다시 불러옵니다.',
        lat: app.constants.defaultCoords.lat,
        lon: app.constants.defaultCoords.lon,
        submitText: '이 위치로 보기',
        onSubmit: $.noop
      }, options || {});

      if (!$container || !$container.length) {
        return;
      }

      var html = [
        '<div class="panel">',
        '  <p class="section-kicker">수동 위치 입력</p>',
        '  <h3 class="section-title">' + app.utils.escapeHtml(settings.title) + '</h3>',
        '  <p class="section-caption">' + app.utils.escapeHtml(settings.description) + '</p>',
        '  <div class="status-banner" data-role="manual-status"></div>',
        '  <form class="manual-location-form" data-role="manual-form">',
        '    <div class="field-group">',
        '      <label class="field-label" for="manual-latitude">위도</label>',
        '      <input id="manual-latitude" class="input-field" type="number" step="0.0001" name="latitude" value="' + app.utils.escapeHtml(settings.lat) + '" required>',
        '    </div>',
        '    <div class="field-group">',
        '      <label class="field-label" for="manual-longitude">경도</label>',
        '      <input id="manual-longitude" class="input-field" type="number" step="0.0001" name="longitude" value="' + app.utils.escapeHtml(settings.lon) + '" required>',
        '    </div>',
        '    <button class="button button-secondary" type="submit">' + app.utils.escapeHtml(settings.submitText) + '</button>',
        '  </form>',
        '</div>'
      ].join('');

      $container.addClass('is-visible').html(html);

      $container.find('[data-role="manual-form"]').off('submit').on('submit', function(event) {
        var $form = $(event.currentTarget);
        var $status = $container.find('[data-role="manual-status"]');
        var lat = app.utils.normalizeCoordinate($form.find('[name="latitude"]').val());
        var lon = app.utils.normalizeCoordinate($form.find('[name="longitude"]').val());

        event.preventDefault();

        if (lat === null || lon === null) {
          app.ui.showBanner($status, 'error', '위도와 경도를 숫자로 입력해주세요.');
          return;
        }

        app.ui.hideBanner($status);
        settings.onSubmit({ lat: lat, lon: lon });
      });
    },

    hideManualLocationForm: function($container) {
      if (!$container || !$container.length) {
        return;
      }

      $container.removeClass('is-visible').empty();
    },

    renderEmptyState: function($target, options) {
      var settings = $.extend({
        title: '표시할 내용이 없어요.',
        description: '',
        actionText: '',
        actionHref: ''
      }, options || {});
      var html = [
        '<h3>' + app.utils.escapeHtml(settings.title) + '</h3>',
        settings.description ? '<p>' + app.utils.escapeHtml(settings.description) + '</p>' : '',
        settings.actionText && settings.actionHref ? '<a class="button button-primary" href="' + app.utils.escapeHtml(settings.actionHref) + '">' + app.utils.escapeHtml(settings.actionText) + '</a>' : ''
      ].join('');

      $target.html(html).addClass('is-visible');
    },

    hideEmptyState: function($target) {
      $target.removeClass('is-visible').empty();
    }
  });
})(window, window.jQuery);
