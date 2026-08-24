/* =========================================================
   ORBIT AI — GLOBAL THEME SYSTEM
   =========================================================

   Handles:
   - Light / Dark / System themes
   - Theme persistence
   - Theme settings controls
   - System theme changes
   - Global theme events

   DEFAULT:
   - Light mode

   STORAGE:
   - Uses a new dedicated theme key
   - Removes the old Orbit theme setting

   ========================================================= */

(() => {
  "use strict";


  /* =======================================================
     THEME STORAGE
     ======================================================= */

  /*
   * New dedicated storage key.
   *
   * This is intentionally different from the old:
   *
   * orbitTheme
   *
   * so the new theme system does not depend on
   * the previous Orbit page settings.
   */

  const THEME_KEY = "orbit-ai-theme";


  /*
   * Old theme key.
   *
   * Remove it so old Orbit settings cannot interfere
   * with the new theme system.
   */

  const OLD_THEME_KEY = "orbitTheme";


  /*
   * Default theme for new users.
   */

  const DEFAULT_THEME = "light";


  /*
   * Root HTML element.
   */

  const root = document.documentElement;


  /*
   * Detect system theme.
   */

  const systemTheme = window.matchMedia(
    "(prefers-color-scheme: light)"
  );


  /* =======================================================
     THEME VALIDATION
     ======================================================= */

  function isValidTheme(themeName) {

    return (
      themeName === "light" ||
      themeName === "dark" ||
      themeName === "system"
    );

  }


  /* =======================================================
     GET SYSTEM THEME
     ======================================================= */

  function getSystemTheme() {

    return systemTheme.matches
      ? "light"
      : "dark";

  }


  /* =======================================================
     REMOVE OLD THEME STORAGE
     ======================================================= */

  function removeOldThemeStorage() {

    /*
     * Delete the previous theme key.
     *
     * The new theme system does not use it.
     */

    if (localStorage.getItem(OLD_THEME_KEY) !== null) {

      localStorage.removeItem(OLD_THEME_KEY);

    }

  }


  /* =======================================================
     GET SAVED THEME
     ======================================================= */

  function getSavedTheme() {

    const savedTheme =
      localStorage.getItem(THEME_KEY);


    /*
     * Return the saved preference when valid.
     */

    if (isValidTheme(savedTheme)) {

      return savedTheme;

    }


    /*
     * No saved preference:
     *
     * Use LIGHT as the default.
     */

    return DEFAULT_THEME;

  }


  /* =======================================================
     APPLY THEME
     ======================================================= */

  function applyTheme(themeName, savePreference = true) {

    /*
     * Protect against invalid theme values.
     */

    if (!isValidTheme(themeName)) {

      themeName = DEFAULT_THEME;

    }


    /* =====================================================
       SAVE USER PREFERENCE
       ===================================================== */

    if (savePreference) {

      localStorage.setItem(
        THEME_KEY,
        themeName
      );

    }


    /* =====================================================
       APPLY HTML THEME ATTRIBUTE
       ===================================================== */

    /*
     * variables.css uses:
     *
     * html[data-theme="light"]
     * html[data-theme="dark"]
     * html[data-theme="system"]
     */

    root.dataset.theme = themeName;


    /* =====================================================
       BODY THEME CLASSES
       ===================================================== */

    if (document.body) {

      document.body.classList.remove(
        "theme-light",
        "theme-dark",
        "theme-system"
      );


      document.body.classList.add(
        `theme-${themeName}`
      );

    }


    /* =====================================================
       UPDATE SETTINGS CONTROLS
       ===================================================== */

    updateThemeControls(themeName);


    /* =====================================================
       NOTIFY ORBIT
       ===================================================== */

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


  /* =======================================================
     UPDATE SETTINGS CONTROLS
     ======================================================= */

  function updateThemeControls(themeName) {

    /*
     * Theme buttons.
     *
     * Example:
     *
     * <button data-theme="light">
     */

    document
      .querySelectorAll("[data-theme]")
      .forEach((button) => {

        const active =
          button.dataset.theme === themeName;


        button.classList.toggle(
          "active",
          active
        );


        button.setAttribute(
          "aria-pressed",
          active ? "true" : "false"
        );

      });


    /* =====================================================
       THEME SELECT
       ===================================================== */

    const themeSelect =
      document.getElementById(
        "theme-setting"
      );


    if (themeSelect) {

      themeSelect.value =
        themeName;

    }

  }


  /* =======================================================
     INITIALIZE THEME
     ======================================================= */

  /*
   * Remove the previous Orbit theme preference first.
   */

  removeOldThemeStorage();


  /*
   * Get the new saved preference.
   *
   * If nothing exists:
   *
   * LIGHT is automatically selected.
   */

  const initialTheme =
    getSavedTheme();


  /*
   * Apply immediately.
   *
   * This happens before DOMContentLoaded so the page
   * does not need to wait for the rest of the interface.
   */

  root.dataset.theme =
    initialTheme;


  /* =======================================================
     DOM READY
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      /*
       * Apply body class now that body exists.
       */

      applyTheme(
        initialTheme,
        false
      );


      /* ===================================================
         THEME SELECT
         =================================================== */

      const themeSelect =
        document.getElementById(
          "theme-setting"
        );


      if (themeSelect) {

        themeSelect.addEventListener(
          "change",
          (event) => {

            applyTheme(
              event.target.value
            );

          }
        );

      }


      /* ===================================================
         THEME BUTTONS
         =================================================== */

      document
        .querySelectorAll("[data-theme]")
        .forEach((button) => {

          button.addEventListener(
            "click",
            () => {

              applyTheme(
                button.dataset.theme
              );

            }
          );

        });

    }
  );


  /* =======================================================
     SYSTEM THEME CHANGES
     ======================================================= */

  systemTheme.addEventListener(
    "change",
    () => {

      const savedTheme =
        localStorage.getItem(
          THEME_KEY
        );


      /*
       * Only react automatically when the
       * user specifically selected SYSTEM.
       */

      if (savedTheme === "system") {

        root.dataset.theme =
          "system";


        if (document.body) {

          document.body.classList.remove(
            "theme-light",
            "theme-dark",
            "theme-system"
          );


          document.body.classList.add(
            "theme-system"
          );

        }


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


  /* =======================================================
     GLOBAL ORBIT THEME API
     ======================================================= */

  window.OrbitTheme = {

    /*
     * Change theme.
     */

    setTheme: applyTheme,


    /*
     * Get user's selected theme.
     *
     * Defaults to LIGHT.
     */

    getTheme: () => {

      return (
        localStorage.getItem(
          THEME_KEY
        ) || DEFAULT_THEME
      );

    },


    /*
     * Get the actual theme currently being used.
     */

    getEffectiveTheme: () => {

      const theme =
        localStorage.getItem(
          THEME_KEY
        ) || DEFAULT_THEME;


      return theme === "system"
        ? getSystemTheme()
        : theme;

    },


    /*
     * Available choices shown in Settings.
     */

    getAvailableThemes: () => {

      return [
        "light",
        "dark",
        "system"
      ];

    }

  };

})();
