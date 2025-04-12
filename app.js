const express = require("express");
const path = require("path");
require("dotenv").config();
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { marked } = require("marked");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// API endpoint for weather data
app.get("/api/weather", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }
    const weatherData = await getWeather(lat, lon);
    res.json(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// API endpoint for AQI data
app.get("/api/aqi", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }
    const aqiData = await getAQI(lat, lon);
    res.json(aqiData);
  } catch (error) {
    console.error("Error fetching AQI data:", error);
    res.status(500).json({ error: "Failed to fetch AQI data" });
  }
});

// API endpoint for geocoding
app.get("/api/geocode", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ error: "City name is required" });
    }
    const API_KEY = process.env.API_KEY;
    const response = await axios.get(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city
      )}&limit=1&appid=${API_KEY}`
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error in geocoding:", error);
    res.status(500).json({ error: "Failed to geocode city" });
  }
});

// API endpoint for reverse geocoding
app.get("/api/reverse-geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }
    const API_KEY = process.env.API_KEY;
    const response = await axios.get(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error in reverse geocoding:", error);
    res.status(500).json({ error: "Failed to reverse geocode coordinates" });
  }
});

// API endpoint for forecast data
app.get("/api/forecast", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }
    const forecastData = await getForecast(lat, lon);
    res.json(forecastData);
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    res.status(500).json({ error: "Failed to fetch forecast data" });
  }
});

// API endpoint for chatbot
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message, weatherData } = req.body;

    const chatSession = model.startChat({
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
      history: [],
    });

    let prompt;
    if (weatherData) {
      // Create a more detailed weather context
      const weather = weatherData.weather;
      const aqi = weatherData.aqi;

      const weatherContext = {
        temperature: weather.main.temp,
        feels_like: weather.main.feels_like,
        humidity: weather.main.humidity,
        wind_speed: weather.wind.speed,
        description: weather.weather[0].description,
        aqi_level: aqi.list[0].main.aqi,
        location: weather.name,
        country: weather.sys.country,
        pressure: weather.main.pressure,
        visibility: weather.visibility,
        clouds: weather.clouds.all,
        sunrise: new Date(weather.sys.sunrise * 1000).toLocaleTimeString(),
        sunset: new Date(weather.sys.sunset * 1000).toLocaleTimeString(),
      };

      prompt = `You are a helpful and friendly weather assistant. The current weather data is:
      - Location: ${weatherContext.location}, ${weatherContext.country}
      - Temperature: ${weatherContext.temperature}°C
      - Feels like: ${weatherContext.feels_like}°C
      - Humidity: ${weatherContext.humidity}%
      - Wind Speed: ${weatherContext.wind_speed} m/s
      - Conditions: ${weatherContext.description}
      - Air Quality Index: ${weatherContext.aqi_level}
      - Pressure: ${weatherContext.pressure} hPa
      - Visibility: ${weatherContext.visibility} meters
      - Cloud Coverage: ${weatherContext.clouds}%
      - Sunrise: ${weatherContext.sunrise}
      - Sunset: ${weatherContext.sunset}

      User message: ${message}

      Please provide a helpful and natural response about the weather based on this data. Use markdown formatting to make your response more readable:
      - Use **bold** for important information like temperature values
      - Use *italic* for emphasis
      - Use \`code\` for numerical values
      - Use lists for multiple points
      - Use > for important warnings or advice
      - Format temperature values like \`25°C\`
      - Use emojis where appropriate (e.g., ☀️ for sunny, 🌧️ for rain, etc.)
      
      If the user is asking about weather in a location, focus on providing a comprehensive but concise weather report.
      If they're asking about specific aspects (temperature, humidity, etc.), provide more detailed information about that aspect.
      If they're asking about general weather concepts (like coldest/hottest places), provide accurate information based on your knowledge.
      Include relevant advice based on the weather conditions (e.g., umbrella needed, sun protection, etc.).
      Keep your response friendly and conversational.
      Always mention the location name when providing weather information.`;
    } else {
      prompt = `You are a helpful weather assistant. The user hasn't searched for any weather data yet. 
      User message: ${message}
      Please provide a friendly response and guide them to ask about weather in a specific location.
      You can also answer general weather-related questions based on your knowledge.`;
    }

    const result = await chatSession.sendMessage(prompt);
    const formattedResponse = marked(result.response.text());
    res.json({ response: formattedResponse });
  } catch (error) {
    console.error("Error in chatbot:", error);
    res.status(500).json({ error: "Failed to process chatbot request" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

async function getWeather(lat, lon) {
  const API_KEY = process.env.API_KEY;
  const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
  try {
    const response = await axios.get(
      `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
}

async function getAQI(lat, lon) {
  const API_KEY = process.env.API_KEY;
  const BASE_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
  try {
    const response = await axios.get(
      `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching AQI data:", error);
    throw error;
  }
}

async function getForecast(lat, lon) {
  const API_KEY = process.env.API_KEY;
  const BASE_URL = "https://api.openweathermap.org/data/2.5/forecast";
  try {
    const response = await axios.get(
      `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    throw error;
  }
}
