/* =========================================================
   ORBIT AI — ASSISTANT
   ========================================================= */

/* =========================================================
   ELEMENTS
   ========================================================= */

const chatWindow = document.getElementById("chat-window");
const commandInput = document.getElementById("command-input");
const sendBtn = document.getElementById("send-btn");

const clearChatBtn = document.getElementById("clear-chat-btn");
const newChatBtn = document.getElementById("new-chat-btn");

const responseTime = document.getElementById("response-time");

const quickActions =
    document.querySelectorAll(".quick-action");


/* =========================================================
   API
   ========================================================= */

const API_URL =
    window.ORBIT_API_URL ||
    "https://orbit-ai-v1-0.onrender.com/api/chat";


/* =========================================================
   STATE
   ========================================================= */

let conversationHistory = [];
let isWaitingForResponse = false;


/* =========================================================
   WELCOME MESSAGE
   ========================================================= */

function renderWelcomeMessage() {

    if (!chatWindow) return;

    chatWindow.innerHTML = `
        <div class="chat-message assistant-message">

            <div class="message-avatar">
                <i class="fa-solid fa-atom"></i>
            </div>

            <div class="message-content">

                <span class="message-name">
                    ORBIT
                </span>

                <div class="message-bubble">

                    <p>
                        Hello. I'm Orbit, your AI assistant.
                    </p>

                    <p>
                        I can help you plan projects,
                        answer questions, write content,
                        organize ideas and more.
                    </p>

                </div>

            </div>

        </div>
    `;

}


/* =========================================================
   ADD MESSAGE
   ========================================================= */

function addMessageToUI(role, message, shouldScroll = true) {

    if (!chatWindow) return;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        `chat-message ${role}-message`;


    /* AVATAR */

    const avatar =
        document.createElement("div");

    avatar.className =
        "message-avatar";


    const icon =
        document.createElement("i");

    icon.className =
        role === "assistant"
            ? "fa-solid fa-atom"
            : "fa-solid fa-user";


    avatar.appendChild(icon);


    /* CONTENT */

    const content =
        document.createElement("div");

    content.className =
        "message-content";


    /* NAME */

    const name =
        document.createElement("span");

    name.className =
        "message-name";

    name.textContent =
        role === "assistant"
            ? "ORBIT"
            : "YOU";


    /* MESSAGE */

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";


    const paragraph =
        document.createElement("p");

    paragraph.textContent =
        message;


    bubble.appendChild(paragraph);

    content.appendChild(name);
    content.appendChild(bubble);

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    chatWindow.appendChild(wrapper);


    if (shouldScroll) {
        scrollChatToBottom();
    }

}


/* =========================================================
   TYPING INDICATOR
   ========================================================= */

function showTypingIndicator() {

    removeTypingIndicator();

    if (!chatWindow) return;

    const typing =
        document.createElement("div");

    typing.id =
        "orbit-typing";

    typing.className =
        "chat-message assistant-message";


    typing.innerHTML = `
        <div class="message-avatar">
            <i class="fa-solid fa-atom"></i>
        </div>

        <div class="message-content">

            <span class="message-name">
                ORBIT
            </span>

            <div class="message-bubble typing-bubble">

                <span></span>
                <span></span>
                <span></span>

            </div>

        </div>
    `;


    chatWindow.appendChild(typing);

    scrollChatToBottom();

}


/* =========================================================
   REMOVE TYPING INDICATOR
   ========================================================= */

function removeTypingIndicator() {

    const typing =
        document.getElementById("orbit-typing");

    if (typing) {
        typing.remove();
    }

}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollChatToBottom() {

    if (!chatWindow) return;

    requestAnimationFrame(() => {

        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior: "smooth"
        });

    });

}


/* =========================================================
   LOCAL COMMANDS
   ========================================================= */

