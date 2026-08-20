/* =========================================================
   ORBIT AI — ASSISTANT PAGE
   Same AI engine used by the Dashboard
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

const quickActions = document.querySelectorAll(".quick-action");


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "orbit_assistant_history";


/* =========================================================
   API
   =========================================================
   
   IMPORTANT:
   config.js controls the actual backend URL.

   Example:

   window.ORBIT_API_URL =
       "https://your-orbit-backend.onrender.com/api/chat";

   ========================================================= */

const API_URL =
    window.ORBIT_API_URL || "/api/chat";


/* =========================================================
   STATE
   ========================================================= */

let conversationHistory = [];

let isWaitingForResponse = false;


/* =========================================================
   SAVE CONVERSATION
   ========================================================= */

function saveConversation() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversationHistory)
        );

    } catch (error) {

        console.error(
            "Orbit could not save conversation:",
            error
        );

    }

}


/* =========================================================
   LOAD CONVERSATION
   ========================================================= */

function loadConversation() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            conversationHistory = [];

            renderWelcomeMessage();

            return;
        }


        const parsed =
            JSON.parse(saved);


        if (!Array.isArray(parsed)) {

            conversationHistory = [];

            renderWelcomeMessage();

            return;
        }


        conversationHistory = parsed;

        renderConversation();


    } catch (error) {

        console.error(
            "Orbit could not load conversation:",
            error
        );

        conversationHistory = [];

        renderWelcomeMessage();

    }

}


/* =========================================================
   RENDER CONVERSATION
   ========================================================= */

function renderConversation() {

    if (!chatWindow) {
        return;
    }


    chatWindow.innerHTML = "";


    if (conversationHistory.length === 0) {

        renderWelcomeMessage();

        return;
    }


    conversationHistory.forEach(message => {

        if (
            message.role !== "user" &&
            message.role !== "assistant"
        ) {
            return;
        }


        addMessageToUI(
            message.role,
            message.content,
            false
        );

    });


    scrollChatToBottom();

}


/* =========================================================
   WELCOME MESSAGE
   ========================================================= */

function renderWelcomeMessage() {

    if (!chatWindow) {
        return;
    }


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
   ADD MESSAGE TO UI
   ========================================================= */

function addMessageToUI(
    role,
    message,
    shouldScroll = true
) {

    if (!chatWindow) {
        return;
    }


    const wrapper =
        document.createElement("div");

    wrapper.className =
        `chat-message ${role}-message`;


    /* =====================================================
       AVATAR
       ===================================================== */

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


    /* =====================================================
       CONTENT
       ===================================================== */

    const content =
        document.createElement("div");

    content.className =
        "message-content";


    /* =====================================================
       NAME
       ===================================================== */

    const name =
        document.createElement("span");

    name.className =
        "message-name";


    name.textContent =
        role === "assistant"
            ? "ORBIT"
            : "YOU";


    /* =====================================================
       MESSAGE BUBBLE
       ===================================================== */

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


    if (!chatWindow) {
        return;
    }


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
   SCROLL CHAT
   ========================================================= */

function scrollChatToBottom() {

    if (!chatWindow) {
        return;
    }


    requestAnimationFrame(() => {

        chatWindow.scrollTo({

            top: chatWindow.scrollHeight,

            behavior: "smooth"

        });

    });

}


/* =========================================================
   LOCAL ORBIT COMMANDS
   ========================================================= */

const orbitCommands = {


    /* =====================================================
       HELP
       ===================================================== */

    "/help": () => {

        return `

Available Orbit commands:

/help — Show available commands

/clear — Clear the current conversation

/new — Start a new conversation

/time — Show the current time

/date — Show today's date

/status — Show Orbit system status

You can also simply ask Orbit questions normally.

        `.trim();

    },


    /* =====================================================
       TIME
       ===================================================== */

    "/time": () => {

        return `The current time is ${new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )}.`;

    },


    /* =====================================================
       DATE
       ===================================================== */

    "/date": () => {

        return `Today is ${new Date().toLocaleDateString(
            [],
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        )}.`;

    },


    /* =====================================================
       STATUS
       ===================================================== */

    "/status": () => {

        return `

ORBIT SYSTEM STATUS

Status: Online

Assistant: Ready

Connection: Connected

Chat Engine: Active

        `.trim();

    }

};


/* =========================================================
   HANDLE LOCAL COMMAND
   ========================================================= */

function handleLocalCommand(input) {

    const command =
        input.trim().toLowerCase();


    /* =====================================================
       CLEAR
       ===================================================== */

    if (command === "/clear") {

        clearConversation();

        return true;

    }


    /* =====================================================
       NEW CHAT
       ===================================================== */

    if (command === "/new") {

        startNewChat();

        return true;

    }


    /* =====================================================
       NORMAL LOCAL COMMAND
       ===================================================== */

    if (orbitCommands[command]) {

        const reply =
            orbitCommands[command]();


        addMessageToUI(
            "assistant",
            reply
        );


        return true;

    }


    /* =====================================================
       UNKNOWN SLASH COMMAND
       ===================================================== */

    if (command.startsWith("/")) {

        addMessageToUI(
            "assistant",
            `I don't recognize "${input}". Type /help to see the commands I understand.`
        );


        return true;

    }


    return false;

}


/* =========================================================
   SEND MESSAGE TO ORBIT
   =========================================================

   IMPORTANT:

   This function accepts a message parameter.

   That means BOTH of these work:

       sendMessage()

   and:

       sendMessage("Help me plan my day.")

   The second one is what makes the quick actions
   automatically talk to Orbit.
   ========================================================= */

async function sendMessage(message = null) {

    if (isWaitingForResponse) {
        return;
    }


    /* =====================================================
       GET MESSAGE
       ===================================================== */

    const text =
        message !== null
            ? String(message).trim()
            : commandInput?.value.trim();


    if (!text) {
        return;
    }


    /* =====================================================
       CLEAR INPUT
       ===================================================== */

    if (commandInput) {

        commandInput.value = "";

        autoResizeTextarea();

    }


    /* =====================================================
       CHECK LOCAL COMMAND
       ===================================================== */

    if (handleLocalCommand(text)) {

        return;

    }


    /* =====================================================
       DISPLAY USER MESSAGE
       ===================================================== */

    addMessageToUI(
        "user",
        text
    );


    /* =====================================================
       SAVE USER MESSAGE
       ===================================================== */

    conversationHistory.push({

        role: "user",

        content: text

    });


    saveConversation();


    /* =====================================================
       LOADING STATE
       ===================================================== */

    isWaitingForResponse = true;


    if (commandInput) {

        commandInput.disabled = true;

    }


    if (sendBtn) {

        sendBtn.disabled = true;

    }


    showTypingIndicator();


    const startTime =
        performance.now();


    /* =====================================================
       SEND TO SAME BACKEND AS DASHBOARD
       ===================================================== */

    try {

        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    message: text,

                    history:
                        conversationHistory

                })

            });


        /* =================================================
           SERVER ERROR
           ================================================= */

        if (!response.ok) {

            throw new Error(
                `Server error: ${response.status}`
            );

        }


        /* =================================================
           READ RESPONSE
           ================================================= */

        const data =
            await response.json();


        removeTypingIndicator();


        /* =================================================
           FIND AI RESPONSE
           ================================================= */

        const reply =
            data.reply ||
            data.response ||
            data.message;


        if (!reply) {

            throw new Error(
                "Orbit backend returned an empty response."
            );

        }


        /* =================================================
           DISPLAY AI RESPONSE
           ================================================= */

        addMessageToUI(
            "assistant",
            reply
        );


        /* =================================================
           SAVE AI RESPONSE
           ================================================= */

        conversationHistory.push({

            role: "assistant",

            content: reply

        });


        saveConversation();


        /* =================================================
           RESPONSE TIME
           ================================================= */

        const elapsed =
            performance.now() - startTime;


        if (responseTime) {

            responseTime.textContent =
                `${(elapsed / 1000).toFixed(1)}s`;

        }


    } catch (error) {

        console.error(
            "Orbit AI request failed:",
            error
        );


        removeTypingIndicator();


        addMessageToUI(
            "assistant",
            "I couldn't connect to Orbit AI right now. Please check your internet connection or Orbit backend."
        );


        if (responseTime) {

            responseTime.textContent =
                "Error";

        }

    } finally {

        isWaitingForResponse = false;


        if (commandInput) {

            commandInput.disabled = false;

            commandInput.focus();

        }


        if (sendBtn) {

            sendBtn.disabled = false;

        }

    }

}


