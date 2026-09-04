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
            conversationId: chat.conversationId
                ? String(chat.conversationId)
                : null,
            isPinned: Boolean(chat.isPinned),
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
                .sort((a, b) => {
                    if (a.isPinned !== b.isPinned) {
                        return Number(b.isPinned) - Number(a.isPinned);
                    }

                    return Number(b.updatedAt) - Number(a.updatedAt);
                })
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

        if (chat.isPinned) {
            item.classList.add("pinned");
        }

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

            <button
                type="button"
                class="chat-history-pin"
                aria-label="${chat.isPinned ? "Unpin" : "Pin"} chat: ${escapeHtml(title)}"
                title="${chat.isPinned ? "Unpin" : "Pin"} chat"
            >
                <i class="fa-solid fa-thumbtack"></i>
            </button>
        `;

        const mainButton = item.querySelector(
            ".chat-history-item-button"
        );

        const deleteButton = item.querySelector(
            ".chat-history-delete"
        );

        const pinButton = item.querySelector(
            ".chat-history-pin"
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

        pinButton.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();
                togglePin(chat.id);
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

    async function togglePin(id) {
        const chat = chats.find(item => item.id === id);

        if (!chat || !chat.conversationId) {
            return;
        }

        try {
            const token = await getAuthToken();
            const response = await fetch(
                `${getApiBase()}/conversations/${encodeURIComponent(
                    chat.conversationId
                )}/pin`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token
                            ? { Authorization: `Bearer ${token}` }
                            : {})
                    },
                    body: JSON.stringify({
                        isPinned: !chat.isPinned
                    })
                }
            );

            if (!response.ok) {
                return;
            }

            chat.isPinned = !chat.isPinned;
            chat.updatedAt = Date.now();
            chats.sort((first, second) => {
                if (first.isPinned !== second.isPinned) {
                    return Number(second.isPinned) - Number(first.isPinned);
                }

                return second.updatedAt - first.updatedAt;
            });
            saveChats();
            render();

            const activeChat = chats.find(chat => chat.id === activeChatId);

            if (activeChat?.conversationId) {
                window.dispatchEvent(
                    new CustomEvent("adumex:restore-active-chat", {
                        detail: { chat: activeChat }
                    })
                );
            }
        } catch {
            return;
        }
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

    function getApiBase() {
        return String(
            window.ADUMEX_API_URL ||
            "http://localhost:5000/api/chat"
        )
            .replace(/\/chat\/?$/, "")
            .replace(/\/+$/, "");
    }

    async function getAuthToken() {
        const client =
            window.adumexSupabase ||
            window.AdumexSupabase?.getClient?.();

        if (!client?.auth?.getSession) {
            return null;
        }

        const result = await client.auth.getSession();
        return result?.data?.session?.access_token || null;
    }

    async function syncCloudChats() {
        try {
            const token = await getAuthToken();

            if (!token) {
                return;
            }

            const response = await fetch(
                `${getApiBase()}/conversations`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const cloudChats = Array.isArray(data?.conversations)
                ? data.conversations.map(conversation => {
                    const conversationId = String(conversation.id);
                    const localChat = chats.find(chat =>
                        chat.conversationId === conversationId
                    );

                    return normalizeChat({
                        id: localChat?.id || `cloud_${conversationId}`,
                        conversationId,
                        title: conversation.title,
                        createdAt: Date.parse(conversation.created_at),
                        updatedAt: Date.parse(conversation.updated_at),
                        isPinned: conversation.is_pinned,
                        messages: localChat?.messages || []
                    });
                }).filter(Boolean)
                : [];

            chats = cloudChats.slice(0, MAX_CHATS);

            chats.forEach(chat => {
                if (chat.conversationId) {
                    try {
                        const mappings = JSON.parse(
                            localStorage.getItem("adumex-server-conversations") || "{}"
                        );
                        mappings[chat.id] = chat.conversationId;
                        localStorage.setItem(
                            "adumex-server-conversations",
                            JSON.stringify(mappings)
                        );
                    } catch {
                        return;
                    }
                }
            });

            if (!chats.some(chat => chat.id === activeChatId)) {
                setActiveChatId(null);
            }

            saveChats();
            render();
        } catch {
            return;
        }
    }

    async function deleteChat(id) {
        const chat = chats.find(
            item => item.id === id
        );

        if (!chat) return;

        if (chat.conversationId) {
            try {
                const token = await getAuthToken();
                const response = await fetch(
                    `${getApiBase()}/conversations/${encodeURIComponent(
                        chat.conversationId
                    )}`,
                    {
                        method: "DELETE",
                        headers: token
                            ? { Authorization: `Bearer ${token}` }
                            : {}
                    }
                );

                if (!response.ok) {
                    return;
                }
            } catch {
                return;
            }
        }

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

        if (updates.conversationId) {
            chat.conversationId =
                String(updates.conversationId);
        }

        if (typeof updates.isPinned === "boolean") {
            chat.isPinned = updates.isPinned;
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
            .sort((a, b) => {
                if (a.isPinned !== b.isPinned) {
                    return Number(b.isPinned) - Number(a.isPinned);
                }

                return Number(b.updatedAt) - Number(a.updatedAt);
            })
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
        "adumex:auth-ready",
        syncCloudChats
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
                    messages: detail.messages,
                    conversationId: detail.conversationId,
                    isPinned: detail.isPinned
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
    syncCloudChats();
})();
