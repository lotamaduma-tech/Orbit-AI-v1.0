"use strict";

/* =========================================================
   ORBIT AI — CHAT ENGINE
   ========================================================= */

const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";

const ORBIT_FALLBACK_API_URL =
    window.ORBIT_FALLBACK_API_URL || "";

const ORBIT_HISTORY_LIMIT = 40;
const ORBIT_MEMORY_LIMIT = 100;
const ORBIT_REQUEST_TIMEOUT = 120000;
const ORBIT_MAX_TOKENS = 8192;
const ORBIT_MAX_CONTEXT_CHARS = 120000;
const ORBIT_RENDER_INTERVAL = 32;

const ORBIT_USER_ID_KEY = "orbit-user-id";
const ORBIT_MEMORY_CACHE_KEY = "orbit-memory-cache";
const ORBIT_RECENT_CHATS_KEY = "orbit-recent-chats";
const ORBIT_CHAT_PREFIX = "orbit-chat-";
const ORBIT_ACTIVE_CHAT_KEY = "orbit-active-chat";

/*
 * IMPORTANT:
 * Conversations are still saved to sidebar history.
 *
 * However, the active conversation is NOT automatically restored
 * into the main AI chat area after a page refresh.
 *
 * A user must intentionally click a history item to reopen it.
 */

const ORBIT_SYSTEM_PROMPT = `
You are Orbit AI, a highly capable general-purpose AI assistant.

Your strongest specialization is software engineering, programming,
debugging, architecture, web development, frontend development,
backend development, databases, APIs, authentication, deployment,
performance optimization, and technical problem solving.

GENERAL BEHAVIOR:

- Understand the user's actual goal before answering.
- Answer naturally and conversationally.
- Be accurate, practical, and direct.
- Maintain conversation context.
- Never invent information.
- If the user provides code, inspect it carefully before suggesting changes.
- Do not unnecessarily rewrite working code.
- When asked to modify a project, preserve the existing architecture unless a change is necessary.

CODING:

- Treat programming as a primary specialization.
- Be especially strong with HTML, CSS, JavaScript, Node.js, Express, APIs,
  databases, authentication, Supabase, GitHub, deployment and debugging.
- Handle large codebases carefully.
- When providing replacement code, provide complete working sections.
- Explain important changes clearly.
- Keep code secure, maintainable, readable and performant.
- Never intentionally remove existing functionality without explaining why.

FORMATTING:

- Use Markdown when useful.
- Always use fenced code blocks for code.
- Use Markdown tables for structured tabular information.
- Use normal clickable Markdown links where appropriate.
- Keep responses readable.
`;


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let orbitConversationHistory = [];
let orbitUserMemory = [];

let orbitIsWaiting = false;
let orbitInitialized = false;

let orbitAuthSessionCache = null;
let orbitAuthSessionCacheTime = 0;

let orbitStreamBuffer = "";
let orbitStreamRenderTimer = null;


/* =========================================================
   USER IDENTITY
   ========================================================= */

function getOrbitUserId() {
    try {
        let userId = localStorage.getItem(
            ORBIT_USER_ID_KEY
        );

        if (userId) {
            return userId;
        }

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            userId = window.crypto.randomUUID();
        } else {
            userId =
                "orbit-" +
                Date.now().toString(36) +
                "-" +
                Math.random().toString(36).slice(2, 12);
        }

        localStorage.setItem(
            ORBIT_USER_ID_KEY,
            userId
        );

        return userId;
    } catch {
        return "orbit-temporary-" + Date.now();
    }
}

let ORBIT_USER_ID = getOrbitUserId();


/* =========================================================
   SUPABASE AUTHENTICATION
   ========================================================= */

function getOrbitSupabaseClient() {
    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth?.getSession === "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.auth?.getSession === "function"
    ) {
        return window.supabase;
    }

    return null;
}

async function getOrbitAuthSession(forceRefresh = false) {
    const now = Date.now();

    if (
        !forceRefresh &&
        orbitAuthSessionCache &&
        now - orbitAuthSessionCacheTime < 5000
    ) {
        return orbitAuthSessionCache;
    }

    const supabase = getOrbitSupabaseClient();

    if (!supabase) {
        return null;
    }

    try {
        const { data, error } =
            await supabase.auth.getSession();

        if (error) {
            return null;
        }

        orbitAuthSessionCache =
            data?.session || null;

        orbitAuthSessionCacheTime = now;

        return orbitAuthSessionCache;
    } catch {
        return null;
    }
}

async function getOrbitAuthToken() {
    const session =
        await getOrbitAuthSession();

    return session?.access_token || null;
}

async function syncOrbitAuthenticatedUser() {
    const session =
        await getOrbitAuthSession();

    if (session?.user?.id) {
        ORBIT_USER_ID =
            String(session.user.id);
    }

    return session;
}

async function logoutOrbitUser() {
    const supabase =
        getOrbitSupabaseClient();

    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
    } catch { }

    localStorage.removeItem(
        ORBIT_USER_ID_KEY
    );

    orbitAuthSessionCache = null;

    clearOrbitConversation();
}


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

