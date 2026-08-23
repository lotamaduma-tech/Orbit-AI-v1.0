/* ===========================================================
   ORBIT AI — SHARED AI ENGINE
   ===========================================================

   Used by:
   - index.html
   - assistant.html

   Handles:
   - API communication
   - Temporary conversation history
   - Persistent Supabase user memory
   - Anonymous browser identity
   - Automatic memory detection
   - AI response formatting
   - Clickable website links
   - Copyable website links
   - Copyable code blocks
   - HTML / CSS / JS code rendering
   - Markdown tables
   - Orbit typing indicator
   - Sending messages
   - Enter-to-send
   - Shared AI state

   IMPORTANT:
   Conversation history is NOT saved locally.
   Persistent memory is handled by the backend/Supabase.

   =========================================================== */

"use strict";

/* ===========================================================
   CONFIGURATION
   =========================================================== */

const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";

const ORBIT_HISTORY_LIMIT = 30;
const ORBIT_MEMORY_LIMIT = 50;
const ORBIT_REQUEST_TIMEOUT = 45000;

/* ===========================================================
   STORAGE KEYS
   =========================================================== */

const ORBIT_USER_ID_KEY = "orbit-user-id";
const ORBIT_MEMORY_CACHE_KEY = "orbit-memory-cache";

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
        console.error(
            "Orbit user ID could not be created:",
            error
        );

        return "orbit-temporary-" + Date.now();
    }
}

/* ===========================================================
   CURRENT USER ID
   =========================================================== */

const ORBIT_USER_ID = getOrbitUserId();

/* ===========================================================
   GET CURRENT PAGE ELEMENTS
   =========================================================== */

function getOrbitElements() {
    return {
        chatWindow: document.getElementById("chat-window"),
        commandInput: document.getElementById("command-input"),
        sendButton: document.getElementById("send-btn"),
    };
}

/* ===========================================================
   SCROLL CHAT TO BOTTOM
   =========================================================== */

function scrollOrbitChat(behavior = "auto") {
    const { chatWindow } = getOrbitElements();

    if (!chatWindow) {
        return;
    }

    requestAnimationFrame(() => {
        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior,
        });
    });
}

/* ===========================================================
   LOAD LOCAL MEMORY CACHE
   =========================================================== */

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

        if (Array.isArray(parsed)) {
            orbitUserMemory = parsed
                .filter(
                    (item) =>
                        typeof item === "string" && item.trim()
                )
                .slice(-ORBIT_MEMORY_LIMIT);
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
            JSON.stringify(orbitUserMemory)
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
    if (!detail) {
        return;
    }

    const cleanDetail = String(detail).trim();

    if (!cleanDetail) {
        return;
    }

    const exists = orbitUserMemory.some(
        (item) =>
            String(item).toLowerCase() ===
            cleanDetail.toLowerCase()
    );

    if (exists) {
        return;
    }

    orbitUserMemory.push(cleanDetail);

    if (
        orbitUserMemory.length >
        ORBIT_MEMORY_LIMIT
    ) {
        orbitUserMemory =
            orbitUserMemory.slice(-ORBIT_MEMORY_LIMIT);
    }

    saveOrbitMemoryCache();
}

/* ===========================================================
   AUTOMATIC MEMORY DETECTION
   =========================================================== */

