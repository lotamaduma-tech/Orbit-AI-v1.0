/* Orbit AI */

"use strict";

/* Config */
const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";

const ORBIT_HISTORY_LIMIT = 30;
const ORBIT_MEMORY_LIMIT = 50;
const ORBIT_REQUEST_TIMEOUT = 45000;

const ORBIT_USER_ID_KEY = "orbit-user-id";
const ORBIT_MEMORY_CACHE_KEY = "orbit-memory-cache";
const ORBIT_CONVERSATION_KEY = "orbit-conversation-history";
const ORBIT_ACTIVE_CHAT_KEY = "orbit-active-chat";

/* State */
let orbitConversationHistory = [];
let orbitUserMemory = [];
let orbitIsWaiting = false;
let orbitInitialized = false;

/* User ID */
function getOrbitUserId() {
    try {
        let userId = localStorage.getItem(ORBIT_USER_ID_KEY);

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
                Math.random().toString(36).substring(2, 12);
        }

        localStorage.setItem(ORBIT_USER_ID_KEY, userId);

        return userId;
    } catch (error) {
        console.error("Orbit user ID error:", error);

        return "orbit-temporary-" + Date.now();
    }
}

const ORBIT_USER_ID = getOrbitUserId();

/* DOM */
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

/* Memory */
function loadOrbitMemory() {
    try {
        const saved = localStorage.getItem(
            ORBIT_MEMORY_CACHE_KEY
        );

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
                .map(item => item.trim())
                .slice(-ORBIT_MEMORY_LIMIT)
            : [];
    } catch (error) {
        console.error("Orbit memory load error:", error);
        orbitUserMemory = [];
    }
}

function saveOrbitMemoryCache() {
    try {
        localStorage.setItem(
            ORBIT_MEMORY_CACHE_KEY,
            JSON.stringify(orbitUserMemory)
        );
    } catch (error) {
        console.error("Orbit memory save error:", error);
    }
}

function rememberOrbitDetail(detail) {
    if (!detail) {
        return;
    }

    const cleanDetail = String(detail).trim();

    if (!cleanDetail) {
        return;
    }

    const exists = orbitUserMemory.some(
        item =>
            String(item).toLowerCase() ===
            cleanDetail.toLowerCase()
    );

    if (exists) {
        return;
    }

    orbitUserMemory.push(cleanDetail);

    orbitUserMemory =
        orbitUserMemory.slice(-ORBIT_MEMORY_LIMIT);

    saveOrbitMemoryCache();
}

