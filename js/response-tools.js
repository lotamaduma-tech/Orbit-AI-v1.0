"use strict";

const ORBIT_RESPONSE_TOOLS = {
    copyLabel: "Copy",
    copiedLabel: "Copied!",
    openLabel: "Open",
    githubLabel: "GitHub",
    codeCopyLabel: "Copy code",
    codeCopiedLabel: "Copied!"
};

const ORBIT_HIGHLIGHT_CONFIG = {
    script:
        "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js",

    style:
        "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
};

let orbitHighlightPromise = null;

async function orbitCopyText(
    text,
    button = null,
    originalLabel = "Copy"
) {
    try {
        await navigator.clipboard.writeText(text);

        if (button) {
            button.textContent =
                ORBIT_RESPONSE_TOOLS.copiedLabel;

            button.classList.add("copied");

            setTimeout(() => {
                button.textContent = originalLabel;
                button.classList.remove("copied");
            }, 1600);
        }

        return true;
    }
    catch (error) {
        console.error(
            "Orbit could not copy text:",
            error
        );

        return false;
    }
}

function orbitFallbackCopy(text) {
    const textarea =
        document.createElement("textarea");

    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    let successful = false;

    try {
        successful =
            document.execCommand("copy");
    }
    catch (error) {
        console.error(
            "Orbit fallback copy failed:",
            error
        );
    }

    textarea.remove();

    return successful;
}

async function orbitSmartCopy(
    text,
    button = null,
    originalLabel = "Copy"
) {
    try {
        if (
            navigator.clipboard &&
            window.isSecureContext
        ) {
            return await orbitCopyText(
                text,
                button,
                originalLabel
            );
        }

        const copied =
            orbitFallbackCopy(text);

        if (copied && button) {
            button.textContent =
                ORBIT_RESPONSE_TOOLS.copiedLabel;

            button.classList.add("copied");

            setTimeout(() => {
                button.textContent = originalLabel;
                button.classList.remove("copied");
            }, 1600);
        }

        return copied;
    }
    catch (error) {
        console.error(
            "Orbit copy failed:",
            error
        );

        return false;
    }
}

function loadOrbitHighlighter() {
    if (window.hljs) {
        return Promise.resolve(window.hljs);
    }

    if (orbitHighlightPromise) {
        return orbitHighlightPromise;
    }

    orbitHighlightPromise =
        new Promise((resolve, reject) => {

            if (
                !document.querySelector(
                    'link[data-orbit-highlight-style="true"]'
                )
            ) {
                const style =
                    document.createElement("link");

                style.rel = "stylesheet";
                style.href =
                    ORBIT_HIGHLIGHT_CONFIG.style;

                style.dataset.orbitHighlightStyle =
                    "true";

                document.head.appendChild(style);
            }

            const existingScript =
                document.querySelector(
                    'script[data-orbit-highlight="true"]'
                );

            if (existingScript) {
                existingScript.addEventListener(
                    "load",
                    () => resolve(window.hljs)
                );

                existingScript.addEventListener(
                    "error",
                    reject
                );

                return;
            }

            const script =
                document.createElement("script");

            script.src =
                ORBIT_HIGHLIGHT_CONFIG.script;

            script.async = true;

            script.dataset.orbitHighlight =
                "true";

            script.onload = () => {
                resolve(window.hljs);
            };

            script.onerror = () => {
                console.error(
                    "Orbit could not load syntax highlighting."
                );

                reject(
                    new Error(
                        "Highlight.js failed to load."
                    )
                );
            };

            document.head.appendChild(script);
        });

    return orbitHighlightPromise;
}

function detectOrbitCodeLanguage(
    codeElement,
    pre
) {
    if (!codeElement) {
        return null;
    }

    const classes = [
        ...codeElement.classList,
        ...(pre ? [...pre.classList] : [])
    ];

    for (const className of classes) {
        const match =
            className.match(
                /^(?:language|lang)-(.+)$/i
            );

        if (match) {
            return match[1].toLowerCase();
        }
    }

    const text =
        codeElement.textContent || "";

    if (
        /<(!DOCTYPE|html|head|body|div|section|main|script|style)\b/i.test(
            text
        )
    ) {
        return "html";
    }

    if (
        /(^|\n)\s*(const|let|var|function|import|export|class)\s+/m.test(
            text
        )
    ) {
        return "javascript";
    }

    if (
        /(^|\n)\s*(def|class|import|from|print)\s+/m.test(
            text
        )
    ) {
        return "python";
    }

    if (
        /^\s*[{[][\s\S]*[}\]]\s*$/m.test(text)
    ) {
        return "json";
    }

    return null;
}

