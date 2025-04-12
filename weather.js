require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5/weather';

async function getWeather(city) {
    try {
        const response = await axios.get(`${BASE_URL}?q=${city}&appid=${API_KEY}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

module.exports = getWeather;