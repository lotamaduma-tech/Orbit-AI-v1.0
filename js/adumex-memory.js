"use strict";

/* Adumex AI memory */

(() => {

    const API_URL = String(
        window.ADUMEX_API_URL ||
        "http://localhost:5000/api/chat"
    )
        .replace(/\/+$/, "")
        .replace(/\/chat$/, "");

    const MEMORY_URL = `${API_URL}/memories`;

    let memory = [];
    let cacheKey = "adumex-memory-cache";

    function cleanText(value, maxLength = 1000) {

        return String(value || "")
            .replace(/\u0000/g, "")
            .trim()
            .slice(0, maxLength);
    }

    function uniqueMemory(items) {

        return [
            ...new Set(
                items
                    .map(cleanText)
                    .filter(Boolean)
            )
        ].slice(-50);
    }

    async function getSession() {

        const client =
            window.adumexSupabase ||
            window.AdumexSupabase?.getClient?.();

        if (!client) {
            return null;
        }

        try {

            const {
                data,
                error
            } = await client.auth.getSession();

            if (error) {
                return null;
            }

            return data?.session || null;

        } catch {

            return null;
        }
    }

    function saveCache(items) {

        try {

            localStorage.setItem(
                cacheKey,
                JSON.stringify(items)
            );

        } catch {
            /* Ignore cache errors */
        }
    }

    function loadCache() {

        try {

            const stored = localStorage.getItem(
                cacheKey
            );

            if (!stored) {
                return [];
            }

            const parsed = JSON.parse(stored);

            return Array.isArray(parsed)
                ? uniqueMemory(parsed)
                : [];

        } catch {

            return [];
        }
    }

    async function request(
        url,
        options = {}
    ) {

        const session = await getSession();

        if (!session?.access_token) {
            return null;
        }

        const response = await fetch(
            url,
            {
                ...options,
                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${session.access_token}`,

                    ...(options.headers || {})
                }
            }
        );

        if (!response.ok) {

            throw new Error(
                `Memory request failed: ${response.status}`
            );
        }

        return response.json();
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

    async function load() {
        const session = await getSession();

        if (!session?.access_token) {
            memory = [];
            return memory;
        }

        cacheKey = `adumex-memory-cache:${session.user.id}`;
        memory = loadCache();

        try {

            const result = await request(
                MEMORY_URL
            );

            if (Array.isArray(result?.memories)) {

                memory = uniqueMemory(
                    result.memories
                );

                saveCache(memory);
            }

        } catch (error) {

            console.warn(
                "Adumex memory load failed:",
                error.message
            );
        }

        return memory;
    }

    async function rememberFromMessage(
        message
    ) {

        const detected =
            detectMemory(message);

        if (!detected) {
            return false;
        }

        if (
            memory.some(
                item =>
                    item.toLowerCase() ===
                    detected.toLowerCase()
            )
        ) {
            return true;
        }

        memory = uniqueMemory([
            ...memory,
            detected
        ]);

        saveCache(memory);

        const session = await getSession();

        if (!session?.access_token) {
            return true;
        }

        try {

            await request(
                MEMORY_URL,
                {
                    method: "POST",

                    body: JSON.stringify({
                        memory: detected
                    })
                }
            );

        } catch (error) {

            console.warn(
                "Adumex memory save failed:",
                error.message
            );
        }

        return true;
    }

    function getMemory() {

        return [...memory];
    }

    function getMemoryForChat() {

        return memory.join("\n");
    }

    async function clear() {

        const session = await getSession();

        memory = [];

        try {

            localStorage.removeItem(
                cacheKey
            );

        } catch {
            /* Ignore cache errors */
        }

        if (!session?.access_token) {
            return true;
        }

        try {

            await request(
                MEMORY_URL,
                {
                    method: "DELETE"
                }
            );

            return true;

        } catch {

            return false;
        }
    }

    window.AdumexMemory = {

        load,

        getMemory,

        getMemoryForChat,

        rememberFromMessage,

        clear,

        detectMemory
    };

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            load();
        }
    );

})();