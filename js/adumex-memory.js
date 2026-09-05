"use strict";

/* Authenticated Adumex memory; settings only renders this source. */
(() => {
    let memory = [], userId = null, revision = 0;
    let queue = Promise.resolve();
    const operations = new Set();
    const cleanText = (value, maxLength = 1000) => String(value || "").replace(/\u0000/g, "").trim().slice(0, maxLength);
    const uniqueMemory = items => [...new Set(items.map(item => cleanText(item)).filter(Boolean))].slice(-50);
    const enabled = () => window.AdumexSettings?.getValue?.("memory") !== false;
    const key = () => "adumex-memory-cache:" + userId;
    function saveCache() {
        if (!userId) return;
        try { localStorage.setItem(key(), JSON.stringify(memory)); } catch { /* Optional cache. */ }
    }
    function switchAccount(id) {
        if (id === userId) return;
        revision++;
        for (const controller of operations) controller.abort();
        userId = id || null;
        memory = [];
        if (userId) {
            try { memory = uniqueMemory(JSON.parse(localStorage.getItem(key()) || "[]")); } catch { memory = []; }
        }
    }
    async function request(options, owner) {
        const controller = new AbortController();
        operations.add(controller);
        try { return await window.AdumexApi.json("/memories", { ...options, signal: controller.signal }, owner); }
        finally { operations.delete(controller); }
    }
    async function load(strict = false) {
        const start = revision;
        try {
            const session = await window.AdumexApi.session();
            if (start !== revision) return [...memory];
            switchAccount(session.user.id);
            const owner = userId, version = revision;
            const result = await request({}, owner);
            if (owner === userId && version === revision) { memory = uniqueMemory(result.memories || []); saveCache(); }
        } catch (error) { if (strict) throw error; console.warn("Adumex memory load failed."); }
        return [...memory];
    }
    function serialize(action) {
        const result = queue.then(action);
        queue = result.catch(() => {});
        return result;
    }
    function detectMemory(message) {

        const text = cleanText(
            message,
            2000
        );

        if (!text) {
            return null;
        }

        const patterns = [

            /^(?:my name is|i am|i'm)\s+([a-z][a-z\s'-]{1,40})[.!]?$/i,

            /^(?:call me|you can call me)\s+([a-z][a-z\s'-]{1,40})[.!]?$/i,

            /^remember (?:that )?my name is\s+([a-z][a-z\s'-]{1,40})[.!]?$/i

        ];

        for (const pattern of patterns) {

            const match = text.match(pattern);

            if (!match) {
                continue;
            }

            const name = cleanText(
                match[1],
                50
            );

            if (!name) {
                return null;
            }

            return `User's name is ${name}.`;
        }

        return null;
    }


    function rememberFromMessage(message, expectedUserId) {
        const detected = detectMemory(message);
        const version = revision;
        if (!detected || !enabled()) return Promise.resolve(false);
        return serialize(async () => {
            if (!enabled() || version !== revision) return false;
            const session = await window.AdumexApi.session();
            if (version !== revision || (expectedUserId && session.user.id !== expectedUserId)) return false;
            switchAccount(session.user.id);
            const owner = userId, operationVersion = revision;
            if (memory.includes(detected)) return true;
            await request({ method: "POST", body: JSON.stringify({ memory: detected }) }, owner);
            if (owner !== userId || operationVersion !== revision || !enabled()) return false;
            memory = uniqueMemory([...memory, detected]); saveCache();
            return true;
        });
    }
    function remove(text) { return erase(text); }
    function clear() { return erase(); }
    function erase(text) {
        revision++;
        for (const controller of operations) controller.abort();
        const version = revision, expected = userId;
        return serialize(async () => {
            const session = await window.AdumexApi.session();
            if (version !== revision || (expected && expected !== session.user.id)) throw new Error("The signed-in account changed.");
            switchAccount(session.user.id);
            const owner = userId, operationVersion = revision;
            await request({ method: "DELETE", ...(text ? { body: JSON.stringify({ memory: text }) } : {}) }, owner);
            if (owner !== userId || operationVersion !== revision) return false;
            memory = text ? memory.filter(item => item !== text) : []; saveCache();
            return true;
        });
    }
    function setEnabled(value) {
        if (!value) { revision++; for (const controller of operations) controller.abort(); }
    }
    window.AdumexMemory = { load, getMemory: () => [...memory], getMemoryForChat: () => enabled() ? memory.join("\n") : "", rememberFromMessage, clear, remove, detectMemory, setEnabled };
    window.addEventListener("adumex:account-changed", event => { switchAccount(event.detail?.user?.id || null); if (userId) load(); });
    document.addEventListener("DOMContentLoaded", () => load());
})();
