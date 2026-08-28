"use strict";

(() => {
  const list = document.getElementById("chat-history-list");
  const emptyState = document.getElementById("chat-history-empty");
  const newChatButton = document.getElementById("chat-history-new");
  const topbarNewChat = document.getElementById("topbar-new-chat");
  const searchButton = document.getElementById("chat-search-btn");

  if (!list) return;

  const STORAGE_KEY = "orbit-conversation-history";
  const ACTIVE_CHAT_KEY = "orbit-active-chat";
  const MAX_CHATS = 50;

  let chats = [];
  let activeChatId = null;

  function generateId() {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getStoredChats() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return [];

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(chat => chat && typeof chat === "object")
        .map(chat => ({
          id: chat.id || generateId(),
          title: String(chat.title || "New chat"),
          createdAt: chat.createdAt || Date.now(),
          updatedAt: chat.updatedAt || chat.createdAt || Date.now(),
          messages: Array.isArray(chat.messages) ? chat.messages : []
        }))
        .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
        .slice(0, MAX_CHATS);
    } catch {
      return [];
    }
  }

  function saveChats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {
      return;
    }
  }

  function getActiveChatId() {
    try {
      return localStorage.getItem(ACTIVE_CHAT_KEY);
    } catch {
      return null;
    }
  }

  function setActiveChatId(id) {
    activeChatId = id;

    try {
      if (id) {
        localStorage.setItem(ACTIVE_CHAT_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_CHAT_KEY);
      }
    } catch {
      return;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getChatTitle(chat) {
    if (chat.title && chat.title.trim() && chat.title !== "New chat") {
      return chat.title.trim();
    }

    const firstUserMessage = chat.messages?.find(
      message =>
        message &&
        (message.role === "user" || message.sender === "user") &&
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

    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const difference = now.getTime() - date.getTime();

    if (difference < 60 * 1000) {
      return "Just now";
    }

    if (difference < 60 * 60 * 1000) {
      const minutes = Math.floor(difference / (60 * 1000));
      return `${minutes}m ago`;
    }

    if (difference < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(difference / (60 * 60 * 1000));
      return `${hours}h ago`;
    }

    if (difference < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(difference / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function createChatElement(chat) {
    const item = document.createElement("div");

    item.className = "chat-history-item";
    item.dataset.chatId = chat.id;

    if (chat.id === activeChatId) {
      item.classList.add("active");
      item.setAttribute("aria-current", "true");
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
        <span class="chat-history-item-title">${escapeHtml(title)}</span>
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

    const mainButton = item.querySelector(".chat-history-item-button");
    const deleteButton = item.querySelector(".chat-history-delete");

    if (date) {
      mainButton.dataset.date = date;
    }

    mainButton.addEventListener("click", event => {
      event.preventDefault();
      openChat(chat.id);
    });

    deleteButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      deleteChat(chat.id);
    });

    return item;
  }

  function render() {
    const items = list.querySelectorAll(".chat-history-item");
    items.forEach(item => item.remove());

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
      list.appendChild(createChatElement(chat));
    });
  }

  function createNewChat() {
    const chat = {
      id: generateId(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };

    chats.unshift(chat);
    chats = chats.slice(0, MAX_CHATS);

    setActiveChatId(chat.id);
    saveChats();
    render();

    window.dispatchEvent(
      new CustomEvent("orbit:new-chat", {
        detail: { chat }
      })
    );

    return chat;
  }

  function openChat(id) {
    const chat = chats.find(item => item.id === id);

    if (!chat) return;

    activeChatId = id;
    setActiveChatId(id);

    chats = [
      chat,
      ...chats.filter(item => item.id !== id)
    ];

    saveChats();
    render();

    window.dispatchEvent(
      new CustomEvent("orbit:open-chat", {
        detail: { chat }
      })
    );
  }

  function deleteChat(id) {
    const chat = chats.find(item => item.id === id);

    if (!chat) return;

    chats = chats.filter(item => item.id !== id);

    if (activeChatId === id) {
      setActiveChatId(null);

      window.dispatchEvent(
        new CustomEvent("orbit:chat-deleted", {
          detail: { chat }
        })
      );
    }

    saveChats();
    render();
  }

  function updateChat(id, updates = {}) {
    const chat = chats.find(item => item.id === id);

    if (!chat) return;

    if (typeof updates.title === "string") {
      chat.title = updates.title.trim() || "New chat";
    }

    if (Array.isArray(updates.messages)) {
      chat.messages = updates.messages;
    }

    chat.updatedAt = Date.now();

    chats = [
      chat,
      ...chats.filter(item => item.id !== id)
    ].slice(0, MAX_CHATS);

    saveChats();
    render();
  }

  function addMessageToChat(id, message) {
    const chat = chats.find(item => item.id === id);

    if (!chat || !message) return;

    if (!Array.isArray(chat.messages)) {
      chat.messages = [];
    }

    chat.messages.push(message);

    if (
      (message.role === "user" || message.sender === "user") &&
      typeof message.content === "string" &&
      chat.title === "New chat"
    ) {
      chat.title = message.content
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 42) || "New chat";
    }

    chat.updatedAt = Date.now();

    chats = [
      chat,
      ...chats.filter(item => item.id !== id)
    ].slice(0, MAX_CHATS);

    saveChats();
    render();
  }

  function searchChats() {
    const existing = document.querySelector(".chat-history-search");

    if (existing) {
      existing.focus();
      return;
    }

    const search = document.createElement("input");

    search.type = "search";
    search.className = "chat-history-search";
    search.placeholder = "Search chats...";
    search.autocomplete = "off";
    search.setAttribute("aria-label", "Search chats");

    list.parentElement.insertBefore(search, list);

    search.focus();

    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();

      list.querySelectorAll(".chat-history-item").forEach(item => {
        const chat = chats.find(chat => chat.id === item.dataset.chatId);

        if (!chat) return;

        const title = getChatTitle(chat).toLowerCase();

        const matches =
          !query ||
          title.includes(query) ||
          chat.messages.some(message =>
            typeof message?.content === "string" &&
            message.content.toLowerCase().includes(query)
          );

        item.hidden = !matches;
      });
    });

    search.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        search.remove();
        render();
      }
    });
  }

  function syncFromOrbitHistory(event) {
    const incoming = event?.detail?.history;

    if (!Array.isArray(incoming)) return;

    chats = incoming
      .filter(chat => chat && typeof chat === "object")
      .map(chat => ({
        id: chat.id || generateId(),
        title: String(chat.title || "New chat"),
        createdAt: chat.createdAt || Date.now(),
        updatedAt: chat.updatedAt || chat.createdAt || Date.now(),
        messages: Array.isArray(chat.messages) ? chat.messages : []
      }))
      .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
      .slice(0, MAX_CHATS);

    saveChats();
    render();
  }

  newChatButton?.addEventListener("click", createNewChat);
  topbarNewChat?.addEventListener("click", createNewChat);
  searchButton?.addEventListener("click", searchChats);

  window.addEventListener("orbit:history-updated", syncFromOrbitHistory);

  window.addEventListener("orbit:chat-updated", event => {
    const detail = event.detail || {};

    if (!detail.id) return;

    updateChat(detail.id, {
      title: detail.title,
      messages: detail.messages
    });
  });

  window.addEventListener("orbit:add-message", event => {
    const detail = event.detail || {};

    if (!detail.id || !detail.message) return;

    addMessageToChat(detail.id, detail.message);
  });

  window.orbitRecentChats = {
    getChats: () => [...chats],
    getActiveChat: () =>
      chats.find(chat => chat.id === activeChatId) || null,
    getActiveChatId: () => activeChatId,
    createChat: createNewChat,
    openChat,
    deleteChat,
    updateChat,
    addMessageToChat,
    render
  };

  chats = getStoredChats();
  activeChatId = getActiveChatId();

  if (activeChatId && !chats.some(chat => chat.id === activeChatId)) {
    activeChatId = null;
    setActiveChatId(null);
  }

  render();
})();
