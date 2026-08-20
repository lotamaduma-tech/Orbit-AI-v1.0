/* ===========================================================
   ORBIT AI — DASHBOARD SCRIPT

   Clock + Greeting + AI Chat + Persistent User Memory
   + Formatted AI Responses
=========================================================== */

"use strict";


/* ===========================================================
   LIVE CLOCK
=========================================================== */

const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

function updateClock() {

    const now = new Date();

    const hours = now.getHours();

    const minutes =
        String(now.getMinutes()).padStart(2, "0");

    const seconds =
        String(now.getSeconds()).padStart(2, "0");

    const period =
        hours >= 12 ? "PM" : "AM";

    const displayHour =
        hours % 12 || 12;


    /* TIME */

    if (timeEl) {

        timeEl.textContent =
            `${displayHour}:${minutes}:${seconds} ${period}`;

    }


    /* DATE */

    if (dateEl) {

        dateEl.textContent =
            now.toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

    }


    /* GREETING */

    if (greetingEl) {

        let greeting = "Good Evening";

        if (hours >= 5 && hours < 12) {

            greeting = "Good Morning";

        } else if (hours >= 12 && hours < 17) {

            greeting = "Good Afternoon";

        }

        greetingEl.textContent =
            `${greeting}, Kingsley`;

    }

}

updateClock();

setInterval(
    updateClock,
    1000
);


/* ===========================================================
   ORBIT AI CHAT
=========================================================== */

const chatWindow =
    document.getElementById("chat-window");

const commandInput =
    document.getElementById("command-input");

const sendButton =
    document.getElementById("send-btn");


/* ===========================================================
   BACKEND
=========================================================== */

const API_URL =
    "https://orbit-ai-v1-0.onrender.com/api/chat";


/* ===========================================================
   CONVERSATION HISTORY

   IMPORTANT:

   This is ONLY kept while the page is open.

   It is NOT saved to localStorage.

   Therefore:

   Refresh = new conversation.
=========================================================== */

let conversationHistory = [];


/* ===========================================================
   USER MEMORY
=========================================================== */

const USER_MEMORY_KEY =
    "orbit-user-memory";

let userMemory = [];


/* ===========================================================
   LOAD USER MEMORY
=========================================================== */

function loadUserMemory() {

    try {

        const savedMemory =
            localStorage.getItem(
                USER_MEMORY_KEY
            );

        if (savedMemory) {

            const parsed =
                JSON.parse(savedMemory);

            if (Array.isArray(parsed)) {

                userMemory = parsed;

            }

        }

    } catch (error) {

        console.error(
            "Orbit user memory could not be loaded:",
            error
        );

        userMemory = [];

    }

}


/* ===========================================================
   SAVE USER MEMORY
=========================================================== */

function saveUserMemory() {

    try {

        localStorage.setItem(
            USER_MEMORY_KEY,
            JSON.stringify(userMemory)
        );

    } catch (error) {

        console.error(
            "Orbit user memory could not be saved:",
            error
        );

    }

}


/* ===========================================================
   ADD USER MEMORY
=========================================================== */

function rememberUserDetail(detail) {

    if (!detail) return;

    const cleanDetail =
        detail.trim();

    if (!cleanDetail) return;


    /* Prevent duplicate memories */

    const alreadyExists =
        userMemory.some(
            item =>
                item.toLowerCase() ===
                cleanDetail.toLowerCase()
        );

    if (alreadyExists) return;


    userMemory.push(
        cleanDetail
    );


    /* Prevent unlimited memory growth */

    if (userMemory.length > 50) {

        userMemory =
            userMemory.slice(-50);

    }

    saveUserMemory();

}


/* ===========================================================
   AUTOMATIC USER DETAIL DETECTION
=========================================================== */

