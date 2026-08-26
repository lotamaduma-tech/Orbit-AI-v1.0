"use strict";

/* Orbit AI chat engine */

const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";

const ORBIT_FALLBACK_API_URL =
    window.ORBIT_FALLBACK_API_URL || "";

const ORBIT_HISTORY_LIMIT = 100;
const ORBIT_MEMORY_LIMIT = 100;
const ORBIT_CONTEXT_MESSAGE_LIMIT = 40;
const ORBIT_CONTEXT_CHARACTER_LIMIT = 120000;
const ORBIT_REQUEST_TIMEOUT = 90000;
const ORBIT_MAX_TOKENS = 16800;

const ORBIT_USER_ID_KEY = "orbit-user-id";
const ORBIT_MEMORY_CACHE_KEY = "orbit-memory-cache";
const ORBIT_RECENT_CHATS_KEY = "orbit-recent-chats";
const ORBIT_ACTIVE_CHAT_KEY = "orbit-active-chat";

const ORBIT_SYSTEM_PROMPT = `
You are Orbit AI, a highly capable general-purpose AI assistant and senior software engineer.

Your highest priority for software-engineering tasks is to produce accurate, reliable, maintainable, secure, production-quality solutions while preserving the user's existing architecture and functionality.

SOFTWARE ENGINEERING BEHAVIOR

1. Understand before changing.
- Carefully analyze the user's existing code before proposing modifications.
- Treat supplied code as part of an existing codebase, not as an isolated snippet.
- Identify how files, functions, APIs, state, authentication, databases, and UI components depend on one another.
- Do not make assumptions about architecture when the user's code already provides the necessary information.

2. Preserve existing functionality.
- Do not unnecessarily rewrite working code.
- Preserve existing features, naming conventions, DOM structure, APIs, technologies, and project architecture unless a change is required.
- Never remove functionality merely to simplify an implementation.
- When modifying one part of a system, consider what other parts depend on it.

3. Think across the entire stack.
When relevant, reason about:
- HTML
- CSS
- JavaScript
- browser behavior
- frontend state
- APIs
- Express
- Node.js
- authentication
- Supabase
- PostgreSQL
- external APIs
- deployment environments
- Render
- Vercel
- security
- accessibility
- responsive design
- performance
- error handling

4. Analyze errors before fixing them.
- Identify the likely root cause.
- Explain why the error occurs.
- Distinguish the actual cause from symptoms.
- Then provide the appropriate fix.
- Do not randomly change unrelated code in an attempt to make an error disappear.

5. Maintain compatibility.
- When changing a function, check related callers and consumers.
- When changing an API request or response, consider both frontend and backend.
- When changing authentication, consider token handling, session state, authorization, and database identity.
- When changing database behavior, consider existing data and queries.

6. Handle large codebases intelligently.
- Break very large tasks into logical stages when necessary.
- Keep related changes together.
- Avoid wasting output on unchanged code.
- If only a small section needs modification, prefer a precise patch or clearly identified replacement section.
- If a major architectural change affects the file substantially, provide the complete replacement file when appropriate.
- Never truncate important code simply because the requested file is large.

7. Choose PATCH versus FULL FILE intelligently.
Use a focused patch when:
- only a few lines or functions need changing;
- the surrounding architecture should remain untouched;
- providing the entire file would create unnecessary duplication.

Use a complete replacement file when:
- the user explicitly requests the complete file;
- the changes affect many interconnected sections;
- the file would be difficult to update safely through isolated snippets;
- consistency between related functions is important.

8. Code quality.
Prefer:
- modern JavaScript;
- clear naming;
- maintainable functions;
- defensive programming;
- secure handling of user data;
- proper error handling;
- accessible UI behavior;
- responsive behavior;
- browser compatibility;
- reasonable performance;
- minimal unnecessary dependencies.

9. Security.
Never expose secrets in frontend code.
Do not recommend trusting browser-generated identity when authenticated authorization is required.
Do not bypass authentication or authorization checks.
Treat external input as untrusted.
Consider XSS, injection, token exposure, CORS, and authorization boundaries where relevant.

10. Conversation awareness.
- Use relevant previous messages and code as context.
- Maintain consistency with decisions already made in the conversation.
- Do not contradict previously established architecture without explaining why a change is necessary.
- When earlier code is available, use it rather than inventing a replacement architecture.

11. Response quality.
- Give direct answers.
- Explain important reasoning when it helps the user understand the implementation.
- Avoid unnecessary repetition.
- For coding tasks, provide complete working code when requested.
- Use Markdown code blocks with the correct language identifier.
- Use Markdown tables when useful.
- When providing GitHub repositories or GitHub files, provide clickable GitHub links.

12. Large coding tasks.
For complex requests:
- first understand the requested outcome;
- identify affected components;
- identify dependencies;
- determine whether the change is a patch or full replacement;
- consider edge cases;
- preserve unrelated functionality;
- then produce the implementation.

Do not intentionally omit important code, silently simplify requirements, or replace working architecture without justification.

You are not merely a code generator. Act like a senior engineer reviewing and improving an existing production codebase.
`;


/* State */

let orbitConversationHistory = [];
let orbitUserMemory = [];
let orbitIsWaiting = false;
let orbitInitialized = false;
let orbitAbortController = null;


/* User identity */

function getOrbitUserId() {
    try {
        let userId =
            localStorage.getItem(
                ORBIT_USER_ID_KEY
            );

        if (userId) {
            return userId;
        }

        if (
            window.crypto &&
            typeof window.crypto.randomUUID ===
            "function"
        ) {
            userId =
                window.crypto.randomUUID();
        } else {
            userId =
                "orbit-" +
                Date.now().toString(36) +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 12);
        }

        localStorage.setItem(
            ORBIT_USER_ID_KEY,
            userId
        );

        return userId;
    } catch (error) {
        console.error(
            "Orbit user ID error:",
            error
        );

        return "orbit-temporary-" + Date.now();
    }
}

let ORBIT_USER_ID = getOrbitUserId();


/* Supabase auth */

function getOrbitSupabaseClient() {
    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth?.getSession ===
        "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.auth?.getSession ===
        "function"
    ) {
        return window.supabase;
    }

    return null;
}

async function getOrbitAuthSession() {
    const supabase =
        getOrbitSupabaseClient();

    if (!supabase) {
        return null;
    }

    try {
        const {
            data,
            error
        } =
            await supabase.auth.getSession();

        if (error) {
            console.warn(
                "Orbit Supabase session error:",
                error
            );

            return null;
        }

        return data?.session || null;
    } catch (error) {
        console.warn(
            "Orbit authentication error:",
            error
        );

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


/* DOM */

function getOrbitElements() {
    return {
        chatWindow:
            document.getElementById(
                "chat-window"
            ),

        commandInput:
            document.getElementById(
                "command-input"
            ),

        sendButton:
            document.getElementById(
                "send-btn"
            ),

        commandForm:
            document.getElementById(
                "command-form"
            ) ||
            document.querySelector(
                ".command-area form"
            ) ||
            document.querySelector(
                ".command-box form"
            )
    };
}


/* Input helpers */

function clearOrbitInput() {
    const {
        commandInput
    } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    commandInput.value = "";

    commandInput.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );
}

function focusOrbitInput() {
    const {
        commandInput
    } = getOrbitElements();

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

function hideOrbitQuickPrompts() {
    const selectors = [
        ".quick-prompts",
        ".quick-prompt-container",
        ".quick-prompt-section",
        ".quick-prompts-container",
        ".suggestion-prompts"
    ];

    selectors.forEach(selector => {
        document
            .querySelectorAll(selector)
            .forEach(element => {
                element.classList.add(
                    "is-hidden"
                );
            });
    });

    document
        .querySelectorAll(".quick-prompt")
        .forEach(button => {
            button.classList.add(
                "is-hidden"
            );
        });
}

function showOrbitQuickPrompts() {
    const selectors = [
        ".quick-prompts",
        ".quick-prompt-container",
        ".quick-prompt-section",
        ".quick-prompts-container",
        ".suggestion-prompts"
    ];

    selectors.forEach(selector => {
        document
            .querySelectorAll(selector)
            .forEach(element => {
                element.classList.remove(
                    "is-hidden"
                );
            });
    });

    document
        .querySelectorAll(".quick-prompt")
        .forEach(button => {
            button.classList.remove(
                "is-hidden"
            );
        });
}

function triggerOrbitInputUpdate() {
    const {
        commandInput
    } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    commandInput.dispatchEvent(
        new Event("input", {
            bubbles: true
        })
    );

    commandInput.dispatchEvent(
        new Event("change", {
            bubbles: true
        })
    );
}


/* Scrolling */

function scrollOrbitChat(
    behavior = "auto"
) {
    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    requestAnimationFrame(() => {
        chatWindow.scrollTo({
            top:
                chatWindow.scrollHeight,
            behavior
        });
    });
}

function scrollToOrbitResponse(
    row,
    behavior = "smooth"
) {
    const {
        chatWindow
    } = getOrbitElements();

    if (
        !chatWindow ||
        !row
    ) {
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
                top:
                    Math.max(
                        0,
                        target
                    ),
                behavior
            });
        });
    });
}