function getOrbitElements() {
    return {
        chatWindow:
            document.getElementById("chat-window"),

        commandInput:
            document.getElementById("command-input"),

        sendButton:
            document.getElementById("send-btn"),

        commandForm:
            document.getElementById("command-form") ||
            document.querySelector(".command-area form") ||
            document.querySelector(".command-box form")
    };
}


/* =========================================================
   INPUT / TYPING MANAGEMENT
   ========================================================= */

function clearOrbitInput() {
    const { commandInput } =
        getOrbitElements();

    if (!commandInput) {
        return;
    }

    commandInput.value = "";

    triggerOrbitInputUpdate();
}

function focusOrbitInput() {
    const { commandInput } =
        getOrbitElements();

    if (
        !commandInput ||
        commandInput.disabled
    ) {
        return;
    }

    requestAnimationFrame(() => {
        try {
            commandInput.focus({
                preventScroll: true
            });
        } catch {
            commandInput.focus();
        }
    });
}

function triggerOrbitInputUpdate() {
    const { commandInput } =
        getOrbitElements();

    if (!commandInput) {
        return;
    }

    commandInput.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );
}

/*
 * Keeps the send button synchronized with
 * whatever the user is typing.
 */
function updateOrbitTypingState() {
    const {
        commandInput,
        sendButton
    } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    const hasText =
        String(commandInput.value || "").trim().length > 0;

    if (sendButton) {
        sendButton.disabled =
            orbitIsWaiting || !hasText;
    }

    commandInput.classList.toggle(
        "is-typing",
        hasText
    );
}

function insertOrbitTypedCharacter(character) {
    const { commandInput } =
        getOrbitElements();

    if (
        !commandInput ||
        commandInput.disabled
    ) {
        return;
    }

    const value =
        commandInput.value;

    const start =
        typeof commandInput.selectionStart === "number"
            ? commandInput.selectionStart
            : value.length;

    const end =
        typeof commandInput.selectionEnd === "number"
            ? commandInput.selectionEnd
            : value.length;

    commandInput.value =
        value.slice(0, start) +
        character +
        value.slice(end);

    const position =
        start + character.length;

    try {
        commandInput.setSelectionRange(
            position,
            position
        );
    } catch { }

    triggerOrbitInputUpdate();
    updateOrbitTypingState();
}


/* =========================================================
   CHAT SCROLLING
   ========================================================= */

function scrollOrbitChat(
    behavior = "auto"
) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    requestAnimationFrame(() => {
        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior
        });
    });
}

/*
 * Scrolls the response to the START of Orbit's
 * response instead of automatically jumping
 * to the very bottom.
 */
function scrollToOrbitResponse(
    row,
    behavior = "smooth"
) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow || !row) {
        return;
    }

    requestAnimationFrame(() => {
        const containerRect =
            chatWindow.getBoundingClientRect();

        const rowRect =
            row.getBoundingClientRect();

        const target =
            chatWindow.scrollTop +
            rowRect.top -
            containerRect.top -
            18;

        chatWindow.scrollTo({
            top: Math.max(0, target),
            behavior
        });
    });
}


/*
 * When a response begins, position the screen
 * at the beginning of that response.
 */
function scrollToBeginningOfOrbitResponse(
    row,
    behavior = "smooth"
) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow || !row) {
        return;
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const containerRect =
                chatWindow.getBoundingClientRect();

            const rowRect =
                row.getBoundingClientRect();

            const target =
                chatWindow.scrollTop +
                rowRect.top -
                containerRect.top -
                18;

            chatWindow.scrollTo({
                top: Math.max(0, target),
                behavior
            });
        });
    });
}


/* =========================================================
   TYPING INDICATOR
   ========================================================= */

