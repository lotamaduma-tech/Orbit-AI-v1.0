"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector("#command-input");
    const sendButton = document.querySelector("#send-btn");
    const menuToggle = document.querySelector("#menu-toggle");
    const menuClose = document.querySelector("#menu-close");
    const sidebar = document.querySelector("#adumex-sidebar");

    if (!input) return;

    function isGenerating() {
        return Boolean(window.AdumexAI?.getState?.().generating);
    }

    function focusInput() {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }

    function resizeInput() {
        input.style.height = "auto";

        const maxHeight = 180;
        const nextHeight = Math.min(input.scrollHeight, maxHeight);

        input.style.height = `${nextHeight}px`;
        input.style.overflowY =
            input.scrollHeight > maxHeight ? "auto" : "hidden";
    }

    function send() {
        const text = input.value.trim();

        if (!text && !input.files?.length) {
            focusInput();
            return;
        }

        if (isGenerating()) return;

        if (window.AdumexAI?.sendMessage) {
            window.AdumexAI.sendMessage();
        }
    }

    function toggleSidebar() {
        if (menuToggle) {
            menuToggle.click();
        }
    }

    function closeSidebar() {
        if (menuClose) {
            menuClose.click();
        }
    }

    input.addEventListener("keydown", event => {
        if (event.key !== "Enter") return;

        if (event.shiftKey) {
            return;
        }

        event.preventDefault();

        if (isGenerating()) return;

        send();
    });

    input.addEventListener("input", () => {
        resizeInput();

        window.dispatchEvent(
            new CustomEvent("adumex:input-change", {
                detail: {
                    value: input.value
                }
            })
        );
    });

    input.addEventListener("paste", () => {
        requestAnimationFrame(resizeInput);
    });

    input.addEventListener("cut", () => {
        requestAnimationFrame(resizeInput);
    });

    input.addEventListener("focus", () => {
        resizeInput();
    });

    if (sendButton) {
        sendButton.addEventListener("click", event => {
            event.preventDefault();

            if (isGenerating()) {
                window.AdumexAI?.stopGeneration?.();
                return;
            }

            send();
        });
    }

    document.addEventListener("keydown", event => {
        const modifier = event.ctrlKey || event.metaKey;

        if (modifier && event.key.toLowerCase() === "k") {
            event.preventDefault();
            focusInput();
            return;
        }

        if (
            modifier &&
            event.shiftKey &&
            event.key.toLowerCase() === "o"
        ) {
            event.preventDefault();
            toggleSidebar();
            return;
        }

        if (event.key === "Escape") {
            if (isGenerating()) {
                event.preventDefault();
                window.AdumexAI?.stopGeneration?.();
                return;
            }

            if (sidebar?.classList.contains("is-open")) {
                event.preventDefault();
                closeSidebar();
            }
        }
    });

    resizeInput();
});