/* Memory */

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
                            typeof item ===
                            "string" &&
                            item.trim()
                    )
                    .map(item =>
                        item.trim()
                    )
                    .slice(
                        -ORBIT_MEMORY_LIMIT
                    )
                : [];
    } catch (error) {
        console.error(
            "Orbit memory load error:",
            error
        );

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
    } catch (error) {
        console.error(
            "Orbit memory save error:",
            error
        );
    }
}

function rememberOrbitDetail(
    detail
) {
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
                String(item).toLowerCase() ===
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

function detectOrbitMemory(
    message
) {
    if (!message) {
        return;
    }

    const text =
        String(message).trim();

    if (!text) {
        return;
    }

    const nameMatch =
        text.match(
            /(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i
        );

    if (nameMatch) {
        rememberOrbitDetail(
            `The user's name is ${nameMatch[1].trim()}.`
        );
    }

    const ageMatch =
        text.match(
            /(?:i am|i'm|im)\s+(\d{1,3})(?:\s+years?\s+old)?/i
        );

    if (ageMatch) {
        rememberOrbitDetail(
            `The user is ${ageMatch[1]} years old.`
        );
    }

    const schoolMatch =
        text.match(
            /(?:i study at|i attend|my school is|i go to)\s+(.+)/i
        );

    if (schoolMatch) {
        rememberOrbitDetail(
            `The user's school is ${schoolMatch[1].trim()}.`
        );
    }

    const courseMatch =
        text.match(
            /(?:my course is|i am studying)\s+(.+)/i
        );

    if (courseMatch) {
        rememberOrbitDetail(
            `The user's course is ${courseMatch[1].trim()}.`
        );
    }

    const locationMatch =
        text.match(
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


/* Messages */

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
                typeof item.content ===
                "string" &&
                item.content.trim()
        )
        .map(item => ({
            role:
                item.role,
            content:
                item.content.trim()
        }))
        .slice(
            -ORBIT_HISTORY_LIMIT
        );
}


/* Coding classification */

function classifyOrbitRequest(
    message
) {
    const text =
        String(message || "")
            .toLowerCase();

    const codingSignals = [
        "code",
        "coding",
        "javascript",
        "typescript",
        "html",
        "css",
        "node",
        "express",
        "react",
        "python",
        "java",
        "c++",
        "c#",
        "php",
        "sql",
        "supabase",
        "mongodb",
        "postgres",
        "api",
        "backend",
        "frontend",
        "function",
        "class",
        "bug",
        "error",
        "debug",
        "debugging",
        "database",
        "authentication",
        "login",
        "signup",
        "server",
        "github",
        "vercel",
        "render",
        "deploy",
        "deployment",
        "repository",
        "repo",
        "component",
        "script",
        "stylesheet",
        "schema"
    ];

    const largeTaskSignals = [
        "entire",
        "whole",
        "complete",
        "full",
        "rewrite",
        "refactor",
        "architecture",
        "system",
        "codebase",
        "project",
        "across",
        "multiple files",
        "all files",
        "large",
        "700-line",
        "500-line",
        "1000-line",
        "authentication system",
        "database system"
    ];

    const debuggingSignals = [
        "error",
        "bug",
        "broken",
        "not working",
        "doesn't work",
        "doesnt work",
        "failed",
        "failure",
        "exception",
        "undefined",
        "null",
        "crash",
        "issue"
    ];

    const explanationSignals = [
        "what is",
        "what does",
        "explain",
        "how does",
        "why does",
        "meaning",
        "difference between"
    ];

    const codingScore =
        codingSignals.reduce(
            (score, signal) =>
                text.includes(signal)
                    ? score + 1
                    : score,
            0
        );

    const largeScore =
        largeTaskSignals.reduce(
            (score, signal) =>
                text.includes(signal)
                    ? score + 1
                    : score,
            0
        );

    const debuggingScore =
        debuggingSignals.reduce(
            (score, signal) =>
                text.includes(signal)
                    ? score + 1
                    : score,
            0
        );

    const explanationScore =
        explanationSignals.reduce(
            (score, signal) =>
                text.includes(signal)
                    ? score + 1
                    : score,
            0
        );

    if (
        largeScore >= 2 ||
        (
            largeScore >= 1 &&
            codingScore >= 2
        ) ||
        text.length > 10000
    ) {
        return "LARGE_CODING";
    }

    if (
        debuggingScore >= 1 &&
        codingScore >= 1
    ) {
        return "DEBUGGING";
    }

    if (
        codingScore >= 1
    ) {
        return "CODING";
    }

    if (
        explanationScore >= 1
    ) {
        return "EXPLANATION";
    }

    return "SIMPLE";
}


/* Context builder */

function estimateOrbitTextSize(
    text
) {
    return String(text || "").length;
}

function getOrbitRelevantHistory(
    message,
    taskType
) {
    const history =
        normalizeOrbitMessages(
            orbitConversationHistory
        );

    if (!history.length) {
        return [];
    }

    let limit =
        ORBIT_CONTEXT_MESSAGE_LIMIT;

    if (
        taskType ===
        "LARGE_CODING"
    ) {
        limit = 60;
    } else if (
        taskType ===
        "CODING" ||
        taskType ===
        "DEBUGGING"
    ) {
        limit = 50;
    }

    const recent =
        history.slice(-limit);

    if (
        taskType === "SIMPLE" ||
        taskType === "EXPLANATION"
    ) {
        return recent.slice(-20);
    }

    const messageText =
        String(message || "")
            .toLowerCase();

    const scored =
        recent.map(
            (item, index) => {
                const content =
                    item.content
                        .toLowerCase();

                let score =
                    index / recent.length;

                const keywords =
                    messageText
                        .split(/\W+/)
                        .filter(
                            word =>
                                word.length >= 4
                        )
                        .slice(0, 30);

                keywords.forEach(
                    keyword => {
                        if (
                            content.includes(
                                keyword
                            )
                        ) {
                            score += 2;
                        }
                    }
                );

                if (
                    content.includes(
                        "```"
                    )
                ) {
                    score += 1;
                }

                if (
                    content.includes(
                        "server.js"
                    ) ||
                    content.includes(
                        "orbit.js"
                    ) ||
                    content.includes(
                        "index.html"
                    ) ||
                    content.includes(
                        "supabase"
                    )
                ) {
                    score += 1;
                }

                return {
                    item,
                    index,
                    score
                };
            }
        );

    scored.sort(
        (a, b) =>
            b.score - a.score
    );

    const selected =
        scored
            .slice(
                0,
                taskType ===
                "LARGE_CODING"
                    ? 45
                    : 35
            )
            .sort(
                (a, b) =>
                    a.index -
                    b.index
            )
            .map(
                entry =>
                    entry.item
            );

    return selected;
}

function buildOrbitCodingContext(
    message,
    taskType
) {
    const relevantHistory =
        getOrbitRelevantHistory(
            message,
            taskType
        );

    let totalCharacters = 0;

    const selected = [];

    for (
        const item of relevantHistory
    ) {
        const size =
            estimateOrbitTextSize(
                item.content
            );

        if (
            totalCharacters +
            size >
            ORBIT_CONTEXT_CHARACTER_LIMIT
        ) {
            continue;
        }

        selected.push(item);

        totalCharacters += size;
    }

    return {
        taskType,
        messages: selected,
        memory:
            getOrbitMemoryContext(),
        characterCount:
            totalCharacters
    };
}

function buildOrbitRequestInstructions(
    taskType
) {
    switch (taskType) {
        case "LARGE_CODING":
            return `
Request classification: LARGE_CODING.

Treat this as a substantial engineering task.

Before changing code:
- understand the existing architecture;
- identify affected files and dependencies;
- preserve unrelated functionality;
- consider frontend/backend/database interactions;
- consider authentication and authorization where relevant;
- consider deployment implications;
- consider edge cases and failure states.

Prefer an efficient implementation.
Use a patch when the change is genuinely localized.
Use a complete replacement file when the changes are broad enough that a complete file is safer and the user requests it.

Do not invent missing architecture when the supplied code already establishes it.
Do not silently remove existing functionality.
`;
        case "DEBUGGING":
            return `
Request classification: DEBUGGING.

First determine the likely root cause of the problem.
Explain the cause clearly.
Then provide the smallest reliable fix that preserves existing behavior.
Check related code paths and dependencies before changing anything.
Do not apply unrelated rewrites.
`;
        case "CODING":
            return `
Request classification: CODING.

Analyze the supplied code and surrounding context first.
Preserve the existing architecture and naming conventions.
Provide production-quality implementation.
Check related functions and consumers for compatibility.
`;
        case "EXPLANATION":
            return `
Request classification: EXPLANATION.

Prioritize clarity and accuracy.
Use examples when useful.
If the question relates to existing code, use the provided architecture rather than inventing a different one.
`;
        default:
            return `
Request classification: SIMPLE.

Answer directly and accurately.
Do not introduce unnecessary complexity.
`;
    }
}


/* Recent chats */

function createOrbitChatId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
        "function"
    ) {
        return (
            "chat-" +
            window.crypto.randomUUID()
        );
    }

    return (
        "chat-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );
}

function saveOrbitRecentChatsFallback(
    chats
) {
    try {
        localStorage.setItem(
            ORBIT_RECENT_CHATS_KEY,
            JSON.stringify(
                Array.isArray(chats)
                    ? chats.slice(
                        0,
                        ORBIT_HISTORY_LIMIT
                    )
                    : []
            )
        );
    } catch (error) {
        console.warn(
            "Orbit recent chats save error:",
            error
        );
    }
}

function loadOrbitRecentChatsFallback() {
    try {
        const saved =
            localStorage.getItem(
                ORBIT_RECENT_CHATS_KEY
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
            .filter(
                chat =>
                    chat &&
                    typeof chat ===
                    "object"
            )
            .map(chat => ({
                id:
                    String(
                        chat.id ||
                        createOrbitChatId()
                    ),

                title:
                    String(
                        chat.title ||
                        chat.message ||
                        "New chat"
                    ).trim(),

                message:
                    String(
                        chat.message ||
                        chat.title ||
                        ""
                    ).trim(),

                messages:
                    normalizeOrbitMessages(
                        chat.messages
                    ),

                updatedAt:
                    Number(
                        chat.updatedAt
                    ) || Date.now()
            }))
            .sort(
                (a, b) =>
                    b.updatedAt -
                    a.updatedAt
            )
            .slice(
                0,
                ORBIT_HISTORY_LIMIT
            );
    } catch (error) {
        console.warn(
            "Orbit recent chats load error:",
            error
        );

        return [];
    }
}

function saveOrbitActiveChatId(
    chatId
) {
    try {
        if (chatId) {
            localStorage.setItem(
                ORBIT_ACTIVE_CHAT_KEY,
                String(chatId)
            );
        } else {
            localStorage.removeItem(
                ORBIT_ACTIVE_CHAT_KEY
            );
        }
    } catch (error) {
        console.warn(
            "Orbit active chat save error:",
            error
        );
    }
}

function getOrbitActiveChatId() {
    try {
        return (
            localStorage.getItem(
                ORBIT_ACTIVE_CHAT_KEY
            ) || null
        );
    } catch {
        return null;
    }
}

function getOrbitChatTitle(
    message
) {
    const cleanMessage =
        String(message || "")
            .replace(/\s+/g, " ")
            .trim();

    if (!cleanMessage) {
        return "New chat";
    }

    return cleanMessage.length > 60
        ? cleanMessage.substring(
            0,
            60
        ) + "..."
        : cleanMessage;
}

function saveOrbitRecentChat(
    message = null
) {
    if (
        message !== null &&
        (
            typeof message !==
            "string" ||
            !message.trim()
        )
    ) {
        return null;
    }

    const chats =
        loadOrbitRecentChatsFallback();

    let chatId =
        window.orbitActiveChatId;

    if (!chatId) {
        chatId =
            createOrbitChatId();

        window.orbitActiveChatId =
            chatId;

        saveOrbitActiveChatId(
            chatId
        );
    }

    const cleanMessage =
        message === null
            ? ""
            : String(message).trim();

    const existingIndex =
        chats.findIndex(
            chat =>
                String(chat.id) ===
                String(chatId)
        );

    const existingChat =
        existingIndex >= 0
            ? chats[existingIndex]
            : null;

    const chat = {
        id: chatId,

        title:
            existingChat?.title ||
            getOrbitChatTitle(
                cleanMessage
            ),

        message:
            cleanMessage ||
            existingChat?.message ||
            "",

        messages:
            normalizeOrbitMessages(
                orbitConversationHistory
            ),

        updatedAt:
            Date.now()
    };

    if (existingIndex >= 0) {
        chats.splice(
            existingIndex,
            1
        );
    }

    chats.unshift(chat);

    saveOrbitRecentChatsFallback(
        chats
    );

    renderOrbitFallbackRecentChats(
        chats
    );

    return chat;
}

function updateOrbitActiveRecentChat() {
    const chatId =
        window.orbitActiveChatId;

    if (!chatId) {
        return;
    }

    const chats =
        loadOrbitRecentChatsFallback();

    const index =
        chats.findIndex(
            chat =>
                String(chat.id) ===
                String(chatId)
        );

    if (index === -1) {
        return;
    }

    const chat =
        chats[index];

    const messages =
        normalizeOrbitMessages(
            orbitConversationHistory
        );

    const firstUserMessage =
        messages.find(
            item =>
                item.role ===
                "user"
        );

    if (firstUserMessage) {
        chat.message =
            firstUserMessage.content;

        chat.title =
            getOrbitChatTitle(
                firstUserMessage.content
            );
    }

    chat.messages =
        messages;

    chat.updatedAt =
        Date.now();

    chats.splice(index, 1);
    chats.unshift(chat);

    saveOrbitRecentChatsFallback(
        chats
    );

    renderOrbitFallbackRecentChats(
        chats
    );
}

function deleteOrbitRecentChat(
    chatId
) {
    if (!chatId) {
        return false;
    }

    const chats =
        loadOrbitRecentChatsFallback();

    const filtered =
        chats.filter(
            chat =>
                String(chat.id) !==
                String(chatId)
        );

    if (
        filtered.length ===
        chats.length
    ) {
        return false;
    }

    saveOrbitRecentChatsFallback(
        filtered
    );

    if (
        window.orbitActiveChatId &&
        String(
            window.orbitActiveChatId
        ) === String(chatId)
    ) {
        window.orbitActiveChatId =
            null;

        saveOrbitActiveChatId(
            null
        );

        orbitConversationHistory =
            [];

        renderOrbitConversation([]);
    }

    renderOrbitFallbackRecentChats(
        filtered
    );

    if (
        window.OrbitRecentChats &&
        typeof window.OrbitRecentChats.remove ===
        "function"
    ) {
        try {
            window.OrbitRecentChats.remove(
                chatId
            );
        } catch (error) {
            console.warn(
                "OrbitRecentChats.remove failed:",
                error
            );
        }
    }

    return true;
}

function loadOrbitRecentChat(
    chatId
) {
    if (
        orbitIsWaiting ||
        !chatId
    ) {
        return false;
    }

    const chats =
        loadOrbitRecentChatsFallback();

    const chat =
        chats.find(
            item =>
                String(item.id) ===
                String(chatId)
        );

    if (!chat) {
        return false;
    }

    const messages =
        normalizeOrbitMessages(
            chat.messages
        );

    if (!messages.length) {
        return false;
    }

    return loadOrbitSelectedConversation(
        messages,
        chat.id
    );
}


/* Recent chat rendering */

function renderOrbitFallbackRecentChats(
    chats
) {
    const containers =
        document.querySelectorAll(
            ".chat-history-list"
        );

    containers.forEach(
        container => {
            container.innerHTML = "";

            if (
                !Array.isArray(chats) ||
                !chats.length
            ) {
                const empty =
                    document.createElement(
                        "div"
                    );

                empty.className =
                    "chat-history-empty";

                empty.textContent =
                    "No recent chats yet.";

                container.appendChild(
                    empty
                );

                return;
            }

            chats.forEach(chat => {
                if (!chat) {
                    return;
                }

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "chat-history-item";

                item.dataset.chatId =
                    chat.id || "";

                if (
                    window.orbitActiveChatId &&
                    String(
                        window.orbitActiveChatId
                    ) ===
                    String(chat.id)
                ) {
                    item.classList.add(
                        "is-active"
                    );
                }

                const chatButton =
                    document.createElement(
                        "button"
                    );

                chatButton.type =
                    "button";

                chatButton.className =
                    "chat-history-item-button";

                chatButton.title =
                    chat.title ||
                    "Open chat";

                chatButton.setAttribute(
                    "aria-label",
                    `Open chat: ${chat.title || "New chat"}`
                );

                const title =
                    document.createElement(
                        "span"
                    );

                title.className =
                    "chat-history-item-title";

                title.textContent =
                    chat.title ||
                    chat.message ||
                    "New chat";

                chatButton.appendChild(
                    title
                );

                const deleteButton =
                    document.createElement(
                        "button"
                    );

                deleteButton.type =
                    "button";

                deleteButton.className =
                    "chat-history-delete";

                deleteButton.dataset.chatId =
                    chat.id || "";

                deleteButton.title =
                    "Delete chat";

                deleteButton.setAttribute(
                    "aria-label",
                    `Delete chat: ${chat.title || "New chat"}`
                );

                deleteButton.innerHTML = `
                    <svg
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
                        <path d="M3 6h18"></path>
                        <path d="M8 6V4h8v2"></path>
                        <path d="M19 6l-1 14H6L5 6"></path>
                        <path d="M10 11v5"></path>
                        <path d="M14 11v5"></path>
                    </svg>
                `;

                item.appendChild(
                    chatButton
                );

                item.appendChild(
                    deleteButton
                );

                chatButton.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();

                        if (
                            orbitIsWaiting
                        ) {
                            return;
                        }

                        loadOrbitRecentChat(
                            chat.id
                        );
                    }
                );

                deleteButton.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                            orbitIsWaiting
                        ) {
                            return;
                        }

                        deleteOrbitRecentChat(
                            chat.id
                        );
                    }
                );

                container.appendChild(
                    item
                );
            });
        }
    );
}

