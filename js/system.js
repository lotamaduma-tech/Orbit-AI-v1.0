/* ===========================================================
   ORBIT AI — SYSTEM / OVERVIEW
   System Monitoring
   =========================================================== */

"use strict";


/* ===========================================================
   DOM ELEMENTS
   =========================================================== */

const cpuValue = document.getElementById("cpu-value");
const memoryValue = document.getElementById("memory-value");


/* ===========================================================
   SYSTEM STATE
   =========================================================== */

const OrbitOverview = {

    cpu: 24,
    memory: 48,

    network: {
        online: navigator.onLine,
        type: "Unknown",
        speed: null,
        latency: null
    },


    /* =======================================================
       INITIALIZE
       ======================================================= */

    init() {

        this.updateNetwork();

        this.updateSystemValues();

        this.startMonitoring();

        console.log("Orbit Overview initialized.");

    },


    /* =======================================================
       SYSTEM VALUES
       ======================================================= */

    updateSystemValues() {

        /*
         * Browser JavaScript cannot reliably access
         * the real CPU and RAM usage of the computer.
         *
         * These values are therefore UI/demo values
         * unless connected to a real system-monitoring backend.
         */

        this.cpu =
            Math.floor(
                Math.random() * 15
            ) + 20;


        this.memory =
            Math.floor(
                Math.random() * 12
            ) + 42;


        if (cpuValue) {

            cpuValue.textContent =
                `${this.cpu}%`;

        }


        if (memoryValue) {

            memoryValue.textContent =
                `${this.memory}%`;

        }

    },


    /* =======================================================
       NETWORK MONITOR
       ======================================================= */

    updateNetwork() {

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;


        this.network = {

            online:
                navigator.onLine,

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


        this.updateNetworkUI();

    },


    /* =======================================================
       NETWORK UI
       ======================================================= */

    updateNetworkUI() {

        const online =
            this.network.online;


        const statusElements =
            document.querySelectorAll(
                ".connection-status"
            );


        const networkStrong =
            document.querySelector(
                ".network-main strong"
            );


        const networkDescription =
            document.querySelector(
                ".network-main p"
            );


        const systemStatus =
            document.querySelector(
                ".system-status"
            );


        const statusIndicator =
            document.querySelector(
                ".status-indicator"
            );


        const networkStatusText =
            document.querySelector(
                ".connection-status"
            );


        /* -----------------------------------------------
           ONLINE / OFFLINE
        ------------------------------------------------ */

        if (online) {

            if (networkStrong) {

                networkStrong.textContent =
                    "Network Connected";

            }


            if (networkDescription) {

                networkDescription.textContent =
                    "Your connection is currently stable.";

            }


            if (systemStatus) {

                systemStatus.innerHTML = `
                    <span class="status-indicator"></span>
                    <span>System Operational</span>
                `;

            }


            if (networkStatusText) {

                networkStatusText.innerHTML = `
                    <i class="fa-solid fa-circle"></i>
                    Online
                `;

            }

        } else {

            if (networkStrong) {

                networkStrong.textContent =
                    "Network Offline";

            }


            if (networkDescription) {

                networkDescription.textContent =
                    "Your device is currently offline.";

            }


            if (systemStatus) {

                systemStatus.innerHTML = `
                    <span class="status-indicator"></span>
                    <span>Connection Offline</span>
                `;

            }


            if (networkStatusText) {

                networkStatusText.innerHTML = `
                    <i class="fa-solid fa-circle"></i>
                    Offline
                `;

            }

        }

    },


    /* =======================================================
       START MONITORING
       ======================================================= */

    startMonitoring() {

        /*
         * Refresh system display every 5 seconds.
         */

        setInterval(() => {

            this.updateSystemValues();

        }, 5000);


        /*
         * Check network every 5 seconds.
         */

        setInterval(() => {

            this.updateNetwork();

        }, 5000);

    }

};


/* ===========================================================
   BROWSER NETWORK EVENTS
   =========================================================== */

window.addEventListener(
    "online",
    () => {

        OrbitOverview.updateNetwork();

    }
);


window.addEventListener(
    "offline",
    () => {

        OrbitOverview.updateNetwork();

    }
);


/* ===========================================================
   CONNECTION CHANGE
   =========================================================== */

const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;


if (connection) {

    connection.addEventListener(
        "change",
        () => {

            OrbitOverview.updateNetwork();

        }
    );

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
        () => {

            OrbitOverview.init();

        }
    );

} else {

    OrbitOverview.init();

}


/* ===========================================================
   GLOBAL ACCESS
   =========================================================== */

window.OrbitOverview =
    OrbitOverview;