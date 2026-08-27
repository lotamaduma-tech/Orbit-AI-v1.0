"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const SETTINGS_KEY = "orbitAISettings";

  const defaultSettings = {
    theme: "system",
    animations: true,
    enterToSend: true,
    timestamps: false,
    memory: true,
    notifications: false,
    language: "en"
  };

  let settings = loadSettings();

  const themeSelect =
    document.getElementById("theme-select");

  const animationsToggle =
    document.getElementById("animations-toggle");

  const enterSendToggle =
    document.getElementById("enter-send-toggle");

  const timestampsToggle =
    document.getElementById("timestamps-toggle");

  const memoryToggle =
    document.getElementById("memory-toggle");

  const notificationsToggle =
    document.getElementById("notifications-toggle");

  const languageSelect =
    document.getElementById("language-select");

  const clearDataBtn =
    document.getElementById("clear-data-button");


  function loadSettings() {
    try {
      const saved =
        localStorage.getItem(SETTINGS_KEY);

      if (!saved) {
        return { ...defaultSettings };
      }

      const parsed = JSON.parse(saved);

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        return { ...defaultSettings };
      }

      return {
        ...defaultSettings,
        ...parsed
      };
    } catch {
      return { ...defaultSettings };
    }
  }


  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch {
      console.warn(
        "Orbit settings could not be saved."
      );
    }
  }


  function applyTheme() {
    if (
      window.OrbitTheme &&
      typeof window.OrbitTheme.setTheme ===
      "function"
    ) {
      window.OrbitTheme.setTheme(
        settings.theme
      );

      return;
    }

    document.documentElement.dataset.theme =
      settings.theme;
  }


  function applyAnimations() {
    const root =
      document.documentElement;

    root.setAttribute(
      "data-animations",
      settings.animations
        ? "true"
        : "false"
    );

    root.toggleAttribute(
      "data-reduced-motion",
      !settings.animations
    );

    if (settings.animations) {
      root.removeAttribute(
        "data-reduced-motion"
      );
    }
  }


  function applyDataPreferences() {
    const root =
      document.documentElement;

    root.setAttribute(
      "data-enter-to-send",
      settings.enterToSend
        ? "true"
        : "false"
    );

    root.setAttribute(
      "data-show-timestamps",
      settings.timestamps
        ? "true"
        : "false"
    );

    root.setAttribute(
      "data-memory",
      settings.memory
        ? "enabled"
        : "disabled"
    );

    root.setAttribute(
      "lang",
      settings.language
    );
  }


  function syncControls() {
    if (themeSelect) {
      themeSelect.value =
        settings.theme;
    }

    if (animationsToggle) {
      animationsToggle.checked =
        settings.animations;
    }

    if (enterSendToggle) {
      enterSendToggle.checked =
        settings.enterToSend;
    }

    if (timestampsToggle) {
      timestampsToggle.checked =
        settings.timestamps;
    }

    if (memoryToggle) {
      memoryToggle.checked =
        settings.memory;
    }

    if (notificationsToggle) {
      notificationsToggle.checked =
        settings.notifications;
    }

    if (languageSelect) {
      languageSelect.value =
        settings.language;
    }
  }


  function updateSetting(key, value) {
    if (!(key in defaultSettings)) {
      return;
    }

    settings[key] = value;

    saveSettings();
    syncControls();
    applyDataPreferences();

    if (key === "theme") {
      applyTheme();
    }

    if (key === "animations") {
      applyAnimations();
    }

    if (
      key === "memory" &&
      window.OrbitMemory &&
      typeof window.OrbitMemory.setEnabled ===
      "function"
    ) {
      window.OrbitMemory.setEnabled(
        value
      );
    }

    window.dispatchEvent(
      new CustomEvent(
        "orbitSettingChanged",
        {
          detail: {
            key,
            value
          }
        }
      )
    );
  }


  if (themeSelect) {
    themeSelect.addEventListener(
      "change",
      event => {
        updateSetting(
          "theme",
          event.target.value
        );
      }
    );
  }


  if (animationsToggle) {
    animationsToggle.addEventListener(
      "change",
      event => {
        updateSetting(
          "animations",
          event.target.checked
        );
      }
    );
  }


  if (enterSendToggle) {
    enterSendToggle.addEventListener(
      "change",
      event => {
        updateSetting(
          "enterToSend",
          event.target.checked
        );

        if (
          window.OrbitChatSettings &&
          typeof window.OrbitChatSettings.setEnterToSend ===
          "function"
        ) {
          window.OrbitChatSettings.setEnterToSend(
            event.target.checked
          );
        }
      }
    );
  }


  if (timestampsToggle) {
    timestampsToggle.addEventListener(
      "change",
      event => {
        updateSetting(
          "timestamps",
          event.target.checked
        );

        if (
          window.OrbitChatSettings &&
          typeof window.OrbitChatSettings.setTimestamps ===
          "function"
        ) {
          window.OrbitChatSettings.setTimestamps(
            event.target.checked
          );
        }
      }
    );
  }


  if (memoryToggle) {
    memoryToggle.addEventListener(
      "change",
      event => {
        updateSetting(
          "memory",
          event.target.checked
        );
      }
    );
  }


  if (notificationsToggle) {
    notificationsToggle.addEventListener(
      "change",
      async event => {
        const enabled =
          event.target.checked;

        if (!enabled) {
          updateSetting(
            "notifications",
            false
          );

          return;
        }

        if (
          !("Notification" in window)
        ) {
          alert(
            "Browser notifications are not supported on this device."
          );

          event.target.checked =
            false;

          updateSetting(
            "notifications",
            false
          );

          return;
        }

        try {
          const permission =
            await Notification.requestPermission();

          if (
            permission === "granted"
          ) {
            updateSetting(
              "notifications",
              true
            );
          } else {
            event.target.checked =
              false;

            updateSetting(
              "notifications",
              false
            );
          }
        } catch {
          event.target.checked =
            false;

          updateSetting(
            "notifications",
            false
          );
        }
      }
    );
  }


  if (languageSelect) {
    languageSelect.addEventListener(
      "change",
      event => {
        updateSetting(
          "language",
          event.target.value
        );
      }
    );
  }


  if (clearDataBtn) {
    clearDataBtn.addEventListener(
      "click",
      () => {
        const confirmed =
          window.confirm(
            "Clear your saved Orbit settings and local preferences?"
          );

        if (!confirmed) {
          return;
        }

        localStorage.removeItem(
          SETTINGS_KEY
        );

        settings = {
          ...defaultSettings
        };

        syncControls();
        applyTheme();
        applyAnimations();
        applyDataPreferences();

        if (
          window.OrbitMemory &&
          typeof window.OrbitMemory.setEnabled ===
          "function"
        ) {
          window.OrbitMemory.setEnabled(
            true
          );
        }

        window.dispatchEvent(
          new CustomEvent(
            "orbitSettingsReset"
          )
        );

        alert(
          "Orbit settings have been reset."
        );
      }
    );
  }


  window.addEventListener(
    "orbitMemoryChanged",
    event => {
      if (
        !event.detail ||
        typeof event.detail.enabled !==
        "boolean"
      ) {
        return;
      }

      settings.memory =
        event.detail.enabled;

      saveSettings();
      syncControls();
      applyDataPreferences();
    }
  );


  const systemTheme =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

  systemTheme.addEventListener(
    "change",
    () => {
      if (
        settings.theme === "system"
      ) {
        applyTheme();
      }
    }
  );


  window.OrbitSettings = {
    get() {
      return {
        ...settings
      };
    },

    getValue(key) {
      return settings[key];
    },

    set(key, value) {
      updateSetting(
        key,
        value
      );
    },

    reset() {
      settings = {
        ...defaultSettings
      };

      saveSettings();
      syncControls();
      applyTheme();
      applyAnimations();
      applyDataPreferences();

      if (
        window.OrbitMemory &&
        typeof window.OrbitMemory.setEnabled ===
        "function"
      ) {
        window.OrbitMemory.setEnabled(
          true
        );
      }

      window.dispatchEvent(
        new CustomEvent(
          "orbitSettingsReset"
        )
      );
    }
  };


  syncControls();
  applyTheme();
  applyAnimations();
  applyDataPreferences();
});