function refreshOrbitRecentChats() {
    const chats =
        loadOrbitRecentChatsFallback();

    renderOrbitFallbackRecentChats(
        chats
    );

    if (
        window.OrbitRecentChats &&
        typeof window.OrbitRecentChats.render ===
        "function"
    ) {
        try {
            window.OrbitRecentChats.render();
        } catch (error) {
            console.warn(
                "Orbit recent chats render failed:",
                error
            );
        }
    }
}


/* Conversation */

function clearOrbitConversationStorage() {
    orbitConversationHistory =
        [];
}

function getOrbitHistoryForAPI() {
    return normalizeOrbitMessages(
        orbitConversationHistory
    );
}

function hasOrbitSavedConversation() {
    return (
        Array.isArray(
            orbitConversationHistory
        ) &&
        orbitConversationHistory.length > 0
    );
}


/* HTML */

function escapeOrbitHTML(value) {
    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

function isValidOrbitURL(url) {
    try {
        const parsed =
            new URL(url);

        return (
            parsed.protocol ===
            "http:" ||
            parsed.protocol ===
            "https:"
        );
    } catch {
        return false;
    }
}

function isGitHubURL(url) {
    try {
        const hostname =
            new URL(url)
                .hostname
                .toLowerCase();

        return (
            hostname ===
            "github.com" ||
            hostname ===
            "www.github.com" ||
            hostname.endsWith(
                ".github.com"
            )
        );
    } catch {
        return false;
    }
}


/* Icons */

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

function getOrbitGitHubIcon() {
    return `
        <svg
            class="orbit-github-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.82.57A12 12 0 0 0 12 .5Z"></path>
        </svg>
    `;
}


/* Links */

function createOrbitLinkHTML(
    url,
    label = null
) {
    if (!isValidOrbitURL(url)) {
        return escapeOrbitHTML(
            label || url
        );
    }

    const safeURL =
        escapeOrbitHTML(url);

    const safeLabel =
        escapeOrbitHTML(
            label || url
        );

    if (isGitHubURL(url)) {
        return `
            <span
                class="orbit-github-container orbit-link-container"
                data-orbit-github="true"
            >
                <a
                    class="orbit-github-link orbit-link"
                    href="${safeURL}"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-orbit-url="${safeURL}"
                >
                    ${getOrbitGitHubIcon()}
                    <span class="orbit-github-link-text">
                        ${safeLabel}
                    </span>
                </a>

                <span class="orbit-github-actions orbit-link-actions">
                    <button
                        type="button"
                        class="orbit-link-action orbit-open-link"
                        data-orbit-url="${safeURL}"
                        title="Open GitHub"
                        aria-label="Open GitHub"
                    >
                        ${getOrbitExternalLinkIcon()}
                    </button>

                    <button
                        type="button"
                        class="orbit-link-action orbit-copy-link"
                        data-orbit-url="${safeURL}"
                        title="Copy GitHub link"
                        aria-label="Copy GitHub link"
                    >
                        ${getOrbitCopyIcon()}
                    </button>
                </span>
            </span>
        `;
    }

    return `
        <span class="orbit-link-container">
            <a
                class="orbit-link"
                href="${safeURL}"
                target="_blank"
                rel="noopener noreferrer"
                data-orbit-url="${safeURL}"
            >
                ${safeLabel}
            </a>

            <span class="orbit-link-actions">
                <button
                    type="button"
                    class="orbit-link-open orbit-open-link"
                    data-orbit-url="${safeURL}"
                    title="Open link"
                    aria-label="Open link"
                >
                    ${getOrbitExternalLinkIcon()}
                </button>

                <button
                    type="button"
                    class="orbit-link-copy orbit-copy-link"
                    data-orbit-url="${safeURL}"
                    title="Copy link"
                    aria-label="Copy link"
                >
                    ${getOrbitCopyIcon()}
                </button>
            </span>
        </span>
    `;
}


/* Code */

function createOrbitCodeHTML(
    language,
    code
) {
    const safeLanguage =
        language
            ? language.trim().toLowerCase()
            : "text";

    const displayLanguage =
        safeLanguage === "text"
            ? "CODE"
            : safeLanguage.toUpperCase();

    return `
        <div
            class="orbit-code-wrapper orbit-code-container"
            data-orbit-code-block
            data-language="${escapeOrbitHTML(
        safeLanguage
    )}"
        >
            <div class="orbit-code-toolbar orbit-code-header">
                <span class="orbit-code-language">
                    ${escapeOrbitHTML(
        displayLanguage
    )}
                </span>

                <button
                    type="button"
                    class="orbit-code-copy orbit-copy-btn"
                    data-orbit-copy-code
                    title="Copy code"
                    aria-label="Copy code"
                >
                    ${getOrbitCopyIcon()}
                    <span class="copy-text">Copy</span>
                    <span class="success-icon">✓</span>
                </button>
            </div>

            <pre
                class="orbit-code-block"
                data-code-language="${escapeOrbitHTML(
        safeLanguage
    )}"
            ><code
                class="language-${escapeOrbitHTML(
        safeLanguage
    )}"
            >${escapeOrbitHTML(
        code
    )}</code></pre>
        </div>
    `;
}


/* Tables */

function createOrbitTableHTML(
    headerLine,
    separatorLine,
    bodyLines
) {
    const headers =
        headerLine
            .split("|")
            .map(
                cell =>
                    cell.trim()
            )
            .filter(Boolean);

    if (!headers.length) {
        return null;
    }

    const rows =
        bodyLines.map(line =>
            line
                .split("|")
                .map(
                    cell =>
                        cell.trim()
                )
                .filter(Boolean)
        );

    const headerHTML =
        headers
            .map(
                cell =>
                    `<th>${escapeOrbitHTML(
                        cell
                    )}</th>`
            )
            .join("");

    const rowsHTML =
        rows
            .filter(
                row =>
                    row.length
            )
            .map(
                row => `
                    <tr>
                        ${row
                        .map(
                            cell =>
                                `<td>${escapeOrbitHTML(
                                    cell
                                )}</td>`
                        )
                        .join("")}
                    </tr>
                `
            )
            .join("");

    return `
        <div class="orbit-table-wrapper">
            <table class="orbit-table">
                <thead>
                    <tr>${headerHTML}</tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
        </div>
    `;
}


/* Response formatting */

function tokenizeOrbitContent(text) {
    const tokens = [];

    function addToken(
        type,
        value
    ) {
        const index =
            tokens.length;

        tokens.push({
            type,
            value
        });

        return `___ORBIT_TOKEN_${index}___`;
    }

    let source =
        String(text ?? "");

    source =
        source.replace(
            /```([a-zA-Z0-9_+#.-]*)\s*\n?([\s\S]*?)```/g,
            (_, language, code) =>
                addToken(
                    "code",
                    createOrbitCodeHTML(
                        language,
                        code
                            .replace(
                                /^\n/,
                                ""
                            )
                            .replace(
                                /\n$/,
                                ""
                            )
                    )
                )
        );

    source =
        source.replace(
            /((?:^\|?.+\|.+\|?\s*$\n?)+)/gm,
            block => {
                const lines =
                    block
                        .split("\n")
                        .map(
                            line =>
                                line.trim()
                        )
                        .filter(Boolean);

                if (
                    lines.length < 2
                ) {
                    return block;
                }

                const separatorIndex =
                    lines.findIndex(
                        line =>
                            /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(
                                line
                            )
                    );

                if (
                    separatorIndex !==
                    1
                ) {
                    return block;
                }

                const table =
                    createOrbitTableHTML(
                        lines[0],
                        lines[1],
                        lines.slice(2)
                    );

                return table
                    ? addToken(
                        "table",
                        table
                    )
                    : block;
            }
        );

    source =
        source.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
            (_, label, url) =>
                addToken(
                    "link",
                    createOrbitLinkHTML(
                        url,
                        label
                    )
                )
        );

    source =
        source.replace(
            /https?:\/\/[^\s<>"'`]+/gi,
            match => {
                const cleanURL =
                    match.replace(
                        /[.,!?;:)\]\\}]+$/,
                        ""
                    );

                const trailing =
                    match.substring(
                        cleanURL.length
                    );

                return (
                    addToken(
                        "link",
                        createOrbitLinkHTML(
                            cleanURL
                        )
                    ) +
                    escapeOrbitHTML(
                        trailing
                    )
                );
            }
        );

    source =
        source.replace(
            /`([^`\n]+)`/g,
            (_, code) =>
                addToken(
                    "inline-code",
                    `<code class="orbit-inline-code">${escapeOrbitHTML(
                        code
                    )}</code>`
                )
        );

    return {
        source,
        tokens
    };
}

function formatOrbitResponse(text) {
    if (!text) {
        return "";
    }

    const {
        source,
        tokens
    } =
        tokenizeOrbitContent(text);

    let formatted =
        escapeOrbitHTML(source);

    formatted =
        formatted.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

    formatted =
        formatted.replace(
            /(^|[^\*])\*([^\*\n]+)\*(?!\*)/gm,
            "$1<em>$2</em>"
        );

    formatted =
        formatted.replace(
            /^### (.*?)$/gm,
            "<h4>$1</h4>"
        );

    formatted =
        formatted.replace(
            /^## (.*?)$/gm,
            "<h3>$1</h3>"
        );

    formatted =
        formatted.replace(
            /^# (.*?)$/gm,
            "<h2>$1</h2>"
        );

    formatted =
        formatted.replace(
            /^[•-]\s+(.*?)$/gm,
            "<li>$1</li>"
        );

    formatted =
        formatted.replace(
            /^\d+\.\s+(.*?)$/gm,
            "<li>$1</li>"
        );

    formatted =
        formatted.replace(
            /((?:<li>.*?<\/li>\s*)+)/g,
            match =>
                `<ul>${match}</ul>`
        );

    formatted =
        formatted.replace(
            /\n{2,}/g,
            "<br><br>"
        );

    formatted =
        formatted.replace(
            /\n/g,
            "<br>"
        );

    tokens.forEach(
        (token, index) => {
            formatted =
                formatted.replace(
                    `___ORBIT_TOKEN_${index}___`,
                    token.value
                );
        }
    );

    return formatted;
}


/* Conversation UI */

function createOrbitConversationGroup() {
    const group =
        document.createElement(
            "div"
        );

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
    const {
        chatWindow
    } = getOrbitElements();

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
        document.createElement(
            "div"
        );

    row.className =
        `message-row ${sender}`;

    row.dataset.sender =
        sender;

    const message =
        document.createElement(
            "div"
        );

    message.className =
        `message ${sender}`;

    if (
        sender === "user"
    ) {
        message.textContent =
            String(text ?? "");
    } else {
        message.innerHTML =
            formatOrbitResponse(
                text
            );
    }

    row.appendChild(
        message
    );

    conversationGroup.appendChild(
        row
    );

    if (
        sender === "orbit"
    ) {
        scrollToOrbitResponse(
            row,
            "smooth"
        );
    } else {
        scrollOrbitChat(
            "auto"
        );
    }

    return row;
}

function createOrbitStreamingMessage(
    group
) {
    const {
        chatWindow
    } = getOrbitElements();

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
        document.createElement(
            "div"
        );

    row.className =
        "message-row orbit";

    row.dataset.sender =
        "orbit";

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message orbit";

    message.dataset.orbitStreaming =
        "true";

    row.appendChild(
        message
    );

    conversationGroup.appendChild(
        row
    );

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
        formatOrbitResponse(
            text
        );

    requestAnimationFrame(() => {
        scrollToOrbitResponse(
            element.parentElement,
            "smooth"
        );
    });
}

function renderOrbitConversation(
    messages
) {
    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    const chatIntro =
        document.getElementById(
            "chat-intro"
        );

    chatWindow
        .querySelectorAll(
            ".conversation-group, #orbit-typing"
        )
        .forEach(
            element =>
                element.remove()
        );

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

    chatWindow.appendChild(
        group
    );

    messages.forEach(
        item => {
            if (
                !item ||
                typeof item.content !==
                "string"
            ) {
                return;
            }

            addOrbitMessage(
                item.content,
                item.role ===
                    "user"
                    ? "user"
                    : "orbit",
                group
            );
        }
    );

    scrollOrbitChat(
        "auto"
    );

    refreshOrbitRecentChats();
}

function restoreOrbitConversation() {
    if (
        !hasOrbitSavedConversation()
    ) {
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
        normalizeOrbitMessages(
            messages
        );

    if (!cleanMessages.length) {
        return false;
    }

    orbitConversationHistory =
        cleanMessages;

    if (chatId) {
        window.orbitActiveChatId =
            String(chatId);

        saveOrbitActiveChatId(
            chatId
        );
    }

    renderOrbitConversation(
        orbitConversationHistory
    );

    clearOrbitInput();
    focusOrbitInput();

    refreshOrbitRecentChats();

    return true;
}


/* Typing */

function showOrbitTyping() {
    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    hideOrbitTyping();

    const row =
        document.createElement(
            "div"
        );

    row.id =
        "orbit-typing";

    row.className =
        "message-row orbit typing-row";

    row.setAttribute(
        "aria-live",
        "polite"
    );

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message orbit typing-message";

    message.setAttribute(
        "role",
        "status"
    );

    message.setAttribute(
        "aria-label",
        "Orbit is typing"
    );

    message.innerHTML = `
        <span
            class="orbit-typing-dots"
            aria-hidden="true"
        >
            <span class="orbit-typing-dot"></span>
            <span class="orbit-typing-dot"></span>
            <span class="orbit-typing-dot"></span>
        </span>
    `;

    row.appendChild(
        message
    );

    chatWindow.appendChild(
        row
    );

    scrollOrbitChat(
        "smooth"
    );
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


/* Copy */

async function copyOrbitText(
    text
) {
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
            document.createElement(
                "textarea"
            );

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
            document.execCommand(
                "copy"
            );

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
        button.classList.add(
            "copied"
        );

        const copyText =
            button.querySelector(
                ".copy-text"
            );

        if (copyText) {
            copyText.textContent =
                "Copied";
        }

        setTimeout(() => {
            if (!button.isConnected) {
                return;
            }

            button.classList.remove(
                "copied"
            );

            if (copyText) {
                copyText.textContent =
                    "Copy";
            }
        }, 1600);
    } else {
        button.classList.add(
            "copy-error"
        );

        setTimeout(() => {
            if (
                button.isConnected
            ) {
                button.classList.remove(
                    "copy-error"
                );
            }
        }, 1600);
    }
}

function updateOrbitLinkCopyButton(
    button,
    success
) {
    if (!button) {
        return;
    }

    if (success) {
        button.classList.add(
            "copied"
        );

        button.innerHTML =
            "✓";

        setTimeout(() => {
            if (!button.isConnected) {
                return;
            }

            button.innerHTML =
                getOrbitCopyIcon();

            button.classList.remove(
                "copied"
            );
        }, 1600);
    } else {
        button.classList.add(
            "copy-error"
        );

        setTimeout(() => {
            if (
                button.isConnected
            ) {
                button.classList.remove(
                    "copy-error"
                );
            }
        }, 1600);
    }
}


/* Chat actions */

function setupOrbitChatActions() {
    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    if (
        chatWindow.dataset
            .orbitActionsReady ===
        "true"
    ) {
        return;
    }

    chatWindow.dataset
        .orbitActionsReady =
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
                    copyLinkButton
                        .dataset
                        .orbitUrl;

                if (
                    !url ||
                    !isValidOrbitURL(
                        url
                    )
                ) {
                    return;
                }

                const success =
                    await copyOrbitText(
                        url
                    );

                updateOrbitLinkCopyButton(
                    copyLinkButton,
                    success
                );

                return;
            }

            if (openLinkButton) {
                const url =
                    openLinkButton
                        .dataset
                        .orbitUrl;

                if (
                    url &&
                    isValidOrbitURL(
                        url
                    )
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


/* Quick prompts */

function setupOrbitQuickPrompts() {
    const prompts =
        document.querySelectorAll(
            ".quick-prompt"
        );

    if (!prompts.length) {
        return;
    }

    prompts.forEach(
        button => {
            if (
                button.dataset
                    .orbitPromptReady ===
                "true"
            ) {
                return;
            }

            button.dataset
                .orbitPromptReady =
                "true";

            if (
                !button.getAttribute(
                    "type"
                )
            ) {
                button.setAttribute(
                    "type",
                    "button"
                );
            }

            button.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (
                        orbitIsWaiting
                    ) {
                        return;
                    }

                    const prompt =
                        button.dataset.prompt ||
                        button.getAttribute(
                            "data-prompt"
                        ) ||
                        button.textContent ||
                        "";

                    const cleanPrompt =
                        String(
                            prompt
                        ).trim();

                    if (!cleanPrompt) {
                        return;
                    }

                    const {
                        commandInput
                    } =
                        getOrbitElements();

                    if (
                        commandInput
                    ) {
                        commandInput.value =
                            cleanPrompt;

                        triggerOrbitInputUpdate();

                        focusOrbitInput();
                    }

                    hideOrbitQuickPrompts();

                    orbitSendMessage(
                        cleanPrompt
                    );
                }
            );
        }
    );
}


/* Global typing */

function setupOrbitGlobalTyping() {
    if (
        document.documentElement
            .dataset
            .orbitGlobalTypingReady ===
        "true"
    ) {
        return;
    }

    document.documentElement
        .dataset
        .orbitGlobalTypingReady =
        "true";

    document.addEventListener(
        "keydown",
        event => {
            const {
                commandInput
            } =
                getOrbitElements();

            if (
                !commandInput ||
                orbitIsWaiting ||
                event.defaultPrevented
            ) {
                return;
            }

            if (
                event.ctrlKey ||
                event.metaKey ||
                event.altKey
            ) {
                return;
            }

            if (
                event.key === "Tab" ||
                event.key === "Escape" ||
                event.key === "Enter" ||
                event.key === "Shift" ||
                event.key === "CapsLock" ||
                event.key === "Backspace" ||
                event.key === "Delete" ||
                event.key === "ArrowUp" ||
                event.key === "ArrowDown" ||
                event.key === "ArrowLeft" ||
                event.key === "ArrowRight" ||
                event.key === "Home" ||
                event.key === "End" ||
                event.key === "PageUp" ||
                event.key === "PageDown" ||
                event.key.startsWith(
                    "F"
                )
            ) {
                return;
            }

            if (
                event.key.length !==
                1
            ) {
                return;
            }

            if (
                document.activeElement ===
                commandInput
            ) {
                return;
            }

            const activeElement =
                document.activeElement;

            if (
                activeElement &&
                (
                    activeElement.tagName ===
                    "INPUT" ||
                    activeElement.tagName ===
                    "TEXTAREA" ||
                    activeElement.tagName ===
                    "SELECT" ||
                    activeElement.tagName ===
                    "BUTTON" ||
                    activeElement.isContentEditable
                )
            ) {
                return;
            }

            focusOrbitInput();

            if (
                document.activeElement ===
                commandInput
            ) {
                try {
                    const start =
                        commandInput.value.length;

                    commandInput.setSelectionRange(
                        start,
                        start
                    );
                } catch {
                    /* Ignore unsupported selection APIs */
                }
            }
        }
    );
}


/* API */

async function orbitFetchAPI(
    body,
    signal
) {
    const token =
        await getOrbitAuthToken();

    const headers = {
        "Content-Type":
            "application/json",

        Accept:
            "application/json, text/event-stream"
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    const options = {
        method: "POST",
        headers,
        body:
            JSON.stringify(body),
        signal,
        cache: "no-store"
    };

    try {
        return await fetch(
            ORBIT_API_URL,
            options
        );
    } catch (
        primaryError
    ) {
        if (
            !ORBIT_FALLBACK_API_URL ||
            ORBIT_FALLBACK_API_URL ===
            ORBIT_API_URL
        ) {
            throw primaryError;
        }

        return fetch(
            ORBIT_FALLBACK_API_URL,
            options
        );
    }
}


/* Streaming */

function extractOrbitStreamText(
    data
) {
    if (
        typeof data ===
        "string"
    ) {
        return data;
    }

    if (!data) {
        return "";
    }

    return (
        data.delta ??
        data.content ??
        data.text ??
        data.reply ??
        data.response ??
        data.message ??
        ""
    );
}

async function readOrbitStreamingResponse(
    response,
    onChunk
) {
    if (
        !response.body ||
        typeof response.body.getReader !==
        "function"
    ) {
        const data =
            await response.json();

        return (
            data?.reply ??
            data?.response ??
            data?.message ??
            ""
        );
    }

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder();

    let fullText = "";
    let buffer = "";

    while (true) {
        const {
            value,
            done
        } =
            await reader.read();

        if (done) {
            break;
        }

        buffer +=
            decoder.decode(
                value,
                {
                    stream: true
                }
            );

        const lines =
            buffer.split("\n");

        buffer =
            lines.pop() || "";

        for (
            const rawLine of lines
        ) {
            const line =
                rawLine.trim();

            if (!line) {
                continue;
            }

            let payload =
                line;

            if (
                payload.startsWith(
                    "data:"
                )
            ) {
                payload =
                    payload
                        .slice(5)
                        .trim();
            }

            if (
                payload ===
                "[DONE]"
            ) {
                continue;
            }

            let parsed =
                payload;

            try {
                parsed =
                    JSON.parse(
                        payload
                    );
            } catch {
                /* Plain text streaming chunk */
            }

            const chunk =
                extractOrbitStreamText(
                    parsed
                );

            if (!chunk) {
                continue;
            }

            fullText +=
                String(chunk);

            if (
                typeof onChunk ===
                "function"
            ) {
                onChunk(
                    fullText
                );
            }
        }
    }

    if (buffer.trim()) {
        let payload =
            buffer.trim();

        if (
            payload.startsWith(
                "data:"
            )
        ) {
            payload =
                payload
                    .slice(5)
                    .trim();
        }

        if (
            payload !==
            "[DONE]"
        ) {
            let parsed =
                payload;

            try {
                parsed =
                    JSON.parse(
                        payload
                    );
            } catch {
                /* Plain text final chunk */
            }

            const chunk =
                extractOrbitStreamText(
                    parsed
                );

            if (chunk) {
                fullText +=
                    String(chunk);

                if (
                    typeof onChunk ===
                    "function"
                ) {
                    onChunk(
                        fullText
                    );
                }
            }
        }
    }

    return fullText;
}


/* Stop generation */

function stopOrbitGeneration() {
    if (
        orbitAbortController
    ) {
        try {
            orbitAbortController.abort();
        } catch (error) {
            console.warn(
                "Orbit stop error:",
                error
            );
        }
    }
}

function isOrbitAbortError(
    error
) {
    return (
        error?.name ===
        "AbortError"
    );
}


/* Send */

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
            ? String(
                suppliedMessage
            ).trim()
            : String(
                commandInput.value ||
                ""
            ).trim();

    if (!message) {
        return false;
    }

    if (
        !ORBIT_USER_ID ||
        ORBIT_USER_ID.startsWith(
            "orbit-temporary-"
        )
    ) {
        await syncOrbitAuthenticatedUser();
    }

    if (
        !window.orbitActiveChatId
    ) {
        window.orbitActiveChatId =
            createOrbitChatId();

        saveOrbitActiveChatId(
            window.orbitActiveChatId
        );
    }

    detectOrbitMemory(
        message
    );

    const taskType =
        classifyOrbitRequest(
            message
        );

    const context =
        buildOrbitCodingContext(
            message,
            taskType
        );

    const historyForAPI =
        getOrbitHistoryForAPI();

    const requestInstructions =
        buildOrbitRequestInstructions(
            taskType
        );

    clearOrbitInput();

    hideOrbitQuickPrompts();

    orbitIsWaiting =
        true;

    commandInput.disabled =
        true;

    if (sendButton) {
        sendButton.disabled =
            true;

        sendButton.dataset
            .orbitGenerating =
            "true";
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

    const {
        chatWindow
    } = getOrbitElements();

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

    orbitAbortController =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => {
                if (
                    orbitAbortController
                ) {
                    orbitAbortController.abort();
                }
            },
            ORBIT_REQUEST_TIMEOUT
        );

    const requestBody = {
        message,

        history:
            historyForAPI,

        context:
            context.messages,

        memory:
            context.memory,

        userId:
            ORBIT_USER_ID,

        systemPrompt:
            ORBIT_SYSTEM_PROMPT,

        system_prompt:
            ORBIT_SYSTEM_PROMPT,

        requestType:
            taskType,

        taskType,

        instructions:
            requestInstructions,

        max_tokens:
            ORBIT_MAX_TOKENS,

        maxTokens:
            ORBIT_MAX_TOKENS,

        temperature:
            taskType ===
            "LARGE_CODING"
                ? 0.55
                : taskType ===
                    "DEBUGGING"
                    ? 0.4
                    : 0.7,

        stream:
            true
    };

    try {
        const response =
            await orbitFetchAPI(
                requestBody,
                orbitAbortController.signal
            );

        if (!response.ok) {
            let errorMessage =
                `Server returned ${response.status}`;

            try {
                const errorData =
                    await response.json();

                if (
                    errorData &&
                    typeof errorData.error ===
                    "string"
                ) {
                    errorMessage =
                        errorData.error;
                }
            } catch {
                errorMessage =
                    `Server returned ${response.status}`;
            }

            throw new Error(
                errorMessage
            );
        }

        hideOrbitTyping();

        const streamingMessage =
            createOrbitStreamingMessage(
                conversationGroup
            );

        const reply =
            await readOrbitStreamingResponse(
                response,
                text => {
                    updateOrbitStreamingMessage(
                        streamingMessage?.message,
                        text
                    );
                }
            );

        if (
            typeof reply !==
                "string" ||
            !reply.trim()
        ) {
            throw new Error(
                "Orbit returned an empty response."
            );
        }

        const responseText =
            reply.trim();

        if (
            streamingMessage?.message
        ) {
            updateOrbitStreamingMessage(
                streamingMessage.message,
                responseText
            );
        }

        const responseRow =
            streamingMessage?.row ||
            addOrbitMessage(
                responseText,
                "orbit",
                conversationGroup
            );

        orbitConversationHistory.push(
            {
                role: "user",
                content:
                    message
            },
            {
                role:
                    "assistant",
                content:
                    responseText
            }
        );

        orbitConversationHistory =
            orbitConversationHistory.slice(
                -ORBIT_HISTORY_LIMIT
            );

        updateOrbitActiveRecentChat();

        const elapsed =
            performance.now() -
            startTime;

        const responseTime =
            document.getElementById(
                "response-time"
            );

        if (responseTime) {
            responseTime.textContent =
                `${(
                    elapsed /
                    1000
                ).toFixed(1)}s`;
        }

        if (responseRow) {
            scrollToOrbitResponse(
                responseRow,
                "smooth"
            );
        }

        refreshOrbitRecentChats();

        return true;
    } catch (error) {
        console.error(
            "Orbit AI request failed:",
            error
        );

        hideOrbitTyping();

        if (
            isOrbitAbortError(
                error
            )
        ) {
            const responseTime =
                document.getElementById(
                    "response-time"
                );

            if (responseTime) {
                responseTime.textContent =
                    "Generation stopped";
            }

            return false;
        }

        let errorMessage =
            error?.message ||
            "Unable to connect to Orbit.";

        if (
            error?.name ===
            "AbortError"
        ) {
            errorMessage =
                "Orbit took too long to respond. Please try again.";
        }

        const errorRow =
            addOrbitMessage(
                `I couldn't complete that request. ${errorMessage}`,
                "orbit",
                conversationGroup
            );

        if (errorRow) {
            scrollToOrbitResponse(
                errorRow,
                "smooth"
            );
        }

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
        clearTimeout(
            timeoutId
        );

        orbitAbortController =
            null;

        orbitIsWaiting =
            false;

        commandInput.disabled =
            false;

        if (sendButton) {
            sendButton.disabled =
                false;

            delete sendButton
                .dataset
                .orbitGenerating;
        }

        focusOrbitInput();
    }
}


