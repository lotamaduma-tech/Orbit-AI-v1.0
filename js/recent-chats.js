/* Orbit AI — Recent Conversations */

"use strict";

/* Config */
const ORBIT_RECENT_CHATS_KEY = "orbit-recent-chats";
const ORBIT_RECENT_CHAT_LIMIT = 10;
const ORBIT_RECENT_MESSAGE_LIMIT = 30;

let orbitCurrentChatId = null;
let orbitCurrentChatTitle = null;
let orbitRestoringChat = false;

/* Chat ID */
function createOrbitChatId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return (
        "orbit-chat-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).substring(2, 10)
    );
}

/* Session */
function createOrbitFreshSession() {
    orbitCurrentChatId = createOrbitChatId();
    orbitCurrentChatTitle = null;
    return orbitCurrentChatId;
}

/* Storage */
function getOrbitRecentChats() {
    try {
        const saved = localStorage.getItem(ORBIT_RECENT_CHATS_KEY);
        if (!saved) return [];

        const chats = JSON.parse(saved);
        if (!Array.isArray(chats)) return [];

        return chats
            .filter(chat => chat && chat.id)
            .map(chat => ({
                id: chat.id,
                title:
                    typeof chat.title === "string"
                        ? chat.title
                        : "New conversation",
                updatedAt: Number(chat.updatedAt) || Date.now(),
                messages: Array.isArray(chat.messages)
                    ? chat.messages
                        .filter(
                            message =>
                                message &&
                                (message.sender === "user" ||
                                    message.sender === "orbit") &&
                                typeof message.content === "string"
                        )
                        .slice(-ORBIT_RECENT_MESSAGE_LIMIT)
                    : []
            }));
    } catch (error) {
        console.error("Orbit recent chats load error:", error);
        return [];
    }
}

function saveOrbitRecentChats(chats) {
    try {
        localStorage.setItem(
            ORBIT_RECENT_CHATS_KEY,
            JSON.stringify(chats.slice(0, ORBIT_RECENT_CHAT_LIMIT))
        );
    } catch (error) {
        console.error("Orbit recent chats save error:", error);
    }
}

/* Titles */
function createOrbitChatTitle(message) {
    const title = String(message || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!title) return "New conversation";
    if (title.length <= 42) return title;
    return title.substring(0, 42).trim() + "...";
}

/* Add conversation */
function addOrbitRecentChat(message) {
    if (!message) return;

    if (!orbitCurrentChatId) {
        createOrbitFreshSession();
    }

    const chats = getOrbitRecentChats();

    if (!orbitCurrentChatTitle) {
        orbitCurrentChatTitle = createOrbitChatTitle(message);
    }

    let chat = chats.find(item => item.id === orbitCurrentChatId);

    if (!chat) {
        chat = {
            id: orbitCurrentChatId,
            title: orbitCurrentChatTitle,
            updatedAt: Date.now(),
            messages: []
        };
        chats.unshift(chat);
    }

    chat.title = orbitCurrentChatTitle;
    chat.updatedAt = Date.now();

    if (!Array.isArray(chat.messages)) {
        chat.messages = [];
    }

    const userMessageExists = chat.messages.some(
        item => item.sender === "user" && item.content === String(message).trim()
    );

    if (!userMessageExists) {
        chat.messages.push({
            sender: "user",
            content: String(message).trim()
        });
    }

    chat.messages = chat.messages.slice(-ORBIT_RECENT_MESSAGE_LIMIT);
    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    saveOrbitRecentChats(chats);
    renderOrbitRecentChats();
}

/* Save message */
function saveOrbitRecentMessage(sender, content) {
    if (orbitRestoringChat || !content || !orbitCurrentChatId) return;
    if (sender !== "user" && sender !== "orbit") return;

    const cleanContent = String(content).trim();
    if (!cleanContent) return;

    const chats = getOrbitRecentChats();
    let chat = chats.find(item => item.id === orbitCurrentChatId);

    if (!chat) {
        chat = {
            id: orbitCurrentChatId,
            title:
                orbitCurrentChatTitle || createOrbitChatTitle(cleanContent),
            updatedAt: Date.now(),
            messages: []
        };
        chats.unshift(chat);
    }

    if (!Array.isArray(chat.messages)) {
        chat.messages = [];
    }

    const lastMessage = chat.messages[chat.messages.length - 1];

    if (
        lastMessage &&
        lastMessage.sender === sender &&
        lastMessage.content === cleanContent
    ) {
        return;
    }

    chat.messages.push({
        sender,
        content: cleanContent
    });

    chat.messages = chat.messages.slice(-ORBIT_RECENT_MESSAGE_LIMIT);
    chat.updatedAt = Date.now();

    if (!orbitCurrentChatTitle && sender === "user") {
        orbitCurrentChatTitle = createOrbitChatTitle(cleanContent);
        chat.title = orbitCurrentChatTitle;
    }

    chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    saveOrbitRecentChats(chats);
    renderOrbitRecentChats();
}