function detectOrbitMemory(message) {
    if (!message) {
        return;
    }

    const text = String(message).trim();

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

    const ageMatch = text.match(
        /(?:i am|i'm|im)\s+(\d{1,3})(?:\s+years?\s+old)?/i
    );

    if (ageMatch) {
        rememberOrbitDetail(
            `The user is ${ageMatch[1]} years old.`
        );
    }

    const schoolMatch = text.match(
        /(?:i study at|i attend|my school is|i go to)\s+(.+)/i
    );

    if (schoolMatch) {
        rememberOrbitDetail(
            `The user's school is ${schoolMatch[1].trim()}.`
        );
    }

    const courseMatch = text.match(
        /(?:my course is|i am studying)\s+(.+)/i
    );

    if (courseMatch) {
        rememberOrbitDetail(
            `The user's course is ${courseMatch[1].trim()}.`
        );
    }

    const locationMatch = text.match(
        /(?:i live in|i'm from|i am from|i stay in)\s+(.+)/i
    );

    if (locationMatch) {
        rememberOrbitDetail(
            `The user is from/lives in ${locationMatch[1].trim()}.`
        );
    }
}

function getOrbitMemoryContext() {
    return orbitUserMemory.length
        ? orbitUserMemory.join("\n")
        : "";
}

/* Conversation */
function loadOrbitConversation() {
    try {
        const saved = localStorage.getItem(
            ORBIT_CONVERSATION_KEY
        );

        if (!saved) {
            orbitConversationHistory = [];
            return;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            orbitConversationHistory = [];
            return;
        }

        orbitConversationHistory = parsed
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
    } catch (error) {
        console.error(
            "Orbit conversation load error:",
            error
        );

        orbitConversationHistory = [];
    }
}

function saveOrbitConversation() {
    try {
        localStorage.setItem(
            ORBIT_CONVERSATION_KEY,
            JSON.stringify(orbitConversationHistory)
        );
    } catch (error) {
        console.error(
            "Orbit conversation save error:",
            error
        );
    }
}

function saveOrbitHistoryMessage(role, content) {
    if (
        !content ||
        typeof content !== "string"
    ) {
        return;
    }

    if (
        role !== "user" &&
        role !== "assistant"
    ) {
        return;
    }

    const cleanContent = content.trim();

    if (!cleanContent) {
        return;
    }

    orbitConversationHistory.push({
        role,
        content: cleanContent
    });

    orbitConversationHistory =
        orbitConversationHistory.slice(
            -ORBIT_HISTORY_LIMIT
        );

    saveOrbitConversation();
}

function getOrbitHistoryForAPI() {
    return orbitConversationHistory
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
        .slice(-ORBIT_HISTORY_LIMIT);
}

function clearOrbitStoredConversation() {
    try {
        localStorage.removeItem(
            ORBIT_CONVERSATION_KEY
        );

        localStorage.removeItem(
            ORBIT_ACTIVE_CHAT_KEY
        );
    } catch (error) {
        console.error(
            "Orbit storage clear error:",
            error
        );
    }
}

function hasOrbitSavedConversation() {
    return (
        Array.isArray(orbitConversationHistory) &&
        orbitConversationHistory.length > 0
    );
}

function saveOrbitRecentChat(message) {
    if (
        !message ||
        typeof message !== "string"
    ) {
        return;
    }

    if (
        window.OrbitRecentChats &&
        typeof window.OrbitRecentChats.add === "function"
    ) {
        window.OrbitRecentChats.add(
            message.trim()
        );
    }
}

/* Formatting */
function escapeOrbitHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isValidOrbitURL(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );
    } catch {
        return false;
    }
}

function getOrbitCopyIcon() {
    return `
        <svg
            class="orbit-copy-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
            ></rect>

            <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            ></path>
        </svg>
    `;
}

function getOrbitExternalLinkIcon() {
    return `
        <svg
            class="orbit-external-link-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <path d="M14 3h7v7"></path>
            <path d="M10 14L21 3"></path>
            <path
                d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"
            ></path>
        </svg>
    `;
}

function createOrbitLinkHTML(url, label = null) {
    if (!isValidOrbitURL(url)) {
        return escapeOrbitHTML(label || url);
    }

    const safeURL = escapeOrbitHTML(url);
    const safeLabel = escapeOrbitHTML(label || url);

    return `
        <span class="orbit-link-wrapper">
            <a
                class="orbit-link"
                href="${safeURL}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${safeLabel}
            </a>

            <button
                type="button"
                class="orbit-link-action orbit-open-link"
                data-orbit-url="${safeURL}"
                title="Open link"
                aria-label="Open link"
            >
                ${getOrbitExternalLinkIcon()}
            </button>

            <button
                type="button"
                class="orbit-link-action orbit-copy-link"
                data-orbit-url="${safeURL}"
                title="Copy link"
                aria-label="Copy link"
            >
                ${getOrbitCopyIcon()}
            </button>
        </span>
    `;
}