async function highlightOrbitCode(
    codeElement,
    pre
) {
    if (!codeElement) {
        return;
    }

    if (
        codeElement.dataset.orbitHighlighted === "true"
    ) {
        return;
    }

    try {
        const hljs =
            await loadOrbitHighlighter();

        if (!hljs) {
            return;
        }

        const language =
            detectOrbitCodeLanguage(
                codeElement,
                pre
            );

        if (language) {
            const aliases = {
                js: "javascript",
                jsx: "javascript",
                ts: "typescript",
                tsx: "typescript",
                html: "xml",
                htm: "xml",
                css: "css",
                py: "python",
                sh: "bash",
                shell: "bash",
                yml: "yaml",
                md: "markdown",
                c: "c",
                cpp: "cpp",
                cxx: "cpp",
                cs: "csharp",
                java: "java",
                php: "php",
                rb: "ruby",
                rs: "rust",
                sql: "sql"
            };

            const normalizedLanguage =
                aliases[language] ||
                language;

            if (
                hljs.getLanguage(
                    normalizedLanguage
                )
            ) {
                const result =
                    hljs.highlight(
                        codeElement.textContent,
                        {
                            language:
                                normalizedLanguage
                        }
                    );

                codeElement.innerHTML =
                    result.value;

                codeElement.classList.add(
                    "hljs"
                );

                codeElement.dataset.orbitLanguage =
                    normalizedLanguage;
            }
        }
        else {
            const result =
                hljs.highlightAuto(
                    codeElement.textContent
                );

            if (result && result.value) {
                codeElement.innerHTML =
                    result.value;

                codeElement.classList.add(
                    "hljs"
                );

                if (result.language) {
                    codeElement.dataset.orbitLanguage =
                        result.language;
                }
            }
        }

        codeElement.dataset.orbitHighlighted =
            "true";

        if (pre) {
            pre.dataset.orbitHighlighted =
                "true";
        }
    }
    catch (error) {
        console.warn(
            "Orbit syntax highlighting skipped:",
            error
        );
    }
}

function createOrbitCodeCopyButton(code) {
    const button =
        document.createElement("button");

    button.type = "button";
    button.className = "orbit-code-copy";

    button.textContent =
        ORBIT_RESPONSE_TOOLS.codeCopyLabel;

    button.setAttribute(
        "aria-label",
        "Copy code"
    );

    button.addEventListener(
        "click",
        async () => {
            await orbitSmartCopy(
                code,
                button,
                ORBIT_RESPONSE_TOOLS.codeCopyLabel
            );
        }
    );

    return button;
}

function enhanceOrbitCodeBlocks(root) {
    if (!root) {
        return;
    }

    const codeBlocks =
        root.querySelectorAll("pre");

    codeBlocks.forEach(pre => {

        const code =
            pre.querySelector("code");

        if (!code) {
            return;
        }

        if (
            pre.dataset.orbitCodeEnhanced === "true"
        ) {
            return;
        }

        pre.dataset.orbitCodeEnhanced =
            "true";

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "orbit-code-wrapper";

        pre.parentNode.insertBefore(
            wrapper,
            pre
        );

        wrapper.appendChild(pre);

        const codeLanguage =
            detectOrbitCodeLanguage(
                code,
                pre
            );

        if (codeLanguage) {
            wrapper.dataset.language =
                codeLanguage;
        }

        const toolbar =
            document.createElement("div");

        toolbar.className =
            "orbit-code-toolbar";

        if (codeLanguage) {
            const languageLabel =
                document.createElement("span");

            languageLabel.className =
                "orbit-code-language";

            languageLabel.textContent =
                codeLanguage;

            toolbar.appendChild(
                languageLabel
            );
        }

        const copyButton =
            createOrbitCodeCopyButton(
                code.textContent
            );

        toolbar.appendChild(
            copyButton
        );

        wrapper.insertBefore(
            toolbar,
            pre
        );

        highlightOrbitCode(
            code,
            pre
        );
    });
}

function isOrbitValidUrl(value) {
    if (!value) {
        return false;
    }

    try {
        const url =
            new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    }
    catch {
        return false;
    }
}

function isOrbitGitHubUrl(value) {
    if (!value) {
        return false;
    }

    try {
        const url =
            new URL(value);

        return (
            url.hostname === "github.com" ||
            url.hostname === "www.github.com" ||
            url.hostname.endsWith(".github.com")
        );
    }
    catch {
        return false;
    }
}

function getOrbitLinkLabel(
    url,
    originalText = ""
) {
    if (
        isOrbitGitHubUrl(url)
    ) {
        return ORBIT_RESPONSE_TOOLS.githubLabel;
    }

    return originalText || url;
}

