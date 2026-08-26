"use strict";

/* Orbit chat settings */

const ORBIT_ENTER_SEND_KEY =
    "orbit-enter-to-send";

const ORBIT_TIMESTAMPS_KEY =
    "orbit-message-timestamps";


/* Load saved settings */

function loadOrbitChatSettings() {
    const enterSendToggle =
        document.getElementById(
            "enter-send-toggle"
        );

    const timestampsToggle =
        document.getElementById(
            "timestamps-toggle"
        );

    if (enterSendToggle) {
        const savedEnterSend =
            localStorage.getItem(
                ORBIT_ENTER_SEND_KEY
            );

        enterSendToggle.checked =
            savedEnterSend === null
                ? true
                : savedEnterSend === "true";
    }

    if (timestampsToggle) {
        const savedTimestamps =
            localStorage.getItem(
                ORBIT_TIMESTAMPS_KEY
            );

        timestampsToggle.checked =
            savedTimestamps === "true";
    }

    applyOrbitTimestampSetting();
}


/* Save Enter setting */

function saveOrbitEnterSendSetting(
    enabled
) {
    localStorage.setItem(
        ORBIT_ENTER_SEND_KEY,
        String(enabled)
    );
}


/* Save timestamp setting */

function saveOrbitTimestampSetting(
    enabled
) {
    localStorage.setItem(
        ORBIT_TIMESTAMPS_KEY,
        String(enabled)
    );
}


/* Check Enter setting */

function isOrbitEnterToSendEnabled() {
    const saved =
        localStorage.getItem(
            ORBIT_ENTER_SEND_KEY
        );

    return saved === null
        ? true
        : saved === "true";
}


/* Check timestamp setting */

function isOrbitTimestampsEnabled() {
    return (
        localStorage.getItem(
            ORBIT_TIMESTAMPS_KEY
        ) === "true"
    );
}


/* Apply timestamp visibility */

function applyOrbitTimestampSetting() {
    document.documentElement.classList.toggle(
        "orbit-hide-timestamps",
        !isOrbitTimestampsEnabled()
    );
}


/* Setup controls */

function setupOrbitChatSettings() {
    const enterSendToggle =
        document.getElementById(
            "enter-send-toggle"
        );

    const timestampsToggle =
        document.getElementById(
            "timestamps-toggle"
        );

    if (enterSendToggle) {
        enterSendToggle.addEventListener(
            "change",
            () => {
                saveOrbitEnterSendSetting(
                    enterSendToggle.checked
                );
            }
        );
    }

    if (timestampsToggle) {
        timestampsToggle.addEventListener(
            "change",
            () => {
                saveOrbitTimestampSetting(
                    timestampsToggle.checked
                );

                applyOrbitTimestampSetting();
            }
        );
    }

    loadOrbitChatSettings();
}


/* Initialize */

document.addEventListener(
    "DOMContentLoaded",
    setupOrbitChatSettings
);