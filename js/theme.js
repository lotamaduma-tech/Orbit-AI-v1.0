/* =========================================================
   ORBIT AI — THEME SYSTEM
   Global theme controller
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       STORAGE
       ===================================================== */

    const THEME_KEY = "orbitTheme";

    const root = document.documentElement;


    /* =====================================================
       SYSTEM THEME
       ===================================================== */

    const systemTheme = window.matchMedia(
        "(prefers-color-scheme: light)"
    );


    /* =====================================================
       GET SYSTEM THEME
       ===================================================== */

    function getSystemTheme() {

        return systemTheme.matches
            ? "light"
            : "dark";

    }


    /* =====================================================
       GET SAVED THEME
       ===================================================== */

    function getSavedTheme() {

        const savedTheme =
            localStorage.getItem(THEME_KEY);

        if (
            savedTheme === "dark" ||
            savedTheme === "light" ||
            savedTheme === "system"
        ) {

            return savedTheme;

        }

        return "dark";

    }


    /* =====================================================
       APPLY THEME
       ===================================================== */

    function applyTheme(themeName) {

        /*
         * Make sure only valid themes are accepted.
         */

        if (
            themeName !== "dark" &&
            themeName !== "light" &&
            themeName !== "system"
        ) {

            themeName = "dark";

        }


        /*
         * Save the user's preference.
         */

        localStorage.setItem(
            THEME_KEY,
            themeName
        );


        /*
         * Set the theme preference on <html>.
         *
         * variables.css uses this attribute:
         *
         * html[data-theme="light"]
         * html[data-theme="dark"]
         * html[data-theme="system"]
         */

        root.setAttribute(
            "data-theme",
            themeName
        );


        /*
         * Also update the body classes.
         * This keeps compatibility with any existing
         * CSS that uses theme-dark / theme-light.
         */

        document.body.classList.remove(
            "theme-dark",
            "theme-light",
            "theme-system"
        );

        document.body.classList.add(
            `theme-${themeName}`
        );


        /*
         * Update the theme selector.
         */

        updateThemeControls(themeName);


        /*
         * Tell other Orbit AI scripts that the theme
         * has changed.
         */

        window.dispatchEvent(
            new CustomEvent(
                "orbitThemeChanged",
                {
                    detail: {
                        theme: themeName,
                        effectiveTheme:
                            themeName === "system"
                                ? getSystemTheme()
                                : themeName
                    }
                }
            )
        );

    }


    /* =====================================================
       UPDATE THEME CONTROLS
       ===================================================== */

    function updateThemeControls(themeName) {

        /*
         * Support buttons using data-theme.
         */

        const themeButtons =
            document.querySelectorAll(
                "[data-theme]"
            );


        themeButtons.forEach(button => {

            const buttonTheme =
                button.dataset.theme;


            const isActive =
                buttonTheme === themeName;


            button.classList.toggle(
                "active",
                isActive
            );


            button.setAttribute(
                "aria-pressed",
                isActive
                    ? "true"
                    : "false"
            );

        });


        /*
         * Support the settings select.
         *
         * Your HTML uses:
         *
         * id="theme-setting"
         */

        const themeSelect =
            document.getElementById(
                "theme-setting"
            );


        if (themeSelect) {

            themeSelect.value =
                themeName;

        }

    }


    /* =====================================================
       THEME SELECT
       ===================================================== */

    const themeSelect =
        document.getElementById(
            "theme-setting"
        );


    if (themeSelect) {

        themeSelect.addEventListener(
            "change",
            event => {

                applyTheme(
                    event.target.value
                );

            }
        );

    }


    /* =====================================================
       THEME BUTTONS
       ===================================================== */

    document
        .querySelectorAll("[data-theme]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const themeName =
                        button.dataset.theme;

                    applyTheme(
                        themeName
                    );

                }
            );

        });


    /* =====================================================
       SYSTEM THEME CHANGES
       ===================================================== */

    systemTheme.addEventListener(
        "change",
        () => {

            const savedTheme =
                localStorage.getItem(
                    THEME_KEY
                );


            /*
             * Only react to OS changes when the user
             * has selected "system".
             */

            if (savedTheme === "system") {

                /*
                 * Re-apply the system theme so all
                 * CSS variables update.
                 */

                root.setAttribute(
                    "data-theme",
                    "system"
                );


                window.dispatchEvent(
                    new CustomEvent(
                        "orbitThemeChanged",
                        {
                            detail: {
                                theme: "system",
                                effectiveTheme:
                                    getSystemTheme()
                            }
                        }
                    )
                );

            }

        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    const savedTheme =
        getSavedTheme();


    applyTheme(
        savedTheme
    );


    /* =====================================================
       GLOBAL ORBIT THEME API
       ===================================================== */

    window.OrbitTheme = {

        setTheme: applyTheme,

        getTheme: () => {

            return localStorage.getItem(
                THEME_KEY
            ) || "dark";

        },

        getEffectiveTheme: () => {

            const theme =
                localStorage.getItem(
                    THEME_KEY
                ) || "dark";


            return theme === "system"
                ? getSystemTheme()
                : theme;

        },

        getAvailableThemes: () => {

            return [
                "dark",
                "light",
                "system"
            ];

        }

    };

});