function orbitLinkAlreadyEnhanced(link) {
    if (!link) {
        return true;
    }

    if (
        link.closest(".orbit-link-container")
    ) {
        return true;
    }

    if (
        link.classList.contains("orbit-link")
    ) {
        return true;
    }

    if (
        link.dataset.orbitEnhanced === "true"
    ) {
        return true;
    }

    return false;
}

function createOrbitLinkActions(url) {
    const container =
        document.createElement("span");

    container.className =
        "orbit-link-actions";

    if (
        isOrbitGitHubUrl(url)
    ) {
        container.classList.add(
            "orbit-github-actions"
        );
    }

    const openButton =
        document.createElement("button");

    openButton.type = "button";
    openButton.className =
        "orbit-link-open";

    openButton.textContent =
        ORBIT_RESPONSE_TOOLS.openLabel;

    openButton.setAttribute(
        "aria-label",
        "Open link"
    );

    openButton.addEventListener(
        "click",
        () => {
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        }
    );

    const copyButton =
        document.createElement("button");

    copyButton.type = "button";
    copyButton.className =
        "orbit-link-copy";

    copyButton.textContent =
        ORBIT_RESPONSE_TOOLS.copyLabel;

    copyButton.setAttribute(
        "aria-label",
        "Copy link"
    );

    copyButton.addEventListener(
        "click",
        async () => {
            await orbitSmartCopy(
                url,
                copyButton,
                ORBIT_RESPONSE_TOOLS.copyLabel
            );
        }
    );

    container.appendChild(
        openButton
    );

    container.appendChild(
        copyButton
    );

    return container;
}

function enhanceOrbitLinks(root) {
    if (!root) {
        return;
    }

    const links =
        root.querySelectorAll("a");

    links.forEach(link => {

        if (
            orbitLinkAlreadyEnhanced(link)
        ) {
            return;
        }

        const href =
            link.getAttribute("href");

        if (
            !isOrbitValidUrl(href)
        ) {
            return;
        }

        const isGitHub =
            isOrbitGitHubUrl(href);

        link.dataset.orbitEnhanced =
            "true";

        link.target = "_blank";

        link.rel =
            "noopener noreferrer";

        link.classList.add(
            "orbit-link"
        );

        if (isGitHub) {
            link.classList.add(
                "orbit-github-link"
            );

            link.dataset.orbitGithub =
                "true";

            if (
                !link.textContent.trim() ||
                link.textContent.trim() === href
            ) {
                link.textContent =
                    getOrbitLinkLabel(href);
            }
        }

        const container =
            document.createElement("span");

        container.className =
            "orbit-link-container";

        if (isGitHub) {
            container.classList.add(
                "orbit-github-container"
            );
        }

        link.parentNode.insertBefore(
            container,
            link
        );

        container.appendChild(link);

        container.appendChild(
            createOrbitLinkActions(href)
        );
    });
}

function enhanceOrbitRawUrls(root) {
    if (!root) {
        return;
    }

    const walker =
        document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT
        );

    const nodes = [];

    let node;

    while (
        (node = walker.nextNode())
    ) {
        const parent =
            node.parentElement;

        if (!parent) {
            continue;
        }

        if (
            parent.closest(
                "a, pre, code, button, textarea, input, script, style, .orbit-link-container, .orbit-code-wrapper"
            )
        ) {
            continue;
        }

        const text =
            node.nodeValue || "";

        if (
            /https?:\/\/[^\s<>"']+/i.test(text)
        ) {
            nodes.push(node);
        }
    }

    nodes.forEach(textNode => {

        const text =
            textNode.nodeValue;

        const urlPattern =
            /https?:\/\/[^\s<>"']+/gi;

        const fragment =
            document.createDocumentFragment();

        let lastIndex = 0;
        let match;

        while (
            (match = urlPattern.exec(text))
        ) {
            let url =
                match[0];

            const punctuationMatch =
                url.match(
                    /[.,!?;:)]+$/
                );

            let punctuation = "";

            if (punctuationMatch) {
                punctuation =
                    punctuationMatch[0];

                url =
                    url.slice(
                        0,
                        -punctuation.length
                    );
            }

            if (
                !isOrbitValidUrl(url)
            ) {
                continue;
            }

            const start =
                match.index;

            if (start > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(
                        text.slice(
                            lastIndex,
                            start
                        )
                    )
                );
            }

            const isGitHub =
                isOrbitGitHubUrl(url);

            const link =
                document.createElement("a");

            link.href = url;
            link.target = "_blank";

            link.rel =
                "noopener noreferrer";

            link.dataset.orbitEnhanced =
                "true";

            link.className =
                "orbit-link";

            if (isGitHub) {
                link.classList.add(
                    "orbit-github-link"
                );

                link.dataset.orbitGithub =
                    "true";

                link.textContent =
                    ORBIT_RESPONSE_TOOLS.githubLabel;
            }
            else {
                link.textContent = url;
            }

            const container =
                document.createElement("span");

            container.className =
                "orbit-link-container";

            if (isGitHub) {
                container.classList.add(
                    "orbit-github-container"
                );
            }

            container.appendChild(link);

            container.appendChild(
                createOrbitLinkActions(url)
            );

            fragment.appendChild(
                container
            );

            if (punctuation) {
                fragment.appendChild(
                    document.createTextNode(
                        punctuation
                    )
                );
            }

            lastIndex =
                start + match[0].length;
        }

        if (lastIndex === 0) {
            return;
        }

        if (
            lastIndex < text.length
        ) {
            fragment.appendChild(
                document.createTextNode(
                    text.slice(lastIndex)
                )
            );
        }

        textNode.parentNode.replaceChild(
            fragment,
            textNode
        );
    });
}