function handleLocalCommand(input) {

    const command =
        input.trim().toLowerCase();


    /* CLEAR */

    if (command === "/clear") {

        clearConversation();

        return true;

    }


    /* NEW */

    if (command === "/new") {

        clearConversation();

        return true;

    }


    /* HELP */

    if (command === "/help") {

        addMessageToUI(
            "assistant",
            `Available Orbit commands:

/help — Show available commands
/clear — Clear conversation
/new — Start a new conversation
/time — Show current time
/date — Show today's date
/status — Show Orbit status

You can also simply ask me anything.`
        );

        return true;

    }


    /* TIME */

    if (command === "/time") {

        addMessageToUI(
            "assistant",
            `The current time is ${new Date().toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )}.`
        );

        return true;

    }


    /* DATE */

    if (command === "/date") {

        addMessageToUI(
            "assistant",
            `Today is ${new Date().toLocaleDateString(
                [],
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            )}.`
        );

        return true;

    }


    /* STATUS */

    if (command === "/status") {

        addMessageToUI(
            "assistant",
            `ORBIT SYSTEM STATUS

Status: Online
Assistant: Active
Connection: Connected
AI Engine: Ready`
        );

        return true;

    }


    /* UNKNOWN */

    if (command.startsWith("/")) {

        addMessageToUI(
            "assistant",
            `I don't recognize "${input}". Type /help to see the available commands.`
        );

        return true;

    }


    return false;

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage(message = null) {

    if (isWaitingForResponse) {
        return;
    }


    if (!commandInput) {
        return;
    }


    /* GET MESSAGE */

    const text =
        message !== null
            ? message.trim()
            : commandInput.value.trim();


    if (!text) {
        return;
    }


    /* CLEAR INPUT */

    commandInput.value = "";

    autoResizeTextarea();


    /* LOCAL COMMAND */

    if (handleLocalCommand(text)) {
        return;
    }


    /* SHOW USER MESSAGE */

    addMessageToUI(
        "user",
        text
    );


    /* SAVE TO CURRENT SESSION */

    conversationHistory.push({
        role: "user",
        content: text
    });


    /* WAITING */

    isWaitingForResponse = true;

    commandInput.disabled = true;

    if (sendBtn) {
        sendBtn.disabled = true;
    }


    showTypingIndicator();


    const startTime =
        performance.now();


    /* =====================================================
       SEND TO BACKEND
       ===================================================== */

    try {

        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    message: text,

                    history:
                        conversationHistory

                })

            });


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        removeTypingIndicator();


        /* GET AI RESPONSE */

        const reply =
            data.reply ||
            data.response ||
            data.message;


        if (!reply) {

            throw new Error(
                "Orbit returned an empty response."
            );

        }


        /* SHOW AI RESPONSE */

        addMessageToUI(
            "assistant",
            reply
        );


        /* ADD TO CURRENT CONVERSATION */

        conversationHistory.push({

            role: "assistant",

            content: reply

        });


        /* RESPONSE TIME */

        const elapsed =
            performance.now() - startTime;


        if (responseTime) {

            responseTime.textContent =
                `${(elapsed / 1000).toFixed(1)}s`;

        }


    } catch (error) {

        console.error(
            "Orbit AI error:",
            error
        );


        removeTypingIndicator();


        addMessageToUI(
            "assistant",
            "I couldn't connect to my AI service right now. Please check your connection and try again."
        );


        if (responseTime) {

            responseTime.textContent =
                "Error";

        }

    } finally {

        isWaitingForResponse = false;

        commandInput.disabled = false;

        if (sendBtn) {
            sendBtn.disabled = false;
        }

        commandInput.focus();

    }

}


/* =========================================================
   QUICK ACTIONS
   ========================================================= */

function setupQuickActions() {

    quickActions.forEach(button => {

        button.addEventListener("click", async () => {

            const command =
                button.dataset.command?.trim();


            if (!command) {

                console.warn(
                    "Orbit quick action has no data-command."
                );

                return;

            }


            if (isWaitingForResponse) {
                return;
            }


            /*
             * IMPORTANT:
             *
             * We send the quick action directly
             * to Orbit.
             *
             * It does NOT get placed inside
             * the textarea first.
             */

            await sendMessage(command);

        });

    });

}


/* =========================================================
   CLEAR CONVERSATION
   ========================================================= */

function clearConversation() {

    if (isWaitingForResponse) {
        return;
    }


    conversationHistory = [];


    renderWelcomeMessage();


    if (responseTime) {

        responseTime.textContent =
            "Ready";

    }

}


/* =========================================================
   NEW CHAT
   ========================================================= */

function startNewChat() {

    clearConversation();


    if (commandInput) {

        commandInput.value = "";

        autoResizeTextarea();

        commandInput.focus();

    }

}


/* =========================================================
   TEXTAREA
   ========================================================= */

function autoResizeTextarea() {

    if (!commandInput) {
        return;
    }


    commandInput.style.height =
        "auto";


    commandInput.style.height =
        `${Math.min(
            commandInput.scrollHeight,
            140
        )}px`;

}


/* =========================================================
   KEYBOARD
   ========================================================= */

function setupKeyboard() {

    if (!commandInput) {
        return;
    }


    commandInput.addEventListener(
        "input",
        autoResizeTextarea
    );


    commandInput.addEventListener(
        "keydown",
        event => {

            /*
             * Enter = Send
             *
             * Shift + Enter = New line
             */

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


/* =========================================================
   BUTTONS
   ========================================================= */

function setupButtons() {


    /* SEND */

    sendBtn?.addEventListener(
        "click",
        () => sendMessage()
    );


    /* CLEAR */

    clearChatBtn?.addEventListener(
        "click",
        clearConversation
    );


    /* NEW CHAT */

    newChatBtn?.addEventListener(
        "click",
        startNewChat
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeAssistant() {

    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT load
     * anything from localStorage.
     *
     * Every page refresh starts with
     * a completely fresh conversation.
     */

    conversationHistory = [];


    renderWelcomeMessage();


    setupButtons();

    setupQuickActions();

    setupKeyboard();

    autoResizeTextarea();


    if (responseTime) {

        responseTime.textContent =
            "Ready";

    }


    if (commandInput) {

        commandInput.focus();

    }

}


/* =========================================================
   START ORBIT
   ========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAssistant
    );

} else {

    initializeAssistant();

}