function formatOrbitResponse(text) {
    if (!text) {
        return "";
    }

    let source = String(text);

    const codeBlocks = [];
    const inlineCodeBlocks = [];
    const linkTokens = [];

    source = source.replace(
        /```([a-zA-Z0-9_+#.-]*)\n?([\s\S]*?)```/g,
        (match, language, code) => {
            const index = codeBlocks.length;

            codeBlocks.push({
                language: language
                    ? language.trim().toLowerCase()
                    : "",
                code: code
                    .replace(/^\n/, "")
                    .replace(/\n$/, "")
            });

            return `___ORBIT_CODE_${index}___`;
        }
    );

    source = source.replace(
        /`([^`\n]+)`/g,
        (match, code) => {
            const index = inlineCodeBlocks.length;

            inlineCodeBlocks.push(`
                <code class="orbit-inline-code">
                    ${escapeOrbitHTML(code)}
                </code>
            `);

            return `___ORBIT_INLINE_${index}___`;
        }
    );

    source = source.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        (match, label, url) => {
            if (!isValidOrbitURL(url)) {
                return escapeOrbitHTML(match);
            }

            const index = linkTokens.length;

            linkTokens.push(
                createOrbitLinkHTML(url, label)
            );

            return `___ORBIT_LINK_${index}___`;
        }
    );

    source = source.replace(
        /(https?:\/\/[^\s<>"'`]+[^\s<>"'.,!?;:)\\\]}])/gi,
        url => {
            if (!isValidOrbitURL(url)) {
                return escapeOrbitHTML(url);
            }

            const index = linkTokens.length;

            linkTokens.push(
                createOrbitLinkHTML(url)
            );

            return `___ORBIT_LINK_${index}___`;
        }
    );

    let formatted = escapeOrbitHTML(source);

    formatted = formatted.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );

    formatted = formatted.replace(
        /(^|[^\*])\*([^\*\n]+)\*(?!\*)/gm,
        "$1<em>$2</em>"
    );

    formatted = formatted.replace(
        /^### (.*?)$/gm,
        "<h4>$1</h4>"
    );

    formatted = formatted.replace(
        /^## (.*?)$/gm,
        "<h3>$1</h3>"
    );

    formatted = formatted.replace(
        /^# (.*?)$/gm,
        "<h2>$1</h2>"
    );

    formatted = formatted.replace(
        /^[•-]\s+(.*?)$/gm,
        "<li>$1</li>"
    );

    formatted = formatted.replace(
        /^\d+\.\s+(.*?)$/gm,
        "<li>$1</li>"
    );

    formatted = formatted.replace(
        /(<li>.*?<\/li>\s*)+/g,
        match => `<ul>${match}</ul>`
    );

    formatted = formatted.replace(
        /\n/g,
        "<br>"
    );

    inlineCodeBlocks.forEach(
        (block, index) => {
            formatted = formatted.replace(
                `___ORBIT_INLINE_${index}___`,
                block
            );
        }
    );

    linkTokens.forEach(
        (linkHTML, index) => {
            formatted = formatted.replace(
                `___ORBIT_LINK_${index}___`,
                linkHTML
            );
        }
    );

    codeBlocks.forEach(
        (block, index) => {
            const language = block.language
                ? block.language.toUpperCase()
                : "CODE";

            const codeHTML = `
                <div
                    class="orbit-code-container"
                    data-orbit-code-block
                >
                    <div class="orbit-code-header">
                        <span class="orbit-code-language">
                            ${escapeOrbitHTML(language)}
                        </span>

                        <button
                            type="button"
                            class="orbit-code-copy"
                            data-orbit-copy-code
                            title="Copy code"
                            aria-label="Copy code"
                        >
                            ${getOrbitCopyIcon()}
                            Copy
                        </button>
                    </div>

                    <pre class="orbit-code-block"><code>${escapeOrbitHTML(
                block.code
            )}</code></pre>
                </div>
            `;

            formatted = formatted.replace(
                `___ORBIT_CODE_${index}___`,
                codeHTML
            );
        }
    );

    return formatted;
}

/* Messages */
function createOrbitConversationGroup() {
    const group =
        document.createElement("div");

    group.className =
        "conversation-group";

    group.dataset.orbitConversation =
        "true";

    return group;
}

