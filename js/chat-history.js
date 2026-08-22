/* =========================================================
   ORBIT AI — CHAT HISTORY ENGINE
   =========================================================

   Handles:
   - Chat history storage
   - Chat titles
   - Conversation snapshots
   - History sidebar
   - New chat
   - Delete chat
   - LocalStorage persistence

   IMPORTANT:
   This file does NOT modify:
   - orbit.js
   - script.js
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const ORBIT_CHAT_HISTORY_KEY = "orbit-chat-history";

const ORBIT_ACTIVE_CHAT_KEY = "orbit-active-chat";

const ORBIT_MAX_SAVED_CHATS = 30;


/* =========================================================
   STATE
   ========================================================= */

let orbitChatHistory = [];

let orbitActiveChatId = null;


/* =========================================================
   GET ELEMENTS
   ========================================================= */

function getOrbitChatHistoryElements() {

    return {

        chatWindow:
            document.getElementById("chat-window"),

        historyList:
            document.getElementById("chat-history-list"),

        newChatButton:
            document.getElementById("chat-history-new")

    };

}


/* =========================================================
   CREATE CHAT ID
   ========================================================= */

function createOrbitChatId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }

    return (
        "orbit-chat-" +
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 10)
    );

}


/* =========================================================
   LOAD HISTORY
   ========================================================= */

function loadOrbitChatHistory() {

    try {

        const saved =
            localStorage.getItem(
                ORBIT_CHAT_HISTORY_KEY
            );

        if (!saved) {

            orbitChatHistory = [];

            return;

        }

        const parsed =
            JSON.parse(saved);

        if (Array.isArray(parsed)) {

            orbitChatHistory = parsed;

        } else {

            orbitChatHistory = [];

        }

    } catch (error) {

        console.error(
            "Orbit chat history could not be loaded:",
            error
        );

        orbitChatHistory = [];

    }

}


/* =========================================================
   SAVE HISTORY
   ========================================================= */

function saveOrbitChatHistory() {

    try {

        localStorage.setItem(
            ORBIT_CHAT_HISTORY_KEY,
            JSON.stringify(
                orbitChatHistory
            )
        );

    } catch (error) {

        console.error(
            "Orbit chat history could not be saved:",
            error
        );

    }

}


/* =========================================================
   GET ACTIVE CHAT
   ========================================================= */

function getOrbitActiveChat() {

    if (!orbitActiveChatId) {

        return null;

    }

    return (
        orbitChatHistory.find(
            chat =>
                chat.id === orbitActiveChatId
        ) || null
    );

}


/* =========================================================
   CREATE NEW CHAT
   ========================================================= */

function createOrbitNewChat() {

    const chat = {

        id:
            createOrbitChatId(),

        title:
            "New conversation",

        messages: [],

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()

    };


    orbitChatHistory.unshift(
        chat
    );


    orbitActiveChatId =
        chat.id;


    localStorage.setItem(
        ORBIT_ACTIVE_CHAT_KEY,
        orbitActiveChatId
    );


    if (
        orbitChatHistory.length >
        ORBIT_MAX_SAVED_CHATS
    ) {

        orbitChatHistory =
            orbitChatHistory.slice(
                0,
                ORBIT_MAX_SAVED_CHATS
            );

    }


    saveOrbitChatHistory();

    renderOrbitChatHistory();

    return chat;

}


/* =========================================================
   CREATE TITLE
   ========================================================= */

function createOrbitChatTitle(text) {

    if (!text) {

        return "New conversation";

    }


    let title =
        String(text)
            .replace(/\s+/g, " ")
            .trim();


    if (!title) {

        return "New conversation";

    }


    if (title.length > 42) {

        title =
            title.substring(
                0,
                42
            ).trim() +
            "...";

    }


    return title;

}


/* =========================================================
   ADD MESSAGE TO CURRENT CHAT
   ========================================================= */

