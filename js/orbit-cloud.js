"use strict";

// Orbit AI cloud storage config & constants
const ORBIT_CLOUD_CONVERSATIONS_TABLE = "conversations";
const ORBIT_CLOUD_MESSAGES_TABLE = "messages";
const ORBIT_CLOUD_CACHE_KEY = "orbit-cloud-history-cache";
const ORBIT_CLOUD_ACTIVE_CHAT_KEY = "orbit-cloud-active-chat";

const ORBIT_CLOUD_HISTORY_LIMIT = 50;
const ORBIT_CLOUD_MESSAGE_LIMIT = 200;

let orbitCloudInitialized = false;
let orbitCloudUser = null;

// Supabase authentication helpers
function getOrbitCloudSupabase() {
    if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
        return window.supabaseClient;
    }
    if (window.supabase && typeof window.supabase.from === "function") {
        return window.supabase;
    }
    return null;
}

async function getOrbitCloudSession() {
    const supabase = getOrbitCloudSupabase();
    if (!supabase || !supabase.auth || typeof supabase.auth.getSession !== "function") {
        return null;
    }

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.warn("Orbit Cloud session error:", error);
            return null;
        }
        return data?.session || null;
    } catch (error) {
        console.warn("Orbit Cloud authentication error:", error);
        return null;
    }
}

async function getOrbitCloudUser() {
    const session = await getOrbitCloudSession();
    orbitCloudUser = session?.user || null;
    return orbitCloudUser;
}

async function getOrbitCloudToken() {
    const session = await getOrbitCloudSession();
    return session?.access_token || null;
}

function isOrbitCloudAuthenticated() {
    return Boolean(orbitCloudUser?.id);
}

// Local ID generator
function createOrbitCloudLocalId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return "local-" + window.crypto.randomUUID();
    }
    return "local-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 10);
}

// Local cache management
function normalizeOrbitCloudMessage(message) {
    if (!message) return null;

    const role = message.role === "user" ? "user" : message.role === "assistant" ? "assistant" : null;
    if (!role) return null;

    if (typeof message.content !== "string") return null;
    const content = message.content.trim();
    if (!content) return null;

    return {
        id: message.id ? String(message.id) : null,
        role,
        content,
        createdAt: message.createdAt || message.created_at || null
    };
}

function normalizeOrbitCloudMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages
        .map(normalizeOrbitCloudMessage)
        .filter(Boolean)
        .slice(-ORBIT_CLOUD_MESSAGE_LIMIT);
}

function normalizeOrbitCloudConversation(conversation) {
    if (!conversation) return null;
    const id = conversation.id;
    if (!id) return null;

    return {
        id: String(id),
        title: String(conversation.title || "New chat").trim(),
        message: String(conversation.message || "").trim(),
        messages: normalizeOrbitCloudMessages(conversation.messages),
        createdAt: conversation.createdAt || conversation.created_at || null,
        updatedAt: conversation.updatedAt || conversation.updated_at || null
    };
}

function loadOrbitCloudCache() {
    try {
        const saved = localStorage.getItem(ORBIT_CLOUD_CACHE_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(normalizeOrbitCloudConversation)
            .filter(Boolean)
            .slice(0, ORBIT_CLOUD_HISTORY_LIMIT);
    } catch (error) {
        console.warn("Orbit Cloud cache load failed:", error);
        return [];
    }
}

function saveOrbitCloudCache(conversations) {
    try {
        const normalized = Array.isArray(conversations)
            ? conversations.map(normalizeOrbitCloudConversation).filter(Boolean).slice(0, ORBIT_CLOUD_HISTORY_LIMIT)
            : [];

        localStorage.setItem(ORBIT_CLOUD_CACHE_KEY, JSON.stringify(normalized));
        return normalized;
    } catch (error) {
        console.warn("Orbit Cloud cache save failed:", error);
        return [];
    }
}

function clearOrbitCloudCache() {
    try {
        localStorage.removeItem(ORBIT_CLOUD_CACHE_KEY);
    } catch (error) {
        console.warn("Orbit Cloud cache clear failed:", error);
    }
}

// Active chat state
function setOrbitCloudActiveChat(conversationId) {
    try {
        if (conversationId) {
            localStorage.setItem(ORBIT_CLOUD_ACTIVE_CHAT_KEY, String(conversationId));
        } else {
            localStorage.removeItem(ORBIT_CLOUD_ACTIVE_CHAT_KEY);
        }
    } catch (error) {
        console.warn("Orbit Cloud active chat error:", error);
    }
}

function getOrbitCloudActiveChat() {
    try {
        return localStorage.getItem(ORBIT_CLOUD_ACTIVE_CHAT_KEY) || null;
    } catch {
        return null;
    }
}

// Conversation CRUD operations
async function createOrbitCloudConversation(title = "New chat") {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user) return null;

    try {
        const { data, error } = await supabase
            .from(ORBIT_CLOUD_CONVERSATIONS_TABLE)
            .insert({
                user_id: user.id,
                title: String(title || "New chat").trim().slice(0, 120)
            })
            .select("id, user_id, title, created_at, updated_at")
            .single();

        if (error) {
            console.error("Orbit Cloud conversation creation failed:", error);
            return null;
        }

        const conversation = normalizeOrbitCloudConversation(data);
        if (conversation?.id) {
            setOrbitCloudActiveChat(conversation.id);
        }

        return conversation;
    } catch (error) {
        console.error("Orbit Cloud conversation error:", error);
        return null;
    }
}

