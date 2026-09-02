"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* Settings */

  const SETTINGS_KEY = "adumexAISettings";

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

  /* Controls */

  const themeSelect = document.getElementById("theme-select");
  const animationsToggle = document.getElementById("animations-toggle");
  const enterSendToggle = document.getElementById("enter-send-toggle");
  const timestampsToggle = document.getElementById("timestamps-toggle");
  const memoryToggle = document.getElementById("memory-toggle");
  const notificationsToggle = document.getElementById("notifications-toggle");
  const languageSelect = document.getElementById("language-select");

  /* Settings navigation */

  const navigationItems = document.querySelectorAll(
    ".settings-nav-item"
  );

  const settingsSections = document.querySelectorAll(
    ".settings-section"
  );

  /* Load settings */

  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);

      if (!saved) {
        return { ...defaultSettings };
      }

      const parsed = JSON.parse(saved);

      if (!parsed || typeof parsed !== "object") {
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

  /* Save settings */

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );
    } catch {
      console.warn(
        "Adumex settings could not be saved."
      );
    }
  }

  /* Theme */

  function applyTheme() {
    if (
      window.AdumexTheme &&
      typeof window.AdumexTheme.setTheme === "function"
    ) {
      window.AdumexTheme.setTheme(settings.theme);
      return;
    }

    document.documentElement.dataset.theme =
      settings.theme;
  }

  /* Animations */

  function applyAnimations() {
    const root = document.documentElement;

    root.setAttribute(
      "data-animations",
      settings.animations ? "true" : "false"
    );

    root.toggleAttribute(
      "data-reduced-motion",
      !settings.animations
    );

    if (settings.animations) {
      root.removeAttribute("data-reduced-motion");
    }
  }

  /* Data preferences */

  function applyDataPreferences() {
    const root = document.documentElement;

    root.setAttribute(
      "data-enter-to-send",
      settings.enterToSend ? "true" : "false"
    );

    root.setAttribute(
      "data-show-timestamps",
      settings.timestamps ? "true" : "false"
    );

    root.setAttribute(
      "data-memory",
      settings.memory ? "enabled" : "disabled"
    );

    root.setAttribute(
      "lang",
      settings.language
    );
  }

  /* Sync controls */

  function syncControls() {
    if (themeSelect) {
      themeSelect.value = settings.theme;
    }

    if (animationsToggle) {
      animationsToggle.checked = settings.animations;
    }

    if (enterSendToggle) {
      enterSendToggle.checked = settings.enterToSend;
    }

    if (timestampsToggle) {
      timestampsToggle.checked = settings.timestamps;
    }

    if (memoryToggle) {
      memoryToggle.checked = settings.memory;
    }

    if (notificationsToggle) {
      notificationsToggle.checked = settings.notifications;
    }

    if (languageSelect) {
      languageSelect.value = settings.language;
    }
  }

  /* Settings workspace */

  function showSettingsSection(sectionId, updateUrl = true) {
    if (!sectionId) {
      sectionId = "appearance";
    }

    let targetSection = document.getElementById(sectionId);

    if (!targetSection) {
      targetSection = document.getElementById("appearance");
    }

    if (!targetSection) {
      return;
    }

    settingsSections.forEach(section => {
      const isActive = section === targetSection;

      section.classList.toggle(
        "active",
        isActive
      );

      section.classList.toggle(
        "is-active",
        isActive
      );

      section.setAttribute(
        "aria-hidden",
        isActive ? "false" : "true"
      );
    });

    navigationItems.forEach(item => {
      const href = item.getAttribute("href");
      const itemSectionId =
        href && href.startsWith("#")
          ? href.substring(1)
          : null;

      const isActive =
        itemSectionId === targetSection.id;

      item.classList.toggle(
        "active",
        isActive
      );

      item.classList.toggle(
        "is-active",
        isActive
      );

      item.setAttribute(
        "aria-current",
        isActive ? "page" : "false"
      );
    });

    if (updateUrl) {
      const newUrl =
        `${window.location.pathname}${window.location.search} #${targetSection.id} `;

      window.history.replaceState(
        null,
        "",
        newUrl
      );
    }

    targetSection.scrollIntoView({
      behavior: settings.animations ? "smooth" : "auto",
      block: "start"
    });
  }

  /* Navigation events */

  navigationItems.forEach(item => {
    item.addEventListener("click", event => {
      const href = item.getAttribute("href");

      if (!href || !href.startsWith("#")) {
        return;
      }

      event.preventDefault();

      const sectionId = href.substring(1);

      showSettingsSection(sectionId);
    });
  });

  /* Initial section */

  function initializeSettingsSection() {
    const hash = window.location.hash.replace("#", "");

    if (
      hash &&
      document.getElementById(hash) &&
      document.getElementById(hash).classList.contains(
        "settings-section"
      )
    ) {
      showSettingsSection(hash, false);
      return;
    }

    showSettingsSection("appearance", false);
  }

  /* Update setting */

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
      window.AdumexMemory &&
      typeof window.AdumexMemory.setEnabled === "function"
    ) {
      window.AdumexMemory.setEnabled(value);
    }

    window.dispatchEvent(
      new CustomEvent("adumexSettingChanged", {
        detail: {
          key,
          value
        }
      })
    );
  }

  /* Theme */

  if (themeSelect) {
    themeSelect.addEventListener("change", event => {
      updateSetting(
        "theme",
        event.target.value
      );
    });
  }

  /* Animations */

  if (animationsToggle) {
    animationsToggle.addEventListener("change", event => {
      updateSetting(
        "animations",
        event.target.checked
      );
    });
  }

  /* Enter to send */

  if (enterSendToggle) {
    enterSendToggle.addEventListener("change", event => {
      const enabled = event.target.checked;

      updateSetting(
        "enterToSend",
        enabled
      );

      if (
        window.AdumexChatSettings &&
        typeof window.AdumexChatSettings.setEnterToSend ===
        "function"
      ) {
        window.AdumexChatSettings.setEnterToSend(
          enabled
        );
      }
    });
  }

  /* Timestamps */

  if (timestampsToggle) {
    timestampsToggle.addEventListener("change", event => {
      const enabled = event.target.checked;

      updateSetting(
        "timestamps",
        enabled
      );

      if (
        window.AdumexChatSettings &&
        typeof window.AdumexChatSettings.setTimestamps ===
        "function"
      ) {
        window.AdumexChatSettings.setTimestamps(
          enabled
        );
      }
    });
  }

  /* Memory */

  if (memoryToggle) {
    memoryToggle.addEventListener("change", event => {
      updateSetting(
        "memory",
        event.target.checked
      );
    });
  }

  /* Notifications */

  if (notificationsToggle) {
    notificationsToggle.addEventListener(
      "change",
      async event => {
        const enabled = event.target.checked;

        if (!enabled) {
          updateSetting(
            "notifications",
            false
          );
          return;
        }

        if (!("Notification" in window)) {
          alert(
            "Browser notifications are not supported on this device."
          );

          event.target.checked = false;

          updateSetting(
            "notifications",
            false
          );

          return;
        }

        try {
          const permission =
            await Notification.requestPermission();

          if (permission === "granted") {
            updateSetting(
              "notifications",
              true
            );
          } else {
            event.target.checked = false;

            updateSetting(
              "notifications",
              false
            );
          }
        } catch {
          event.target.checked = false;

          updateSetting(
            "notifications",
            false
          );
        }
      }
    );
  }

  /* Language */

  if (languageSelect) {
    languageSelect.addEventListener("change", event => {
      updateSetting(
        "language",
        event.target.value
      );
    });
  }

  /* Memory changes */

  window.addEventListener(
    "adumexMemoryChanged",
    event => {
      if (
        !event.detail ||
        typeof event.detail.enabled !== "boolean"
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

  /* System theme */

  const systemTheme = window.matchMedia(
    "(prefers-color-scheme: dark)"
  );

  systemTheme.addEventListener(
    "change",
    () => {
      if (settings.theme === "system") {
        applyTheme();
      }
    }
  );

  /* Public API */

  window.AdumexSettings = {
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

    showSection(sectionId) {
      showSettingsSection(sectionId);
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
        window.AdumexMemory &&
        typeof window.AdumexMemory.setEnabled === "function"
      ) {
        window.AdumexMemory.setEnabled(true);
      }

      window.dispatchEvent(
        new CustomEvent(
          "adumexSettingsReset"
        )
      );
    }
  };

  /* Initialize */

  syncControls();
  applyTheme();
  applyAnimations();
  applyDataPreferences();
  initializeSettingsSection();
});