function addOrbitMessage(
    text,
    sender = "orbit",
    group = null
) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return null;
    }

    const conversationGroup =
        group ||
        createOrbitConversationGroup();

    if (!group) {
        chatWindow.appendChild(
            conversationGroup
        );
    }

    const row =
        document.createElement("div");

    row.className =
        `message-row ${sender}`;

    row.dataset.sender =
        sender;

    const message =
        document.createElement("div");

    message.className =
        `message ${sender}`;

    if (sender === "user") {
        message.textContent =
            String(text ?? "");
    } else {
        message.innerHTML =
            formatOrbitResponse(text);
    }

    row.appendChild(message);

    conversationGroup.appendChild(row);

    scrollOrbitChat("auto");

    return conversationGroup;
}

function renderOrbitConversation(messages) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    const chatIntro =
        document.getElementById("chat-intro");

    chatWindow
        .querySelectorAll(
            ".conversation-group, #orbit-typing"
        )
        .forEach(element => {
            element.remove();
        });

    if (
        !Array.isArray(messages) ||
        !messages.length
    ) {
        if (chatIntro) {
            chatIntro.classList.remove(
                "is-hidden"
            );
        }

        return;
    }

    if (chatIntro) {
        chatIntro.classList.add(
            "is-hidden"
        );
    }

    const group =
        createOrbitConversationGroup();

    chatWindow.appendChild(group);

    messages.forEach(item => {
        if (
            !item ||
            typeof item.content !== "string"
        ) {
            return;
        }

        addOrbitMessage(
            item.content,
            item.role === "user"
                ? "user"
                : "orbit",
            group
        );
    });

    scrollOrbitChat("auto");
}

function restoreOrbitConversation() {
    if (!hasOrbitSavedConversation()) {
        return;
    }

    renderOrbitConversation(
        orbitConversationHistory
    );
}

function loadOrbitSelectedConversation(
    messages,
    chatId = null
) {
    if (orbitIsWaiting) {
        return false;
    }

    const cleanMessages =
        Array.isArray(messages)
            ? messages
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
                .slice(-ORBIT_HISTORY_LIMIT)
            : [];

    orbitConversationHistory =
        cleanMessages;

    saveOrbitConversation();

    if (chatId) {
        try {
            localStorage.setItem(
                ORBIT_ACTIVE_CHAT_KEY,
                String(chatId)
            );
        } catch (error) {
            console.warn(
                "Orbit active chat error:",
                error
            );
        }
    }

    renderOrbitConversation(
        orbitConversationHistory
    );

    const { commandInput } =
        getOrbitElements();

    if (commandInput) {
        commandInput.value = "";

        commandInput.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        commandInput.focus();
    }

    return true;
}

/* Typing */
function showOrbitTyping() {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    hideOrbitTyping();

    const row =
        document.createElement("div");

    row.id =
        "orbit-typing";

    row.className =
        "message-row orbit typing-row";

    row.setAttribute(
        "aria-live",
        "polite"
    );

    const message =
        document.createElement("div");

    message.className =
        "message orbit typing-message";

    message.innerHTML = `
        <span
            class="orbit-thinking"
            role="status"
            aria-label="Orbit is thinking"
        >
            <span class="orbit-thinking-core"></span>
            <span class="orbit-thinking-ring"></span>
            <span class="orbit-thinking-dot orbit-thinking-dot-one"></span>
            <span class="orbit-thinking-dot orbit-thinking-dot-two"></span>
        </span>

        <span class="orbit-typing-text">
            Orbit is thinking...
        </span>
    `;

    row.appendChild(message);

    chatWindow.appendChild(row);

    scrollOrbitChat("smooth");
}

function hideOrbitTyping() {
    const typing =
        document.getElementById(
            "orbit-typing"
        );

    if (typing) {
        typing.remove();
    }
}