async function updateOrbitCloudConversation(conversationId, updates = {}) {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user || !conversationId) return null;

    const payload = {};
    if (typeof updates.title === "string" && updates.title.trim()) {
        payload.title = updates.title.trim().slice(0, 120);
    }
    if (typeof updates.message === "string") {
        payload.message = updates.message.trim().slice(0, 500);
    }

    if (!Object.keys(payload).length) return null;

    try {
        const { data, error } = await supabase
            .from(ORBIT_CLOUD_CONVERSATIONS_TABLE)
            .update(payload)
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .select("id, user_id, title, created_at, updated_at")
            .single();

        if (error) {
            console.error("Orbit Cloud conversation update failed:", error);
            return null;
        }

        return normalizeOrbitCloudConversation(data);
    } catch (error) {
        console.error("Orbit Cloud conversation update error:", error);
        return null;
    }
}

// Message operations
async function saveOrbitCloudMessage(conversationId, role, content) {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user || !conversationId) return null;

    const cleanRole = role === "user" ? "user" : role === "assistant" ? "assistant" : null;
    const cleanContent = typeof content === "string" ? content.trim() : "";

    if (!cleanRole || !cleanContent) return null;

    try {
        const { data, error } = await supabase
            .from(ORBIT_CLOUD_MESSAGES_TABLE)
            .insert({
                conversation_id: conversationId,
                user_id: user.id,
                role: cleanRole,
                content: cleanContent
            })
            .select("id, conversation_id, user_id, role, content, created_at")
            .single();

        if (error) {
            console.error("Orbit Cloud message save failed:", error);
            return null;
        }

        return data || null;
    } catch (error) {
        console.error("Orbit Cloud message error:", error);
        return null;
    }
}

// History loading
async function loadOrbitCloudConversations() {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user) return [];

    try {
        const { data, error } = await supabase
            .from(ORBIT_CLOUD_CONVERSATIONS_TABLE)
            .select("id, user_id, title, created_at, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(ORBIT_CLOUD_HISTORY_LIMIT);

        if (error) {
            console.error("Orbit Cloud history load failed:", error);
            return [];
        }

        return Array.isArray(data) ? data.map(normalizeOrbitCloudConversation).filter(Boolean) : [];
    } catch (error) {
        console.error("Orbit Cloud history error:", error);
        return [];
    }
}

async function loadOrbitCloudMessages(conversationId) {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user || !conversationId) return [];

    try {
        const { data, error } = await supabase
            .from(ORBIT_CLOUD_MESSAGES_TABLE)
            .select("id, conversation_id, user_id, role, content, created_at")
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(ORBIT_CLOUD_MESSAGE_LIMIT);

        if (error) {
            console.error("Orbit Cloud messages load failed:", error);
            return [];
        }

        return normalizeOrbitCloudMessages(data);
    } catch (error) {
        console.error("Orbit Cloud messages error:", error);
        return [];
    }
}

// Fast cached data getters
async function getOrbitCachedConversations() {
    return loadOrbitCloudCache();
}

async function getOrbitCachedMessages(conversationId) {
    const conversations = loadOrbitCloudCache();
    const conversation = conversations.find(item => String(item.id) === String(conversationId));
    return conversation?.messages || [];
}

