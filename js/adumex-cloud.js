"use strict";

/*
=========================================================
ORBIT AI — CLOUD STORAGE
=========================================================

Responsibilities:
- Supabase authentication/session handling
- Cloud conversations
- Cloud messages
- Active chat
- Local cloud-history cache
- Conversation restoration
- Cloud history deletion
- Sidebar synchronization

Does NOT manage:
- AI memory
- Settings
- Theme
- Chat UI styling
- AI responses

Those systems remain handled by their own files.
=========================================================
*/


/* =========================================================
   CONFIGURATION
========================================================= */

const ORBIT_CLOUD_CONVERSATIONS_TABLE =
    "conversations";

const ORBIT_CLOUD_MESSAGES_TABLE =
    "messages";

const ORBIT_CLOUD_CACHE_KEY =
    "orbit-cloud-history-cache";

const ORBIT_CLOUD_ACTIVE_CHAT_KEY =
    "orbit-cloud-active-chat";

const ORBIT_CLOUD_HISTORY_LIMIT = 50;

const ORBIT_CLOUD_MESSAGE_LIMIT = 200;


/* =========================================================
   INTERNAL STATE
========================================================= */

let orbitCloudInitialized = false;
let orbitCloudBooting = false;
let orbitCloudReady = false;
let orbitCloudUser = null;


/* =========================================================
   SUPABASE CLIENT
========================================================= */

function getOrbitCloudSupabase() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.from === "function"
    ) {
        return window.supabase;
    }

    return null;
}


/* =========================================================
   AUTHENTICATION
========================================================= */

async function getOrbitCloudSession() {

    const supabase =
        getOrbitCloudSupabase();

    if (
        !supabase ||
        !supabase.auth ||
        typeof supabase.auth.getSession !== "function"
    ) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();

        if (error) {

            console.warn(
                "Orbit Cloud session error:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.warn(
            "Orbit Cloud authentication error:",
            error
        );

        return null;
    }
}


async function getOrbitCloudUser() {

    const session =
        await getOrbitCloudSession();

    orbitCloudUser =
        session?.user || null;

    return orbitCloudUser;
}


async function getOrbitCloudToken() {

    const session =
        await getOrbitCloudSession();

    return session?.access_token || null;
}


function isOrbitCloudAuthenticated() {

    return Boolean(
        orbitCloudUser?.id
    );
}


/* =========================================================
   LOCAL ID
========================================================= */

