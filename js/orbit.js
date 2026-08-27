"use strict";

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

const ORBIT_USER_ID_KEY = "orbit-user-id";
const ORBIT_MEMORY_CACHE_KEY = "orbit-memory-cache";
const ORBIT_CHAT_PREFIX = "orbit-chat-";
const ORBIT_RECENT_CHATS_KEY = "orbit-recent-chats";
const ORBIT_ACTIVE_CHAT_KEY = "orbit-active-chat";

const ORBIT_SYSTEM_PROMPT = `
You are Orbit AI, a highly capable general-purpose AI assistant with a strong specialization in software engineering and programming.

PROGRAMMING SPECIALIZATION:

You must be highly capable of working with programming languages, frameworks, libraries, APIs, databases, development tools, debugging, architecture, deployment, and technical problem solving.

You should confidently handle:

HTML
CSS
JavaScript
TypeScript
Python
Java
C
C++
C#
Go
Rust
PHP
Ruby
Kotlin
Swift
Dart
SQL
Bash
PowerShell
JSON
YAML
XML
Markdown
Node.js
Express
React
Next.js
Vue
Angular
Supabase
Firebase
MongoDB
PostgreSQL
MySQL
REST APIs
Git
GitHub
Authentication
Cloud deployment
Frontend development
Backend development

When a user provides code:

- Inspect the existing code carefully before changing it.
- Understand the current architecture first.
- Preserve working functionality.
- Do not invent IDs, classes, APIs, database tables, columns, endpoints, variables, or files.
- Do not rewrite an entire project unnecessarily.
- Identify the actual problem before proposing a fix.
- Explain important changes when appropriate.
- Provide complete replacement sections when code needs to be replaced.
- Make code syntactically valid and internally consistent.
- Keep code secure, maintainable, readable, and performant.
- Consider edge cases and error handling.
- When debugging, explain the likely cause and provide a practical fix.
- When the user asks for a complete file, provide the complete file.
- When multiple files are required, clearly separate them.
- Keep frontend code compatible with the user's existing HTML and CSS unless a change is explicitly requested.

CODE FORMATTING:

Always put programming code inside fenced Markdown code blocks with the appropriate language identifier.

Examples:

\`\`\`javascript
console.log("Hello");
\`\`\`

\`\`\`python
print("Hello")
\`\`\`

\`\`\`html
<h1>Hello</h1>
\`\`\`

Use the correct language identifier whenever the language is known.

GENERAL BEHAVIOR:

- Understand the user's actual goal before answering.
- Answer naturally and conversationally.
- Be accurate and practical.
- Never knowingly invent information.
- Maintain useful conversation context.
- Follow the user's existing project structure.
- Do not unnecessarily complicate simple tasks.
- If information is missing, clearly state what is missing.
`;

let orbitConversationHistory = [];
let orbitUserMemory = [];
let orbitIsWaiting = false;
let orbitInitialized = false;
let orbitAuthSessionCache = null;
let orbitAuthSessionCacheTime = 0;
let orbitResponseStartedAt = 0;
let orbitCurrentResponseRow = null;
let orbitStreamBuffer = "";
let orbitStreamRenderTimer = null;
let orbitStreamRenderElement = null;
let orbitUserHasStartedTyping = false;

function getOrbitUserId() {
    try {
        const existing = localStorage.getItem(ORBIT_USER_ID_KEY);

        if (existing) {
            return existing;
        }

        const id =
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID()
                : "orbit-" +
                  Date.now().toString(36) +
                  "-" +
                  Math.random().toString(36).slice(2, 12);

        localStorage.setItem(ORBIT_USER_ID_KEY, id);

        return id;
    } catch {
        return "orbit-temporary-" + Date.now();
    }
}

let ORBIT_USER_ID = getOrbitUserId();

