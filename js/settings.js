/* =========================================================
   ORBIT AI — SETTINGS
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
    ===================================================== */

    const themeSelect = document.getElementById("theme-select");
    const accentSelect = document.getElementById("accent-select");
    const notificationsToggle = document.getElementById("notifications-toggle");
    const animationsToggle = document.getElementById("animations-toggle");

    const clearDataButton = document.getElementById("clear-data-button");
    const resetSettingsButton = document.getElementById("reset-settings-button");

    const termsButton = document.getElementById("terms-button");
    const privacyButton = document.getElementById("privacy-button");

    const termsModal = document.getElementById("terms-modal");
    const privacyModal = document.getElementById("privacy-modal");

    const modalCloseButtons =
        document.querySelectorAll(".settings-modal-close");

    const modalOverlays =
        document.querySelectorAll(".settings-modal-overlay");


    /* =====================================================
       STORAGE
    ===================================================== */

    const SETTINGS_KEY = "orbitAISettings";


    const defaultSettings = {
        theme: "system",
        accent: "default",
        notifications: true,
        animations: true
    };


    let settings = loadSettings();


    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    function loadSettings() {

        try {

            const saved =
                localStorage.getItem(SETTINGS_KEY);

            if (!saved) {
                return { ...defaultSettings };
            }

            return {
                ...defaultSettings,
                ...JSON.parse(saved)
            };

        } catch (error) {

            console.error(
                "Unable to load Orbit AI settings:",
                error
            );

            return { ...defaultSettings };

        }

    }


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    function saveSettings() {

        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(settings)
        );

    }


    /* =====================================================
       APPLY THEME
       ===================================================== */

    function applyTheme() {

        const root =
            document.documentElement;

        root.removeAttribute("data-theme");


        if (settings.theme === "dark") {

            root.setAttribute(
                "data-theme",
                "dark"
            );

        }


        if (settings.theme === "light") {

            root.setAttribute(
                "data-theme",
                "light"
            );

        }


        if (settings.theme === "system") {

            const prefersDark =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches;

            root.setAttribute(
                "data-theme",
                prefersDark
                    ? "dark"
                    : "light"
            );

        }

    }


    /* =====================================================
       APPLY ACCENT
       ===================================================== */

    function applyAccent() {

        document.documentElement
            .setAttribute(
                "data-accent",
                settings.accent
            );

    }


    /* =====================================================
       APPLY ANIMATIONS
       ===================================================== */

    function applyAnimations() {

        if (settings.animations) {

            document.documentElement
                .removeAttribute(
                    "data-reduced-motion"
                );

        } else {

            document.documentElement
                .setAttribute(
                    "data-reduced-motion",
                    "true"
                );

        }

    }


    /* =====================================================
       APPLY ALL SETTINGS
       ===================================================== */

    function applySettings() {

        applyTheme();

        applyAccent();

        applyAnimations();

    }


    /* =====================================================
       UPDATE FORM CONTROLS
    ===================================================== */

    function updateControls() {

        if (themeSelect) {

            themeSelect.value =
                settings.theme;

        }


        if (accentSelect) {

            accentSelect.value =
                settings.accent;

        }


        if (notificationsToggle) {

            notificationsToggle.checked =
                settings.notifications;

        }


        if (animationsToggle) {

            animationsToggle.checked =
                settings.animations;

        }

    }


    /* =====================================================
       THEME
    ===================================================== */

    if (themeSelect) {

        themeSelect.addEventListener(
            "change",
            () => {

                settings.theme =
                    themeSelect.value;

                saveSettings();

                applyTheme();

            }
        );

    }


    /* =====================================================
       ACCENT
    ===================================================== */

    if (accentSelect) {

        accentSelect.addEventListener(
            "change",
            () => {

                settings.accent =
                    accentSelect.value;

                saveSettings();

                applyAccent();

            }
        );

    }


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    if (notificationsToggle) {

        notificationsToggle.addEventListener(
            "change",
            () => {

                settings.notifications =
                    notificationsToggle.checked;

                saveSettings();

            }
        );

    }


    /* =====================================================
       ANIMATIONS
    ===================================================== */

    if (animationsToggle) {

        animationsToggle.addEventListener(
            "change",
            () => {

                settings.animations =
                    animationsToggle.checked;

                saveSettings();

                applyAnimations();

            }
        );

    }


    /* =====================================================
       CLEAR ORBIT DATA
    ===================================================== */

    if (clearDataButton) {

        clearDataButton.addEventListener(
            "click",
            () => {

                const confirmed =
                    confirm(
                        "This will remove your saved Orbit AI data from this browser. Continue?"
                    );

                if (!confirmed) {
                    return;
                }


                /*
                 * Remove Orbit-specific local data.
                 */

                const keysToRemove = [

                    "orbitCalendarEvents",
                    "orbitCalendar",
                    "orbitAISettings",
                    "orbitFiles",
                    "orbitFilesData",
                    "orbitMusic",
                    "orbitMusicPlaylist"

                ];


                keysToRemove.forEach(
                    key => {
                        localStorage.removeItem(key);
                    }
                );


                settings =
                    { ...defaultSettings };


                saveSettings();

                updateControls();

                applySettings();


                alert(
                    "Orbit AI local data has been cleared."
                );

            }
        );

    }


    /* =====================================================
       RESET SETTINGS
    ===================================================== */

    if (resetSettingsButton) {

        resetSettingsButton.addEventListener(
            "click",
            () => {

                const confirmed =
                    confirm(
                        "Reset all Orbit AI settings to their defaults?"
                    );

                if (!confirmed) {
                    return;
                }


                settings =
                    { ...defaultSettings };


                saveSettings();

                updateControls();

                applySettings();


                alert(
                    "Orbit AI settings have been reset."
                );

            }
        );

    }


    /* =====================================================
       OPEN MODAL
    ===================================================== */

    function openModal(modal) {

        if (!modal) {
            return;
        }


        modal.classList.add("open");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal(modal) {

        if (!modal) {
            return;
        }


        modal.classList.remove("open");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    /* =====================================================
       TERMS
    ===================================================== */

    if (termsButton) {

        termsButton.addEventListener(
            "click",
            () => {

                openModal(termsModal);

            }
        );

    }


    /* =====================================================
       PRIVACY
    ===================================================== */

    if (privacyButton) {

        privacyButton.addEventListener(
            "click",
            () => {

                openModal(privacyModal);

            }
        );

    }


    /* =====================================================
       CLOSE BUTTONS
    ===================================================== */

    modalCloseButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const modal =
                        button.closest(
                            ".settings-modal"
                        );

                    closeModal(modal);

                }
            );

        }
    );


    /* =====================================================
       MODAL OVERLAYS
    ===================================================== */

    modalOverlays.forEach(
        overlay => {

            overlay.addEventListener(
                "click",
                () => {

                    const modal =
                        overlay.closest(
                            ".settings-modal"
                        );

                    closeModal(modal);

                }
            );

        }
    );


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Escape") {
                return;
            }


            document
                .querySelectorAll(
                    ".settings-modal.open"
                )
                .forEach(
                    modal => {
                        closeModal(modal);
                    }
                );

        }
    );


    /* =====================================================
       SYSTEM THEME CHANGES
    ===================================================== */

    const mediaQuery =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        );


    mediaQuery.addEventListener(
        "change",
        () => {

            if (
                settings.theme ===
                "system"
            ) {

                applyTheme();

            }

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    updateControls();

    applySettings();

});