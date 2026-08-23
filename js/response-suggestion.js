/* =========================================================
   ORBIT AI — RESPONSE QUICK SUGGESTIONS

   Purpose:
   - Adds professional follow-up suggestions
   - Appears after Orbit AI responses
   - Sends suggestions through OrbitAI
   - Prevents duplicate suggestion rows
   - Removes old suggestions when a new message is sent

   This file does NOT handle:
   - AI/API requests
   - Message rendering
   - Code blocks
   - Links
   - Markdown
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const ORBIT_QUICK_SUGGESTIONS = [
    {
        label: "Explain more",
        prompt: "Can you explain that in more detail?"
    },

    {
        label: "Give an example",
        prompt: "Can you give me a simple example?"
    },

    {
        label: "Make it simpler",
        prompt: "Can you explain that in a simpler way?"
    }
];


/* =========================================================
   GET CHAT WINDOW
   ========================================================= */

function getOrbitChatWindow() {

    return document.getElementById(
        "chat-window"
    );

}


/* =========================================================
   REMOVE EXISTING SUGGESTIONS
   ========================================================= */

function removeOrbitQuickSuggestions() {

    const chatWindow =
        getOrbitChatWindow();

    if (!chatWindow) {
        return;
    }


    chatWindow
        .querySelectorAll(
            ".orbit-quick-suggestions"
        )
        .forEach(element => {

            element.remove();

        });

}


/* =========================================================
   CREATE SUGGESTION BUTTON
   ========================================================= */

function createOrbitSuggestionButton(
    suggestion
) {

    const button =
        document.createElement("button");


    button.type =
        "button";


    button.className =
        "orbit-quick-suggestion";


    button.textContent =
        suggestion.label;


    button.dataset.prompt =
        suggestion.prompt;


    button.setAttribute(
        "aria-label",
        suggestion.label
    );


    /* -----------------------------------------------------
       SEND SUGGESTION
       ----------------------------------------------------- */

    button.addEventListener(
        "click",
        () => {

            sendOrbitSuggestion(
                suggestion.prompt
            );

        }
    );


    return button;

}


/* =========================================================
   CREATE SUGGESTION ROW
   ========================================================= */

function createOrbitQuickSuggestions(
    message
) {

    if (!message) {
        return;
    }


    /* -----------------------------------------------------
       Prevent duplicates
       ----------------------------------------------------- */

    if (
        message.nextElementSibling &&
        message.nextElementSibling.classList.contains(
            "orbit-quick-suggestions"
        )
    ) {

        return;

    }


    /* -----------------------------------------------------
       Remove suggestions belonging to
       an older response
       ----------------------------------------------------- */

    removeOrbitQuickSuggestions();


    /* -----------------------------------------------------
       Create container
       ----------------------------------------------------- */

    const container =
        document.createElement("div");


    container.className =
        "orbit-quick-suggestions";


    container.setAttribute(
        "role",
        "group"
    );


    container.setAttribute(
        "aria-label",
        "Suggested follow-up questions"
    );


    /* -----------------------------------------------------
       Create buttons
       ----------------------------------------------------- */

    ORBIT_QUICK_SUGGESTIONS.forEach(
        suggestion => {

            const button =
                createOrbitSuggestionButton(
                    suggestion
                );


            container.appendChild(
                button
            );

        }
    );


    /* -----------------------------------------------------
       Place directly after Orbit response
       ----------------------------------------------------- */

    message.insertAdjacentElement(
        "afterend",
        container
    );

}


/* =========================================================
   SEND SUGGESTION
   ========================================================= */

function sendOrbitSuggestion(
    prompt
) {

    const cleanPrompt =
        String(prompt || "").trim();


    if (!cleanPrompt) {
        return;
    }


    /* -----------------------------------------------------
       Remove suggestions immediately
       ----------------------------------------------------- */

    removeOrbitQuickSuggestions();


    /* -----------------------------------------------------
       Get input
       ----------------------------------------------------- */

    const input =
        document.getElementById(
            "command-input"
        );


    /* -----------------------------------------------------
       Put suggestion into input
       ----------------------------------------------------- */

    if (input) {

        input.value =
            cleanPrompt;


        input.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true
                }
            )
        );

    }


    /* -----------------------------------------------------
       Send through Orbit AI
       ----------------------------------------------------- */

    if (
        window.OrbitAI &&
        typeof window.OrbitAI.sendMessage ===
        "function"
    ) {

        window.OrbitAI.sendMessage(
            cleanPrompt
        );

    }

    else {

        console.warn(
            "Orbit AI engine is not available yet."
        );

    }

}


