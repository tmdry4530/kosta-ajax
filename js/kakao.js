'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var mapModule = {};
  var fallbackTotalResults = 12;
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

  function parseErrorMessage(error) {
    if (!error) {
      return '';
    }

    if (error.responseJSON && error.responseJSON.message) {
      return error.responseJSON.message;
    }

    if (error.responseText) {
      try {
        return JSON.parse(error.responseText).message || '';
      } catch (parseError) {
        return '';
      }
    }

    return error.message || '';
  }

  function shouldUseFallback(error) {
    var message = parseErrorMessage(error);

    return error && error.status === 403 && (
      message.indexOf('OPEN_MAP_AND_LOCAL') !== -1 ||
      message.indexOf('disabled OPEN_MAP_AND_LOCAL service') !== -1
    );
  }

  function inferCategory(keyword, index) {
    var value = keyword || '';

    if (/국밥|찌개|파전|칼국수|수제비|샤브샤브|한식/.test(value)) {
      return '음식점 > 한식';
    }

    if (/초밥|라멘|우동|일식/.test(value)) {
      return '음식점 > 일식';
    }

    if (/짬뽕|중식|탕수육/.test(value)) {
      return '음식점 > 중식';
    }

    if (/브런치|파스타|양식/.test(value)) {
      return '음식점 > 양식';
    }

    if (/카페|빙수|아이스크림|디저트/.test(value)) {
      return '음식점 > 카페';
    }

    return ['음식점 > 한식', '음식점 > 일식', '음식점 > 중식', '음식점 > 양식', '음식점 > 카페'][index % 5];
  }

  function buildFallbackDocuments(keyword, lat, lon) {
    var baseLat = Number(lat);
    var baseLon = Number(lon);
    var docs = [];
    var suffixes = ['본점', '2호점', '직영점', '포차', '식당', '키친', '라운지', '하우스', '플레이스', '다이닝', '랩', '스테이션'];
    var roadPrefix = ['중앙로', '시청로', '평촌대로', '시민대로', '관악대로', '산본로'];

    for (var index = 0; index < fallbackTotalResults; index += 1) {
      var offsetLat = baseLat + (0.0012 * ((index % 4) - 1.5));
      var offsetLon = baseLon + (0.0015 * ((Math.floor(index / 2) % 4) - 1.5));
      var categoryName = inferCategory(keyword, index);
      var placeName = keyword + ' ' + suffixes[index % suffixes.length];
      var distance = String(180 + index * 140);

      docs.push({
        id: 'fallback_' + keyword + '_' + index,
        place_name: placeName,
        category_name: categoryName,
        address_name: '경기 안양시 동안구 ' + roadPrefix[index % roadPrefix.length] + ' ' + (100 + index * 7),
        road_address_name: '경기 안양시 동안구 ' + roadPrefix[index % roadPrefix.length] + ' ' + (100 + index * 7),
        phone: '031-000-' + String(1000 + index),
        place_url: 'https://map.kakao.com/link/search/' + encodeURIComponent(placeName),
        x: String(offsetLon.toFixed(6)),
        y: String(offsetLat.toFixed(6)),
        distance: distance
      });
    }

    return docs;
  }

  function buildFallbackResponse(keyword, lat, lon, page, size, reason) {
    var pageNumber = page || 1;
    var pageSize = size || app.constants.pageSize;
    var docs = buildFallbackDocuments(keyword, lat, lon);
    var start = (pageNumber - 1) * pageSize;
    var end = start + pageSize;

    return {
      documents: docs.slice(start, end),
      meta: {
        pageable_count: docs.length,
        total_count: docs.length,
        is_end: end >= docs.length,
        fallback: true,
        fallback_reason: reason || 'service-disabled'
      }
    };
  }

  mapModule.searchPlaces = function(keyword, lat, lon, page, size, options) {
    var configError = ensureKakaoConfig();
    var settings = $.extend({
      forceFallback: false
    }, options || {});

    if (configError) {
      return configError;
    }

    if (settings.forceFallback) {
      return $.Deferred(function(deferred) {
        deferred.resolve(buildFallbackResponse(keyword, lat, lon, page, size, 'manual-demo'));
      }).promise();
    }

    return $.Deferred(function(deferred) {
      $.ajax({
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
      })
        .done(function(response) {
          deferred.resolve(response);
        })
        .fail(function(error) {
          if (shouldUseFallback(error)) {
            deferred.resolve(buildFallbackResponse(keyword, lat, lon, page, size, 'service-disabled'));
            return;
          }

          deferred.reject(error);
        });
    }).promise();
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