/* Render */
function renderOrbitRecentChats(searchTerm = "") {
    const list = document.getElementById("chat-history-list");
    const empty = document.getElementById("chat-history-empty");

    if (!list) return;

    list.querySelectorAll(".orbit-recent-chat").forEach(item => {
        item.remove();
    });

    const chats = getOrbitRecentChats();
    const query = String(searchTerm || "").trim().toLowerCase();

    const filteredChats = query
        ? chats.filter(chat =>
            String(chat.title).toLowerCase().includes(query)
        )
        : chats;

    if (!filteredChats.length) {
        if (empty) empty.style.display = "";
        return;
    }

    if (empty) empty.style.display = "none";

    filteredChats.forEach(chat => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "orbit-recent-chat";
        button.dataset.chatId = chat.id;
        button.title = chat.title;

        if (chat.id === orbitCurrentChatId) {
            button.classList.add("active");
            button.setAttribute("aria-current", "true");
        }

        const icon = document.createElement("span");
        icon.className = "orbit-recent-chat-icon";
        icon.innerHTML = '<i class="fa-regular fa-message"></i>';

        const content = document.createElement("span");
        content.className = "orbit-recent-chat-content";

        const title = document.createElement("span");
        title.className = "orbit-recent-chat-title";
        title.textContent = chat.title;

        content.appendChild(title);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "orbit-recent-chat-delete";
        deleteButton.dataset.chatId = chat.id;
        deleteButton.title = "Delete conversation";
        deleteButton.setAttribute("aria-label", "Delete conversation");
        deleteButton.innerHTML = '<i class="fa-regular fa-trash-can"></i>';

        button.appendChild(icon);
        button.appendChild(content);
        button.appendChild(deleteButton);

        button.addEventListener("click", event => {
            if (event.target.closest(".orbit-recent-chat-delete")) return;
            selectOrbitRecentChat(chat.id);
        });

        deleteButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            deleteOrbitRecentChat(chat.id);
        });

        list.appendChild(button);
    });
}

/* Restore conversation */
function restoreOrbitConversation(chat) {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    orbitRestoringChat = true;

    try {
        const intro = document.getElementById("chat-intro");
        if (intro) {
            intro.classList.add("is-hidden");
        }

        chatWindow
            .querySelectorAll(".conversation-group, #orbit-typing")
            .forEach(element => {
                element.remove();
            });

        const messages = chat?.messages || [];

        if (!Array.isArray(messages) || !messages.length) {
            if (intro) {
                intro.classList.remove("is-hidden");
            }
            return;
        }

        const group = document.createElement("div");
        group.className = "conversation-group";
        group.dataset.orbitConversation = "true";

        messages.forEach(messageData => {
            const row = document.createElement("div");
            row.className = `message-row ${messageData.sender}`;
            row.dataset.sender = messageData.sender;

            const message = document.createElement("div");
            message.className = `message ${messageData.sender}`;

            if (messageData.sender === "user") {
                message.textContent = messageData.content;
            } else if (
                window.OrbitAI &&
                typeof window.OrbitAI.formatResponse === "function"
            ) {
                message.innerHTML = window.OrbitAI.formatResponse(
                    messageData.content
                );
            } else {
                message.textContent = messageData.content;
            }

            row.appendChild(message);
            group.appendChild(row);
        });

        chatWindow.appendChild(group);

        requestAnimationFrame(() => {
            chatWindow.scrollTo({
                top: chatWindow.scrollHeight,
                behavior: "auto"
            });
        });
    } finally {
        setTimeout(() => {
            orbitRestoringChat = false;
        }, 0);
    }
}

/* Select conversation */
function selectOrbitRecentChat(chatId) {
    if (
        window.OrbitAI &&
        typeof window.OrbitAI.isWaiting === "function" &&
        window.OrbitAI.isWaiting()
    ) {
        return;
    }

    const chats = getOrbitRecentChats();
    const chat = chats.find(item => item.id === chatId);
    if (!chat) return;

    orbitCurrentChatId = chat.id;
    orbitCurrentChatTitle = chat.title;

    restoreOrbitConversation(chat);

    const updatedChats = [
        {
            ...chat,
            updatedAt: Date.now()
        },
        ...chats.filter(item => item.id !== chat.id)
    ];

    saveOrbitRecentChats(updatedChats);
    renderOrbitRecentChats();

    const commandInput = document.getElementById("command-input");
    if (commandInput) {
        commandInput.focus();
    }
}

