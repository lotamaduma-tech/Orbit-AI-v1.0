/* Orbit AI — chat UI, quick prompts and recent chats */

"use strict";

/* =========================================================
   STORAGE
   ========================================================= */

const ORBIT_STORAGE_VERSION = "orbit_v2";

const ORBIT_STORAGE_KEYS = {
    recentChats: `${ORBIT_STORAGE_VERSION}_recent_chats`,
    theme: `${ORBIT_STORAGE_VERSION}_theme`,
    settings: `${ORBIT_STORAGE_VERSION}_settings`,
    chat: `${ORBIT_STORAGE_VERSION}_chat`
};

/*
 * Remove the old Orbit storage once.
 * The new storage keys are intentionally different.
 */
function resetOldOrbitStorage() {

    const oldKeys = [
        "orbitTheme",
        "orbit_recent_chats",
        "orbit_chat_history",
        "orbit_chat",
        "orbit_messages",
        "orbit_settings",
        "orbitSettings",
        "orbit-theme",
        "orbit-theme-preference"
    ];

    oldKeys.forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch {
            /* Ignore storage errors */
        }
    });
}

resetOldOrbitStorage();


/* =========================================================
   ELEMENTS
   ========================================================= */

const chatWindow =
    document.querySelector(".chat-window");

const commandInput =
    document.querySelector("#command-input");

const commandForm =
    commandInput
        ? commandInput.closest("form")
        : null;

const historyList =
    document.querySelector(".chat-history-list");

const newChatButton =
    document.querySelector(".new-chat-btn");

const quickPromptContainer =
    document.querySelector(
        ".quick-prompts, .quick-prompt-container, .quick-replies"
    );

const quickPrompts =
    document.querySelectorAll(".quick-prompt");


/* =========================================================
   COMMAND INPUT
   ========================================================= */

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


/* =========================================================
   CHAT SCROLL
   ========================================================= */

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


/* =========================================================
   QUICK PROMPTS
   ========================================================= */

function showQuickPrompts() {

    if (!quickPromptContainer) {
        return;
    }

    quickPromptContainer.classList.remove(
        "quick-prompts-hidden"
    );

    quickPromptContainer.removeAttribute(
        "aria-hidden"
    );
}


function hideQuickPrompts() {

    if (!quickPromptContainer) {
        return;
    }

    quickPromptContainer.classList.add(
        "quick-prompts-hidden"
    );

    quickPromptContainer.setAttribute(
        "aria-hidden",
        "true"
    );
}


function setupQuickPrompts() {

    if (!quickPromptContainer) {
        return;
    }

    quickPrompts.forEach(prompt => {

        prompt.addEventListener("click", () => {

            const text =
                prompt.dataset.prompt;

            if (!text || !commandInput) {
                return;
            }

            commandInput.value = text;

            resizeCommandInput();

            hideQuickPrompts();

            commandInput.focus();
        });
    });
}


function setupQuickPromptVisibility() {

    if (!commandInput || !chatWindow) {
        return;
    }

    commandInput.addEventListener(
        "input",
        () => {

            if (commandInput.value.trim()) {
                hideQuickPrompts();
            } else if (
                chatWindow.scrollTop <= 20 &&
                !chatWindow.querySelector(".message")
            ) {
                showQuickPrompts();
            }
        }
    );

    chatWindow.addEventListener(
        "scroll",
        () => {

            const distanceFromBottom =
                chatWindow.scrollHeight -
                chatWindow.scrollTop -
                chatWindow.clientHeight;

            /*
             * Once the user moves away from
             * the bottom, hide the prompts.
             */
            if (chatWindow.scrollTop > 20) {
                hideQuickPrompts();
                return;
            }

            /*
             * Only show them again on a completely
             * empty conversation.
             */
            if (
                !chatWindow.querySelector(".message") &&
                !commandInput.value.trim()
            ) {
                showQuickPrompts();
            }
        },
        {
            passive: true
        }
    );
}


/* =========================================================
   MESSAGE TEXT
   ========================================================= */

function getMessageText(message) {

    if (!message) {
        return "";
    }

    return message.textContent
        .replace(/\s+/g, " ")
        .trim();
}


/* =========================================================
   RECENT CHAT STORAGE
   ========================================================= */

