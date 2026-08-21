/* ===========================================================
   ORBIT AI — NAVIGATION.JS
   Global Navigation System
   =========================================================== */

"use strict";


/* ===========================================================
   ELEMENTS
   =========================================================== */

const menuToggle =
    document.getElementById("menu-toggle");

const menuClose =
    document.getElementById("menu-close");

const navigationPanel =
    document.getElementById("navigation-panel");

const navigationOverlay =
    document.getElementById("navigation-overlay");

const navigationLinks =
    document.querySelectorAll(
        ".navigation-links a"
    );


/* ===========================================================
   OPEN NAVIGATION
   =========================================================== */

function openNavigation() {

    if (!navigationPanel) return;

    navigationPanel.classList.add("open");

    if (navigationOverlay) {
        navigationOverlay.classList.add("active");
    }

    document.body.classList.add(
        "navigation-open"
    );


    /* Accessibility */

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );

    }

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-label",
            "Close navigation"
        );

    }


    /* Focus close button */

    if (menuClose) {

        setTimeout(() => {

            menuClose.focus();

        }, 150);

    }

}


/* ===========================================================
   CLOSE NAVIGATION
   =========================================================== */

function closeNavigation() {

    if (!navigationPanel) return;

    navigationPanel.classList.remove("open");

    if (navigationOverlay) {

        navigationOverlay.classList.remove(
            "active"
        );

    }

    document.body.classList.remove(
        "navigation-open"
    );


    /* Accessibility */

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

    }

    if (menuToggle) {

        menuToggle.setAttribute(
            "aria-label",
            "Open navigation"
        );

    }


    /* Return focus */

    if (menuToggle) {

        menuToggle.focus();

    }

}


/* ===========================================================
   TOGGLE NAVIGATION
   =========================================================== */

function toggleNavigation() {

    if (!navigationPanel) return;

    const isOpen =
        navigationPanel.classList.contains(
            "open"
        );

    if (isOpen) {

        closeNavigation();

    } else {

        openNavigation();

    }

}


/* ===========================================================
   MENU TOGGLE BUTTON
   =========================================================== */

if (menuToggle) {

    menuToggle.addEventListener(
        "click",
        toggleNavigation
    );

}


/* ===========================================================
   CLOSE BUTTON
   =========================================================== */

if (menuClose) {

    menuClose.addEventListener(
        "click",
        closeNavigation
    );

}


/* ===========================================================
   OVERLAY CLICK
   =========================================================== */

if (navigationOverlay) {

    navigationOverlay.addEventListener(
        "click",
        closeNavigation
    );

}


/* ===========================================================
   NAVIGATION LINKS
   =========================================================== */

navigationLinks.forEach(
    (link) => {

        link.addEventListener(
            "click",
            () => {

                closeNavigation();

            }
        );

    }
);


/* ===========================================================
   ESCAPE KEY
   =========================================================== */

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            navigationPanel?.classList.contains(
                "open"
            )
        ) {

            closeNavigation();

        }

    }
);


/* ===========================================================
   PREVENT BACKGROUND SCROLL
   =========================================================== */

const navigationStyle =
    document.createElement("style");

navigationStyle.textContent = `

    body.navigation-open {
        overflow: hidden;
    }

`;

document.head.appendChild(
    navigationStyle
);


/* ===========================================================
   CURRENT PAGE DETECTION
   =========================================================== */

function setActiveNavigationLink() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    navigationLinks.forEach(
        (link) => {

            const linkPage =
                link
                    .getAttribute("href")
                    ?.split("/")
                    .pop()
                    .toLowerCase();


            link.classList.remove(
                "active"
            );


            if (
                linkPage === currentPage ||
                (
                    currentPage === "" &&
                    linkPage === "index.html"
                )
            ) {

                link.classList.add(
                    "active"
                );

                link.setAttribute(
                    "aria-current",
                    "page"
                );

            }

            else {

                link.removeAttribute(
                    "aria-current"
                );

            }

        }
    );

}


/* ===========================================================
   INITIALIZE NAVIGATION
   =========================================================== */

function initializeNavigation() {

    setActiveNavigationLink();

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
        initializeNavigation
    );

}

else {

    initializeNavigation();

}


/* ===========================================================
   GLOBAL ORBIT NAVIGATION API
   =========================================================== */

window.OrbitNavigation = {

    open: openNavigation,

    close: closeNavigation,

    toggle: toggleNavigation

};