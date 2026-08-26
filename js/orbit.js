"use strict";

/* =========================================================
   ORBIT AI — REAL-TIME CHAT ENGINE
   ========================================================= */

const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";

const ORBIT_FALLBACK_API_URL =
    window.ORBIT_FALLBACK_API_URL || "";

const ORBIT_HISTORY_LIMIT = 40;
const ORBIT_MEMORY_LIMIT = 100;
const ORBIT_REQUEST_TIMEOUT = 90000;
const ORBIT_MAX_TOKENS = 8192;

const ORBIT_RENDER_INTERVAL = 32;
const ORBIT_MAX_CONTEXT_CHARS = 120000;

const ORBIT_USER_ID_KEY = "orbit-user-id";
const ORBIT_MEMORY_CACHE_KEY = "orbit-memory-cache";
const ORBIT_RECENT_CHATS_KEY = "orbit-recent-chats";
const ORBIT_CHAT_PREFIX = "orbit-chat-";
const ORBIT_ACTIVE_CHAT_KEY = "orbit-active-chat";

/* =========================================================
   AI CORE
   ========================================================= */

const ORBIT_SYSTEM_PROMPT = `
You are Orbit AI, a highly capable general-purpose AI assistant.

Your strongest specialization is software engineering, programming,
debugging, architecture, web development, backend development,
frontend development, databases, APIs, authentication, deployment,
performance optimization, and technical problem solving.

GENERAL BEHAVIOR:
- Understand the user's actual goal before answering.
- Answer naturally and conversationally.
- Be accurate, practical, and direct.
- Do not unnecessarily repeat the user's question.
- Do not invent information.
- Maintain context throughout the conversation.

PROGRAMMING:
- Treat coding as a primary specialization.
- Carefully inspect code supplied by the user.
- Preserve the user's existing architecture unless a change is necessary.
- Produce complete working code when requested.
- Make code production-quality, maintainable, readable, secure, and performant.

FORMAT:
- Use Markdown where useful.
- Use fenced code blocks for code.
- Avoid unnecessary verbosity.
`;

/* =========================================================
   STATE
   ========================================================= */

let orbitConversationHistory = [];
let orbitUserMemory = [];

let orbitIsWaiting = false;
let orbitInitialized = false;

let orbitRecentChatsCache = null;

let orbitStreamBuffer = "";
let orbitStreamRenderTimer = null;

let orbitAuthSessionCache = null;
let orbitAuthSessionCacheTime = 0;

/* =========================================================
   USER ID & AUTHENTICATION
   ========================================================= */

function getOrbitUserId() {
    try {
        let userId = localStorage.getItem(ORBIT_USER_ID_KEY);
        if (userId) return userId;

        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            userId = window.crypto.randomUUID();
        } else {
            userId = "orbit-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 12);
        }

        localStorage.setItem(ORBIT_USER_ID_KEY, userId);
        return userId;
    } catch (error) {
        console.error("Orbit user ID error:", error);
        return "orbit-temporary-" + Date.now();
    }
}

let ORBIT_USER_ID = getOrbitUserId();

function getOrbitSupabaseClient() {
    if (window.supabaseClient && typeof window.supabaseClient.auth?.getSession === "function") {
        return window.supabaseClient;
    }
    if (window.supabase && typeof window.supabase.auth?.getSession === "function") {
        return window.supabase;
    }
    return null;
}

async function getOrbitAuthSession(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && orbitAuthSessionCache && now - orbitAuthSessionCacheTime < 5000) {
        return orbitAuthSessionCache;
    }

    const supabase = getOrbitSupabaseClient();
    if (!supabase) return null;

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return null;

        orbitAuthSessionCache = data?.session || null;
        orbitAuthSessionCacheTime = now;
        return orbitAuthSessionCache;
    } catch (error) {
        console.warn("Orbit authentication error:", error);
        return null;
    }
}

async function getOrbitAuthToken() {
    const session = await getOrbitAuthSession();
    return session?.access_token || null;
}

async function syncOrbitAuthenticatedUser() {
    const session = await getOrbitAuthSession();
    if (session?.user?.id) {
        ORBIT_USER_ID = String(session.user.id);
    }
    return session;
}

