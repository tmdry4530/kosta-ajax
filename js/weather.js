'use strict';

(function(window, $, undefined) {
  var app = window.WeatherEats = window.WeatherEats || {};
  var weatherModule = {};

  function ensureWeatherConfig() {
    if (!app.utils.isConfigReady(['WEATHER_API_KEY'])) {
      return app.utils.rejectDeferred('OpenWeatherMap API 키를 먼저 설정해주세요.', 'CONFIG_MISSING');
    }

    return null;
  }

  function getWeatherTheme(weatherMain, temperature) {
    if (weatherMain === 'Rain' || weatherMain === 'Drizzle' || weatherMain === 'Thunderstorm') {
      return 'theme-rain';
    }

    if (weatherMain === 'Snow') {
      return 'theme-snow';
    }

    if (weatherMain === 'Clear') {
      return temperature > 29 ? 'theme-hot' : 'theme-clear';
    }

    if (weatherMain === 'Clouds' || weatherMain === 'Mist' || weatherMain === 'Fog' || weatherMain === 'Haze') {
      return 'theme-clouds';
    }

    if (temperature > 29) {
      return 'theme-hot';
    }

    return 'theme-default';
  }

  function buildRecommendation(weatherData) {
    var weatherMain = weatherData.weatherMain;
    var temp = weatherData.temp;
    var recommendations;
    var extras = [];

    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
      recommendations = [
        { emoji: '🫓', name: '파전', keyword: '파전 맛집', reason: '비 오는 날엔 따끈한 전이 제격이에요.' },
        { emoji: '🍶', name: '막걸리', keyword: '막걸리', reason: '촉촉한 날씨에 잘 어울리는 조합이에요.' },
        { emoji: '🥘', name: '해물탕', keyword: '해물탕', reason: '칼칼한 국물이 몸을 따뜻하게 해줘요.' }
      ];
    } else if (weatherMain === 'Snow') {
      recommendations = [
        { emoji: '🍲', name: '찌개', keyword: '찌개 맛집', reason: '추운 날엔 뜨끈한 찌개가 최고예요.' },
        { emoji: '☕', name: '카페', keyword: '카페', reason: '따뜻한 음료로 몸을 녹여보세요.' },
        { emoji: '🥟', name: '만두', keyword: '만두 맛집', reason: '간단하지만 든든한 메뉴예요.' }
      ];
    } else if (temp <= 5) {
      recommendations = [
        { emoji: '🥘', name: '국밥', keyword: '국밥', reason: '매우 추운 날씨엔 뜨끈한 국밥이 잘 맞아요.' },
        { emoji: '🍲', name: '찌개', keyword: '찌개 맛집', reason: '따뜻한 국물이 체온을 올려줘요.' },
        { emoji: '🫕', name: '샤브샤브', keyword: '샤브샤브', reason: '든든하고 포근한 한 끼로 좋아요.' }
      ];
    } else if (temp <= 12) {
      recommendations = [
        { emoji: '🍜', name: '라멘', keyword: '라멘', reason: '쌀쌀한 날에 뜨끈한 면요리가 잘 어울려요.' },
        { emoji: '🍝', name: '칼국수', keyword: '칼국수', reason: '부담 없이 즐기기 좋은 메뉴예요.' },
        { emoji: '🥣', name: '수제비', keyword: '수제비', reason: '포근한 식감으로 기분까지 따뜻해져요.' }
      ];
    } else if (temp <= 22) {
      recommendations = [
        { emoji: '🍚', name: '한식', keyword: '한식 맛집', reason: '무난하면서도 든든한 선택이에요.' },
        { emoji: '🍢', name: '분식', keyword: '분식', reason: '가볍게 먹고 싶을 때 딱 좋아요.' },
        { emoji: '🥐', name: '브런치', keyword: '브런치 카페', reason: '산뜻한 날씨와 잘 어울리는 분위기예요.' }
      ];
    } else if (temp <= 30) {
      recommendations = [
        { emoji: '🍜', name: '냉면', keyword: '냉면', reason: '더운 날씨엔 시원한 면 요리가 최고예요.' },
        { emoji: '🍣', name: '초밥', keyword: '초밥', reason: '산뜻한 맛으로 입맛을 살려줘요.' },
        { emoji: '🥗', name: '샐러드', keyword: '샐러드', reason: '가볍고 상쾌하게 먹기 좋아요.' }
      ];
    } else {
      recommendations = [
        { emoji: '🍧', name: '빙수', keyword: '빙수', reason: '폭염엔 시원한 디저트가 먼저 떠올라요.' },
        { emoji: '🍦', name: '아이스크림', keyword: '아이스크림', reason: '당 충전과 쿨다운을 한 번에 해보세요.' },
        { emoji: '🍜', name: '냉면', keyword: '냉면 맛집', reason: '한 끼 식사도 시원하게 즐길 수 있어요.' }
      ];
    }

    if (weatherData.humidity >= 80) {
      extras.push('습도가 높아서 시원한 메뉴를 함께 추천해요.');
    }

    if (weatherData.windSpeed >= 10) {
      extras.push('바람이 강해 실내 또는 포장하기 좋은 곳을 찾아보면 좋아요.');
    }

    return {
      items: recommendations,
      extras: extras,
      summary: buildSummaryMessage(weatherMain, temp)
    };
  }

  function buildSummaryMessage(weatherMain, temp) {
    if (weatherMain === 'Rain' || weatherMain === 'Drizzle') {
      return '비 오는 날엔 따끈한 전과 국물이 생각나는 하루예요.';
    }

    if (weatherMain === 'Snow') {
      return '눈 오는 날엔 몸을 녹일 따뜻한 메뉴를 추천해요.';
    }

    if (temp <= 5) {
      return '매우 추워요. 국물 요리로 체온을 올려보세요.';
    }

    if (temp <= 12) {
      return '쌀쌀한 날씨라 따뜻한 면 요리가 잘 어울려요.';
    }

    if (temp <= 22) {
      return '산책하기 좋은 날씨예요. 다양한 메뉴를 부담 없이 즐겨보세요.';
    }

    if (temp <= 30) {
      return '더운 편이라 시원하고 깔끔한 메뉴를 추천해요.';
    }

    return '폭염이에요. 차갑고 가벼운 메뉴로 기분 좋게 식사해보세요.';
  }

  function normalizeCurrentWeather(data) {
    var recommendationBundle = buildRecommendation({
      weatherMain: data.weather[0].main,
      temp: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    });

    return {
      locationName: data.name || app.constants.defaultCoords.label,
      weatherMain: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      temp: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      recommendations: recommendationBundle.items,
      extraMessages: recommendationBundle.extras,
      summaryMessage: recommendationBundle.summary,
      themeClass: getWeatherTheme(data.weather[0].main, data.main.temp)
    };
  }

  function weatherEmoji(weatherMain) {
    var map = {
      Clear: '☀️',
      Clouds: '☁️',
      Rain: '🌧️',
      Drizzle: '🌦️',
      Thunderstorm: '⛈️',
      Snow: '❄️',
      Mist: '🌫️',
      Fog: '🌫️',
      Haze: '🌫️'
    };

    return map[weatherMain] || '🌤️';
  }

  function extractForecastDays(forecastData) {
    var groups = {};
    var results = [];

    $.each(forecastData.list || [], function(_, item) {
      var dateKey = item.dt_txt.split(' ')[0];
      var hour = Number(item.dt_txt.split(' ')[1].slice(0, 2));
      var diffFromNoon = Math.abs(12 - hour);

      if (!groups[dateKey] || diffFromNoon < groups[dateKey].diff) {
        groups[dateKey] = {
          item: item,
          diff: diffFromNoon
        };
      }
    });

    $.each(Object.keys(groups).sort(), function(index, dateKey) {
      if (index >= 5) {
        return false;
      }

      var item = groups[dateKey].item;
      var date = new Date(dateKey);
      var dayLabel = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] + '요일';

      results.push({
        dateKey: dateKey,
        dayLabel: dayLabel,
        icon: weatherEmoji(item.weather[0].main),
        description: item.weather[0].description,
        temp: Math.round(item.main.temp)
      });
    });

    return results;
  }

  weatherModule.fetchCurrentWeather = function(lat, lon) {
    var configError = ensureWeatherConfig();

    if (configError) {
      return configError;
    }

    return $.ajax({
      url: 'https://api.openweathermap.org/data/2.5/weather',
      method: 'GET',
      data: {
        lat: lat,
        lon: lon,
        appid: window.CONFIG.WEATHER_API_KEY,
        units: 'metric',
        lang: 'kr'
      }
    });
  };

  weatherModule.fetchForecast = function(lat, lon) {
    var configError = ensureWeatherConfig();

    if (configError) {
      return configError;
    }

    return $.ajax({
      url: 'https://api.openweathermap.org/data/2.5/forecast',
      method: 'GET',
      data: {
        lat: lat,
        lon: lon,
        appid: window.CONFIG.WEATHER_API_KEY,
        units: 'metric',
        lang: 'kr'
      }
    });
  };

  weatherModule.normalizeCurrentWeather = normalizeCurrentWeather;
  weatherModule.extractForecastDays = extractForecastDays;
  weatherModule.weatherEmoji = weatherEmoji;
  weatherModule.getWeatherTheme = getWeatherTheme;
  app.weather = weatherModule;
})(window, window.jQuery);
