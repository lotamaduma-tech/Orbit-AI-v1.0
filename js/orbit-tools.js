"use strict";

(() => {
    function initializeOrbitTools() {
        const toolsButton =
            document.getElementById("orbit-tools-btn");

        const commandArea =
            document.querySelector(".command-area");

        const commandBox =
            document.querySelector(".command-box");

        const commandInput =
            document.getElementById("command-input");

        if (
            !toolsButton ||
            !commandArea ||
            !commandBox ||
            !commandInput
        ) {
            return;
        }

        const MAX_FILES = 10;
        const MENU_GAP = 10;
        const VIEWPORT_GAP = 12;

        let toolsMenu = null;
        let fileInput = null;
        let imageInput = null;
        let selectedFiles = [];

        function createElement(
            tag,
            className = "",
            text = ""
        ) {
            const element =
                document.createElement(tag);

            if (className) {
                element.className =
                    className;
            }

            if (text) {
                element.textContent =
                    text;
            }

            return element;
        }

        function createFileInput(
            accept,
            multiple,
            handler
        ) {
            const input =
                document.createElement("input");

            input.type = "file";
            input.accept = accept;
            input.multiple = multiple;
            input.tabIndex = -1;
            input.setAttribute(
                "aria-hidden",
                "true"
            );

            Object.assign(
                input.style,
                {
                    position: "fixed",
                    width: "1px",
                    height: "1px",
                    opacity: "0",
                    pointerEvents: "none",
                    left: "-9999px",
                    top: "-9999px"
                }
            );

            input.addEventListener(
                "change",
                handler
            );

            document.body.appendChild(
                input
            );

            return input;
        }

        function createAttachmentArea() {
            let attachmentArea =
                document.getElementById(
                    "orbit-attachments"
                );

            if (attachmentArea) {
                if (
                    attachmentArea.parentElement !==
                    commandBox
                ) {
                    commandBox.insertBefore(
                        attachmentArea,
                        commandInput
                    );
                }

                return attachmentArea;
            }

            attachmentArea =
                createElement(
                    "div",
                    "orbit-attachments"
                );

            attachmentArea.id =
                "orbit-attachments";

            attachmentArea.hidden = true;

            attachmentArea.setAttribute(
                "aria-label",
                "Attached files"
            );

            commandBox.insertBefore(
                attachmentArea,
                commandInput
            );

            return attachmentArea;
        }

        function createToolOption(
            icon,
            title,
            description
        ) {
            const button =
                createElement(
                    "button",
                    "orbit-tool-option"
                );

            button.type = "button";

            button.setAttribute(
                "role",
                "menuitem"
            );

            const iconWrapper =
                createElement(
                    "span",
                    "orbit-tool-icon"
                );

            iconWrapper.appendChild(
                createElement(
                    "i",
                    icon
                )
            );

            const content =
                createElement(
                    "span",
                    "orbit-tool-content"
                );

            content.appendChild(
                createElement(
                    "strong",
                    "",
                    title
                )
            );

            content.appendChild(
                createElement(
                    "small",
                    "",
                    description
                )
            );

            const arrow =
                createElement(
                    "span",
                    "orbit-tool-arrow"
                );

            arrow.appendChild(
                createElement(
                    "i",
                    "fa-solid fa-chevron-right"
                )
            );

            button.appendChild(
                iconWrapper
            );

            button.appendChild(
                content
            );

            button.appendChild(
                arrow
            );

            return button;
        }

        function createToolsMenu() {
            if (toolsMenu) {
                return;
            }

            toolsMenu =
                createElement(
                    "div",
                    "orbit-tools-menu"
                );

            toolsMenu.setAttribute(
                "role",
                "menu"
            );

            toolsMenu.setAttribute(
                "aria-label",
                "Orbit tools"
            );

            toolsMenu.hidden = true;

            const header =
                createElement(
                    "div",
                    "orbit-tools-header"
                );

            header.appendChild(
                createElement(
                    "strong",
                    "orbit-tools-title",
                    "Orbit tools"
                )
            );

            header.appendChild(
                createElement(
                    "span",
                    "orbit-tools-description",
                    "Choose what you want to add"
                )
            );

            const options =
                createElement(
                    "div",
                    "orbit-tools-options"
                );

            const uploadFiles =
                createToolOption(
                    "fa-solid fa-paperclip",
                    "Upload files",
                    "Add documents, code and other files"
                );

            const uploadImages =
                createToolOption(
                    "fa-regular fa-image",
                    "Upload images",
                    "Add one or more images"
                );

            const analyzeImage =
                createToolOption(
                    "fa-solid fa-eye",
                    "Analyze image",
                    "Add an image for Orbit to understand"
                );

            const generateImage =
                createToolOption(
                    "fa-solid fa-wand-magic-sparkles",
                    "Generate image",
                    "Create an image from a description"
                );

            uploadFiles.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    closeToolsMenu();

                    if (fileInput) {
                        fileInput.click();
                    }
                }
            );

            uploadImages.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    closeToolsMenu();

                    if (imageInput) {
                        imageInput.click();
                    }
                }
            );

            analyzeImage.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    closeToolsMenu();

                    if (imageInput) {
                        imageInput.click();
                    }
                }
            );

            generateImage.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    closeToolsMenu();

                    activateImageGeneration();
                }
            );

            options.appendChild(
                uploadFiles
            );

            options.appendChild(
                uploadImages
            );

            options.appendChild(
                analyzeImage
            );

            options.appendChild(
                generateImage
            );

            toolsMenu.appendChild(
                header
            );

            toolsMenu.appendChild(
                options
            );

            document.body.appendChild(
                toolsMenu
            );

            toolsMenu.addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                }
            );
        }

        function positionToolsMenu() {
            if (
                !toolsMenu ||
                !toolsMenu.classList.contains(
                    "is-open"
                )
            ) {
                return;
            }

            const buttonRect =
                toolsButton.getBoundingClientRect();

            const viewportWidth =
                window.innerWidth;

            const viewportHeight =
                window.innerHeight;

            const menuRect =
                toolsMenu.getBoundingClientRect();

            const menuWidth =
                menuRect.width;

            const menuHeight =
                menuRect.height;

            let left =
                buttonRect.left;

            let top =
                buttonRect.top -
                menuHeight -
                MENU_GAP;

            const maximumLeft =
                viewportWidth -
                menuWidth -
                VIEWPORT_GAP;

            left =
                Math.min(
                    left,
                    maximumLeft
                );

            left =
                Math.max(
                    VIEWPORT_GAP,
                    left
                );

            if (
                top <
                VIEWPORT_GAP
            ) {
                top =
                    buttonRect.bottom +
                    MENU_GAP;
            }

            if (
                top +
                menuHeight >
                viewportHeight -
                VIEWPORT_GAP
            ) {
                top =
                    viewportHeight -
                    menuHeight -
                    VIEWPORT_GAP;
            }

            top =
                Math.max(
                    VIEWPORT_GAP,
                    top
                );

            toolsMenu.style.position =
                "fixed";

            toolsMenu.style.left =
                `${Math.round(left)}px`;

            toolsMenu.style.top =
                `${Math.round(top)}px`;

            toolsMenu.style.right =
                "auto";

            toolsMenu.style.bottom =
                "auto";

            toolsMenu.style.maxHeight =
                `${Math.max(
                    160,
                    viewportHeight -
                    VIEWPORT_GAP * 2
                )}px`;
        }

        function openToolsMenu() {
            if (!toolsMenu) {
                createToolsMenu();
            }

            toolsMenu.hidden = false;

            toolsMenu.classList.add(
                "is-open"
            );

            commandBox.classList.add(
                "tools-open"
            );

            commandArea.classList.add(
                "tools-open"
            );

            toolsButton.setAttribute(
                "aria-expanded",
                "true"
            );

            positionToolsMenu();

            requestAnimationFrame(() => {
                positionToolsMenu();
            });

            requestAnimationFrame(() => {
                commandInput.focus();
            });
        }

        function closeToolsMenu() {
            if (!toolsMenu) {
                return;
            }

            toolsMenu.classList.remove(
                "is-open"
            );

            toolsMenu.hidden = true;

            commandBox.classList.remove(
                "tools-open"
            );

            commandArea.classList.remove(
                "tools-open"
            );

            toolsButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        function toggleToolsMenu() {
            if (
                toolsMenu &&
                toolsMenu.classList.contains(
                    "is-open"
                )
            ) {
                closeToolsMenu();
            } else {
                openToolsMenu();
            }
        }

        function addFiles(files) {
            const incoming =
                Array.from(
                    files || []
                );

            if (!incoming.length) {
                return;
            }

            const remaining =
                MAX_FILES -
                selectedFiles.length;

            if (remaining <= 0) {
                return;
            }

            selectedFiles.push(
                ...incoming.slice(
                    0,
                    remaining
                )
            );

            renderAttachments();

            commandInput.focus();
        }

        function addImages(files) {
            const incoming =
                Array.from(
                    files || []
                ).filter(
                    file =>
                        file.type &&
                        file.type.startsWith(
                            "image/"
                        )
                );

            if (!incoming.length) {
                return;
            }

            const remaining =
                MAX_FILES -
                selectedFiles.length;

            if (remaining <= 0) {
                return;
            }

            selectedFiles.push(
                ...incoming.slice(
                    0,
                    remaining
                )
            );

            renderAttachments();

            commandInput.focus();
        }

        function renderAttachments() {
            const attachmentArea =
                createAttachmentArea();

            attachmentArea.innerHTML =
                "";

            if (
                !selectedFiles.length
            ) {
                attachmentArea.hidden =
                    true;

                commandBox.classList.remove(
                    "has-attachments"
                );

                commandArea.classList.remove(
                    "has-attachments"
                );

                return;
            }

            attachmentArea.hidden =
                false;

            commandBox.classList.add(
                "has-attachments"
            );

            commandArea.classList.add(
                "has-attachments"
            );

            const header =
                createElement(
                    "div",
                    "orbit-attachments-header"
                );

            const title =
                createElement(
                    "span",
                    "orbit-attachments-title",
                    `${selectedFiles.length} ${selectedFiles.length === 1
                        ? "attachment"
                        : "attachments"
                    }`
                );

            const clearButton =
                createElement(
                    "button",
                    "orbit-attachments-clear",
                    "Clear all"
                );

            clearButton.type =
                "button";

            clearButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    clearSelectedFiles();
                }
            );

            header.appendChild(
                title
            );

            header.appendChild(
                clearButton
            );

            const list =
                createElement(
                    "div",
                    "orbit-attachments-list"
                );

            list.setAttribute(
                "role",
                "list"
            );

            selectedFiles.forEach(
                (file, index) => {
                    list.appendChild(
                        createAttachmentItem(
                            file,
                            index
                        )
                    );
                }
            );

            attachmentArea.appendChild(
                header
            );

            attachmentArea.appendChild(
                list
            );

            requestAnimationFrame(() => {
                list.scrollLeft =
                    list.scrollWidth;

                commandInput.focus();
            });
        }

        function createAttachmentItem(
            file,
            index
        ) {
            const item =
                createElement(
                    "div",
                    "orbit-attachment-item"
                );

            item.dataset.index =
                String(index);

            item.setAttribute(
                "role",
                "listitem"
            );

            const preview =
                createElement(
                    "div",
                    "orbit-attachment-preview"
                );

            if (
                file.type &&
                file.type.startsWith(
                    "image/"
                )
            ) {
                const image =
                    document.createElement(
                        "img"
                    );

                const objectUrl =
                    URL.createObjectURL(
                        file
                    );

                image.src =
                    objectUrl;

                image.alt =
                    file.name;

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

                image.addEventListener(
                    "error",
                    () => {
                        URL.revokeObjectURL(
                            objectUrl
                        );
                    },
                    {
                        once: true
                    }
                );

                preview.appendChild(
                    image
                );
            } else {
                preview.appendChild(
                    createElement(
                        "i",
                        getFileIcon(file)
                    )
                );
            }

            const information =
                createElement(
                    "div",
                    "orbit-attachment-info"
                );

            information.appendChild(
                createElement(
                    "strong",
                    "",
                    file.name
                )
            );

            information.appendChild(
                createElement(
                    "small",
                    "",
                    formatFileSize(
                        file.size
                    )
                )
            );

            const removeButton =
                createElement(
                    "button",
                    "orbit-attachment-remove"
                );

            removeButton.type =
                "button";

            removeButton.setAttribute(
                "aria-label",
                `Remove ${file.name}`
            );

            removeButton.title =
                `Remove ${file.name}`;

            removeButton.appendChild(
                createElement(
                    "i",
                    "fa-solid fa-xmark"
                )
            );

            removeButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    removeSelectedFile(
                        index
                    );
                }
            );

            item.appendChild(
                preview
            );

            item.appendChild(
                information
            );

            item.appendChild(
                removeButton
            );

            return item;
        }

        function getFileIcon(file) {
            const name =
                (
                    file.name ||
                    ""
                ).toLowerCase();

            const type =
                (
                    file.type ||
                    ""
                ).toLowerCase();

            if (
                type ===
                "application/pdf" ||
                name.endsWith(".pdf")
            ) {
                return "fa-solid fa-file-pdf";
            }

            if (
                name.endsWith(".js") ||
                name.endsWith(".mjs") ||
                name.endsWith(".cjs") ||
                name.endsWith(".ts") ||
                name.endsWith(".jsx") ||
                name.endsWith(".tsx") ||
                name.endsWith(".py") ||
                name.endsWith(".java") ||
                name.endsWith(".cpp") ||
                name.endsWith(".cc") ||
                name.endsWith(".cxx") ||
                name.endsWith(".c") ||
                name.endsWith(".h") ||
                name.endsWith(".hpp") ||
                name.endsWith(".cs") ||
                name.endsWith(".go") ||
                name.endsWith(".rs") ||
                name.endsWith(".php") ||
                name.endsWith(".rb") ||
                name.endsWith(".swift") ||
                name.endsWith(".kt") ||
                name.endsWith(".kts") ||
                name.endsWith(".sh") ||
                name.endsWith(".bash") ||
                name.endsWith(".sql") ||
                name.endsWith(".html") ||
                name.endsWith(".htm") ||
                name.endsWith(".css") ||
                name.endsWith(".scss") ||
                name.endsWith(".sass") ||
                name.endsWith(".less") ||
                name.endsWith(".json") ||
                name.endsWith(".xml") ||
                name.endsWith(".yaml") ||
                name.endsWith(".yml") ||
                name.endsWith(".toml") ||
                name.endsWith(".env")
            ) {
                return "fa-solid fa-file-code";
            }

            if (
                name.endsWith(".doc") ||
                name.endsWith(".docx")
            ) {
                return "fa-solid fa-file-word";
            }

            if (
                name.endsWith(".xls") ||
                name.endsWith(".xlsx") ||
                name.endsWith(".csv")
            ) {
                return "fa-solid fa-file-excel";
            }

            if (
                name.endsWith(".ppt") ||
                name.endsWith(".pptx")
            ) {
                return "fa-solid fa-file-powerpoint";
            }

            if (
                name.endsWith(".zip") ||
                name.endsWith(".rar") ||
                name.endsWith(".7z") ||
                name.endsWith(".tar") ||
                name.endsWith(".gz")
            ) {
                return "fa-solid fa-file-zipper";
            }

            if (
                name.endsWith(".txt") ||
                name.endsWith(".md") ||
                name.endsWith(".log")
            ) {
                return "fa-solid fa-file-lines";
            }

            return "fa-regular fa-file";
        }

        function removeSelectedFile(
            index
        ) {
            if (
                index < 0 ||
                index >= selectedFiles.length
            ) {
                return;
            }

            selectedFiles.splice(
                index,
                1
            );

            renderAttachments();

            commandInput.focus();
        }

        function clearSelectedFiles() {
            selectedFiles = [];

            renderAttachments();

            commandInput.focus();
        }

        function formatFileSize(bytes) {
            if (
                !Number.isFinite(bytes) ||
                bytes <= 0
            ) {
                return "Unknown size";
            }

            const units = [
                "B",
                "KB",
                "MB",
                "GB"
            ];

            const exponent =
                Math.min(
                    Math.floor(
                        Math.log(bytes) /
                        Math.log(1024)
                    ),
                    units.length - 1
                );

            const size =
                bytes /
                Math.pow(
                    1024,
                    exponent
                );

            return `${size.toFixed(
                exponent === 0
                    ? 0
                    : 1
            )} ${units[exponent]}`;
        }

        function activateImageGeneration() {
            const input =
                document.getElementById(
                    "command-input"
                );

            if (!input) {
                return;
            }

            if (
                !input.value.trim()
            ) {
                input.value =
                    "Create an image of ";
            }

            input.focus();

            input.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );
        }

        toolsButton.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                toggleToolsMenu();
            }
        );

        document.addEventListener(
            "click",
            event => {
                if (!toolsMenu) {
                    return;
                }

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

        document.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Escape"
                ) {
                    closeToolsMenu();
                }
            }
        );

        window.addEventListener(
            "resize",
            () => {
                positionToolsMenu();
            },
            {
                passive: true
            }
        );

        window.addEventListener(
            "scroll",
            () => {
                positionToolsMenu();
            },
            {
                passive: true
            }
        );

        fileInput =
            createFileInput(
                "",
                true,
                event => {
                    addFiles(
                        event.target.files
                    );

                    event.target.value =
                        "";
                }
            );

        imageInput =
            createFileInput(
                "image/*",
                true,
                event => {
                    addImages(
                        event.target.files
                    );

                    event.target.value =
                        "";
                }
            );

        createAttachmentArea();

        createToolsMenu();

        closeToolsMenu();

        window.orbitTools = {
            getSelectedFiles() {
                return [
                    ...selectedFiles
                ];
            },

            getSelectedImages() {
                return selectedFiles.filter(
                    file =>
                        file.type &&
                        file.type.startsWith(
                            "image/"
                        )
                );
            },

            getAllSelectedFiles() {
                return [
                    ...selectedFiles
                ];
            },

            clearSelectedFiles,

            open() {
                openToolsMenu();
            },

            close() {
                closeToolsMenu();
            },

            isOpen() {
                return Boolean(
                    toolsMenu &&
                    toolsMenu.classList.contains(
                        "is-open"
                    )
                );
            },

            getFileCount() {
                return selectedFiles.length;
            },

            hasFiles() {
                return (
                    selectedFiles.length > 0
                );
            }
        };
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initializeOrbitTools,
            {
                once: true
            }
        );
    } else {
        initializeOrbitTools();
    }
})();