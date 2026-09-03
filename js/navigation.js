"use strict";

/* =========================================================
   ADUMEX NAVIGATION
   ========================================================= */

(function () {
  const app = document.querySelector(".adumex-app");
  const sidebar = document.getElementById("adumex-sidebar");
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const overlay = document.getElementById("navigation-overlay");

  if (!app || !sidebar || !menuToggle) {
    return;
  }

  const MOBILE_BREAKPOINT = 768;

  let isOpen = false;


  /* =========================================================
     HELPERS
     ========================================================= */

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }


  function updateAria() {
    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );

    menuToggle.setAttribute(
      "title",
      isOpen ? "Close navigation" : "Open navigation"
    );

    if (overlay) {
      overlay.setAttribute(
        "aria-hidden",
        String(!isOpen)
      );
    }
  }


  function openNavigation() {
    isOpen = true;

    app.classList.add("nav-open");
    app.classList.remove("nav-closed");

    updateAria();

    if (isMobile()) {
      document.body.classList.add("navigation-open");
    }
  }


  function closeNavigation() {
    isOpen = false;

    app.classList.remove("nav-open");
    app.classList.add("nav-closed");

    updateAria();

    document.body.classList.remove("navigation-open");
  }


  function toggleNavigation() {
    if (isOpen) {
      closeNavigation();
    } else {
      openNavigation();
    }
  }


  /* =========================================================
     EVENTS
     ========================================================= */

  menuToggle.addEventListener("click", function () {
    toggleNavigation();
  });


  if (menuClose) {
    menuClose.addEventListener("click", function () {
      closeNavigation();
    });
  }


  if (overlay) {
    overlay.addEventListener("click", function () {
      closeNavigation();
    });
  }


  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }

    if (isMobile() && isOpen) {
      closeNavigation();
    }
  });


  /* =========================================================
     RESPONSIVE STATE
     ========================================================= */

  function handleResize() {
    if (isMobile()) {
      closeNavigation();
      return;
    }

    openNavigation();
  }


  window.addEventListener("resize", handleResize);


  /* =========================================================
     INITIAL STATE
     ========================================================= */

  if (isMobile()) {
    closeNavigation();
  } else {
    openNavigation();
  }

})();
