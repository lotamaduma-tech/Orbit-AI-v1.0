"use strict";

(() => {
    /* Configuration */

    const configuredApi =
        String(
            window.ADUMEX_API_URL ||
            "http://localhost:5000/api/chat"
        ).replace(/\/+$/, "");

    const API =
        configuredApi.endsWith("/chat")
            ? configuredApi.slice(0, -5)
            : configuredApi.replace(/\/api$/, "") + "/api";

    const CHAT_URL =
        `${API}/chat`;

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

        for (
            const line of lines
        ) {
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

    function getRandomItem(
        items
    ) {
        return items[
            Math.floor(
                Math.random() *
                items.length
            )
        ];
    }

    function getGreeting() {
        const period =
            getGreetingPeriod();

        const name =
            getStoredName();

        const greetings = {
            morning: [
                "Good morning",
                "Morning",
                "Good morning — ready to build?"
            ],
            afternoon: [
                "Good afternoon",
                "Afternoon",
                "Good afternoon — what are we working on?"
            ],
            evening: [
                "Good evening",
                "Evening",
                "Good evening — what should we tackle?"
            ],
            night: [
                "Good night",
                "Still working?",
                "Late-night session — what are we building?"
            ]
        };

        const greeting =
            getRandomItem(
                greetings[period]
            );

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

    async function getAccessToken() {
        const client =
            window.adumexSupabase ||
            window.AdumexSupabase?.getClient?.() ||
            window.supabaseClient;

        if (
            !client?.auth?.getSession
        ) {
            throw new Error(
                "Adumex authentication is not initialized."
            );
        }

        try {
            const result =
                await client.auth.getSession();

            const session =
                result?.data?.session;

            if (
                session?.access_token
            ) {
                return session.access_token;
            }

            throw new Error(
                "No active Adumex session was found."
            );
        } catch (
        error
        ) {
            if (
                error?.message
            ) {
                throw error;
            }

            throw new Error(
                "Unable to read the Adumex session."
            );
        }
    }

    async function getAuthHeaders() {
        const token =
            await getAccessToken();

        return {
            Authorization:
                `Bearer ${token}`
        };
    }

    /* Conversation Persistence */

    function getServerConversation(
        chatId
    ) {
        try {
            const values =
                JSON.parse(
                    localStorage.getItem(
                        SERVER_CONVERSATIONS_KEY
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
                        SERVER_CONVERSATIONS_KEY
                    ) || "{}"
                );

            values[chatId] =
                conversationId;

            localStorage.setItem(
                SERVER_CONVERSATIONS_KEY,
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

    async function processSse(
        response
    ) {
        if (!response.body) {
            throw new Error(
                "Adumex received no response stream."
            );
        }

        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder();

        let buffer = "";
        let complete = null;

        const processBlock =
            block => {
                const lines =
                    block.split(
                        /\r?\n/
                    );

                const dataLines =
                    lines
                        .filter(
                            line =>
                                line.startsWith(
                                    "data:"
                                )
                        )
                        .map(
                            line => {
                                const raw =
                                    line.slice(
                                        5
                                    );

                                return raw.startsWith(
                                    " "
                                )
                                    ? raw.slice(1)
                                    : raw;
                            }
                        );

                if (
                    !dataLines.length
                ) {
                    return;
                }

                const data =
                    dataLines.join(
                        "\n"
                    );

                if (
                    !data ||
                    data ===
                    "[DONE]"
                ) {
                    return;
                }

                let payload;

                try {
                    payload =
                        JSON.parse(
                            data
                        );
                } catch {
                    return;
                }

                if (
                    payload?.type ===
                    "error"
                ) {
                    throw new Error(
                        payload.error ||
                        "Adumex could not complete the request."
                    );
                }

                if (
                    payload?.type ===
                    "text" &&
                    typeof payload.token ===
                    "string"
                ) {
                    state.assistantText +=
                        payload.token;

                    renderMessage(
                        state.assistantElement,
                        state.assistantText
                    );

                    scrollToBottom(
                        "auto"
                    );
                }

                if (
                    payload?.type ===
                    "image"
                ) {
                    renderGeneratedImage(
                        payload
                    );
                }

                if (
                    payload?.type ===
                    "complete"
                ) {
                    complete =
                        payload;
                }
            };

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

            const blocks =
                buffer.split(
                    /\r?\n\r?\n/
                );

            buffer =
                blocks.pop() ||
                "";

            for (
                const block of blocks
            ) {
                processBlock(
                    block
                );
            }
        }

        buffer +=
            decoder.decode();

        if (
            buffer.trim()
        ) {
            processBlock(
                buffer
            );
        }

        return complete;
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

    async function sendMessage(
        value
    ) {
        if (
            state.generating
        ) {
            return {
                success: false,
                error:
                    "Adumex is still responding."
            };
        }

        const input =
            getInput();

        const rawMessage =
            typeof value ===
                "string"
                ? value
                : input?.value || "";

        const message =
            cleanText(
                rawMessage
            );

        const files =
            getFiles();

        if (
            !message &&
            !files.length
        ) {
            return {
                success: false,
                error:
                    "Message cannot be empty."
            };
        }

        if (
            files.length >
            MAX_FILES
        ) {
            return {
                success: false,
                error:
                    `You can upload up to ${MAX_FILES} files at once.`
            };
        }

        if (
            getTotalFileSize(
                files
            ) >
            MAX_TOTAL_FILE_SIZE
        ) {
            return {
                success: false,
                error:
                    "The total size of the selected files is too large."
            };
        }

        if (!state.chatId) {
            const chat =
                window.AdumexRecentChats
                    ?.createChat?.();

            state.chatId =
                chat?.id ||
                `chat_${Date.now()}`;
        }

        state.conversationId ||=
            getServerConversation(
                state.chatId
            );

        const history =
            normalizeMessages(
                state.messages
            );

        const fileMetadata =
            getFileMetadata(
                files
            );

        const displayMessage =
            message ||
            "Please analyze the uploaded files.";

        state.messages.push({
            role:
                "user",
            content:
                displayMessage,
            attachments:
                fileMetadata
        });

        const userElement =
            createMessage(
                "user",
                displayMessage,
                files
            );

        state.assistantElement =
            createMessage(
                "assistant",
                ""
            );

        state.assistantText =
            "";

        if (input) {
            input.value =
                "";

            input.style.height =
                "auto";

            input.style.overflowY =
                "hidden";
        }

        updateComposerState();
        setGenerating(true);
        updateHistoryUi();

        try {
            const formData =
                new FormData();

            formData.append(
                "message",
                message
            );

            formData.append(
                "history",
                JSON.stringify(
                    history
                )
            );

            formData.append(
                "filesMetadata",
                JSON.stringify(
                    fileMetadata
                )
            );

            formData.append(
                "hasImages",
                String(
                    files.some(
                        isImageFile
                    )
                )
            );

            formData.append(
                "hasCode",
                String(
                    files.some(
                        isCodeFile
                    )
                )
            );

            formData.append(
                "fileCount",
                String(
                    files.length
                )
            );

            if (
                state.conversationId
            ) {
                formData.append(
                    "conversationId",
                    state.conversationId
                );
            }

            files.forEach(
                file => {
                    formData.append(
                        "files",
                        file,
                        file.name
                    );
                }
            );

            const headers =
                await getAuthHeaders();

            headers.Accept =
                "text/event-stream";

            state.controller =
                new AbortController();

            const response =
                await fetch(
                    CHAT_URL,
                    {
                        method:
                            "POST",
                        headers,
                        body:
                            formData,
                        signal:
                            state.controller
                                .signal,
                        credentials:
                            "omit"
                    }
                );

            if (
                !response.ok
            ) {
                const body =
                    await response
                        .json()
                        .catch(
                            () => null
                        );

                if (
                    response.status ===
                    401
                ) {
                    throw new Error(
                        body?.error ||
                        "Authentication failed. Please sign in again."
                    );
                }

                throw new Error(
                    body?.error ||
                    `Adumex server error (${response.status}).`
                );
            }

            const complete =
                await processSse(
                    response
                );

            const reply =
                cleanText(
                    complete?.reply ||
                    state.assistantText,
                    MAX_STORED_RESPONSE_LENGTH
                );

            if (!reply) {
                throw new Error(
                    "Adumex returned an empty response."
                );
            }

            state.messages.push({
                role:
                    "assistant",
                content:
                    reply
            });

            state.conversationId =
                complete?.conversationId ||
                state.conversationId;

            setServerConversation(
                state.chatId,
                state.conversationId
            );

            renderMessage(
                state.assistantElement,
                reply
            );

            updateHistoryUi();

            scrollToResponse(
                state.assistantElement
            );

            emit(
                "message-complete",
                {
                    conversationId:
                        state.conversationId,
                    response:
                        reply
                }
            );

            return {
                success:
                    true,
                response:
                    reply,
                conversationId:
                    state.conversationId
            };
        } catch (
        error
        ) {
            const messageText =
                error?.name ===
                    "AbortError"
                    ? "Response stopped."
                    : cleanText(
                        error?.message ||
                        "Adumex could not complete the request.",
                        3000
                    );

            if (
                state.assistantElement
            ) {
                renderMessage(
                    state.assistantElement,
                    `**Adumex error:** ${messageText}`
                );

                scrollToResponse(
                    state.assistantElement
                );
            }

            emit(
                "error",
                {
                    error:
                        messageText
                }
            );

            return {
                success:
                    false,
                error:
                    messageText
            };
        } finally {
            clearSelectedFiles();

            state.controller =
                null;

            state.assistantElement =
                null;

            state.assistantText =
                "";

            setGenerating(
                false
            );

            updateComposerState();
        }
    }

    /* Conversations */

    async function openChat(
        chat
    ) {
        state.chatId =
            chat?.id ||
            null;

        state.conversationId =
            state.chatId
                ? getServerConversation(
                    state.chatId
                )
                : null;

        renderConversation(
            chat?.messages ||
            []
        );

        if (
            !state.conversationId
        ) {
            return;
        }

        try {
            const headers =
                await getAuthHeaders();

            const response =
                await fetch(
                    `${API}/conversations/${encodeURIComponent(
                        state.conversationId
                    )}/messages`,
                    {
                        headers,
                        credentials:
                            "omit"
                    }
                );

            if (
                response.status ===
                401
            ) {
                emit(
                    "auth-expired"
                );
                return;
            }

            if (
                response.ok
            ) {
                const data =
                    await response.json();

                renderConversation(
                    data.messages ||
                    []
                );
            }
        } catch (
        error
        ) {
            emit(
                "error",
                {
                    error:
                        error?.message ||
                        "Unable to load this conversation."
                }
            );
        }
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

        if (!input) {
            return;
        }

        autoGrowInput();
        updateComposerState();

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
        renderGreeting();
        autoGrowInput();
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