function createOrbitCloudLocalId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return (
            "local-" +
            window.crypto.randomUUID()
        );
    }

    return (
        "local-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}


/* =========================================================
   MESSAGE NORMALIZATION
========================================================= */

function normalizeOrbitCloudMessage(
    message
) {

    if (!message) {
        return null;
    }

    const role =
        message.role === "user"
            ? "user"
            : message.role === "assistant"
                ? "assistant"
                : null;

    if (!role) {
        return null;
    }

    if (
        typeof message.content !==
        "string"
    ) {
        return null;
    }

    const content =
        message.content.trim();

    if (!content) {
        return null;
    }

    return {

        id:
            message.id
                ? String(message.id)
                : null,

        role,

        content,

        createdAt:
            message.createdAt ||
            message.created_at ||
            null
    };
}


function normalizeOrbitCloudMessages(
    messages
) {

    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .map(normalizeOrbitCloudMessage)
        .filter(Boolean)
        .slice(
            -ORBIT_CLOUD_MESSAGE_LIMIT
        );
}


/* =========================================================
   CONVERSATION NORMALIZATION
========================================================= */

function normalizeOrbitCloudConversation(
    conversation
) {

    if (!conversation) {
        return null;
    }

    if (!conversation.id) {
        return null;
    }

    return {

        id:
            String(conversation.id),

        title:
            String(
                conversation.title ||
                "New chat"
            ).trim(),

        message:
            String(
                conversation.message ||
                ""
            ).trim(),

        messages:
            normalizeOrbitCloudMessages(
                conversation.messages
            ),

        createdAt:
            conversation.createdAt ||
            conversation.created_at ||
            null,

        updatedAt:
            conversation.updatedAt ||
            conversation.updated_at ||
            null
    };
}


/* =========================================================
   LOCAL CLOUD CACHE
========================================================= */

function loadOrbitCloudCache() {

    try {

        const saved =
            localStorage.getItem(
                ORBIT_CLOUD_CACHE_KEY
            );

        if (!saved) {
            return [];
        }

        const parsed =
            JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map(
                normalizeOrbitCloudConversation
            )
            .filter(Boolean)
            .slice(
                0,
                ORBIT_CLOUD_HISTORY_LIMIT
            );

    } catch (error) {

        console.warn(
            "Orbit Cloud cache load failed:",
            error
        );

        return [];
    }
}


function saveOrbitCloudCache(
    conversations
) {

    try {

        const normalized =
            Array.isArray(conversations)

                ? conversations
                    .map(
                        normalizeOrbitCloudConversation
                    )
                    .filter(Boolean)
                    .slice(
                        0,
                        ORBIT_CLOUD_HISTORY_LIMIT
                    )

                : [];

        localStorage.setItem(
            ORBIT_CLOUD_CACHE_KEY,
            JSON.stringify(normalized)
        );

        return normalized;

    } catch (error) {

        console.warn(
            "Orbit Cloud cache save failed:",
            error
        );

        return [];
    }
}


function clearOrbitCloudCache() {

    try {

        localStorage.removeItem(
            ORBIT_CLOUD_CACHE_KEY
        );

    } catch (error) {

        console.warn(
            "Orbit Cloud cache clear failed:",
            error
        );
    }
}


/* =========================================================
   ACTIVE CHAT
========================================================= */

function setOrbitCloudActiveChat(
    conversationId
) {

    try {

        if (conversationId) {

            localStorage.setItem(
                ORBIT_CLOUD_ACTIVE_CHAT_KEY,
                String(conversationId)
            );

        } else {

            localStorage.removeItem(
                ORBIT_CLOUD_ACTIVE_CHAT_KEY
            );
        }

    } catch (error) {

        console.warn(
            "Orbit Cloud active chat error:",
            error
        );
    }
}


function getOrbitCloudActiveChat() {

    try {

        return (
            localStorage.getItem(
                ORBIT_CLOUD_ACTIVE_CHAT_KEY
            ) || null
        );

    } catch {

        return null;
    }
}


/* =========================================================
   CREATE CONVERSATION
========================================================= */

async function createOrbitCloudConversation(
    title = "New chat"
) {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (!supabase || !user) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_CONVERSATIONS_TABLE
            )

            .insert({

                user_id:
                    user.id,

                title:
                    String(
                        title ||
                        "New chat"
                    )
                        .trim()
                        .slice(0, 120)
            })

            .select(
                "id, user_id, title, created_at, updated_at"
            )

            .single();

        if (error) {

            console.error(
                "Orbit Cloud conversation creation failed:",
                error
            );

            return null;
        }

        const conversation =
            normalizeOrbitCloudConversation(
                data
            );

        if (conversation?.id) {

            setOrbitCloudActiveChat(
                conversation.id
            );
        }

        return conversation;

    } catch (error) {

        console.error(
            "Orbit Cloud conversation error:",
            error
        );

        return null;
    }
}


/* =========================================================
   UPDATE CONVERSATION
========================================================= */

async function updateOrbitCloudConversation(
    conversationId,
    updates = {}
) {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (
        !supabase ||
        !user ||
        !conversationId
    ) {
        return null;
    }

    const payload = {};

    if (
        typeof updates.title ===
            "string" &&
        updates.title.trim()
    ) {

        payload.title =
            updates.title
                .trim()
                .slice(0, 120);
    }

    if (
        typeof updates.message ===
        "string"
    ) {

        payload.message =
            updates.message
                .trim()
                .slice(0, 500);
    }

    if (
        !Object.keys(payload).length
    ) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_CONVERSATIONS_TABLE
            )

            .update(payload)

            .eq(
                "id",
                conversationId
            )

            .eq(
                "user_id",
                user.id
            )

            .select(
                "id, user_id, title, created_at, updated_at"
            )

            .single();

        if (error) {

            console.error(
                "Orbit Cloud conversation update failed:",
                error
            );

            return null;
        }

        return normalizeOrbitCloudConversation(
            data
        );

    } catch (error) {

        console.error(
            "Orbit Cloud conversation update error:",
            error
        );

        return null;
    }
}


