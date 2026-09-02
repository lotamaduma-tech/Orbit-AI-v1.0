"use strict";

(() => {
    const configuredApi = String(window.ORBIT_API_URL || "https://orbit-ai-v1-0.onrender.com/api/chat").replace(/\/$/, "");
    const API = configuredApi.endsWith("/chat") ? configuredApi.slice(0, -5) : configuredApi.replace(/\/api$/, "") + "/api";
    const CHAT_URL = `${API}/chat`;
    const HISTORY_LIMIT = 30;
    const MAX_MESSAGE_LENGTH = 20000;
    const SERVER_CONVERSATIONS_KEY = "orbit-server-conversations";

    const state = {
        messages: [],
        conversationId: null,
        chatId: null,
        generating: false,
        controller: null,
        assistantElement: null,
        assistantText: "",
        initialized: false
    };

    function getChatWindow() {
        return document.getElementById("chat-window");
    }

    function getInput() {
        return document.getElementById("command-input");
    }

    function getSendButton() {
        return document.getElementById("send-btn");
    }

    function cleanText(value, maxLength = MAX_MESSAGE_LENGTH) {
        return String(value || "").replace(/\u0000/g, "").slice(0, maxLength).trim();
    }

    function normalizeMessages(messages) {
        return Array.isArray(messages)
            ? messages
                .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
                .map(item => ({ role: item.role, content: cleanText(item.content) }))
                .filter(item => item.content)
                .slice(-HISTORY_LIMIT)
            : [];
    }

    function emit(name, detail = {}) {
        window.dispatchEvent(new CustomEvent(`orbit:${name}`, { detail }));
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeUrl(value) {
        try {
            const url = new URL(String(value || "").trim(), window.location.href);
            return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "";
        } catch {
            return "";
        }
    }

    function linkHtml(label, url) {
        const href = safeUrl(url);
        return href
            ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
            : escapeHtml(label);
    }

    function renderInline(text) {
        const tokens = [];
        const token = html => `\u0000ORB${tokens.push(html) - 1}\u0000`;
        const source = String(text || "").replace(/`([^`\n]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|(https?:\/\/[^\s<]+)/g, (match, code, label, markdownUrl, bareUrl) => {
            if (code !== undefined) return token(`<code>${escapeHtml(code)}</code>`);
            if (label !== undefined) return token(linkHtml(label, markdownUrl));
            const url = bareUrl.replace(/[.,;:!?]+$/, "");
            const punctuation = bareUrl.slice(url.length);
            return token(linkHtml(url, url) + escapeHtml(punctuation));
        });

        let html = escapeHtml(source)
            .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
            .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
            .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
            .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

        return html.replace(/\u0000ORB(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");
    }

    function renderMarkdown(markdown) {
        const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
        const output = [];
        let code = null;
        let list = null;

        const closeList = () => {
            if (list) output.push(`</${list}>`);
            list = null;
        };

        const closeCode = () => {
            if (!code) return;
            const language = code.language ? `<span class="code-language">${escapeHtml(code.language)}</span>` : "";
            output.push(`<div class="orbit-code-block"><div class="orbit-code-header">${language}<button type="button" class="orbit-copy-code" data-code="${escapeHtml(code.lines.join("\n"))}">Copy</button></div><pre><code>${escapeHtml(code.lines.join("\n"))}</code></pre></div>`);
            code = null;
        };

        for (const line of lines) {
            const fence = line.match(/^```\s*([^\s]*)\s*$/);
            if (fence) {
                if (code) closeCode();
                else {
                    closeList();
                    code = { language: fence[1], lines: [] };
                }
                continue;
            }
            if (code) {
                code.lines.push(line);
                continue;
            }

            const heading = line.match(/^(#{1,6})\s+(.+)$/);
            const ordered = line.match(/^\d+\.\s+(.+)$/);
            const unordered = line.match(/^[-*+]\s+(.+)$/);
            if (heading) {
                closeList();
                const level = heading[1].length;
                output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
            } else if (ordered || unordered) {
                const type = ordered ? "ol" : "ul";
                if (list !== type) {
                    closeList();
                    list = type;
                    output.push(`<${list}>`);
                }
                output.push(`<li>${renderInline((ordered || unordered)[1])}</li>`);
            } else if (!line.trim()) {
                closeList();
            } else {
                closeList();
                output.push(`<p>${renderInline(line)}</p>`);
            }
        }

        closeList();
        closeCode();
        return output.join("");
    }

    function scrollToResponse(element, behavior = "smooth") {
        if (!element) return;
        const container = getChatWindow();
        if (!container) return;
        const top = element.offsetTop - container.offsetTop - 16;
        container.scrollTo({ top: Math.max(0, top), behavior });
    }

    function hideIntro() {
        document.getElementById("chat-intro")?.remove();
        window.OrbitQuickReplies?.hide?.();
    }

    function createMessage(role, text = "") {
        const container = getChatWindow();
        if (!container) return null;
        hideIntro();
        const message = document.createElement("article");
        message.className = `message orbit-message ${role === "user" ? "user-message" : "assistant-message"}`;
        message.dataset.role = role;
        const content = document.createElement("div");
        content.className = "message-content orbit-message-content";
        message.appendChild(content);
        container.appendChild(message);
        renderMessage(message, text);
        return message;
    }

    function renderMessage(element, text) {
        const content = element?.querySelector(".orbit-message-content");
        if (!content) return;
        content.innerHTML = element.dataset.role === "assistant" ? renderMarkdown(text) : escapeHtml(text).replace(/\n/g, "<br>");
    }

    function bindCopyButtons(root) {
        root?.querySelectorAll(".orbit-copy-code").forEach(button => {
            if (button.dataset.bound) return;
            button.dataset.bound = "true";
            button.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(button.dataset.code || "");
                    button.textContent = "Copied";
                    setTimeout(() => { button.textContent = "Copy"; }, 1400);
                } catch { }
            });
        });
    }

    async function getAccessToken() {
        const client = window.supabaseClient || window.supabase;
        if (client?.auth?.getSession) {
            try {
                return (await client.auth.getSession()).data?.session?.access_token || null;
            } catch { }
        }
        if (typeof window.getSupabaseAccessToken === "function") {
            try { return await window.getSupabaseAccessToken(); } catch { }
        }
        return localStorage.getItem("access_token") || null;
    }

    function getServerConversation(chatId) {
        try { return JSON.parse(localStorage.getItem(SERVER_CONVERSATIONS_KEY) || "{}")[chatId] || null; } catch { return null; }
    }

    function setServerConversation(chatId, conversationId) {
        if (!chatId || !conversationId) return;
        try {
            const values = JSON.parse(localStorage.getItem(SERVER_CONVERSATIONS_KEY) || "{}");
            values[chatId] = conversationId;
            localStorage.setItem(SERVER_CONVERSATIONS_KEY, JSON.stringify(values));
        } catch { }
    }

    function getFiles() {
        return window.orbitTools?.getAllSelectedFiles?.() || window.orbitTools?.getSelectedFiles?.() || [];
    }

    function setGenerating(value) {
        state.generating = value;
        const button = getSendButton();
        if (button) button.disabled = value;
        getInput()?.setAttribute("aria-busy", String(value));
    }

    function updateHistoryUi() {
        if (!state.chatId) return;
        const title = state.messages.find(item => item.role === "user")?.content.slice(0, 42) || "New chat";
        emit("chat-updated", { id: state.chatId, title, messages: state.messages });
    }

    async function processSse(response) {
        if (!response.body) throw new Error("The server returned no response stream.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let complete = null;

        const process = block => {
            const data = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
            if (!data || data === "[DONE]") return;
            let payload;
            try { payload = JSON.parse(data); } catch { return; }
            if (payload.type === "error") throw new Error(payload.error || "Orbit could not complete the request.");
            if (payload.type === "text" && payload.token) {
                state.assistantText += payload.token;
                renderMessage(state.assistantElement, state.assistantText);
            }
            if (payload.type === "image") renderImage(payload);
            if (payload.type === "complete") complete = payload;
        };

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() || "";
            blocks.forEach(process);
        }
        buffer += decoder.decode();
        if (buffer.trim()) process(buffer);
        return complete;
    }

    function renderImage(payload) {
        const source = safeUrl(payload.url || payload.imageUrl || "");
        if (!source) return;
        const message = createMessage("assistant", "");
        const content = message?.querySelector(".orbit-message-content");
        if (!content) return;
        const image = document.createElement("img");
        image.className = "orbit-generated-image";
        image.src = source;
        image.alt = "Image generated by Orbit AI";
        content.replaceChildren(image);
    }

    async function sendMessage(value) {
        if (state.generating) return { success: false, error: "Orbit is still responding." };
        const input = getInput();
        const message = cleanText(typeof value === "string" ? value : input?.value);
        if (!message) return { success: false, error: "Message cannot be empty." };

        if (!state.chatId) {
            const chat = window.orbitRecentChats?.createChat?.();
            state.chatId = chat?.id || `chat_${Date.now()}`;
        }
        state.conversationId ||= getServerConversation(state.chatId);
        const files = getFiles();
        const history = normalizeMessages(state.messages);
        state.messages.push({ role: "user", content: message });
        const userElement = createMessage("user", message);
        state.assistantElement = createMessage("assistant", "");
        state.assistantText = "";
        if (input) {
            input.value = "";
            input.style.height = "auto";
        }
        window.orbitTools?.clearSelectedFiles?.();
        setGenerating(true);
        emit("add-message", { id: state.chatId, message: { role: "user", content: message } });

        try {
            const formData = new FormData();
            formData.append("message", message);
            formData.append("history", JSON.stringify(history));
            if (state.conversationId) formData.append("conversationId", state.conversationId);
            files.forEach(file => formData.append("files", file));
            const token = await getAccessToken();
            const headers = { Accept: "text/event-stream" };
            if (token) headers.Authorization = `Bearer ${token}`;
            state.controller = new AbortController();
            const response = await fetch(CHAT_URL, { method: "POST", headers, body: formData, signal: state.controller.signal, credentials: "omit" });
            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.error || `Orbit server error (${response.status}).`);
            }
            const complete = await processSse(response);
            const reply = cleanText(complete?.reply || state.assistantText, 50000);
            if (!reply) throw new Error("Orbit returned an empty response.");
            state.messages.push({ role: "assistant", content: reply });
            state.conversationId = complete?.conversationId || state.conversationId;
            setServerConversation(state.chatId, state.conversationId);
            bindCopyButtons(state.assistantElement);
            scrollToResponse(state.assistantElement);
            emit("add-message", { id: state.chatId, message: { role: "assistant", content: reply } });
            updateHistoryUi();
            emit("message-complete", { conversationId: state.conversationId, response: reply });
            return { success: true, response: reply, conversationId: state.conversationId };
        } catch (error) {
            const messageText = error?.name === "AbortError" ? "Response stopped." : cleanText(error?.message || "Orbit could not complete the request.", 3000);
            renderMessage(state.assistantElement, `**Orbit error:** ${messageText}`);
            scrollToResponse(state.assistantElement);
            emit("error", { error: messageText });
            return { success: false, error: messageText };
        } finally {
            state.controller = null;
            state.assistantElement = null;
            state.assistantText = "";
            setGenerating(false);
        }
    }

    function renderConversation(messages) {
        const container = getChatWindow();
        if (!container) return;
        container.innerHTML = "";
        state.messages = normalizeMessages(messages);
        state.messages.forEach(item => {
            const element = createMessage(item.role, item.content);
            if (item.role === "assistant") bindCopyButtons(element);
        });
        if (!state.messages.length) window.OrbitQuickReplies?.show?.();
    }

    async function openChat(chat) {
        state.chatId = chat?.id || null;
        state.conversationId = state.chatId ? getServerConversation(state.chatId) : null;
        renderConversation(chat?.messages || []);
        if (!state.conversationId) return;
        try {
            const token = await getAccessToken();
            const response = await fetch(`${API}/conversations/${encodeURIComponent(state.conversationId)}/messages`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (response.ok) renderConversation((await response.json()).messages || []);
        } catch { }
    }

    function newChat(chat) {
        state.chatId = chat?.id || null;
        state.conversationId = null;
        renderConversation([]);
        getInput()?.focus();
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        getSendButton()?.addEventListener("click", () => sendMessage());
        getInput()?.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                event.stopImmediatePropagation();
                sendMessage();
            }
        });
        window.addEventListener("orbit:new-chat", event => newChat(event.detail?.chat));
        window.addEventListener("orbit:open-chat", event => openChat(event.detail?.chat));
        window.addEventListener("orbit:chat-deleted", event => {
            if (event.detail?.chat?.id === state.chatId) newChat(null);
        });
        window.OrbitAI = { sendMessage, stopGeneration: () => state.controller?.abort(), renderMarkdown, openChat, newChat };
        window.loadOrbitConversation = (messages, conversationId) => {
            state.conversationId = conversationId || null;
            renderConversation(messages);
        };
        window.startOrbitNewChat = () => newChat(null);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