function showOrbitTypingIndicator() {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    hideOrbitTypingIndicator();

    const row =
        document.createElement("div");

    row.id = "orbit-typing";
    row.className =
        "message-row orbit typing-row";

    row.innerHTML = `
        <div
            class="message orbit typing-message"
            role="status"
            aria-label="Orbit is typing"
        >
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
    document
        .getElementById("orbit-typing")
        ?.remove();
}


/* =========================================================
   QUICK PROMPTS
   ========================================================= */

function hideOrbitQuickPrompts() {
    [
        ".quick-prompts",
        ".quick-prompt-container",
        ".suggestion-prompts"
    ].forEach(selector => {
        document
            .querySelectorAll(selector)
            .forEach(element => {
                element.classList.add(
                    "is-hidden"
                );
            });
    });
}

function showOrbitQuickPrompts() {
    [
        ".quick-prompts",
        ".quick-prompt-container",
        ".suggestion-prompts"
    ].forEach(selector => {
        document
            .querySelectorAll(selector)
            .forEach(element => {
                element.classList.remove(
                    "is-hidden"
                );
            });
    });
}


/* =========================================================
   MEMORY
   ========================================================= */

function loadOrbitMemory() {
    try {
        const saved =
            localStorage.getItem(
                ORBIT_MEMORY_CACHE_KEY
            );

        if (!saved) {
            orbitUserMemory = [];
            return;
        }

        const parsed =
            JSON.parse(saved);

        orbitUserMemory =
            Array.isArray(parsed)
                ? parsed
                    .filter(
                        item =>
                            typeof item === "string" &&
                            item.trim()
                    )
                    .slice(-ORBIT_MEMORY_LIMIT)
                : [];
    } catch {
        orbitUserMemory = [];
    }
}

function saveOrbitMemoryCache() {
    try {
        localStorage.setItem(
            ORBIT_MEMORY_CACHE_KEY,
            JSON.stringify(
                orbitUserMemory
            )
        );
    } catch { }
}

function rememberOrbitDetail(detail) {
    if (!detail) {
        return;
    }

    const cleanDetail =
        String(detail).trim();

    if (!cleanDetail) {
        return;
    }

    const exists =
        orbitUserMemory.some(
            item =>
                item.toLowerCase() ===
                cleanDetail.toLowerCase()
        );

    if (exists) {
        return;
    }

    orbitUserMemory.push(
        cleanDetail
    );

    orbitUserMemory =
        orbitUserMemory.slice(
            -ORBIT_MEMORY_LIMIT
        );

    saveOrbitMemoryCache();
}

function detectOrbitMemory(message) {
    if (!message) {
        return;
    }

    const text =
        String(message).trim();

    const nameMatch =
        text.match(
            /(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i
        );

    if (nameMatch) {
        rememberOrbitDetail(
            `The user's name is ${nameMatch[1].trim()}.`
        );
    }

    const projectMatch =
        text.match(
            /(?:i am working on|i'm working on|i am building|my project is)\s+(.+)/i
        );

    if (projectMatch) {
        rememberOrbitDetail(
            `The user is working on: ${projectMatch[1].trim()}`
        );
    }
}

function getOrbitMemoryContext() {
    return orbitUserMemory.length
        ? orbitUserMemory.join("\n")
        : "";
}


/* =========================================================
   SECURITY / VALIDATION
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
    return (
        typeof message === "string" &&
        message.trim().length > 0
    );
}

function escapeAttribute(value) {
    return sanitizeMessage(value);
}


/* =========================================================
   CODE BLOCK RENDERING
   ========================================================= */

function createOrbitCodeHTML(
    language,
    code
) {
    const safeLanguage =
        language?.trim().toLowerCase() ||
        "text";

    const displayLanguage =
        safeLanguage === "text"
            ? "CODE"
            : safeLanguage.toUpperCase();

    return `
        <div
            class="orbit-code-wrapper orbit-code-container"
            data-orbit-code-block
            data-language="${escapeAttribute(
        safeLanguage
    )}"
        >
            <div class="orbit-code-toolbar orbit-code-header">
                <span class="orbit-code-language">
                    ${sanitizeMessage(
        displayLanguage
    )}
                </span>

                <button
                    type="button"
                    class="orbit-code-copy orbit-copy-btn"
                    data-orbit-copy-code
                    title="Copy code"
                >
                    Copy
                </button>
            </div>

            <pre class="orbit-code-block">
                <code class="language-${escapeAttribute(
        safeLanguage
    )}">${sanitizeMessage(code)}</code>
            </pre>
        </div>
    `;
}


/* =========================================================
   MARKDOWN TABLES
   ========================================================= */

function parseMarkdownTable(lines) {
    if (lines.length < 2) {
        return null;
    }

    const separator =
        /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;

    if (!separator.test(lines[1])) {
        return null;
    }

    const parseRow = line =>
        line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(cell => cell.trim());

    const headers =
        parseRow(lines[0]);

    const rows =
        lines
            .slice(2)
            .map(parseRow);

    let html = `
        <div class="orbit-table-wrapper">
            <table class="orbit-table">
                <thead>
                    <tr>
    `;

    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });

    html += `
                    </tr>
                </thead>
                <tbody>
    `;

    rows.forEach(row => {
        html += "<tr>";

        headers.forEach((_, index) => {
            html += `<td>${row[index] || ""}</td>`;
        });

        html += "</tr>";
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}


/* =========================================================
   INLINE MARKDOWN
   ========================================================= */

function renderInlineMarkdown(text) {
    let result = text;

    result = result.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_, label, url) => {
            return `
                <a
                    href="${escapeAttribute(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >${label}</a>
            `;
        }
    );

    result = result.replace(
        /(^|[\s(])(https?:\/\/[^\s<]+)/g,
        (_, prefix, url) => {
            const cleanUrl =
                url.replace(
                    /[.,!?;:]+$/,
                    ""
                );

            return `${prefix}
                <a
                    href="${escapeAttribute(cleanUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >${sanitizeMessage(cleanUrl)}</a>
            `;
        }
    );

    result = result.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    result = result.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );

    result = result.replace(
        /(^|[^\*])\*([^\*\n]+)\*(?!\*)/gm,
        "$1<em>$2</em>"
    );

    return result;
}


/* =========================================================
   MARKDOWN RENDERER
   ========================================================= */

