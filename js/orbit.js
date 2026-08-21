/* ===========================================================
   ORBIT AI — SHARED AI ENGINE
   ===========================================================
   Used by:
   - index.html
   - assistant.html

   Handles:
   - Live Render API
   - Conversation history
   - Persistent user memory
   - Automatic memory detection
   - AI response formatting
   - Typing indicator
   - Sending messages
   - Enter-to-send
   - Shared AI state

   IMPORTANT:
   Conversation history is NOT saved.
   User memory IS saved.
   =========================================================== */

"use strict";


/* ===========================================================
   CONFIGURATION
   =========================================================== */

const ORBIT_API_URL =
    window.ORBIT_API_URL ||
    "/api/chat";


/* ===========================================================
   STORAGE
   =========================================================== */

const ORBIT_MEMORY_KEY =
    "orbit-user-memory";


/* ===========================================================
   AI STATE
   =========================================================== */

let orbitConversationHistory = [];

let orbitUserMemory = [];

let orbitIsWaiting = false;


/* ===========================================================
   GET CURRENT PAGE ELEMENTS
   =========================================================== */

function getOrbitElements() {

    return {

        chatWindow:
            document.getElementById("chat-window"),

        commandInput:
            document.getElementById("command-input"),

        sendButton:
            document.getElementById("send-btn")

    };

}


/* ===========================================================
   LOAD USER MEMORY
   =========================================================== */

function loadOrbitMemory() {

    try {

        const saved =
            localStorage.getItem(
                ORBIT_MEMORY_KEY
            );

        if (!saved) {

            orbitUserMemory = [];

            return;

        }

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {

            orbitUserMemory = parsed;

        }

    }

    catch (error) {

        console.error(
            "Orbit memory could not be loaded:",
            error
        );

        orbitUserMemory = [];

    }

}


/* ===========================================================
   SAVE USER MEMORY
   =========================================================== */

function saveOrbitMemory() {

    try {

        localStorage.setItem(
            ORBIT_MEMORY_KEY,
            JSON.stringify(
                orbitUserMemory
            )
        );

    }

    catch (error) {

        console.error(
            "Orbit memory could not be saved:",
            error
        );

    }

}


/* ===========================================================
   REMEMBER USER DETAIL
   =========================================================== */

function rememberOrbitDetail(detail) {

    if (!detail) return;

    const cleanDetail =
        detail.trim();

    if (!cleanDetail) return;


    const exists =
        orbitUserMemory.some(
            item =>
                item.toLowerCase() ===
                cleanDetail.toLowerCase()
        );


    if (exists) return;


    orbitUserMemory.push(
        cleanDetail
    );


    /* Prevent unlimited memory */

    if (orbitUserMemory.length > 50) {

        orbitUserMemory =
            orbitUserMemory.slice(-50);

    }


    saveOrbitMemory();

}


/* ===========================================================
   AUTOMATIC MEMORY DETECTION
   =========================================================== */

