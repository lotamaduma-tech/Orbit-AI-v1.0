"use strict";

/* Adumex AI navigation */

document.addEventListener("DOMContentLoaded", () => {
    /* Elements */
    const adumexApp = document.querySelector(".adumex-app");
    const sidebar = document.querySelector(".adumex-sidebar");
    const menuToggle = document.querySelector(".menu-toggle");
    const sidebarClose = document.querySelector(".sidebar-close");
    const navigationOverlay = document.querySelector(".navigation-overlay");
    const commandInput = document.querySelector("#command-input");
    const commandArea = document.querySelector(".command-area");

    /* Stop if required navigation elements are missing */
    if (
        !adumexApp ||
        !sidebar ||
        !menuToggle ||
        !sidebarClose
    ) {
        console.warn("Adumex navigation: required elements not found.");
        return;
    }

    /* Check navigation state */
    function isNavigationOpen() {
        return adumexApp.classList.contains("nav-open");
    }

    /* Open navigation */
    function openNavigation() {
        adumexApp.classList.add("nav-open");
        sidebar.classList.add("active");

        if (navigationOverlay) {
            navigationOverlay.classList.add("active");
        }

        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.setAttribute("aria-label", "Close navigation");
        menuToggle.setAttribute("title", "Close navigation");

        sidebarClose.setAttribute("aria-label", "Close navigation");
        sidebarClose.setAttribute("title", "Close navigation");

        document.body.classList.add("navigation-open");

        if (commandArea) {
            commandArea.classList.add("input-accessible");
        }
    }

    /* Close navigation */
    function closeNavigation() {
        adumexApp.classList.remove("nav-open");
        sidebar.classList.remove("active");

        if (navigationOverlay) {
            navigationOverlay.classList.remove("active");
        }

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
        menuToggle.setAttribute("title", "Open navigation");

        document.body.classList.remove("navigation-open");

        if (commandArea) {
            commandArea.classList.remove("input-accessible");
        }

        /* Return focus to menu button */
        if (document.activeElement === sidebarClose) {
            menuToggle.focus();
        }
    }

    /* Toggle navigation */
    function toggleNavigation() {
        if (isNavigationOpen()) {
            closeNavigation();
        } else {
            openNavigation();
        }
    }

    /* Open navigation button */
    menuToggle.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        toggleNavigation();
    });

    /* Close navigation button */
    sidebarClose.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        closeNavigation();
    });

    /* Navigation overlay */
    if (navigationOverlay) {
        navigationOverlay.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            closeNavigation();
        });
    }

    /* Sidebar interactions */
    sidebar.addEventListener("click", event => {
        event.stopPropagation();

        const navigationLink = event.target.closest(
            ".sidebar-account-link"
        );

        /*
         * Close the sidebar on mobile after
         * selecting an account item.
         */
        if (
            navigationLink &&
            window.innerWidth <= 768
        ) {
            closeNavigation();
        }
    });

    /* Command area */
    if (commandArea) {
        commandArea.addEventListener("click", event => {
            event.stopPropagation();
        });
    }

    /* Command input */
    if (commandInput) {
        commandInput.addEventListener("click", event => {
            event.stopPropagation();
        });

        commandInput.addEventListener("focus", () => {
            if (isNavigationOpen()) {
                commandArea?.classList.add("input-accessible");
            }
        });
    }

    /* Escape closes navigation */
    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            isNavigationOpen()
        ) {
            closeNavigation();
        }
    });

    /* Keep navigation state stable during resizing */
    window.addEventListener("resize", () => {
        if (!isNavigationOpen()) {
            return;
        }

        if (commandArea) {
            commandArea.classList.add("input-accessible");
        }
    });

    /* Initial state */
    closeNavigation();

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute(
        "aria-controls",
        sidebar.id || "adumex-sidebar"
    );
});
