/* =========================================================
   ORBIT AI — GLOBAL ANIMATION CONTROLLER
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const ANIMATION_KEY = "orbitAnimations";

    const root = document.documentElement;

    const animationToggle =
        document.getElementById("interface-animation");


    /* =====================================================
       GET SAVED PREFERENCE
       ===================================================== */

    function getAnimationPreference() {

        const saved =
            localStorage.getItem(ANIMATION_KEY);

        /*
         * Animations are ON by default.
         */

        if (saved === null) {
            return true;
        }

        return saved === "true";
    }


    /* =====================================================
       APPLY ANIMATION SETTING
       ===================================================== */

    function applyAnimations(enabled) {

        root.setAttribute(
            "data-animations",
            enabled
                ? "enabled"
                : "disabled"
        );


        localStorage.setItem(
            ANIMATION_KEY,
            enabled
                ? "true"
                : "false"
        );


        /*
         * Update the toggle.
         */

        if (animationToggle) {

            animationToggle.checked =
                enabled;

            animationToggle.setAttribute(
                "aria-checked",
                enabled
                    ? "true"
                    : "false"
            );

        }


        /*
         * Tell other Orbit scripts.
         */

        window.dispatchEvent(
            new CustomEvent(
                "orbitAnimationsChanged",
                {
                    detail: {
                        enabled: enabled
                    }
                }
            )
        );

    }


    /* =====================================================
       TOGGLE EVENT
       ===================================================== */

    if (animationToggle) {

        animationToggle.addEventListener(
            "change",
            () => {

                applyAnimations(
                    animationToggle.checked
                );

            }
        );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    applyAnimations(
        getAnimationPreference()
    );


    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.OrbitAnimation = {

        enable() {
            applyAnimations(true);
        },

        disable() {
            applyAnimations(false);
        },

        toggle() {

            applyAnimations(
                root.getAttribute(
                    "data-animations"
                ) !== "enabled"
            );

        },

        isEnabled() {

            return (
                root.getAttribute(
                    "data-animations"
                ) === "enabled"
            );

        }

    };

});