function renderMarkdown(text) {
    if (!text) {
        return "";
    }

    let source =
        String(text).replace(
            /\r\n/g,
            "\n"
        );

    const codeBlocks = [];

    source = source.replace(
        /```([a-zA-Z0-9_+#.-]*)\n?([\s\S]*?)```/g,
        (_, language, code) => {
            const placeholder =
                `@@ORBIT_CODE_${codeBlocks.length}@@`;

            codeBlocks.push(
                createOrbitCodeHTML(
                    language || "text",
                    code
                        .replace(/^\n/, "")
                        .replace(/\n$/, "")
                )
            );

            return placeholder;
        }
    );

    source =
        sanitizeMessage(source);

    const lines =
        source.split("\n");

    let output = "";
    let tableLines = [];

    const flushTable = () => {
        if (!tableLines.length) {
            return;
        }

        const table =
            parseMarkdownTable(
                tableLines
            );

        if (table) {
            output += table;
        } else {
            output += tableLines
                .map(line =>
                    renderInlineMarkdown(line)
                )
                .join("<br>");
        }

        tableLines = [];
    };

    lines.forEach(line => {
        if (line.includes("|")) {
            tableLines.push(line);
            return;
        }

        flushTable();

        if (/^###\s+/.test(line)) {
            output += `
                <h4>
                    ${renderInlineMarkdown(
                line.replace(
                    /^###\s+/,
                    ""
                )
            )}
                </h4>
            `;
            return;
        }

        if (/^##\s+/.test(line)) {
            output += `
                <h3>
                    ${renderInlineMarkdown(
                line.replace(
                    /^##\s+/,
                    ""
                )
            )}
                </h3>
            `;
            return;
        }

        if (/^#\s+/.test(line)) {
            output += `
                <h2>
                    ${renderInlineMarkdown(
                line.replace(
                    /^#\s+/,
                    ""
                )
            )}
                </h2>
            `;
            return;
        }

        if (/^\s*[-*]\s+/.test(line)) {
            output += `
                <div class="orbit-list-item">
                    • ${renderInlineMarkdown(
                line.replace(
                    /^\s*[-*]\s+/,
                    ""
                )
            )}
                </div>
            `;
            return;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            output += `
                <div class="orbit-list-item">
                    ${renderInlineMarkdown(line)}
                </div>
            `;
            return;
        }

        if (!line.trim()) {
            output += "<br>";
            return;
        }

        output +=
            `${renderInlineMarkdown(line)}<br>`;
    });

    flushTable();

    codeBlocks.forEach(
        (codeHTML, index) => {
            output =
                output.replace(
                    `@@ORBIT_CODE_${index}@@`,
                    codeHTML
                );
        }
    );

    return output.replace(
        /(<br>){3,}/g,
        "<br><br>"
    );
}


/* =========================================================
   MESSAGE RENDERING
   ========================================================= */

function renderUserMessage(
    text,
    group
) {
    const row =
        document.createElement("div");

    row.className =
        "message-row user";

    row.dataset.sender =
        "user";

    const message =
        document.createElement("div");

    message.className =
        "message user";

    message.textContent =
        String(text ?? "");

    row.appendChild(message);
    group.appendChild(row);

    return row;
}

function renderAIMessage(
    text,
    group
) {
    const row =
        document.createElement("div");

    row.className =
        "message-row orbit";

    row.dataset.sender =
        "orbit";

    const message =
        document.createElement("div");

    message.className =
        "message orbit";

    message.innerHTML =
        renderMarkdown(text);

    row.appendChild(message);
    group.appendChild(row);

    return row;
}

function createOrbitStreamingMessage(
    group
) {
    const row =
        document.createElement("div");

    row.className =
        "message-row orbit";

    row.dataset.sender =
        "orbit";

    const message =
        document.createElement("div");

    message.className =
        "message orbit";

    message.dataset.orbitStreamingMessage =
        "true";

    row.appendChild(message);
    group.appendChild(row);

    return {
        row,
        message
    };
}

function updateOrbitStreamingMessage(
    element,
    text
) {
    if (!element) {
        return;
    }

    element.innerHTML =
        renderMarkdown(text);
}


/* =========================================================
   CONVERSATION RENDERING
   ========================================================= */

function renderOrbitConversation(
    messages
) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    chatWindow
        .querySelectorAll(
            ".conversation-group, #orbit-typing"
        )
        .forEach(el => el.remove());

    if (
        !Array.isArray(messages) ||
        !messages.length
    ) {
        return;
    }

    const group =
        document.createElement("div");

    group.className =
        "conversation-group";

    chatWindow.appendChild(group);

    messages.forEach(item => {
        if (
            !item ||
            typeof item.content !== "string"
        ) {
            return;
        }

        if (item.role === "user") {
            renderUserMessage(
                item.content,
                group
            );
        } else if (
            item.role === "assistant"
        ) {
            renderAIMessage(
                item.content,
                group
            );
        }
    });

    scrollOrbitChat("auto");
}


/* =========================================================
   MESSAGE NORMALIZATION
   ========================================================= */

function normalizeOrbitMessages(
    messages
) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .filter(
            item =>
                item &&
                (
                    item.role === "user" ||
                    item.role === "assistant"
                ) &&
                typeof item.content === "string" &&
                item.content.trim()
        )
        .map(item => ({
            role: item.role,
            content: item.content.trim()
        }))
        .slice(-ORBIT_HISTORY_LIMIT);
}

