"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const greetingElement = document.querySelector("#chat-welcome-greeting");
    const welcomeElement = document.querySelector("#chat-welcome");
    const inputElement = document.querySelector("#command-input");
    const chatWindow = document.querySelector("#chat-window");

    if (!greetingElement || !welcomeElement || !inputElement || !chatWindow) {
        return;
    }

    const prompts = [
        "What can we debug?",
        "What can we build?",
        "What can we solve?",
        "What can we create?"
    ];

    let currentPeriod = "";

    function getPeriod() {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return "morning";
        }

        if (hour >= 12 && hour < 17) {
            return "afternoon";
        }

        return "evening";
    }

    function getGreeting(period) {
        if (period === "morning") {
            return "Good morning";
        }

        if (period === "afternoon") {
            return "Good afternoon";
        }

        return "Good evening";
    }

    function getEmoji(period) {
        if (period === "morning") {
            return "☀️";
        }

        if (period === "afternoon") {
            return "🌤️";
        }

        return "🌙";
    }

    async function getUserName() {
        try {
            const client =
                window.supabaseClient ||
                window.supabase ||
                null;

            if (!client?.auth?.getUser) {
                return "";
            }

            const result = await client.auth.getUser();
            const user = result?.data?.user;

            if (!user) {
                return "";
            }

            return String(
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.user_metadata?.display_name ||
                ""
            ).trim();
        } catch {
            return "";
        }
    }

    function getPrompt(period) {
        const day = new Date().getDate();

        const periodOffset = {
            morning: 0,
            afternoon: 1,
            evening: 2
        };

        const offset = periodOffset[period] || 0;

        return prompts[(day + offset) % prompts.length];
    }

    function updatePlaceholder(period) {
        if (inputElement.value.trim()) {
            return;
        }

        if (document.activeElement === inputElement) {
            return;
        }

        inputElement.placeholder = getPrompt(period);
    }

    async function updateGreeting() {
        const period = getPeriod();

        if (period !== currentPeriod) {
            currentPeriod = period;
            updatePlaceholder(period);
        }

        const name = await getUserName();

        if (name) {
            greetingElement.textContent =
                `${getGreeting(period)}, ${name} ${getEmoji(period)}`;
        } else {
            greetingElement.textContent =
                `${getGreeting(period)} ${getEmoji(period)}`;
        }

        updateVisibility();
    }

    function updateVisibility() {
        const hasMessages = chatWindow.children.length > 0;

        welcomeElement.hidden = hasMessages;
    }

    inputElement.addEventListener("input", () => {
        updateVisibility();
    });

    inputElement.addEventListener("focus", () => {
        updateVisibility();
    });

    inputElement.addEventListener("blur", () => {
        if (!inputElement.value.trim()) {
            updatePlaceholder(getPeriod());
        }

        updateVisibility();
    });

    window.addEventListener("adumex:new-chat", () => {
        inputElement.value = "";
        updateGreeting();
    });

    window.addEventListener("adumex:open-chat", () => {
        updateVisibility();
    });

    window.addEventListener("adumex:auth-ready", () => {
        updateGreeting();
    });

    setInterval(updateGreeting, 60000);

    updateGreeting();
});