/* Delete conversation */
function deleteOrbitRecentChat(chatId) {
    const chats = getOrbitRecentChats();
    const chat = chats.find(item => item.id === chatId);
    if (!chat) return;

    const confirmed = window.confirm(`Delete "${chat.title}"?`);
    if (!confirmed) return;

    const remaining = chats.filter(item => item.id !== chatId);
    saveOrbitRecentChats(remaining);

    if (orbitCurrentChatId === chatId) {
        createOrbitFreshSession();

        if (
            window.OrbitAI &&
            typeof window.OrbitAI.clearConversation === "function"
        ) {
            window.OrbitAI.clearConversation();
        }
    }

    renderOrbitRecentChats(getOrbitSearchValue());
}

/* Search */
function getOrbitSearchValue() {
    const input = document.getElementById("orbit-chat-search-input");
    if (!input) return "";
    return input.value || "";
}

function setupOrbitChatSearch() {
    const searchButton = document.getElementById("chat-search-btn");
    const searchArea = document.getElementById("orbit-chat-search");
    const searchInput = document.getElementById("orbit-chat-search-input");
    const clearButton = document.getElementById("orbit-chat-search-clear");

    if (!searchButton || !searchInput) return;

    if (searchButton.dataset.orbitSearchReady === "true") return;
    searchButton.dataset.orbitSearchReady = "true";

    searchButton.addEventListener("click", () => {
        if (searchArea) {
            searchArea.classList.toggle("is-open");
        }
        if (searchArea && searchArea.classList.contains("is-open")) {
            searchInput.focus();
        }
    });

    searchInput.addEventListener("input", () => {
        renderOrbitRecentChats(searchInput.value);
        if (clearButton) {
            clearButton.hidden = !searchInput.value;
        }
    });

    if (clearButton) {
        clearButton.hidden = !searchInput.value;
        clearButton.addEventListener("click", () => {
            searchInput.value = "";
            renderOrbitRecentChats();
            clearButton.hidden = true;
            searchInput.focus();
        });
    }
}

/* New chat */
function startOrbitRecentNewChat() {
    if (
        window.OrbitAI &&
        typeof window.OrbitAI.isWaiting === "function" &&
        window.OrbitAI.isWaiting()
    ) {
        return;
    }

    createOrbitFreshSession();

    if (window.OrbitAI && typeof window.OrbitAI.newChat === "function") {
        window.OrbitAI.newChat();
    }

    renderOrbitRecentChats();
}

/* New chat button */
function setupOrbitRecentChatButton() {
    const button = document.getElementById("chat-history-new");
    if (!button) return;

    if (button.dataset.orbitRecentReady === "true") return;
    button.dataset.orbitRecentReady = "true";

    button.addEventListener("click", () => {
        startOrbitRecentNewChat();
    });
}

/* Watch chat messages */
function setupOrbitConversationObserver() {
    const chatWindow = document.getElementById("chat-window");
    if (!chatWindow) return;

    if (chatWindow.dataset.orbitRecentObserverReady === "true") return;
    chatWindow.dataset.orbitRecentObserverReady = "true";

    const observer = new MutationObserver(mutations => {
        if (orbitRestoringChat) return;

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                if (node.id === "orbit-typing") return;

                const rows = node.matches(".message-row")
                    ? [node]
                    : [...node.querySelectorAll(".message-row")];

                rows.forEach(row => {
                    const sender =
                        row.dataset.sender ||
                        (row.classList.contains("user")
                            ? "user"
                            : row.classList.contains("orbit")
                                ? "orbit"
                                : null);

                    if (!sender) return;

                    const message = row.querySelector(".message");
                    if (!message) return;

                    const content = message.textContent.trim();
                    if (!content) return;

                    saveOrbitRecentMessage(sender, content);
                });
            });
        });
    });

    observer.observe(chatWindow, {
        childList: true,
        subtree: true
    });
}

/* Public API */
window.OrbitRecentChats = {
    add: addOrbitRecentChat,
    addMessage: saveOrbitRecentMessage,
    render: renderOrbitRecentChats,
    getAll: getOrbitRecentChats,
    newChat: startOrbitRecentNewChat,
    select: selectOrbitRecentChat,
    delete: deleteOrbitRecentChat,
    search: renderOrbitRecentChats,
    getCurrentId: () => orbitCurrentChatId
};

/* Initialize */
function initializeOrbitRecentChats() {
    createOrbitFreshSession();
    renderOrbitRecentChats();
    setupOrbitRecentChatButton();
    setupOrbitChatSearch();
    setupOrbitConversationObserver();

    console.log("Orbit recent chats initialized.", {
        currentChatId: orbitCurrentChatId
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeOrbitRecentChats);
} else {
    initializeOrbitRecentChats();
}