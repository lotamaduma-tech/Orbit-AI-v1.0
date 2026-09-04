"use strict";

const THINKING_CONTAINER_CLASS = "adumex-thinking";
const THINKING_FACE_CLASS = "adumex-thinking-face";

let thinkingElement = null;

function getChatWindow() {
    return document.querySelector("#chat-window");
}

function createThinkingElement() {
    const wrapper = document.createElement("div");
    wrapper.className = THINKING_CONTAINER_CLASS;
    wrapper.setAttribute("aria-hidden", "true");

    wrapper.innerHTML = `
        <div class="${THINKING_FACE_CLASS}">
            <span class="thinking-face-glow"></span>
            <span class="thinking-face-ring"></span>
            <span class="thinking-face-eye thinking-face-eye-left"></span>
            <span class="thinking-face-eye thinking-face-eye-right"></span>
            <span class="thinking-face-mouth"></span>
        </div>
    `;

    return wrapper;
}

function scrollToThinking() {
    const chatWindow = getChatWindow();

    if (!chatWindow) return;

    requestAnimationFrame(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });
}

function show() {
    const chatWindow = getChatWindow();

    if (!chatWindow) return;

    if (thinkingElement?.isConnected) {
        thinkingElement.classList.add("is-visible");
        scrollToThinking();
        return;
    }

    thinkingElement = createThinkingElement();
    chatWindow.appendChild(thinkingElement);

    requestAnimationFrame(() => {
        thinkingElement?.classList.add("is-visible");
    });

    scrollToThinking();
}

function hide() {
    if (!thinkingElement) return;

    thinkingElement.classList.remove("is-visible");

    const element = thinkingElement;

    setTimeout(() => {
        if (element === thinkingElement && element.isConnected) {
            element.remove();
            thinkingElement = null;
        }
    }, 220);
}

function isVisible() {
    return Boolean(
        thinkingElement?.isConnected &&
        thinkingElement.classList.contains("is-visible")
    );
}

window.AdumexThinking = {
    show,
    hide,
    isVisible
};