function getOrbitElements() {
    return {
        chatWindow: document.getElementById("chat-window"),
        commandInput: document.getElementById("command-input"),
        sendButton: document.getElementById("send-btn"),
        commandForm:
            document.getElementById("command-form") ||
            document.querySelector(".command-area form") ||
            document.querySelector(".command-box form"),
        responseTime: document.getElementById("response-time")
    };
}

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
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            return null;
        }

        orbitAuthSessionCache = data?.session || null;
        orbitAuthSessionCacheTime = now;

        return orbitAuthSessionCache;
    } catch {
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

async function logoutOrbitUser() {
    const supabase = getOrbitSupabaseClient();

    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
    } catch {}

    try {
        localStorage.removeItem(ORBIT_USER_ID_KEY);
    } catch {}

    orbitAuthSessionCache = null;
    orbitAuthSessionCacheTime = 0;

    ORBIT_USER_ID = getOrbitUserId();

    clearOrbitConversation();
}

function setOrbitResponseStatus(status) {
    const { responseTime } = getOrbitElements();

    if (responseTime) {
        responseTime.textContent = status;
    }
}

function startOrbitResponseTimer() {
    orbitResponseStartedAt = performance.now();
    setOrbitResponseStatus("Thinking…");
}

function finishOrbitResponseTimer() {
    if (!orbitResponseStartedAt) {
        setOrbitResponseStatus("Ready");
        return;
    }

    const elapsed =
        (performance.now() - orbitResponseStartedAt) / 1000;

    const value =
        elapsed < 10
            ? elapsed.toFixed(1) + "s"
            : Math.round(elapsed) + "s";

    setOrbitResponseStatus(value);
    orbitResponseStartedAt = 0;
}

function clearOrbitInput() {
    const { commandInput } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    commandInput.value = "";
    commandInput.classList.remove("is-typing");

    updateOrbitTypingState();
}

function focusOrbitInput() {
    const { commandInput } = getOrbitElements();

    if (!commandInput || commandInput.disabled) {
        return;
    }

    requestAnimationFrame(() => {
        try {
            commandInput.focus({ preventScroll: true });
        } catch {
            commandInput.focus();
        }
    });
}

function updateOrbitTypingState() {
    const { commandInput, sendButton } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    const hasText =
        String(commandInput.value || "").trim().length > 0;

    commandInput.classList.toggle("is-typing", hasText);

    if (sendButton) {
        sendButton.disabled = orbitIsWaiting || !hasText;
    }

    orbitUserHasStartedTyping = hasText;
}

function scrollOrbitChat(behavior = "auto") {
    const { chatWindow } = getOrbitElements();

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

function scrollToOrbitResponse(row, behavior = "smooth") {
    const { chatWindow } = getOrbitElements();

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

function showOrbitTypingIndicator() {
    const { chatWindow } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    hideOrbitTypingIndicator();

    const row = document.createElement("div");

    row.id = "orbit-typing";
    row.className = "message-row orbit typing-row";

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
    document.getElementById("orbit-typing")?.remove();
}

function hideOrbitQuickPrompts() {
    [
        ".quick-prompts",
        ".quick-prompt-container",
        ".suggestion-prompts"
    ].forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.classList.add("is-hidden");
        });
    });
}

function showOrbitQuickPrompts() {
    [
        ".quick-prompts",
        ".quick-prompt-container",
        ".suggestion-prompts"
    ].forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.classList.remove("is-hidden");
        });
    });
}

