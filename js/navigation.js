"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const orbitApp = document.querySelector(".orbit-app");
    const sidebar = document.querySelector(".orbit-sidebar");
    const menuToggle = document.querySelector(".menu-toggle");
    const sidebarClose = document.querySelector(".sidebar-close");
    const navigationOverlay = document.querySelector(".navigation-overlay");
    const commandInput = document.querySelector("#command-input");
    const commandArea = document.querySelector(".command-area");

    if (!orbitApp || !sidebar || !menuToggle || !sidebarClose) {
        return;
    }

    function openNavigation() {
        orbitApp.classList.add("nav-open");
        sidebar.classList.add("active");

        if (navigationOverlay) {
            navigationOverlay.classList.add("active");
        }

        menuToggle.setAttribute("aria-expanded", "true");
        sidebarClose.setAttribute("aria-label", "Close navigation");

        document.body.classList.add("navigation-open");

        if (commandArea) {
            commandArea.classList.add("input-accessible");
        }
    }

    function closeNavigation() {
        orbitApp.classList.remove("nav-open");
        sidebar.classList.remove("active");

        if (navigationOverlay) {
            navigationOverlay.classList.remove("active");
        }

        menuToggle.setAttribute("aria-expanded", "false");

        document.body.classList.remove("navigation-open");

        if (commandArea) {
            commandArea.classList.remove("input-accessible");
        }

        if (document.activeElement === sidebarClose) {
            menuToggle.focus();
        }
    }

    function toggleNavigation() {
        if (orbitApp.classList.contains("nav-open")) {
            closeNavigation();
        } else {
            openNavigation();
        }
    }

    menuToggle.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        toggleNavigation();
    });

    sidebarClose.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeNavigation();
    });

    if (navigationOverlay) {
        navigationOverlay.addEventListener("click", event => {
            event.preventDefault();
            closeNavigation();
        });
    }

    sidebar.addEventListener("click", event => {
        event.stopPropagation();

        const link = event.target.closest(".sidebar-account-link");

        if (link && window.innerWidth <= 768) {
            closeNavigation();
        }
    });

    if (commandArea) {
        commandArea.addEventListener("click", event => {
            event.stopPropagation();
        });
    }

    if (commandInput) {
        commandInput.addEventListener("click", event => {
            event.stopPropagation();
        });

        commandInput.addEventListener("focus", () => {
            if (orbitApp.classList.contains("nav-open")) {
                commandArea?.classList.add("input-accessible");
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (
            event.key === "Escape" &&
            orbitApp.classList.contains("nav-open")
        ) {
            closeNavigation();
        }
    });

    window.addEventListener("resize", () => {
        if (!orbitApp.classList.contains("nav-open")) {
            return;
        }

        if (commandArea) {
            commandArea.classList.add("input-accessible");
        }
    });

    closeNavigation();

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute(
        "aria-controls",
        sidebar.id || "orbit-sidebar"
    );
});