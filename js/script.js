/* ===========================================================
   ORBIT AI — DASHBOARD SCRIPT

   Handles:
   - Dashboard UI
   - Live clock
   - Date
   - Greeting
   - Card interactions
   - Status interactions
   - Online status
   - Dashboard animation
   - Power button
   - General UI feedback

   AI/API functionality:
   - Handled by orbit.js

   Quick replies:
   - Handled by quick-replies.js

   Typing indicator:
   - Handled by orbit.js

   =========================================================== */

"use strict";


/* ===========================================================
   DASHBOARD ELEMENTS
   =========================================================== */

const timeEl =
    document.getElementById("time");

const dateEl =
    document.getElementById("date");

const greetingEl =
    document.getElementById("greeting");

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
        String(now.getMinutes())
            .padStart(2, "0");

    const seconds =
        String(now.getSeconds())
            .padStart(2, "0");

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
                    "var(--primary-light)";

                card.style.boxShadow =
                    "var(--shadow), 0 0 0 3px var(--primary-soft)";

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
                    "var(--primary-soft)";

                item.style.borderColor =
                    "var(--border)";

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
        document.querySelectorAll(
            ".online"
        );


    onlineElements.forEach(element => {

        element.style.color =
            "var(--success)";

        element.style.textShadow =
            "none";

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
   GENERAL UI FEEDBACK
   ===========================================================

   Adds a small press effect to buttons.

   AI buttons and quick replies are still handled by
   their own dedicated JavaScript files.

   =========================================================== */

function setupInteractiveElements() {

    const buttons =
        document.querySelectorAll(
            "button"
        );


    buttons.forEach(button => {

        /*
         * Avoid adding the same interaction
         * more than once.
         */

        if (
            button.dataset.uiFeedbackReady ===
            "true"
        ) {

            return;

        }


        button.dataset.uiFeedbackReady =
            "true";


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


        button.addEventListener(
            "touchend",
            () => {

                button.style.transform =
                    "";

            },
            {
                passive: true
            }
        );

    });

}


/* ===========================================================
   DASHBOARD INITIALIZATION
   =========================================================== */

function initializeDashboard() {

    /*
     * Clock
     */

    updateClock();


    /*
     * General dashboard UI
     */

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

/* =========================================================
   ORBIT AI — CHAT UI BEHAVIOR
   Auto-growing input + chat scrolling
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const chatWindow = document.querySelector(".chat-window");
    const commandInput = document.querySelector("#command-input");

    /* =======================================================
       1. AUTO-GROW COMMAND INPUT
       ======================================================= */

    if (commandInput) {

        const resizeCommandInput = () => {

            // Reset height so scrollHeight can be measured correctly
            commandInput.style.height = "auto";

            // Get the natural height of the text
            const maxHeight = 150;

            const newHeight = Math.min(
                commandInput.scrollHeight,
                maxHeight
            );

            commandInput.style.height = `${newHeight}px`;

            // Allow internal scrolling only after max height
            commandInput.style.overflowY =
                commandInput.scrollHeight > maxHeight
                    ? "auto"
                    : "hidden";
        };

        commandInput.addEventListener("input", resizeCommandInput);

        // Set correct height when page loads
        resizeCommandInput();
    }


    /* =======================================================
       2. KEEP CHAT SCROLLED TO NEWEST MESSAGE
       ======================================================= */

    const scrollChatToBottom = () => {

        if (!chatWindow) return;

        requestAnimationFrame(() => {

            chatWindow.scrollTo({
                top: chatWindow.scrollHeight,
                behavior: "smooth"
            });

        });
    };


    /* =======================================================
       3. WATCH FOR NEW CHAT MESSAGES
       ======================================================= */

    if (chatWindow) {

        const chatObserver = new MutationObserver(() => {

            scrollChatToBottom();

        });

        chatObserver.observe(chatWindow, {
            childList: true,
            subtree: true
        });

    }


    /* =======================================================
       4. ENTER KEY
       ======================================================= */

    if (commandInput) {

        commandInput.addEventListener("keydown", (event) => {

            // Enter sends the message
            // Shift + Enter creates a new line

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                const form =
                    commandInput.closest("form");

                if (form) {
                    form.requestSubmit();
                }

            }

        });

    }

});