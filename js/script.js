"use strict";

const chatWindow =
    document.querySelector(".chat-window");

const commandInput =
    document.querySelector("#command-input");

const commandForm =
    commandInput
        ? commandInput.closest("form")
        : null;


function resizeCommandInput() {

    if (!commandInput) {
        return;
    }

    commandInput.style.height = "auto";

    const maxHeight = 150;

    const newHeight = Math.min(
        commandInput.scrollHeight,
        maxHeight
    );

    commandInput.style.height =
        `${newHeight}px`;

    commandInput.style.overflowY =
        commandInput.scrollHeight > maxHeight
            ? "auto"
            : "hidden";
}


function scrollChatToBottom(smooth = true) {

    if (!chatWindow) {
        return;
    }

    requestAnimationFrame(() => {

        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior: smooth ? "smooth" : "auto"
        });

    });
}


function scrollChatToTop() {

    if (!chatWindow) {
        return;
    }

    requestAnimationFrame(() => {

        chatWindow.scrollTo({
            top: 0,
            behavior: "auto"
        });

    });
}


function isChatAtBottom() {

    if (!chatWindow) {
        return true;
    }

    const distanceFromBottom =
        chatWindow.scrollHeight -
        chatWindow.scrollTop -
        chatWindow.clientHeight;

    return distanceFromBottom <= 60;
}


function setupCommandInput() {

    if (!commandInput) {
        return;
    }

    commandInput.addEventListener(
        "input",
        () => {

            resizeCommandInput();

        }
    );

    commandInput.addEventListener(
        "focus",
        () => {

            resizeCommandInput();

            scrollChatToBottom(false);

        }
    );

    commandInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                if (
                    window.OrbitAI &&
                    typeof window.OrbitAI.sendMessage ===
                    "function"
                ) {

                    window.OrbitAI.sendMessage();

                } else if (commandForm) {

                    commandForm.requestSubmit();

                }

            }

        }
    );

    resizeCommandInput();
}


function setupChatObserver() {

    if (!chatWindow) {
        return;
    }

    let previousMessageCount =
        chatWindow.querySelectorAll(
            ".message"
        ).length;

    const observer =
        new MutationObserver(() => {

            const messages =
                chatWindow.querySelectorAll(
                    ".message"
                );

            const currentMessageCount =
                messages.length;

            if (
                currentMessageCount >
                previousMessageCount
            ) {

                scrollChatToBottom(true);

            }

            const typingIndicator =
                chatWindow.querySelector(
                    ".typing-indicator"
                );

            if (typingIndicator) {

                typingIndicator.removeAttribute(
                    "hidden"
                );

                typingIndicator.style.display =
                    "flex";

                typingIndicator.setAttribute(
                    "aria-live",
                    "polite"
                );

            }

            previousMessageCount =
                currentMessageCount;

        });

    observer.observe(
        chatWindow,
        {
            childList: true,
            subtree: true
        }
    );
}


function initializeChatPosition() {

    if (!chatWindow) {
        return;
    }

    scrollChatToBottom(false);
}


function initializeDashboard() {

    setupCommandInput();

    setupChatObserver();

    initializeChatPosition();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();

}


window.OrbitDashboard = {

    resizeCommandInput,

    scrollChatToBottom,

    scrollChatToTop,
    isChatAtBottom

};