// Syncing cloud and local storage
async function syncOrbitCloudHistory() {
    const user = await getOrbitCloudUser();
    if (!user) return [];

    const cloudConversations = await loadOrbitCloudConversations();
    if (!cloudConversations.length) {
        saveOrbitCloudCache([]);
        return [];
    }

    const cachedConversations = loadOrbitCloudCache();
    const merged = cloudConversations.map(cloudConversation => {
        const cached = cachedConversations.find(item => String(item.id) === String(cloudConversation.id));
        return {
            ...cloudConversation,
            message: cached?.message || "",
            messages: cached?.messages || []
        };
    });

    saveOrbitCloudCache(merged);
    return merged;
}

async function syncOrbitCloudConversation(conversationId) {
    if (!conversationId) return null;

    const messages = await loadOrbitCloudMessages(conversationId);
    if (!messages.length) return null;

    const conversations = loadOrbitCloudCache();
    const index = conversations.findIndex(conversation => String(conversation.id) === String(conversationId));

    if (index >= 0) {
        conversations[index].messages = messages;
        conversations[index].updatedAt = Date.now();
        saveOrbitCloudCache(conversations);
    }

    return messages;
}

// Delete single conversation
async function deleteOrbitCloudConversation(conversationId) {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user || !conversationId) return false;

    try {
        const { error } = await supabase
            .from(ORBIT_CLOUD_CONVERSATIONS_TABLE)
            .delete()
            .eq("id", conversationId)
            .eq("user_id", user.id);

        if (error) {
            console.error("Orbit Cloud conversation delete failed:", error);
            return false;
        }

        const cached = loadOrbitCloudCache();
        saveOrbitCloudCache(cached.filter(conversation => String(conversation.id) !== String(conversationId)));

        if (String(getOrbitCloudActiveChat()) === String(conversationId)) {
            setOrbitCloudActiveChat(null);
        }

        return true;
    } catch (error) {
        console.error("Orbit Cloud delete error:", error);
        return false;
    }
}

// Clear all cloud history
async function clearOrbitCloudHistory() {
    const supabase = getOrbitCloudSupabase();
    const user = await getOrbitCloudUser();

    if (!supabase || !user?.id) return false;

    try {
        const { data: conversations, error: conversationError } = await supabase
            .from(ORBIT_CLOUD_CONVERSATIONS_TABLE)
            .select("id")
            .eq("user_id", user.id);

        if (conversationError) {
            console.error("Orbit Cloud history lookup failed:", conversationError);
            return false;
        }

        const conversationIds = Array.isArray(conversations)
            ? conversations.map(conversation => conversation.id).filter(Boolean)
            : [];

        if (conversationIds.length) {
            const { error: messageError } = await supabase
                .from(ORBIT_CLOUD_MESSAGES_TABLE)
                .delete()
                .eq("user_id", user.id);

            if (messageError) {
                console.error("Orbit Cloud messages clear failed:", messageError);
                return false;
            }

            const { error: conversationDeleteError } = await supabase
                .from(ORBIT_CLOUD_CONVERSATIONS_TABLE)
                .delete()
                .eq("user_id", user.id);

            if (conversationDeleteError) {
                console.error("Orbit Cloud conversations clear failed:", conversationDeleteError);
                return false;
            }
        }

        clearOrbitCloudCache();
        setOrbitCloudActiveChat(null);

        if (typeof clearOrbitConversationHistory === "function") {
            clearOrbitConversationHistory();
        }

        if (typeof clearOrbitConversationStorage === "function") {
            clearOrbitConversationStorage();
        }

        if (typeof refreshOrbitRecentChats === "function") {
            refreshOrbitRecentChats();
        }

        const { chatWindow } = getOrbitElements();
        if (chatWindow) {
            chatWindow.innerHTML = "";
        }

        const chatIntro = document.getElementById("chat-intro");
        if (chatIntro) {
            chatIntro.classList.remove("is-hidden");
        }

        return true;
    } catch (error) {
        console.error("Orbit Cloud history clear failed:", error);
        return false;
    }
}

// Account switching handler
async function handleOrbitCloudAuthChange(session) {
    const newUser = session?.user || null;
    const previousUserId = orbitCloudUser?.id || null;
    const newUserId = newUser?.id || null;

    orbitCloudUser = newUser;

    if (previousUserId !== newUserId) {
        clearOrbitCloudCache();
        setOrbitCloudActiveChat(null);
    }

    if (newUser) {
        await syncOrbitCloudHistory();
    }
}

