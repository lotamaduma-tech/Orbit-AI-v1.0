"use strict";

/* =========================================================
   ORBIT AI — WEATHER
   Location + Live Weather
   ========================================================= */

window.OrbitWeatherPage = {

    data: null,
    location: null,

    /* =====================================================
       START
       ===================================================== */

    init() {

        console.log("Orbit Weather: Starting...");

        this.setStatus("Getting your location...");

        if (!navigator.geolocation) {

            this.showError(
                "Geolocation is not supported by this browser."
            );

            return;
        }

        this.requestLocation();
    },


    /* =====================================================
       REQUEST USER LOCATION
       ===================================================== */

    requestLocation() {

        navigator.geolocation.getCurrentPosition(

            (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;

                this.location = {
                    latitude,
                    longitude
                };

                console.log(
                    "Orbit Weather: Location found",
                    latitude,
                    longitude
                );

                this.setStatus("Getting weather...");

                this.getWeather(
                    latitude,
                    longitude
                );
            },

            (error) => {

                console.error(
                    "Orbit Weather: Location error",
                    error
                );

                let message =
                    "Unable to access your location.";

                if (error.code === 1) {

                    message =
                        "Location permission was denied.";

                } else if (error.code === 2) {

                    message =
                        "Your location could not be detected.";

                } else if (error.code === 3) {

                    message =
                        "Location request timed out.";
                }

                this.showError(message);
            },

            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 300000
            }
        );
    },


    /* =====================================================
       GET WEATHER FROM OPEN-METEO
       ===================================================== */

    async getWeather(latitude, longitude) {

        try {

            const url =
                "https://api.open-meteo.com/v1/forecast" +
                `?latitude=${latitude}` +
                `&longitude=${longitude}` +
                "&current=" +
                "temperature_2m," +
                "relative_humidity_2m," +
                "weather_code," +
                "wind_speed_10m" +
                "&timezone=auto";

            console.log(
                "Orbit Weather: Requesting weather..."
            );

            const response =
                await fetch(url);

            if (!response.ok) {

                throw new Error(
                    `Weather API error: ${response.status}`
                );
            }

            const result =
                await response.json();

            if (!result.current) {

                throw new Error(
                    "Weather data is unavailable."
                );
            }

            const current =
                result.current;

            this.data = {

                temperature:
                    current.temperature_2m,

                humidity:
                    current.relative_humidity_2m,

                windSpeed:
                    current.wind_speed_10m,

                weatherCode:
                    current.weather_code
            };

            console.log(
                "Orbit Weather:",
                this.data
            );

            this.updateInterface();

        } catch (error) {

            console.error(
                "Orbit Weather failed:",
                error
            );

            this.showError(
                "Weather information is unavailable."
            );
        }
    },


    /* =====================================================
       UPDATE WEATHER INTERFACE
       ===================================================== */

    updateInterface() {

        const weather =
            this.data;

        if (!weather) {
            return;
        }

        const condition =
            this.getWeatherCondition(
                weather.weatherCode
            );

        const icon =
            this.getWeatherIcon(
                weather.weatherCode
            );


        /* ================================================
           LOCATION
           ================================================ */

        const location =
            document.getElementById(
                "weather-location"
            );

        if (location) {

            location.textContent =
                "Current location";
        }


        /* ================================================
           MAIN TEMPERATURE
           ================================================ */

        const temperature =
            document.getElementById(
                "weather-temperature"
            );

        if (temperature) {

            temperature.textContent =
                `${Math.round(weather.temperature)}°C`;
        }


        /* ================================================
           MAIN CONDITION
           ================================================ */

        const conditionElement =
            document.getElementById(
                "weather-condition"
            );

        if (conditionElement) {

            conditionElement.textContent =
                condition;
        }


        /* ================================================
           MAIN HUMIDITY
           ================================================ */

        const humidity =
            document.getElementById(
                "weather-humidity"
            );

        if (humidity) {

            humidity.textContent =
                `${Math.round(weather.humidity)}%`;
        }


        /* ================================================
           MAIN WIND
           ================================================ */

        const wind =
            document.getElementById(
                "weather-wind"
            );

        if (wind) {

            wind.textContent =
                `${Math.round(weather.windSpeed)} km/h`;
        }


        /* ================================================
           CONDITION DETAIL
           ================================================ */

        const conditionDetail =
            document.getElementById(
                "weather-condition-detail"
            );

        if (conditionDetail) {

            conditionDetail.textContent =
                condition;
        }


        /* ================================================
           INFORMATION CARDS
           ================================================ */

        const temperatureInfo =
            document.getElementById(
                "weather-temperature-info"
            );

        if (temperatureInfo) {

            temperatureInfo.textContent =
                `${Math.round(weather.temperature)}°C`;
        }


        const humidityInfo =
            document.getElementById(
                "weather-humidity-info"
            );

        if (humidityInfo) {

            humidityInfo.textContent =
                `${Math.round(weather.humidity)}%`;
        }


        const windInfo =
            document.getElementById(
                "weather-wind-info"
            );

        if (windInfo) {

            windInfo.textContent =
                `${Math.round(weather.windSpeed)} km/h`;
        }


        /* ================================================
           WEATHER ICON
           ================================================ */

        const weatherIcon =
            document.getElementById(
                "weather-icon"
            );

        if (weatherIcon) {

            weatherIcon.className =
                `fa-solid ${icon}`;
        }


        /* ================================================
           STATUS
           ================================================ */

        this.setStatus(
            "Live Weather"
        );
    },


    /* =====================================================
       WEATHER CONDITIONS
       WMO WEATHER CODES
       ===================================================== */

    getWeatherCondition(code) {

        if (code === 0) {
            return "Clear Sky";
        }

        if (
            code === 1 ||
            code === 2
        ) {
            return "Partly Cloudy";
        }

        if (code === 3) {
            return "Overcast";
        }

        if (
            code >= 45 &&
            code <= 48
        ) {
            return "Foggy";
        }

        if (
            code >= 51 &&
            code <= 55
        ) {
            return "Drizzle";
        }

        if (
            code >= 56 &&
            code <= 57
        ) {
            return "Freezing Drizzle";
        }

        if (
            code >= 61 &&
            code <= 65
        ) {
            return "Rain";
        }

        if (
            code >= 66 &&
            code <= 67
        ) {
            return "Freezing Rain";
        }

        if (
            code >= 71 &&
            code <= 75
        ) {
            return "Snow";
        }

        if (code === 77) {
            return "Snow Grains";
        }

        if (
            code >= 80 &&
            code <= 82
        ) {
            return "Rain Showers";
        }

        if (
            code >= 85 &&
            code <= 86
        ) {
            return "Snow Showers";
        }

        if (
            code === 95
        ) {
            return "Thunderstorm";
        }

        if (
            code === 96 ||
            code === 99
        ) {
            return "Thunderstorm with Hail";
        }

        return "Unknown";
    },


    /* =====================================================
       WEATHER ICONS
       ===================================================== */

    getWeatherIcon(code) {

        if (code === 0) {
            return "fa-sun";
        }

        if (
            code === 1 ||
            code === 2
        ) {
            return "fa-cloud-sun";
        }

        if (code === 3) {
            return "fa-cloud";
        }

        if (
            code >= 45 &&
            code <= 48
        ) {
            return "fa-smog";
        }

        if (
            code >= 51 &&
            code <= 57
        ) {
            return "fa-cloud-rain";
        }

        if (
            code >= 61 &&
            code <= 67
        ) {
            return "fa-cloud-showers-heavy";
        }

        if (
            code >= 71 &&
            code <= 77
        ) {
            return "fa-snowflake";
        }

        if (
            code >= 80 &&
            code <= 82
        ) {
            return "fa-cloud-showers-heavy";
        }

        if (
            code >= 85 &&
            code <= 86
        ) {
            return "fa-snowflake";
        }

        if (
            code >= 95 &&
            code <= 99
        ) {
            return "fa-bolt";
        }

        return "fa-cloud";
    },


    /* =====================================================
       STATUS MESSAGE
       ===================================================== */

    setStatus(message) {

        const status =
            document.getElementById(
                "weather-status-text"
            );

        if (status) {

            status.textContent =
                message;
        }
    },


    /* =====================================================
       ERROR HANDLING
       ===================================================== */

    showError(message) {

        console.error(
            "Orbit Weather:",
            message
        );

        const location =
            document.getElementById(
                "weather-location"
            );

        if (location) {

            location.textContent =
                "Location unavailable";
        }


        const condition =
            document.getElementById(
                "weather-condition"
            );

        if (condition) {

            condition.textContent =
                message;
        }


        const conditionDetail =
            document.getElementById(
                "weather-condition-detail"
            );

        if (conditionDetail) {

            conditionDetail.textContent =
                "Unavailable";
        }


        this.setStatus(
            "Weather unavailable"
        );
    }
};


/* =========================================================
   START WEATHER
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        OrbitWeatherPage.init();

    }
);