function cleanOrbitMarkdown(root) {
    if (!root) {
        return;
    }

    const walker =
        document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT
        );

    const nodes = [];

    let node;

    while (
        (node = walker.nextNode())
    ) {
        const parent =
            node.parentElement;

        if (!parent) {
            continue;
        }

        if (
            parent.closest(
                "pre, code, button, a, textarea, input, script, style, .orbit-link-container, .orbit-code-wrapper"
            )
        ) {
            continue;
        }

        nodes.push(node);
    }

    nodes.forEach(textNode => {

        let text =
            textNode.nodeValue;

        text =
            text.replace(
                /(^|\s)\*{1,3}(?=\s|$)/g,
                "$1"
            );

        text =
            text.replace(
                /(^|\s)_{1,3}(?=\s|$)/g,
                "$1"
            );

        text =
            text.replace(
                /(^|[^\w])\*{1,3}(?=\w)/g,
                "$1"
            );

        text =
            text.replace(
                /(?<=\w)\*{1,3}(?!\w)/g,
                ""
            );

        if (
            text !== textNode.nodeValue
        ) {
            textNode.nodeValue =
                text;
        }
    });
}

function enhanceOrbitResponse(messageElement) {
    if (!messageElement) {
        return;
    }

    enhanceOrbitCodeBlocks(
        messageElement
    );

    enhanceOrbitLinks(
        messageElement
    );

    enhanceOrbitRawUrls(
        messageElement
    );

    cleanOrbitMarkdown(
        messageElement
    );
}

function initializeOrbitResponseTools() {
    const chatWindow =
        document.getElementById(
            "chat-window"
        );

    if (!chatWindow) {
        return;
    }

    chatWindow
        .querySelectorAll(
            ".message.orbit, .message.adumex-message"
        )
        .forEach(message => {
            enhanceOrbitResponse(
                message
            );
        });

    const observer =
        new MutationObserver(
            mutations => {

                mutations.forEach(
                    mutation => {

                        mutation.addedNodes
                            .forEach(node => {

                                if (
                                    node.nodeType !==
                                    Node.ELEMENT_NODE
                                ) {
                                    return;
                                }

                                if (
                                    node.matches &&
                                    node.matches(
                                        ".message.orbit, .message.adumex-message"
                                    )
                                ) {
                                    enhanceOrbitResponse(
                                        node
                                    );

                                    return;
                                }

                                const message = node.closest?.(
                                    ".message.orbit, .message.adumex-message"
                                );

                                if (message) {
                                    enhanceOrbitResponse(message);
                                }

                                if (
                                    node.querySelectorAll
                                ) {
                                    node
                                        .querySelectorAll(
                                            ".message.orbit, .message.adumex-message"
                                        )
                                        .forEach(
                                            message => {
                                                enhanceOrbitResponse(
                                                    message
                                                );
                                            }
                                        );
                                }
                            });
                    }
                );
            }
        );

    observer.observe(
        chatWindow,
        {
            childList: true,
            subtree: true
        }
    );

    console.log(
        "Orbit response tools initialized."
    );
}

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitResponseTools
    );
}
else {
    initializeOrbitResponseTools();
}

window.OrbitResponseTools = {
    enhance:
        enhanceOrbitResponse,

    copy:
        orbitSmartCopy,

    enhanceLinks:
        enhanceOrbitLinks,

    enhanceCode:
        enhanceOrbitCodeBlocks,

    highlightCode:
        highlightOrbitCode,

    isGitHub:
        isOrbitGitHubUrl
};