// Public API exposure
window.OrbitCloud = {
    initialize: initializeOrbitCloud,
    getSession: getOrbitCloudSession,
    getUser: getOrbitCloudUser,
    getToken: getOrbitCloudToken,
    isAuthenticated: isOrbitCloudAuthenticated,
    createConversation: createOrbitCloudConversation,
    updateConversation: updateOrbitCloudConversation,
    saveMessage: saveOrbitCloudMessage,
    loadConversations: loadOrbitCloudConversations,
    loadMessages: loadOrbitCloudMessages,
    deleteConversation: deleteOrbitCloudConversation,
    clearHistory: clearOrbitCloudHistory,
    syncHistory: syncOrbitCloudHistory,
    syncConversation: syncOrbitCloudConversation,
    getCachedConversations: getOrbitCachedConversations,
    getCachedMessages: getOrbitCachedMessages,
    getActiveChat: getOrbitCloudActiveChat,
    setActiveChat: setOrbitCloudActiveChat,
    clearCache: clearOrbitCloudCache
};

// UI and history restoration
async function restoreOrbitCloudHistory() {
    try {
        const session = await getOrbitAuthSession?.();
        if (!session?.user?.id) {
            console.log("Orbit Cloud: no authenticated user.");
            return [];
        }

        const userId = String(session.user.id);
        const conversations = await getOrbitCloudConversations(userId);

        if (!Array.isArray(conversations) || !conversations.length) {
            console.log("Orbit Cloud: no saved conversations.");
            return [];
        }

        try {
            localStorage.setItem(ORBIT_RECENT_CHATS_KEY, JSON.stringify(conversations));
        } catch (error) {
            console.warn("Orbit Cloud: unable to cache conversations:", error);
        }

        if (typeof refreshOrbitRecentChats === "function") {
            refreshOrbitRecentChats();
        }

        let activeChatId = null;
        try {
            activeChatId = localStorage.getItem(ORBIT_ACTIVE_CHAT_KEY);
        } catch {
            activeChatId = null;
        }

        if (!activeChatId) {
            activeChatId = conversations[0]?.id || conversations[0]?.conversation_id || null;
        }

        if (!activeChatId) return conversations;

        const restored = await restoreOrbitCloudConversation(activeChatId);
        if (restored) {
            try {
                localStorage.setItem(ORBIT_ACTIVE_CHAT_KEY, String(activeChatId));
            } catch {
                /* Ignore localStorage errors */
            }
        }

        return conversations;
    } catch (error) {
        console.error("Orbit Cloud: history restore failed:", error);
        return [];
    }
}

async function restoreOrbitCloudConversation(conversationId) {
    if (!conversationId) return false;

    try {
        const session = await getOrbitAuthSession?.();
        if (!session?.user?.id) return false;

        const userId = String(session.user.id);
        const messages = await getOrbitCloudMessages(conversationId, userId);

        if (!Array.isArray(messages)) return false;

        const normalizedMessages = messages
            .filter(message => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim())
            .map(message => ({
                role: message.role,
                content: message.content.trim()
            }));

        if (typeof setOrbitConversation === "function") {
            setOrbitConversation(normalizedMessages);
        }

        if (typeof saveOrbitActiveChatId === "function") {
            saveOrbitActiveChatId(conversationId);
        }

        renderOrbitCloudConversation(normalizedMessages);
        return true;
    } catch (error) {
        console.error("Orbit Cloud: conversation restore failed:", error);
        return false;
    }
}

function renderOrbitCloudConversation(messages) {
    const { chatWindow } = getOrbitElements();
    if (!chatWindow) return;

    chatWindow.innerHTML = "";
    if (!Array.isArray(messages) || !messages.length) return;

    const conversationGroup = typeof createOrbitConversationGroup === "function"
        ? createOrbitConversationGroup()
        : document.createElement("div");

    if (!conversationGroup.classList.contains("conversation-group")) {
        conversationGroup.classList.add("conversation-group");
    }

    chatWindow.appendChild(conversationGroup);

    messages.forEach(message => {
        if (typeof addOrbitMessage === "function") {
            addOrbitMessage(message.content, message.role, conversationGroup);
        }
    });

    const chatIntro = document.getElementById("chat-intro");
    if (chatIntro) {
        chatIntro.classList.add("is-hidden");
    }

    if (typeof scrollOrbitChat === "function") {
        scrollOrbitChat("auto");
    }
}

