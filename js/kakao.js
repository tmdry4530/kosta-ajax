'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var mapModule = {};
  var mapState = {
    map: null,
    markers: {},
    places: {},
    infoWindow: null,
    activeMarkerId: null
  };

  function ensureKakaoConfig() {
    if (!app.utils.isConfigReady(['KAKAO_REST_KEY', 'KAKAO_JS_KEY'])) {
      return app.utils.rejectDeferred('Kakao API 키를 먼저 설정해주세요.', 'CONFIG_MISSING');
    }

    return null;
  }

  function ensureMapReady() {
    return Boolean(window.kakao && window.kakao.maps);
  }

  function clearMarkers() {
    $.each(mapState.markers, function(_, marker) {
      marker.setMap(null);
    });

    mapState.markers = {};
    mapState.places = {};
    mapState.activeMarkerId = null;

    if (mapState.infoWindow) {
      mapState.infoWindow.close();
    }
  }

  function buildInfoContent(place) {
    return [
      '<div class="map-info-window">',
      '  <strong>' + app.utils.escapeHtml(place.placeName) + '</strong>',
      '  <div>' + app.utils.escapeHtml(place.addressName || '주소 정보 없음') + '</div>',
      '  <div>' + app.utils.escapeHtml(place.phone || '전화번호 없음') + '</div>',
      '  <a href="' + app.utils.escapeHtml(place.placeUrl) + '" target="_blank" rel="noreferrer">카카오맵에서 보기</a>',
      '</div>'
    ].join('');
  }

  function activateMarker(placeId) {
    $.each(mapState.markers, function(currentId, marker) {
      marker.setZIndex(currentId === placeId ? 10 : 1);
    });
    mapState.activeMarkerId = placeId;
  }

  mapModule.searchPlaces = function(keyword, lat, lon, page, size) {
    var configError = ensureKakaoConfig();

    if (configError) {
      return configError;
    }

    return $.ajax({
      url: 'https://dapi.kakao.com/v2/local/search/keyword.json',
      method: 'GET',
      headers: {
        Authorization: 'KakaoAK ' + window.CONFIG.KAKAO_REST_KEY
      },
      data: {
        query: keyword,
        x: lon,
        y: lat,
        radius: app.constants.searchRadius,
        category_group_code: 'FD6',
        sort: 'distance',
        page: page || 1,
        size: size || app.constants.pageSize
      }
    });
  };

  mapModule.countPlaces = function(keyword, lat, lon) {
    return $.Deferred(function(deferred) {
      mapModule.searchPlaces(keyword, lat, lon, 1, 1)
        .done(function(response) {
          deferred.resolve(response.meta ? Math.min(response.meta.pageable_count || 0, 45) : 0);
        })
        .fail(function(error) {
          deferred.reject(error);
        });
    }).promise();
  };

  mapModule.loadSdk = function() {
    var configError = ensureKakaoConfig();

    if (configError) {
      return configError;
    }

    if (ensureMapReady()) {
      return $.Deferred(function(deferred) {
        deferred.resolve(window.kakao);
      }).promise();
    }

    return $.Deferred(function(deferred) {
      var scriptId = 'kakao-map-sdk';
      var existingScript = document.getElementById(scriptId);

      if (existingScript) {
        existingScript.addEventListener('load', function() {
          deferred.resolve(window.kakao);
        }, { once: true });
        existingScript.addEventListener('error', function() {
          deferred.reject({ message: '카카오 지도 SDK를 불러오지 못했어요.' });
        }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + window.CONFIG.KAKAO_JS_KEY + '&libraries=services';
      script.async = true;
      script.onload = function() {
        deferred.resolve(window.kakao);
      };
      script.onerror = function() {
        deferred.reject({ message: '카카오 지도 SDK를 불러오지 못했어요.' });
      };
      document.head.appendChild(script);
    }).promise();
  };

  mapModule.createMap = function(containerId, lat, lon) {
    if (!ensureMapReady()) {
      return null;
    }

    var container = document.getElementById(containerId);
    if (!container) {
      return null;
    }

    var center = new window.kakao.maps.LatLng(lat, lon);

    mapState.map = new window.kakao.maps.Map(container, {
      center: center,
      level: 5
    });
    mapState.infoWindow = new window.kakao.maps.InfoWindow({ removable: true });

    return mapState.map;
  };

  mapModule.setCenter = function(lat, lon) {
    if (!mapState.map || !ensureMapReady()) {
      return;
    }

    mapState.map.setCenter(new window.kakao.maps.LatLng(lat, lon));
  };

  mapModule.renderMarkers = function(places, handlers) {
    if (!mapState.map || !ensureMapReady()) {
      return;
    }

    var callbacks = handlers || {};
    clearMarkers();

    $.each(places || [], function(_, place) {
      var marker = new window.kakao.maps.Marker({
        map: mapState.map,
        position: new window.kakao.maps.LatLng(place.y, place.x),
        title: place.placeName
      });

      mapState.markers[place.id] = marker;
      mapState.places[place.id] = place;

      window.kakao.maps.event.addListener(marker, 'click', function() {
        mapModule.openInfoWindow(place.id);
        activateMarker(place.id);

        if (callbacks.onMarkerClick) {
          callbacks.onMarkerClick(place);
        }
      });
    });
  };

  mapModule.openInfoWindow = function(placeId) {
    if (!mapState.infoWindow || !mapState.markers[placeId] || !mapState.places[placeId]) {
      return;
    }

    mapState.infoWindow.setContent(buildInfoContent(mapState.places[placeId]));
    mapState.infoWindow.open(mapState.map, mapState.markers[placeId]);
  };

  mapModule.focusMarker = function(placeId) {
    var place = mapState.places[placeId];

    if (!place || !mapState.map) {
      return;
    }

    activateMarker(placeId);
    mapModule.setCenter(place.y, place.x);
  };


  app.kakao = mapModule;
})(window, window.jQuery);