function detectUserMemory(message) {

    const text =
        message.trim();

    if (!text) return;


    /* NAME */

    const nameMatch =
        text.match(
            /(?:my name is|call me|you can call me)\s+([a-zA-Z][a-zA-Z\s'-]{1,40})/i
        );

    if (nameMatch) {

        rememberUserDetail(
            `The user's name is ${nameMatch[1].trim()}.`
        );

    }


    /* AGE */

    const ageMatch =
        text.match(
            /(?:i am|i'm|im)\s+(\d{1,3})\s*(?:years old)?/i
        );

    if (ageMatch) {

        rememberUserDetail(
            `The user is ${ageMatch[1]} years old.`
        );

    }


    /* SCHOOL / UNIVERSITY */

    const schoolMatch =
        text.match(
            /(?:i study at|i attend|my school is|i go to)\s+(.+)/i
        );

    if (schoolMatch) {

        rememberUserDetail(
            `The user's school is ${schoolMatch[1].trim()}.`
        );

    }


    /* COURSE */

    const courseMatch =
        text.match(
            /(?:i study|my course is|i'm studying|i am studying)\s+(.+)/i
        );

    if (courseMatch) {

        rememberUserDetail(
            `The user studies ${courseMatch[1].trim()}.`
        );

    }


    /* LOCATION */

    const locationMatch =
        text.match(
            /(?:i live in|i'm from|i am from|i live at)\s+(.+)/i
        );

    if (locationMatch) {

        rememberUserDetail(
            `The user is from ${locationMatch[1].trim()}.`
        );

    }


    /* GOAL */

    const goalMatch =
        text.match(
            /(?:my goal is|i want to|i plan to)\s+(.+)/i
        );

    if (goalMatch) {

        rememberUserDetail(
            `The user's goal is ${goalMatch[1].trim()}.`
        );

    }


    /* LIKES */

    const likeMatch =
        text.match(
            /(?:i like|i love|i enjoy)\s+(.+)/i
        );

    if (likeMatch) {

        rememberUserDetail(
            `The user likes ${likeMatch[1].trim()}.`
        );

    }

}


/* ===========================================================
   GET MEMORY FOR ORBIT
=========================================================== */

function getMemoryContext() {

    if (
        !userMemory ||
        userMemory.length === 0
    ) {

        return "";

    }

    return userMemory.join("\n");

}


/* ===========================================================
   ORBIT RESPONSE FORMATTER
   -----------------------------------------------------------
   Converts common Markdown from the AI into clean HTML.

   Examples:

   **Hello**       → bold
   *Hello*         → italic
   `code`          → inline code
   # Heading      → heading
   - Item         → bullet
   1. Item        → numbered list

   HTML is escaped first for safety.
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
       ```code```
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
       `code`
    ======================================================= */

    formatted =
        formatted.replace(
            /`([^`\n]+)`/g,
            "<code>$1</code>"
        );


    /* =======================================================
       BOLD
       **text**
    ======================================================= */

    formatted =
        formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /* =======================================================
       ITALIC
       *text*
    ======================================================= */

    formatted =
        formatted.replace(
            /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
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
       NUMBERED LISTS
    ======================================================= */

    formatted =
        formatted.replace(
            /^\d+\.\s+(.*?)$/gm,
            "<li>$1</li>"
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
       CLEAN UP BREAKS AROUND BLOCK ELEMENTS
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
   ADD MESSAGE TO UI
=========================================================== */

function addMessage(
    text,
    sender
) {

    if (!chatWindow) return;


    const message =
        document.createElement(
            "div"
        );


    message.className =
        `message ${sender}`;


    /*
       USER MESSAGES
       ----------------------------
       Keep user messages as plain
       text.
    */

    if (sender === "user") {

        message.textContent =
            text;

    }


    /*
       ORBIT MESSAGES
       ----------------------------
       Render Markdown formatting.
    */

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

function showTyping() {

    if (!chatWindow) return;


    const existingTyping =
        document.getElementById(
            "orbit-typing"
        );


    if (existingTyping) return;


    const typing =
        document.createElement(
            "div"
        );


    typing.className =
        "message orbit typing-message";


    typing.id =
        "orbit-typing";


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
   HIDE TYPING INDICATOR
=========================================================== */

function hideTyping() {

    const typing =
        document.getElementById(
            "orbit-typing"
        );


    if (typing) {

        typing.remove();

    }

}


/* ===========================================================
   SEND MESSAGE TO BACKEND
=========================================================== */

async function sendMessage() {

    if (!commandInput) return;


    const message =
        commandInput.value.trim();


    /* Don't send empty messages */

    if (!message) return;


    /* Detect useful user information */

    detectUserMemory(
        message
    );


    /* Display user message */

    addMessage(
        message,
        "user"
    );


    /* Temporary conversation history */

    conversationHistory.push({

        role:
            "user",

        content:
            message

    });


    /* Keep temporary conversation manageable */

    if (
        conversationHistory.length >
        40
    ) {

        conversationHistory =
            conversationHistory.slice(-40);

    }


    /* Clear input */

    commandInput.value = "";


    /* Disable controls */

    if (sendButton) {

        sendButton.disabled =
            true;

    }

    commandInput.disabled =
        true;


    /* Show typing indicator */

    showTyping();


    try {

        /* ===================================================
           SEND MESSAGE TO LIVE RENDER BACKEND
        =================================================== */

        const response =
            await fetch(
                API_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            message:
                                message,

                            history:
                                conversationHistory,

                            memory:
                                getMemoryContext()

                        })

                }
            );


        /* ===================================================
           CHECK HTTP RESPONSE
        =================================================== */

        if (!response.ok) {

            let errorMessage =
                `Server returned ${response.status}`;


            try {

                const errorData =
                    await response.json();


                if (
                    errorData?.error
                ) {

                    errorMessage =
                        errorData.error;

                }

            } catch (_) {

                /*
                   Ignore JSON parsing errors.
                */

            }


            throw new Error(
                errorMessage
            );

        }


        /* ===================================================
           CONVERT RESPONSE TO JSON
        =================================================== */

        const data =
            await response.json();


        hideTyping();


        /* ===================================================
           ORBIT RESPONSE
        =================================================== */

        if (data.reply) {

            addMessage(
                data.reply,
                "orbit"
            );


            /*
               Save Orbit's response ONLY
               in temporary conversation history.
            */

            conversationHistory.push({

                role:
                    "assistant",

                content:
                    data.reply

            });

        }

        else {

            addMessage(
                "I received an empty response from the AI.",
                "orbit"
            );

        }


    }

    catch (error) {

        console.error(
            "Orbit AI request failed:",
            error
        );


        hideTyping();


        addMessage(
            `Orbit connection error: ${error.message}`,
            "orbit"
        );

    }


    /* =======================================================
       RE-ENABLE CONTROLS
    ======================================================= */

    if (sendButton) {

        sendButton.disabled =
            false;

    }


    commandInput.disabled =
        false;


    commandInput.focus();

}


/* ===========================================================
   SEND BUTTON
=========================================================== */

if (sendButton) {

    sendButton.addEventListener(
        "click",
        sendMessage
    );

}


/* ===========================================================
   ENTER KEY
=========================================================== */

if (commandInput) {

    commandInput.addEventListener(
        "keydown",
        (event) => {

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


/* ===========================================================
   INITIALIZE CHAT
=========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
           Load ONLY persistent user memory.
        */

        loadUserMemory();


        /*
           Start every page load with
           a fresh conversation.
        */

        conversationHistory =
            [];


        /*
           Show fresh Orbit welcome message.
        */

        if (chatWindow) {

            chatWindow.innerHTML =
                "";

            addMessage(
                "Orbit AI Online. How can I assist you?",
                "orbit"
            );

        }

    }
);