/* ===========================================================
   ORBIT AI — DASHBOARD SCRIPT
   Clock + Greeting + AI Chat + Conversation Memory
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
   CONVERSATION MEMORY
=========================================================== */

const MEMORY_KEY =
    "orbit-conversation";

let conversationHistory = [];


/* ===========================================================
   LOAD CONVERSATION
=========================================================== */

function loadConversation() {

    try {

        const savedConversation =
            localStorage.getItem(
                MEMORY_KEY
            );


        if (savedConversation) {

            const parsed =
                JSON.parse(
                    savedConversation
                );


            if (Array.isArray(parsed)) {

                conversationHistory =
                    parsed;

            }

        }

    } catch (error) {

        console.error(
            "Orbit memory could not be loaded:",
            error
        );

        conversationHistory = [];

    }

}


/* ===========================================================
   SAVE CONVERSATION
=========================================================== */

function saveConversation() {

    try {

        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(
                conversationHistory
            )
        );

    } catch (error) {

        console.error(
            "Orbit memory could not be saved:",
            error
        );

    }

}


/* ===========================================================
   ADD TO CONVERSATION HISTORY
=========================================================== */

function rememberMessage(
    role,
    content
) {

    conversationHistory.push({

        role: role,

        content: content

    });


    /*
       Keep the browser memory from
       becoming unnecessarily large.
    */

    if (
        conversationHistory.length >
        40
    ) {

        conversationHistory =
            conversationHistory.slice(-40);

    }


    saveConversation();

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


    message.textContent =
        text;


    chatWindow.appendChild(
        message
    );


    chatWindow.scrollTop =
        chatWindow.scrollHeight;

}


/* ===========================================================
   RESTORE CONVERSATION TO UI
=========================================================== */

function restoreConversation() {

    if (!chatWindow) return;


    chatWindow.innerHTML = "";


    if (
        conversationHistory.length === 0
    ) {

        addMessage(
            "Orbit AI Online. How can I assist you?",
            "orbit"
        );

        return;

    }


    conversationHistory.forEach(
        (message) => {

            if (
                message.role === "user"
            ) {

                addMessage(
                    message.content,
                    "user"
                );

            }


            if (
                message.role === "assistant"
            ) {

                addMessage(
                    message.content,
                    "orbit"
                );

            }

        }
    );

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


    /*
       Don't send empty messages.
    */

    if (!message) return;


    /*
       Display user message immediately.
    */

    addMessage(
        message,
        "user"
    );


    /*
       Add user message to conversation.
    */

    rememberMessage(
        "user",
        message
    );


    /*
       Clear input.
    */

    commandInput.value = "";


    /*
       Disable controls while Orbit
       is generating a response.
    */

    if (sendButton) {

        sendButton.disabled = true;

    }


    commandInput.disabled = true;


    /*
       Show typing indicator.
    */

    showTyping();


    try {

        /* ===================================================
           SEND MESSAGE TO ORBIT BACKEND

           IMPORTANT:
           This uses the laptop's local network IP
           instead of localhost so the phone can reach
           the backend.
        =================================================== */

        const response =
            await fetch(
                "http://10.38.117.95:5000/api/chat",
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
                                conversationHistory

                        })

                }
            );


        /*
           Check HTTP response.
        */

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


        /*
           Convert response to JSON.
        */

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
               Save Orbit's response
               to conversation memory.
            */

            rememberMessage(
                "assistant",
                data.reply
            );

        } else {

            addMessage(
                "I received an empty response from the AI.",
                "orbit"
            );

        }


    } catch (error) {

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


    /*
       Re-enable controls.
    */

    if (sendButton) {

        sendButton.disabled = false;

    }


    commandInput.disabled = false;

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

        loadConversation();

        restoreConversation();

    }
);