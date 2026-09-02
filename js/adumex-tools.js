"use strict";

/* Adumex AI tools */

document.addEventListener("DOMContentLoaded", () => {
    /* Elements */

    const toolsButton = document.querySelector("#adumex-tools-btn");
    const attachmentsContainer = document.querySelector("#adumex-attachments");
    const commandBox = document.querySelector(".command-box");

    if (!toolsButton || !attachmentsContainer || !commandBox) {
        console.warn("Adumex tools: required elements not found.");
        return;
    }

    /* Configuration */

    const MAX_FILES = 10;
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const MAX_TEXT_SIZE = 5 * 1024 * 1024;

    const FILE_TYPES = {
        pdf: {
            label: "PDF",
            category: "document",
            icon: "fa-file-pdf",
            mime: "application/pdf"
        },
        doc: {
            label: "Word",
            category: "document",
            icon: "fa-file-word",
            mime: "application/msword"
        },
        docx: {
            label: "Word",
            category: "document",
            icon: "fa-file-word",
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        },
        txt: {
            label: "Text",
            category: "text",
            icon: "fa-file-lines",
            mime: "text/plain"
        },
        csv: {
            label: "CSV",
            category: "data",
            icon: "fa-file-csv",
            mime: "text/csv"
        },
        json: {
            label: "JSON",
            category: "code",
            language: "JSON",
            icon: "fa-file-code",
            mime: "application/json"
        },
        md: {
            label: "Markdown",
            category: "code",
            language: "Markdown",
            icon: "fa-file-lines",
            mime: "text/markdown"
        },
        html: {
            label: "HTML",
            category: "code",
            language: "HTML",
            icon: "fa-code",
            mime: "text/html"
        },
        htm: {
            label: "HTML",
            category: "code",
            language: "HTML",
            icon: "fa-code",
            mime: "text/html"
        },
        css: {
            label: "CSS",
            category: "code",
            language: "CSS",
            icon: "fa-code",
            mime: "text/css"
        },
        scss: {
            label: "SCSS",
            category: "code",
            language: "SCSS",
            icon: "fa-code",
            mime: "text/x-scss"
        },
        sass: {
            label: "Sass",
            category: "code",
            language: "Sass",
            icon: "fa-code",
            mime: "text/x-sass"
        },
        less: {
            label: "Less",
            category: "code",
            language: "Less",
            icon: "fa-code",
            mime: "text/x-less"
        },
        js: {
            label: "JavaScript",
            category: "code",
            language: "JavaScript",
            icon: "fa-js",
            mime: "text/javascript"
        },
        mjs: {
            label: "JavaScript",
            category: "code",
            language: "JavaScript",
            icon: "fa-js",
            mime: "text/javascript"
        },
        cjs: {
            label: "JavaScript",
            category: "code",
            language: "JavaScript",
            icon: "fa-js",
            mime: "text/javascript"
        },
        jsx: {
            label: "JSX",
            category: "code",
            language: "JSX",
            icon: "fa-react",
            mime: "text/jsx"
        },
        ts: {
            label: "TypeScript",
            category: "code",
            language: "TypeScript",
            icon: "fa-code",
            mime: "text/typescript"
        },
        mts: {
            label: "TypeScript",
            category: "code",
            language: "TypeScript",
            icon: "fa-code",
            mime: "text/typescript"
        },
        cts: {
            label: "TypeScript",
            category: "code",
            language: "TypeScript",
            icon: "fa-code",
            mime: "text/typescript"
        },
        tsx: {
            label: "TSX",
            category: "code",
            language: "TSX",
            icon: "fa-react",
            mime: "text/tsx"
        },
        py: {
            label: "Python",
            category: "code",
            language: "Python",
            icon: "fa-python",
            mime: "text/x-python"
        },
        pyw: {
            label: "Python",
            category: "code",
            language: "Python",
            icon: "fa-python",
            mime: "text/x-python"
        },
        java: {
            label: "Java",
            category: "code",
            language: "Java",
            icon: "fa-java",
            mime: "text/x-java"
        },
        c: {
            label: "C",
            category: "code",
            language: "C",
            icon: "fa-code",
            mime: "text/x-c"
        },
        h: {
            label: "C Header",
            category: "code",
            language: "C",
            icon: "fa-code",
            mime: "text/x-c"
        },
        cpp: {
            label: "C++",
            category: "code",
            language: "C++",
            icon: "fa-code",
            mime: "text/x-c++"
        },
        cc: {
            label: "C++",
            category: "code",
            language: "C++",
            icon: "fa-code",
            mime: "text/x-c++"
        },
        cxx: {
            label: "C++",
            category: "code",
            language: "C++",
            icon: "fa-code",
            mime: "text/x-c++"
        },
        hpp: {
            label: "C++ Header",
            category: "code",
            language: "C++",
            icon: "fa-code",
            mime: "text/x-c++"
        },
        cs: {
            label: "C#",
            category: "code",
            language: "C#",
            icon: "fa-code",
            mime: "text/plain"
        },
        go: {
            label: "Go",
            category: "code",
            language: "Go",
            icon: "fa-code",
            mime: "text/x-go"
        },
        rs: {
            label: "Rust",
            category: "code",
            language: "Rust",
            icon: "fa-code",
            mime: "text/x-rust"
        },
        php: {
            label: "PHP",
            category: "code",
            language: "PHP",
            icon: "fa-code",
            mime: "application/x-php"
        },
        rb: {
            label: "Ruby",
            category: "code",
            language: "Ruby",
            icon: "fa-gem",
            mime: "text/x-ruby"
        },
        swift: {
            label: "Swift",
            category: "code",
            language: "Swift",
            icon: "fa-code",
            mime: "text/x-swift"
        },
        kt: {
            label: "Kotlin",
            category: "code",
            language: "Kotlin",
            icon: "fa-code",
            mime: "text/x-kotlin"
        },
        kts: {
            label: "Kotlin",
            category: "code",
            language: "Kotlin",
            icon: "fa-code",
            mime: "text/x-kotlin"
        },
        dart: {
            label: "Dart",
            category: "code",
            language: "Dart",
            icon: "fa-code",
            mime: "text/x-dart"
        },
        lua: {
            label: "Lua",
            category: "code",
            language: "Lua",
            icon: "fa-code",
            mime: "text/x-lua"
        },
        r: {
            label: "R",
            category: "code",
            language: "R",
            icon: "fa-code",
            mime: "text/plain"
        },
        sql: {
            label: "SQL",
            category: "code",
            language: "SQL",
            icon: "fa-database",
            mime: "application/sql"
        },
        sh: {
            label: "Shell",
            category: "code",
            language: "Shell",
            icon: "fa-terminal",
            mime: "application/x-sh"
        },
        bash: {
            label: "Bash",
            category: "code",
            language: "Bash",
            icon: "fa-terminal",
            mime: "application/x-sh"
        },
        zsh: {
            label: "Zsh",
            category: "code",
            language: "Zsh",
            icon: "fa-terminal",
            mime: "text/plain"
        },
        ps1: {
            label: "PowerShell",
            category: "code",
            language: "PowerShell",
            icon: "fa-terminal",
            mime: "text/plain"
        },
        xml: {
            label: "XML",
            category: "code",
            language: "XML",
            icon: "fa-code",
            mime: "application/xml"
        },
        yaml: {
            label: "YAML",
            category: "code",
            language: "YAML",
            icon: "fa-file-code",
            mime: "text/yaml"
        },
        yml: {
            label: "YAML",
            category: "code",
            language: "YAML",
            icon: "fa-file-code",
            mime: "text/yaml"
        },
        toml: {
            label: "TOML",
            category: "code",
            language: "TOML",
            icon: "fa-file-code",
            mime: "text/plain"
        },
        env: {
            label: "Environment",
            category: "code",
            language: "ENV",
            icon: "fa-file-code",
            mime: "text/plain"
        }
    };

    /* Special files */

    const SPECIAL_FILES = {
        Dockerfile: {
            label: "Dockerfile",
            category: "code",
            language: "Dockerfile",
            icon: "fa-file-code"
        },
        Makefile: {
            label: "Makefile",
            category: "code",
            language: "Makefile",
            icon: "fa-gears"
        },
        Jenkinsfile: {
            label: "Jenkinsfile",
            category: "code",
            language: "Jenkinsfile",
            icon: "fa-gears"
        }
    };

    /* State */

    const attachments = [];

    /* Tools menu */

    const toolsMenu = document.createElement("div");

    toolsMenu.className = "adumex-tools-menu";
    toolsMenu.setAttribute("role", "menu");
    toolsMenu.setAttribute("aria-label", "Adumex tools");

    const toolsHeader = document.createElement("div");
    toolsHeader.className = "adumex-tools-header";

    const toolsTitle = document.createElement("span");
    toolsTitle.className = "adumex-tools-title";
    toolsTitle.textContent = "Adumex tools";

    const toolsDescription = document.createElement("span");
    toolsDescription.className = "adumex-tools-description";
    toolsDescription.textContent = "Add files to your conversation.";

    toolsHeader.appendChild(toolsTitle);
    toolsHeader.appendChild(toolsDescription);

    const toolsOptions = document.createElement("div");
    toolsOptions.className = "adumex-tools-options";

    const uploadButton = document.createElement("button");
    uploadButton.type = "button";
    uploadButton.className = "adumex-tool-option";
    uploadButton.dataset.tool = "upload";
    uploadButton.setAttribute("role", "menuitem");

    const uploadIcon = document.createElement("span");
    uploadIcon.className = "adumex-tool-icon";

    const uploadIconElement = document.createElement("i");
    uploadIconElement.className = "fa-solid fa-arrow-up-from-bracket";

    uploadIcon.appendChild(uploadIconElement);

    const uploadContent = document.createElement("span");
    uploadContent.className = "adumex-tool-content";

    const uploadTitle = document.createElement("strong");
    uploadTitle.textContent = "Upload files";

    const uploadDescription = document.createElement("small");
    uploadDescription.textContent = "Documents, images and source code";

    uploadContent.appendChild(uploadTitle);
    uploadContent.appendChild(uploadDescription);

    const uploadArrow = document.createElement("span");
    uploadArrow.className = "adumex-tool-arrow";

    const uploadArrowIcon = document.createElement("i");
    uploadArrowIcon.className = "fa-solid fa-chevron-right";

    uploadArrow.appendChild(uploadArrowIcon);

    uploadButton.appendChild(uploadIcon);
    uploadButton.appendChild(uploadContent);
    uploadButton.appendChild(uploadArrow);

    toolsOptions.appendChild(uploadButton);

    toolsMenu.appendChild(toolsHeader);
    toolsMenu.appendChild(toolsOptions);

    commandBox.appendChild(toolsMenu);

    /* File input */

    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.hidden = true;
    fileInput.multiple = true;

    fileInput.accept = [
        ".pdf",
        ".doc",
        ".docx",
        ".txt",
        ".csv",
        ".json",
        ".md",
        ".html",
        ".htm",
        ".css",
        ".scss",
        ".sass",
        ".less",
        ".js",
        ".mjs",
        ".cjs",
        ".jsx",
        ".ts",
        ".mts",
        ".cts",
        ".tsx",
        ".py",
        ".pyw",
        ".java",
        ".c",
        ".h",
        ".cpp",
        ".cc",
        ".cxx",
        ".hpp",
        ".cs",
        ".go",
        ".rs",
        ".php",
        ".rb",
        ".swift",
        ".kt",
        ".kts",
        ".dart",
        ".lua",
        ".r",
        ".sql",
        ".sh",
        ".bash",
        ".zsh",
        ".ps1",
        ".xml",
        ".yaml",
        ".yml",
        ".toml",
        ".env",
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ].join(",");

    fileInput.setAttribute(
        "aria-label",
        "Select files to upload"
    );

    document.body.appendChild(fileInput);

    /* File detection */

    function getFileExtension(fileName) {
        const name = String(fileName)
            .split("/")
            .pop();

        if (
            name === "Dockerfile" ||
            name === "Makefile" ||
            name === "Jenkinsfile"
        ) {
            return name.toLowerCase();
        }

        const parts = name.split(".");

        if (parts.length < 2) {
            return "";
        }

        return parts.pop().toLowerCase();
    }

    function detectFileType(file) {
        const fileName = String(file.name)
            .split("/")
            .pop();

        if (SPECIAL_FILES[fileName]) {
            return {
                ...SPECIAL_FILES[fileName],
                extension: fileName
            };
        }

        const extension = getFileExtension(file.name);
        const type = FILE_TYPES[extension];

        if (type) {
            return {
                ...type,
                extension
            };
        }

        if (
            file.type &&
            file.type.startsWith("image/")
        ) {
            return {
                label: "Image",
                category: "image",
                language: null,
                icon: "fa-file-image",
                mime: file.type,
                extension
            };
        }

        return {
            label: "File",
            category: "unknown",
            language: null,
            icon: "fa-file",
            mime: file.type || "application/octet-stream",
            extension
        };
    }

    /* File helpers */

    function formatFileSize(bytes) {
        if (
            !Number.isFinite(bytes) ||
            bytes <= 0
        ) {
            return "0 KB";
        }

        if (bytes < 1024) {
            return `${ bytes } B`;
        }

        if (bytes < 1024 * 1024) {
            return `${ (bytes / 1024).toFixed(1) } KB`;
        }

        if (bytes < 1024 * 1024 * 1024) {
            return `${ (bytes / (1024 * 1024)).toFixed(1) } MB`;
        }

        return `${
    (
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(1)
} GB`;
    }

    function createId() {
        return `${ Date.now() } -${
    Math.random()
    .toString(36)
    .slice(2, 9)
} `;
    }

    function showError(message) {
        console.warn(`Adumex upload: ${ message } `);

        if (
            typeof window.showAdumexToast ===
            "function"
        ) {
            window.showAdumexToast(
                message,
                "error"
            );
            return;
        }

        alert(message);
    }

    /* Read text/code files */

    async function readTextFile(file) {
        if (file.size > MAX_TEXT_SIZE) {
            return {
                content: null,
                readable: false,
                tooLarge: true
            };
        }

        try {
            const content = await file.text();

            return {
                content,
                readable: true,
                tooLarge: false
            };
        } catch (error) {
            console.warn(
                "Adumex tools: unable to read file.",
                error
            );

            return {
                content: null,
                readable: false,
                tooLarge: false
            };
        }
    }

    /* Validate file */

    function validateFile(file) {
        if (!file) {
            return false;
        }

        const type = detectFileType(file);

        if (type.category === "unknown") {
            showError(
                `"${file.name}" is not a supported file type.`
            );

            return false;
        }

        if (file.size > MAX_FILE_SIZE) {
            showError(
                `"${file.name}" is larger than the 20 MB limit.`
            );

            return false;
        }

        return true;
    }

    /* Create attachment */

    async function createAttachment(file) {
        const type = detectFileType(file);

        const attachment = {
            id: createId(),
            file,
            name: file.name,
            size: file.size,
            mimeType: file.type || type.mime,
            extension: type.extension,
            category: type.category,
            language: type.language || null,
            label: type.label,
            icon: type.icon,
            content: null,
            readable: false,
            tooLarge: false,
            previewUrl: null
        };

        if (
            type.category === "code" ||
            type.category === "text" ||
            type.category === "data"
        ) {
            const result = await readTextFile(file);

            attachment.content = result.content;
            attachment.readable = result.readable;
            attachment.tooLarge = result.tooLarge;
        }

        if (type.category === "image") {
            attachment.previewUrl =
                URL.createObjectURL(file);
        }

        return attachment;
    }

    /* Render attachments */

    function renderAttachments() {
        if (!attachments.length) {
            attachmentsContainer.hidden = true;
            attachmentsContainer.replaceChildren();
            return;
        }

        attachmentsContainer.hidden = false;
        attachmentsContainer.replaceChildren();

        const header = document.createElement("div");
        header.className = "adumex-attachments-header";

        const title = document.createElement("span");
        title.className = "adumex-attachments-title";

        title.textContent =
            `${ attachments.length } ${
    attachments.length === 1
        ? "file"
        : "files"
} attached`;

        const clearButton = document.createElement("button");

        clearButton.type = "button";
        clearButton.className =
            "adumex-attachments-clear";
        clearButton.textContent = "Clear";
        clearButton.setAttribute(
            "aria-label",
            "Clear all attached files"
        );

        header.appendChild(title);
        header.appendChild(clearButton);

        const list = document.createElement("div");
        list.className = "adumex-attachments-list";

        attachments.forEach(attachment => {
            const item = document.createElement("div");

            item.className =
                "adumex-attachment-item";

            item.dataset.attachmentId =
                attachment.id;

            const preview = document.createElement("div");
            preview.className =
                "adumex-attachment-preview";

            if (attachment.previewUrl) {
                const image =
                    document.createElement("img");

                image.src =
                    attachment.previewUrl;

                image.alt =
                    attachment.name;

                image.loading = "lazy";

                preview.appendChild(image);
            } else {
                const icon =
                    document.createElement("i");

                icon.className =
                    `fa - solid ${ attachment.icon } `;

                preview.appendChild(icon);
            }

            const info = document.createElement("div");

            info.className =
                "adumex-attachment-info";

            const name =
                document.createElement("strong");

            name.textContent =
                attachment.name;

            name.title =
                attachment.name;

            const detail =
                document.createElement("small");

            let detailText =
                attachment.language ||
                attachment.label;

            if (attachment.tooLarge) {
                detailText +=
                    " · Too large to read";
            } else if (attachment.readable) {
                detailText +=
                    " · Ready to read";
            }

            detail.textContent =
                `${ detailText } · ${
    formatFileSize(
        attachment.size
    )
} `;

            info.appendChild(name);
            info.appendChild(detail);

            const removeButton =
                document.createElement("button");

            removeButton.type = "button";

            removeButton.className =
                "adumex-attachment-remove";

            removeButton.dataset.attachmentId =
                attachment.id;

            removeButton.setAttribute(
                "aria-label",
                `Remove ${ attachment.name } `
            );

            removeButton.title =
                "Remove file";

            const removeIcon =
                document.createElement("i");

            removeIcon.className =
                "fa-solid fa-xmark";

            removeButton.appendChild(
                removeIcon
            );

            item.appendChild(preview);
            item.appendChild(info);
            item.appendChild(removeButton);

            list.appendChild(item);
        });

        attachmentsContainer.appendChild(header);
        attachmentsContainer.appendChild(list);

        clearButton.addEventListener(
            "click",
            clearAttachments
        );

        list.addEventListener(
            "click",
            event => {
                const removeButton =
                    event.target.closest(
                        ".adumex-attachment-remove"
                    );

                if (!removeButton) {
                    return;
                }

                removeAttachment(
                    removeButton.dataset
                        .attachmentId
                );
            }
        );
    }

    /* Add files */

    async function addFiles(fileList) {
        const files = Array.from(fileList || []);

        if (!files.length) {
            return;
        }

        for (const file of files) {
            if (attachments.length >= MAX_FILES) {
                showError(
                    `You can attach up to ${ MAX_FILES } files.`
                );
                break;
            }

            if (!validateFile(file)) {
                continue;
            }

            const duplicate =
                attachments.some(
                    attachment =>
                        attachment.name ===
                            file.name &&
                        attachment.size ===
                            file.size &&
                        attachment.file
                            .lastModified ===
                            file.lastModified
                );

            if (duplicate) {
                continue;
            }

            const attachment =
                await createAttachment(file);

            attachments.push(attachment);

            renderAttachments();
        }

        fileInput.value = "";
    }

    /* Remove attachment */

    function removeAttachment(id) {
        const index =
            attachments.findIndex(
                attachment =>
                    attachment.id === id
            );

        if (index === -1) {
            return;
        }

        const attachment =
            attachments[index];

        if (attachment.previewUrl) {
            URL.revokeObjectURL(
                attachment.previewUrl
            );
        }

        attachments.splice(index, 1);

        renderAttachments();
    }

    /* Clear attachments */

    function clearAttachments() {
        attachments.forEach(
            attachment => {
                if (attachment.previewUrl) {
                    URL.revokeObjectURL(
                        attachment.previewUrl
                    );
                }
            }
        );

        attachments.length = 0;

        renderAttachments();
    }

    /* Menu state */

    function isMenuOpen() {
        return toolsMenu.classList.contains(
            "is-open"
        );
    }

    function openToolsMenu() {
        toolsMenu.classList.add("is-open");

        toolsButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function closeToolsMenu() {
        toolsMenu.classList.remove("is-open");

        toolsButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function toggleToolsMenu() {
        if (isMenuOpen()) {
            closeToolsMenu();
        } else {
            openToolsMenu();
        }
    }

    /* Tools button */

    toolsButton.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            toggleToolsMenu();
        }
    );

    /* Upload button */

    uploadButton.addEventListener(
        "click",
        event => {
            event.preventDefault();
            event.stopPropagation();

            closeToolsMenu();

            fileInput.click();
        }
    );

    /* File selection */

    fileInput.addEventListener(
        "change",
        event => {
            addFiles(event.target.files);
        }
    );

    /* Close menu */

    document.addEventListener(
        "click",
        event => {
            if (
                !toolsMenu.contains(
                    event.target
                ) &&
                !toolsButton.contains(
                    event.target
                )
            ) {
                closeToolsMenu();
            }
        }
    );

    /* Escape */

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                isMenuOpen()
            ) {
                closeToolsMenu();
                toolsButton.focus();
            }
        }
    );

    /* Public API */

    window.AdumexTools = {
        getFiles() {
            return attachments.map(
                attachment =>
                    attachment.file
            );
        },

        getAttachments() {
            return attachments.map(
                attachment => ({
                    id: attachment.id,
                    file: attachment.file,
                    name: attachment.name,
                    size: attachment.size,
                    mimeType: attachment.mimeType,
                    extension: attachment.extension,
                    category: attachment.category,
                    language: attachment.language,
                    label: attachment.label,
                    content: attachment.content,
                    readable: attachment.readable
                })
            );
        },

        getCodeFiles() {
            return attachments
                .filter(
                    attachment =>
                        attachment.category ===
                        "code"
                )
                .map(
                    attachment => ({
                        id: attachment.id,
                        file: attachment.file,
                        name: attachment.name,
                        language: attachment.language,
                        extension: attachment.extension,
                        content: attachment.content,
                        readable: attachment.readable
                    })
                );
        },

        getFileInfo(id) {
            const attachment =
                attachments.find(
                    item =>
                        item.id === id
                );

            if (!attachment) {
                return null;
            }

            return {
                id: attachment.id,
                name: attachment.name,
                size: attachment.size,
                mimeType: attachment.mimeType,
                extension: attachment.extension,
                category: attachment.category,
                language: attachment.language,
                label: attachment.label,
                content: attachment.content,
                readable: attachment.readable
            };
        },

        hasFiles() {
            return attachments.length > 0;
        },

        hasCodeFiles() {
            return attachments.some(
                attachment =>
                    attachment.category ===
                    "code"
            );
        },

        clearFiles() {
            clearAttachments();
        },

        removeFile(id) {
            removeAttachment(id);
        }
    };

    /* Initial state */

    attachmentsContainer.hidden = true;

    toolsButton.setAttribute(
        "aria-haspopup",
        "menu"
    );

    toolsButton.setAttribute(
        "aria-expanded",
        "false"
    );
});