// Authentication listeners
function setupOrbitCloudHistoryRestore() {
    const supabase = getOrbitSupabaseClient?.();
    if (!supabase) return;

    if (document.documentElement.dataset.orbitCloudHistoryRestoreReady === "true") return;
    document.documentElement.dataset.orbitCloudHistoryRestoreReady = "true";

    try {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user?.id) {
                setTimeout(() => {
                    restoreOrbitCloudHistory();
                }, 0);
            }

            if (event === "SIGNED_OUT") {
                if (typeof clearOrbitConversationHistory === "function") {
                    clearOrbitConversationHistory();
                }
                const { chatWindow } = getOrbitElements();
                if (chatWindow) chatWindow.innerHTML = "";
            }
        });
    } catch (error) {
        console.warn("Orbit Cloud: auth restore listener error:", error);
    }
}

// Primary initialization & bootstrapping
async function initializeOrbitCloud() {
    if (orbitCloudInitialized) return;

    const supabase = getOrbitCloudSupabase();
    if (!supabase) {
        console.warn("Orbit Cloud: Supabase client not found.");
        orbitCloudInitialized = true;
        return;
    }

    try {
        const session = await getOrbitCloudSession();
        orbitCloudUser = session?.user || null;

        if (supabase.auth?.onAuthStateChange) {
            supabase.auth.onAuthStateChange((event, session) => {
                Promise.resolve(handleOrbitCloudAuthChange(session)).catch(error => {
                    console.error("Orbit Cloud auth sync error:", error);
                });
            });
        }

        if (orbitCloudUser) {
            await syncOrbitCloudHistory();
        }

        orbitCloudInitialized = true;
        console.log("Orbit Cloud initialized.");
    } catch (error) {
        console.error("Orbit Cloud initialization failed:", error);
        orbitCloudInitialized = true;
    }
}

let orbitCloudBooting = false;
let orbitCloudReady = false;

async function waitForOrbitCloudAuth() {
    const maxAttempts = 50;
    const delay = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const supabase = getOrbitSupabaseClient?.();
        if (supabase) return supabase;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
}

function syncOrbitCloudSidebar() {
    try {
        if (typeof refreshOrbitRecentChats === "function") {
            refreshOrbitRecentChats();
        }
    } catch (error) {
        console.warn("Orbit Cloud: sidebar refresh failed:", error);
    }
}

async function restoreOrbitActiveCloudChat() {
    try {
        const activeChatId = window.orbitActiveChatId || localStorage.getItem(ORBIT_ACTIVE_CHAT_KEY);
        if (!activeChatId) return false;

        const restored = await restoreOrbitCloudConversation(activeChatId);
        if (restored) syncOrbitCloudSidebar();
        return restored;
    } catch (error) {
        console.warn("Orbit Cloud: active chat restore failed:", error);
        return false;
    }
}

async function initializeOrbitCloudSystem() {
    if (orbitCloudReady) return true;
    if (orbitCloudBooting) return false;

    orbitCloudBooting = true;

    try {
        if (document.readyState === "loading") {
            await new Promise(resolve => {
                document.addEventListener("DOMContentLoaded", resolve, { once: true });
            });
        }

        const supabase = await waitForOrbitCloudAuth();
        if (!supabase) {
            console.warn("Orbit Cloud: Supabase was not available.");
            orbitCloudBooting = false;
            return false;
        }

        const session = await getOrbitAuthSession?.(true);
        setupOrbitCloudHistoryRestore();

        if (session?.user?.id) {
            ORBIT_USER_ID = String(session.user.id);
            await restoreOrbitCloudHistory();
            syncOrbitCloudSidebar();
            await restoreOrbitActiveCloudChat();
        }

        orbitCloudReady = true;
        window.orbitCloudReady = true;

        window.dispatchEvent(
            new CustomEvent("orbit:cloud-ready", {
                detail: {
                    authenticated: Boolean(session?.user?.id),
                    userId: session?.user?.id || null
                }
            })
        );

        console.log("Orbit Cloud: initialization complete.");
        return true;
    } catch (error) {
        console.error("Orbit Cloud: unified initialization failed:", error);
        window.orbitCloudReady = false;
        return false;
    } finally {
        orbitCloudBooting = false;
    }
}

// Lifecycle startup listeners
function startOrbitCloudSystem() {
    if (window.orbitCloudStartupStarted) return;
    window.orbitCloudStartupStarted = true;

    initializeOrbitCloud();
    initializeOrbitCloudSystem();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startOrbitCloudSystem, { once: true });
} else {
    startOrbitCloudSystem();
}