function logoutOrbitUser() {
    const supabase = getOrbitSupabaseClient();
    if (supabase) {
        supabase.auth.signOut();
    }
    localStorage.removeItem(ORBIT_USER_ID_KEY);
    orbitAuthSessionCache = null;
    clearOrbitConversation();
}

/* =========================================================
   DOM & INPUT HELPERS
   ========================================================= */

function getOrbitElements() {
    return {
        chatWindow: document.getElementById("chat-window"),
        commandInput: document.getElementById("command-input"),
        sendButton: document.getElementById("send-btn"),
        commandForm:
            document.getElementById("command-form") ||
            document.querySelector(".command-area form") ||
            document.querySelector(".command-box form")
    };
}

function clearOrbitInput() {
    const { commandInput } = getOrbitElements();
    if (!commandInput) return;
    commandInput.value = "";
    triggerOrbitInputUpdate();
}

function focusOrbitInput() {
    const { commandInput } = getOrbitElements();
    if (!commandInput || commandInput.disabled) return;
    requestAnimationFrame(() => {
        try {
            commandInput.focus({ preventScroll: true });
        } catch {
            commandInput.focus();
        }
    });
}

function triggerOrbitInputUpdate() {
    const { commandInput } = getOrbitElements();
    if (!commandInput) return;
    commandInput.dispatchEvent(new Event("input", { bubbles: true }));
    commandInput.dispatchEvent(new Event("change", { bubbles: true }));
}

function insertOrbitTypedCharacter(character) {
    const { commandInput } = getOrbitElements();
    if (!commandInput || commandInput.disabled) return;

    const value = commandInput.value;
    const start = typeof commandInput.selectionStart === "number" ? commandInput.selectionStart : value.length;
    const end = typeof commandInput.selectionEnd === "number" ? commandInput.selectionEnd : value.length;

    commandInput.value = value.slice(0, start) + character + value.slice(end);
    const newPosition = start + character.length;

    try {
        commandInput.setSelectionRange(newPosition, newPosition);
    } catch {
        /* Ignore */
    }
    triggerOrbitInputUpdate();
}

/* =========================================================
   SCROLL & UI UPDATES
   ========================================================= */

function scrollOrbitChat(behavior = "auto") {
    const { chatWindow } = getOrbitElements();
    if (!chatWindow) return;
    requestAnimationFrame(() => {
        chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior });
    });
}

function scrollToOrbitResponse(row, behavior = "smooth") {
    const { chatWindow } = getOrbitElements();
    if (!chatWindow || !row) return;

    requestAnimationFrame(() => {
        const containerRect = chatWindow.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const target = chatWindow.scrollTop + rowRect.top - containerRect.top - 18;

        chatWindow.scrollTo({ top: Math.max(0, target), behavior });
    });
}

function showOrbitTypingIndicator() {
    const { chatWindow } = getOrbitElements();
    if (!chatWindow) return;

    hideOrbitTypingIndicator();

    const row = document.createElement("div");
    row.id = "orbit-typing";
    row.className = "message-row orbit typing-row";
    row.innerHTML = `
        <div class="message orbit typing-message" role="status" aria-label="Orbit is typing">
            <span class="orbit-typing-dots">
                <span class="orbit-typing-dot"></span>
                <span class="orbit-typing-dot"></span>
                <span class="orbit-typing-dot"></span>
            </span>
        </div>
    `;

    chatWindow.appendChild(row);
    scrollOrbitChat("smooth");
}

function hideOrbitTypingIndicator() {
    const typing = document.getElementById("orbit-typing");
    if (typing) typing.remove();
}

function hideOrbitQuickPrompts() {
    const selectors = [".quick-prompts", ".quick-prompt-container", ".suggestion-prompts"];
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.classList.add("is-hidden"));
    });
}

function showOrbitQuickPrompts() {
    const selectors = [".quick-prompts", ".quick-prompt-container", ".suggestion-prompts"];
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.classList.remove("is-hidden"));
    });
}

/* =========================================================
   MEMORY MANAGEMENT
   ========================================================= */