/* Clipboard */
async function copyOrbitText(text) {
    const value =
        String(text ?? "");

    if (!value) {
        return false;
    }

    try {
        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            await navigator.clipboard.writeText(
                value
            );

            return true;
        }
    } catch (error) {
        console.warn(
            "Orbit clipboard failed:",
            error
        );
    }

    try {
        const textarea =
            document.createElement("textarea");

        textarea.value =
            value;

        textarea.style.position =
            "fixed";

        textarea.style.left =
            "-9999px";

        textarea.style.top =
            "-9999px";

        document.body.appendChild(
            textarea
        );

        textarea.select();

        const copied =
            document.execCommand("copy");

        textarea.remove();

        return copied;
    } catch (error) {
        console.error(
            "Orbit copy error:",
            error
        );

        return false;
    }
}

function updateOrbitCopyButton(
    button,
    success
) {
    if (!button) {
        return;
    }

    if (success) {
        button.innerHTML =
            `<span class="orbit-copy-success">✓</span> Copied`;

        button.classList.add("copied");

        setTimeout(() => {
            if (!button.isConnected) {
                return;
            }

            button.innerHTML =
                getOrbitCopyIcon() + "Copy";

            button.classList.remove(
                "copied"
            );
        }, 1600);
    }
}

function setupOrbitChatActions() {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    if (
        chatWindow.dataset.orbitActionsReady ===
        "true"
    ) {
        return;
    }

    chatWindow.dataset.orbitActionsReady =
        "true";

    chatWindow.addEventListener(
        "click",
        async event => {
            const copyCodeButton =
                event.target.closest(
                    "[data-orbit-copy-code]"
                );

            const copyLinkButton =
                event.target.closest(
                    ".orbit-copy-link"
                );

            const openLinkButton =
                event.target.closest(
                    ".orbit-open-link"
                );

            if (copyCodeButton) {
                const container =
                    copyCodeButton.closest(
                        "[data-orbit-code-block]"
                    );

                const codeElement =
                    container?.querySelector(
                        "pre code"
                    );

                if (!codeElement) {
                    return;
                }

                const success =
                    await copyOrbitText(
                        codeElement.textContent
                    );

                updateOrbitCopyButton(
                    copyCodeButton,
                    success
                );

                return;
            }

            if (copyLinkButton) {
                const url =
                    copyLinkButton.dataset.orbitUrl;

                if (!url) {
                    return;
                }

                const success =
                    await copyOrbitText(url);

                if (success) {
                    copyLinkButton.innerHTML =
                        "✓";

                    copyLinkButton.classList.add(
                        "copied"
                    );

                    setTimeout(() => {
                        if (
                            !copyLinkButton.isConnected
                        ) {
                            return;
                        }

                        copyLinkButton.innerHTML =
                            getOrbitCopyIcon();

                        copyLinkButton.classList.remove(
                            "copied"
                        );
                    }, 1600);
                }

                return;
            }

            if (openLinkButton) {
                const url =
                    openLinkButton.dataset.orbitUrl;

                if (
                    url &&
                    isValidOrbitURL(url)
                ) {
                    window.open(
                        url,
                        "_blank",
                        "noopener,noreferrer"
                    );
                }
            }
        }
    );
}

function setupOrbitQuickPrompts() {
    const prompts =
        document.querySelectorAll(
            ".quick-prompt"
        );

    prompts.forEach(button => {
        if (
            button.dataset.orbitPromptReady ===
            "true"
        ) {
            return;
        }

        button.dataset.orbitPromptReady =
            "true";

        button.addEventListener(
            "click",
            event => {
                event.preventDefault();

                const prompt =
                    button.dataset.prompt;

                if (
                    !prompt ||
                    orbitIsWaiting
                ) {
                    return;
                }

                orbitSendMessage(prompt);
            }
        );
    });
}

