document.addEventListener("DOMContentLoaded", () => {
  // Storage keys & defaults
  const SETTINGS_KEY = "orbitAISettings";
  const defaultSettings = {
    theme: "system",
    animations: true,
    enterToSend: true,
    timestamps: false,
    memory: true,
    notifications: false,
    language: "en",
  };

  let settings = loadSettings();

  // DOM Elements
  const themeSelect = document.getElementById("theme-select");
  const animationsToggle = document.getElementById("animations-toggle");
  const enterSendToggle = document.getElementById("enter-send-toggle");
  const timestampsToggle = document.getElementById("timestamps-toggle");
  const memoryToggle = document.getElementById("memory-toggle");
  const notificationsToggle = document.getElementById("notifications-toggle");
  const languageSelect = document.getElementById("language-select");
  const manageMemory = document.getElementById("manage-memory");
  const clearDataBtn = document.getElementById("clear-data-button");

  // Load and save settings helpers
  function loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return { ...defaultSettings };
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (error) {
      console.warn("Orbit settings could not be loaded.", error);
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("Orbit settings could not be saved.", error);
    }
  }

  // Theme management
  function applyTheme() {
    const root = document.documentElement;
    let theme = settings.theme;

    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }

    root.setAttribute("data-theme", theme);
  }

  // Animation management
  function applyAnimations() {
    const root = document.documentElement;
    if (settings.animations) {
      root.setAttribute("data-animations", "true");
      root.removeAttribute("data-reduced-motion");
    } else {
      root.setAttribute("data-animations", "false");
      root.setAttribute("data-reduced-motion", "true");
    }
  }

  // Sync controls with state
  function syncControls() {
    if (themeSelect) themeSelect.value = settings.theme;
    if (animationsToggle) animationsToggle.checked = settings.animations;
    if (enterSendToggle) enterSendToggle.checked = settings.enterToSend;
    if (timestampsToggle) timestampsToggle.checked = settings.timestamps;
    if (memoryToggle) memoryToggle.checked = settings.memory;
    if (notificationsToggle) notificationsToggle.checked = settings.notifications;
    if (languageSelect) languageSelect.value = settings.language;
  }

  // Event Listeners: Theme
  if (themeSelect) {
    themeSelect.addEventListener("change", function () {
      settings.theme = this.value;
      saveSettings();
      applyTheme();
    });
  }

  // Event Listeners: Animations
  if (animationsToggle) {
    animationsToggle.addEventListener("change", function () {
      settings.animations = this.checked;
      saveSettings();
      applyAnimations();
    });
  }

  // Event Listeners: Enter to Send
  if (enterSendToggle) {
    enterSendToggle.addEventListener("change", function () {
      settings.enterToSend = this.checked;
      saveSettings();
      document.documentElement.setAttribute(
        "data-enter-to-send",
        this.checked ? "true" : "false"
      );
    });
  }

  // Event Listeners: Timestamps
  if (timestampsToggle) {
    timestampsToggle.addEventListener("change", function () {
      settings.timestamps = this.checked;
      saveSettings();
      document.documentElement.setAttribute(
        "data-show-timestamps",
        this.checked ? "true" : "false"
      );
    });
  }

  // Event Listeners: Memory
  if (memoryToggle) {
    memoryToggle.addEventListener("change", function () {
      settings.memory = this.checked;
      saveSettings();
      document.documentElement.setAttribute(
        "data-memory",
        this.checked ? "enabled" : "disabled"
      );
    });
  }

  if (manageMemory) {
    manageMemory.addEventListener("click", function (event) {
      event.preventDefault();
      alert("Memory management will be available here soon.");
    });
  }

  // Event Listeners: Notifications
  if (notificationsToggle) {
    notificationsToggle.addEventListener("change", async function () {
      if (!this.checked) {
        settings.notifications = false;
        saveSettings();
        return;
      }

      if (!("Notification" in window)) {
        alert("Browser notifications are not supported on this device.");
        this.checked = false;
        settings.notifications = false;
        saveSettings();
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          settings.notifications = true;
        } else {
          settings.notifications = false;
          this.checked = false;
        }
        saveSettings();
      } catch (error) {
        console.warn("Notification permission failed.", error);
        settings.notifications = false;
        this.checked = false;
        saveSettings();
      }
    });
  }

  // Event Listeners: Language
  if (languageSelect) {
    languageSelect.addEventListener("change", function () {
      settings.language = this.value;
      saveSettings();
      document.documentElement.setAttribute("lang", settings.language);
    });
  }

  // Event Listeners: Clear Data
  if (clearDataBtn) {
    clearDataBtn.addEventListener("click", function () {
      const confirmed = confirm(
        "Clear your saved Orbit settings and local preferences?"
      );
      if (!confirmed) return;

      localStorage.removeItem(SETTINGS_KEY);
      settings = { ...defaultSettings };

      syncControls();
      applyTheme();
      applyAnimations();

      document.documentElement.setAttribute("data-enter-to-send", "true");
      document.documentElement.setAttribute("data-show-timestamps", "false");
      document.documentElement.setAttribute("data-memory", "enabled");
      document.documentElement.setAttribute("lang", "en");

      alert("Orbit settings have been reset.");
    });
  }

  // System Theme Listener
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  systemTheme.addEventListener("change", function () {
    if (settings.theme === "system") {
      applyTheme();
    }
  });

  // Initialization
  function applyDataPreferences() {
    document.documentElement.setAttribute(
      "data-enter-to-send",
      settings.enterToSend ? "true" : "false"
    );
    document.documentElement.setAttribute(
      "data-show-timestamps",
      settings.timestamps ? "true" : "false"
    );
    document.documentElement.setAttribute(
      "data-memory",
      settings.memory ? "enabled" : "disabled"
    );
    document.documentElement.setAttribute("lang", settings.language);
  }

  syncControls();
  applyTheme();
  applyAnimations();
  applyDataPreferences();
});