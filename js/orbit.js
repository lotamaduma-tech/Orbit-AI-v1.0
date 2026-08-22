/* ===========================================================
   ORBIT AI — SHARED AI ENGINE

   ===========================================================

   Used by:
   - index.html
   - assistant.html

   Handles:
   - Live Render API
   - Temporary conversation history
   - Persistent Supabase user memory
   - Anonymous browser identity
   - Automatic memory detection
   - AI response formatting
   - Clickable website links
   - Copyable website links
   - Copyable code blocks
   - HTML / CSS / JS code rendering
   - Typing indicator
   - Render cold-start notification
   - Sending messages
   - Enter-to-send
   - Shared AI state

   IMPORTANT:
   Conversation history is NOT saved.

   Persistent memory is handled by Supabase.

   =========================================================== */

"use strict";


/* ===========================================================
   CONFIGURATION
   =========================================================== */

const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";


/* ===========================================================
   STORAGE KEYS
   =========================================================== */

const ORBIT_USER_ID_KEY =
    "orbit-user-id";

const ORBIT_MEMORY_CACHE_KEY =
    "orbit-memory-cache";


/* ===========================================================
   AI STATE
   =========================================================== */

let orbitConversationHistory = [];
let orbitUserMemory = [];
let orbitIsWaiting = false;


/* ===========================================================
   GET / CREATE ANONYMOUS USER ID
   =========================================================== */

function getOrbitUserId() {

    try {

        let userId =
            localStorage.getItem(
                ORBIT_USER_ID_KEY
            );

        /* Existing visitor. */
        if (userId) {
            return userId;
        }

        /* Generate a new anonymous ID. */
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
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
            "Orbit user ID could not be created:",
            error
        );

        return (
            "orbit-temporary-" +
            Date.now()
        );
    }
}


/* ===========================================================
   CURRENT USER ID
   =========================================================== */

const ORBIT_USER_ID =
    getOrbitUserId();


/* ===========================================================
   GET CURRENT PAGE ELEMENTS
   =========================================================== */

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
            )
    };
}


/* ===========================================================
   LOAD LOCAL MEMORY CACHE
   =========================================================== */

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

        if (Array.isArray(parsed)) {

            orbitUserMemory =
                parsed;

        } else {

            orbitUserMemory = [];
        }

    } catch (error) {

        console.error(
            "Orbit memory cache could not be loaded:",
            error
        );

        orbitUserMemory = [];
    }
}


/* ===========================================================
   SAVE LOCAL MEMORY CACHE
   =========================================================== */

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
            "Orbit memory cache could not be saved:",
            error
        );
    }
}


/* ===========================================================
   REMEMBER USER DETAIL
   =========================================================== */

function rememberOrbitDetail(detail) {

    if (!detail) return;

    const cleanDetail =
        String(detail).trim();

    if (!cleanDetail) return;

    const exists =
        orbitUserMemory.some(
            item =>
                String(item).toLowerCase() ===
                cleanDetail.toLowerCase()
        );

    if (exists) return;

    orbitUserMemory.push(
        cleanDetail
    );

    /*
       Keep the local cache manageable.
       Supabase remains the persistent source
       of truth.
    */

    if (
        orbitUserMemory.length > 50
    ) {

        orbitUserMemory =
            orbitUserMemory.slice(-50);
    }

    saveOrbitMemoryCache();
}


/* ===========================================================
   AUTOMATIC MEMORY DETECTION
   =========================================================== */

