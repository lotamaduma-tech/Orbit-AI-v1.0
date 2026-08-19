// ========================================
// ORBIT AI LIVE CLOCK
// ========================================

const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

function updateClock() {

    const now = new Date();

    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, "0");
    let seconds = String(now.getSeconds()).padStart(2, "0");

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    if (timeEl) {
        timeEl.textContent =
            `${displayHour}:${minutes}:${seconds} ${period}`;
    }

    if (dateEl) {
        dateEl.textContent =
            now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });
    }

    if (greetingEl) {

        let greeting = "Good Evening";

        if (hours >= 5 && hours < 12) {

            greeting = "Good Morning";

        } else if (hours >= 12 && hours < 17) {

            greeting = "Good Afternoon";

        }

        greetingEl.textContent = `${greeting}, Kingsley`;

    }

}

updateClock();

setInterval(updateClock, 1000);

// ========================================
// CHAT
// ========================================

const chat = document.getElementById("chat-window");

function addMessage(text, sender) {

    if (!chat) return;

    const div = document.createElement("div");

    div.className = `message ${sender}`;

    div.innerText = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

}

// Initial message

addMessage("Orbit AI Online.", "orbit");

/* ===========================================================
   ORBIT AI
   SHARED SYSTEM MONITOR
=========================================================== */

