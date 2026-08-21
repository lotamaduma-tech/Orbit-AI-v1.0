/* =========================================================
   ORBIT AI — ASSISTANT CONTROLLER
   =========================================================

   IMPORTANT:

   orbit.js = SHARED AI ENGINE
   assistant.js = ASSISTANT FEATURES

   assistant.js handles:
   - Quick commands
   - Quick action buttons
   - Assistant-specific controls
   - Local commands
   - Clean input behavior

   Normal AI messages are sent through:

       OrbitAI.sendMessage()

   This prevents index.html and assistant.html
   from having separate AI systems.
   ========================================================= */

"use strict";


/* =========================================================
   ELEMENTS
   ========================================================= */

const assistantInput =
    document.getElementById("command-input");

const assistantSendButton =
    document.getElementById("send-btn");

const assistantClearButton =
    document.getElementById("clear-chat-btn");

const assistantNewChatButton =
    document.getElementById("new-chat-btn");

const assistantResponseTime =
    document.getElementById("response-time");

const assistantQuickActions =
    document.querySelectorAll(".quick-action");


/* =========================================================
   QUICK COMMANDS
   ========================================================= */

const ORBIT_COMMANDS = {

    "/help": () => {

        OrbitAI.sendMessage(
            "Available commands:\n\n" +
            "/help — Show available commands\n" +
            "/clear — Clear the current conversation\n" +
            "/new — Start a new conversation\n" +
            "/time — Show the current time\n" +
            "/date — Show today's date\n" +
            "/status — Show Orbit system status\n\n" +
            "You can also simply ask Orbit anything."
        );

    },


    "/time": () => {

        const time =
            new Date().toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        showLocalResponse(
            `The current time is ${time}.`
        );

    },


    "/date": () => {

        const date =
            new Date().toLocaleDateString(
                [],
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

        showLocalResponse(
            `Today is ${date}.`
        );

    },


    "/status": () => {

        showLocalResponse(
            `ORBIT SYSTEM STATUS

Status: Online
Assistant: Active
AI Engine: Connected
Backend: Render
Connection: Ready`
        );

    },


    "/clear": () => {

        OrbitAI.clearConversation();

    },


    "/new": () => {

        OrbitAI.newChat();

    }

};


/* =========================================================
   LOCAL RESPONSE
   =========================================================

   Used for commands that don't need the AI backend.
   ========================================================= */

function showLocalResponse(message) {

    if (
        typeof addOrbitMessage ===
        "function"
    ) {

        addOrbitMessage(
            message,
            "orbit"
        );

    }
    else {

        console.warn(
            "Orbit message renderer is unavailable."
        );

    }


    if (assistantResponseTime) {

        assistantResponseTime.textContent =
            "Ready";

    }

}


/* =========================================================
   NORMALIZE COMMAND
   ========================================================= */

function normalizeCommand(value) {

    return String(value || "")
        .trim()
        .toLowerCase();

}


/* =========================================================
   CHECK LOCAL COMMAND
   ========================================================= */

function isOrbitCommand(value) {

    const command =
        normalizeCommand(value);

    return Boolean(
        ORBIT_COMMANDS[command]
    );

}


/* =========================================================
   EXECUTE LOCAL COMMAND
   ========================================================= */

function executeOrbitCommand(value) {

    const command =
        normalizeCommand(value);

    const handler =
        ORBIT_COMMANDS[command];

    if (!handler) {

        return false;

    }

    if (assistantInput) {

        assistantInput.value = "";

        assistantInput.style.height =
            "auto";

    }

    handler();

    return true;

}


/* =========================================================
   UNKNOWN COMMAND
   ========================================================= */

function handleUnknownCommand(value) {

    const command =
        String(value || "").trim();

    if (!command.startsWith("/")) {

        return false;

    }

    showLocalResponse(
        `I don't recognize "${command}".

Type /help to see the available Orbit commands.`
    );

    if (assistantInput) {

        assistantInput.value = "";

        assistantInput.style.height =
            "auto";

    }

    return true;

}


/* =========================================================
   PREPARE AI INPUT
   ========================================================= */

function setupAssistantInput() {

    if (!assistantInput) {

        return;

    }


    /* Clean placeholder */

    assistantInput.setAttribute(
        "placeholder",
        "Ask Orbit anything..."
    );


    /* Accessibility */

    assistantInput.setAttribute(
        "aria-label",
        "Ask Orbit AI"
    );


    /* Prevent browser spellcheck
       from making the interface feel messy */

    assistantInput.setAttribute(
        "spellcheck",
        "true"
    );


    /* Clean textarea behavior */

    assistantInput.addEventListener(
        "input",
        () => {

            assistantInput.style.height =
                "auto";

            assistantInput.style.height =
                `${Math.min(
                    assistantInput.scrollHeight,
                    140
                )}px`;

        }
    );

}


/* =========================================================
   INTERCEPT LOCAL COMMANDS
   =========================================================

   orbit.js already handles normal Enter-to-send.

   We only intercept commands such as:

       /help
       /time
       /date
       /status
       /clear
       /new

   Capture mode ensures our command handler runs
   before orbit.js sends the message to the backend.
   ========================================================= */

function setupCommandInterceptor() {

    if (!assistantInput) {

        return;

    }


    assistantInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Enter" ||
                event.shiftKey
            ) {

                return;

            }


            const value =
                assistantInput.value.trim();


            if (!value) {

                return;

            }


            /* Known local command */

            if (
                isOrbitCommand(value)
            ) {

                event.preventDefault();

                event.stopImmediatePropagation();

                executeOrbitCommand(value);

                return;

            }


            /* Unknown slash command */

            if (
                value.startsWith("/")
            ) {

                event.preventDefault();

                event.stopImmediatePropagation();

                handleUnknownCommand(value);

            }

        },
        true
    );

}