function loadOrbitMemory() {
    try {
        const saved = localStorage.getItem(ORBIT_MEMORY_CACHE_KEY);
        if (!saved) {
            orbitUserMemory = [];
            return;
        }
        const parsed = JSON.parse(saved);
        orbitUserMemory = Array.isArray(parsed)
            ? parsed.filter(item => typeof item === "string" && item.trim()).slice(-ORBIT_MEMORY_LIMIT)
            : [];
    } catch (error) {
        console.error("Orbit memory load error:", error);
        orbitUserMemory = [];
    }
}

function saveOrbitMemoryCache() {
    try {
        localStorage.setItem(ORBIT_MEMORY_CACHE_KEY, JSON.stringify(orbitUserMemory));
    } catch (error) {
        console.warn("Orbit memory save error:", error);
    }
}

function rememberOrbitDetail(detail) {
    if (!detail) return;
    const cleanDetail = String(detail).trim();
    if (!cleanDetail) return;

    const exists = orbitUserMemory.some(item => item.toLowerCase() === cleanDetail.toLowerCase());
    if (exists) return;

    orbitUserMemory.push(cleanDetail);
    orbitUserMemory = orbitUserMemory.slice(-ORBIT_MEMORY_LIMIT);
    saveOrbitMemoryCache();
}

