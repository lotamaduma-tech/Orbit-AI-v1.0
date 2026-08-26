"use strict";

/* Clear conversation history */

async function clearOrbitConversationHistory() {
    const clearButton =
        document.getElementById("clear-history-btn");

    if (!clearButton) {
        return;
    }

    if (
        clearButton.dataset.clearing === "true"
    ) {
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

    const originalHTML =
        clearButton.innerHTML;

    clearButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Clearing...
    `;

    try {
        /* Clear cloud history */

        if (
            window.OrbitCloud &&
            typeof window.OrbitCloud
                .clearConversationHistory ===
            "function"
        ) {
            await window.OrbitCloud
                .clearConversationHistory();
        }

        /* Clear local conversation */

        if (
            typeof window
                .clearOrbitConversationHistory ===
            "function"
        ) {
            window.clearOrbitConversationHistory();
        }

        /* Clear active chat */

        if (
            typeof window
                .clearOrbitActiveChatId ===
            "function"
        ) {
            window.clearOrbitActiveChatId();
        }

        /* Refresh chat history */

        if (
            typeof window
                .refreshOrbitRecentChats ===
            "function"
        ) {
            await window
                .refreshOrbitRecentChats();
        }

        clearButton.innerHTML = `
            <i class="fa-solid fa-check"></i>
            History cleared
        `;

        setTimeout(() => {
            clearButton.innerHTML =
                originalHTML;

            clearButton.disabled = false;
            clearButton.dataset.clearing =
                "false";
        }, 1800);

    } catch (error) {
        console.error(
            "Orbit history clear error:",
            error
        );

        clearButton.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation"></i>
            Failed to clear
        `;

        setTimeout(() => {
            clearButton.innerHTML =
                originalHTML;

            clearButton.disabled = false;
            clearButton.dataset.clearing =
                "false";
        }, 2200);
    }
}


/* Initialize button */

function setupOrbitClearHistory() {
    const clearButton =
        document.getElementById(
            "clear-history-btn"
        );

    if (!clearButton) {
        return;
    }

    if (
        clearButton.dataset
            .orbitClearHistoryReady ===
        "true"
    ) {
        return;
    }

    clearButton.dataset
        .orbitClearHistoryReady =
        "true";

    clearButton.addEventListener(
        "click",
        clearOrbitConversationHistory
    );
}


/* Start */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        setupOrbitClearHistory();
    }
);