function loadOrbitMemory() {
    try {
        const saved =
            localStorage.getItem(ORBIT_MEMORY_CACHE_KEY);

        if (!saved) {
            orbitUserMemory = [];
            return;
        }

        const parsed = JSON.parse(saved);

        orbitUserMemory = Array.isArray(parsed)
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

function saveOrbitMemory() {
    try {
        localStorage.setItem(
            ORBIT_MEMORY_CACHE_KEY,
            JSON.stringify(orbitUserMemory)
        );
    } catch {}
}

function rememberOrbitDetail(detail) {
    const cleanDetail =
        String(detail || "").trim();

    if (!cleanDetail) {
        return;
    }

    const exists = orbitUserMemory.some(
        item =>
            item.toLowerCase() ===
            cleanDetail.toLowerCase()
    );

    if (exists) {
        return;
    }

    orbitUserMemory.push(cleanDetail);

    orbitUserMemory =
        orbitUserMemory.slice(-ORBIT_MEMORY_LIMIT);

    saveOrbitMemory();
}

function detectOrbitMemory(message) {
    const text = String(message || "").trim();

    if (!text) {
        return;
    }

    const nameMatch = text.match(
        /(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i
    );

    if (nameMatch) {
        rememberOrbitDetail(
            `The user's name is ${nameMatch[1].trim()}.`
        );
    }

    const projectMatch = text.match(
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

function sanitizeMessage(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return sanitizeMessage(value);
}

function validateMessage(message) {
    return (
        typeof message === "string" &&
        message.trim().length > 0
    );
}

function normalizeLanguage(language) {
    const value =
        String(language || "")
            .trim()
            .toLowerCase();

    const aliases = {
        js: "javascript",
        jsx: "javascript",
        mjs: "javascript",
        cjs: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        rb: "ruby",
        rs: "rust",
        golang: "go",
        sh: "bash",
        shell: "bash",
        zsh: "bash",
        ps: "powershell",
        ps1: "powershell",
        yml: "yaml",
        md: "markdown",
        htm: "html",
        xhtml: "html",
        cxx: "cpp",
        cc: "cpp",
        hpp: "cpp",
        cs: "csharp",
        "c#": "csharp",
        "c++": "cpp",
        postgres: "sql",
        postgresql: "sql"
    };

    return aliases[value] || value || "text";
}

function createOrbitCodeHTML(language, code) {
    const safeLanguage =
        normalizeLanguage(language);

    const displayLanguage =
        safeLanguage === "text"
            ? "CODE"
            : safeLanguage.toUpperCase();

    return `
        <div
            class="orbit-code-wrapper orbit-code-container"
            data-orbit-code-block
            data-language="${escapeAttribute(safeLanguage)}"
        >
            <div class="orbit-code-toolbar orbit-code-header">
                <span class="orbit-code-language">
                    ${sanitizeMessage(displayLanguage)}
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

            <pre class="orbit-code-block"><code class="language-${escapeAttribute(
                safeLanguage
            )}">${sanitizeMessage(code)}</code></pre>
        </div>
    `;
}

function renderInlineMarkdown(text) {
    let result = sanitizeMessage(text);

    result = result.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        (_, label, url) => `
            <a
                href="${escapeAttribute(url)}"
                target="_blank"
                rel="noopener noreferrer"
            >${label}</a>
        `
    );

    result = result.replace(
        /(^|[\s(])(https?:\/\/[^\s<]+)/g,
        (_, prefix, url) => {
            const cleanUrl =
                url.replace(/[.,!?;:]+$/, "");

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

    const headers = parseRow(lines[0]);
    const rows = lines.slice(2).map(parseRow);

    let html = `
        <div class="orbit-table-wrapper">
            <table class="orbit-table">
                <thead>
                    <tr>
    `;

    headers.forEach(header => {
        html += `
            <th>${renderInlineMarkdown(header)}</th>
        `;
    });

    html += `
                    </tr>
                </thead>
                <tbody>
    `;

    rows.forEach(row => {
        html += "<tr>";

        headers.forEach((_, index) => {
            html += `
                <td>${renderInlineMarkdown(
                    row[index] || ""
                )}</td>
            `;
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

function renderMarkdown(text) {
    if (!text) {
        return "";
    }

    let source =
        String(text).replace(/\r\n/g, "\n");

    const codeBlocks = [];

    source = source.replace(
        /```([a-zA-Z0-9_+#.-]*)\n?([\s\S]*?)```/g,
        (_, language, code) => {
            const placeholder =
                `@@ORBIT_CODE_${codeBlocks.length}@@`;

            codeBlocks.push(
                createOrbitCodeHTML(
                    language,
                    code
                        .replace(/^\n/, "")
                        .replace(/\n$/, "")
                )
            );

            return placeholder;
        }
    );

    const lines = source.split("\n");
    let output = "";
    let tableLines = [];

    const flushTable = () => {
        if (!tableLines.length) {
            return;
        }

        const table =
            parseMarkdownTable(tableLines);

        if (table) {
            output += table;
        } else {
            output += tableLines
                .map(line => renderInlineMarkdown(line))
                .join("<br>");
        }

        tableLines = [];
    };

    lines.forEach(line => {
        if (
            line.includes("|") &&
            !line.includes("@@ORBIT_CODE_")
        ) {
            tableLines.push(line);
            return;
        }

        flushTable();

        if (/^###\s+/.test(line)) {
            output += `
                <h4>
                    ${renderInlineMarkdown(
                        line.replace(/^###\s+/, "")
                    )}
                </h4>
            `;
            return;
        }

        if (/^##\s+/.test(line)) {
            output += `
                <h3>
                    ${renderInlineMarkdown(
                        line.replace(/^##\s+/, "")
                    )}
                </h3>
            `;
            return;
        }

        if (/^#\s+/.test(line)) {
            output += `
                <h2>
                    ${renderInlineMarkdown(
                        line.replace(/^#\s+/, "")
                    )}
                </h2>
            `;
            return;
        }

        if (/^\s*[-*]\s+/.test(line)) {
            output += `
                <div class="orbit-list-item">
                    • ${renderInlineMarkdown(
                        line.replace(/^\s*[-*]\s+/, "")
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

    codeBlocks.forEach((codeHTML, index) => {
        output = output.replace(
            `@@ORBIT_CODE_${index}@@`,
            codeHTML
        );
    });

    return output.replace(
        /(<br>){3,}/g,
        "<br><br>"
    );
}

function renderUserMessage(text, group) {
    const row =
        document.createElement("div");

    row.className = "message-row user";
    row.dataset.sender = "user";

    const message =
        document.createElement("div");

    message.className = "message user";
    message.textContent = String(text ?? "");

    row.appendChild(message);
    group.appendChild(row);

    return row;
}

function renderAIMessage(text, group) {
    const row =
        document.createElement("div");

    row.className = "message-row orbit";
    row.dataset.sender = "orbit";

    const message =
        document.createElement("div");

    message.className = "message orbit";
    message.innerHTML = renderMarkdown(text);

    row.appendChild(message);
    group.appendChild(row);

    return row;
}

function createOrbitStreamingMessage(group) {
    const row =
        document.createElement("div");

    row.className = "message-row orbit";
    row.dataset.sender = "orbit";

    const message =
        document.createElement("div");

    message.className = "message orbit";
    message.dataset.orbitStreamingMessage = "true";

    row.appendChild(message);
    group.appendChild(row);

    orbitCurrentResponseRow = row;

    return {
        row,
        message
    };
}

function updateOrbitStreamingMessage(element, text) {
    if (!element) {
        return;
    }

    element.innerHTML =
        renderMarkdown(text);
}

function normalizeOrbitMessages(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .filter(
            item =>
                item &&
                (item.role === "user" ||
                    item.role === "assistant") &&
                typeof item.content === "string" &&
                item.content.trim()
        )
        .map(item => ({
            role: item.role,
            content: item.content.trim()
        }))
        .slice(-ORBIT_HISTORY_LIMIT);
}

function limitOrbitContext(messages) {
    const normalized =
        normalizeOrbitMessages(messages);

    let total = 0;
    const result = [];

    for (
        let index = normalized.length - 1;
        index >= 0;
        index--
    ) {
        const message = normalized[index];

        if (
            total +
                message.content.length >
            ORBIT_MAX_CONTEXT_CHARS
        ) {
            break;
        }

        result.unshift(message);
        total += message.content.length;
    }

    return result;
}

function renderOrbitConversation(messages) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    chatWindow
        .querySelectorAll(
            ".conversation-group, #orbit-typing"
        )
        .forEach(element => element.remove());

    if (
        !Array.isArray(messages) ||
        !messages.length
    ) {
        return;
    }

    const group =
        document.createElement("div");

    group.className = "conversation-group";
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
        }

        if (item.role === "assistant") {
            renderAIMessage(
                item.content,
                group
            );
        }
    });

    scrollOrbitChat("auto");
}

function createOrbitChatId() {
    return (
        "chat-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function saveOrbitChatData(chat) {
    if (!chat?.id) {
        return false;
    }

    try {
        localStorage.setItem(
            ORBIT_CHAT_PREFIX + String(chat.id),
            JSON.stringify({
                id: chat.id,
                title: chat.title,
                message: chat.message,
                messages:
                    normalizeOrbitMessages(
                        chat.messages
                    ),
                updatedAt:
                    chat.updatedAt || Date.now()
            })
        );

        return true;
    } catch {
        return false;
    }
}

function loadOrbitChatData(chatId) {
    if (!chatId) {
        return null;
    }

    try {
        const saved =
            localStorage.getItem(
                ORBIT_CHAT_PREFIX + String(chatId)
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
            saved ? JSON.parse(saved) : [];

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
            getCachedConversations().filter(
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
    } catch {}
}

function loadConversation(chatId) {
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

    try {
        localStorage.setItem(
            ORBIT_ACTIVE_CHAT_KEY,
            String(chatId)
        );
    } catch {}

    renderOrbitConversation(
        orbitConversationHistory
    );

    hideOrbitQuickPrompts();

    return true;
}

function deleteConversation(chatId) {
    if (!chatId) {
        return false;
    }

    try {
        localStorage.removeItem(
            ORBIT_CHAT_PREFIX +
            String(chatId)
        );

        const chats =
            getCachedConversations().filter(
                chat =>
                    String(chat.id) !==
                    String(chatId)
            );

        localStorage.setItem(
            ORBIT_RECENT_CHATS_KEY,
            JSON.stringify(chats)
        );

        if (
            String(window.orbitActiveChatId) ===
            String(chatId)
        ) {
            clearOrbitConversation();
        }

        refreshRecentChats();

        return true;
    } catch {
        return false;
    }
}

function clearOrbitConversation() {
    orbitConversationHistory = [];
    orbitCurrentResponseRow = null;
    orbitStreamBuffer = "";
    orbitUserHasStartedTyping = false;

    window.orbitActiveChatId = null;

    try {
        localStorage.removeItem(
            ORBIT_ACTIVE_CHAT_KEY
        );
    } catch {}

    renderOrbitConversation([]);
    showOrbitQuickPrompts();
    updateOrbitTypingState();
    setOrbitResponseStatus("Ready");
}

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
            chat.title || "New chat";

        item.addEventListener(
            "click",
            () => loadConversation(chat.id)
        );

        container.appendChild(item);
    });
}

function searchChats(query = "") {
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
            String(chat.title || "")
                .toLowerCase();

        const message =
            String(chat.message || "")
                .toLowerCase();

        return (
            title.includes(clean) ||
            message.includes(clean)
        );
    });
}

async function apiRequest(
    body,
    signal,
    apiUrl = ORBIT_API_URL
) {
    const token =
        await getOrbitAuthToken();

    const headers = {
        "Content-Type": "application/json",
        Accept:
            "text/event-stream, application/json"
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    return fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
        cache: "no-store",
        keepalive: false
    });
}

function extractOrbitToken(data) {
    if (!data) {
        return "";
    }

    if (typeof data === "string") {
        return data;
    }

    return String(
        data.token ??
        data.content ??
        data.text ??
        data.reply ??
        data.response ??
        ""
    );
}

async function readOrbitResponse(
    response,
    onToken
) {
    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

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
            onToken(String(reply));
        }

        return String(reply);
    }

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
        const { done, value } =
            await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(
            value,
            { stream: true }
        );

        const events =
            buffer.split(
                /\r?\n\r?\n/
            );

        buffer =
            events.pop() || "";

        for (const event of events) {
            const lines =
                event.split(/\r?\n/);

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
                    token =
                        extractOrbitToken(
                            JSON.parse(data)
                        );
                } catch {
                    token = data;
                }

                if (!token) {
                    continue;
                }

                token = String(token);
                fullText += token;
                onToken(token);
            }
        }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
        const lines =
            buffer.split(/\r?\n/);

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
                token =
                    extractOrbitToken(
                        JSON.parse(data)
                    );
            } catch {
                token = data;
            }

            if (token) {
                token = String(token);
                fullText += token;
                onToken(token);
            }
        }
    }

    return fullText;
}

function scheduleOrbitStreamRender(
    element,
    getText
) {
    orbitStreamRenderElement = element;

    if (orbitStreamRenderTimer) {
        return;
    }

    orbitStreamRenderTimer =
        requestAnimationFrame(() => {
            orbitStreamRenderTimer = null;

            if (
                orbitStreamRenderElement !==
                element
            ) {
                return;
            }

            updateOrbitStreamingMessage(
                element,
                getText()
            );

            scrollOrbitChat("auto");
        });
}

function flushOrbitStreamRender(
    element,
    text
) {
    if (orbitStreamRenderTimer) {
        cancelAnimationFrame(
            orbitStreamRenderTimer
        );

        orbitStreamRenderTimer = null;
    }

    orbitStreamRenderElement = null;

    updateOrbitStreamingMessage(
        element,
        text
    );
}

function getOrbitSettings() {
    const settings =
        window.OrbitSettings ||
        window.orbitSettings;

    return settings &&
        typeof settings === "object"
        ? settings
        : {};
}

function buildOrbitRequestBody(message) {
    const settings =
        getOrbitSettings();

    const history =
        limitOrbitContext(
            orbitConversationHistory
        );

    const body = {
        message,
        history,
        memory:
            getOrbitMemoryContext(),
        userId:
            ORBIT_USER_ID,
        systemPrompt:
            ORBIT_SYSTEM_PROMPT,
        max_tokens:
            ORBIT_MAX_TOKENS,
        stream: true
    };

    if (
        typeof settings.model === "string" &&
        settings.model.trim()
    ) {
        body.model =
            settings.model.trim();
    }

    if (
        typeof settings.temperature ===
        "number"
    ) {
        body.temperature =
            settings.temperature;
    }

    if (
        typeof settings.maxTokens ===
        "number"
    ) {
        body.max_tokens =
            settings.maxTokens;
    }

    return body;
}

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

    if (!window.orbitActiveChatId) {
        window.orbitActiveChatId =
            createOrbitChatId();

        try {
            localStorage.setItem(
                ORBIT_ACTIVE_CHAT_KEY,
                window.orbitActiveChatId
            );
        } catch {}
    }

    detectOrbitMemory(message);

    clearOrbitInput();
    hideOrbitQuickPrompts();

    orbitIsWaiting = true;
    orbitUserHasStartedTyping = false;

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

    scrollOrbitChat("smooth");
    showOrbitTypingIndicator();
    startOrbitResponseTimer();

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => controller.abort(),
            ORBIT_REQUEST_TIMEOUT
        );

    try {
        const body =
            buildOrbitRequestBody(
                message
            );

        let response;

        try {
            response =
                await apiRequest(
                    body,
                    controller.signal,
                    ORBIT_API_URL
                );
        } catch (primaryError) {
            if (
                !ORBIT_FALLBACK_API_URL ||
                controller.signal.aborted
            ) {
                throw primaryError;
            }

            response =
                await apiRequest(
                    body,
                    controller.signal,
                    ORBIT_FALLBACK_API_URL
                );
        }

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
            } catch {}

            throw new Error(
                errorMessage
            );
        }

        hideOrbitTypingIndicator();

        const streaming =
            createOrbitStreamingMessage(
                group
            );

        scrollToOrbitResponse(
            streaming.row,
            "smooth"
        );

        orbitStreamBuffer = "";

        const reply =
            await readOrbitResponse(
                response,
                token => {
                    orbitStreamBuffer +=
                        token;

                    scheduleOrbitStreamRender(
                        streaming.message,
                        () =>
                            orbitStreamBuffer
                    );
                }
            );

        const finalReply =
            String(
                reply ||
                orbitStreamBuffer ||
                ""
            ).trim();

        const responseText =
            finalReply ||
            "I received the request, but the server returned an empty response.";

        flushOrbitStreamRender(
            streaming.message,
            responseText
        );

        orbitConversationHistory.push({
            role: "assistant",
            content: responseText
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

        saveOrbitChatData(
            chatData
        );

        cacheConversation(
            chatData
        );

        refreshRecentChats();

        orbitCurrentResponseRow =
            streaming.row;

        scrollToOrbitResponse(
            streaming.row,
            "smooth"
        );

        finishOrbitResponseTimer();

        return true;
    } catch (error) {
        hideOrbitTypingIndicator();

        const errorMessage =
            error?.name === "AbortError"
                ? "The request took too long and was cancelled. Please try again."
                : `I couldn't complete that request. ${
                      error?.message ||
                      "Unknown error"
                  }`;

        renderAIMessage(
            errorMessage,
            group
        );

        setOrbitResponseStatus(
            "Error"
        );

        return false;
    } finally {
        clearTimeout(timeoutId);

        orbitIsWaiting = false;
        commandInput.disabled = false;

        orbitStreamBuffer = "";
        orbitStreamRenderElement = null;

        if (orbitStreamRenderTimer) {
            cancelAnimationFrame(
                orbitStreamRenderTimer
            );

            orbitStreamRenderTimer = null;
        }

        if (sendButton) {
            sendButton.disabled = false;
        }

        updateOrbitTypingState();
        focusOrbitInput();

        if (!orbitResponseStartedAt) {
            setOrbitResponseStatus(
                "Ready"
            );
        }
    }
}

function handleOrbitQuickPrompt(event) {
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

async function handleOrbitCopyCode(event) {
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

    const original =
        button.textContent;

    try {
        if (
            navigator.clipboard &&
            typeof navigator.clipboard.writeText ===
                "function"
        ) {
            await navigator.clipboard.writeText(
                code
            );
        } else {
            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value = code;
            textarea.style.position =
                "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();
            document.execCommand(
                "copy"
            );

            textarea.remove();
        }

        button.textContent =
            "Copied";

        setTimeout(() => {
            button.textContent =
                original;
        }, 1200);
    } catch {
        button.textContent =
            "Copy failed";

        setTimeout(() => {
            button.textContent =
                original;
        }, 1200);
    }
}

function bindOrbitEvents() {
    const {
        commandForm,
        sendButton,
        commandInput
    } = getOrbitElements();

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

    if (commandInput) {
        commandInput.addEventListener(
            "keydown",
            event => {
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

        commandInput.addEventListener(
            "input",
            updateOrbitTypingState
        );

        commandInput.addEventListener(
            "focus",
            updateOrbitTypingState
        );

        updateOrbitTypingState();
    }

    document.addEventListener(
        "click",
        handleOrbitQuickPrompt
    );

    document.addEventListener(
        "click",
        handleOrbitCopyCode
    );
}

function initializeOrbit() {
    if (orbitInitialized) {
        return;
    }

    loadOrbitMemory();
    bindOrbitEvents();
    refreshRecentChats();

    orbitConversationHistory = [];
    orbitCurrentResponseRow = null;

    window.orbitActiveChatId = null;

    try {
        localStorage.removeItem(
            ORBIT_ACTIVE_CHAT_KEY
        );
    } catch {}

    renderOrbitConversation([]);
    showOrbitQuickPrompts();
    updateOrbitTypingState();
    setOrbitResponseStatus("Ready");

    orbitInitialized = true;

    window.dispatchEvent(
        new CustomEvent("orbit:ready")
    );
}

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

    getAuthToken:
        getOrbitAuthToken,

    logoutUser:
        logoutOrbitUser,

    getMemory:
        () => [...orbitUserMemory],

    remember:
        rememberOrbitDetail,

    getSettings:
        getOrbitSettings
};

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbit,
        { once: true }
    );
} else {
    initializeOrbit();
}