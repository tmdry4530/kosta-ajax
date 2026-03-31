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
    searchRadius: 3000,
    geolocation: {
      desiredAccuracy: 300,
      manualPromptThreshold: 1000,
      retryAccuracyThreshold: 1200,
      timeout: 12000,
      retryTimeout: 20000
    }
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

    formatDistance: function(value) {
      var distance = Number(value || 0);

      if (!Number.isFinite(distance)) {
        return '-';
      }

      if (distance >= 1000) {
        return (Math.round(distance / 100) / 10) + 'km';
      }

      return Math.round(distance) + 'm';
    },

    shouldPromptManualLocation: function(accuracy) {
      return Number.isFinite(accuracy) && accuracy >= (app.constants.geolocation.manualPromptThreshold || 1000);
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

    isConfigValueReady: function(value) {
      if (typeof value !== 'string') {
        return false;
      }

      var trimmed = value.trim();

      if (!trimmed) {
        return false;
      }

      return !/^(YOUR_|your_)/.test(trimmed);
    },

    isConfigReady: function(keys) {
      var requiredKeys = keys || [];
      var isReady = typeof window.CONFIG !== 'undefined';

      if (!isReady) {
        return false;
      }

      return requiredKeys.every(function(key) {
        return app.utils.isConfigValueReady(window.CONFIG[key]);
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
        function readPosition(options) {
          return $.Deferred(function(positionDeferred) {
            navigator.geolocation.getCurrentPosition(function(position) {
              positionDeferred.resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: Number(position.coords.accuracy || 0),
                fetchedAt: new Date().toISOString()
              });
            }, function(error) {
              positionDeferred.reject(error);
            }, options);
          }).promise();
        }

        if (!navigator.geolocation) {
          deferred.reject({
            code: 'UNSUPPORTED',
            message: '이 브라우저에서는 위치 기능을 지원하지 않아요.'
          });
          return;
        }

        var geoConfig = app.constants.geolocation || {};
        var baseOptions = {
          enableHighAccuracy: true,
          timeout: geoConfig.timeout || 12000,
          maximumAge: 0
        };

        readPosition(baseOptions)
          .done(function(position) {
            if (position.accuracy && position.accuracy <= (geoConfig.retryAccuracyThreshold || 1200)) {
              deferred.resolve(position);
              return;
            }

            readPosition({
              enableHighAccuracy: true,
              timeout: geoConfig.retryTimeout || 20000,
              maximumAge: 0
            })
              .done(function(retriedPosition) {
                deferred.resolve($.extend({}, retriedPosition, {
                  retried: true
                }));
              })
              .fail(function() {
                deferred.resolve($.extend({}, position, {
                  warning: '위치 정확도가 다소 낮아요. 실내에서는 오차가 커질 수 있어요.'
                }));
              });
          })
          .fail(function(error) {
          var message = '위치 정보를 가져오지 못했어요.';

          if (error && error.code === error.PERMISSION_DENIED) {
            message = '위치 권한이 필요해요! 설정에서 허용해주세요.';
          } else if (error && (error.code === 3 || error.code === error.TIMEOUT)) {
            message = '위치 확인 시간이 초과됐어요. 잠시 후 다시 시도해주세요.';
          }

          deferred.reject({
            code: error && error.code ? error.code : 'POSITION_ERROR',
            message: message
          });
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
