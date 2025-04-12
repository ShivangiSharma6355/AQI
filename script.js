const apiKey = "8369dcb55bd3e2cf29b0bd7fd3b2287f";
const searchButton = document.getElementById("search-btn");
const cityInput = document.getElementById("city-input");
const weatherResultDiv = document.querySelector(".weather-result");
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;
let searchTimeout;
const suggestionsContainer = document.createElement("div");
suggestionsContainer.className = "suggestions-container";
const loadingScreen = document.createElement("div");
loadingScreen.className = "loading-screen hidden";
let allCities = [];
let cityList = [];
document.body.appendChild(loadingScreen);
loadingScreen.innerHTML = `
    <div class="loader">
        <div class="loader-inner"></div>
    </div>
    <p>Fetching weather data...</p>
`;
cityInput.insertAdjacentElement("afterend", suggestionsContainer);
themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-theme");
  if (body.classList.contains("dark-theme")) {
    themeToggle.textContent = "🌙 Dark Mode";
    localStorage.setItem("theme", "dark");
  } else {
    themeToggle.textContent = "☀️ Light Mode";
    localStorage.setItem("theme", "light");
  }
});
cityInput.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  if (query.length < 2) {
    suggestionsContainer.innerHTML = "";
    suggestionsContainer.classList.remove("active");
    return;
  }
  searchTimeout = setTimeout(() => {
    suggestionsContainer.innerHTML = "";
    const filteredCities = cityList
      .filter((city) => city.lower.startsWith(query.toLowerCase()))
      .map((city) => city.name);
    if (filteredCities.length > 0) {
      suggestionsContainer.classList.add("active");
      filteredCities.forEach((city) => {
        const suggestion = document.createElement("div");
        suggestion.className = "suggestion";
        suggestion.textContent = city;
        suggestion.addEventListener("click", () => {
          cityInput.value = city;
          suggestionsContainer.innerHTML = "";
          suggestionsContainer.classList.remove("active");
          fetchWeatherWithLoading(city);
        });
        suggestionsContainer.appendChild(suggestion);
      });
    } else {
      suggestionsContainer.classList.remove("active");
    }
  }, 300);
});
document.addEventListener("click", (e) => {
  if (
    !cityInput.contains(e.target) &&
    !suggestionsContainer.contains(e.target)
  ) {
    suggestionsContainer.innerHTML = "";
    suggestionsContainer.classList.remove("active");
  }
});
searchButton.addEventListener("click", () => {
  const city = cityInput.value;
  if (city) {
    fetchWeatherWithLoading(city);
  } else {
    showNotification("Please enter a city name.");
  }
});
cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value;
    if (city) {
      fetchWeatherWithLoading(city);
    } else {
      showNotification("Please enter a city name.");
    }
  }
});
function fetchWeatherWithLoading(city) {
  weatherResultDiv.classList.add("hidden");
  loadingScreen.classList.remove("hidden");
  setTimeout(() => {
    fetchWeatherData(city);
  }, 300);
}
function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "notification show";
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
async function fetchWeatherData(city) {
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      loadingScreen.classList.add("hidden");
      if (response.status === 404) {
        showNotification("City not found. Please check the spelling.");
      } else {
        showNotification(
          "Error fetching weather data. Please try again later."
        );
        console.error(
          "OpenWeatherMap API Error:",
          response.status,
          response.statusText
        );
      }
      weatherResultDiv.innerHTML = "";
      weatherResultDiv.classList.remove("hidden");
      resetBackgroundColor();
      return;
    }
    const data = await response.json();
    logSearchResultJson(data);
    if (data.cod === 200) {
      displayWeatherData(data);
      setBackgroundByWeather(data.weather[0].main, data.weather[0].icon);
      const { lat, lon } = data.coord;
      try {
        const aqiData = await getAQI(lat, lon);
        displayAQIData(aqiData);
        const forecast = await getForecast(lat, lon);
        displayForecast(forecast);
      } catch (error) {
        console.error("Error fetching additional data:", error);
      }
    }
    loadingScreen.classList.add("hidden");
    weatherResultDiv.classList.add("active");
  } catch (error) {
    loadingScreen.classList.add("hidden");
    showNotification(
      "An unexpected error occurred. Please check your internet connection and try again."
    );
    console.error("Fetch Error:", error);
    weatherResultDiv.innerHTML = "";
    weatherResultDiv.classList.remove("hidden");
    resetBackgroundColor();
  }
}
async function getForecast(lat, lon) {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      throw new Error(
        `Forecast API Error: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    throw error;
  }
}
function displayForecast(forecastData, container) {
  if (!forecastData || !forecastData.list || forecastData.list.length === 0)
    return;
  if (!container) {
    const forecastDiv = document.createElement("div");
    forecastDiv.className = "forecast-container";
    forecastDiv.innerHTML =
      '<h3>5-Day Forecast</h3><div class="forecast-items"></div>';
    container = forecastDiv.querySelector(".forecast-items");
    weatherResultDiv.appendChild(forecastDiv);
  } else {
    container.innerHTML = "";
  }
  const dailyForecasts = {};
  forecastData.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    const hours = date.getHours();
    if (
      !dailyForecasts[day] ||
      Math.abs(hours - 12) <
        Math.abs(new Date(dailyForecasts[day].dt * 1000).getHours() - 12)
    ) {
      dailyForecasts[day] = item;
    }
  });
  Object.keys(dailyForecasts)
    .slice(0, 5)
    .forEach((day) => {
      const item = dailyForecasts[day];
      const temp = Math.round(item.main.temp);
      const iconCode = item.weather[0].icon;
      const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;
      const forecastItem = document.createElement("div");
      forecastItem.className = "forecast-item";
      forecastItem.innerHTML = `<p class="forecast-day">${day}</p><img src="${iconUrl}" alt="${item.weather[0].description}" class="forecast-icon"><p class="forecast-temp">${temp}°C</p>`;
      container.appendChild(forecastItem);
    });
}
function setBackgroundByWeather(weatherMain, iconCode) {
  body.classList.remove(
    "weather-clear",
    "weather-clouds",
    "weather-rain",
    "weather-snow",
    "weather-thunderstorm",
    "weather-mist",
    "weather-night"
  );
  const isNightTime = iconCode && iconCode.includes("n");
  if (isNightTime) {
    body.classList.add("weather-night");
    return;
  }
  switch (weatherMain) {
    case "Clear":
      body.classList.add("weather-clear");
      break;
    case "Clouds":
      body.classList.add("weather-clouds");
      break;
    case "Rain":
    case "Drizzle":
      body.classList.add("weather-rain");
      break;
    case "Snow":
      body.classList.add("weather-snow");
      break;
    case "Thunderstorm":
      body.classList.add("weather-thunderstorm");
      break;
    case "Mist":
    case "Fog":
    case "Haze":
      body.classList.add("weather-mist");
      break;
    default:
      resetBackgroundColor();
  }
}
function resetBackgroundColor() {
  body.classList.remove(
    "weather-clear",
    "weather-clouds",
    "weather-rain",
    "weather-snow",
    "weather-thunderstorm",
    "weather-mist",
    "weather-night"
  );
}
function displayWeatherData(data) {
  if (data.cod === 200) {
    const cityName = data.name;
    const country = data.sys.country;
    const temperature = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const description = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const pressure = data.main.pressure;
    const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    weatherResultDiv.innerHTML = `<h2 class="city-name">${cityName}</h2><h4 class="country-name">${country}</h4><div class="weather-main"><div class="weather-icon"><img src="${iconUrl}" alt="${description}"></div><div class="weather-info"><p class="temperature">${temperature}°C</p><p class="feels-like">Feels like: ${feelsLike}°C</p><p class="description">${description}</p></div></div><div class="weather-details"><div class="weather-detail-item"><span class="detail-icon">💧</span><span class="detail-label">Humidity</span><span class="detail-value">${humidity}%</span></div><div class="weather-detail-item"><span class="detail-icon">💨</span><span class="detail-label">Wind</span><span class="detail-value">${windSpeed} m/s</span></div><div class="weather-detail-item"><span class="detail-icon">🌡️</span><span class="detail-label">Pressure</span><span class="detail-value">${pressure} hPa</span></div><div class="weather-detail-item"><span class="detail-icon">🌅</span><span class="detail-label">Sunrise</span><span class="detail-value">${sunrise}</span></div><div class="weather-detail-item"><span class="detail-icon">🌇</span><span class="detail-label">Sunset</span><span class="detail-value">${sunset}</span></div></div><div id="aqi" class="hidden"></div><div class="forecast-container"><h3>5-Day Forecast</h3><div class="forecast-items"></div></div><p class="last-updated">Last updated: ${new Date().toLocaleTimeString()}</p>`;
    weatherResultDiv.classList.remove("hidden");
  } else {
    weatherResultDiv.innerHTML = "";
    showNotification("Error displaying weather data.");
    console.error("API Response Error:", data);
  }
}
async function getAQI(lat, lon) {
  const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  try {
    const response = await fetch(aqiUrl);
    if (!response.ok) {
      throw new Error(
        `AQI API Error: ${response.status} ${response.statusText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching AQI data:", error);
    throw error;
  }
}
function displayAQIData(aqiData) {
  const aqiElement = document.getElementById("aqi");
  if (aqiElement && aqiData.list && aqiData.list.length > 0) {
    const aqiValue = aqiData.list[0].main.aqi;
    let aqiText = "";
    let aqiClass = "";
    switch (aqiValue) {
      case 1:
        aqiText = "Good";
        aqiClass = "aqi-good";
        break;
      case 2:
        aqiText = "Fair";
        aqiClass = "aqi-fair";
        break;
      case 3:
        aqiText = "Moderate";
        aqiClass = "aqi-moderate";
        break;
      case 4:
        aqiText = "Poor";
        aqiClass = "aqi-poor";
        break;
      case 5:
        aqiText = "Very Poor";
        aqiClass = "aqi-very-poor";
        break;
      default:
        aqiText = "Unknown";
        aqiClass = "";
    }
    aqiElement.innerHTML = `<h3>Air Quality</h3><div class="aqi-indicator ${aqiClass}"><div class="aqi-value">${aqiValue}</div><div class="aqi-text">${aqiText}</div></div><div class="aqi-description"><p>${getAQIDescription(
      aqiValue
    )}</p></div>`;
    aqiElement.classList.remove("hidden");
  }
}
function getAQIDescription(aqiValue) {
  switch (aqiValue) {
    case 1:
      return "Air quality is considered satisfactory, and air pollution poses little or no risk.";
    case 2:
      return "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.";
    case 3:
      return "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
    case 4:
      return "Health warnings of emergency conditions. The entire population is more likely to be affected.";
    case 5:
      return "Health alert: everyone may experience more serious health effects.";
    default:
      return "Air quality information is not available.";
  }
}
function addRecentSearch(city) {
  let recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || [];
  if (recentSearches.includes(city)) {
    recentSearches = recentSearches.filter((item) => item !== city);
  }
  recentSearches.unshift(city);
  if (recentSearches.length > 5) {
    recentSearches = recentSearches.slice(0, 5);
  }
  localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  updateRecentSearches();
}
function updateRecentSearches() {
  const recentSearches =
    JSON.parse(localStorage.getItem("recentSearches")) || [];
  const recentSearchesContainer = document.getElementById("recent-searches");
  if (recentSearchesContainer) {
    recentSearchesContainer.innerHTML = "";
    if (recentSearches.length > 0) {
      const heading = document.createElement("h3");
      heading.textContent = "Recent Searches";
      recentSearchesContainer.appendChild(heading);
      const searchList = document.createElement("div");
      searchList.className = "recent-search-list";
      recentSearches.forEach((city) => {
        const searchItem = document.createElement("div");
        searchItem.className = "recent-search-item";
        searchItem.textContent = city;
        searchItem.addEventListener("click", () => {
          cityInput.value = city;
          fetchWeatherWithLoading(city);
        });
        searchList.appendChild(searchItem);
      });
      recentSearchesContainer.appendChild(searchList);
    }
  }
}
function logSearchResultJson(data) {
  console.log(JSON.stringify(data, null, 2));
}
document.addEventListener("DOMContentLoaded", () => {
  fetch("countries.json")
    .then((response) => response.json())
    .then((data) => {
      allCities = Object.values(data).flat();
      cityList = allCities.map((city) => ({
        name: city,
        lower: city.toLowerCase(),
      }));
    })
    .catch((error) => {
      console.error(error);
    });
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    body.classList.add("dark-theme");
    themeToggle.textContent = "🌙 Dark Mode";
  }
  const recentSearchesContainer = document.createElement("div");
  recentSearchesContainer.id = "recent-searches";
  recentSearchesContainer.className = "recent-searches";
  const container = document.querySelector(".container") || document.body;
  container.appendChild(recentSearchesContainer);
  updateRecentSearches();
});