/* =========================================================
   QUICK ACTIONS
   =========================================================

   THIS IS THE IMPORTANT PART.

   The button's data-command is sent DIRECTLY to
   sendMessage().

   It does NOT put the command into the textarea first.

   Example:

   Plan my day
        ↓
   "Help me plan my day."
        ↓
   sendMessage(...)
        ↓
   /api/chat
        ↓
   Orbit AI
        ↓
   response appears in chat
   ========================================================= */

function setupQuickActions() {

    if (!quickActions.length) {

        console.warn(
            "Orbit: No quick action buttons were found."
        );

        return;

    }


    quickActions.forEach(button => {

        button.addEventListener("click", () => {

            const command =
                button.dataset.command?.trim();


            if (!command) {

                console.warn(
                    "Orbit quick action is missing data-command."
                );

                return;

            }


            if (isWaitingForResponse) {

                return;

            }


            /* =============================================
               SEND DIRECTLY TO ORBIT
               ============================================= */

            sendMessage(command);

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


    localStorage.removeItem(
        STORAGE_KEY
    );


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
   TEXTAREA AUTO RESIZE
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
               Enter = Send

               Shift + Enter = New line
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


    /* =====================================================
       SEND
       ===================================================== */

    sendBtn?.addEventListener(
        "click",
        () => sendMessage()
    );


    /* =====================================================
       CLEAR
       ===================================================== */

    clearChatBtn?.addEventListener(
        "click",
        clearConversation
    );


    /* =====================================================
       NEW CHAT
       ===================================================== */

    newChatBtn?.addEventListener(
        "click",
        startNewChat
    );

}


/* =========================================================
   INITIALIZE ASSISTANT
   ========================================================= */

function initializeAssistant() {

    console.log("Orbit Assistant initializing...");

    console.log(
        "Orbit API:",
        API_URL
    );


    loadConversation();

    setupButtons();

    setupQuickActions();

    setupKeyboard();

    autoResizeTextarea();


    if (commandInput) {

        commandInput.focus();

    }


    console.log(
        "Orbit Assistant ready."
    );

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