function detectOrbitMemory(message) {

    if (!message) return;

    const text =
        String(message).trim();

    if (!text) return;


    /* =======================================================
       NAME
       ======================================================= */

    const nameMatch =
        text.match(
            /(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i
        );

    if (nameMatch) {

        rememberOrbitDetail(
            `The user's name is ${nameMatch[1].trim()}.`
        );
    }


    /* =======================================================
       AGE
       ======================================================= */

    const ageMatch =
        text.match(
            /(?:i am|i'm|im)\s+(\d{1,3})(?:\s+years?\s+old)?/i
        );

    if (ageMatch) {

        rememberOrbitDetail(
            `The user is ${ageMatch[1]} years old.`
        );
    }


    /* =======================================================
       SCHOOL
       ======================================================= */

    const schoolMatch =
        text.match(
            /(?:i study at|i attend|my school is|i go to)\s+(.+)/i
        );

    if (schoolMatch) {

        rememberOrbitDetail(
            `The user's school is ${schoolMatch[1].trim()}.`
        );
    }


    /* =======================================================
       COURSE
       ======================================================= */

    const courseMatch =
        text.match(
            /(?:my course is|i'm studying|i am studying)\s+(.+)/i
        );

    if (courseMatch) {

        rememberOrbitDetail(
            `The user studies ${courseMatch[1].trim()}.`
        );
    }


    /* =======================================================
       LOCATION
       ======================================================= */

    const locationMatch =
        text.match(
            /(?:i live in|i'm from|i am from|i live at)\s+(.+)/i
        );

    if (locationMatch) {

        rememberOrbitDetail(
            `The user is from ${locationMatch[1].trim()}.`
        );
    }


    /* =======================================================
       GOAL
       ======================================================= */

    const goalMatch =
        text.match(
            /(?:my goal is|i want to|i plan to)\s+(.+)/i
        );

    if (goalMatch) {

        rememberOrbitDetail(
            `The user's goal is ${goalMatch[1].trim()}.`
        );
    }


    /* =======================================================
       LIKES
       ======================================================= */

    const likeMatch =
        text.match(
            /(?:i like|i love|i enjoy)\s+(.+)/i
        );

    if (likeMatch) {

        rememberOrbitDetail(
            `The user likes ${likeMatch[1].trim()}.`
        );
    }
}


/* ===========================================================
   GET MEMORY CONTEXT
   =========================================================== */

function getOrbitMemoryContext() {

    if (
        !orbitUserMemory ||
        orbitUserMemory.length === 0
    ) {

        return "";
    }

    return orbitUserMemory.join("\n");
}


/* ===========================================================
   ESCAPE HTML SAFELY
   =========================================================== */

function escapeOrbitHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ===========================================================
   ESCAPE ATTRIBUTE VALUE
   =========================================================== */

function escapeOrbitAttribute(value) {

    return escapeOrbitHTML(value);
}


/* ===========================================================
   VALIDATE WEBSITE URL
   =========================================================== */

function isValidOrbitURL(url) {

    try {

        const parsed =
            new URL(url);

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );

    } catch (_) {

        return false;
    }
}


/* ===========================================================
   CREATE COPY ICON
   =========================================================== */

function getOrbitCopyIcon() {

    return `
        <svg
            class="orbit-copy-icon"
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


/* ===========================================================
   CREATE EXTERNAL LINK ICON
   =========================================================== */

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
            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path>
        </svg>
    `;
}


/* ===========================================================
   COPY TEXT TO CLIPBOARD
   =========================================================== */

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
            "Orbit clipboard API failed. Using fallback.",
            error
        );
    }


    /* =======================================================
       FALLBACK COPY METHOD
       ======================================================= */

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

        textarea.setAttribute(
            "readonly",
            ""
        );

        document.body.appendChild(
            textarea
        );

        textarea.select();

        textarea.setSelectionRange(
            0,
            textarea.value.length
        );

        const copied =
            document.execCommand(
                "copy"
            );

        textarea.remove();

        return copied;

    } catch (error) {

        console.error(
            "Orbit could not copy text:",
            error
        );

        return false;
    }
}


/* ===========================================================
   UPDATE COPY BUTTON STATE
   =========================================================== */

function updateOrbitCopyButton(
    button,
    success,
    originalText = "Copy"
) {

    if (!button) return;

    if (success) {

        button.innerHTML = `
            <span class="orbit-copy-success">✓</span>
            Copied
        `;

        button.classList.add(
            "copied"
        );

        setTimeout(
            () => {

                if (!button.isConnected) {
                    return;
                }

                button.innerHTML =
                    getOrbitCopyIcon() +
                    originalText;

                button.classList.remove(
                    "copied"
                );

            },
            1600
        );

    } else {

        button.innerHTML =
            getOrbitCopyIcon() +
            "Copy";
    }
}


