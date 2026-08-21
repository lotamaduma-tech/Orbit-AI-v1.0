/* ===========================================================
   ORBIT AI — DASHBOARD SCRIPT
   Dashboard UI + Clock + Date + Greeting + UI Enhancements
   AI functionality is handled by orbit-ai.js
   =========================================================== */

"use strict";


/* ===========================================================
   DASHBOARD ELEMENTS
   =========================================================== */

const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

const dashboard =
    document.querySelector(".app-container");

const cards =
    document.querySelectorAll(".card");

const statusItems =
    document.querySelectorAll(".status-item");

const powerButton =
    document.querySelector(".power-btn");


/* ===========================================================
   LIVE CLOCK
   =========================================================== */

function updateClock() {

    const now = new Date();

    const hours = now.getHours();

    const minutes =
        String(now.getMinutes()).padStart(2, "0");

    const seconds =
        String(now.getSeconds()).padStart(2, "0");

    const period =
        hours >= 12 ? "PM" : "AM";

    const displayHour =
        hours % 12 || 12;


    /* =======================================================
       TIME
       ======================================================= */

    if (timeEl) {

        timeEl.textContent =
            `${displayHour}:${minutes}:${seconds} ${period}`;

    }


    /* =======================================================
       DATE
       ======================================================= */

    if (dateEl) {

        dateEl.textContent =
            now.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

    }


    /* =======================================================
       GREETING
       ======================================================= */

    if (greetingEl) {

        let greeting = "Good Evening";

        if (hours >= 5 && hours < 12) {

            greeting = "Good Morning";

        }

        else if (hours >= 12 && hours < 17) {

            greeting = "Good Afternoon";

        }

        greetingEl.textContent =
            `${greeting}, Kingsley`;

    }

}


/* ===========================================================
   START CLOCK
   =========================================================== */

updateClock();

setInterval(
    updateClock,
    1000
);


/* ===========================================================
   CARD INTERACTION
   =========================================================== */

function setupCardInteractions() {

    if (!cards.length) {
        return;
    }

    cards.forEach(card => {

        card.addEventListener(
            "mouseenter",
            () => {

                card.style.borderColor =
                    "var(--olive-border)";

                card.style.boxShadow =
                    "var(--shadow-soft), var(--glow-olive-soft)";

            }
        );


        card.addEventListener(
            "mouseleave",
            () => {

                card.style.borderColor =
                    "";

                card.style.boxShadow =
                    "";

            }
        );

    });

}


/* ===========================================================
   STATUS INTERACTION
   =========================================================== */

function setupStatusItems() {

    if (!statusItems.length) {
        return;
    }

    statusItems.forEach(item => {

        item.addEventListener(
            "mouseenter",
            () => {

                item.style.background =
                    "var(--cream-glass)";

                item.style.borderColor =
                    "var(--olive-border)";

            }
        );


        item.addEventListener(
            "mouseleave",
            () => {

                item.style.background =
                    "";

                item.style.borderColor =
                    "";

            }
        );

    });

}


/* ===========================================================
   ONLINE STATUS
   =========================================================== */

function initializeOnlineStatus() {

    const onlineElements =
        document.querySelectorAll(".online");

    onlineElements.forEach(element => {

        element.style.color =
            "var(--green)";

        element.style.textShadow =
            "var(--olive-status-glow)";

    });

}


/* ===========================================================
   DASHBOARD FADE-IN
   =========================================================== */

function initializeDashboardAnimation() {

    if (!dashboard) {
        return;
    }

    dashboard.classList.add(
        "orbit-dashboard-ready"
    );

}


/* ===========================================================
   POWER BUTTON
   =========================================================== */

function setupPowerButton() {

    if (!powerButton) {
        return;
    }

    powerButton.addEventListener(
        "click",
        () => {

            powerButton.classList.toggle(
                "power-active"
            );

        }
    );

}


/* ===========================================================
   QUICK UI FEEDBACK
   =========================================================== */

function setupInteractiveElements() {

    const buttons =
        document.querySelectorAll(
            "button"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "mousedown",
            () => {

                button.style.transform =
                    "scale(0.96)";

            }
        );


        button.addEventListener(
            "mouseup",
            () => {

                button.style.transform =
                    "";

            }
        );


        button.addEventListener(
            "mouseleave",
            () => {

                button.style.transform =
                    "";

            }
        );

    });

}


/* ===========================================================
   DASHBOARD INITIALIZATION
   =========================================================== */

function initializeDashboard() {

    updateClock();

    setupCardInteractions();

    setupStatusItems();

    initializeOnlineStatus();

    initializeDashboardAnimation();

    setupPowerButton();

    setupInteractiveElements();

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
        initializeDashboard
    );

}

else {

    initializeDashboard();

}