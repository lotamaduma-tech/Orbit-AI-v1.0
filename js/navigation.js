/* =========================================================
   ORBIT AI
   NAVIGATION SYSTEM
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const navToggle = document.getElementById("navToggle");
    const navClose = document.getElementById("navClose");
    const navDrawer = document.getElementById("orbitNav");
    const navOverlay = document.getElementById("navOverlay");



    /* =====================================================
       SAFETY CHECK
       ===================================================== */

    if (
        !navToggle ||
        !navClose ||
        !navDrawer ||
        !navOverlay
    ) {
        console.warn(
            "Orbit AI navigation elements were not found."
        );

        return;
    }



    /* =====================================================
       OPEN NAVIGATION
       ===================================================== */

    function openNavigation() {

        navDrawer.classList.add("open");

        navOverlay.classList.add("active");

        document.body.classList.add("nav-open");

        navToggle.setAttribute(
            "aria-expanded",
            "true"
        );

        navDrawer.setAttribute(
            "aria-hidden",
            "false"
        );

    }



    /* =====================================================
       CLOSE NAVIGATION
       ===================================================== */

    function closeNavigation() {

        navDrawer.classList.remove("open");

        navOverlay.classList.remove("active");

        document.body.classList.remove("nav-open");

        navToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        navDrawer.setAttribute(
            "aria-hidden",
            "true"
        );

    }



    /* =====================================================
       TOGGLE NAVIGATION
       ===================================================== */

    function toggleNavigation() {

        const isOpen =
            navDrawer.classList.contains("open");

        if (isOpen) {

            closeNavigation();

        } else {

            openNavigation();

        }

    }



    /* =====================================================
       TOGGLE BUTTON
       ===================================================== */

    navToggle.addEventListener(
        "click",
        toggleNavigation
    );



    /* =====================================================
       CLOSE BUTTON
       ===================================================== */

    navClose.addEventListener(
        "click",
        closeNavigation
    );



    /* =====================================================
       OVERLAY CLICK
       ===================================================== */

    navOverlay.addEventListener(
        "click",
        closeNavigation
    );



    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                navDrawer.classList.contains("open")
            ) {

                closeNavigation();

                navToggle.focus();

            }

        }
    );



    /* =====================================================
       CLOSE AFTER NAVIGATION
       ===================================================== */

    const navLinks =
        navDrawer.querySelectorAll(
            ".nav-menu a"
        );


    navLinks.forEach((link) => {

        link.addEventListener(
            "click",
            () => {

                closeNavigation();

            }
        );

    });



    /* =====================================================
       AUTOMATIC ACTIVE PAGE
       ===================================================== */

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    navLinks.forEach((link) => {

        const linkPage =
            link
                .getAttribute("href")
                .split("/")
                .pop()
                .toLowerCase();


        link.classList.remove("active");

        link.removeAttribute(
            "aria-current"
        );


        if (
            linkPage === currentPage ||
            (
                currentPage === "" &&
                linkPage === "index.html"
            )
        ) {

            link.classList.add("active");

            link.setAttribute(
                "aria-current",
                "page"
            );

        }

    });



    /* =====================================================
       POWER BUTTON
       ===================================================== */

    const powerButton =
        document.querySelector(".power-btn");


    if (powerButton) {

        powerButton.addEventListener(
            "click",
            () => {

                /*
                 * We are intentionally not shutting
                 * down the browser or system.
                 *
                 * This button can later be connected
                 * to Orbit's application state.
                 */

                closeNavigation();

                console.log(
                    "Orbit AI power control activated."
                );

            }
        );

    }



    /* =====================================================
       INITIAL STATE
       ===================================================== */

    closeNavigation();

});