/* ===========================================================
   FORMAT URL DISPLAY
   =========================================================== */

function createOrbitLinkHTML(url, label = null) {

    if (!isValidOrbitURL(url)) {

        return escapeOrbitHTML(
            label || url
        );
    }

    const safeURL =
        escapeOrbitAttribute(url);

    const safeLabel =
        escapeOrbitHTML(
            label || url
        );

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

/* ===========================================================
   ORBIT AI — SAFE MARKDOWN / LINK FORMATTER
   =========================================================== */

/*
   IMPORTANT:
   URLs are protected BEFORE HTML is generated.

   This prevents the raw URL formatter from scanning
   generated HTML attributes such as:

   href="https://example.com"
   data-orbit-url="https://example.com"

   and creating broken nested links.
*/


/* ===========================================================
   FORMAT MARKDOWN LINKS
   =========================================================== */

function formatOrbitMarkdownLinks(text) {

    const linkTokens = [];

    const result = text.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        (match, label, url) => {

            if (!isValidOrbitURL(url)) {
                return escapeOrbitHTML(match);
            }

            const token =
                `___ORBIT_LINK_${linkTokens.length}___`;

            linkTokens.push(
                createOrbitLinkHTML(
                    url,
                    label
                )
            );

            return token;
        }
    );

    return {
        text: result,
        links: linkTokens
    };
}


/* ===========================================================
   FORMAT RAW URLS
   =========================================================== */