(function () {

    "use strict";


    /* =======================================================
       ORBIT SYSTEM OBJECT
    ======================================================= */

    window.OrbitSystem = {

        storage: null,
        network: null,
        device: null,

        /* ===================================================
           INITIALIZE
        =================================================== */

        init() {

            this.updateStorage();
            this.updateNetwork();
            this.updateDevice();

            /*
                Refresh information periodically.
                Storage information doesn't need to be
                checked every second.
            */

            setInterval(() => {
                this.updateStorage();
            }, 10000);


            /*
                Network information can change quickly.
            */

            setInterval(() => {
                this.updateNetwork();
            }, 5000);


            /*
                Listen for browser network changes.
            */

            window.addEventListener(
                "online",
                () => this.updateNetwork()
            );


            window.addEventListener(
                "offline",
                () => this.updateNetwork()
            );


            /*
                Connection information changes.
            */

            if (
                navigator.connection ||
                navigator.mozConnection ||
                navigator.webkitConnection
            ) {

                const connection =
                    navigator.connection ||
                    navigator.mozConnection ||
                    navigator.webkitConnection;

                connection.addEventListener(
                    "change",
                    () => this.updateNetwork()
                );
            }

        },


        /* ===================================================
           STORAGE
        =================================================== */

        async updateStorage() {

            if (!navigator.storage ||
                !navigator.storage.estimate) {

                this.storage = {
                    supported: false
                };

                return;
            }


            try {

                const estimate =
                    await navigator.storage.estimate();


                const usage =
                    estimate.usage || 0;


                const quota =
                    estimate.quota || 0;


                const usedMB =
                    usage / (1024 * 1024);


                const quotaGB =
                    quota / (1024 * 1024 * 1024);


                const usedGB =
                    usage / (1024 * 1024 * 1024);


                const percentage =
                    quota > 0
                        ? (usage / quota) * 100
                        : 0;


                this.storage = {

                    supported: true,

                    usedBytes: usage,

                    quotaBytes: quota,

                    usedMB: usedMB,

                    usedGB: usedGB,

                    quotaGB: quotaGB,

                    percentage: percentage

                };


                this.dispatch(
                    "storageUpdate",
                    this.storage
                );

            } catch (error) {

                console.warn(
                    "Orbit: Unable to read storage information.",
                    error
                );

            }

        },


        /* ===================================================
           NETWORK
        =================================================== */

        updateNetwork() {

            const online =
                navigator.onLine;


            const connection =
                navigator.connection ||
                navigator.mozConnection ||
                navigator.webkitConnection;


            let networkType =
                "Unknown";


            let downlink =
                null;


            let effectiveType =
                null;


            let rtt =
                null;


            if (connection) {

                networkType =
                    connection.type ||
                    "Unknown";


                downlink =
                    connection.downlink ||
                    null;


                effectiveType =
                    connection.effectiveType ||
                    null;


                rtt =
                    connection.rtt ||
                    null;

            }


            this.network = {

                online: online,

                type: networkType,

                downlink: downlink,

                effectiveType: effectiveType,

                rtt: rtt

            };


            this.dispatch(
                "networkUpdate",
                this.network
            );

        },


        /* ===================================================
           DEVICE INFORMATION
        =================================================== */

        updateDevice() {

            this.device = {

                platform:
                    navigator.platform ||
                    "Unknown",

                language:
                    navigator.language ||
                    "Unknown",

                cookies:
                    navigator.cookieEnabled,

                online:
                    navigator.onLine,

                userAgent:
                    navigator.userAgent

            };


            this.dispatch(
                "deviceUpdate",
                this.device
            );

        },


        /* ===================================================
           FORMAT STORAGE
        =================================================== */

        formatStorage(bytes) {

            if (!bytes || bytes <= 0) {
                return "0 MB";
            }


            const GB =
                1024 * 1024 * 1024;


            const MB =
                1024 * 1024;


            if (bytes >= GB) {

                return (
                    (bytes / GB).toFixed(2)
                    + " GB"
                );

            }


            return (
                (bytes / MB).toFixed(1)
                + " MB"
            );

        },


        /* ===================================================
           GET NETWORK QUALITY
        =================================================== */

        getNetworkQuality() {

            if (!navigator.onLine) {
                return "Offline";
            }


            const connection =
                navigator.connection ||
                navigator.mozConnection ||
                navigator.webkitConnection;


            if (!connection) {
                return "Connected";
            }


            switch (connection.effectiveType) {

                case "slow-2g":
                    return "Very Poor";

                case "2g":
                    return "Poor";

                case "3g":
                    return "Moderate";

                case "4g":
                    return "Good";

                default:
                    return "Connected";

            }

        },


        /* ===================================================
           STATUS
        =================================================== */

        getSystemStatus() {

            if (!navigator.onLine) {

                return {
                    status: "Offline",
                    className: "offline"
                };

            }


            return {
                status: "Operational",
                className: "online"
            };

        },


        /* ===================================================
           EVENT SYSTEM
        =================================================== */

        dispatch(eventName, data) {

            window.dispatchEvent(
                new CustomEvent(
                    `orbit:${eventName}`,
                    {
                        detail: data
                    }
                )
            );

        }

    };


    /* =======================================================
       START ORBIT SYSTEM
    ======================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            window.OrbitSystem.init();

        }
    );


})();

/* ===========================================================
   ORBIT WEATHER
=========================================================== */

window.OrbitWeather = {

    data: null,


    async init() {

        try {

            if (!navigator.geolocation) {

                console.warn(
                    "Geolocation is not supported by this browser."
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                async (position) => {

                    const latitude =
                        position.coords.latitude;

                    const longitude =
                        position.coords.longitude;


                    await this.getWeather(
                        latitude,
                        longitude
                    );

                },

                (error) => {

                    console.warn(
                        "Unable to get location:",
                        error.message
                    );

                },

                {
                    enableHighAccuracy: false,

                    timeout: 10000,

                    maximumAge: 300000
                }

            );

        } catch (error) {

            console.error(
                "Orbit Weather Error:",
                error
            );

        }

    },


    async getWeather(latitude, longitude) {

        try {

            const url =
                `https://api.open-meteo.com/v1/forecast` +
                `?latitude=${latitude}` +
                `&longitude=${longitude}` +
                `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
                `&timezone=auto`;


            const response =
                await fetch(url);


            if (!response.ok) {

                throw new Error(
                    "Weather request failed."
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
                    current.weather_code,

                condition:
                    this.getCondition(
                        current.weather_code
                    ),

                latitude:
                    latitude,

                longitude:
                    longitude

            };


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
                "Orbit Weather Error:",
                error
            );

        }

    },


    getCondition(code) {

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

};

document.addEventListener("DOMContentLoaded", () => {

    window.OrbitSystem.init();

    window.OrbitWeather.init();

});