/* =========================================================
   FIND LATEST ORBIT RESPONSE
   ========================================================= */

function getLatestOrbitMessage() {

    const chatWindow =
        getOrbitChatWindow();


    if (!chatWindow) {
        return null;
    }


    const messages =
        chatWindow.querySelectorAll(
            ".message.orbit"
        );


    if (!messages.length) {
        return null;
    }


    return messages[
        messages.length - 1
    ];

}


/* =========================================================
   ADD SUGGESTIONS TO LATEST RESPONSE
   ========================================================= */

function addSuggestionsToLatestResponse() {

    const latestMessage =
        getLatestOrbitMessage();


    if (!latestMessage) {
        return;
    }


    createOrbitQuickSuggestions(
        latestMessage
    );

}


/* =========================================================
   CHAT OBSERVER
   ========================================================= */

function initializeOrbitQuickSuggestions() {

    const chatWindow =
        getOrbitChatWindow();


    if (!chatWindow) {
        return;
    }


    /* -----------------------------------------------------
       Watch for new Orbit responses
       ----------------------------------------------------- */

    const observer =
        new MutationObserver(
            mutations => {

                let orbitMessageAdded =
                    false;


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


                                /* ---------------------------------
                                   Direct Orbit message
                                   --------------------------------- */

                                if (
                                    node.matches &&
                                    node.matches(
                                        ".message.orbit"
                                    )
                                ) {

                                    orbitMessageAdded =
                                        true;

                                }


                                /* ---------------------------------
                                   Orbit message nested inside
                                   another element
                                   --------------------------------- */

                                if (
                                    node.querySelector &&
                                    node.querySelector(
                                        ".message.orbit"
                                    )
                                ) {

                                    orbitMessageAdded =
                                        true;

                                }

                            });

                    }
                );


                if (!orbitMessageAdded) {
                    return;
                }


                /* ------------------------------------------------
                   Wait until Orbit has finished inserting
                   the response into the DOM.
                   ------------------------------------------------ */

                requestAnimationFrame(
                    () => {

                        addSuggestionsToLatestResponse();

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


    /* -----------------------------------------------------
       Handle responses that already exist
       ----------------------------------------------------- */

    addSuggestionsToLatestResponse();

}


/* =========================================================
   INTERCEPT ORBIT SEND MESSAGE
   =========================================================

   Whenever a new message is sent:

   → Remove previous suggestions
   → Let Orbit handle the message normally
   ========================================================= */

function setupOrbitQuickSuggestionSend() {

    let attempts = 0;

    const maxAttempts = 30;


    function attach() {

        if (
            !window.OrbitAI ||
            typeof window.OrbitAI.sendMessage !==
            "function"
        ) {

            attempts++;


            if (
                attempts <
                maxAttempts
            ) {

                setTimeout(
                    attach,
                    200
                );

            }


            return;

        }


        /* -------------------------------------------------
           Prevent wrapping more than once
           ------------------------------------------------- */

        if (
            window.OrbitAI
                .__quickSuggestionsWrapped
        ) {

            return;

        }


        const originalSendMessage =
            window.OrbitAI.sendMessage;


        window.OrbitAI.sendMessage =
            function (...args) {

                removeOrbitQuickSuggestions();


                return originalSendMessage.apply(
                    this,
                    args
                );

            };


        window.OrbitAI
            .__quickSuggestionsWrapped =
            true;

    }


    attach();

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.OrbitQuickSuggestions = {

    add:
        addSuggestionsToLatestResponse,

    remove:
        removeOrbitQuickSuggestions,

    send:
        sendOrbitSuggestion,

    reset:
        removeOrbitQuickSuggestions

};


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeOrbitQuickReplySystem() {

    initializeOrbitQuickSuggestions();

    setupOrbitQuickSuggestionSend();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitQuickReplySystem
    );

}

else {

    initializeOrbitQuickReplySystem();

}