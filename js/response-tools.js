/* ===========================================================
   ORBIT AI — RESPONSE TOOLS
   ===========================================================

   Works alongside:
   - js/orbit.js

   Loaded only by:
   - index.html
   - assistant.html

   IMPORTANT:
   orbit.js is responsible for formatting AI responses.

   This file ONLY:
   - Adds code-copy buttons
   - Adds actions to already-valid links
   - Converts genuine raw URLs into links
   - Cleans stray Markdown markers

   It NEVER processes existing HTML attributes as text.
   It NEVER re-processes links created by orbit.js.
   =========================================================== */

"use strict";


/* ===========================================================
   CONFIGURATION
   =========================================================== */

const ORBIT_RESPONSE_TOOLS = {

    copyLabel: "Copy",
    copiedLabel: "Copied!",

    openLabel: "Open",

    codeCopyLabel: "Copy code",
    codeCopiedLabel: "Copied!"
};


/* ===========================================================
   COPY TO CLIPBOARD
   =========================================================== */

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

                button.textContent =
                    originalLabel;

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


/* ===========================================================
   FALLBACK COPY
   =========================================================== */

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


/* ===========================================================
   SMART COPY
   =========================================================== */

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

                button.textContent =
                    originalLabel;

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


/* ===========================================================
   CREATE CODE COPY BUTTON
   =========================================================== */

function createOrbitCodeCopyButton(code) {

    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "orbit-code-copy";

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


/* ===========================================================
   ENHANCE CODE BLOCKS
   =========================================================== */

function enhanceOrbitCodeBlocks(root) {

    if (!root) return;

    const codeBlocks =
        root.querySelectorAll("pre");

    codeBlocks.forEach(pre => {

        /*
         * Do not process the same block twice.
         */

        if (
            pre.dataset.orbitCodeEnhanced === "true"
        ) {
            return;
        }

        const code =
            pre.querySelector("code");

        if (!code) {
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

        const copyButton =
            createOrbitCodeCopyButton(
                code.textContent
            );

        wrapper.appendChild(
            copyButton
        );
    });
}


/* ===========================================================
   VALIDATE URL
   =========================================================== */

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


/* ===========================================================
   CHECK WHETHER LINK ALREADY HAS ORBIT CONTROLS
   =========================================================== */

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


/* ===========================================================
   CREATE LINK ACTIONS
   =========================================================== */

function createOrbitLinkActions(url) {

    const container =
        document.createElement("span");

    container.className =
        "orbit-link-actions";

    /* -------------------------------------------------------
       OPEN
       ------------------------------------------------------- */

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


    /* -------------------------------------------------------
       COPY
       ------------------------------------------------------- */

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


    container.appendChild(openButton);
    container.appendChild(copyButton);

    return container;
}


/* ===========================================================
   ENHANCE EXISTING LINKS
   ===========================================================

   IMPORTANT:
   We ONLY enhance normal <a> elements.

   We do NOT search their innerHTML.
   We do NOT touch href attributes.
   We do NOT touch data attributes.
   We do NOT parse generated HTML as text.
   =========================================================== */

function enhanceOrbitLinks(root) {

    if (!root) return;

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

        /*
         * Mark before modifying the DOM.
         */

        link.dataset.orbitEnhanced =
            "true";

        link.target = "_blank";

        link.rel =
            "noopener noreferrer";


        /*
         * Create wrapper.
         */

        const container =
            document.createElement("span");

        container.className =
            "orbit-link-container";


        /*
         * Replace link with wrapper.
         */

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


/* ===========================================================
   FIND GENUINE RAW URLS
   ===========================================================

   This function ONLY processes text nodes.

   It completely ignores:
   - HTML
   - attributes
   - existing links
   - buttons
   - code
   - pre blocks
   - Orbit-generated elements
   =========================================================== */

function enhanceOrbitRawUrls(root) {

    if (!root) return;

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

        /*
         * NEVER process generated Orbit controls.
         */

        if (
            parent.closest(
                "a, pre, code, button, textarea, input, script, style, .orbit-link-container, .orbit-code-wrapper"
            )
        ) {
            continue;
        }

        const text =
            node.nodeValue || "";

        /*
         * Only process text containing
         * an actual HTTP/HTTPS URL.
         */

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

            /*
             * Remove punctuation accidentally
             * attached to a URL.
             */

            url =
                url.replace(
                    /[.,!?;:)]+$/,
                    ""
                );


            const start =
                match.index;


            /*
             * Text before URL.
             */

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


            /*
             * Create normal link.
             */

            const link =
                document.createElement("a");

            link.href = url;

            link.textContent = url;

            link.target = "_blank";

            link.rel =
                "noopener noreferrer";


            /*
             * Mark as enhanced.
             */

            link.dataset.orbitEnhanced =
                "true";


            /*
             * Create wrapper.
             */

            const container =
                document.createElement("span");

            container.className =
                "orbit-link-container";


            container.appendChild(link);

            container.appendChild(
                createOrbitLinkActions(url)
            );


            fragment.appendChild(
                container
            );


            lastIndex =
                start + match[0].length;
        }


        /*
         * No valid URL found.
         */

        if (lastIndex === 0) {
            return;
        }


        /*
         * Add remaining text.
         */

        if (
            lastIndex < text.length
        ) {

            fragment.appendChild(
                document.createTextNode(
                    text.slice(lastIndex)
                )
            );
        }


        /*
         * Replace original text node.
         */

        textNode.parentNode.replaceChild(
            fragment,
            textNode
        );

    });
}