function createRecentChat(title) {

    if (!historyList || !title) {
        return;
    }

    const existingItems =
        historyList.querySelectorAll(
            ".chat-history-item"
        );

    const normalizedTitle =
        title.toLowerCase();

    for (const item of existingItems) {

        const existingTitle =
            item.querySelector(
                ".chat-history-info .chat-history-title"
            );

        const existingText =
            existingTitle
                ? getMessageText(existingTitle)
                : "";

        if (
            existingText.toLowerCase() ===
            normalizedTitle
        ) {

            item.classList.add("active");

            existingItems.forEach(other => {

                if (other !== item) {
                    other.classList.remove("active");
                }
            });

            return;
        }
    }

    const emptyState =
        historyList.querySelector(
            ".chat-history-empty"
        );

    if (emptyState) {
        emptyState.remove();
    }

    const item =
        document.createElement("div");

    item.className =
        "chat-history-item active";

    const icon =
        document.createElement("div");

    icon.className =
        "chat-history-icon";

    icon.innerHTML =
        '<i class="fa-regular fa-message"></i>';

    const info =
        document.createElement("div");

    info.className =
        "chat-history-info";

    const titleElement =
        document.createElement("span");

    titleElement.className =
        "chat-history-title";

    titleElement.textContent =
        title.length > 42
            ? `${title.slice(0, 42)}…`
            : title;

    const time =
        document.createElement("span");

    time.className =
        "chat-history-time";

    time.textContent =
        "Just now";

    info.appendChild(titleElement);
    info.appendChild(time);

    const deleteButton =
        document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
        "chat-history-delete";

    deleteButton.setAttribute(
        "aria-label",
        "Delete chat"
    );

    deleteButton.innerHTML =
        '<i class="fa-solid fa-trash"></i>';

    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(deleteButton);

    historyList.prepend(item);

    historyList
        .querySelectorAll(".chat-history-item")
        .forEach(chat => {

            if (chat !== item) {
                chat.classList.remove("active");
            }
        });

    saveRecentChats();
}


function saveRecentChats() {

    if (!historyList) {
        return;
    }

    const chats = [];

    historyList
        .querySelectorAll(".chat-history-item")
        .forEach(item => {

            const title =
                item.querySelector(
                    ".chat-history-title"
                );

            const time =
                item.querySelector(
                    ".chat-history-time"
                );

            if (!title) {
                return;
            }

            chats.push({
                title: title.textContent,
                time: time
                    ? time.textContent
                    : "Recent"
            });
        });

    try {

        localStorage.setItem(
            ORBIT_STORAGE_KEYS.recentChats,
            JSON.stringify(
                chats.slice(0, 30)
            )
        );

    } catch {
        /* Ignore storage errors */
    }
}


function loadRecentChats() {

    if (!historyList) {
        return;
    }

    let chats = [];

    try {

        chats =
            JSON.parse(
                localStorage.getItem(
                    ORBIT_STORAGE_KEYS.recentChats
                )
            ) || [];

    } catch {
        chats = [];
    }

    if (!Array.isArray(chats) || !chats.length) {
        return;
    }

    const emptyState =
        historyList.querySelector(
            ".chat-history-empty"
        );

    if (emptyState) {
        emptyState.remove();
    }

    historyList.innerHTML = "";

    chats.forEach((chat, index) => {

        const item =
            document.createElement("div");

        item.className =
            "chat-history-item";

        if (index === 0) {
            item.classList.add("active");
        }

        const icon =
            document.createElement("div");

        icon.className =
            "chat-history-icon";

        icon.innerHTML =
            '<i class="fa-regular fa-message"></i>';

        const info =
            document.createElement("div");

        info.className =
            "chat-history-info";

        const title =
            document.createElement("span");

        title.className =
            "chat-history-title";

        title.textContent =
            chat.title || "Untitled chat";

        const time =
            document.createElement("span");

        time.className =
            "chat-history-time";

        time.textContent =
            chat.time || "Recent";

        info.appendChild(title);
        info.appendChild(time);

        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className =
            "chat-history-delete";

        deleteButton.setAttribute(
            "aria-label",
            "Delete chat"
        );

        deleteButton.innerHTML =
            '<i class="fa-solid fa-trash"></i>';

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(deleteButton);

        historyList.appendChild(item);
    });
}