function detectOrbitMemory(message) {
    if (!message) return;
    const text = String(message).trim();
    if (!text) return;

    const nameMatch = text.match(/(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i);
    if (nameMatch) rememberOrbitDetail(`The user's name is ${nameMatch[1].trim()}.`);

    const projectMatch = text.match(/(?:i am working on|i'm working on|i am building|my project is)\s+(.+)/i);
    if (projectMatch) rememberOrbitDetail(`The user is working on: ${projectMatch[1].trim()}`);
}

function getOrbitMemoryContext() {
    return orbitUserMemory.length ? orbitUserMemory.join("\n") : "";
}

/* =========================================================
   SECURITY & SANITIZATION
   ========================================================= */

function sanitizeMessage(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function validateMessage(message) {
    return typeof message === "string" && message.trim().length > 0;
}

/* =========================================================
   MESSAGE RENDERER
   ========================================================= */

function createOrbitCodeHTML(language, code) {
    const safeLanguage = language ? language.trim().toLowerCase() : "text";
    const displayLanguage = safeLanguage === "text" ? "CODE" : safeLanguage.toUpperCase();

    return `
        <div class="orbit-code-wrapper orbit-code-container" data-orbit-code-block data-language="${sanitizeMessage(safeLanguage)}">
            <div class="orbit-code-toolbar orbit-code-header">
                <span class="orbit-code-language">${sanitizeMessage(displayLanguage)}</span>
                <button type="button" class="orbit-code-copy orbit-copy-btn" data-orbit-copy-code title="Copy code">
                    Copy
                </button>
            </div>
            <pre class="orbit-code-block"><code class="language-${sanitizeMessage(safeLanguage)}">${sanitizeMessage(code)}</code></pre>
        </div>
    `;
}

function renderMarkdown(text) {
    if (!text) return "";
    let formatted = sanitizeMessage(text);
    formatted = formatted.replace(/```([a-zA-Z0-9_+#.-]*)\s*\n?([\s\S]*?)```/g, (_, lang, code) =>
        createOrbitCodeHTML(lang, code.replace(/^\n/, "").replace(/\n$/, ""))
    );
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/(^|[^\*])\*([^\*\n]+)\*(?!\*)/gm, "$1<em>$2</em>");
    formatted = formatted.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
    return formatted;
}

function renderUserMessage(text, group) {
    const row = document.createElement("div");
    row.className = "message-row user";
    row.dataset.sender = "user";

    const message = document.createElement("div");
    message.className = "message user";
    message.textContent = String(text ?? "");

    row.appendChild(message);
    group.appendChild(row);
    return row;
}

function renderAIMessage(text, group) {
    const row = document.createElement("div");
    row.className = "message-row orbit";
    row.dataset.sender = "orbit";

    const message = document.createElement("div");
    message.className = "message orbit";
    message.innerHTML = renderMarkdown(text);

    row.appendChild(message);
    group.appendChild(row);
    return row;
}

function renderOrbitConversation(messages) {
    const { chatWindow } = getOrbitElements();
    if (!chatWindow) return;

    chatWindow.querySelectorAll(".conversation-group, #orbit-typing").forEach(el => el.remove());

    if (!Array.isArray(messages) || !messages.length) return;

    const group = document.createElement("div");
    group.className = "conversation-group";
    chatWindow.appendChild(group);

    messages.forEach(item => {
        if (!item || typeof item.content !== "string") return;
        if (item.role === "user") {
            renderUserMessage(item.content, group);
        } else {
            renderAIMessage(item.content, group);
        }
    });

    scrollOrbitChat("auto");
}

/* =========================================================
   CONVERSATIONS & CACHE
   ========================================================= */

function normalizeOrbitMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim())
        .map(item => ({ role: item.role, content: item.content.trim() }))
        .slice(-ORBIT_HISTORY_LIMIT);
}

function createOrbitChatId() {
    return "chat-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 10);
}

function saveOrbitChatData(chat) {
    if (!chat?.id) return false;
    try {
        localStorage.setItem(
            ORBIT_CHAT_PREFIX + String(chat.id),
            JSON.stringify({
                id: chat.id,
                title: chat.title,
                message: chat.message,
                messages: normalizeOrbitMessages(chat.messages),
                updatedAt: chat.updatedAt || Date.now()
            })
        );
        return true;
    } catch {
        return false;
    }
}

function loadOrbitChatData(chatId) {
    if (!chatId) return null;
    try {
        const saved = localStorage.getItem(ORBIT_CHAT_PREFIX + String(chatId));
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function deleteConversation(chatId) {
    if (!chatId) return false;
    localStorage.removeItem(ORBIT_CHAT_PREFIX + String(chatId));

    let chats = getCachedConversations();
    chats = chats.filter(chat => String(chat.id) !== String(chatId));
    localStorage.setItem(ORBIT_RECENT_CHATS_KEY, JSON.stringify(chats));

    if (window.orbitActiveChatId === chatId) {
        clearOrbitConversation();
    }
    refreshRecentChats();
    return true;
}

function getCachedConversations() {
    try {
        const saved = localStorage.getItem(ORBIT_RECENT_CHATS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function cacheConversation(chat) {
    const chats = getCachedConversations().filter(c => c.id !== chat.id);
    chats.unshift(chat);
    localStorage.setItem(ORBIT_RECENT_CHATS_KEY, JSON.stringify(chats.slice(0, ORBIT_HISTORY_LIMIT)));
}

function loadConversation(chatId) {
    const chat = loadOrbitChatData(chatId);
    if (!chat || !chat.messages) return false;

    orbitConversationHistory = normalizeOrbitMessages(chat.messages);
    window.orbitActiveChatId = chatId;
    localStorage.setItem(ORBIT_ACTIVE_CHAT_KEY, chatId);

    renderOrbitConversation(orbitConversationHistory);
    return true;
}

function searchChats(query) {
    const chats = getCachedConversations();
    const clean = query.toLowerCase().trim();
    return chats.filter(chat => chat.title.toLowerCase().includes(clean) || chat.message.toLowerCase().includes(clean));
}

function refreshRecentChats() {
    const chats = getCachedConversations();
    const container = document.querySelector(".chat-history-list");
    if (!container) return;

    container.innerHTML = "";
    chats.forEach(chat => {
        const item = document.createElement("div");
        item.className = "chat-history-item";
        item.textContent = chat.title || "New chat";
        item.onclick = () => loadConversation(chat.id);
        container.appendChild(item);
    });
}

/* =========================================================
   API & STREAMING CHAT ENGINE
   ========================================================= */

async function apiRequest(body, signal) {
    const token = await getOrbitAuthToken();
    const headers = { "Content-Type": "application/json", Accept: "text/event-stream, application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(ORBIT_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
        cache: "no-store"
    });
}

async function orbitSendMessage(suppliedMessage = null) {
    const { commandInput, sendButton } = getOrbitElements();
    if (!commandInput || orbitIsWaiting) return false;

    const message = suppliedMessage !== null ? String(suppliedMessage).trim() : String(commandInput.value || "").trim();
    if (!validateMessage(message)) return false;

    await syncOrbitAuthenticatedUser();

    if (!window.orbitActiveChatId) {
        window.orbitActiveChatId = createOrbitChatId();
        localStorage.setItem(ORBIT_ACTIVE_CHAT_KEY, window.orbitActiveChatId);
    }

    detectOrbitMemory(message);
    clearOrbitInput();
    hideOrbitQuickPrompts();

    orbitIsWaiting = true;
    commandInput.disabled = true;
    if (sendButton) sendButton.disabled = true;

    const { chatWindow } = getOrbitElements();
    let group = chatWindow.querySelector(".conversation-group");
    if (!group) {
        group = document.createElement("div");
        group.className = "conversation-group";
        chatWindow.appendChild(group);
    }

    renderUserMessage(message, group);
    showOrbitTypingIndicator();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ORBIT_REQUEST_TIMEOUT);

    try {
        const response = await apiRequest(
            {
                message,
                history: normalizeOrbitMessages(orbitConversationHistory),
                memory: getOrbitMemoryContext(),
                userId: ORBIT_USER_ID,
                systemPrompt: ORBIT_SYSTEM_PROMPT,
                max_tokens: ORBIT_MAX_TOKENS,
                stream: true
            },
            controller.signal
        );

        if (!response.ok) throw new Error(`Server returned status ${response.status}`);

        hideOrbitTypingIndicator();

        const data = await response.json();
        const reply = data?.reply || data?.response || "Response received.";

        renderAIMessage(reply, group);

        orbitConversationHistory.push({ role: "user", content: message }, { role: "assistant", content: reply });

        const chatData = {
            id: window.orbitActiveChatId,
            title: message.substring(0, 40),
            message,
            messages: orbitConversationHistory,
            updatedAt: Date.now()
        };

        saveOrbitChatData(chatData);
        cacheConversation(chatData);
        refreshRecentChats();
    } catch (error) {
        hideOrbitTypingIndicator();
        renderAIMessage(`I couldn't complete that request. ${error.message}`, group);
    } finally {
        clearTimeout(timeoutId);
        orbitIsWaiting = false;
        commandInput.disabled = false;
        if (sendButton) sendButton.disabled = false;
        focusOrbitInput();
    }
}

function clearOrbitConversation() {
    orbitConversationHistory = [];
    window.orbitActiveChatId = null;
    localStorage.removeItem(ORBIT_ACTIVE_CHAT_KEY);
    renderOrbitConversation([]);
    showOrbitQuickPrompts();
}

/* =========================================================
   INITIALIZATION & EVENT BINDINGS
   ========================================================= */

function bindEventListeners() {
    const { commandForm, sendButton, commandInput } = getOrbitElements();

    if (commandForm) {
        commandForm.addEventListener("submit", e => {
            e.preventDefault();
            orbitSendMessage();
        });
    }

    if (sendButton) {
        sendButton.addEventListener("click", e => {
            e.preventDefault();
            orbitSendMessage();
        });
    }

    if (commandInput) {
        commandInput.addEventListener("keydown", e => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                orbitSendMessage();
            }
        });
    }
}

async function initializeOrbit() {
    if (orbitInitialized) return;
    loadOrbitMemory();
    await syncOrbitAuthenticatedUser();
    bindEventListeners();

    const activeChatId = localStorage.getItem(ORBIT_ACTIVE_CHAT_KEY);
    if (activeChatId) {
        loadConversation(activeChatId);
    }

    orbitInitialized = true;
    console.log("Orbit AI System initialized successfully.");
}

/* =========================================================
   PUBLIC GLOBAL API
   ========================================================= */

window.OrbitAI = {
    initialize: initializeOrbit,
    sendMessage: orbitSendMessage,
    clearConversation: clearOrbitConversation,
    loadConversation,
    deleteConversation,
    searchChats,
    getCurrentUser: () => ORBIT_USER_ID,
    getAuthSession: getOrbitAuthSession,
    logoutUser: logoutOrbitUser
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeOrbit, { once: true });
} else {
    initializeOrbit();
}