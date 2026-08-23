/* =========================================================
   ORBIT AI — PART 2
   SIDEBAR + NAVIGATION JAVASCRIPT

   Controls:
   .orbit-app
   .orbit-sidebar
   .sidebar-close
   .navigation-overlay
   .menu-toggle

   States:
   .orbit-app.nav-open
   .orbit-sidebar.active
   .navigation-overlay.active

   Behavior:
   CLOSED:
   - Dashboard visible
   - Menu button visible
   - Sidebar hidden

   OPEN:
   - Sidebar slides in
   - Menu button disappears
   - Close button appears inside sidebar
   - Overlay appears

   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       1. ELEMENT REFERENCES
       ========================================================= */

    const orbitApp = document.querySelector(".orbit-app");
    const sidebar = document.querySelector(".orbit-sidebar");
    const menuToggle = document.querySelector(".menu-toggle");
    const sidebarClose = document.querySelector(".sidebar-close");
    const navigationOverlay =
        document.querySelector(".navigation-overlay");


    /* =========================================================
       2. SAFETY CHECK
       ========================================================= */

    if (
        !orbitApp ||
        !sidebar ||
        !menuToggle ||
        !sidebarClose
    ) {
        console.warn(
            "Orbit AI navigation: required elements were not found."
        );

        return;
    }


    /* =========================================================
       3. OPEN SIDEBAR
       ========================================================= */

    function openNavigation() {

        orbitApp.classList.add("nav-open");
        sidebar.classList.add("active");

        if (navigationOverlay) {
            navigationOverlay.classList.add("active");
        }

        /* Accessibility */

        menuToggle.setAttribute("aria-expanded", "true");
        sidebarClose.setAttribute("aria-label", "Close navigation");

        document.body.classList.add("navigation-open");
    }


    /* =========================================================
       4. CLOSE SIDEBAR
       ========================================================= */

    function closeNavigation() {

        orbitApp.classList.remove("nav-open");
        sidebar.classList.remove("active");

        if (navigationOverlay) {
            navigationOverlay.classList.remove("active");
        }

        /* Accessibility */

        menuToggle.setAttribute("aria-expanded", "false");

        document.body.classList.remove("navigation-open");

        /*
          Return focus to the menu button
          after closing the sidebar.
        */

        if (document.activeElement === sidebarClose) {
            menuToggle.focus();
        }
    }


    /* =========================================================
       5. MENU BUTTON
       ========================================================= */

    menuToggle.addEventListener("click", (event) => {

        event.preventDefault();

        const isOpen =
            orbitApp.classList.contains("nav-open");

        if (isOpen) {
            closeNavigation();
        } else {
            openNavigation();
        }

    });


    /* =========================================================
       6. CLOSE BUTTON
       ========================================================= */

    sidebarClose.addEventListener("click", (event) => {

        event.preventDefault();

        closeNavigation();

    });


    /* =========================================================
       7. OVERLAY CLOSE
       ========================================================= */

    if (navigationOverlay) {

        navigationOverlay.addEventListener("click", () => {

            closeNavigation();

        });

    }


    /* =========================================================
       8. ESCAPE KEY
       ========================================================= */

    document.addEventListener("keydown", (event) => {

        if (event.key !== "Escape") {
            return;
        }

        if (orbitApp.classList.contains("nav-open")) {
            closeNavigation();
        }

    });


    /* =========================================================
       9. CLOSE NAVIGATION WHEN A SIDEBAR LINK IS CLICKED
       ========================================================= */

    sidebar.addEventListener("click", (event) => {

        const link = event.target.closest(
            ".sidebar-account-link"
        );

        if (!link) {
            return;
        }

        /*
          Allow the link's normal action to happen,
          then close the mobile navigation.
        */

        if (window.innerWidth <= 768) {
            closeNavigation();
        }

    });


    /* =========================================================
       10. PREVENT SIDEBAR CLICK FROM CLOSING IT
       ========================================================= */

    sidebar.addEventListener("click", (event) => {

        event.stopPropagation();

    });


    /* =========================================================
       11. HANDLE WINDOW RESIZE
       ========================================================= */

    window.addEventListener("resize", () => {

        /*
          If the screen becomes wider while the navigation
          is open, reset it.
    
          This prevents a stale mobile navigation state
          from remaining after resizing.
        */

        if (
            window.innerWidth > 768 &&
            orbitApp.classList.contains("nav-open")
        ) {
            closeNavigation();
        }

    });


    /* =========================================================
       12. INITIAL STATE
       ========================================================= */

    /*
      IMPORTANT:
  
      Orbit AI starts with the sidebar CLOSED.
  
      The user initially sees:
      - AI dashboard
      - Menu button
  
      The sidebar only appears after clicking the menu button.
    */

    closeNavigation();


    /* =========================================================
       13. INITIAL ACCESSIBILITY STATE
       ========================================================= */

    menuToggle.setAttribute(
        "aria-expanded",
        "false"
    );

    menuToggle.setAttribute(
        "aria-controls",
        sidebar.id || "orbit-sidebar"
    );


    /* =========================================================
       14. DEBUG MESSAGE
       ========================================================= */

    console.log(
        "Orbit AI navigation system initialized."
    );

});