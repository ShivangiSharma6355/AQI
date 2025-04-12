// DOM Elements
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const locationButton = document.getElementById("location-button");
const cityName = document.getElementById("city-name");
const currentDate = document.getElementById("current-date");
const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weather-description");
const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const aqiValue = document.getElementById("aqi-value");
const aqiDescription = document.getElementById("aqi-description");
const aqiAdvice = document.getElementById("aqi-advice");
const searchSuggestions = document.getElementById("search-suggestions");
const recentSearchesList = document.getElementById("recent-searches-list");
const loadingIndicator = document.getElementById("loading");
const forecastContainer = document.getElementById("forecast-container");
const chatbotBubble = document.getElementById("chatbot-bubble");
const chatbotContainer = document.getElementById("chatbot-container");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotMessages = document.getElementById("chatbot-messages");
const chatbotInput = document.getElementById("chatbot-input-field");
const chatbotSend = document.getElementById("chatbot-send");

// Constants
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_DELAY = 300;

// Add at the top with other DOM elements
const weatherAnimation = new WeatherAnimation();
let currentWeatherData = null;

// Add typing indicator element
const typingIndicator = document.createElement("div");
typingIndicator.className = "chat-message bot-message typing-indicator";
typingIndicator.innerHTML =
  '<div class="typing-dots"><span></span><span></span><span></span></div>';
chatbotMessages.appendChild(typingIndicator);
typingIndicator.style.display = "none";

// Add at the top with other variables
let chatSession = {
  context: {},
  weatherRequested: false,
};

// Event Listeners
searchButton.addEventListener("click", handleSearch);
locationButton.addEventListener("click", handleLocationRequest);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSearch();
});
searchInput.addEventListener(
  "input",
  debounce(handleSearchInput, DEBOUNCE_DELAY)
);
document.addEventListener("click", (e) => {
  if (!searchSuggestions.contains(e.target) && e.target !== searchInput) {
    searchSuggestions.classList.remove("active");
  }
});
chatbotBubble.addEventListener("click", toggleChatbot);
chatbotClose.addEventListener("click", toggleChatbot);
chatbotSend.addEventListener("click", handleChatbotSend);
chatbotInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleChatbotSend();
});

// Initialize the app
function init() {
  updateDateTime();
  setInterval(updateDateTime, 60000); // Update time every minute
  loadRecentSearches();
}

// Update date and time
function updateDateTime() {
  const now = new Date();
  currentDate.textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Debounce function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Handle search input for suggestions
async function handleSearchInput() {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    searchSuggestions.classList.remove("active");
    return;
  }

  try {
    const cities = await getCitySuggestions(query);
    displaySearchSuggestions(cities);
  } catch (error) {
    console.error("Error getting city suggestions:", error);
  }
}

