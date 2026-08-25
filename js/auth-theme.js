"use strict";

(() => {
    const THEME_KEY = "orbit-theme";

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

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
    }

    applyTheme(getStoredTheme());

    window.addEventListener("storage", (event) => {
        if (event.key === THEME_KEY) {
            applyTheme(getStoredTheme());
        }
    });
})();