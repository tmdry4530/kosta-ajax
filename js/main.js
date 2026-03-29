'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var state = {
    lat: app.constants.defaultCoords.lat,
    lon: app.constants.defaultCoords.lon
  };

  function cacheElements() {
    return {
      $status: $('#home-status'),
      $manualPanel: $('#manual-location-panel'),
      $weatherCard: $('#weather-card'),
      $recommendations: $('#recommendation-list'),
      $forecast: $('#forecast-list')
    };
  }

  function renderWeatherCard(weather) {
    var extrasHtml = weather.extraMessages.map(function(message) {
      return '<span class="result-badge">💡 ' + app.utils.escapeHtml(message) + '</span>';
    }).join('');

    var html = [
      '<div class="weather-card-header">',
      '  <div>',
      '    <p class="section-kicker">현재 위치</p>',
      '    <h2 id="weather-heading" class="section-title weather-location">📍 ' + app.utils.escapeHtml(weather.locationName) + '</h2>',
      '  </div>',
      '  <span class="result-badge">' + app.utils.escapeHtml(weather.weatherMain) + '</span>',
      '</div>',
      '<div class="weather-main">',
      '  <img class="weather-icon" src="https://openweathermap.org/img/wn/' + app.utils.escapeHtml(weather.icon) + '@2x.png" alt="' + app.utils.escapeHtml(weather.description) + '">',
      '  <div>',
      '    <div class="weather-temp">' + app.utils.escapeHtml(app.utils.formatTemperature(weather.temp)) + '</div>',
      '    <p class="weather-description">' + app.utils.escapeHtml(weather.description) + '</p>',
      '  </div>',
      '</div>',
      '<div class="weather-meta">',
      '  <span class="result-badge">💧 습도 ' + app.utils.escapeHtml(weather.humidity) + '%</span>',
      '  <span class="result-badge">💨 풍속 ' + app.utils.escapeHtml(weather.windSpeed) + 'm/s</span>',
      '</div>',
      '<div class="weather-summary">',
      '  <strong>' + app.utils.escapeHtml(weather.summaryMessage) + '</strong>',
      '  <p>오늘 날씨를 바탕으로 어울리는 메뉴를 바로 추천해드릴게요.</p>',
      extrasHtml ? '<div class="weather-meta">' + extrasHtml + '</div>' : '',
      '</div>'
    ].join('');

    app.ui.setTheme(weather.themeClass);
    cache.$weatherCard.html(html);
  }

  function renderForecast(forecastItems) {
    if (!forecastItems.length) {
      cache.$forecast.html('<div class="empty-state is-visible"><h3>예보를 불러오지 못했어요.</h3><p>잠시 후 다시 시도해주세요.</p></div>');
      return;
    }

    var html = forecastItems.map(function(item) {
      return [
        '<article class="forecast-card">',
        '  <p class="forecast-day">' + app.utils.escapeHtml(item.dayLabel) + '</p>',
        '  <div class="forecast-icon">' + app.utils.escapeHtml(item.icon) + '</div>',
        '  <p class="forecast-temp">' + app.utils.escapeHtml(item.temp) + '°C</p>',
        '  <p class="forecast-desc">' + app.utils.escapeHtml(item.description) + '</p>',
        '</article>'
      ].join('');
    }).join('');

    cache.$forecast.html(html);
  }

  function renderRecommendations(recommendations) {
    if (!recommendations.length) {
      cache.$recommendations.html('<div class="empty-state is-visible"><h3>추천 메뉴를 찾지 못했어요.</h3><p>다른 위치로 다시 시도해주세요.</p></div>');
      return;
    }

    var html = recommendations.map(function(item) {
      return [
        '<button class="recommendation-card" type="button" data-keyword="' + app.utils.escapeHtml(item.keyword) + '">',
        '  <div class="recommendation-icon">' + app.utils.escapeHtml(item.emoji) + '</div>',
        '  <div class="recommendation-title-row">',
        '    <strong class="recommendation-title">' + app.utils.escapeHtml(item.name) + '</strong>',
        '    <span class="result-badge" data-count-for="' + app.utils.escapeHtml(item.keyword) + '">검색 중…</span>',
        '  </div>',
        '  <p class="recommendation-subtitle">' + app.utils.escapeHtml(item.reason) + '</p>',
        '  <div class="recommendation-tags">',
        '    <span class="result-badge">🔎 ' + app.utils.escapeHtml(item.keyword) + '</span>',
        '    <span class="result-badge">📍 내 주변 3km</span>',
        '  </div>',
        '</button>'
      ].join('');
    }).join('');

    cache.$recommendations.html(html);
  }

  function updateRecommendationCounts(recommendations) {
    $.each(recommendations, function(_, item) {
      app.kakao.countPlaces(item.keyword, state.lat, state.lon)
        .done(function(count) {
          cache.$recommendations.find('[data-count-for="' + item.keyword + '"]').text(count + '개');
        })
        .fail(function() {
          cache.$recommendations.find('[data-count-for="' + item.keyword + '"]').text('설정 필요');
        });
    });
  }

  function loadWeatherByCoords(lat, lon, statusMessage) {
    state.lat = lat;
    state.lon = lon;

    app.ui.showBanner(cache.$status, 'info', statusMessage || '날씨와 추천 메뉴를 불러오는 중이에요.');
    cache.$weatherCard.html('<div class="skeleton-block skeleton-block-lg"></div>');
    cache.$forecast.html('<div class="skeleton-block" style="height: 120px;"></div>');
    cache.$recommendations.html('<div class="skeleton-block" style="height: 220px;"></div>');

    $.when(app.weather.fetchCurrentWeather(lat, lon), app.weather.fetchForecast(lat, lon))
      .done(function(currentResponse, forecastResponse) {
        var weather = app.weather.normalizeCurrentWeather(currentResponse[0]);
        var forecast = app.weather.extractForecastDays(forecastResponse[0]);

        renderWeatherCard(weather);
        renderForecast(forecast);
        renderRecommendations(weather.recommendations);
        updateRecommendationCounts(weather.recommendations);
        app.ui.showBanner(cache.$status, 'success', weather.locationName + ' 기준으로 추천을 준비했어요.');
        app.ui.hideManualLocationForm(cache.$manualPanel);
      })
      .fail(function(error) {
        var message = app.utils.buildApiErrorMessage('weather', error, '날씨 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
        app.ui.showBanner(cache.$status, 'error', message);
        cache.$weatherCard.html('<div class="empty-state is-visible"><h3>날씨 정보를 불러오지 못했어요.</h3><p>API 키 설정과 네트워크 상태를 확인해주세요.</p></div>');
        cache.$forecast.empty();
        cache.$recommendations.empty();
      });
  }

  function requestCurrentLocation() {
    app.utils.getCurrentPosition()
      .done(function(coords) {
        loadWeatherByCoords(coords.lat, coords.lon, '현재 위치 기준으로 추천을 준비하고 있어요.');
      })
      .fail(function(error) {
        app.ui.showBanner(cache.$status, 'info', error.message + ' 기본 위치로 먼저 보여드릴게요.');
        loadWeatherByCoords(app.constants.defaultCoords.lat, app.constants.defaultCoords.lon, app.constants.defaultCoords.label + ' 기준으로 추천을 불러오는 중이에요.');
        app.ui.renderManualLocationForm(cache.$manualPanel, {
          title: '위치를 직접 입력해 다시 추천받기',
          description: '권한 허용이 어렵다면 위도와 경도로 원하는 지역을 직접 지정할 수 있어요.',
          onSubmit: function(coords) {
            loadWeatherByCoords(coords.lat, coords.lon, '입력한 위치 기준으로 다시 불러오는 중이에요.');
          }
        });
      });
  }

  function bindEvents() {
    $('#refresh-location-button, #hero-refresh-button').on('click', function() {
      requestCurrentLocation();
    });

    cache.$recommendations.on('click', '.recommendation-card', function(event) {
      var keyword = $(event.currentTarget).data('keyword');
      app.utils.moveToPage('search.html', {
        keyword: keyword,
        lat: state.lat,
        lon: state.lon,
        page: 1
      });
    });
  }

  var cache;

  $(function() {
    if ($('body').data('page') !== 'home') {
      return;
    }

    cache = cacheElements();
    bindEvents();
    requestCurrentLocation();
  });
})(window, window.jQuery);