/* =========================================================
   SAVE MESSAGE
========================================================= */

async function saveOrbitCloudMessage(
    conversationId,
    role,
    content
) {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (
        !supabase ||
        !user ||
        !conversationId
    ) {
        return null;
    }

    const cleanRole =
        role === "user"
            ? "user"
            : role === "assistant"
                ? "assistant"
                : null;

    const cleanContent =
        typeof content === "string"
            ? content.trim()
            : "";

    if (
        !cleanRole ||
        !cleanContent
    ) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_MESSAGES_TABLE
            )

            .insert({

                conversation_id:
                    conversationId,

                user_id:
                    user.id,

                role:
                    cleanRole,

                content:
                    cleanContent
            })

            .select(
                "id, conversation_id, user_id, role, content, created_at"
            )

            .single();

        if (error) {

            console.error(
                "Orbit Cloud message save failed:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Orbit Cloud message error:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD CONVERSATIONS
========================================================= */

async function loadOrbitCloudConversations() {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (!supabase || !user) {
        return [];
    }

    try {

        const {
            data,
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_CONVERSATIONS_TABLE
            )

            .select(
                "id, user_id, title, created_at, updated_at"
            )

            .eq(
                "user_id",
                user.id
            )

            .order(
                "updated_at",
                {
                    ascending: false
                }
            )

            .limit(
                ORBIT_CLOUD_HISTORY_LIMIT
            );

        if (error) {

            console.error(
                "Orbit Cloud history load failed:",
                error
            );

            return [];
        }

        return Array.isArray(data)

            ? data
                .map(
                    normalizeOrbitCloudConversation
                )
                .filter(Boolean)

            : [];

    } catch (error) {

        console.error(
            "Orbit Cloud history error:",
            error
        );

        return [];
    }
}


/* =========================================================
   LOAD MESSAGES
========================================================= */

async function loadOrbitCloudMessages(
    conversationId
) {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (
        !supabase ||
        !user ||
        !conversationId
    ) {
        return [];
    }

    try {

        const {
            data,
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_MESSAGES_TABLE
            )

            .select(
                "id, conversation_id, user_id, role, content, created_at"
            )

            .eq(
                "conversation_id",
                conversationId
            )

            .eq(
                "user_id",
                user.id
            )

            .order(
                "created_at",
                {
                    ascending: true
                }
            )

            .limit(
                ORBIT_CLOUD_MESSAGE_LIMIT
            );

        if (error) {

            console.error(
                "Orbit Cloud messages load failed:",
                error
            );

            return [];
        }

        return normalizeOrbitCloudMessages(
            data
        );

    } catch (error) {

        console.error(
            "Orbit Cloud messages error:",
            error
        );

        return [];
    }
}


/* =========================================================
   CACHE GETTERS
========================================================= */

async function getOrbitCachedConversations() {

    return loadOrbitCloudCache();
}


async function getOrbitCachedMessages(
    conversationId
) {

    const conversations =
        loadOrbitCloudCache();

    const conversation =
        conversations.find(
            item =>
                String(item.id) ===
                String(conversationId)
        );

    return (
        conversation?.messages ||
        []
    );
}


/* =========================================================
   SYNC HISTORY
========================================================= */

async function syncOrbitCloudHistory() {

    const user =
        await getOrbitCloudUser();

    if (!user) {
        return [];
    }

    const cloudConversations =
        await loadOrbitCloudConversations();

    const cachedConversations =
        loadOrbitCloudCache();

    const merged =
        cloudConversations.map(
            cloudConversation => {

                const cached =
                    cachedConversations.find(
                        item =>
                            String(item.id) ===
                            String(
                                cloudConversation.id
                            )
                    );

                return {

                    ...cloudConversation,

                    message:
                        cached?.message ||
                        "",

                    messages:
                        cached?.messages ||
                        []
                };
            }
        );

    saveOrbitCloudCache(
        merged
    );

    syncOrbitCloudSidebar();

    return merged;
}


/* =========================================================
   SYNC ONE CONVERSATION
========================================================= */

async function syncOrbitCloudConversation(
    conversationId
) {

    if (!conversationId) {
        return null;
    }

    const messages =
        await loadOrbitCloudMessages(
            conversationId
        );

    const conversations =
        loadOrbitCloudCache();

    const index =
        conversations.findIndex(
            conversation =>
                String(
                    conversation.id
                ) ===
                String(
                    conversationId
                )
        );

    if (index >= 0) {

        conversations[index].messages =
            messages;

        conversations[index].updatedAt =
            Date.now();

        saveOrbitCloudCache(
            conversations
        );
    }

    return messages;
}


/* =========================================================
   DELETE CONVERSATION
========================================================= */

async function deleteOrbitCloudConversation(
    conversationId
) {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (
        !supabase ||
        !user ||
        !conversationId
    ) {
        return false;
    }

    try {

        const {
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_CONVERSATIONS_TABLE
            )

            .delete()

            .eq(
                "id",
                conversationId
            )

            .eq(
                "user_id",
                user.id
            );

        if (error) {

            console.error(
                "Orbit Cloud conversation delete failed:",
                error
            );

            return false;
        }

        const cached =
            loadOrbitCloudCache();

        saveOrbitCloudCache(
            cached.filter(
                conversation =>
                    String(
                        conversation.id
                    ) !==
                    String(
                        conversationId
                    )
            )
        );

        if (
            String(
                getOrbitCloudActiveChat()
            ) ===
            String(
                conversationId
            )
        ) {

            setOrbitCloudActiveChat(
                null
            );
        }

        syncOrbitCloudSidebar();

        return true;

    } catch (error) {

        console.error(
            "Orbit Cloud delete error:",
            error
        );

        return false;
    }
}


/* =========================================================
   CLEAR ALL HISTORY
========================================================= */

async function clearOrbitCloudHistory() {

    const supabase =
        getOrbitCloudSupabase();

    const user =
        await getOrbitCloudUser();

    if (
        !supabase ||
        !user?.id
    ) {
        return false;
    }

    try {

        const {
            error
        } = await supabase

            .from(
                ORBIT_CLOUD_MESSAGES_TABLE
            )

            .delete()

            .eq(
                "user_id",
                user.id
            );

        if (error) {

            console.error(
                "Orbit Cloud messages clear failed:",
                error
            );

            return false;
        }


        const {
            error:
                conversationError
        } = await supabase

            .from(
                ORBIT_CLOUD_CONVERSATIONS_TABLE
            )

            .delete()

            .eq(
                "user_id",
                user.id
            );

        if (conversationError) {

            console.error(
                "Orbit Cloud conversations clear failed:",
                conversationError
            );

            return false;
        }


        clearOrbitCloudCache();

        setOrbitCloudActiveChat(
            null
        );


        /*
        Clear local Orbit conversation
        if that system exists.
        */

        if (
            typeof window
                .clearOrbitConversationStorage ===
            "function"
        ) {

            window.clearOrbitConversationStorage();
        }


        if (
            typeof window
                .clearOrbitConversationHistory ===
            "function"
        ) {

            /*
            Avoid calling the same function
            recursively through OrbitCloud.
            */

            if (
                window.clearOrbitConversationHistory !==
                clearOrbitCloudHistory
            ) {
                window.clearOrbitConversationHistory();
            }
        }


        syncOrbitCloudSidebar();

        return true;

    } catch (error) {

        console.error(
            "Orbit Cloud history clear failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   SIDEBAR SYNC
========================================================= */

function syncOrbitCloudSidebar() {

    try {

        if (
            typeof window
                .refreshOrbitRecentChats ===
            "function"
        ) {

            window.refreshOrbitRecentChats();
        }

    } catch (error) {

        console.warn(
            "Orbit Cloud sidebar refresh failed:",
            error
        );
    }
}


/* =========================================================
   RESTORE CONVERSATION
========================================================= */

async function restoreOrbitCloudConversation(
    conversationId
) {

    if (!conversationId) {
        return false;
    }

    try {

        const messages =
            await loadOrbitCloudMessages(
                conversationId
            );

        if (!Array.isArray(messages)) {
            return false;
        }


        /*
        Restore temporary Orbit conversation
        when the conversation system exposes it.
        */

        const normalizedMessages =
            messages.map(
                message => ({
                    role:
                        message.role,

                    content:
                        message.content
                })
            );


        if (
            typeof window
                .setOrbitConversation ===
            "function"
        ) {

            window.setOrbitConversation(
                normalizedMessages
            );
        }


        setOrbitCloudActiveChat(
            conversationId
        );


        /*
        Restore into the chat UI when
        the required Orbit UI functions exist.
        */

        if (
            typeof window
                .getOrbitElements ===
            "function"
        ) {

            const {
                chatWindow
            } =
                window.getOrbitElements();


            if (chatWindow) {

                chatWindow.innerHTML =
                    "";


                let conversationGroup =
                    null;


                if (
                    typeof window
                        .createOrbitConversationGroup ===
                    "function"
                ) {

                    conversationGroup =
                        window.createOrbitConversationGroup();

                } else {

                    conversationGroup =
                        document.createElement(
                            "div"
                        );

                    conversationGroup.className =
                        "conversation-group";
                }


                chatWindow.appendChild(
                    conversationGroup
                );


                normalizedMessages.forEach(
                    message => {

                        if (
                            typeof window
                                .addOrbitMessage ===
                            "function"
                        ) {

                            window.addOrbitMessage(
                                message.content,
                                message.role,
                                conversationGroup
                            );
                        }
                    }
                );


                const chatIntro =
                    document.getElementById(
                        "chat-intro"
                    );

                if (chatIntro) {

                    chatIntro.classList.add(
                        "is-hidden"
                    );
                }


                if (
                    typeof window
                        .scrollOrbitChat ===
                    "function"
                ) {

                    window.scrollOrbitChat(
                        "auto"
                    );
                }
            }
        }


        return true;

    } catch (error) {

        console.error(
            "Orbit Cloud conversation restore failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   RESTORE ACTIVE CHAT
========================================================= */

async function restoreOrbitActiveCloudChat() {

    try {

        const activeChatId =
            getOrbitCloudActiveChat();

        if (!activeChatId) {
            return false;
        }

        const restored =
            await restoreOrbitCloudConversation(
                activeChatId
            );

        if (restored) {

            syncOrbitCloudSidebar();
        }

        return restored;

    } catch (error) {

        console.warn(
            "Orbit Cloud active chat restore failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   AUTH CHANGE
========================================================= */

async function handleOrbitCloudAuthChange(
    session
) {

    const newUser =
        session?.user || null;

    const previousUserId =
        orbitCloudUser?.id || null;

    const newUserId =
        newUser?.id || null;

    orbitCloudUser =
        newUser;


    /*
    If the account changed, never allow
    the previous user's cache to remain.
    */

    if (
        previousUserId !==
        newUserId
    ) {

        clearOrbitCloudCache();

        setOrbitCloudActiveChat(
            null
        );
    }


    if (newUser) {

        await syncOrbitCloudHistory();

        await restoreOrbitActiveCloudChat();
    }
}


/* =========================================================
   WAIT FOR SUPABASE
========================================================= */

async function waitForOrbitCloudAuth() {

    const maxAttempts = 50;

    const delay = 100;


    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {

        const supabase =
            getOrbitCloudSupabase();

        if (supabase) {
            return supabase;
        }

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    delay
                )
        );
    }

    return null;
}


/* =========================================================
   AUTH LISTENER
========================================================= */

function setupOrbitCloudAuthListener(
    supabase
) {

    if (
        !supabase ||
        !supabase.auth ||
        typeof supabase.auth.onAuthStateChange !==
            "function"
    ) {
        return;
    }


    if (
        document.documentElement.dataset
            .orbitCloudAuthListenerReady ===
        "true"
    ) {
        return;
    }


    document.documentElement.dataset
        .orbitCloudAuthListenerReady =
        "true";


    try {

        supabase.auth.onAuthStateChange(
            (
                event,
                session
            ) => {

                Promise.resolve(
                    handleOrbitCloudAuthChange(
                        session
                    )
                ).catch(
                    error => {

                        console.error(
                            "Orbit Cloud auth sync error:",
                            error
                        );
                    }
                );
            }
        );

    } catch (error) {

        console.warn(
            "Orbit Cloud auth listener error:",
            error
        );
    }
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeOrbitCloud() {

    if (orbitCloudInitialized) {
        return;
    }

    const supabase =
        getOrbitCloudSupabase();

    if (!supabase) {

        console.warn(
            "Orbit Cloud: Supabase client not found."
        );

        orbitCloudInitialized =
            true;

        return;
    }


    try {

        const session =
            await getOrbitCloudSession();

        orbitCloudUser =
            session?.user || null;


        setupOrbitCloudAuthListener(
            supabase
        );


        if (orbitCloudUser) {

            await syncOrbitCloudHistory();

            await restoreOrbitActiveCloudChat();
        }


        orbitCloudInitialized =
            true;


        console.log(
            "Orbit Cloud initialized."
        );

    } catch (error) {

        console.error(
            "Orbit Cloud initialization failed:",
            error
        );

        orbitCloudInitialized =
            true;
    }
}


/* =========================================================
   FULL CLOUD SYSTEM INITIALIZATION
========================================================= */

async function initializeOrbitCloudSystem() {

    if (orbitCloudReady) {
        return true;
    }

    if (orbitCloudBooting) {
        return false;
    }

    orbitCloudBooting =
        true;


    try {

        const supabase =
            await waitForOrbitCloudAuth();


        if (!supabase) {

            console.warn(
                "Orbit Cloud: Supabase was not available."
            );

            return false;
        }


        await initializeOrbitCloud();


        orbitCloudReady =
            true;

        window.orbitCloudReady =
            true;


        const session =
            await getOrbitCloudSession();


        window.dispatchEvent(
            new CustomEvent(
                "orbit:cloud-ready",
                {
                    detail: {

                        authenticated:
                            Boolean(
                                session?.user?.id
                            ),

                        userId:
                            session?.user?.id ||
                            null
                    }
                }
            )
        );


        console.log(
            "Orbit Cloud: initialization complete."
        );


        return true;

    } catch (error) {

        console.error(
            "Orbit Cloud initialization failed:",
            error
        );

        window.orbitCloudReady =
            false;

        return false;

    } finally {

        orbitCloudBooting =
            false;
    }
}


/* =========================================================
   PUBLIC API
========================================================= */

window.OrbitCloud = {

    initialize:
        initializeOrbitCloudSystem,

    getSession:
        getOrbitCloudSession,

    getUser:
        getOrbitCloudUser,

    getToken:
        getOrbitCloudToken,

    isAuthenticated:
        isOrbitCloudAuthenticated,

    createConversation:
        createOrbitCloudConversation,

    updateConversation:
        updateOrbitCloudConversation,

    saveMessage:
        saveOrbitCloudMessage,

    loadConversations:
        loadOrbitCloudConversations,

    loadMessages:
        loadOrbitCloudMessages,

    deleteConversation:
        deleteOrbitCloudConversation,

    clearHistory:
        clearOrbitCloudHistory,

    syncHistory:
        syncOrbitCloudHistory,

    syncConversation:
        syncOrbitCloudConversation,

    restoreConversation:
        restoreOrbitCloudConversation,

    restoreActiveChat:
        restoreOrbitActiveCloudChat,

    getCachedConversations:
        getOrbitCachedConversations,

    getCachedMessages:
        getOrbitCachedMessages,

    getActiveChat:
        getOrbitCloudActiveChat,

    setActiveChat:
        setOrbitCloudActiveChat,

    clearCache:
        clearOrbitCloudCache,

    createLocalId:
        createOrbitCloudLocalId
};


/* =========================================================
   STARTUP
========================================================= */

function startOrbitCloudSystem() {

    if (
        window.orbitCloudStartupStarted
    ) {
        return;
    }

    window.orbitCloudStartupStarted =
        true;


    initializeOrbitCloudSystem()
        .catch(error => {

            console.error(
                "Orbit Cloud startup error:",
                error
            );
        });
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startOrbitCloudSystem,
        {
            once: true
        }
    );

} else {

    startOrbitCloudSystem();
}