/* Keyboard */

function setupOrbitKeyboard() {
    const {
        commandInput
    } = getOrbitElements();

    if (!commandInput) {
        return;
    }

    if (
        commandInput.dataset
            .orbitKeyboardReady ===
        "true"
    ) {
        return;
    }

    commandInput.dataset
        .orbitKeyboardReady =
        "true";

    commandInput.addEventListener(
        "keydown",
        event => {
            if (
                event.key !==
                    "Enter" ||
                event.shiftKey ||
                event.ctrlKey ||
                event.altKey ||
                event.metaKey ||
                event.isComposing
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (
                orbitIsWaiting
            ) {
                return;
            }

            orbitSendMessage();
        }
    );
}


/* Send button */

function setupOrbitSendButton() {
    const sendButton =
        document.getElementById(
            "send-btn"
        );

    if (!sendButton) {
        console.error(
            "Orbit: Send button #send-btn not found in HTML."
        );

        return;
    }

    if (
        sendButton.dataset
            .orbitSendReady ===
        "true"
    ) {
        return;
    }

    sendButton.dataset
        .orbitSendReady =
        "true";

    sendButton.type =
        "button";

    sendButton.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (
                orbitIsWaiting
            ) {
                stopOrbitGeneration();
                return;
            }

            if (
                sendButton.disabled
            ) {
                return;
            }

            orbitSendMessage();
        }
    );
}


