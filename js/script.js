/* ===========================================================
   ORBIT AI — SHARED.JS
   System + Weather
=========================================================== */

"use strict";


/* ===========================================================
   SYSTEM MONITOR
=========================================================== */

window.OrbitSystem = {

    storage: null,
    network: null,
    device: null,

    init() {

        this.updateStorage();
        this.updateNetwork();
        this.updateDevice();

        setInterval(() => {
            this.updateStorage();
        }, 10000);

        setInterval(() => {
            this.updateNetwork();
        }, 5000);

        window.addEventListener("online", () => {
            this.updateNetwork();
        });

        window.addEventListener("offline", () => {
            this.updateNetwork();
        });

    },


    async updateStorage() {

        if (
            !navigator.storage ||
            !navigator.storage.estimate
        ) {
            return;
        }

        try {

            const data =
                await navigator.storage.estimate();

            this.storage = {

                used: data.usage || 0,

                quota: data.quota || 0

            };

            window.dispatchEvent(
                new CustomEvent(
                    "orbit:storageUpdate",
                    {
                        detail: this.storage
                    }
                )
            );

        } catch (error) {

            console.error(
                "Storage check failed:",
                error
            );

        }

    },


    updateNetwork() {

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        this.network = {

            online: navigator.onLine,

            type:
                connection?.effectiveType ||
                "Unknown",

            speed:
                connection?.downlink ||
                null,

            latency:
                connection?.rtt ||
                null

        };

        window.dispatchEvent(
            new CustomEvent(
                "orbit:networkUpdate",
                {
                    detail: this.network
                }
            )
        );

    },


    updateDevice() {

        this.device = {

            platform:
                navigator.platform ||
                "Unknown",

            language:
                navigator.language ||
                "Unknown"

        };

    }

};


/* ===========================================================
   WEATHER
=========================================================== */

window.OrbitWeather = {

    data: null,


    async init() {

        console.log(
            "Orbit Weather: Starting..."
        );


        if (!navigator.geolocation) {

            this.showError(
                "Location is not supported"
            );

            return;
        }


        navigator.geolocation.getCurrentPosition(

            async (position) => {

                const latitude =
                    position.coords.latitude;

                const longitude =
                    position.coords.longitude;


                console.log(
                    "Orbit Weather: Location found",
                    latitude,
                    longitude
                );


                await this.getWeather(
                    latitude,
                    longitude
                );

            },


            (error) => {

                console.error(
                    "Orbit Weather: Location error",
                    error
                );


                this.showError(
                    "Location permission required"
                );

            },

            {
                enableHighAccuracy: false,

                timeout: 15000,

                maximumAge: 300000

            }

        );

    },


    async getWeather(
        latitude,
        longitude
    ) {

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


            window.dispatchEvent(
                new CustomEvent(
                    "orbit:weatherUpdate",
                    {
                        detail: this.data
                    }
                )
            );


        } catch (error) {

            console.error(
                "Orbit Weather failed:",
                error
            );


            this.showError(
                "Weather unavailable"
            );

        }

    },


    showError(message) {

        window.dispatchEvent(
            new CustomEvent(
                "orbit:weatherError",
                {
                    detail: message
                }
            )
        );

    }

};


/* ===========================================================
   START EVERYTHING
=========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Orbit shared system starting..."
        );


        OrbitSystem.init();

        OrbitWeather.init();

    }
);

/* ===========================================================
   ORBIT AI — DASHBOARD WEATHER
=========================================================== */

window.addEventListener(
    "orbit:weatherUpdate",
    (event) => {

        const weather =
            event.detail;


        const temperature =
            document.getElementById(
                "weather-temperature"
            );


        const condition =
            document.getElementById(
                "weather-condition"
            );


        const humidity =
            document.getElementById(
                "weather-humidity"
            );


        const wind =
            document.getElementById(
                "weather-wind"
            );


        const location =
            document.getElementById(
                "weather-location"
            );


        const icon =
            document.getElementById(
                "weather-icon"
            );


        if (temperature) {

            temperature.textContent =
                `${Math.round(
                    weather.temperature
                )}°C`;

        }


        if (condition) {

            condition.textContent =
                getWeatherCondition(
                    weather.weatherCode
                );

        }


        if (humidity) {

            humidity.textContent =
                `${weather.humidity}%`;

        }


        if (wind) {

            wind.textContent =
                `${weather.windSpeed} km/h`;

        }


        if (location) {

            location.textContent =
                "Current location";

        }


        if (icon) {

            icon.className =
                `fa-solid ${
                    getWeatherIcon(
                        weather.weatherCode
                    )
                }`;

        }

    }
);


/* ===========================================================
   WEATHER CONDITION
=========================================================== */

function getWeatherCondition(code) {

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
        return "Cloudy";
    }

    if (
        code >= 45 &&
        code <= 48
    ) {
        return "Foggy";
    }

    if (
        code >= 51 &&
        code <= 67
    ) {
        return "Rain";
    }

    if (
        code >= 71 &&
        code <= 77
    ) {
        return "Snow";
    }

    if (
        code >= 80 &&
        code <= 82
    ) {
        return "Rain Showers";
    }

    if (
        code >= 95 &&
        code <= 99
    ) {
        return "Thunderstorm";
    }

    return "Unknown";

}


/* ===========================================================
   WEATHER ICON
=========================================================== */

function getWeatherIcon(code) {

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
        code <= 67
    ) {
        return "fa-cloud-rain";
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
        code >= 95 &&
        code <= 99
    ) {
        return "fa-bolt";
    }

    return "fa-cloud";

}


/* ===========================================================
   WEATHER ERROR
=========================================================== */

window.addEventListener(
    "orbit:weatherError",
    (event) => {

        const condition =
            document.getElementById(
                "weather-condition"
            );


        const location =
            document.getElementById(
                "weather-location"
            );


        if (condition) {

            condition.textContent =
                event.detail;

        }


        if (location) {

            location.textContent =
                "Unable to detect location";

        }

    }
);