function addOrbitHistoryMessage(
    message,
    sender
) {

    if (!message) {

        return;

    }


    let chat =
        getOrbitActiveChat();


    if (!chat) {

        chat =
            createOrbitNewChat();

    }


    const cleanMessage =
        String(message).trim();


    if (!cleanMessage) {

        return;

    }


    chat.messages.push({

        sender:
            sender === "user"
                ? "user"
                : "orbit",

        content:
            cleanMessage,

        timestamp:
            Date.now()

    });


    chat.updatedAt =
        Date.now();


    /*
       Automatically create the title
       from the first user message.
    */

    if (
        sender === "user" &&
        (
            chat.title ===
            "New conversation" ||
            !chat.title
        )
    ) {

        chat.title =
            createOrbitChatTitle(
                cleanMessage
            );

    }


    saveOrbitChatHistory();

    renderOrbitChatHistory();

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatOrbitChatTime(
    timestamp
) {

    if (!timestamp) {

        return "";

    }


    const date =
        new Date(timestamp);

    const now =
        new Date();


    const sameDay =
        date.toDateString() ===
        now.toDateString();


    if (sameDay) {

        return date.toLocaleTimeString(
            [],
            {
                hour: "numeric",
                minute: "2-digit"
            }
        );

    }


    const yesterday =
        new Date();

    yesterday.setDate(
        yesterday.getDate() - 1
    );


    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {

        return "Yesterday";

    }


    return date.toLocaleDateString(
        [],
        {
            month: "short",
            day: "numeric"
        }
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeOrbitHistoryHTML(
    value
) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderOrbitChatHistory() {

    const {
        historyList
    } =
        getOrbitChatHistoryElements();


    if (!historyList) {

        return;

    }


    if (
        orbitChatHistory.length === 0
    ) {

        historyList.innerHTML = `

      <div class="chat-history-empty">

        <i class="fa-regular fa-comments"></i>

        <span>
          No conversations yet
        </span>

      </div>

    `;

        return;

    }


    historyList.innerHTML =
        orbitChatHistory
            .map(chat => {

                const active =
                    chat.id ===
                    orbitActiveChatId;


                return `

          <div
            class="chat-history-item ${active ? "active" : ""}"
            data-chat-id="${escapeOrbitHistoryHTML(chat.id)}"
            tabindex="0"
            role="button"
            aria-label="Open ${escapeOrbitHistoryHTML(chat.title)}"
          >

            <span class="chat-history-icon">

              <i class="fa-regular fa-message"></i>

            </span>


            <span class="chat-history-info">

              <span class="chat-history-title">

                ${escapeOrbitHistoryHTML(
                    chat.title ||
                    "New conversation"
                )}

              </span>


              <span class="chat-history-time">

                ${formatOrbitChatTime(
                    chat.updatedAt
                )}

              </span>

            </span>


            <button
              type="button"
              class="chat-history-delete"
              data-delete-chat="${escapeOrbitHistoryHTML(chat.id)}"
              aria-label="Delete conversation"
              title="Delete conversation"
            >

              <i class="fa-solid fa-trash"></i>

            </button>

          </div>

        `;

            })
            .join("");

}


/* =========================================================
   DELETE CHAT
   ========================================================= */

function deleteOrbitChat(
    chatId
) {

    if (!chatId) {

        return;

    }


    orbitChatHistory =
        orbitChatHistory.filter(
            chat =>
                chat.id !== chatId
        );


    if (
        orbitActiveChatId ===
        chatId
    ) {

        orbitActiveChatId =
            null;

        localStorage.removeItem(
            ORBIT_ACTIVE_CHAT_KEY
        );

    }


    saveOrbitChatHistory();

    renderOrbitChatHistory();

}


/* =========================================================
   OPEN CHAT
   ========================================================= */

function openOrbitChat(
    chatId
) {

    if (!chatId) {

        return;

    }


    const chat =
        orbitChatHistory.find(
            item =>
                item.id === chatId
        );


    if (!chat) {

        return;

    }


    orbitActiveChatId =
        chat.id;


    localStorage.setItem(
        ORBIT_ACTIVE_CHAT_KEY,
        orbitActiveChatId
    );


    const {
        chatWindow
    } =
        getOrbitChatHistoryElements();


    if (chatWindow) {

        chatWindow.innerHTML = "";


        chat.messages.forEach(
            message => {

                const element =
                    document.createElement(
                        "div"
                    );


                element.className =
                    `message ${message.sender}`;


                if (
                    message.sender ===
                    "user"
                ) {

                    element.textContent =
                        message.content;

                } else {

                    /*
                       Use Orbit's existing
                       response formatter.
          
                       This keeps links,
                       tables and code blocks
                       formatted correctly.
                    */

                    if (
                        window.OrbitAI &&
                        typeof
                        window.OrbitAI.formatResponse ===
                        "function"
                    ) {

                        element.innerHTML =
                            window.OrbitAI.formatResponse(
                                message.content
                            );

                    } else {

                        element.textContent =
                            message.content;

                    }

                }


                chatWindow.appendChild(
                    element
                );

            }
        );


        chatWindow.scrollTop =
            chatWindow.scrollHeight;

    }


    renderOrbitChatHistory();

}


/* =========================================================
   START NEW CHAT
   ========================================================= */

function startOrbitHistoryNewChat() {

    /*
       Ask the existing Orbit engine
       to clear the current conversation.
  
       We are NOT modifying orbit.js.
    */

    if (
        window.OrbitAI &&
        typeof
        window.OrbitAI.clearConversation ===
        "function"
    ) {

        window.OrbitAI.clearConversation();

    }


    const chat =
        createOrbitNewChat();


    renderOrbitChatHistory();


    const input =
        document.getElementById(
            "command-input"
        );


    if (input) {

        input.value = "";

        input.focus();

    }

}


/* =========================================================
   CAPTURE CURRENT CHAT
   ========================================================= */

function captureOrbitCurrentChat() {

    const {
        chatWindow
    } =
        getOrbitChatHistoryElements();


    if (!chatWindow) {

        return;

    }


    const messages =
        chatWindow.querySelectorAll(
            ".message"
        );


    if (
        messages.length === 0
    ) {

        return;

    }


    /*
       Avoid capturing the initial
       "Orbit AI Online" message.
    */

    messages.forEach(
        element => {

            const sender =
                element.classList.contains(
                    "user"
                )
                    ? "user"
                    : "orbit";


            let content =
                element.innerText ||
                element.textContent ||
                "";


            content =
                content.trim();


            if (!content) {

                return;

            }


            const chat =
                getOrbitActiveChat();


            if (!chat) {

                return;

            }


            const alreadySaved =
                chat.messages.some(
                    item =>
                        item.content ===
                        content &&
                        item.sender ===
                        sender
                );


            if (
                !alreadySaved
            ) {

                addOrbitHistoryMessage(
                    content,
                    sender
                );

            }

        }
    );

}


/* =========================================================
   OBSERVE CHAT WINDOW
   ========================================================= */

function observeOrbitChat() {

    const {
        chatWindow
    } =
        getOrbitChatHistoryElements();


    if (!chatWindow) {

        return;

    }


    const observer =
        new MutationObserver(
            mutations => {

                let changed = false;


                mutations.forEach(
                    mutation => {

                        if (
                            mutation.addedNodes &&
                            mutation.addedNodes.length
                        ) {

                            changed = true;

                        }

                    }
                );


                if (!changed) {

                    return;

                }


                /*
                   Small delay allows Orbit's
                   message DOM to finish rendering.
                */

                setTimeout(
                    captureOrbitCurrentChat,
                    50
                );

            }
        );


    observer.observe(
        chatWindow,
        {
            childList: true,
            subtree: false
        }
    );

}


/* =========================================================
   HISTORY CLICK EVENTS
   ========================================================= */

function setupOrbitChatHistoryEvents() {

    const {
        historyList,
        newChatButton
    } =
        getOrbitChatHistoryElements();


    if (newChatButton) {

        newChatButton.addEventListener(
            "click",
            startOrbitHistoryNewChat
        );

    }


    if (!historyList) {

        return;

    }


    historyList.addEventListener(
        "click",
        event => {

            const deleteButton =
                event.target.closest(
                    "[data-delete-chat]"
                );


            if (deleteButton) {

                event.stopPropagation();

                deleteOrbitChat(
                    deleteButton.dataset.deleteChat
                );

                return;

            }


            const chatItem =
                event.target.closest(
                    "[data-chat-id]"
                );


            if (!chatItem) {

                return;

            }


            openOrbitChat(
                chatItem.dataset.chatId
            );

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeOrbitChatHistory() {

    loadOrbitChatHistory();


    const savedActiveChat =
        localStorage.getItem(
            ORBIT_ACTIVE_CHAT_KEY
        );


    if (
        savedActiveChat &&
        orbitChatHistory.some(
            chat =>
                chat.id ===
                savedActiveChat
        )
    ) {

        orbitActiveChatId =
            savedActiveChat;

    }


    /*
       If there is no conversation yet,
       create one silently.
    */

    if (
        orbitChatHistory.length === 0
    ) {

        createOrbitNewChat();

    }


    renderOrbitChatHistory();

    setupOrbitChatHistoryEvents();

    observeOrbitChat();


    console.log(
        "Orbit Chat History initialized."
    );

}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.OrbitChatHistory = {

    newChat:
        startOrbitHistoryNewChat,

    getHistory:
        () => orbitChatHistory,

    deleteChat:
        deleteOrbitChat,

    openChat:
        openOrbitChat,

    render:
        renderOrbitChatHistory

};


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeOrbitChatHistory
    );

} else {

    initializeOrbitChatHistory();

}