function formatOrbitRawLinks(
    text,
    linkTokens
) {

    const urlPattern =
        /(https?:\/\/[^\s<>"'`]+[^\s<>"'`.,!?;:)\]}])/gi;

    return text.replace(
        urlPattern,
        (url) => {

            if (!isValidOrbitURL(url)) {
                return escapeOrbitHTML(url);
            }

            const token =
                `___ORBIT_LINK_${linkTokens.length}___`;

            linkTokens.push(
                createOrbitLinkHTML(url)
            );

            return token;
        }
    );
}

function formatOrbitResponse(text) {

    if (!text) {
        return "";
    }

    let source = String(text);

    const codeBlocks = [];
    const inlineCodeBlocks = [];
    const linkTokens = [];
    const tableTokens = [];


    /* =======================================================
       1. PROTECT CODE BLOCKS
       ======================================================= */

    source = source.replace(
        /```([a-zA-Z0-9_+#.-]*)\s*\n?([\s\S]*?)```/g,
        (match, language, code) => {

            const index = codeBlocks.length;

            const cleanCode = code
                .replace(/^\n/, "")
                .replace(/\n$/, "");

            codeBlocks.push({
                language: language
                    ? language.trim().toLowerCase()
                    : "",
                code: cleanCode
            });

            return `___ORBIT_CODE_BLOCK_${index}___`;
        }
    );


    /* =======================================================
       2. PROTECT INLINE CODE
       ======================================================= */

    source = source.replace(
        /`([^`\n]+)`/g,
        (match, code) => {

            const index = inlineCodeBlocks.length;

            inlineCodeBlocks.push(`
                <code class="orbit-inline-code">
                    ${escapeOrbitHTML(code)}
                </code>
            `);

            return `___ORBIT_INLINE_CODE_${index}___`;
        }
    );


    /* =======================================================
       3. CONVERT MARKDOWN TABLES
       ======================================================= */

    const lines = source.split("\n");
    const processedLines = [];

    let i = 0;

    while (i < lines.length) {

        const currentLine = lines[i];
        const nextLine = lines[i + 1];

        /*
           Detect:

           | Header | Header |
           |--------|--------|
           | Data   | Data   |
        */

        const isTableHeader =
            currentLine &&
            currentLine.includes("|") &&
            nextLine &&
            /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(
                nextLine
            );

        if (isTableHeader) {

            const tableRows = [];

            const parseRow = (row) => {

                return row
                    .trim()
                    .replace(/^\|/, "")
                    .replace(/\|$/, "")
                    .split("|")
                    .map(cell => cell.trim());
            };

            const headers = parseRow(currentLine);

            i += 2;

            while (
                i < lines.length &&
                lines[i].includes("|") &&
                lines[i].trim() !== ""
            ) {

                tableRows.push(
                    parseRow(lines[i])
                );

                i++;
            }

            const tableIndex =
                tableTokens.length;

            let tableHTML = `
                <div class="orbit-table-wrapper">
                    <table class="orbit-table">
                        <thead>
                            <tr>
            `;

            headers.forEach(header => {

                tableHTML += `
                    <th>
                        ${escapeOrbitHTML(header)}
                    </th>
                `;

            });

            tableHTML += `
                            </tr>
                        </thead>
                        <tbody>
            `;

            tableRows.forEach(row => {

                tableHTML += `
                    <tr>
                `;

                headers.forEach((_, columnIndex) => {

                    const cell =
                        row[columnIndex] || "";

                    tableHTML += `
                        <td>
                            ${escapeOrbitHTML(cell)}
                        </td>
                    `;

                });

                tableHTML += `
                    </tr>
                `;

            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;

            tableTokens.push(tableHTML);

            processedLines.push(
                `___ORBIT_TABLE_${tableIndex}___`
            );

            continue;
        }

        processedLines.push(currentLine);

        i++;
    }

    source = processedLines.join("\n");


    /* =======================================================
       4. PROTECT MARKDOWN LINKS
       ======================================================= */

    source = source.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        (match, label, url) => {

            if (!isValidOrbitURL(url)) {
                return escapeOrbitHTML(match);
            }

            const index = linkTokens.length;

            linkTokens.push(
                createOrbitLinkHTML(
                    url,
                    label
                )
            );

            return `___ORBIT_LINK_${index}___`;
        }
    );


    /* =======================================================
       5. ESCAPE NORMAL TEXT
       ======================================================= */

    let formatted =
        escapeOrbitHTML(source);


    /* =======================================================
       6. RAW URL DETECTION
       ======================================================= */

    formatted =
        formatOrbitRawLinks(
            formatted,
            linkTokens
        );


    /* =======================================================
       7. BOLD
       ======================================================= */

    formatted = formatted.replace(
        /\*\*(.+?)\*\*/g,
        "<strong>$1</strong>"
    );


    /* =======================================================
       8. ITALIC
       ======================================================= */

    formatted = formatted.replace(
        /(^|[^\*])\*([^\*\n]+)\*(?!\*)/gm,
        "$1<em>$2</em>"
    );


    /* =======================================================
       9. HEADINGS
       ======================================================= */

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


    /* =======================================================
       10. BULLET LISTS
       ======================================================= */

    formatted = formatted.replace(
        /^[•-]\s+(.*?)$/gm,
        "<li>$1</li>"
    );


    /* =======================================================
       11. NUMBERED LISTS
       ======================================================= */

    formatted = formatted.replace(
        /^\d+\.\s+(.*?)$/gm,
        "<li>$1</li>"
    );


    /* =======================================================
       12. GROUP LIST ITEMS
       ======================================================= */

    formatted = formatted.replace(
        /((?:<li>.*?<\/li>\s*)+)/g,
        "<ul>$1</ul>"
    );


    /* =======================================================
       13. LINE BREAKS
       ======================================================= */

    formatted = formatted.replace(
        /\n/g,
        "<br>"
    );


    /* =======================================================
       14. CLEAN BLOCK ELEMENT BREAKS
       ======================================================= */

    formatted = formatted
        .replace(
            /<br>\s*<ul>/g,
            "<ul>"
        )
        .replace(
            /<\/ul>\s*<br>/g,
            "</ul>"
        )
        .replace(
            /<br>\s*<h([2-4])>/g,
            "<h$1>"
        )
        .replace(
            /<\/h([2-4])><br>/g,
            "</h$1>"
        )
        .replace(
            /<br>\s*<div class="orbit-table-wrapper">/g,
            '<div class="orbit-table-wrapper">'
        )
        .replace(
            /<\/div>\s*<br>/g,
            "</div>"
        );


    /* =======================================================
       15. RESTORE INLINE CODE
       ======================================================= */

    inlineCodeBlocks.forEach(
        (block, index) => {

            formatted = formatted.replace(
                `___ORBIT_INLINE_CODE_${index}___`,
                block
            );

        }
    );


    /* =======================================================
       16. RESTORE LINKS
       ======================================================= */

    linkTokens.forEach(
        (linkHTML, index) => {

            formatted = formatted.replace(
                `___ORBIT_LINK_${index}___`,
                linkHTML
            );

        }
    );


    /* =======================================================
       17. RESTORE TABLES
       ======================================================= */

    tableTokens.forEach(
        (tableHTML, index) => {

            formatted = formatted.replace(
                `___ORBIT_TABLE_${index}___`,
                tableHTML
            );

        }
    );


    /* =======================================================
       18. RESTORE CODE BLOCKS
       ======================================================= */

    codeBlocks.forEach(
        (block, index) => {

            const safeCode =
                escapeOrbitHTML(block.code);

            const safeLanguage =
                escapeOrbitHTML(block.language);

            const languageLabel =
                block.language
                    ? block.language.toUpperCase()
                    : "CODE";

            const codeBlockHTML = `
                <div
                    class="orbit-code-container"
                    data-orbit-code-block
                >

                    <div class="orbit-code-header">

                        <span class="orbit-code-language">
                            ${safeLanguage || languageLabel}
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

                    <pre class="orbit-code-block"><code>${safeCode}</code></pre>

                </div>
            `;

            formatted = formatted.replace(
                `___ORBIT_CODE_BLOCK_${index}___`,
                codeBlockHTML
            );

        }
    );


    /* =======================================================
       19. REMOVE UNINTENTIONAL MARKDOWN ASTERISKS
       ======================================================= */

    formatted = formatted.replace(
        /(^|<br>)\s*\*{1,3}\s+/g,
        "$1"
    );


    return formatted;
}


/* ===========================================================
   ADD MESSAGE TO CHAT
   =========================================================== */

function addOrbitMessage(
    text,
    sender = "orbit"
) {

    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    const message =
        document.createElement(
            "div"
        );

    message.className =
        `message ${sender}`;


    /* =======================================================
       USER MESSAGE
       ======================================================= */

    if (
        sender === "user"
    ) {

        message.textContent =
            text;

    }


    /* =======================================================
       ORBIT MESSAGE
       ======================================================= */

    else {

        message.innerHTML =
            formatOrbitResponse(
                text
            );
    }


    chatWindow.appendChild(
        message
    );

    chatWindow.scrollTop =
        chatWindow.scrollHeight;
}


/* ===========================================================
   HANDLE CHAT ACTIONS

   Handles:
   - Copy code
   - Copy links
   - Open links
   =========================================================== */

function setupOrbitChatActions() {

    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }


    /*
       Prevent duplicate event listeners.
    */

    if (
        chatWindow.dataset.orbitActionsReady === "true"
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


            /* =================================================
               COPY CODE
               ================================================= */

            if (copyCodeButton) {

                const container =
                    copyCodeButton.closest(
                        "[data-orbit-code-block]"
                    );

                if (!container) {
                    return;
                }

                const codeElement =
                    container.querySelector(
                        "pre code"
                    );

                if (!codeElement) {
                    return;
                }

                /*
                   textContent gives us the original code
                   including HTML < > characters.
                */

                const code =
                    codeElement.textContent;

                const success =
                    await copyOrbitText(
                        code
                    );

                updateOrbitCopyButton(
                    copyCodeButton,
                    success,
                    "Copy"
                );

                return;
            }


            /* =================================================
               COPY LINK
               ================================================= */

            if (copyLinkButton) {

                const url =
                    copyLinkButton.dataset.orbitUrl;

                if (!url) {
                    return;
                }

                const success =
                    await copyOrbitText(
                        url
                    );

                if (success) {

                    copyLinkButton.innerHTML =
                        "✓";

                    copyLinkButton.classList.add(
                        "copied"
                    );

                    setTimeout(
                        () => {

                            if (!copyLinkButton.isConnected) {
                                return;
                            }

                            copyLinkButton.innerHTML =
                                getOrbitCopyIcon();

                            copyLinkButton.classList.remove(
                                "copied"
                            );

                        },
                        1600
                    );
                }

                return;
            }


            /* =================================================
               OPEN LINK
               ================================================= */

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

                return;
            }

        }
    );
}


/* ===========================================================
   TYPING / COLD START INDICATOR
   =========================================================== */

let orbitTypingTimer = null;
let orbitColdStartTimer = null;


/* ===========================================================
   SHOW INITIAL THINKING MESSAGE
   =========================================================== */

function showOrbitTyping() {

    const {
        chatWindow
    } = getOrbitElements();

    if (!chatWindow) {
        return;
    }


    /* Prevent duplicate indicators. */

    if (
        document.getElementById(
            "orbit-typing"
        )
    ) {

        return;
    }


    const typing =
        document.createElement(
            "div"
        );

    typing.id =
        "orbit-typing";

    typing.className =
        "message orbit typing-message";


    /*
       Initial message.
       This tells the user that the backend
       may be waking up from Render sleep.
    */

    typing.innerHTML = `

        <span class="orbit-thinking-text">
            Orbit is waking up
        </span>

        <span class="typing-dots">
            ...
        </span>

        <small class="orbit-wake-message">
            This may take a few seconds on the first message.
        </small>

    `;


    chatWindow.appendChild(
        typing
    );

    chatWindow.scrollTop =
        chatWindow.scrollHeight;


    /*
       After 5 seconds, update the message.
    */

    orbitColdStartTimer =
        setTimeout(
            () => {

                const currentTyping =
                    document.getElementById(
                        "orbit-typing"
                    );

                if (!currentTyping) {
                    return;
                }

                const textElement =
                    currentTyping.querySelector(
                        ".orbit-thinking-text"
                    );

                const wakeMessage =
                    currentTyping.querySelector(
                        ".orbit-wake-message"
                    );

                if (textElement) {

                    textElement.textContent =
                        "Orbit is still waking up";
                }

                if (wakeMessage) {

                    wakeMessage.textContent =
                        "The server is starting up. Almost there...";
                }

            },
            5000
        );


    /*
       After 12 seconds, give the user another
       reassuring message.
    */

    orbitTypingTimer =
        setTimeout(
            () => {

                const currentTyping =
                    document.getElementById(
                        "orbit-typing"
                    );

                if (!currentTyping) {
                    return;
                }

                const textElement =
                    currentTyping.querySelector(
                        ".orbit-thinking-text"
                    );

                const wakeMessage =
                    currentTyping.querySelector(
                        ".orbit-wake-message"
                    );

                if (textElement) {

                    textElement.textContent =
                        "Orbit is working on it";
                }

                if (wakeMessage) {

                    wakeMessage.textContent =
                        "Thanks for waiting — your request is being processed.";
                }

            },
            12000
        );
}


/* ===========================================================
   REMOVE TYPING INDICATOR
   =========================================================== */

function hideOrbitTyping() {

    if (orbitTypingTimer) {

        clearTimeout(
            orbitTypingTimer
        );

        orbitTypingTimer =
            null;
    }


    if (orbitColdStartTimer) {

        clearTimeout(
            orbitColdStartTimer
        );

        orbitColdStartTimer =
            null;
    }


    const typing =
        document.getElementById(
            "orbit-typing"
        );

    if (typing) {

        typing.remove();
    }
}


/* ===========================================================
   SEND MESSAGE
   =========================================================== */

async function orbitSendMessage(
    suppliedMessage = null
) {

    const {
        commandInput,
        sendButton
    } = getOrbitElements();


    if (!commandInput) {

        console.warn(
            "Orbit input element was not found."
        );

        return;
    }


    if (orbitIsWaiting) {
        return;
    }


    const message =
        suppliedMessage !== null
            ? String(
                suppliedMessage
            ).trim()
            : commandInput.value.trim();


    if (!message) {
        return;
    }


    /* =======================================================
       DETECT USER MEMORY
       ======================================================= */

    detectOrbitMemory(
        message
    );


    /* =======================================================
       ADD USER MESSAGE
       ======================================================= */

    addOrbitMessage(
        message,
        "user"
    );


    /* =======================================================
       UPDATE TEMPORARY HISTORY
       ======================================================= */

    orbitConversationHistory.push({

        role: "user",

        content: message

    });


    /*
       Backend history limit is 30 messages.
    */

    if (
        orbitConversationHistory.length >
        30
    ) {

        orbitConversationHistory =
            orbitConversationHistory.slice(
                -30
            );
    }


    /* =======================================================
       CLEAR INPUT
       ======================================================= */

    if (
        suppliedMessage === null
    ) {

        commandInput.value =
            "";
    }


    /* =======================================================
       DISABLE CONTROLS
       ======================================================= */

    orbitIsWaiting =
        true;

    commandInput.disabled =
        true;


    if (sendButton) {

        sendButton.disabled =
            true;
    }


    /* =======================================================
       SHOW COLD START / THINKING INDICATOR
       ======================================================= */

    showOrbitTyping();


    const startTime =
        performance.now();


    try {

        /* ===================================================
           SEND REQUEST TO RENDER BACKEND
           =================================================== */

        const response =
            await fetch(
                ORBIT_API_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            /*
                               Actual user message.
                            */

                            message:
                                message,


                            /*
                               Temporary conversation.
                               NOT persisted.
                            */

                            history:
                                orbitConversationHistory,


                            /*
                               Local memory cache.
                               Backend also loads
                               persistent Supabase memory.
                            */

                            memory:
                                getOrbitMemoryContext(),


                            /*
                               Anonymous browser identity.
                               Used by the backend to connect
                               this visitor with their Supabase
                               memory.
                            */

                            userId:
                                ORBIT_USER_ID

                        })

                }
            );


        /* ===================================================
           HTTP ERROR
           =================================================== */

        if (!response.ok) {

            let errorMessage =
                `Server returned ${response.status}`;


            try {

                const errorData =
                    await response.json();

                if (
                    errorData &&
                    errorData.error
                ) {

                    errorMessage =
                        errorData.error;
                }

            } catch (_) {

                /*
                   Ignore JSON parsing errors.
                */
            }


            throw new Error(
                errorMessage
            );
        }


        /* ===================================================
           READ RESPONSE
           =================================================== */

        const data =
            await response.json();


        hideOrbitTyping();


        /* ===================================================
           GET ORBIT REPLY
           =================================================== */

        const reply =
            data.reply ||
            data.response ||
            data.message;


        if (!reply) {

            throw new Error(
                "Orbit returned an empty response."
            );
        }


        /* ===================================================
           UPDATE MEMORY FROM SERVER RESPONSE
           =================================================== */

        /*
           If the backend returns memory as an array,
           synchronize the local cache.
        */

        if (
            Array.isArray(data.memory)
        ) {

            orbitUserMemory =
                data.memory.slice(-50);

            saveOrbitMemoryCache();
        }


        /*
           Some backend versions may return
           memory as a string.
        */

        else if (
            typeof data.memory === "string" &&
            data.memory.trim()
        ) {

            orbitUserMemory =
                data.memory
                    .split("\n")
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(Boolean)
                    .slice(-50);

            saveOrbitMemoryCache();
        }


        /* ===================================================
           DISPLAY ORBIT RESPONSE
           =================================================== */

        addOrbitMessage(
            reply,
            "orbit"
        );


        /* ===================================================
           SAVE RESPONSE TO TEMPORARY HISTORY
           =================================================== */

        orbitConversationHistory.push({

            role: "assistant",

            content: reply

        });


        if (
            orbitConversationHistory.length >
            30
        ) {

            orbitConversationHistory =
                orbitConversationHistory.slice(
                    -30
                );
        }


        /* ===================================================
           RESPONSE TIME
           =================================================== */

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
                    elapsed / 1000
                ).toFixed(1)}s`;
        }

    }


    catch (error) {

        console.error(
            "Orbit AI request failed:",
            error
        );


        hideOrbitTyping();


        addOrbitMessage(
            `Orbit connection error: ${error.message}`,
            "orbit"
        );


        const responseTime =
            document.getElementById(
                "response-time"
            );


        if (responseTime) {

            responseTime.textContent =
                "Connection error";
        }
    }


    /* =======================================================
       RE-ENABLE CONTROLS
       ======================================================= */

    orbitIsWaiting =
        false;

    commandInput.disabled =
        false;


    if (sendButton) {

        sendButton.disabled =
            false;
    }


    commandInput.focus();
}


