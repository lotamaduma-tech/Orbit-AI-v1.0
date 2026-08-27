"use strict";

(() => {
    const THEME_KEY = "orbit-ai-theme";

    function getStoredTheme() {
        const theme = localStorage.getItem(THEME_KEY);

        if (
            theme === "light" ||
            theme === "dark" ||
            theme === "system"
        ) {
            return theme;
        }

        return "system";
    }

    function getEffectiveTheme(theme) {
        if (theme !== "system") {
            return theme;
        }

        return window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
            ? "dark"
            : "light";
    }

    function applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.effectiveTheme =
            getEffectiveTheme(theme);
    }

    function syncTheme() {
        applyTheme(getStoredTheme());
    }

    syncTheme();

    window.addEventListener("storage", event => {
        if (event.key === THEME_KEY) {
            syncTheme();
        }
    });

    const systemTheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
    );

    systemTheme.addEventListener("change", () => {
        if (getStoredTheme() === "system") {
            syncTheme();
        }
    });
})();