/* Sending */
async function orbitSendMessage(
    suppliedMessage = null
) {
    const {
        commandInput,
        sendButton
    } = getOrbitElements();

    if (!commandInput) {
        console.warn(
            "Orbit input element not found."
        );

        return false;
    }

    if (orbitIsWaiting) {
        return false;
    }

    const message =
        suppliedMessage !== null
            ? String(suppliedMessage).trim()
            : String(commandInput.value || "").trim();

    if (!message) {
        return false;
    }

    saveOrbitRecentChat(message);

    try {
        localStorage.setItem(
            ORBIT_ACTIVE_CHAT_KEY,
            "true"
        );
    } catch (error) {
        console.warn(
            "Orbit active chat error:",
            error
        );
    }

    detectOrbitMemory(message);

    const historyForAPI =
        getOrbitHistoryForAPI();

    if (suppliedMessage === null) {
        commandInput.value = "";

        commandInput.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );
    }

    orbitIsWaiting = true;

    commandInput.disabled = true;

    if (sendButton) {
        sendButton.disabled = true;
    }

    const chatIntro =
        document.getElementById(
            "chat-intro"
        );

    if (chatIntro) {
        chatIntro.classList.add(
            "is-hidden"
        );
    }

    const conversationGroup =
        createOrbitConversationGroup();

    const { chatWindow } =
        getOrbitElements();

    if (chatWindow) {
        chatWindow.appendChild(
            conversationGroup
        );
    }

    addOrbitMessage(
        message,
        "user",
        conversationGroup
    );

    showOrbitTyping();

    const startTime =
        performance.now();

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(() => {
            controller.abort();
        }, ORBIT_REQUEST_TIMEOUT);

    try {
        const response =
            await fetch(
                ORBIT_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: message,

                        history:
                            historyForAPI,

                        memory:
                            getOrbitMemoryContext(),

                        userId:
                            ORBIT_USER_ID
                    }),

                    signal:
                        controller.signal,

                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            let errorMessage =
                `Server returned ${response.status}`;

            try {
                const errorData =
                    await response.json();

                if (
                    errorData &&
                    typeof errorData.error === "string"
                ) {
                    errorMessage =
                        errorData.error;
                }
            } catch {
                errorMessage =
                    `Server returned ${response.status}`;
            }

            throw new Error(errorMessage);
        }

        const data =
            await response.json();

        const reply =
            data?.reply ??
            data?.response ??
            data?.message;

        if (
            typeof reply !== "string" ||
            !reply.trim()
        ) {
            throw new Error(
                "Orbit returned an empty response."
            );
        }

        hideOrbitTyping();

        if (Array.isArray(data.memory)) {
            orbitUserMemory =
                data.memory
                    .filter(
                        item =>
                            typeof item === "string" &&
                            item.trim()
                    )
                    .map(item => item.trim())
                    .slice(-ORBIT_MEMORY_LIMIT);

            saveOrbitMemoryCache();
        } else if (
            typeof data.memory === "string" &&
            data.memory.trim()
        ) {
            orbitUserMemory =
                data.memory
                    .split("\n")
                    .map(item => item.trim())
                    .filter(Boolean)
                    .slice(-ORBIT_MEMORY_LIMIT);

            saveOrbitMemoryCache();
        }

        addOrbitMessage(
            reply,
            "orbit",
            conversationGroup
        );

        saveOrbitHistoryMessage(
            "user",
            message
        );

        saveOrbitHistoryMessage(
            "assistant",
            reply
        );

        const elapsed =
            performance.now() -
            startTime;

        const responseTime =
            document.getElementById(
                "response-time"
            );

        if (responseTime) {
            responseTime.textContent =
                `${(elapsed / 1000).toFixed(1)}s`;
        }

        return true;
    } catch (error) {
        console.error(
            "Orbit AI request failed:",
            error
        );

        hideOrbitTyping();

        let errorMessage =
            error?.message ||
            "Unable to connect to Orbit.";

        if (
            error?.name === "AbortError"
        ) {
            errorMessage =
                "Orbit took too long to respond. Please try again.";
        }

        addOrbitMessage(
            `I couldn't complete that request. ${errorMessage}`,
            "orbit",
            conversationGroup
        );

        const responseTime =
            document.getElementById(
                "response-time"
            );

        if (responseTime) {
            responseTime.textContent =
                "Connection error";
        }

        return false;
    } finally {
        clearTimeout(timeoutId);

        orbitIsWaiting = false;

        commandInput.disabled = false;

        if (sendButton) {
            sendButton.disabled = false;
        }

        commandInput.focus();
    }
}

