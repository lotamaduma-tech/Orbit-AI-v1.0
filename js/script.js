/* Orbit AI — dashboard, chat UI and recent chats */

"use strict";

const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

const dashboard = document.querySelector(".app-container");
const cards = document.querySelectorAll(".card");
const statusItems = document.querySelectorAll(".status-item");
const powerButton = document.querySelector(".power-btn");

const chatWindow = document.querySelector(".chat-window");
const commandInput = document.querySelector("#command-input");
const commandForm = commandInput
    ? commandInput.closest("form")
    : null;

const newChatButton = document.querySelector(".new-chat-btn");
const historyList = document.querySelector(".chat-history-list");


function updateClock() {

    const now = new Date();
    const hours = now.getHours();

    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    if (timeEl) {
        timeEl.textContent =
            `${displayHour}:${minutes}:${seconds} ${period}`;
    }

    if (dateEl) {
        dateEl.textContent =
            now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });
    }

    if (greetingEl) {

        let greeting = "Good Evening";

        if (hours >= 5 && hours < 12) {
            greeting = "Good Morning";
        } else if (hours >= 12 && hours < 17) {
            greeting = "Good Afternoon";
        }

        greetingEl.textContent =
            `${greeting}, Kingsley`;
    }
}


updateClock();

setInterval(updateClock, 1000);


function setupCardInteractions() {

    cards.forEach(card => {

        card.addEventListener("mouseenter", () => {

            card.style.borderColor =
                "var(--primary-light)";

            card.style.boxShadow =
                "var(--shadow), 0 0 0 3px var(--primary-soft)";
        });

        card.addEventListener("mouseleave", () => {

            card.style.borderColor = "";
            card.style.boxShadow = "";
        });
    });
}


function setupStatusItems() {

    statusItems.forEach(item => {

        item.addEventListener("mouseenter", () => {

            item.style.background =
                "var(--primary-soft)";

            item.style.borderColor =
                "var(--border)";
        });

        item.addEventListener("mouseleave", () => {

            item.style.background = "";
            item.style.borderColor = "";
        });
    });
}


function initializeOnlineStatus() {

    document.querySelectorAll(".online").forEach(element => {

        element.style.color = "var(--success)";
        element.style.textShadow = "none";
    });
}


function initializeDashboardAnimation() {

    if (!dashboard) {
        return;
    }

    dashboard.classList.add("orbit-dashboard-ready");
}


function setupPowerButton() {

    if (!powerButton) {
        return;
    }

    powerButton.addEventListener("click", () => {

        powerButton.classList.toggle("power-active");
    });
}


function setupInteractiveElements() {

    document.querySelectorAll("button").forEach(button => {

        if (button.dataset.uiFeedbackReady === "true") {
            return;
        }

        button.dataset.uiFeedbackReady = "true";

        button.addEventListener("mousedown", () => {
            button.style.transform = "scale(.96)";
        });

        button.addEventListener("mouseup", () => {
            button.style.transform = "";
        });

        button.addEventListener("mouseleave", () => {
            button.style.transform = "";
        });

        button.addEventListener("touchend", () => {
            button.style.transform = "";
        }, {
            passive: true
        });
    });
}


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


function getMessageText(message) {

    if (!message) {
        return "";
    }

    return message.textContent
        .replace(/\s+/g, " ")
        .trim();
}


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

        const existingText =
            getMessageText(
                item.querySelector(
                    ".chat-history-info .chat-history-title"
                )
            );

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

    time.textContent = "Just now";

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
            "orbit_recent_chats",
            JSON.stringify(chats.slice(0, 30))
        );

    } catch (error) {
        console.warn(
            "Orbit recent chats could not be saved."
        );
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
                    "orbit_recent_chats"
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
            chat.title;

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


function setupRecentChatActions() {

    if (!historyList) {
        return;
    }

    historyList.addEventListener("click", event => {

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

            if (!historyList.querySelector(
                ".chat-history-item"
            )) {

                const empty =
                    document.createElement("div");

                empty.className =
                    "chat-history-empty";

                empty.innerHTML =
                    `
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
            .querySelectorAll(".chat-history-item")
            .forEach(chat => {

                chat.classList.remove("active");
            });

        item.classList.add("active");
    });
}


function startNewChat() {

    if (!chatWindow) {
        return;
    }

    const messages =
        chatWindow.querySelectorAll(
            ".message"
        );

    messages.forEach(message => {
        message.remove();
    });

    const typingIndicator =
        chatWindow.querySelector(
            ".typing-indicator"
        );

    if (typingIndicator) {
        typingIndicator.remove();
    }

    if (commandInput) {

        commandInput.value = "";

        resizeCommandInput();

        commandInput.focus();
    }

    if (historyList) {

        historyList
            .querySelectorAll(".chat-history-item")
            .forEach(item => {

                item.classList.remove("active");
            });
    }

    scrollChatToTop();
}


function setupNewChat() {

    if (!newChatButton) {
        return;
    }

    newChatButton.addEventListener("click", event => {

        event.preventDefault();

        startNewChat();
    });
}


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

    createRecentChat(text);
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

            const currentCount =
                messages.length;

            if (currentCount > previousMessageCount) {

                const latestMessage =
                    messages[messages.length - 1];

                if (latestMessage) {
                    detectNewUserMessage(
                        latestMessage
                    );
                }

                scrollChatToBottom(true);
            }

            previousMessageCount =
                currentCount;
        });

    observer.observe(chatWindow, {
        childList: true,
        subtree: true
    });
}


function setupCommandInput() {

    if (!commandInput) {
        return;
    }

    commandInput.addEventListener(
        "input",
        resizeCommandInput
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

                if (commandForm) {
                    commandForm.requestSubmit();
                }
            }
        }
    );

    resizeCommandInput();
}


function initializeChatPosition() {

    if (!chatWindow) {
        return;
    }

    scrollChatToBottom(false);
}


function initializeDashboard() {

    updateClock();

    setupCardInteractions();
    setupStatusItems();
    initializeOnlineStatus();
    initializeDashboardAnimation();
    setupPowerButton();
    setupInteractiveElements();

    loadRecentChats();

    setupRecentChatActions();
    setupNewChat();

    setupCommandInput();
    setupChatObserver();

    initializeChatPosition();
}


if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();
}