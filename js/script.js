/* ===========================================================
   ORBIT AI — DASHBOARD SCRIPT

   Clock + Greeting + AI Chat + Session Conversation Memory

   IMPORTANT:
   - Conversation disappears when the page is refreshed.
   - Conversation remains available while the page is open.
=========================================================== */

"use strict";


/* ===========================================================
   LIVE CLOCK
=========================================================== */

const timeEl =
    document.getElementById("time");

const dateEl =
    document.getElementById("date");

const greetingEl =
    document.getElementById("greeting");


function updateClock() {

    const now = new Date();

    const hours =
        now.getHours();

    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    const seconds =
        String(
            now.getSeconds()
        ).padStart(2, "0");


    const period =
        hours >= 12
            ? "PM"
            : "AM";


    const displayHour =
        hours % 12 || 12;


    /* TIME */

    if (timeEl) {

        timeEl.textContent =
            `${ displayHour }:${ minutes }:${ seconds } ${ period } `;

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

        let greeting =
            "Good Evening";


        if (
            hours >= 5 &&
            hours < 12
        ) {

            greeting =
                "Good Morning";

        }


        else if (
            hours >= 12 &&
            hours < 17
        ) {

            greeting =
                "Good Afternoon";

        }


        greetingEl.textContent =
            `${ greeting }, Kingsley`;

    }

}


updateClock();


setInterval(
    updateClock,
    1000
);


/* ===========================================================
   ORBIT AI CHAT ELEMENTS
=========================================================== */

const chatWindow =
    document.getElementById(
        "chat-window"
    );


const commandInput =
    document.getElementById(
        "command-input"
    );


const sendButton =
    document.getElementById(
        "send-btn"
    );


/* ===========================================================
   SESSION CONVERSATION MEMORY
=========================================================== */

/*
    IMPORTANT:

    We are NOT using localStorage here.

    That means:

    Refresh page
        ↓
    conversationHistory resets
        ↓
    Previous messages disappear.

    While the page remains open,
    Orbit can still use the conversation history.
*/

let conversationHistory = [];


/* ===========================================================
   PERSONAL MEMORY
=========================================================== */

/*
    Personal memory is separate from conversation memory.

    This can later be used for things like:

    name
    preferences
    favorite things
    etc.

    It is currently empty until we intentionally
    teach Orbit how to save personal information.
*/

const PERSONAL_MEMORY_KEY =
    "orbit-personal-memory";


let personalMemory = {};


/* ===========================================================
   LOAD PERSONAL MEMORY
=========================================================== */

function loadPersonalMemory() {

    try {

        const saved =
            localStorage.getItem(
                PERSONAL_MEMORY_KEY
            );


        if (saved) {

            const parsed =
                JSON.parse(saved);


            if (
                parsed &&
                typeof parsed === "object"
            ) {

                personalMemory =
                    parsed;

            }

        }

    }

    catch (error) {

        console.error(
            "Orbit personal memory could not be loaded:",
            error
        );

        personalMemory = {};

    }

}


/* ===========================================================
   SAVE PERSONAL MEMORY
=========================================================== */

function savePersonalMemory() {

    try {

        localStorage.setItem(
            PERSONAL_MEMORY_KEY,
            JSON.stringify(
                personalMemory
            )
        );

    }

    catch (error) {

        console.error(
            "Orbit personal memory could not be saved:",
            error
        );

    }

}


/* ===========================================================
   REMEMBER PERSONAL FACT
=========================================================== */

function rememberPersonalFact(
    key,
    value
) {

    if (
        !key ||
        !value
    ) {

        return;

    }


    personalMemory[key] =
        value;


    savePersonalMemory();

}


/* ===========================================================
   GET PERSONAL FACT
=========================================================== */

function getPersonalFact(key) {

    return (
        personalMemory[key] ||
        null
    );

}