function detectOrbitMemory(message) {

    if (!message) return;

    const text =
        message.trim();

    if (!text) return;


    /* =======================================================
       NAME
       ======================================================= */

    const nameMatch =
        text.match(
            /(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i
        );

    if (nameMatch) {

        rememberOrbitDetail(
            `The user's name is ${nameMatch[1].trim()}.`
        );

    }


    /* =======================================================
       AGE
       ======================================================= */

    const ageMatch =
        text.match(
            /(?:i am|i'm|im)\s+(\d{1,3})(?:\s+years?\s+old)?/i
        );

    if (ageMatch) {

        rememberOrbitDetail(
            `The user is ${ageMatch[1]} years old.`
        );

    }


    /* =======================================================
       SCHOOL
       ======================================================= */

    const schoolMatch =
        text.match(
            /(?:i study at|i attend|my school is|i go to)\s+(.+)/i
        );

    if (schoolMatch) {

        rememberOrbitDetail(
            `The user's school is ${schoolMatch[1].trim()}.`
        );

    }


    /* =======================================================
       COURSE
       ======================================================= */

    const courseMatch =
        text.match(
            /(?:my course is|i'm studying|i am studying)\s+(.+)/i
        );

    if (courseMatch) {

        rememberOrbitDetail(
            `The user studies ${courseMatch[1].trim()}.`
        );

    }


    /* =======================================================
       LOCATION
       ======================================================= */

    const locationMatch =
        text.match(
            /(?:i live in|i'm from|i am from|i live at)\s+(.+)/i
        );

    if (locationMatch) {

        rememberOrbitDetail(
            `The user is from ${locationMatch[1].trim()}.`
        );

    }


    /* =======================================================
       GOAL
       ======================================================= */

    const goalMatch =
        text.match(
            /(?:my goal is|i want to|i plan to)\s+(.+)/i
        );

    if (goalMatch) {

        rememberOrbitDetail(
            `The user's goal is ${goalMatch[1].trim()}.`
        );

    }


    /* =======================================================
       LIKES
       ======================================================= */

    const likeMatch =
        text.match(
            /(?:i like|i love|i enjoy)\s+(.+)/i
        );

    if (likeMatch) {

        rememberOrbitDetail(
            `The user likes ${likeMatch[1].trim()}.`
        );

    }

}


/* ===========================================================
   GET MEMORY CONTEXT
   =========================================================== */

function getOrbitMemoryContext() {

    if (
        !orbitUserMemory ||
        orbitUserMemory.length === 0
    ) {

        return "";

    }


    return orbitUserMemory.join("\n");

}


/* ===========================================================
   FORMAT ORBIT RESPONSE
   =========================================================== */

function formatOrbitResponse(text) {

    if (!text) return "";

    let formatted =
        String(text);


    /* =======================================================
       ESCAPE HTML
       ======================================================= */

    formatted =
        formatted
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");


    /* =======================================================
       CODE BLOCKS
       ======================================================= */

    const codeBlocks = [];


    formatted =
        formatted.replace(
            /```([\s\S]*?)```/g,
            (match, code) => {

                const index =
                    codeBlocks.length;

                codeBlocks.push(
                    `<pre class="orbit-code-block"><code>${code.trim()}</code></pre>`
                );

                return `___ORBIT_CODE_BLOCK_${index}___`;

            }
        );


    /* =======================================================
       INLINE CODE
       ======================================================= */

    formatted =
        formatted.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );


    /* =======================================================
       BOLD
       ======================================================= */

    formatted =
        formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /* =======================================================
       ITALIC
       ======================================================= */

    formatted =
        formatted.replace(
            /(?<!\*)\*([^\*\n]+)\*(?!\*)/g,
            "<em>$1</em>"
        );


    /* =======================================================
       HEADINGS
       ======================================================= */

    formatted =
        formatted.replace(
            /^### (.*?)$/gm,
            "<h4>$1</h4>"
        );

    formatted =
        formatted.replace(
            /^## (.*?)$/gm,
            "<h3>$1</h3>"
        );

    formatted =
        formatted.replace(
            /^# (.*?)$/gm,
            "<h2>$1</h2>"
        );


    /* =======================================================
       BULLET LISTS
       ======================================================= */

    formatted =
        formatted.replace(
            /^[•\-]\s+(.*?)$/gm,
            "<li>$1</li>"
        );


    /* =======================================================
       NUMBERED LISTS
       ======================================================= */

    formatted =
        formatted.replace(
            /^\d+\.\s+(.*?)$/gm,
            "<li>$1</li>"
        );


    /* =======================================================
       GROUP LIST ITEMS
       ======================================================= */

    formatted =
        formatted.replace(
            /((?:<li>.*?<\/li>\s*)+)/g,
            "<ul>$1</ul>"
        );


    /* =======================================================
       LINE BREAKS
       ======================================================= */

    formatted =
        formatted.replace(
            /\n/g,
            "<br>"
        );


    /* =======================================================
       CLEAN BLOCK ELEMENT BREAKS
       ======================================================= */

    formatted =
        formatted
            .replace(
                /<br>\s*<ul>/g,
                "<ul>"
            )
            .replace(
                /<\/ul>\s*<br>/g,
                "</ul>"
            )
            .replace(
                /<br>\s*<h([2-4])>/g,
                "<h$1>"
            )
            .replace(
                /<\/h([2-4])><br>/g,
                "</h$1>"
            )
            .replace(
                /<br>\s*<pre/g,
                "<pre"
            )
            .replace(
                /<\/pre><br>/g,
                "</pre>"
            );


    /* =======================================================
       RESTORE CODE BLOCKS
       ======================================================= */

    codeBlocks.forEach(
        (block, index) => {

            formatted =
                formatted.replace(
                    `___ORBIT_CODE_BLOCK_${index}___`,
                    block
                );

        }
    );


    return formatted;

}


/* ===========================================================
   ADD MESSAGE TO CHAT
   =========================================================== */

function addOrbitMessage(
    text,
    sender = "orbit"
) {

    const {
        chatWindow
    } = getOrbitElements();


    if (!chatWindow) return;


    const message =
        document.createElement(
            "div"
        );


    message.className =
        `message ${sender}`;


    /* =======================================================
       USER MESSAGE
       ======================================================= */

    if (sender === "user") {

        message.textContent =
            text;

    }


    /* =======================================================
       ORBIT MESSAGE
       ======================================================= */

    else {

        message.innerHTML =
            formatOrbitResponse(text);

    }


    chatWindow.appendChild(
        message
    );


    chatWindow.scrollTop =
        chatWindow.scrollHeight;

}


/* ===========================================================
   TYPING INDICATOR
   =========================================================== */

function showOrbitTyping() {

    const {
        chatWindow
    } = getOrbitElements();


    if (!chatWindow) return;


    if (
        document.getElementById(
            "orbit-typing"
        )
    ) {

        return;

    }


    const typing =
        document.createElement(
            "div"
        );


    typing.id =
        "orbit-typing";


    typing.className =
        "message orbit typing-message";


    typing.innerHTML = `
        <span>Orbit is thinking</span>
        <span class="typing-dots">...</span>
    `;


    chatWindow.appendChild(
        typing
    );


    chatWindow.scrollTop =
        chatWindow.scrollHeight;

}


/* ===========================================================
   REMOVE TYPING INDICATOR
   =========================================================== */

function hideOrbitTyping() {

    const typing =
        document.getElementById(
            "orbit-typing"
        );


    if (typing) {

        typing.remove();

    }

}


/* ===========================================================
   SEND MESSAGE
   =========================================================== */

async function orbitSendMessage(
    suppliedMessage = null
) {

    const {
        chatWindow,
        commandInput,
        sendButton
    } = getOrbitElements();


    if (!commandInput) {

        console.warn(
            "Orbit input element was not found."
        );

        return;

    }


    if (orbitIsWaiting) {

        return;

    }


    const message =
        suppliedMessage !== null
            ? String(suppliedMessage).trim()
            : commandInput.value.trim();


    if (!message) {

        return;

    }


    /* =======================================================
       DETECT USER MEMORY
       ======================================================= */

    detectOrbitMemory(
        message
    );


    /* =======================================================
       ADD USER MESSAGE
       ======================================================= */

    addOrbitMessage(
        message,
        "user"
    );


    /* =======================================================
       UPDATE HISTORY
       ======================================================= */

    orbitConversationHistory.push({

        role: "user",

        content: message

    });


    /* Keep history manageable */

    if (
        orbitConversationHistory.length >
        40
    ) {

        orbitConversationHistory =
            orbitConversationHistory.slice(-40);

    }


    /* =======================================================
       CLEAR INPUT
       ======================================================= */

    if (
        suppliedMessage === null
    ) {

        commandInput.value = "";

    }


    /* =======================================================
       DISABLE CONTROLS
       ======================================================= */

    orbitIsWaiting =
        true;


    commandInput.disabled =
        true;


    if (sendButton) {

        sendButton.disabled =
            true;

    }


    /* =======================================================
       TYPING INDICATOR
       ======================================================= */

    showOrbitTyping();


    const startTime =
        performance.now();


    try {

        /* ===================================================
           SEND REQUEST
           =================================================== */

        const response =
            await fetch(
                ORBIT_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            message:
                                message,

                            history:
                                orbitConversationHistory,

                            memory:
                                getOrbitMemoryContext()

                        })

                }
            );


        /* ===================================================
           HTTP ERROR
           =================================================== */

        if (!response.ok) {

            let errorMessage =
                `Server returned ${response.status}`;


            try {

                const errorData =
                    await response.json();


                if (
                    errorData &&
                    errorData.error
                ) {

                    errorMessage =
                        errorData.error;

                }

            }

            catch (_) {

                /* Ignore JSON parsing errors */

            }


            throw new Error(
                errorMessage
            );

        }


        /* ===================================================
           READ RESPONSE
           =================================================== */

        const data =
            await response.json();


        hideOrbitTyping();


        /* ===================================================
           GET ORBIT REPLY
           =================================================== */

        const reply =
            data.reply ||
            data.response ||
            data.message;


        if (!reply) {

            throw new Error(
                "Orbit returned an empty response."
            );

        }


        /* ===================================================
           DISPLAY ORBIT RESPONSE
           =================================================== */

        addOrbitMessage(
            reply,
            "orbit"
        );


        /* ===================================================
           SAVE RESPONSE TO TEMPORARY HISTORY
           =================================================== */

        orbitConversationHistory.push({

            role: "assistant",

            content: reply

        });


        if (
            orbitConversationHistory.length >
            40
        ) {

            orbitConversationHistory =
                orbitConversationHistory.slice(-40);

        }


        /* ===================================================
           RESPONSE TIME
           =================================================== */

        const elapsed =
            performance.now() -
            startTime;


        const responseTime =
            document.getElementById(
                "response-time"
            );


        if (responseTime) {

            responseTime.textContent =
                `${(elapsed / 1000).toFixed(1)}s`;

        }

    }

    catch (error) {

        console.error(
            "Orbit AI request failed:",
            error
        );


        hideOrbitTyping();


        addOrbitMessage(

            `Orbit connection error: ${error.message}`,

            "orbit"

        );


        const responseTime =
            document.getElementById(
                "response-time"
            );


        if (responseTime) {

            responseTime.textContent =
                "Connection error";

        }

    }


    /* =======================================================
       RE-ENABLE CONTROLS
       ======================================================= */

    orbitIsWaiting =
        false;


    commandInput.disabled =
        false;


    if (sendButton) {

        sendButton.disabled =
            false;

    }


    commandInput.focus();

}