/* =========================================================
   SEND BUTTON COMMAND INTERCEPTOR
   =========================================================

   Normal messages are still handled by orbit.js.

   Slash commands are handled here.
   ========================================================= */

function setupSendCommandInterceptor() {

    if (!assistantSendButton) {

        return;

    }


    assistantSendButton.addEventListener(
        "click",
        event => {

            if (!assistantInput) {

                return;

            }


            const value =
                assistantInput.value.trim();


            if (!value) {

                return;

            }


            if (
                isOrbitCommand(value)
            ) {

                event.preventDefault();

                event.stopImmediatePropagation();

                executeOrbitCommand(value);

                return;

            }


            if (
                value.startsWith("/")
            ) {

                event.preventDefault();

                event.stopImmediatePropagation();

                handleUnknownCommand(value);

            }

        },
        true
    );

}


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function setupQuickActions() {

    assistantQuickActions.forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    if (
                        typeof OrbitAI ===
                        "undefined"
                    ) {

                        console.error(
                            "OrbitAI engine is not available."
                        );

                        return;

                    }


                    const command =
                        button.dataset.command?.trim();


                    if (!command) {

                        console.warn(
                            "Orbit quick action has no data-command."
                        );

                        return;

                    }


                    /*

                       If the quick action is a local
                       command, handle it here.

                    */

                    if (
                        isOrbitCommand(command)
                    ) {

                        executeOrbitCommand(
                            command
                        );

                        return;

                    }


                    /*

                       Otherwise send it to the
                       shared AI engine.

                    */

                    await OrbitAI.sendMessage(
                        command
                    );

                }
            );

        }
    );

}


/* =========================================================
   CLEAR BUTTON
   ========================================================= */

function setupClearButton() {

    if (!assistantClearButton) {

        return;

    }


    assistantClearButton.addEventListener(
        "click",
        () => {

            if (
                typeof OrbitAI ===
                "undefined"
            ) {

                return;

            }


            OrbitAI.clearConversation();


            if (assistantInput) {

                assistantInput.value = "";

                assistantInput.style.height =
                    "auto";

            }

        }
    );

}


/* =========================================================
   NEW CHAT BUTTON
   ========================================================= */

function setupNewChatButton() {

    if (!assistantNewChatButton) {

        return;

    }


    assistantNewChatButton.addEventListener(
        "click",
        () => {

            if (
                typeof OrbitAI ===
                "undefined"
            ) {

                return;

            }


            OrbitAI.newChat();


            if (assistantInput) {

                assistantInput.value = "";

                assistantInput.style.height =
                    "auto";

                assistantInput.focus();

            }

        }
    );

}


/* =========================================================
   INITIALIZE ASSISTANT
   ========================================================= */

function initializeAssistant() {

    /*
     * orbit.js MUST already be loaded.
     */

    if (
        typeof OrbitAI ===
        "undefined"
    ) {

        console.error(
            "OrbitAI engine not found. " +
            "Make sure orbit.js is loaded before assistant.js."
        );

        return;

    }


    setupAssistantInput();

    setupCommandInterceptor();

    setupSendCommandInterceptor();

    setupQuickActions();

    setupClearButton();

    setupNewChatButton();


    if (assistantResponseTime) {

        assistantResponseTime.textContent =
            "Ready";

    }

}


/* =========================================================
   START ASSISTANT
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAssistant
    );

}
else {

    initializeAssistant();

}
