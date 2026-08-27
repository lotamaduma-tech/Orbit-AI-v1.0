(() => {
    "use strict";

    const THEME_KEY = "orbit-ai-theme";
    const OLD_THEME_KEY = "orbitTheme";
    const DEFAULT_THEME = "light";

    const root = document.documentElement;

    const systemTheme = window.matchMedia(
        "(prefers-color-scheme: light)"
    );

    function isValidTheme(theme) {
        return (
            theme === "light" ||
            theme === "dark" ||
            theme === "system"
        );
    }

    function getSystemTheme() {
        return systemTheme.matches ? "light" : "dark";
    }

    function getSavedTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);

        return isValidTheme(savedTheme)
            ? savedTheme
            : DEFAULT_THEME;
    }

    function getEffectiveTheme(theme) {
        return theme === "system"
            ? getSystemTheme()
            : theme;
    }

    function applyRootTheme(theme) {
        if (!isValidTheme(theme)) {
            theme = DEFAULT_THEME;
        }

        root.dataset.theme = theme;
        root.dataset.effectiveTheme = getEffectiveTheme(theme);

        return theme;
    }

    function updateBodyTheme(theme) {
        if (!document.body) {
            return;
        }

        document.body.classList.remove(
            "theme-light",
            "theme-dark",
            "theme-system"
        );

        document.body.classList.add(`theme-${theme}`);
    }

    function updateThemeControls(theme) {
        document
            .querySelectorAll("[data-theme]")
            .forEach(button => {
                const active = button.dataset.theme === theme;

                button.classList.toggle("active", active);

                button.setAttribute(
                    "aria-pressed",
                    active ? "true" : "false"
                );
            });

        const select = document.getElementById("theme-setting");

        if (select) {
            select.value = theme;
        }
    }

    function notifyThemeChange(theme) {
        window.dispatchEvent(
            new CustomEvent("orbitThemeChanged", {
                detail: {
                    theme,
                    effectiveTheme: getEffectiveTheme(theme)
                }
            })
        );
    }

    function applyTheme(theme, savePreference = true) {
        if (!isValidTheme(theme)) {
            theme = DEFAULT_THEME;
        }

        if (savePreference) {
            localStorage.setItem(THEME_KEY, theme);
        }

        applyRootTheme(theme);
        updateBodyTheme(theme);
        updateThemeControls(theme);
        notifyThemeChange(theme);
    }

    localStorage.removeItem(OLD_THEME_KEY);

    applyRootTheme(getSavedTheme());

    document.addEventListener("DOMContentLoaded", () => {
        applyTheme(getSavedTheme(), false);

        const themeSelect =
            document.getElementById("theme-setting");

        if (themeSelect) {
            themeSelect.addEventListener("change", event => {
                applyTheme(event.target.value);
            });
        }

        document
            .querySelectorAll("[data-theme]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    applyTheme(button.dataset.theme);
                });
            });
    });

    systemTheme.addEventListener("change", () => {
        const savedTheme = localStorage.getItem(THEME_KEY);

        if (savedTheme === "system") {
            applyTheme("system", false);
        }
    });

    window.OrbitTheme = {
        setTheme(theme) {
            applyTheme(theme, true);
        },

        getTheme() {
            return getSavedTheme();
        },

        getEffectiveTheme() {
            return getEffectiveTheme(getSavedTheme());
        },

        getAvailableThemes() {
            return [
                "light",
                "dark",
                "system"
            ];
        }
    };
})();