/* =========================================================
   RECENT CHAT ACTIONS
   ========================================================= */

function setupRecentChatActions() {

    if (!historyList) {
        return;
    }

    historyList.addEventListener(
        "click",
        event => {

            const deleteButton =
                event.target.closest(
                    ".chat-history-delete"
                );

            if (deleteButton) {

                event.preventDefault();
                event.stopPropagation();

                const item =
                    deleteButton.closest(
                        ".chat-history-item"
                    );

                if (item) {
                    item.remove();
                    saveRecentChats();
                }

                if (
                    !historyList.querySelector(
                        ".chat-history-item"
                    )
                ) {

                    const empty =
                        document.createElement("div");

                    empty.className =
                        "chat-history-empty";

                    empty.innerHTML = `
                        <i class="fa-regular fa-comments"></i>
                        <span>No recent chats</span>
                        <small>Your conversations will appear here</small>
                    `;

                    historyList.appendChild(empty);
                }

                return;
            }

            const item =
                event.target.closest(
                    ".chat-history-item"
                );

            if (!item) {
                return;
            }

            historyList
                .querySelectorAll(
                    ".chat-history-item"
                )
                .forEach(chat => {
                    chat.classList.remove("active");
                });

            item.classList.add("active");
        }
    );
}


/* =========================================================
   NEW CHAT
   ========================================================= */

function startNewChat() {

    if (!chatWindow) {
        return;
    }

    if (window.OrbitAI && typeof window.OrbitAI.clearConversation === "function") {
        window.OrbitAI.clearConversation();
    } else {
        chatWindow
            .querySelectorAll(
                ".message, .typing-indicator"
            )
            .forEach(element => {
                element.remove();
            });

        if (commandInput) {
            commandInput.value = "";
            resizeCommandInput();
            commandInput.focus();
        }
    }

    if (historyList) {

        historyList
            .querySelectorAll(
                ".chat-history-item"
            )
            .forEach(item => {
                item.classList.remove("active");
            });
    }

    showQuickPrompts();

    scrollChatToTop();
}


function setupNewChat() {

    if (!newChatButton) {
        return;
    }

    newChatButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            startNewChat();
        }
    );
}


/* =========================================================
   NEW USER MESSAGE
   ========================================================= */

function detectNewUserMessage(message) {

    if (!message) {
        return;
    }

    if (!message.classList.contains("user")) {
        return;
    }

    const text =
        getMessageText(message);

    if (!text) {
        return;
    }

    hideQuickPrompts();

    createRecentChat(text);
}


/* =========================================================
   CHAT OBSERVER
   ========================================================= */

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

            /*
             * A new message was added.
             */
            if (
                currentMessageCount >
                previousMessageCount
            ) {

                const latestMessage =
                    messages[
                    messages.length - 1
                    ];

                if (latestMessage) {
                    detectNewUserMessage(
                        latestMessage
                    );
                }

                scrollChatToBottom(true);
            }

            /*
             * Keep the typing indicator visible
             * when Orbit creates it.
             */
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

    observer.observe(chatWindow, {
        childList: true,
        subtree: true
    });
}


/* =========================================================
   COMMAND INPUT
   ========================================================= */

function setupCommandInput() {

    if (!commandInput) {
        return;
    }

    commandInput.addEventListener(
        "input",
        () => {

            resizeCommandInput();

            if (commandInput.value.trim()) {
                hideQuickPrompts();
            }
        }
    );

    commandInput.addEventListener(
        "focus",
        () => {

            resizeCommandInput();

            if (commandInput.value.trim()) {
                hideQuickPrompts();
            }

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

                if (window.OrbitAI && typeof window.OrbitAI.sendMessage === "function") {
                    window.OrbitAI.sendMessage();
                } else if (commandForm) {
                    commandForm.requestSubmit();
                }
            }
        }
    );

    resizeCommandInput();
}


/* =========================================================
   CHAT POSITION
   ========================================================= */

function initializeChatPosition() {

    if (!chatWindow) {
        return;
    }

    scrollChatToBottom(false);
}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeDashboard() {

    loadRecentChats();

    setupRecentChatActions();

    setupNewChat();

    setupCommandInput();

    setupQuickPrompts();

    setupQuickPromptVisibility();

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