/* ===========================================================
   CLEAR CONVERSATION
   =========================================================== */

function clearOrbitConversation() {

    if (orbitIsWaiting) {

        return;

    }


    orbitConversationHistory =
        [];


    const {
        chatWindow
    } = getOrbitElements();


    if (chatWindow) {

        chatWindow.innerHTML = "";

        addOrbitMessage(
            "Orbit AI Online. How can I assist you?",
            "orbit"
        );

    }


    const responseTime =
        document.getElementById(
            "response-time"
        );


    if (responseTime) {

        responseTime.textContent =
            "Ready";

    }

}


/* ===========================================================
   NEW CHAT
   =========================================================== */

function startOrbitNewChat() {

    clearOrbitConversation();


    const {
        commandInput
    } = getOrbitElements();


    if (commandInput) {

        commandInput.value =
            "";

        commandInput.focus();

    }

}


/* ===========================================================
   ENTER KEY
   =========================================================== */

function setupOrbitKeyboard() {

    const {
        commandInput
    } = getOrbitElements();


    if (!commandInput) {

        return;

    }


    commandInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                orbitSendMessage();

            }

        }
    );

}


/* ===========================================================
   SEND BUTTON
   =========================================================== */

function setupOrbitSendButton() {

    const {
        sendButton
    } = getOrbitElements();


    if (!sendButton) {

        return;

    }


    sendButton.addEventListener(
        "click",
        () => {

            orbitSendMessage();

        }
    );

}


/* ===========================================================
   INITIALIZE ORBIT
   =========================================================== */

function initializeOrbitAI() {

    loadOrbitMemory();


    /*
       IMPORTANT:

       Conversation history is intentionally
       reset when the page loads.

       User memory remains saved.
    */

    orbitConversationHistory =
        [];


    const {
        chatWindow
    } = getOrbitElements();


    if (chatWindow) {

        chatWindow.innerHTML =
            "";


        addOrbitMessage(
            "Orbit AI Online. How can I assist you?",
            "orbit"
        );

    }


    setupOrbitSendButton();

    setupOrbitKeyboard();

}


/* ===========================================================
   PUBLIC ORBIT AI API
   =========================================================== */

window.OrbitAI = {

    sendMessage:
        orbitSendMessage,

    clearConversation:
        clearOrbitConversation,

    newChat:
        startOrbitNewChat,

    getMemory:
        getOrbitMemoryContext,

    formatResponse:
        formatOrbitResponse,

    isWaiting:
        () => orbitIsWaiting

};


/* ===========================================================
   START
   =========================================================== */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitAI
    );

}

else {

    initializeOrbitAI();

}