/* Form */

function setupOrbitForm() {
    const {
        commandForm
    } = getOrbitElements();

    if (!commandForm) {
        return;
    }

    if (
        commandForm.dataset
            .orbitFormReady ===
        "true"
    ) {
        return;
    }

    commandForm.dataset
        .orbitFormReady =
        "true";

    commandForm.addEventListener(
        "submit",
        event => {
            event.preventDefault();
            event.stopPropagation();

            if (
                orbitIsWaiting
            ) {
                stopOrbitGeneration();
                return;
            }

            orbitSendMessage();
        }
    );
}


/* New chat */

function clearOrbitConversation() {
    if (
        orbitIsWaiting
    ) {
        stopOrbitGeneration();
        return;
    }

    clearOrbitConversationStorage();

    window.orbitActiveChatId =
        null;

    saveOrbitActiveChatId(
        null
    );

    const {
        chatWindow,
        commandInput
    } = getOrbitElements();

    if (chatWindow) {
        chatWindow
            .querySelectorAll(
                ".conversation-group, #orbit-typing"
            )
            .forEach(
                element =>
                    element.remove()
            );

        const chatIntro =
            document.getElementById(
                "chat-intro"
            );

        if (chatIntro) {
            chatIntro.classList.remove(
                "is-hidden"
            );
        }

        scrollOrbitChat(
            "auto"
        );
    }

    clearOrbitInput();

    showOrbitQuickPrompts();

    focusOrbitInput();

    const responseTime =
        document.getElementById(
            "response-time"
        );

    if (responseTime) {
        responseTime.textContent =
            "Ready | Orbit AI can make mistakes. Check for important details.";
    }

    refreshOrbitRecentChats();
}

