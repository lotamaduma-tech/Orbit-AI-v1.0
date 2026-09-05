"use strict";

(() => {
    /* Configuration */

    const API = window.AdumexApi.base;
    const CHAT_URL = API + "/chat";

    const HISTORY_LIMIT = 30;
    const MAX_MESSAGE_LENGTH = 20000;
    const MAX_STORED_RESPONSE_LENGTH = 50000;
    const MAX_FILES = 10;
    const MAX_TOTAL_FILE_SIZE =
        30 * 1024 * 1024;

    const SERVER_CONVERSATIONS_KEY =
        "adumex-server-conversations";

    const state = {
        messages: [],
        conversationId: null,
        chatId: null,
        generating: false,
        controller: null,
        assistantElement: null,
        assistantText: "",
        request: null,
        loadController: null,
        loadVersion: 0,
        initialized: false
    };

    /* Elements */

    function getChatWindow() {
        return document.getElementById(
            "chat-window"
        );
    }

    function getInput() {
        return document.getElementById(
            "command-input"
        );
    }

    function getSendButton() {
        return document.getElementById(
            "send-btn"
        );
    }

    function getCommandArea() {
        return document.querySelector(
            ".command-area"
        );
    }

    function updatePlaceholder() {
        const input = getInput();

        if (!input || input.value.trim()) {
            return;
        }

        const prompts = [
            "What can we debug?",
            "What can we build?",
            "What can we solve?",
            "What can we create?"
        ];

        const day = new Date().getDate();
        input.placeholder = prompts[day % prompts.length];
    }

    /* Helpers */

    function cleanText(
        value,
        maxLength = MAX_MESSAGE_LENGTH
    ) {
        return String(value || "")
            .replace(/\u0000/g, "")
            .slice(0, maxLength)
            .trim();
    }

    function normalizeMessages(messages) {
        if (!Array.isArray(messages)) {
            return [];
        }

        return messages
            .filter(
                item =>
                    item &&
                    ["user", "assistant"].includes(
                        item.role
                    ) &&
                    typeof item.content ===
                    "string"
            )
            .map(item => ({
                role: item.role,
                content: cleanText(
                    item.content
                ),
                attachments:
                    Array.isArray(
                        item.attachments
                    )
                        ? item.attachments.map(
                            file => ({
                                name: String(
                                    file?.name ||
                                    "Unnamed file"
                                ),
                                type: String(
                                    file?.type ||
                                    "application/octet-stream"
                                ),
                                size: Number(
                                    file?.size || 0
                                ),
                                extension:
                                    String(
                                        file?.extension ||
                                        ""
                                    ).toLowerCase()
                            })
                        )
                        : []
            }))
            .filter(
                item =>
                    item.content
            )
            .slice(
                -HISTORY_LIMIT
            );
    }

    function emit(
        name,
        detail = {}
    ) {
        window.dispatchEvent(
            new CustomEvent(
                `adumex:${name}`,
                { detail }
            )
        );
    }

    function escapeHtml(value) {
        return String(value || "")
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

    function safeUrl(value) {
        try {
            const url =
                new URL(
                    String(
                        value || ""
                    ).trim(),
                    window.location.href
                );

            return [
                "http:",
                "https:",
                "mailto:"
            ].includes(
                url.protocol
            )
                ? url.href
                : "";
        } catch {
            return "";
        }
    }

    /* GitHub */

    function isGitHubUrl(value) {
        try {
            const url =
                new URL(
                    String(
                        value || ""
                    ).trim()
                );

            return (
                url.protocol ===
                "https:" &&
                (
                    url.hostname ===
                    "github.com" ||
                    url.hostname ===
                    "www.github.com"
                )
            );
        } catch {
            return false;
        }
    }

    function getGitHubUrlType(value) {
        try {
            const url =
                new URL(
                    String(
                        value || ""
                    ).trim()
                );

            const parts =
                url.pathname
                    .split("/")
                    .filter(Boolean);

            if (
                parts.length < 2
            ) {
                return "GitHub";
            }

            if (
                parts[2] ===
                "issues"
            ) {
                return "GitHub Issue";
            }

            if (
                parts[2] ===
                "pull"
            ) {
                return "GitHub Pull Request";
            }

            if (
                parts[2] ===
                "blob"
            ) {
                return "GitHub File";
            }

            if (
                parts[2] ===
                "tree"
            ) {
                return "GitHub Directory";
            }

            if (
                parts[2] ===
                "commit"
            ) {
                return "GitHub Commit";
            }

            if (
                parts[2] ===
                "releases"
            ) {
                return "GitHub Release";
            }

            return "GitHub Repository";
        } catch {
            return "GitHub";
        }
    }

    function getGitHubLabel(value) {
        try {
            const url =
                new URL(
                    String(
                        value || ""
                    ).trim()
                );

            const parts =
                url.pathname
                    .split("/")
                    .filter(Boolean);

            if (
                parts.length >= 2
            ) {
                return `${parts[0]}/${parts[1]}`;
            }

            return "GitHub";
        } catch {
            return "GitHub";
        }
    }

    function githubLinkHtml(url) {
        const href =
            safeUrl(url);

        if (
            !href ||
            !isGitHubUrl(href)
        ) {
            return "";
        }

        const type =
            getGitHubUrlType(
                href
            );

        const label =
            getGitHubLabel(
                href
            );

        return `
            <div class="adumex-github-container">
                <a
                    class="adumex-github-link"
                    href="${escapeHtml(href)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span class="adumex-github-icon">
                        <i class="fa-brands fa-github"></i>
                    </span>

                    <span class="adumex-github-info">
                        <strong>
                            ${escapeHtml(label)}
                        </strong>

                        <small>
                            ${escapeHtml(type)}
                        </small>
                    </span>

                    <span class="adumex-github-arrow">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </span>
                </a>

                <div class="adumex-github-actions">
                    <button
                        type="button"
                        class="adumex-github-copy"
                        data-github-url="${escapeHtml(href)}"
                    >
                        <i class="fa-regular fa-copy"></i>
                        Copy link
                    </button>
                </div>
            </div>
        `;
    }

    function linkHtml(
        label,
        url
    ) {
        const href =
            safeUrl(url);

        if (!href) {
            return escapeHtml(
                label
            );
        }

        return `
            <a
                href="${escapeHtml(href)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${escapeHtml(label)}
            </a>
        `;
    }

    /* Markdown */

    function renderInline(text) {
        const tokens = [];

        const token =
            html =>
                `\u0000ADUMEX${tokens.push(html) - 1}\u0000`;

        const source =
            String(text || "")
                .replace(
                    /<((?:https?:\/\/|mailto:)[^>\s]+)>/g,
                    "$1"
                )
                .replace(
                    /`([^`\n]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s<]+)/g,
                    (
                        match,
                        code,
                        label,
                        markdownUrl,
                        bareUrl
                    ) => {
                        if (
                            code !==
                            undefined
                        ) {
                            return token(
                                `<code>${escapeHtml(
                                    code
                                )}</code>`
                            );
                        }

                        if (
                            label !==
                            undefined
                        ) {
                            if (
                                isGitHubUrl(
                                    markdownUrl
                                )
                            ) {
                                return token(
                                    githubLinkHtml(
                                        markdownUrl
                                    )
                                );
                            }

                            return token(
                                linkHtml(
                                    label,
                                    markdownUrl
                                )
                            );
                        }

                        const url =
                            bareUrl.replace(
                                /[.,;:!?]+$/,
                                ""
                            );

                        const punctuation =
                            bareUrl.slice(
                                url.length
                            );

                        if (
                            isGitHubUrl(
                                url
                            )
                        ) {
                            return token(
                                githubLinkHtml(
                                    url
                                ) +
                                escapeHtml(
                                    punctuation
                                )
                            );
                        }

                        return token(
                            linkHtml(
                                url,
                                url
                            ) +
                            escapeHtml(
                                punctuation
                            )
                        );
                    }
                );

        let html =
            escapeHtml(
                source
            );

        html =
            html
                .replace(
                    /\*\*([^\*\n]+)\*\*/g,
                    "<strong>$1</strong>"
                )
                .replace(
                    /__([^_\n]+)__/g,
                    "<strong>$1</strong>"
                )
                .replace(
                    /(^|[^\*])\*([^\*\n]+)\*(?!\*)/g,
                    "$1<em>$2</em>"
                )
                .replace(
                    /(^|[^_])_([^_\n]+)_(?!_)/g,
                    "$1<em>$2</em>"
                );

        return html.replace(
            /\u0000ADUMEX(\d+)\u0000/g,
            (_, index) =>
                tokens[
                Number(index)
                ] || ""
        );
    }

    function renderMarkdown(
        markdown
    ) {
        const lines =
            String(markdown || "")
                .replace(
                    /\r\n?/g,
                    "\n"
                )
                .split("\n");

        const output = [];

        let code = null;
        let list = null;

        const closeList = () => {
            if (list) {
                output.push(
                    `</${list}>`
                );
            }

            list = null;
        };

        const closeCode = () => {
            if (!code) {
                return;
            }

            const language =
                code.language
                    ? `
                        <span class="code-language">
                            ${escapeHtml(
                        code.language
                    )}
                        </span>
                    `
                    : `
                        <span class="code-language">
                            Code
                        </span>
                    `;

            const codeText =
                code.lines.join(
                    "\n"
                );

            output.push(`
                <div class="adumex-code-block">
                    <div class="adumex-code-header">
                        ${language}

                        <button
                            type="button"
                            class="adumex-copy-code"
                            data-code="${escapeHtml(
                codeText
            )}"
                            aria-label="Copy code"
                        >
                            <i class="fa-regular fa-copy"></i>
                            Copy
                        </button>
                    </div>

                    <pre><code>${escapeHtml(
                codeText
            )}</code></pre>
                </div>
            `);

            code = null;
        };

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            const line = lines[lineIndex];
            const fence =
                line.match(
                    /^```[ \t]*([^\s]*)[ \t]*$/
                );

            if (fence) {
                if (code) {
                    closeCode();
                } else {
                    closeList();

                    code = {
                        language:
                            fence[1] || "",
                        lines: []
                    };
                }

                continue;
            }

            if (code) {
                code.lines.push(
                    line
                );
                continue;
            }

            if (
                line.includes("|") &&
                isTableSeparator(lines[lineIndex + 1])
            ) {
                closeList();

                const headerCells = tableCells(line);
                const rows = [];
                lineIndex += 2;

                while (
                    lineIndex < lines.length &&
                    lines[lineIndex].includes("|") &&
                    lines[lineIndex].trim()
                ) {
                    rows.push(tableCells(lines[lineIndex]));
                    lineIndex += 1;
                }

                output.push(`
                    <div class="adumex-table-wrapper" role="region" tabindex="0" aria-label="Table">
                        <table class="adumex-table">
                            <thead>
                                <tr>${headerCells.map(cell => `<th>${renderInline(cell)}</th>`).join("")}</tr>
                            </thead>
                            <tbody>
                                ${rows.map(row => `
                                    <tr>${headerCells.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] || "")}</td>`).join("")}</tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                `);

                lineIndex -= 1;
                continue;
            }

            const heading =
                line.match(
                    /^(#{1,6})\s+(.+)$/
                );

            const ordered =
                line.match(
                    /^\d+\.\s+(.+)$/
                );

            const unordered =
                line.match(
                    /^[-*+]\s+(.+)$/
                );

            if (heading) {
                closeList();

                const level =
                    heading[1].length;

                output.push(
                    `<h${level}>${renderInline(
                        heading[2]
                    )}</h${level}>`
                );
            } else if (
                ordered ||
                unordered
            ) {
                const type =
                    ordered
                        ? "ol"
                        : "ul";

                if (
                    list !== type
                ) {
                    closeList();

                    list = type;

                    output.push(
                        `<${list}>`
                    );
                }

                output.push(
                    `<li>${renderInline(
                        (
                            ordered ||
                            unordered
                        )[1]
                    )}</li>`
                );
            } else if (
                !line.trim()
            ) {
                closeList();

                output.push(
                    "<br>"
                );
            } else {
                closeList();

                output.push(
                    `<p>${renderInline(
                        line
                    )}</p>`
                );
            }
        }

        closeList();
        closeCode();

        return output.join("");
    }

    function renderTextWithLinks(
        text
    ) {
        return renderInline(
            String(text || "")
        ).replace(
            /\n/g,
            "<br>"
        );
    }

    function isTableSeparator(line) {
        const cells = String(line || "")
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(cell => cell.trim());

        return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
    }

    function tableCells(line) {
        return String(line || "")
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map(cell => cell.trim());
    }

    /* Scrolling */

    function scrollToResponse(
        element,
        behavior = "smooth"
    ) {
        if (!element) {
            return;
        }

        const container =
            getChatWindow();

        if (!container) {
            return;
        }

        const top =
            element.offsetTop -
            container.offsetTop -
            16;

        container.scrollTo({
            top:
                Math.max(
                    0,
                    top
                ),
            behavior
        });
    }

    function scrollToBottom(
        behavior = "smooth"
    ) {
        const container =
            getChatWindow();

        if (!container) {
            return;
        }

        container.scrollTo({
            top:
                container.scrollHeight,
            behavior
        });
    }

    /* Greeting */

    function getGreetingPeriod() {
        const hour =
            new Date().getHours();

        if (
            hour >= 5 &&
            hour < 12
        ) {
            return "morning";
        }

        if (
            hour >= 12 &&
            hour < 17
        ) {
            return "afternoon";
        }

        if (
            hour >= 17 &&
            hour < 22
        ) {
            return "evening";
        }

        return "night";
    }

    function getStoredName() {
        const user =
            window.AdumexAuth?.user ||
            null;

        const authenticatedName =
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.user_metadata?.display_name;

        if (
            typeof authenticatedName === "string" &&
            authenticatedName.trim()
        ) {
            return authenticatedName.trim();
        }

        const possibleKeys = [
            "adumex-memory-cache",
            "adumex-user"
        ];

        for (
            const key of possibleKeys
        ) {
            try {
                const raw =
                    localStorage.getItem(
                        key
                    );

                if (!raw) {
                    continue;
                }

                const parsed =
                    JSON.parse(
                        raw
                    );

                const name =
                    parsed?.name ||
                    parsed?.userName ||
                    parsed?.username ||
                    parsed?.profile?.name ||
                    parsed?.profile?.display_name ||
                    parsed?.user?.name;

                if (
                    typeof name ===
                    "string" &&
                    name.trim()
                ) {
                    return name.trim();
                }
            } catch {
                continue;
            }
        }

        return "";
    }

    function getGreeting() {
        const period =
            getGreetingPeriod();

        const name =
            getStoredName();

        const greetings = {
            morning: "Good morning",
            afternoon: "Good afternoon",
            evening: "Good evening",
            night: "Good evening"
        };

        const greeting = greetings[period];

        return name
            ? `${greeting}, ${name}.`
            : `${greeting}.`;
    }

    function renderGreeting() {
        const greeting =
            document.getElementById(
                "chat-welcome-greeting"
            );

        const welcome =
            document.getElementById(
                "chat-welcome"
            );

        if (!greeting) {
            return;
        }

        greeting.textContent =
            getGreeting();

        if (welcome) {
            welcome.hidden =
                false;
        }
    }

    async function refreshGreetingFromAuth() {
        const client =
            window.adumexSupabase ||
            window.AdumexSupabase?.getClient?.();

        if (!client?.auth?.getUser) {
            return;
        }

        try {
            const result = await client.auth.getUser();
            const user = result?.data?.user;

            if (user) {
                window.AdumexAuth = {
                    ...(window.AdumexAuth || {}),
                    user
                };
                renderGreeting();
            }
        } catch {
            return;
        }
    }

    /* Composer */

    function getFiles() {
        const tools =
            window.AdumexTools;

        if (
            !tools ||
            typeof tools.getFiles !==
            "function"
        ) {
            return [];
        }

        return Array.from(
            tools.getFiles()
        ).filter(
            file =>
                file instanceof File ||
                (
                    file &&
                    typeof file.name ===
                    "string"
                )
        );
    }

    function getFileExtension(
        name
    ) {
        const value =
            String(
                name || ""
            )
                .trim()
                .toLowerCase();

        if (
            !value.includes(".")
        ) {
            return "";
        }

        return value
            .split(".")
            .pop();
    }

    function getFileMetadata(
        files
    ) {
        return files.map(
            file => ({
                name:
                    file?.name ||
                    "Unnamed file",
                type:
                    file?.type ||
                    "application/octet-stream",
                size:
                    Number(
                        file?.size ||
                        0
                    ),
                extension:
                    getFileExtension(
                        file?.name
                    )
            })
        );
    }

    function getTotalFileSize(
        files
    ) {
        return files.reduce(
            (
                total,
                file
            ) =>
                total +
                Number(
                    file?.size ||
                    0
                ),
            0
        );
    }

    function clearSelectedFiles() {
        const tools =
            window.AdumexTools;

        tools?.clearFiles?.();

        updateComposerState();
    }

    function isImageFile(
        file
    ) {
        if (!file) {
            return false;
        }

        if (
            typeof file.type ===
            "string" &&
            file.type.startsWith(
                "image/"
            )
        ) {
            return true;
        }

        return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(
            file.name || ""
        );
    }

    function isCodeFile(
        file
    ) {
        return /\.(js|mjs|cjs|jsx|ts|tsx|py|java|c|h|cpp|cc|cxx|hpp|cs|go|rs|php|rb|swift|kt|kts|dart|lua|r|sql|sh|bash|zsh|ps1|html|htm|css|scss|sass|less|json|xml|yaml|yml|toml|env)$/i.test(
            file?.name || ""
        );
    }

    function renderAttachmentPreview(
        parent,
        files
    ) {
        if (
            !parent ||
            !files.length
        ) {
            return;
        }

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "adumex-message-attachments";

        files.forEach(
            file => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "adumex-message-attachment";

                if (
                    isImageFile(
                        file
                    )
                ) {
                    const image =
                        document.createElement(
                            "img"
                        );

                    image.className =
                        "adumex-message-image";

                    image.alt =
                        `Uploaded image: ${file.name ||
                        "image"
                        }`;

                    const objectUrl =
                        URL.createObjectURL(
                            file
                        );

                    image.src =
                        objectUrl;

                    image.addEventListener(
                        "load",
                        () => {
                            URL.revokeObjectURL(
                                objectUrl
                            );
                        },
                        {
                            once: true
                        }
                    );

                    item.appendChild(
                        image
                    );
                } else {
                    const icon =
                        document.createElement(
                            "i"
                        );

                    icon.className =
                        isCodeFile(
                            file
                        )
                            ? "fa-solid fa-code"
                            : "fa-regular fa-file";

                    item.appendChild(
                        icon
                    );
                }

                const name =
                    document.createElement(
                        "span"
                    );

                name.textContent =
                    file.name ||
                    "Uploaded file";

                item.appendChild(
                    name
                );

                wrapper.appendChild(
                    item
                );
            }
        );

        parent.appendChild(
            wrapper
        );
    }

    /* Messages */

    function createMessage(
        role,
        text = "",
        files = []
    ) {
        const container =
            getChatWindow();

        if (!container) {
            return null;
        }

        const message =
            document.createElement(
                "article"
            );

        message.className =
            `message adumex-message ${role === "user"
                ? "user-message"
                : "assistant-message"
            }`;

        message.dataset.role =
            role;

        const content =
            document.createElement(
                "div"
            );

        content.className =
            "message-content adumex-message-content";

        message.appendChild(
            content
        );

        container.appendChild(
            message
        );

        renderMessage(
            message,
            text,
            files
        );

        return message;
    }

    function renderMessage(
        element,
        text,
        files = []
    ) {
        const content =
            element?.querySelector(
                ".adumex-message-content"
            );

        if (!content) {
            return;
        }

        if (
            element.dataset.role ===
            "assistant"
        ) {
            content.innerHTML =
                renderMarkdown(
                    text
                );
        } else {
            content.innerHTML =
                renderTextWithLinks(
                    text
                );

            renderAttachmentPreview(
                content,
                files
            );
        }

        bindCopyButtons(
            content
        );

        bindGitHubButtons(
            content
        );
    }

    /* Copy Buttons */

    function bindCopyButtons(
        root
    ) {
        root
            ?.querySelectorAll(
                ".adumex-copy-code"
            )
            .forEach(
                button => {
                    if (
                        button.dataset.bound
                    ) {
                        return;
                    }

                    button.dataset.bound =
                        "true";

                    button.addEventListener(
                        "click",
                        async () => {
                            const code =
                                button.dataset.code ||
                                "";

                            try {
                                await navigator.clipboard.writeText(
                                    code
                                );

                                button.innerHTML =
                                    `
                                        <i class="fa-solid fa-check"></i>
                                        Copied
                                    `;

                                setTimeout(
                                    () => {
                                        button.innerHTML =
                                            `
                                                <i class="fa-regular fa-copy"></i>
                                                Copy
                                            `;
                                    },
                                    1400
                                );
                            } catch {
                                button.textContent =
                                    "Copy failed";
                            }
                        }
                    );
                }
            );
    }

    function bindGitHubButtons(
        root
    ) {
        root
            ?.querySelectorAll(
                ".adumex-github-copy"
            )
            .forEach(
                button => {
                    if (
                        button.dataset.bound
                    ) {
                        return;
                    }

                    button.dataset.bound =
                        "true";

                    button.addEventListener(
                        "click",
                        async () => {
                            const url =
                                button.dataset.githubUrl ||
                                "";

                            try {
                                await navigator.clipboard.writeText(
                                    url
                                );

                                button.innerHTML =
                                    `
                                        <i class="fa-solid fa-check"></i>
                                        Copied
                                    `;

                                setTimeout(
                                    () => {
                                        button.innerHTML =
                                            `
                                                <i class="fa-regular fa-copy"></i>
                                                Copy link
                                            `;
                                    },
                                    1400
                                );
                            } catch {
                                button.textContent =
                                    "Copy failed";
                            }
                        }
                    );
                }
            );
    }

    /* Authentication */

    async function getAuthHeaders(signal) {
        const session = await window.AdumexApi.session(signal);
        return { Authorization: "Bearer " + session.access_token };
    }

    /* Conversation Persistence */

    function getServerConversation(
        chatId
    ) {
        try {
            const values =
                JSON.parse(
                    localStorage.getItem(
                        SERVER_CONVERSATIONS_KEY + ":" + window.AdumexRecentChats?.getUserId?.()
                    ) || "{}"
                );

            return (
                values[chatId] ||
                null
            );
        } catch {
            return null;
        }
    }

    function setServerConversation(
        chatId,
        conversationId
    ) {
        if (
            !chatId ||
            !conversationId
        ) {
            return;
        }

        try {
            const values =
                JSON.parse(
                    localStorage.getItem(
                        SERVER_CONVERSATIONS_KEY + ":" + window.AdumexRecentChats?.getUserId?.()
                    ) || "{}"
                );

            values[chatId] =
                conversationId;

            localStorage.setItem(
                SERVER_CONVERSATIONS_KEY + ":" + window.AdumexRecentChats?.getUserId?.(),
                JSON.stringify(values)
            );
        } catch {
            return;
        }
    }

    function updateHistoryUi() {
        if (!state.chatId) {
            return;
        }

        const recentChats =
            window.AdumexRecentChats;

        const firstUserMessage =
            state.messages.find(
                item =>
                    item.role ===
                    "user"
            );

        const title =
            firstUserMessage
                ?.content
                ?.replace(
                    /\s+/g,
                    " "
                )
                ?.slice(
                    0,
                    42
                ) ||
            "New chat";

        if (
            recentChats?.updateChat
        ) {
            recentChats.updateChat(
                state.chatId,
                {
                    title,
                    messages:
                        state.messages,
                    conversationId:
                        state.conversationId
                }
            );

            return;
        }

        emit(
            "chat-updated",
            {
                id:
                    state.chatId,
                title,
                messages:
                    state.messages,
                conversationId:
                    state.conversationId
            }
        );
    }

    /* Generation */

    function setGenerating(
        value
    ) {
        state.generating =
            Boolean(value);

        if (state.generating) {
            window.AdumexThinking?.show?.();
        } else {
            window.AdumexThinking?.hide?.();
        }

        const button =
            getSendButton();

        const input =
            getInput();

        if (button) {
            button.disabled =
                false;

            button.classList.toggle(
                "is-generating",
                state.generating
            );

            button.setAttribute(
                "aria-label",
                state.generating
                    ? "Stop response"
                    : "Send message"
            );

            button.setAttribute(
                "title",
                state.generating
                    ? "Stop response"
                    : "Send message"
            );

            button.innerHTML =
                state.generating
                    ? '<i class="fa-solid fa-stop"></i>'
                    : '<i class="fa-solid fa-arrow-up"></i>';
        }

        input?.setAttribute(
            "aria-busy",
            String(
                state.generating
            )
        );
    }

    /* SSE */

    async function processSse(response, run) {
        if (!response.body) throw new Error("Adumex received no response stream.");
        if (!response.headers.get("content-type")?.includes("text/event-stream")) {
            throw new Error("Adumex returned an unexpected response format.");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "", complete = null, terminal = false;
        const processBlock = block => {
            const data = block.split(/\r?\n/).filter(line => line.startsWith("data:"))
                .map(line => line.slice(5).trimStart()).join("\n").trimEnd();
            if (!data) return;
            if (data === "[DONE]") { terminal = true; return; }
            let payload;
            try { payload = JSON.parse(data); } catch { return; }
            if (payload.type === "error") throw new Error(payload.error || "Adumex could not complete the request.");
            if (payload.type === "text" && typeof payload.token === "string") {
                run.assistantText += payload.token;
                if (state.request === run) {
                    state.assistantText = run.assistantText;
                    window.AdumexThinking?.hide?.();
                    renderMessage(run.assistantElement, run.assistantText);
                    scrollToResponse(run.assistantElement, "auto");
                }
            }
            if (payload.type === "image" && state.request === run) renderGeneratedImage(payload);
            if (payload.type === "complete") { complete = payload; terminal = true; }
        };
        try {
            while (!terminal) {
                const idle = window.AdumexApi.scope(run.signal, 30000, "The response stream stalled. Please retry.");
                let chunk;
                try { chunk = await window.AdumexApi.wait(reader.read(), idle.signal); }
                finally { idle.dispose(); }
                if (chunk.done) {
                    buffer += decoder.decode();
                    if (buffer.trim()) processBlock(buffer);
                    if (!terminal) throw new Error("The response was interrupted before completion. Please retry.");
                    break;
                }
                buffer += decoder.decode(chunk.value, { stream: true });
                const blocks = buffer.split(/\r?\n\r?\n/);
                buffer = blocks.pop() || "";
                for (const block of blocks) { processBlock(block); if (terminal) break; }
            }
            run.signal.throwIfAborted();
            if (!cleanText(complete?.reply || run.assistantText)) throw new Error("Adumex returned an empty response.");
            return complete;
        } finally {
            // Cancellation is best effort and must never hold the composer busy.
            Promise.resolve(reader.cancel()).catch(() => {});
            try { reader.releaseLock(); } catch { /* A cancelled read may still be settling. */ }
        }
    }

    /* Generated Images */

    function renderGeneratedImage(
        payload
    ) {
        const source =
            safeUrl(
                payload.url ||
                payload.imageUrl ||
                ""
            );

        if (!source) {
            return;
        }

        const message =
            createMessage(
                "assistant",
                ""
            );

        const content =
            message?.querySelector(
                ".adumex-message-content"
            );

        if (!content) {
            return;
        }

        const image =
            document.createElement(
                "img"
            );

        image.className =
            "adumex-generated-image";

        image.src =
            source;

        image.alt =
            "Image generated by Adumex AI";

        content.replaceChildren(
            image
        );

        scrollToResponse(
            message
        );
    }

    /* Send */

    async function sendMessage(value) {
        if (state.generating) return { success: false, error: "Adumex is still responding." };
        const input = getInput();
        const message = cleanText(typeof value === "string" ? value : input?.value || "");
        const files = getFiles();
        const invalid = !message && !files.length ? "Message cannot be empty."
            : files.length > MAX_FILES ? "You can upload up to 10 files at once."
            : getTotalFileSize(files) > MAX_TOTAL_FILE_SIZE ? "The selected files are too large." : null;
        if (invalid) { emit("error", { error: invalid }); input?.setCustomValidity?.(invalid); input?.reportValidity?.(); return { success: false, error: invalid }; }
        input?.setCustomValidity?.("");
        const task = window.AdumexApi.scope(null, 150000, "The response request timed out. Please retry.");
        const run = { ...task, messages: state.messages, assistantText: "", assistantElement: null, chatId: state.chatId, conversationId: state.conversationId };
        let completed = false;
        state.request = run;
        state.controller = run.controller;
        // Set the flag before any UI work that can throw.
        state.generating = true;
        try {
            state.loadVersion++;
            state.loadController?.abort();
            setGenerating(true);
            const session = await window.AdumexApi.session(run.signal);
            run.userId = session.user.id;
            if (window.AdumexRecentChats?.getUserId?.() !== run.userId) throw new Error("Chat history is still initializing. Please retry.");
            if (!state.chatId) {
                const chat = window.AdumexRecentChats?.createChat?.({ silent: true });
                state.chatId = chat?.id || "chat_" + Date.now();
            }
            run.chatId = state.chatId;
            run.conversationId = state.conversationId || getServerConversation(run.chatId);
            const history = normalizeMessages(run.messages);
            const fileMetadata = getFileMetadata(files);
            const displayMessage = message || "Please analyze the uploaded files.";
            run.messages.push({ role: "user", content: displayMessage, attachments: fileMetadata });
            createMessage("user", displayMessage, files);
            run.assistantElement = createMessage("assistant", "");
            state.assistantElement = run.assistantElement;
            state.assistantText = "";
            if (input) { input.value = ""; input.style.height = "auto"; input.style.overflowY = "hidden"; }
            clearSelectedFiles();
            updateComposerState();
            updateHistoryUi();
            const formData = new FormData();
            formData.append("message", message);
            formData.append("history", JSON.stringify(history));
            formData.append("filesMetadata", JSON.stringify(fileMetadata));
            formData.append("memoryEnabled", String(window.AdumexSettings?.getValue?.("memory") !== false));
            if (run.conversationId) formData.append("conversationId", run.conversationId);
            files.forEach(file => formData.append("files", file, file.name));
            run.signal.throwIfAborted();
            const response = await window.AdumexApi.wait(fetch(CHAT_URL, {
                method: "POST", headers: { Authorization: "Bearer " + session.access_token, Accept: "text/event-stream" },
                body: formData, signal: run.signal, credentials: "omit"
            }), run.signal);
            if (!response.ok) {
                const body = await window.AdumexApi.wait(response.json().catch(() => null), run.signal);
                throw new Error(body?.error || (response.status === 401 ? "Authentication failed. Please sign in again." : "Adumex server error (" + response.status + ")."));
            }
            const complete = await processSse(response, run);
            run.signal.throwIfAborted();
            const reply = cleanText(complete?.reply || run.assistantText, MAX_STORED_RESPONSE_LENGTH);
            run.messages.push({ role: "assistant", content: reply });
            run.conversationId = complete?.conversationId || run.conversationId;
            if (state.request !== run) throw new DOMException("Response stopped.", "AbortError");
            state.conversationId = run.conversationId;
            setServerConversation(run.chatId, run.conversationId);
            renderMessage(run.assistantElement, reply);
            updateHistoryUi();
            scrollToResponse(run.assistantElement);
            emit("message-complete", { conversationId: run.conversationId, response: reply });
            completed = true;
            return { success: true, response: reply, conversationId: run.conversationId };
        } catch (error) {
            const reason = run.signal.aborted ? run.signal.reason : error;
            const stopped = reason?.name === "AbortError";
            const messageText = stopped ? "Response stopped." : cleanText(reason?.message || "Adumex could not complete the request.", 3000);
            if (state.request === run) {
                if (run.assistantElement) renderMessage(run.assistantElement, "**Adumex error:** " + messageText);
                else { input?.setCustomValidity?.(messageText); input?.reportValidity?.(); }
                emit("error", { error: messageText, stopped });
            }
            return { success: false, error: messageText, stopped };
        } finally {
            task.dispose();
            if (state.request === run) {
                state.request = null;
                state.controller = null;
                state.assistantElement = null;
                state.assistantText = "";
                state.generating = false;
                try { setGenerating(false); updateComposerState(); } catch (error) { console.warn("Adumex composer cleanup failed."); }
            }
            if (completed && window.AdumexSettings?.getValue?.("memory") !== false) {
                Promise.resolve().then(() => window.AdumexMemory?.rememberFromMessage?.(message, run.userId))
                    .catch(() => console.warn("Adumex memory could not be saved."));
            }
        }
    }

    /* Conversations */

    function cancelActiveWork() {
        state.loadVersion++;
        state.loadController?.abort();
        state.loadController = null;
        state.controller?.abort();
        state.request = null;
        state.controller = null;
        state.assistantElement = null;
        state.assistantText = "";
        state.generating = false;
        setGenerating(false);
    }

    async function openChat(chat) {
        cancelActiveWork();
        const version = state.loadVersion;
        state.chatId = chat?.id || null;
        state.conversationId = chat?.conversationId || (state.chatId ? getServerConversation(state.chatId) : null);
        renderConversation(chat?.messages || []);
        if (!state.conversationId) return;
        const controller = new AbortController();
        state.loadController = controller;
        try {
            const data = await window.AdumexApi.json("/conversations/" + encodeURIComponent(state.conversationId) + "/messages", { signal: controller.signal }, window.AdumexRecentChats?.getUserId?.());
            if (version !== state.loadVersion || controller.signal.aborted) return;
            renderConversation(data.messages || []);
            updateHistoryUi();
        } catch (error) {
            if (!controller.signal.aborted && version === state.loadVersion) emit("error", { error: error.message || "Unable to load this conversation." });
        } finally { if (state.loadController === controller) state.loadController = null; }
    }


    function renderConversation(
        messages
    ) {
        const container =
            getChatWindow();

        if (!container) {
            return;
        }

        container.innerHTML =
            "";

        state.messages =
            normalizeMessages(
                messages
            );

        if (
            !state.messages.length
        ) {
            renderGreeting();
            updateComposerState();
            return;
        }

        const welcome =
            document.getElementById(
                "chat-welcome"
            );

        if (welcome) {
            welcome.hidden =
                true;
        }

        state.messages.forEach(
            item => {
                const element =
                    createMessage(
                        item.role,
                        item.content
                    );

                bindCopyButtons(
                    element
                );

                bindGitHubButtons(
                    element
                );
            }
        );

        scrollToBottom(
            "auto"
        );
    }

    function newChat(
        chat
    ) {
        cancelActiveWork();
        state.chatId =
            chat?.id ||
            null;

        state.conversationId =
            null;

        state.messages =
            [];

        renderConversation(
            []
        );

        const input =
            getInput();

        if (input) {
            input.value =
                "";

            input.style.height =
                "auto";

            input.style.overflowY =
                "hidden";
        }

        clearSelectedFiles();
        updateComposerState();

        if (
            window.innerWidth >
            768
        ) {
            input?.focus();
        }

        emit(
            "new-chat-ready"
        );
    }

    /* Composer State */

    function hasSelectedFiles() {
        return getFiles().length >
            0;
    }

    function updateComposerState() {
        const input =
            getInput();

        const commandArea =
            getCommandArea();

        if (
            !input ||
            !commandArea
        ) {
            return;
        }

        const active =
            input.value.length >
            0 ||
            hasSelectedFiles();

        commandArea.classList.toggle(
            "composer-active",
            active
        );

        commandArea.classList.toggle(
            "composer-empty",
            !active
        );

        emit(
            "composer-state",
            {
                active,
                value:
                    input.value
            }
        );
    }

    function autoGrowInput() {
        const input =
            getInput();

        if (!input) {
            return;
        }

        input.style.height =
            "auto";

        const maxHeight =
            220;

        const nextHeight =
            Math.min(
                input.scrollHeight,
                maxHeight
            );

        input.style.height =
            `${nextHeight}px`;

        input.style.overflowY =
            input.scrollHeight >
                maxHeight
                ? "auto"
                : "hidden";
    }

    function handleInput(
        event
    ) {
        const input =
            event.target;
        input?.setCustomValidity?.("");

        if (!input) {
            return;
        }

        autoGrowInput();
        updateComposerState();
        updatePlaceholder();

        emit(
            "typing",
            {
                value:
                    input.value,
                length:
                    input.value.length,
                lastCharacter:
                    input.value.length
                        ? input.value[
                        input.value.length -
                        1
                        ]
                        : ""
            }
        );
    }

    /* Stop */

    function stopGeneration() {
        if (
            !state.generating ||
            !state.controller
        ) {
            return;
        }

        state.controller.abort();
    }

    /* Initialization */

    function init() {
        if (
            state.initialized
        ) {
            return;
        }

        state.initialized =
            true;

        const input =
            getInput();

        const sendButton =
            getSendButton();

        sendButton?.addEventListener(
            "click",
            event => {
                event.preventDefault();

                if (
                    state.generating
                ) {
                    stopGeneration();
                    return;
                }

                sendMessage();
            }
        );

        input?.addEventListener(
            "input",
            handleInput
        );

        input?.addEventListener(
            "keydown",
            event => {
                if (
                    event.key ===
                    "Enter" &&
                    !event.shiftKey &&
                    window.AdumexSettings?.getValue?.("enterToSend") !== false &&
                    !event.isComposing
                ) {
                    event.preventDefault();
                    event.stopPropagation();

                    sendMessage();

                    return;
                }

                if (
                    event.key ===
                    "Enter" &&
                    event.shiftKey
                ) {
                    requestAnimationFrame(
                        () => {
                            autoGrowInput();
                            updateComposerState();
                        }
                    );
                }
            }
        );

        input?.addEventListener(
            "paste",
            () => {
                requestAnimationFrame(
                    () => {
                        autoGrowInput();
                        updateComposerState();
                    }
                );
            }
        );

        input?.addEventListener(
            "cut",
            () => {
                requestAnimationFrame(
                    () => {
                        autoGrowInput();
                        updateComposerState();
                    }
                );
            }
        );

        window.addEventListener(
            "adumex:new-chat",
            event => {
                newChat(
                    event.detail?.chat
                );
            }
        );

        window.addEventListener(
            "adumex:open-chat",
            event => {
                openChat(
                    event.detail?.chat
                );
            }
        );

        window.addEventListener(
            "adumex:restore-active-chat",
            event => {
                openChat(event.detail?.chat);
            }
        );

        window.addEventListener(
            "adumex:chat-deleted",
            event => {
                if (
                    event.detail?.chat?.id ===
                    state.chatId
                ) {
                    newChat(null);
                }
            }
        );

        window.addEventListener(
            "adumex:attachments-changed",
            updateComposerState
        );

        window.addEventListener("adumex:history-cleared", () => newChat(null));

        window.AdumexAI = {
            sendMessage,
            stopGeneration,
            renderMarkdown,
            openChat,
            newChat,
            renderConversation,
            getState: () => ({
                ...state,
                messages: [
                    ...state.messages
                ]
            })
        };

        window.loadAdumexConversation =
            (
                messages,
                conversationId
            ) => {
                cancelActiveWork();
                state.conversationId =
                    conversationId ||
                    null;

                renderConversation(
                    messages
                );
            };

        window.startAdumexNewChat =
            () =>
                newChat(null);

        updateComposerState();
        updatePlaceholder();
        renderGreeting();
        refreshGreetingFromAuth();
        autoGrowInput();

        const activeChat =
            window.AdumexRecentChats?.getActiveChat?.();

        if (activeChat) {
            setTimeout(
                () => openChat(activeChat),
                0
            );
        }
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }
})();