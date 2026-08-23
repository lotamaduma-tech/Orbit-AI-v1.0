/* =========================================================
   ORBIT AI — GLOBAL THEME SYSTEM
   ========================================================= */

(() => {
  const THEME_KEY = "orbitTheme";

  const root = document.documentElement;

  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");

  /* =====================================================
       GET SYSTEM THEME
       ===================================================== */

  function getSystemTheme() {
    return systemTheme.matches ? "light" : "dark";
  }

  /* =====================================================
       GET SAVED THEME
       ===================================================== */

  function getSavedTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

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
    if (
      themeName !== "dark" &&
      themeName !== "light" &&
      themeName !== "system"
    ) {
      themeName = "dark";
    }

    /* Save preference */

    localStorage.setItem(THEME_KEY, themeName);

    /*
     * THIS IS THE IMPORTANT PART.
     *
     * variables.css listens to:
     *
     * html[data-theme="dark"]
     * html[data-theme="light"]
     * html[data-theme="system"]
     */

    root.dataset.theme = themeName;

    /*
     * Body classes for compatibility
     */

    if (document.body) {
      document.body.classList.remove(
        "theme-dark",
        "theme-light",
        "theme-system",
      );

      document.body.classList.add(`theme-${themeName}`);
    }

    /* Update settings controls */

    updateThemeControls(themeName);

    /* Notify the rest of Orbit */

    window.dispatchEvent(
      new CustomEvent("orbitThemeChanged", {
        detail: {
          theme: themeName,
          effectiveTheme: themeName === "system" ? getSystemTheme() : themeName,
        },
      }),
    );
  }

  /* =====================================================
       UPDATE SETTINGS CONTROLS
       ===================================================== */

  function updateThemeControls(themeName) {
    /*
     * Theme buttons
     */

    document.querySelectorAll("[data-theme]").forEach((button) => {
      const active = button.dataset.theme === themeName;

      button.classList.toggle("active", active);

      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    /*
     * Theme select
     */

    const themeSelect = document.getElementById("theme-setting");

    if (themeSelect) {
      themeSelect.value = themeName;
    }
  }

  /* =====================================================
       INITIALIZE THEME IMMEDIATELY
       ===================================================== */

  const savedTheme = getSavedTheme();

  /*
   * Apply the theme immediately.
   *
   * This prevents the page from briefly
   * loading in the wrong theme.
   */

  root.dataset.theme = savedTheme;

  /* =====================================================
       WAIT FOR PAGE CONTENT
       ===================================================== */

  document.addEventListener("DOMContentLoaded", () => {
    updateThemeControls(savedTheme);

    /*
     * Theme selector
     */

    const themeSelect = document.getElementById("theme-setting");

    if (themeSelect) {
      themeSelect.addEventListener("change", (event) => {
        applyTheme(event.target.value);
      });
    }

    /*
     * Theme buttons
     */

    document.querySelectorAll("[data-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        applyTheme(button.dataset.theme);
      });
    });
  });

  /* =====================================================
       SYSTEM THEME CHANGES
       ===================================================== */

  systemTheme.addEventListener("change", () => {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "system") {
      root.dataset.theme = "system";

      window.dispatchEvent(
        new CustomEvent("orbitThemeChanged", {
          detail: {
            theme: "system",
            effectiveTheme: getSystemTheme(),
          },
        }),
      );
    }
  });

  /* =====================================================
       GLOBAL API
       ===================================================== */

  window.OrbitTheme = {
    setTheme: applyTheme,

    getTheme: () => {
      return localStorage.getItem(THEME_KEY) || "dark";
    },

    getEffectiveTheme: () => {
      const theme = localStorage.getItem(THEME_KEY) || "dark";

      return theme === "system" ? getSystemTheme() : theme;
    },

    getAvailableThemes: () => ["dark", "light", "system"],
  };
})();