/* ===========================================================
   REMEMBER CONVERSATION MESSAGE
=========================================================== */

function rememberMessage(
    role,
    content
) {

    if (
        !role ||
        !content
    ) {

        return;

    }


    conversationHistory.push({

        role: role,

        content: content

    });


    /*
        Keep the conversation from becoming
        unnecessarily large.

        20 messages = approximately 10 exchanges.
    */

    if (
        conversationHistory.length > 20
    ) {

        conversationHistory =
            conversationHistory.slice(-20);

    }

}


/* ===========================================================
   ADD MESSAGE TO CHAT WINDOW
=========================================================== */

function addMessage(
    text,
    sender
) {

    if (!chatWindow) {

        return;

    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        `message ${ sender } `;


    message.textContent =
        text;


    chatWindow.appendChild(
        message
    );


    chatWindow.scrollTop =
        chatWindow.scrollHeight;

}


/* ===========================================================
   INITIAL CHAT SCREEN
=========================================================== */

function initializeChat() {

    if (!chatWindow) {

        return;

    }


    /*
        Always clear the chat when the page loads.

        This guarantees that old conversation
        messages do not survive a refresh.
    */

    chatWindow.innerHTML = "";


    /*
        Show Orbit's starting message.

        This message is NOT saved into
        conversationHistory.
    */

    addMessage(
        "Orbit AI Online. How can I assist you?",
        "orbit"
    );

}


/* ===========================================================
   TYPING INDICATOR
=========================================================== */

function showTyping() {

    if (!chatWindow) {

        return;

    }


    /*
        Prevent duplicate typing indicators.
    */

    const existingTyping =
        document.getElementById(
            "orbit-typing"
        );


    if (existingTyping) {

        return;

    }


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

    if (!commandInput) {

        return;

    }


    const message =
        commandInput.value.trim();


    /*
        Don't send empty messages.
    */

    if (!message) {

        return;

    }


    /*
        Display user's message.
    */

    addMessage(
        message,
        "user"
    );


    /*
        Add user message to
        temporary conversation memory.
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
        Disable controls.
    */

    if (sendButton) {

        sendButton.disabled =
            true;

    }


    commandInput.disabled =
        true;


    /*
        Show typing indicator.
    */

    showTyping();


    try {

        /* ===================================================
           SEND REQUEST TO ORBIT BACKEND
        =================================================== */

        const response =
            await fetch(
                "http://localhost:5000/api/chat",
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


        /* ===================================================
           CHECK SERVER RESPONSE
        =================================================== */

        if (!response.ok) {

            let errorMessage =
                `Server returned ${ response.status } `;


            try {

                const errorData =
                    await response.json();


                if (errorData?.error) {

                    errorMessage =
                        errorData.error;

                }

            }

            catch (parseError) {

                console.warn(
                    "Could not parse server error:",
                    parseError
                );

            }


            throw new Error(
                errorMessage
            );

        }


        /* ===================================================
           READ JSON RESPONSE
        =================================================== */

        const data =
            await response.json();


        /*
            Remove typing indicator.
        */

        hideTyping();


        /* ===================================================
           DISPLAY ORBIT RESPONSE
        =================================================== */

        if (
            data &&
            data.reply
        ) {

            addMessage(
                data.reply,
                "orbit"
            );


            /*
                Save Orbit's response
                to temporary memory.
            */

            rememberMessage(
                "assistant",
                data.reply
            );

        }

        else {

            addMessage(
                "Orbit received the message but returned an empty response.",
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
            `Orbit could not respond: ${ error.message } `,
            "orbit"
        );

    }


    /* ===================================================
       RE-ENABLE CONTROLS
    =================================================== */

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
   INITIALIZE ORBIT
=========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
            Load persistent personal memory.
        */

        loadPersonalMemory();


        /*
            Start a completely fresh
            conversation every time
            the page loads.
        */

        conversationHistory = [];


        initializeChat();

    }
);