/* ===========================================================
   CLEAR CONVERSATION
   =========================================================== */

function clearOrbitConversation() {

    if (orbitIsWaiting) {
        return;
    }


    /*
       Clears ONLY temporary conversation history.
       Does NOT delete Supabase memory.
    */

    orbitConversationHistory =
        [];


    const {
        chatWindow
    } = getOrbitElements();


    if (chatWindow) {

        chatWindow.innerHTML =
            "";

        addOrbitMessage(
            "Orbit AI Online. How can I assist you?",
            "orbit"
        );
    }


    const responseTime =
        document.getElementById(
            "response-time"
        );


    if (responseTime) {

        responseTime.textContent =
            "Ready";
    }
}


/* ===========================================================
   NEW CHAT
   =========================================================== */

function startOrbitNewChat() {

    clearOrbitConversation();


    const {
        commandInput
    } = getOrbitElements();


    if (commandInput) {

        commandInput.value =
            "";

        commandInput.focus();
    }
}


/* ===========================================================
   ENTER KEY
   =========================================================== */

function setupOrbitKeyboard() {

    const {
        commandInput
    } = getOrbitElements();


    if (!commandInput) {
        return;
    }


    /*
       Prevent duplicate keyboard listeners.
    */

    if (
        commandInput.dataset.orbitKeyboardReady === "true"
    ) {

        return;
    }


    commandInput.dataset.orbitKeyboardReady =
        "true";


    commandInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                orbitSendMessage();
            }
        }
    );
}