// Get city suggestions
async function getCitySuggestions(query) {
  try {
    const response = await fetch(
      `/api/geocode?city=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.slice(0, 5); // Limit to 5 suggestions
  } catch (error) {
    console.error("Error fetching city suggestions:", error);
    return [];
  }
}

// Display search suggestions
function displaySearchSuggestions(cities) {
  if (!cities.length) {
    searchSuggestions.classList.remove("active");
    return;
  }

  searchSuggestions.innerHTML = cities
    .map(
      (city) => `
        <div class="suggestion-item" data-lat="${city.lat}" data-lon="${
        city.lon
      }">
            ${city.name}, ${city.country}${city.state ? `, ${city.state}` : ""}
        </div>
    `
    )
    .join("");

  searchSuggestions.classList.add("active");

  // Add click event listeners to suggestions
  const suggestions =
    searchSuggestions.getElementsByClassName("suggestion-item");
  Array.from(suggestions).forEach((suggestion) => {
    suggestion.addEventListener("click", () => {
      const lat = suggestion.dataset.lat;
      const lon = suggestion.dataset.lon;
      const cityText = suggestion.textContent.trim();
      searchInput.value = cityText;
      searchSuggestions.classList.remove("active");
      fetchAndDisplayWeatherData(lat, lon);
      cityName.textContent = cityText;
      addToRecentSearches({ name: cityText, lat, lon });
    });
  });
}

// Handle search button click
async function handleSearch() {
  const city = searchInput.value.trim();
  if (!city) return;

  showLoading();
  try {
    const coords = await getCoordinates(city);
    if (coords) {
      await fetchAndDisplayWeatherData(coords.lat, coords.lon);
      cityName.textContent = city;
      addToRecentSearches({ name: city, lat: coords.lat, lon: coords.lon });
    }
  } catch (error) {
    console.error("Error in search:", error);
    alert("Error searching for city. Please try again.");
  } finally {
    hideLoading();
  }
}

// Handle location button click
async function handleLocationRequest() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  showLoading();
  try {
    const position = await getCurrentPosition();
    const { latitude: lat, longitude: lon } = position.coords;
    await fetchAndDisplayWeatherData(lat, lon);
    const cityData = await reverseGeocode(lat, lon);
    cityName.textContent = cityData;
    addToRecentSearches({ name: cityData, lat, lon });
  } catch (error) {
    console.error("Error getting location:", error);
    alert("Error getting your location. Please try searching instead.");
  } finally {
    hideLoading();
  }
}

// Recent searches management
function loadRecentSearches() {
  const searches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
  displayRecentSearches(searches);
}

function addToRecentSearches(search) {
  let searches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
  searches = [search, ...searches.filter((s) => s.name !== search.name)].slice(
    0,
    MAX_RECENT_SEARCHES
  );
  localStorage.setItem("recentSearches", JSON.stringify(searches));
  displayRecentSearches(searches);
}

function displayRecentSearches(searches) {
  recentSearchesList.innerHTML = searches
    .map(
      (search) => `
        <div class="recent-search-item" data-lat="${search.lat}" data-lon="${search.lon}">
            ${search.name}
        </div>
    `
    )
    .join("");

  // Add click event listeners
  const items = recentSearchesList.getElementsByClassName("recent-search-item");
  Array.from(items).forEach((item) => {
    item.addEventListener("click", () => {
      const { lat, lon } = item.dataset;
      const cityText = item.textContent.trim();
      searchInput.value = cityText;
      fetchAndDisplayWeatherData(lat, lon);
      cityName.textContent = cityText;
    });
  });
}

// Loading indicator
function showLoading() {
  loadingIndicator.style.display = "flex";
}

function hideLoading() {
  loadingIndicator.style.display = "none";
}

// Update background based on weather
function updateBackgroundBasedOnWeather(weatherCode) {
  // Remove all weather-related classes
  document.body.className = "";

  // Start weather animation
  weatherAnimation.setWeather(weatherCode);
}

// Get current position
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

// Get coordinates from city name
async function getCoordinates(city) {
  try {
    const response = await fetch(
      `/api/geocode?city=${encodeURIComponent(city)}`
    );
    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon,
      };
    }
    throw new Error("City not found");
  } catch (error) {
    console.error("Error getting coordinates:", error);
    throw error;
  }
}

// Reverse geocode coordinates to city name
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
    const data = await response.json();
    if (data.length > 0) {
      return data[0].name;
    }
    return "Unknown Location";
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
    return "Unknown Location";
  }
}

// Fetch weather and AQI data
async function fetchAndDisplayWeatherData(lat, lon) {
  showLoading();
  try {
    const [weatherResponse, aqiResponse] = await Promise.all([
      fetch(`/api/weather?lat=${lat}&lon=${lon}`),
      fetch(`/api/aqi?lat=${lat}&lon=${lon}`),
    ]);

    const weatherData = await weatherResponse.json();
    const aqiData = await aqiResponse.json();

    // Store the current weather data
    currentWeatherData = {
      weather: weatherData,
      aqi: aqiData,
    };

    updateWeatherUI(weatherData);
    updateAQIUI(aqiData);
    updateBackgroundBasedOnWeather(weatherData.weather[0].icon);
    await fetchAndDisplayForecast(lat, lon);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  } finally {
    hideLoading();
  }
}

// Update weather UI
function updateWeatherUI(data) {
  const iconCode = data.weather[0].icon;
  weatherIcon.innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="Weather icon">`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  weatherDescription.textContent = data.weather[0].description;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${data.wind.speed} m/s`;
}

// Update AQI UI
function updateAQIUI(data) {
  const aqi = data.list[0].main.aqi;
  aqiValue.textContent = aqi;

  const aqiInfo = getAQIInfo(aqi);
  aqiDescription.textContent = aqiInfo.description;
  aqiAdvice.textContent = aqiInfo.advice;

  // Remove all existing AQI classes
  aqiValue.className = "";
  // Add the appropriate AQI class
  aqiValue.classList.add(aqiInfo.className);
}

// Get AQI information based on index
function getAQIInfo(aqi) {
  const aqiData = {
    1: {
      description: "Good",
      advice:
        "Air quality is satisfactory, and air pollution poses little or no risk.",
      className: "aqi-good",
    },
    2: {
      description: "Moderate",
      advice:
        "Air quality is acceptable. However, there may be a risk for some people.",
      className: "aqi-moderate",
    },
    3: {
      description: "Unhealthy for Sensitive Groups",
      advice: "Members of sensitive groups may experience health effects.",
      className: "aqi-unhealthy-sensitive",
    },
    4: {
      description: "Unhealthy",
      advice: "Everyone may begin to experience health effects.",
      className: "aqi-unhealthy",
    },
    5: {
      description: "Very Unhealthy",
      advice:
        "Health warnings of emergency conditions. Entire population is likely to be affected.",
      className: "aqi-very-unhealthy",
    },
  };

  return (
    aqiData[aqi] || {
      description: "Hazardous",
      advice:
        "Health alert: everyone may experience more serious health effects.",
      className: "aqi-hazardous",
    }
  );
}

// Fetch forecast data
async function fetchAndDisplayForecast(lat, lon) {
  try {
    const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
    const data = await response.json();
    displayForecast(data);
  } catch (error) {
    console.error("Error fetching forecast:", error);
  }
}

function displayForecast(data) {
  const dailyForecasts = processForecastData(data.list);
  forecastContainer.innerHTML = dailyForecasts
    .map(
      (day) => `
        <div class="forecast-card glass">
            <div class="forecast-date">${formatDate(day.dt)}</div>
            <div class="forecast-icon">
                <img src="https://openweathermap.org/img/wn/${
                  day.weather[0].icon
                }@2x.png" alt="Weather icon">
            </div>
            <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
            <div class="forecast-description">${
              day.weather[0].description
            }</div>
        </div>
    `
    )
    .join("");
}

function processForecastData(forecastList) {
  const dailyData = {};
  forecastList.forEach((forecast) => {
    const date = new Date(forecast.dt * 1000).toLocaleDateString();
    if (!dailyData[date] || new Date(forecast.dt * 1000).getHours() === 12) {
      dailyData[date] = forecast;
    }
  });
  return Object.values(dailyData).slice(0, 5);
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Chatbot functionality
function toggleChatbot() {
  chatbotContainer.classList.toggle("active");
  if (
    chatbotContainer.classList.contains("active") &&
    chatbotMessages.children.length === 0
  ) {
    addBotMessage(`
      👋 **Hello!** I'm your weather assistant. I can help you with:
      * Current weather conditions
      * Temperature and feels like temperature
      * Humidity and wind speed
      * Air quality information
      * Weather forecasts
      
      You can ask me things like:
      * "What's the weather in London?"
      * "Tell me the temperature in Tokyo"
      * "How's the weather in New York?"
      
      Just ask me about any location! 🌤️
    `);
  }
}

function handleChatbotSend() {
  const message = chatbotInput.value.trim();
  if (!message) return;

  addUserMessage(message);
  chatbotInput.value = "";
  processUserMessage(message);
}

function addUserMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "chat-message user-message";
  messageElement.textContent = message;
  chatbotMessages.appendChild(messageElement);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function addBotMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "chat-message bot-message";
  messageElement.innerHTML = message;
  chatbotMessages.appendChild(messageElement);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Add typing animation function
function showTypingIndicator() {
  typingIndicator.style.display = "block";
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function hideTypingIndicator() {
  typingIndicator.style.display = "none";
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Update processUserMessage function
async function processUserMessage(message) {
  showTypingIndicator();

  try {
    // Check if message contains weather request
    const weatherKeywords = [
      "weather",
      "temperature",
      "forecast",
      "climate",
      "conditions",
      "coldest",
      "hottest",
      "rain",
      "snow",
      "wind",
      "humidity",
    ];
    const locationPattern = /(?:in|at|for|of)\s+([a-zA-Z\s,]+)$/i;
    const hasWeatherRequest = weatherKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
    const locationMatch = message.match(locationPattern);

    if (hasWeatherRequest) {
      let location = null;
      let weatherDataToSend = currentWeatherData;
      let geoData = null; // Declare geoData at the top level of the if block

      if (locationMatch) {
        location = locationMatch[1].trim();
        chatSession.weatherRequested = true;

        // First, show searching message
        await new Promise((resolve) => setTimeout(resolve, 1000));
        addBotMessage(
          `🔍 Searching for weather information in **${location}**...`
        );

        try {
          // Get coordinates for the location
          const geoResponse = await fetch(
            `/api/geocode?city=${encodeURIComponent(location)}`
          );
          geoData = await geoResponse.json(); // Assign to the outer scope variable

          if (geoData && geoData.length > 0) {
            const { lat, lon } = geoData[0];
            // Update the UI with weather data
            await fetchAndDisplayWeatherData(lat, lon);
            // Update the weather data to send
            weatherDataToSend = currentWeatherData;
          } else {
            throw new Error("Location not found");
          }
        } catch (error) {
          hideTypingIndicator();
          addBotMessage(
            `❌ I'm sorry, I couldn't find weather information for **${location}**. Please try another location or check the spelling.`
          );
          return;
        }
      }

      // Get chatbot response with the weather data
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          weatherData: weatherDataToSend,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      hideTypingIndicator();
      addBotMessage(data.response);

      // Update search input with the location if it was found
      if (location && geoData && geoData.length > 0) {
        searchInput.value = location;
        cityName.textContent = location;
        addToRecentSearches({
          name: location,
          lat: geoData[0].lat,
          lon: geoData[0].lon,
        });
      }
    } else {
      // Regular chatbot response
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          weatherData: currentWeatherData,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      hideTypingIndicator();
      addBotMessage(data.response);
    }
  } catch (error) {
    console.error("Error processing message:", error);
    hideTypingIndicator();
    addBotMessage("I'm sorry, I encountered an error. Please try again later.");
  }
}

// Initialize the app
init();
