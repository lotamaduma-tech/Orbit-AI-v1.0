"use strict";

(function () {
    const languageSelect = document.getElementById("language-select");
    const languageModal = document.getElementById("language-coming-soon");

    if (!languageSelect || !languageModal) {
        return;
    }

    const closeButton = languageModal.querySelector(".coming-soon-close");
    const doneButton = languageModal.querySelector(".coming-soon-btn");
    const backdrop = languageModal.querySelector(".coming-soon-backdrop");

    function openLanguageModal() {
        languageModal.classList.add("active");
        languageModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function closeLanguageModal() {
        languageModal.classList.remove("active");
        languageModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
        languageSelect.value = "en";
    }

    languageSelect.addEventListener("click", function (event) {
        event.preventDefault();
        openLanguageModal();
    });

    languageSelect.addEventListener("mousedown", function (event) {
        event.preventDefault();
        openLanguageModal();
    });

    languageSelect.addEventListener("change", function () {
        openLanguageModal();
    });

    closeButton.addEventListener("click", closeLanguageModal);
    doneButton.addEventListener("click", closeLanguageModal);
    backdrop.addEventListener("click", closeLanguageModal);

    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            languageModal.classList.contains("active")
        ) {
            closeLanguageModal();
        }
    });
})();
