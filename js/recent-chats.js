"use strict";

(() => {
    /* Elements */

    const list = document.getElementById("chat-history-list");
    const emptyState = document.getElementById("chat-history-empty");
    const newChatButton = document.getElementById("chat-history-new");
    const topbarNewChat = document.getElementById("topbar-new-chat");
    const searchButton = document.getElementById("chat-search-btn");

    if (!list) return;

    /* Configuration */

    const STORAGE_KEY = "adumex-conversation-history";
    const ACTIVE_CHAT_KEY = "adumex-active-chat";
    const MAX_CHATS = 50;

    /* State */

    let chats = [];
    let activeChatId = null;

    /* Utilities */

    function generateId() {
        return `chat_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 9)}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeChat(chat) {
        if (!chat || typeof chat !== "object") {
            return null;
        }

        const createdAt = Number(chat.createdAt) || Date.now();

        return {
            id: String(chat.id || generateId()),
            title: String(chat.title || "New chat"),
            createdAt,
            updatedAt:
                Number(chat.updatedAt) ||
                createdAt,
            messages: Array.isArray(chat.messages)
                ? chat.messages
                : []
        };
    }

    /* Storage */

    function getStoredChats() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) return [];

            const parsed = JSON.parse(stored);

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                .map(normalizeChat)
                .filter(Boolean)
                .sort(
                    (a, b) =>
                        Number(b.updatedAt) -
                        Number(a.updatedAt)
                )
                .slice(0, MAX_CHATS);
        } catch {
            return [];
        }
    }

    function saveChats() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(chats)
            );
        } catch {
            return;
        }
    }

    function getStoredActiveChatId() {
        try {
            return localStorage.getItem(ACTIVE_CHAT_KEY);
        } catch {
            return null;
        }
    }

    function setActiveChatId(id) {
        activeChatId = id || null;

        try {
            if (activeChatId) {
                localStorage.setItem(
                    ACTIVE_CHAT_KEY,
                    activeChatId
                );
            } else {
                localStorage.removeItem(
                    ACTIVE_CHAT_KEY
                );
            }
        } catch {
            return;
        }
    }

    /* Chat Data */

    function getChatTitle(chat) {
        if (
            chat.title &&
            chat.title.trim() &&
            chat.title !== "New chat"
        ) {
            return chat.title.trim();
        }

        const firstUserMessage =
            chat.messages?.find(
                message =>
                    message &&
                    (
                        message.role === "user" ||
                        message.sender === "user"
                    ) &&
                    typeof message.content === "string" &&
                    message.content.trim()
            );

        if (firstUserMessage) {
            return firstUserMessage.content
                .trim()
                .replace(/\s+/g, " ")
                .slice(0, 42);
        }

        return "New chat";
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const now = new Date();
        const difference =
            now.getTime() - date.getTime();

        if (difference < 60 * 1000) {
            return "Just now";
        }

        if (difference < 60 * 60 * 1000) {
            const minutes = Math.floor(
                difference / (60 * 1000)
            );

            return `${minutes}m ago`;
        }

        if (difference < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(
                difference / (60 * 60 * 1000)
            );

            return `${hours}h ago`;
        }

        if (difference < 7 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(
                difference / (24 * 60 * 60 * 1000)
            );

            return `${days}d ago`;
        }

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric"
        });
    }

    /* Rendering */

    function createChatElement(chat) {
        const item = document.createElement("div");

        item.className = "chat-history-item";
        item.dataset.chatId = chat.id;

        if (chat.id === activeChatId) {
            item.classList.add("active");
            item.setAttribute(
                "aria-current",
                "true"
            );
        }

        const title = getChatTitle(chat);
        const date = formatDate(chat.updatedAt);

        item.innerHTML = `
            <button
                type="button"
                class="chat-history-item-button"
                aria-label="Open chat: ${escapeHtml(title)}"
                title="${escapeHtml(title)}"
            >
                <span class="chat-history-item-title">
                    ${escapeHtml(title)}
                </span>
            </button>

            <button
                type="button"
                class="chat-history-delete"
                aria-label="Delete chat: ${escapeHtml(title)}"
                title="Delete chat"
            >
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        const mainButton = item.querySelector(
            ".chat-history-item-button"
        );

        const deleteButton = item.querySelector(
            ".chat-history-delete"
        );

        if (date) {
            mainButton.dataset.date = date;
        }

        mainButton.addEventListener(
            "click",
            event => {
                event.preventDefault();
                openChat(chat.id);
            }
        );

        deleteButton.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();
                deleteChat(chat.id);
            }
        );

        return item;
    }

    function render() {
        list
            .querySelectorAll(".chat-history-item")
            .forEach(item => item.remove());

        if (!chats.length) {
            if (emptyState) {
                emptyState.hidden = false;
            }

            return;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        chats.forEach(chat => {
            list.appendChild(
                createChatElement(chat)
            );
        });
    }

    /* Chat Actions */

    function createNewChat() {
        const now = Date.now();

        const chat = {
            id: generateId(),
            title: "New chat",
            createdAt: now,
            updatedAt: now,
            messages: []
        };

        chats.unshift(chat);

        chats = chats.slice(
            0,
            MAX_CHATS
        );

        setActiveChatId(chat.id);

        saveChats();
        render();

        window.dispatchEvent(
            new CustomEvent("adumex:new-chat", {
                detail: {
                    chat
                }
            })
        );

        window.dispatchEvent(
            new CustomEvent("adumex:history-updated", {
                detail: {
                    history: [...chats]
                }
            })
        );

        return chat;
    }

    function openChat(id) {
        const chat = chats.find(
            item => item.id === id
        );

        if (!chat) return null;

        setActiveChatId(id);

        chats = [
            chat,
            ...chats.filter(
                item => item.id !== id
            )
        ];

        saveChats();
        render();

        window.dispatchEvent(
            new CustomEvent("adumex:open-chat", {
                detail: {
                    chat
                }
            })
        );

        return chat;
    }

    function deleteChat(id) {
        const chat = chats.find(
            item => item.id === id
        );

        if (!chat) return;

        chats = chats.filter(
            item => item.id !== id
        );

        const wasActive =
            activeChatId === id;

        if (wasActive) {
            setActiveChatId(null);
        }

        saveChats();
        render();

        window.dispatchEvent(
            new CustomEvent("adumex:chat-deleted", {
                detail: {
                    chat,
                    wasActive
                }
            })
        );

        window.dispatchEvent(
            new CustomEvent("adumex:history-updated", {
                detail: {
                    history: [...chats]
                }
            })
        );
    }

    function updateChat(id, updates = {}) {
        const chat = chats.find(
            item => item.id === id
        );

        if (!chat) return null;

        if (typeof updates.title === "string") {
            chat.title =
                updates.title.trim() ||
                "New chat";
        }

        if (Array.isArray(updates.messages)) {
            chat.messages =
                updates.messages;
        }

        chat.updatedAt = Date.now();

        chats = [
            chat,
            ...chats.filter(
                item => item.id !== id
            )
        ].slice(0, MAX_CHATS);

        saveChats();
        render();

        window.dispatchEvent(
            new CustomEvent("adumex:chat-updated", {
                detail: {
                    chat
                }
            })
        );

        window.dispatchEvent(
            new CustomEvent("adumex:history-updated", {
                detail: {
                    history: [...chats]
                }
            })
        );

        return chat;
    }

    function addMessageToChat(
        id,
        message
    ) {
        const chat = chats.find(
            item => item.id === id
        );

        if (!chat || !message) {
            return null;
        }

        if (!Array.isArray(chat.messages)) {
            chat.messages = [];
        }

        chat.messages.push(message);

        if (
            (
                message.role === "user" ||
                message.sender === "user"
            ) &&
            typeof message.content === "string" &&
            chat.title === "New chat"
        ) {
            chat.title =
                message.content
                    .trim()
                    .replace(/\s+/g, " ")
                    .slice(0, 42) ||
                "New chat";
        }

        chat.updatedAt = Date.now();

        chats = [
            chat,
            ...chats.filter(
                item => item.id !== id
            )
        ].slice(0, MAX_CHATS);

        saveChats();
        render();

        window.dispatchEvent(
            new CustomEvent("adumex:history-updated", {
                detail: {
                    history: [...chats]
                }
            })
        );

        return chat;
    }

    /* Search */

    function searchChats() {
        const existing =
            document.querySelector(
                ".chat-history-search"
            );

        if (existing) {
            existing.focus();
            return;
        }

        const search =
            document.createElement("input");

        search.type = "search";
        search.className =
            "chat-history-search";
        search.placeholder =
            "Search chats...";
        search.autocomplete = "off";
        search.setAttribute(
            "aria-label",
            "Search chats"
        );

        list.parentElement.insertBefore(
            search,
            list
        );

        search.focus();

        search.addEventListener(
            "input",
            () => {
                const query =
                    search.value
                        .trim()
                        .toLowerCase();

                list
                    .querySelectorAll(
                        ".chat-history-item"
                    )
                    .forEach(item => {
                        const chat =
                            chats.find(
                                chat =>
                                    chat.id ===
                                    item.dataset.chatId
                            );

                        if (!chat) return;

                        const title =
                            getChatTitle(chat)
                                .toLowerCase();

                        const matches =
                            !query ||
                            title.includes(query) ||
                            chat.messages.some(
                                message =>
                                    typeof message?.content ===
                                        "string" &&
                                    message.content
                                        .toLowerCase()
                                        .includes(query)
                            );

                        item.hidden =
                            !matches;
                    });
            }
        );

        search.addEventListener(
            "keydown",
            event => {
                if (event.key === "Escape") {
                    search.remove();
                    render();
                }
            }
        );
    }

    /* Synchronization */

    function syncFromAdumexHistory(event) {
        const incoming =
            event?.detail?.history;

        if (!Array.isArray(incoming)) {
            return;
        }

        chats = incoming
            .map(normalizeChat)
            .filter(Boolean)
            .sort(
                (a, b) =>
                    Number(b.updatedAt) -
                    Number(a.updatedAt)
            )
            .slice(0, MAX_CHATS);

        saveChats();
        render();
    }

    /* Events */

    newChatButton?.addEventListener(
        "click",
        createNewChat
    );

    topbarNewChat?.addEventListener(
        "click",
        createNewChat
    );

    searchButton?.addEventListener(
        "click",
        searchChats
    );

    window.addEventListener(
        "adumex:history-updated",
        syncFromAdumexHistory
    );

    window.addEventListener(
        "adumex:chat-updated",
        event => {
            const detail =
                event.detail || {};

            if (!detail.id) return;

            updateChat(
                detail.id,
                {
                    title: detail.title,
                    messages: detail.messages
                }
            );
        }
    );

    window.addEventListener(
        "adumex:add-message",
        event => {
            const detail =
                event.detail || {};

            if (
                !detail.id ||
                !detail.message
            ) {
                return;
            }

            addMessageToChat(
                detail.id,
                detail.message
            );
        }
    );

    /* Public API */

    window.AdumexRecentChats = {
        getChats: () => [...chats],

        getActiveChat: () =>
            chats.find(
                chat =>
                    chat.id ===
                    activeChatId
            ) || null,

        getActiveChatId: () =>
            activeChatId,

        setActiveChatId,

        createChat:
            createNewChat,

        openChat,

        deleteChat,

        updateChat,

        addMessageToChat,

        render
    };

    /* Initialization */

    chats = getStoredChats();

    activeChatId =
        getStoredActiveChatId();

    if (
        activeChatId &&
        !chats.some(
            chat =>
                chat.id ===
                activeChatId
        )
    ) {
        activeChatId = null;
        setActiveChatId(null);
    }

    render();
})();
