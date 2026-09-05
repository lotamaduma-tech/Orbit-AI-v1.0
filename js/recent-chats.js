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

    let userId = null;
    let STORAGE_KEY = null;
    let ACTIVE_CHAT_KEY = null;
    let syncVersion = 0;
    let syncController = null;
    let localVersion = 0;
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
        if (!userId) return [];
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
;
        } catch {
            return [];
        }
    }

    function saveChats() {
        if (!userId) return;
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
            if (!userId) return;
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

    function createNewChat(options = {}) {
        if (!userId) return null;
        localVersion++;
        const now = Date.now();

        const chat = {
            id: generateId(),
            title: "New chat",
            createdAt: now,
            updatedAt: now,
            messages: []
        };

        chats.unshift(chat);

        // Pending local chats are retained until synchronized.

        setActiveChatId(chat.id);

        saveChats();
        render();

        if (!options.silent) window.dispatchEvent(
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
        if (!chat?.conversationId) return;
        const owner = userId;
        try {
            const data = await window.AdumexApi.json("/conversations/" + encodeURIComponent(chat.conversationId) + "/pin", {
                method: "PATCH", body: JSON.stringify({ isPinned: !chat.isPinned })
            }, owner);
            if (owner !== userId || !chats.includes(chat)) return;
            localVersion++;
            chat.isPinned = Boolean(data.conversation.is_pinned);
            saveChats(); render();
        } catch (error) { reportError(error); }
    }

    function reportError(error) {
        window.dispatchEvent(new CustomEvent("adumex:error", { detail: { error: error.message || "Unable to update chat history." } }));
    }

    function openChat(id) {
        localVersion++;
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

    async function syncCloudChats() {
        if (!userId) return;
        const owner = userId, version = ++syncVersion, startedVersion = localVersion;
        syncController?.abort();
        const controller = new AbortController();
        syncController = controller;
        try {
            const data = await window.AdumexApi.json("/conversations", { signal: controller.signal }, owner);
            if (version !== syncVersion || owner !== userId) return;
            const merged = new Map(chats.map(chat => [chat.conversationId || chat.id, chat]));
            for (const conversation of data.conversations || []) {
                const key = String(conversation.id);
                const local = merged.get(key);
                // A local mutation during this fetch wins over this snapshot.
                if (local && localVersion !== startedVersion) continue;
                merged.set(key, normalizeChat({
                    id: local?.id || "cloud_" + key, conversationId: key,
                    title: conversation.title, createdAt: Date.parse(conversation.created_at),
                    updatedAt: Date.parse(conversation.updated_at), isPinned: conversation.is_pinned,
                    messages: local?.messages || []
                }));
            }
            chats = [...merged.values()].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt);
            // Never discard an unsynced chat to satisfy the sidebar limit.
            const synced = chats.filter(chat => chat.conversationId).slice(0, MAX_CHATS);
            chats = [...chats.filter(chat => !chat.conversationId), ...synced];
            saveChats(); render();
        } catch (error) { if (!controller.signal.aborted) reportError(error); }
        finally { if (syncController === controller) syncController = null; }
    }

    function switchAccount(id) {
        if (id === userId) return;
        syncVersion++; localVersion++;
        syncController?.abort();
        userId = id || null;
        STORAGE_KEY = userId ? "adumex-conversation-history:" + userId : null;
        ACTIVE_CHAT_KEY = userId ? "adumex-active-chat:" + userId : null;
        chats = getStoredChats();
        activeChatId = userId ? getStoredActiveChatId() : null;
        if (!chats.some(chat => chat.id === activeChatId)) activeChatId = null;
        render();
        const chat = chats.find(chat => chat.id === activeChatId);
        window.dispatchEvent(new CustomEvent("adumex:restore-active-chat", { detail: { chat: chat || null } }));
        syncCloudChats();
    }

    async function deleteChat(id) {
        const chat = chats.find(
            item => item.id === id
        );

        if (!chat) return;

        const owner = userId;
        // Invalidate any in-flight list snapshot before deleting.
        syncVersion++; localVersion++; syncController?.abort();
        if (chat.id === activeChatId) window.AdumexAI?.stopGeneration?.();
        if (chat.conversationId) {
            try { await window.AdumexApi.json("/conversations/" + encodeURIComponent(chat.conversationId), { method: "DELETE" }, owner); }
            catch (error) { reportError(error); return; }
        }
        if (owner !== userId) return;
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
        localVersion++;
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
        ];

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
        "adumex:auth-ready",
        event => switchAccount(event.detail?.user?.id || null)
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
        getUserId: () => userId,
        sync: syncCloudChats,
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

    /* Old unscoped content cannot safely be attributed to the next account. */
    window.addEventListener("adumex:account-changed", event => switchAccount(event.detail?.user?.id || null));
    window.addEventListener("adumex:history-cleared", () => {
        syncVersion++; localVersion++; syncController?.abort();
        chats = []; setActiveChatId(null); saveChats(); render();
    });
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY || event.key === ACTIVE_CHAT_KEY) {
            if (window.AdumexAI?.getState?.().generating) return;
            chats = getStoredChats(); activeChatId = getStoredActiveChatId(); render();
            window.dispatchEvent(new CustomEvent("adumex:restore-active-chat", { detail: { chat: chats.find(chat => chat.id === activeChatId) || null } }));
        }
    });
    render();
    const initialVersion = syncVersion;
    window.AdumexApi.session().then(session => { if (initialVersion === syncVersion) switchAccount(session.user.id); }).catch(() => {});

})();