/* ===========================================================
   SEND BUTTON
   =========================================================== */

function setupOrbitSendButton() {

    const {
        sendButton
    } = getOrbitElements();


    if (!sendButton) {
        return;
    }


    /*
       Prevent duplicate send listeners.
    */

    if (
        sendButton.dataset.orbitSendReady === "true"
    ) {

        return;
    }


    sendButton.dataset.orbitSendReady =
        "true";


    sendButton.addEventListener(
        "click",
        () => {

            orbitSendMessage();

        }
    );
}


/* ===========================================================
   INITIALIZE ORBIT
   =========================================================== */

function initializeOrbitAI() {

    /*
       Load only the local memory cache.
       Persistent memory comes from Supabase
       through the backend.
    */

    loadOrbitMemory();


    /*
       Conversation history is intentionally
       reset whenever the page loads.
       Persistent memory remains available.
    */

    orbitConversationHistory =
        [];


    const {
        chatWindow
    } = getOrbitElements();


    if (chatWindow) {

        chatWindow.innerHTML =
            "";

        addOrbitMessage(
            "Orbit AI Online. How can I assist you?",
            "orbit"
        );
    }


    /*
       Set up controls.
    */

    setupOrbitSendButton();

    setupOrbitKeyboard();

    setupOrbitChatActions();


    console.log(
        "Orbit AI initialized.",
        {

            userId:
                ORBIT_USER_ID,

            api:
                ORBIT_API_URL

        }
    );
}


/* ===========================================================
   PUBLIC ORBIT AI API
   =========================================================== */

window.OrbitAI = {

    sendMessage:
        orbitSendMessage,

    clearConversation:
        clearOrbitConversation,

    newChat:
        startOrbitNewChat,

    getMemory:
        getOrbitMemoryContext,

    getUserId:
        () => ORBIT_USER_ID,

    formatResponse:
        formatOrbitResponse,

    isWaiting:
        () => orbitIsWaiting

};


/* ===========================================================
   START
   =========================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitAI
    );

} else {

    initializeOrbitAI();
}
