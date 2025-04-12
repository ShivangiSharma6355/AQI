require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5/air_pollution';

async function getAQI(lat, lon) {
    try {
        const response = await axios.get(`${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching AQI data:', error);
        throw error;
    }
}

module.exports = getAQI;