/* ===========================================================
   CLEAN STRAY MARKDOWN
   =========================================================== */

function cleanOrbitMarkdown(root) {

    if (!root) return;

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

        /*
         * NEVER clean inside:
         * - code
         * - links
         * - buttons
         * - generated Orbit controls
         */

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


        /*
         * Remove completely isolated
         * Markdown emphasis markers.
         */

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


        /*
         * Remove stray emphasis markers
         * surrounding ordinary words.
         */

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


/* ===========================================================
   ENHANCE RESPONSE
   =========================================================== */

function enhanceOrbitResponse(messageElement) {

    if (!messageElement) {
        return;
    }


    /*
     * IMPORTANT ORDER
     *
     * 1. Code blocks
     * 2. Existing links
     * 3. Raw URLs
     * 4. Markdown cleanup
     *
     * Each function ignores elements
     * already processed by the previous one.
     */

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


/* ===========================================================
   OBSERVE ORBIT CHAT
   =========================================================== */

function initializeOrbitResponseTools() {

    const chatWindow =
        document.getElementById(
            "chat-window"
        );

    if (!chatWindow) {
        return;
    }


    /*
     * Process existing Orbit messages.
     */

    chatWindow
        .querySelectorAll(
            ".message.orbit"
        )
        .forEach(message => {

            enhanceOrbitResponse(
                message
            );

        });


    /*
     * Watch for newly-created messages.
     */

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


                                /*
                                 * Direct Orbit message.
                                 */

                                if (
                                    node.matches &&
                                    node.matches(
                                        ".message.orbit"
                                    )
                                ) {

                                    enhanceOrbitResponse(
                                        node
                                    );

                                    return;
                                }


                                /*
                                 * Orbit message nested
                                 * inside another element.
                                 */

                                if (
                                    node.querySelectorAll
                                ) {

                                    node
                                        .querySelectorAll(
                                            ".message.orbit"
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


/* ===========================================================
   START
   =========================================================== */

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


/* ===========================================================
   PUBLIC API
   =========================================================== */

window.OrbitResponseTools = {

    enhance:
        enhanceOrbitResponse,

    copy:
        orbitSmartCopy,

    enhanceLinks:
        enhanceOrbitLinks,

    enhanceCode:
        enhanceOrbitCodeBlocks

};
