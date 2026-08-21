/* ===========================================================
   ORBIT AI — SHARED.JS
   Shared System + Network + Weather Services
   =========================================================== */

"use strict";


/* ===========================================================
   ORBIT SYSTEM
   =========================================================== */

window.OrbitSystem = {

    storage: null,
    network: null,
    device: null,

    /* =======================================================
       INITIALIZE SYSTEM
       ======================================================= */

    init() {

        this.updateStorage();
        this.updateNetwork();
        this.updateDevice();

        /* Refresh storage periodically */
        setInterval(() => {
            this.updateStorage();
        }, 10000);

        /* Refresh network information */
        setInterval(() => {
            this.updateNetwork();
        }, 5000);

        /* Browser comes online */
        window.addEventListener("online", () => {
            this.updateNetwork();
        });

        /* Browser goes offline */
        window.addEventListener("offline", () => {
            this.updateNetwork();
        });
    },


    /* =======================================================
       STORAGE
       ======================================================= */

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
                "Orbit storage check failed:",
                error
            );

        }
    },


    /* =======================================================
       NETWORK
       ======================================================= */

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


    /* =======================================================
       DEVICE
       ======================================================= */

    updateDevice() {

        this.device = {

            platform:
                navigator.platform ||
                "Unknown",

            language:
                navigator.language ||
                "Unknown",

            screenWidth:
                window.innerWidth,

            screenHeight:
                window.innerHeight

        };
    }

};


/* ===========================================================
   ORBIT WEATHER
   Uses Open-Meteo
   =========================================================== */

window.OrbitWeather = {

    data: null,

    loading: false,


    /* =======================================================
       INITIALIZE WEATHER
       ======================================================= */

    async init() {

        if (this.loading) {
            return;
        }

        this.loading = true;

        console.log(
            "Orbit Weather: Starting..."
        );

        if (!navigator.geolocation) {

            this.loading = false;

            this.showError(
                "Location is not supported by this browser."
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
                    "Orbit Weather: Location detected."
                );

                await this.getWeather(
                    latitude,
                    longitude
                );

                this.loading = false;
            },


            (error) => {

                console.warn(
                    "Orbit Weather: Location unavailable.",
                    error
                );

                this.loading = false;

                this.showError(
                    "Location permission is required."
                );
            },

            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 300000
            }

        );
    },


    /* =======================================================
       GET WEATHER
       ======================================================= */

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
                    "Weather data unavailable."
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
                "Weather is currently unavailable."
            );

        }
    },


    /* =======================================================
       WEATHER ERROR
       ======================================================= */

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
   WEATHER CONDITION
   =========================================================== */

function getWeatherCondition(code) {

    if (code === 0) {
        return "Clear sky";
    }

    if (
        code === 1 ||
        code === 2
    ) {
        return "Partly cloudy";
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
        return "Rain showers";
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
   UPDATE DASHBOARD WEATHER UI
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


        /* TEMPERATURE */

        if (temperature) {

            temperature.textContent =
                `${Math.round(
                    weather.temperature
                )}°C`;

        }


        /* CONDITION */

        if (condition) {

            condition.textContent =
                getWeatherCondition(
                    weather.weatherCode
                );

        }


        /* HUMIDITY */

        if (humidity) {

            humidity.textContent =
                `${weather.humidity}%`;

        }


        /* WIND */

        if (wind) {

            wind.textContent =
                `${Math.round(
                    weather.windSpeed
                )} km/h`;

        }


        /* LOCATION */

        if (location) {

            location.textContent =
                "Current location";

        }


        /* ICON */

        if (icon) {

            icon.className =
                `fa-solid ${getWeatherIcon(
                    weather.weatherCode
                )
                }`;

        }

    }
);


/* ===========================================================
   WEATHER ERROR UI
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
                event.detail ||
                "Weather unavailable";

        }


        if (location) {

            location.textContent =
                "Location unavailable";

        }

    }
);


/* ===========================================================
   NETWORK UI
   =========================================================== */

window.addEventListener(
    "orbit:networkUpdate",
    (event) => {

        const network =
            event.detail;


        const networkElements =
            document.querySelectorAll(
                "[data-orbit-network]"
            );


        networkElements.forEach(
            (element) => {

                if (network.online) {

                    element.textContent =
                        "Online";

                    element.classList.add(
                        "online"
                    );

                    element.classList.remove(
                        "offline"
                    );

                } else {

                    element.textContent =
                        "Offline";

                    element.classList.add(
                        "offline"
                    );

                    element.classList.remove(
                        "online"
                    );

                }

            }
        );

    }
);


/* ===========================================================
   STORAGE UI
   =========================================================== */

window.addEventListener(
    "orbit:storageUpdate",
    (event) => {

        const storage =
            event.detail;


        const usedElement =
            document.querySelector(
                "[data-orbit-storage-used]"
            );


        const quotaElement =
            document.querySelector(
                "[data-orbit-storage-quota]"
            );


        const progressElement =
            document.querySelector(
                "[data-orbit-storage-progress]"
            );


        if (!storage.quota) {
            return;
        }


        const usedGB =
            storage.used /
            (1024 * 1024 * 1024);


        const quotaGB =
            storage.quota /
            (1024 * 1024 * 1024);


        const percentage =
            Math.min(
                100,
                (storage.used /
                    storage.quota) *
                100
            );


        if (usedElement) {

            usedElement.textContent =
                `${usedGB.toFixed(1)} GB`;

        }


        if (quotaElement) {

            quotaElement.textContent =
                `${quotaGB.toFixed(1)} GB`;

        }


        if (progressElement) {

            progressElement.style.width =
                `${percentage}%`;

        }

    }
);


/* ===========================================================
   START SHARED SERVICES
   =========================================================== */

function initializeOrbitShared() {

    console.log(
        "Orbit shared services starting..."
    );


    if (window.OrbitSystem) {

        window.OrbitSystem.init();

    }


    if (window.OrbitWeather) {

        window.OrbitWeather.init();

    }

}


/* ===========================================================
   DOM READY
   =========================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitShared
    );

} else {

    initializeOrbitShared();

}