function setupOrbitKeyboard() {
    const { commandInput } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    if (commandInput.dataset.orbitKeyboardReady === "true") {
        return;
    }

    commandInput.dataset.orbitKeyboardReady = "true";

    commandInput.addEventListener("keydown", event => {
        if (event.key !== "Enter") {
            return;
        }

        if (event.shiftKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (orbitIsWaiting) {
            return;
        }

        orbitSendMessage();
    });
}

function setupOrbitSendButton() {
    const sendButton = document.getElementById("send-btn");

    if (!sendButton) {
        console.error("Orbit: Send button #send-btn not found in HTML.");
        return;
    }

    // Remove any cloned listeners to reset
    const newSendBtn = sendButton.cloneNode(true);
    sendButton.parentNode.replaceChild(newSendBtn, sendButton);

    newSendBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (orbitIsWaiting) return;

        orbitSendMessage();
    });
}

function setupOrbitForm() {
    const { commandForm } = getOrbitElements();

    if (!commandForm) {
        return;
    }

    if (commandForm.dataset.orbitFormReady === "true") {
        return;
    }

    commandForm.dataset.orbitFormReady = "true";

    commandForm.addEventListener("submit", event => {
        event.preventDefault();

        if (orbitIsWaiting) {
            return;
        }

        orbitSendMessage();
    });
}

/* New Chat */
function clearOrbitConversation() {
    if (orbitIsWaiting) {
        return;
    }

    orbitConversationHistory = [];

    clearOrbitStoredConversation();

    const {
        chatWindow,
        commandInput
    } = getOrbitElements();

    if (chatWindow) {
        chatWindow
            .querySelectorAll(
                ".conversation-group, #orbit-typing"
            )
            .forEach(element => {
                element.remove();
            });

        const chatIntro =
            document.getElementById(
                "chat-intro"
            );

        if (chatIntro) {
            chatIntro.classList.remove(
                "is-hidden"
            );
        }
    }

    if (commandInput) {
        commandInput.value = "";

        commandInput.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        commandInput.focus();
    }

    const responseTime =
        document.getElementById(
            "response-time"
        );

    if (responseTime) {
        responseTime.textContent =
            "Ready | Orbit AI can make mistakes. Check for important details.";
    }
}

function startOrbitNewChat() {
    clearOrbitConversation();
}

/* Initialization */
function initializeOrbitAI() {
    if (orbitInitialized) {
        return;
    }

    const {
        chatWindow,
        commandInput,
        sendButton
    } = getOrbitElements();

    if (!commandInput) {
        console.warn(
            "Orbit AI: #command-input was not found."
        );

        return;
    }

    loadOrbitMemory();
    loadOrbitConversation();

    orbitIsWaiting = false;

    hideOrbitTyping();

    if (chatWindow) {
        restoreOrbitConversation();
    }

    commandInput.disabled = false;

    if (sendButton) {
        sendButton.disabled = false;
        sendButton.setAttribute("type", "button");
    }

    setupOrbitSendButton();
    setupOrbitKeyboard();
    setupOrbitForm();
    setupOrbitChatActions();
    setupOrbitQuickPrompts();

    orbitInitialized = true;

    console.log("Orbit AI initialized.");
}

/* Public API */
window.OrbitAI = {
    sendMessage: orbitSendMessage,

    clearConversation:
        clearOrbitConversation,

    newChat:
        startOrbitNewChat,

    loadConversation:
        loadOrbitSelectedConversation,

    renderConversation:
        renderOrbitConversation,

    getConversation: () => [
        ...orbitConversationHistory
    ],

    getMemory:
        getOrbitMemoryContext,

    getUserId: () =>
        ORBIT_USER_ID,

    formatResponse:
        formatOrbitResponse,

    isWaiting: () =>
        orbitIsWaiting,

    initialize:
        initializeOrbitAI
};

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitAI,
        { once: true }
    );
} else {
    initializeOrbitAI();
}