function startOrbitNewChat() {
    if (
        orbitIsWaiting
    ) {
        stopOrbitGeneration();
        return;
    }

    clearOrbitConversation();
}


/* Initialization */

async function initializeOrbitAI() {
    if (
        orbitInitialized
    ) {
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

    await syncOrbitAuthenticatedUser();

    orbitConversationHistory =
        [];

    window.orbitActiveChatId =
        null;

    orbitIsWaiting =
        false;

    orbitAbortController =
        null;

    hideOrbitTyping();

    if (chatWindow) {
        chatWindow
            .querySelectorAll(
                ".conversation-group, #orbit-typing"
            )
            .forEach(
                element =>
                    element.remove()
            );

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

    commandInput.disabled =
        false;

    if (sendButton) {
        sendButton.disabled =
            false;

        sendButton.type =
            "button";
    }

    setupOrbitSendButton();
    setupOrbitKeyboard();
    setupOrbitForm();
    setupOrbitChatActions();
    setupOrbitQuickPrompts();
    setupOrbitGlobalTyping();

    refreshOrbitRecentChats();

    focusOrbitInput();

    orbitInitialized =
        true;

    console.log(
        "Orbit AI initialized."
    );
}


/* Public API */

window.OrbitAI = {
    sendMessage:
        orbitSendMessage,

    stopGeneration:
        stopOrbitGeneration,

    clearConversation:
        clearOrbitConversation,

    newChat:
        startOrbitNewChat,

    loadConversation:
        loadOrbitSelectedConversation,

    loadRecentChat:
        loadOrbitRecentChat,

    deleteRecentChat:
        deleteOrbitRecentChat,

    renderConversation:
        renderOrbitConversation,

    getConversation:
        () => [
            ...orbitConversationHistory
        ],

    getMemory:
        getOrbitMemoryContext,

    getUserId:
        () =>
            ORBIT_USER_ID,

    getAuthSession:
        getOrbitAuthSession,

    getAuthToken:
        getOrbitAuthToken,

    getRecentChats:
        loadOrbitRecentChatsFallback,

    refreshRecentChats:
        refreshOrbitRecentChats,

    formatResponse:
        formatOrbitResponse,

    copyText:
        copyOrbitText,

    classifyRequest:
        classifyOrbitRequest,

    buildContext:
        buildOrbitCodingContext,

    isWaiting:
        () =>
            orbitIsWaiting,

    initialize:
        initializeOrbitAI
};


/* Start */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitAI,
        {
            once: true
        }
    );
} else {
    initializeOrbitAI();
}