function limitOrbitContext(
    messages
) {
    const normalized =
        normalizeOrbitMessages(messages);

    let total = 0;
    const result = [];

    for (
        let i = normalized.length - 1;
        i >= 0;
        i--
    ) {
        const message =
            normalized[i];

        if (
            total +
            message.content.length >
            ORBIT_MAX_CONTEXT_CHARS
        ) {
            break;
        }

        result.unshift(message);

        total +=
            message.content.length;
    }

    return result;
}


/* =========================================================
   CHAT STORAGE
   ========================================================= */

function createOrbitChatId() {
    return (
        "chat-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}

function saveOrbitChatData(chat) {
    if (!chat?.id) {
        return false;
    }

    try {
        localStorage.setItem(
            ORBIT_CHAT_PREFIX +
            String(chat.id),

            JSON.stringify({
                id: chat.id,
                title: chat.title,
                message: chat.message,
                messages:
                    normalizeOrbitMessages(
                        chat.messages
                    ),
                updatedAt:
                    chat.updatedAt ||
                    Date.now()
            })
        );

        return true;
    } catch {
        return false;
    }
}

function loadOrbitChatData(
    chatId
) {
    if (!chatId) {
        return null;
    }

    try {
        const saved =
            localStorage.getItem(
                ORBIT_CHAT_PREFIX +
                String(chatId)
            );

        return saved
            ? JSON.parse(saved)
            : null;
    } catch {
        return null;
    }
}

function getCachedConversations() {
    try {
        const saved =
            localStorage.getItem(
                ORBIT_RECENT_CHATS_KEY
            );

        const parsed =
            saved
                ? JSON.parse(saved)
                : [];

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch {
        return [];
    }
}

function cacheConversation(chat) {
    if (!chat?.id) {
        return;
    }

    try {
        const chats =
            getCachedConversations()
                .filter(
                    item =>
                        String(item.id) !==
                        String(chat.id)
                );

        chats.unshift({
            id: chat.id,
            title: chat.title,
            message: chat.message,
            updatedAt: chat.updatedAt
        });

        localStorage.setItem(
            ORBIT_RECENT_CHATS_KEY,
            JSON.stringify(
                chats.slice(
                    0,
                    ORBIT_HISTORY_LIMIT
                )
            )
        );
    } catch { }
}


/* =========================================================
   LOAD / DELETE CONVERSATIONS
   ========================================================= */

function loadConversation(
    chatId
) {
    const chat =
        loadOrbitChatData(chatId);

    if (!chat?.messages) {
        return false;
    }

    orbitConversationHistory =
        normalizeOrbitMessages(
            chat.messages
        );

    window.orbitActiveChatId =
        String(chatId);

    localStorage.setItem(
        ORBIT_ACTIVE_CHAT_KEY,
        String(chatId)
    );

    renderOrbitConversation(
        orbitConversationHistory
    );

    hideOrbitQuickPrompts();

    return true;
}

function deleteConversation(
    chatId
) {
    if (!chatId) {
        return false;
    }

    try {
        localStorage.removeItem(
            ORBIT_CHAT_PREFIX +
            String(chatId)
        );

        const chats =
            getCachedConversations()
                .filter(
                    chat =>
                        String(chat.id) !==
                        String(chatId)
                );

        localStorage.setItem(
            ORBIT_RECENT_CHATS_KEY,
            JSON.stringify(chats)
        );

        if (
            String(
                window.orbitActiveChatId
            ) === String(chatId)
        ) {
            clearOrbitConversation();
        }

        refreshRecentChats();

        return true;
    } catch {
        return false;
    }
}

function searchChats(
    query = ""
) {
    const clean =
        String(query)
            .toLowerCase()
            .trim();

    const chats =
        getCachedConversations();

    if (!clean) {
        return chats;
    }

    return chats.filter(chat => {
        const title =
            String(
                chat.title || ""
            ).toLowerCase();

        const message =
            String(
                chat.message || ""
            ).toLowerCase();

        return (
            title.includes(clean) ||
            message.includes(clean)
        );
    });
}


/* =========================================================
   SIDEBAR HISTORY
   ========================================================= */

function refreshRecentChats() {
    const container =
        document.querySelector(
            ".chat-history-list"
        );

    if (!container) {
        return;
    }

    const chats =
        getCachedConversations();

    container.innerHTML = "";

    if (!chats.length) {
        const empty =
            document.createElement("div");

        empty.className =
            "chat-history-empty";

        empty.textContent =
            "No recent chats";

        container.appendChild(empty);

        return;
    }

    chats.forEach(chat => {
        const item =
            document.createElement("button");

        item.type = "button";

        item.className =
            "chat-history-item";

        item.dataset.chatId =
            chat.id;

        item.textContent =
            chat.title ||
            "New chat";

        item.addEventListener(
            "click",
            () => {
                loadConversation(
                    chat.id
                );
            }
        );

        container.appendChild(item);
    });
}


/* =========================================================
   CLEAR CURRENT CHAT
   ========================================================= */

function clearOrbitConversation() {
    orbitConversationHistory = [];

    window.orbitActiveChatId = null;

    localStorage.removeItem(
        ORBIT_ACTIVE_CHAT_KEY
    );

    renderOrbitConversation([]);

    showOrbitQuickPrompts();

    updateOrbitTypingState();
}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(
    body,
    signal
) {
    const token =
        await getOrbitAuthToken();

    const headers = {
        "Content-Type":
            "application/json",

        Accept:
            "text/event-stream, application/json"
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    return fetch(
        ORBIT_API_URL,
        {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal,
            cache: "no-store"
        }
    );
}


/* =========================================================
   STREAM RESPONSE READER
   ========================================================= */

async function readOrbitResponse(
    response,
    onToken
) {
    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    /*
     * Normal JSON response.
     */
    if (
        contentType.includes(
            "application/json"
        )
    ) {
        const data =
            await response.json();

        const reply =
            data?.reply ??
            data?.response ??
            data?.message ??
            data?.content ??
            "";

        if (reply) {
            onToken(
                String(reply)
            );
        }

        return String(reply);
    }

    /*
     * No streaming body.
     */
    if (!response.body) {
        const text =
            await response.text();

        if (text) {
            onToken(text);
        }

        return text;
    }

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder("utf-8");

    let buffer = "";
    let fullText = "";

    while (true) {
        const {
            done,
            value
        } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(
            value,
            {
                stream: true
            }
        );

        const events =
            buffer.split(
                /\r?\n\r?\n/
            );

        buffer =
            events.pop() || "";

        for (const event of events) {
            const lines =
                event.split(
                    /\r?\n/
                );

            for (const line of lines) {
                if (
                    !line.startsWith(
                        "data:"
                    )
                ) {
                    continue;
                }

                const data =
                    line.slice(5).trim();

                if (
                    !data ||
                    data === "[DONE]"
                ) {
                    continue;
                }

                let token = "";

                try {
                    const parsed =
                        JSON.parse(data);

                    token =
                        parsed?.token ??
                        parsed?.content ??
                        parsed?.text ??
                        parsed?.reply ??
                        "";
                } catch {
                    token = data;
                }

                if (!token) {
                    continue;
                }

                token =
                    String(token);

                fullText += token;

                onToken(token);
            }
        }
    }

    /*
     * Process any final incomplete event.
     */
    buffer +=
        decoder.decode();

    if (buffer.trim()) {
        const lines =
            buffer.split(
                /\r?\n/
            );

        for (const line of lines) {
            if (
                !line.startsWith(
                    "data:"
                )
            ) {
                continue;
            }

            const data =
                line.slice(5).trim();

            if (
                !data ||
                data === "[DONE]"
            ) {
                continue;
            }

            let token = "";

            try {
                const parsed =
                    JSON.parse(data);

                token =
                    parsed?.token ??
                    parsed?.content ??
                    parsed?.text ??
                    parsed?.reply ??
                    "";
            } catch {
                token = data;
            }

            if (token) {
                token =
                    String(token);

                fullText += token;

                onToken(token);
            }
        }
    }

    return fullText;
}


/* =========================================================
   STREAM RENDERING
   ========================================================= */

function scheduleOrbitStreamRender(
    element,
    getText
) {
    if (orbitStreamRenderTimer) {
        return;
    }

    orbitStreamRenderTimer =
        requestAnimationFrame(() => {
            orbitStreamRenderTimer =
                null;

            updateOrbitStreamingMessage(
                element,
                getText()
            );
        });
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function orbitSendMessage(
    suppliedMessage = null
) {
    const {
        commandInput,
        sendButton,
        chatWindow
    } = getOrbitElements();

    if (
        !commandInput ||
        orbitIsWaiting
    ) {
        return false;
    }

    const message =
        suppliedMessage !== null
            ? String(
                suppliedMessage
            ).trim()
            : String(
                commandInput.value || ""
            ).trim();

    if (!validateMessage(message)) {
        updateOrbitTypingState();
        return false;
    }

    await syncOrbitAuthenticatedUser();

    /*
     * Create a chat only when the user actually
     * sends a message.
     */
    if (!window.orbitActiveChatId) {
        window.orbitActiveChatId =
            createOrbitChatId();

        localStorage.setItem(
            ORBIT_ACTIVE_CHAT_KEY,
            window.orbitActiveChatId
        );
    }

    detectOrbitMemory(message);

    clearOrbitInput();

    hideOrbitQuickPrompts();

    orbitIsWaiting = true;

    commandInput.disabled = true;

    if (sendButton) {
        sendButton.disabled = true;
    }

    if (!chatWindow) {
        orbitIsWaiting = false;

        commandInput.disabled = false;

        updateOrbitTypingState();

        return false;
    }

    let group =
        chatWindow.querySelector(
            ".conversation-group"
        );

    if (!group) {
        group =
            document.createElement("div");

        group.className =
            "conversation-group";

        chatWindow.appendChild(group);
    }

    /*
     * Render user's message immediately.
     */
    renderUserMessage(
        message,
        group
    );

    orbitConversationHistory.push({
        role: "user",
        content: message
    });

    orbitConversationHistory =
        normalizeOrbitMessages(
            orbitConversationHistory
        );

    /*
     * Keep the user message visible before
     * Orbit begins responding.
     */
    scrollOrbitChat("smooth");

    showOrbitTypingIndicator();

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => controller.abort(),
            ORBIT_REQUEST_TIMEOUT
        );

    try {
        const contextHistory =
            limitOrbitContext(
                orbitConversationHistory
            );

        const response =
            await apiRequest(
                {
                    message,

                    history:
                        contextHistory,

                    memory:
                        getOrbitMemoryContext(),

                    userId:
                        ORBIT_USER_ID,

                    systemPrompt:
                        ORBIT_SYSTEM_PROMPT,

                    max_tokens:
                        ORBIT_MAX_TOKENS,

                    stream: true
                },
                controller.signal
            );

        if (!response.ok) {
            let errorMessage =
                `Server returned status ${response.status}`;

            try {
                const errorData =
                    await response.json();

                errorMessage =
                    errorData?.error ||
                    errorData?.message ||
                    errorMessage;
            } catch { }

            throw new Error(
                errorMessage
            );
        }

        hideOrbitTypingIndicator();

        const streaming =
            createOrbitStreamingMessage(
                group
            );

        /*
         * IMPORTANT:
         * Put the user's view at the beginning
         * of Orbit's response.
         */
        scrollToBeginningOfOrbitResponse(
            streaming.row,
            "smooth"
        );

        orbitStreamBuffer = "";

        const reply =
            await readOrbitResponse(
                response,
                token => {
                    orbitStreamBuffer += token;

                    scheduleOrbitStreamRender(
                        streaming.message,
                        () =>
                            orbitStreamBuffer
                    );
                }
            );

        /*
         * Make sure the last scheduled render
         * completes before finalizing the message.
         */
        if (orbitStreamRenderTimer) {
            cancelAnimationFrame(
                orbitStreamRenderTimer
            );

            orbitStreamRenderTimer =
                null;
        }

        /*
         * Use whichever valid response exists.
         */
        const receivedReply =
            String(
                reply ||
                orbitStreamBuffer ||
                ""
            ).trim();

        /*
         * Only use the fallback if the server
         * genuinely returned no content.
         */
        const finalReply =
            receivedReply ||
            "I received the request, but the server returned an empty response.";

        updateOrbitStreamingMessage(
            streaming.message,
            finalReply
        );

        orbitConversationHistory.push({
            role: "assistant",
            content: finalReply
        });

        orbitConversationHistory =
            normalizeOrbitMessages(
                orbitConversationHistory
            );

        const chatData = {
            id:
                window.orbitActiveChatId,

            title:
                message.length > 60
                    ? message.slice(0, 60) +
                    "..."
                    : message,

            message,

            messages:
                orbitConversationHistory,

            updatedAt:
                Date.now()
        };

        /*
         * Save complete conversation to history.
         */
        saveOrbitChatData(
            chatData
        );

        cacheConversation(
            chatData
        );

        refreshRecentChats();

        /*
         * Return the viewport to the beginning
         * of Orbit's response after rendering.
         */
        scrollToBeginningOfOrbitResponse(
            streaming.row,
            "smooth"
        );

        return true;

    } catch (error) {
        hideOrbitTypingIndicator();

        const errorMessage =
            error?.name === "AbortError"
                ? "The request took too long and was cancelled. Please try again."
                : `I couldn't complete that request. ${error?.message ||
                "Unknown error"
                }`;

        renderAIMessage(
            errorMessage,
            group
        );

        return false;

    } finally {
        clearTimeout(timeoutId);

        orbitIsWaiting = false;

        commandInput.disabled = false;

        orbitStreamBuffer = "";

        if (sendButton) {
            sendButton.disabled = false;
        }

        updateOrbitTypingState();

        focusOrbitInput();
    }
}


/* =========================================================
   QUICK PROMPT HANDLER
   ========================================================= */

function handleOrbitQuickPrompt(
    event
) {
    const button =
        event.target.closest(
            "[data-prompt], .quick-prompt, .quick-prompt-btn"
        );

    if (!button) {
        return;
    }

    const prompt =
        button.dataset.prompt ||
        button.dataset.message ||
        button.textContent;

    if (!prompt?.trim()) {
        return;
    }

    orbitSendMessage(
        prompt.trim()
    );
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function bindEventListeners() {
    const {
        commandForm,
        sendButton,
        commandInput
    } = getOrbitElements();

    /*
     * FORM SUBMISSION
     */
    if (commandForm) {
        commandForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                if (!orbitIsWaiting) {
                    orbitSendMessage();
                }
            }
        );
    }

    /*
     * SEND BUTTON
     */
    if (sendButton) {
        sendButton.addEventListener(
            "click",
            event => {
                event.preventDefault();

                if (!orbitIsWaiting) {
                    orbitSendMessage();
                }
            }
        );
    }

    /*
     * KEYBOARD HANDLING
     */
    if (commandInput) {
        commandInput.addEventListener(
            "keydown",
            event => {
                /*
                 * ENTER = SEND
                 *
                 * SHIFT + ENTER = NEW LINE
                 */
                if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.isComposing
                ) {
                    event.preventDefault();

                    if (!orbitIsWaiting) {
                        orbitSendMessage();
                    }
                }
            }
        );

        /*
         * Detect every keyboard/input change.
         *
         * This catches:
         * - normal keyboard typing
         * - paste
         * - autofill
         * - mobile keyboard
         * - drag/drop text
         * - programmatic input events
         */
        commandInput.addEventListener(
            "input",
            () => {
                updateOrbitTypingState();
            }
        );

        /*
         * Keyboard typing detection.
         */
        commandInput.addEventListener(
            "keyup",
            () => {
                updateOrbitTypingState();
            }
        );

        /*
         * Pasting text.
         */
        commandInput.addEventListener(
            "paste",
            () => {
                requestAnimationFrame(
                    updateOrbitTypingState
                );
            }
        );

        /*
         * Cut/delete.
         */
        commandInput.addEventListener(
            "cut",
            () => {
                requestAnimationFrame(
                    updateOrbitTypingState
                );
            }
        );

        /*
         * Focus.
         */
        commandInput.addEventListener(
            "focus",
            () => {
                updateOrbitTypingState();
            }
        );

        /*
         * Initial state.
         */
        updateOrbitTypingState();
    }


    /*
     * QUICK PROMPTS
     */
    document.addEventListener(
        "click",
        handleOrbitQuickPrompt
    );


    /*
     * COPY CODE BUTTONS
     */
    document.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(
                    "[data-orbit-copy-code]"
                );

            if (!button) {
                return;
            }

            const wrapper =
                button.closest(
                    "[data-orbit-code-block]"
                );

            const code =
                wrapper?.querySelector(
                    "pre code"
                )?.textContent || "";

            if (!code) {
                return;
            }

            navigator.clipboard
                ?.writeText(code)
                .then(() => {
                    const original =
                        button.textContent;

                    button.textContent =
                        "Copied";

                    setTimeout(() => {
                        button.textContent =
                            original;
                    }, 1200);
                })
                .catch(() => {
                    button.textContent =
                        "Copy failed";

                    setTimeout(() => {
                        button.textContent =
                            "Copy";
                    }, 1200);
                });
        }
    );


    /*
     * CHAT SEARCH
     */
    document.addEventListener(
        "input",
        event => {
            if (
                event.target.matches(
                    ".chat-search-input, [data-chat-search]"
                )
            ) {
                const results =
                    searchChats(
                        event.target.value
                    );

                renderChatSearchResults(
                    results
                );
            }
        }
    );
}


