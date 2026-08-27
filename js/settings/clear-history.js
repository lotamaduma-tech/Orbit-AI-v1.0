"use strict";

const OrbitClearHistory = (() => {
    const BUTTON_ID = "clear-history-btn";

    async function clearHistory() {
        const clearButton = document.getElementById(BUTTON_ID);

        if (!clearButton) {
            return;
        }

        if (clearButton.dataset.clearing === "true") {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to clear your conversation history? This cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        clearButton.dataset.clearing = "true";
        clearButton.disabled = true;

        const originalHTML = clearButton.innerHTML;

        clearButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Clearing...
        `;

        try {
            if (
                window.OrbitCloud &&
                typeof window.OrbitCloud.clearConversationHistory === "function"
            ) {
                await window.OrbitCloud.clearConversationHistory();
            }

            if (
                typeof window.clearOrbitLocalConversationHistory === "function"
            ) {
                window.clearOrbitLocalConversationHistory();
            }

            if (
                typeof window.clearOrbitActiveChatId === "function"
            ) {
                window.clearOrbitActiveChatId();
            }

            if (
                typeof window.refreshOrbitRecentChats === "function"
            ) {
                await window.refreshOrbitRecentChats();
            }

            clearButton.innerHTML = `
                <i class="fa-solid fa-check"></i>
                History cleared
            `;

            window.dispatchEvent(
                new CustomEvent("orbitHistoryCleared")
            );

            setTimeout(() => {
                resetButton(clearButton, originalHTML);
            }, 1800);

        } catch (error) {
            console.error("Orbit history clear error:", error);

            clearButton.innerHTML = `
                <i class="fa-solid fa-triangle-exclamation"></i>
                Failed to clear
            `;

            setTimeout(() => {
                resetButton(clearButton, originalHTML);
            }, 2200);
        }
    }

    function resetButton(button, originalHTML) {
        if (!button) {
            return;
        }

        button.innerHTML = originalHTML;
        button.disabled = false;
        button.dataset.clearing = "false";
    }

    function setup() {
        const clearButton = document.getElementById(BUTTON_ID);

        if (!clearButton) {
            return;
        }

        if (clearButton.dataset.orbitClearHistoryReady === "true") {
            return;
        }

        clearButton.dataset.orbitClearHistoryReady = "true";

        clearButton.addEventListener("click", clearHistory);
    }

    return {
        clear: clearHistory,
        setup
    };
})();

window.OrbitClearHistory = OrbitClearHistory;

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        OrbitClearHistory.setup
    );
} else {
    OrbitClearHistory.setup();
}