function detectOrbitMemory(message) {
    if (!message) {
        return;
    }

    const text = String(message).trim();

    if (!text) {
        return;
    }

    /* =======================================================
       NAME
       ======================================================= */

    const nameMatch = text.match(
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

    const ageMatch = text.match(
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

    const schoolMatch = text.match(
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

    const courseMatch = text.match(
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

    const locationMatch = text.match(
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

    const goalMatch = text.match(
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

    const likeMatch = text.match(
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
        const parsed = new URL(url);

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
      <path
        d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"
      ></path>
    </svg>
  `;
}

/* ===========================================================
   COPY TEXT TO CLIPBOARD
   =========================================================== */

async function copyOrbitText(text) {
    const value = String(text ?? "");

    if (!value) {
        return false;
    }

    try {
        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (error) {
        console.warn(
            "Orbit clipboard API failed. Using fallback.",
            error
        );
    }

    try {
        const textarea =
            document.createElement("textarea");

        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.setAttribute("readonly", "");

        document.body.appendChild(textarea);

        textarea.select();
        textarea.setSelectionRange(
            0,
            textarea.value.length
        );

        const copied =
            document.execCommand("copy");

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
    if (!button) {
        return;
    }

    if (success) {
        button.innerHTML = `
      <span class="orbit-copy-success">
        ✓
      </span>
      Copied
    `;

        button.classList.add("copied");

        setTimeout(() => {
            if (!button.isConnected) {
                return;
            }

            button.innerHTML =
                getOrbitCopyIcon() + originalText;

            button.classList.remove("copied");
        }, 1600);
    } else {
        button.innerHTML =
            getOrbitCopyIcon() + originalText;
    }
}

/* ===========================================================
   FORMAT URL DISPLAY
   =========================================================== */

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
        escapeOrbitAttribute(url);

    const safeLabel =
        escapeOrbitHTML(label || url);

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
   FORMAT RAW URLS
   =========================================================== */

function formatOrbitRawLinks(
    text,
    linkTokens
) {
    const urlPattern =
        /(https?:\/\/[^\s<>"'`]+[^\s<>"'.,!?;:)\]}])/gi;

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

/* ===========================================================
   FORMAT ORBIT RESPONSE
   =========================================================== */

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
            const index =
                codeBlocks.length;

            const cleanCode = code
                .replace(/^\n/, "")
                .replace(/\n$/, "");

            codeBlocks.push({
                language: language
                    ? language.trim().toLowerCase()
                    : "",
                code: cleanCode,
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
            const index =
                inlineCodeBlocks.length;

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
                    .map((cell) => cell.trim());
            };

            const headers =
                parseRow(currentLine);

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

            headers.forEach((header) => {
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

            tableRows.forEach((row) => {
                tableHTML += `
          <tr>
        `;

                headers.forEach(
                    (_, columnIndex) => {
                        const cell =
                            row[columnIndex] || "";

                        tableHTML += `
              <td>
                ${escapeOrbitHTML(cell)}
              </td>
            `;
                    }
                );

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

    source =
        processedLines.join("\n");

    /* =======================================================
       4. PROTECT MARKDOWN LINKS
       ======================================================= */

    source = source.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi,
        (match, label, url) => {
            if (!isValidOrbitURL(url)) {
                return escapeOrbitHTML(match);
            }

            const index =
                linkTokens.length;

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

    formatted =
        formatted.replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        );

    /* =======================================================
       8. ITALIC
       ======================================================= */

    formatted =
        formatted.replace(
            /(^|[^\*])\*([^\*\n]+)\*(?!\*)/gm,
            "$1<em>$2</em>"
        );

    /* =======================================================
       9. HEADINGS
       ======================================================= */

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

    /* =======================================================
       10. BULLET LISTS
       ======================================================= */

    formatted =
        formatted.replace(
            /^[•-]\s+(.*?)$/gm,
            "<li>$1</li>"
        );

    /* =======================================================
       11. NUMBERED LISTS
       ======================================================= */

    formatted =
        formatted.replace(
            /^\d+\.\s+(.*?)$/gm,
            "<li>$1</li>"
        );

    /* =======================================================
       12. GROUP LIST ITEMS
       ======================================================= */

    formatted =
        formatted.replace(
            /((?:<li>.*?<\/li>\s*)+)/g,
            "<ul>$1</ul>"
        );

    /* =======================================================
       13. LINE BREAKS
       ======================================================= */

    formatted =
        formatted.replace(
            /\n/g,
            "<br>"
        );

    /* =======================================================
       14. CLEAN BLOCK ELEMENT BREAKS
       ======================================================= */

    formatted =
        formatted
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
            formatted =
                formatted.replace(
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
            formatted =
                formatted.replace(
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
            formatted =
                formatted.replace(
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

            formatted =
                formatted.replace(
                    `___ORBIT_CODE_BLOCK_${index}___`,
                    codeBlockHTML
                );
        }
    );

    /* =======================================================
       19. REMOVE UNINTENTIONAL MARKDOWN ASTERISKS
       ======================================================= */

    formatted =
        formatted.replace(
            /(^|<br>)\s*\*{1,3}\s+/g,
            "$1"
        );

    return formatted;
}

/* ===========================================================
   CREATE MESSAGE GROUP
   ===========================================================

   A conversation group keeps the user's question and
   Orbit's response visually connected.

   Structure:

   conversation-group
      ├── user message
      └── Orbit response

   =========================================================== */

function createOrbitConversationGroup() {
    const group =
        document.createElement("div");

    group.className =
        "conversation-group";

    group.dataset.orbitConversation =
        "true";

    return group;
}

/* ===========================================================
   ADD MESSAGE TO CHAT
   =========================================================== */

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

    /* =======================================================
       CREATE / USE CONVERSATION GROUP
       ======================================================= */

    let conversationGroup = group;

    if (!conversationGroup) {
        conversationGroup =
            createOrbitConversationGroup();

        chatWindow.appendChild(
            conversationGroup
        );
    }

    /* =======================================================
       CREATE MESSAGE ROW
       ======================================================= */

    const row =
        document.createElement("div");

    row.className =
        `message-row ${sender}`;

    row.dataset.sender =
        sender;

    /* =======================================================
       CREATE MESSAGE
       ======================================================= */

    const message =
        document.createElement("div");

    message.className =
        `message ${sender}`;

    /* =======================================================
       USER MESSAGE
       ======================================================= */

    if (sender === "user") {
        message.textContent =
            String(text ?? "");
    }

    /* =======================================================
       ORBIT MESSAGE
       ======================================================= */

    else {
        message.innerHTML =
            formatOrbitResponse(text);
    }

    row.appendChild(message);

    conversationGroup.appendChild(
        row
    );

    scrollOrbitChat("auto");

    return conversationGroup;
}

/* ===========================================================
   ADD COMPLETE QUESTION + RESPONSE PAIR
   ===========================================================

   This is used when we want to explicitly associate an
   Orbit response with the exact question that produced it.

   =========================================================== */

function addOrbitConversationPair(
    userMessage,
    orbitReply
) {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return null;
    }

    const group =
        createOrbitConversationGroup();

    chatWindow.appendChild(group);

    addOrbitMessage(
        userMessage,
        "user",
        group
    );

    addOrbitMessage(
        orbitReply,
        "orbit",
        group
    );

    return group;
}

/* ===========================================================
   HANDLE CHAT ACTIONS
   =========================================================== */

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
        async (event) => {
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

                const code =
                    codeElement.textContent;

                const success =
                    await copyOrbitText(code);

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
   ORBIT TYPING INDICATOR
   =========================================================== */

function showOrbitTyping() {
    const { chatWindow } =
        getOrbitElements();

    if (!chatWindow) {
        return;
    }

    if (
        document.getElementById(
            "orbit-typing"
        )
    ) {
        return;
    }

    const row =
        document.createElement("div");

    row.id =
        "orbit-typing";

    row.className =
        "message-row orbit typing-row";

    const typing =
        document.createElement("div");

    typing.className =
        "message orbit typing-message";

    typing.innerHTML = `
    <span
      class="orbit-thinking"
      aria-label="Orbit is responding"
      role="status"
    >

      <span
        class="orbit-thinking-core"
      ></span>

      <span
        class="orbit-thinking-ring"
      ></span>

      <span
        class="orbit-thinking-dot orbit-thinking-dot-one"
      ></span>

      <span
        class="orbit-thinking-dot orbit-thinking-dot-two"
      ></span>

    </span>
  `;

    row.appendChild(typing);

    chatWindow.appendChild(row);

    scrollOrbitChat("auto");
}

/* ===========================================================
   REMOVE TYPING INDICATOR
   =========================================================== */

function hideOrbitTyping() {
    const typing =
        document.getElementById(
            "orbit-typing"
        );

    if (typing) {
        typing.remove();
    }
}

/* ===========================================================
   BUILD HISTORY FOR API
   ===========================================================

   IMPORTANT:

   The current user question is NOT included here.

   The backend receives:

      history = previous messages

      message = current question

   This prevents the current question from being
   accidentally sent twice.

   =========================================================== */

function getOrbitHistoryForAPI() {
    return orbitConversationHistory
        .filter(
            (item) =>
                item &&
                (item.role === "user" ||
                    item.role === "assistant") &&
                typeof item.content === "string" &&
                item.content.trim()
        )
        .slice(-ORBIT_HISTORY_LIMIT);
}

/* ===========================================================
   SAVE MESSAGE TO TEMPORARY HISTORY
   =========================================================== */

function saveOrbitHistoryMessage(
    role,
    content
) {
    if (
        !content ||
        typeof content !== "string"
    ) {
        return;
    }

    orbitConversationHistory.push({
        role,
        content: content.trim(),
    });

    if (
        orbitConversationHistory.length >
        ORBIT_HISTORY_LIMIT
    ) {
        orbitConversationHistory =
            orbitConversationHistory.slice(
                -ORBIT_HISTORY_LIMIT
            );
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
        sendButton,
    } = getOrbitElements();

    if (!commandInput) {
        console.warn(
            "Orbit input element was not found."
        );

        return;
    }

    /* =======================================================
       PREVENT DUPLICATE REQUESTS
       ======================================================= */

    if (orbitIsWaiting) {
        return;
    }

    /* =======================================================
       GET MESSAGE
       ======================================================= */

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

    detectOrbitMemory(message);

    /* =======================================================
       SAVE PREVIOUS HISTORY BEFORE CURRENT QUESTION
       ======================================================= */

    const historyForAPI =
        getOrbitHistoryForAPI();

    /* =======================================================
       CLEAR INPUT
       ======================================================= */

    if (suppliedMessage === null) {
        commandInput.value = "";
    }

    commandInput.dispatchEvent(
        new Event("input", {
            bubbles: true,
        })
    );

    /* =======================================================
       DISABLE CONTROLS
       ======================================================= */

    orbitIsWaiting = true;

    commandInput.disabled = true;

    if (sendButton) {
        sendButton.disabled = true;
    }

    /* =======================================================
       CREATE QUESTION GROUP
       ======================================================= */

    const conversationGroup =
        createOrbitConversationGroup();

    const { chatWindow } =
        getOrbitElements();

    if (chatWindow) {
        chatWindow.appendChild(
            conversationGroup
        );
    }

    /* =======================================================
       DISPLAY USER QUESTION
       ======================================================= */

    addOrbitMessage(
        message,
        "user",
        conversationGroup
    );

    /* =======================================================
       SHOW TYPING INDICATOR
       ======================================================= */

    showOrbitTyping();

    const startTime =
        performance.now();

    /* =======================================================
       REQUEST TIMEOUT
       ======================================================= */

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(() => {
            controller.abort();
        }, ORBIT_REQUEST_TIMEOUT);

    try {
        /* ===================================================
           SEND REQUEST
           =================================================== */

        const response =
            await fetch(
                ORBIT_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    signal:
                        controller.signal,

                    cache: "no-store",

                    body: JSON.stringify({
                        /*
                          Current question.
                        */
                        message,

                        /*
                          ONLY previous conversation.
                          Current message is intentionally
                          not included here.
                        */
                        history:
                            historyForAPI,

                        /*
                          Local memory cache.
                        */
                        memory:
                            getOrbitMemoryContext(),

                        /*
                          Anonymous browser identity.
                        */
                        userId:
                            ORBIT_USER_ID,
                    }),
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
                /* Ignore JSON errors. */
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
           UPDATE MEMORY FROM SERVER
           =================================================== */

        if (
            Array.isArray(
                data.memory
            )
        ) {
            orbitUserMemory =
                data.memory
                    .filter(
                        (item) =>
                            typeof item ===
                            "string" &&
                            item.trim()
                    )
                    .slice(
                        -ORBIT_MEMORY_LIMIT
                    );

            saveOrbitMemoryCache();
        }

        else if (
            typeof data.memory ===
            "string" &&
            data.memory.trim()
        ) {
            orbitUserMemory =
                data.memory
                    .split("\n")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(Boolean)
                    .slice(
                        -ORBIT_MEMORY_LIMIT
                    );

            saveOrbitMemoryCache();
        }

        /* ===================================================
           DISPLAY ORBIT RESPONSE
           ===================================================
    
           IMPORTANT:
    
           The response is inserted into the SAME
           conversation group as the user's question.
    
           Therefore:
    
           User question
                  ↓
           Orbit response
    
           =================================================== */

        addOrbitMessage(
            reply,
            "orbit",
            conversationGroup
        );

        /* ===================================================
           SAVE CURRENT QUESTION TO HISTORY
           =================================================== */

        saveOrbitHistoryMessage(
            "user",
            message
        );

        /* ===================================================
           SAVE ORBIT RESPONSE TO HISTORY
           =================================================== */

        saveOrbitHistoryMessage(
            "assistant",
            reply
        );

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

    } catch (error) {
        console.error(
            "Orbit AI request failed:",
            error
        );

        hideOrbitTyping();

        let errorMessage =
            error?.message ||
            "Unable to connect to Orbit.";

        /* ===================================================
           TIMEOUT
           =================================================== */

        if (
            error &&
            error.name ===
            "AbortError"
        ) {
            errorMessage =
                "Orbit took too long to respond. Please try again.";
        }

        /* ===================================================
           DISPLAY ERROR IN SAME GROUP
           =================================================== */

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

    } finally {
        clearTimeout(timeoutId);

        /* ===================================================
           RESTORE INTERFACE
           =================================================== */

        orbitIsWaiting = false;

        commandInput.disabled =
            false;

        if (sendButton) {
            sendButton.disabled =
                false;
        }

        commandInput.focus();
    }
}

/* ===========================================================
   CLEAR CONVERSATION
   =========================================================== */

function clearOrbitConversation() {
    if (orbitIsWaiting) {
        return;
    }

    /* =======================================================
       CLEAR ONLY TEMPORARY HISTORY
       ======================================================= */

    orbitConversationHistory = [];

    const { chatWindow } =
        getOrbitElements();

    if (chatWindow) {
        chatWindow.innerHTML = "";

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

    const { commandInput } =
        getOrbitElements();

    if (commandInput) {
        commandInput.value = "";

        commandInput.dispatchEvent(
            new Event("input", {
                bubbles: true,
            })
        );

        commandInput.focus();
    }
}

/* ===========================================================
   ENTER KEY
   =========================================================== */

function setupOrbitKeyboard() {
    const { commandInput } =
        getOrbitElements();

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
        (event) => {
            /*
              Enter sends.
              Shift + Enter creates a new line.
            */

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();

                if (!orbitIsWaiting) {
                    orbitSendMessage();
                }
            }
        }
    );
}

/* ===========================================================
   SEND BUTTON
   =========================================================== */

function setupOrbitSendButton() {
    const { sendButton } =
        getOrbitElements();

    if (!sendButton) {
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

    sendButton.addEventListener(
        "click",
        () => {
            if (!orbitIsWaiting) {
                orbitSendMessage();
            }
        }
    );
}

/* ===========================================================
   INITIALIZE ORBIT
   =========================================================== */

function initializeOrbitAI() {
    /* =======================================================
       LOAD LOCAL MEMORY
       ======================================================= */

    loadOrbitMemory();

    /* =======================================================
       RESET TEMPORARY CONVERSATION
       ======================================================= */

    orbitConversationHistory = [];
    orbitIsWaiting = false;

    const {
        chatWindow,
        commandInput,
        sendButton,
    } = getOrbitElements();

    /* =======================================================
       INITIAL CHAT STATE
       ======================================================= */

    if (chatWindow) {
        chatWindow.innerHTML = "";

        const initialGroup =
            createOrbitConversationGroup();

        chatWindow.appendChild(
            initialGroup
        );

        addOrbitMessage(
            "Orbit AI Online. How can I assist you?",
            "orbit",
            initialGroup
        );
    }

    /* =======================================================
       ENABLE CONTROLS
       ======================================================= */

    if (commandInput) {
        commandInput.disabled = false;
    }

    if (sendButton) {
        sendButton.disabled = false;
    }

    /* =======================================================
       SETUP CONTROLS
       ======================================================= */

    setupOrbitSendButton();
    setupOrbitKeyboard();
    setupOrbitChatActions();

    console.log(
        "Orbit AI initialized.",
        {
            userId:
                ORBIT_USER_ID,

            api:
                ORBIT_API_URL,
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
        () => orbitIsWaiting,
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