/* =========================================================
   SEARCH RESULTS
   ========================================================= */

function renderChatSearchResults(
    chats
) {
    const container =
        document.querySelector(
            ".chat-history-list"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    chats.forEach(chat => {
        const item =
            document.createElement(
                "button"
            );

        item.type = "button";

        item.className =
            "chat-history-item";

        item.dataset.chatId =
            chat.id;

        item.textContent =
            chat.title ||
            "New chat";

        item.addEventListener(
            "click",
            () => {
                loadConversation(
                    chat.id
                );
            }
        );

        container.appendChild(item);
    });
}


/* =========================================================
   FRESH PAGE INITIALIZATION
   ========================================================= */

async function initializeOrbit() {
    if (orbitInitialized) {
        return;
    }

    loadOrbitMemory();

    await syncOrbitAuthenticatedUser();

    bindEventListeners();

    refreshRecentChats();

    /*
     * IMPORTANT:
     *
     * Do NOT automatically restore the previous
     * conversation into the main chat window.
     *
     * This means:
     *
     * Refresh page
     *      ↓
     * Main AI area is empty
     *      ↓
     * Sidebar history remains
     *      ↓
     * User clicks a history item if they want
     * to reopen an old conversation.
     */
    orbitConversationHistory = [];

    window.orbitActiveChatId = null;

    localStorage.removeItem(
        ORBIT_ACTIVE_CHAT_KEY
    );

    renderOrbitConversation([]);

    showOrbitQuickPrompts();

    updateOrbitTypingState();

    orbitInitialized = true;

    console.log(
        "Orbit AI initialized successfully."
    );
}


/* =========================================================
   PUBLIC ORBIT API
   ========================================================= */

window.OrbitAI = {
    initialize:
        initializeOrbit,

    sendMessage:
        orbitSendMessage,

    clearConversation:
        clearOrbitConversation,

    loadConversation:
        loadConversation,

    deleteConversation:
        deleteConversation,

    searchChats:
        searchChats,

    refreshRecentChats:
        refreshRecentChats,

    getCurrentUser:
        () => ORBIT_USER_ID,

    getAuthSession:
        getOrbitAuthSession,

    logoutUser:
        logoutOrbitUser
};


/* =========================================================
   AUTO INITIALIZATION
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbit,
        {
            once: true
        }
    );
} else {
    initializeOrbit();
}