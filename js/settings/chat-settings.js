"use strict";

(() => {
    const SETTINGS_KEY = "orbitAISettings";

    const DEFAULT_CHAT_SETTINGS = {
        enterToSend: true,
        timestamps: false
    };

    function getSettings() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);

            if (!saved) {
                return {};
            }

            const parsed = JSON.parse(saved);

            return parsed && typeof parsed === "object"
                ? parsed
                : {};
        } catch {
            return {};
        }
    }

    function getChatSettings() {
        const settings = getSettings();

        return {
            enterToSend:
                typeof settings.enterToSend === "boolean"
                    ? settings.enterToSend
                    : DEFAULT_CHAT_SETTINGS.enterToSend,

            timestamps:
                typeof settings.timestamps === "boolean"
                    ? settings.timestamps
                    : DEFAULT_CHAT_SETTINGS.timestamps
        };
    }

    function saveChatSetting(key, value) {
        const settings = getSettings();

        settings[key] = Boolean(value);

        try {
            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );
        } catch (error) {
            console.warn(
                "Orbit chat setting could not be saved.",
                error
            );

            return false;
        }

        window.dispatchEvent(
            new CustomEvent("orbitChatSettingChanged", {
                detail: {
                    key,
                    value: Boolean(value)
                }
            })
        );

        return true;
    }

    function isEnterToSendEnabled() {
        return getChatSettings().enterToSend;
    }

    function isTimestampsEnabled() {
        return getChatSettings().timestamps;
    }

    function applyEnterToSendSetting() {
        const enabled =
            isEnterToSendEnabled();

        document.documentElement.setAttribute(
            "data-enter-to-send",
            enabled ? "true" : "false"
        );
    }

    function applyTimestampSetting() {
        const enabled =
            isTimestampsEnabled();

        document.documentElement.setAttribute(
            "data-show-timestamps",
            enabled ? "true" : "false"
        );

        document.documentElement.classList.toggle(
            "orbit-hide-timestamps",
            !enabled
        );
    }

    function applyChatSettings() {
        applyEnterToSendSetting();
        applyTimestampSetting();
    }

    function syncControls() {
        const settings =
            getChatSettings();

        const enterSendToggle =
            document.getElementById(
                "enter-send-toggle"
            );

        const timestampsToggle =
            document.getElementById(
                "timestamps-toggle"
            );

        if (enterSendToggle) {
            enterSendToggle.checked =
                settings.enterToSend;
        }

        if (timestampsToggle) {
            timestampsToggle.checked =
                settings.timestamps;
        }
    }

    function setupControls() {
        const enterSendToggle =
            document.getElementById(
                "enter-send-toggle"
            );

        const timestampsToggle =
            document.getElementById(
                "timestamps-toggle"
            );

        if (
            enterSendToggle &&
            enterSendToggle.dataset
                .orbitChatReady !== "true"
        ) {
            enterSendToggle.dataset
                .orbitChatReady = "true";

            enterSendToggle.addEventListener(
                "change",
                event => {
                    saveChatSetting(
                        "enterToSend",
                        event.target.checked
                    );

                    applyEnterToSendSetting();
                }
            );
        }

        if (
            timestampsToggle &&
            timestampsToggle.dataset
                .orbitChatReady !== "true"
        ) {
            timestampsToggle.dataset
                .orbitChatReady = "true";

            timestampsToggle.addEventListener(
                "change",
                event => {
                    saveChatSetting(
                        "timestamps",
                        event.target.checked
                    );

                    applyTimestampSetting();
                }
            );
        }

        syncControls();
        applyChatSettings();
    }

    window.addEventListener(
        "storage",
        event => {
            if (event.key !== SETTINGS_KEY) {
                return;
            }

            syncControls();
            applyChatSettings();
        }
    );

    window.addEventListener(
        "orbitSettingsChanged",
        () => {
            syncControls();
            applyChatSettings();
        }
    );

    window.OrbitChatSettings = {
        get: getChatSettings,

        isEnterToSendEnabled:
            isEnterToSendEnabled,

        isTimestampsEnabled:
            isTimestampsEnabled,

        setEnterToSend: enabled => {
            saveChatSetting(
                "enterToSend",
                enabled
            );

            applyEnterToSendSetting();
        },

        setTimestamps: enabled => {
            saveChatSetting(
                "timestamps",
                enabled
            );

            applyTimestampSetting();
        },

        apply: applyChatSettings,

        syncControls
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            setupControls
        );
    } else {
        setupControls();
    }
})();