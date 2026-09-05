"use strict";

/* Set ADUMEX_API_URL before this script for a separate deployed backend.
 * Otherwise production uses the frontend origin's /api reverse proxy. */
(() => {
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
    function normalizeBase(value) {
        const url = new URL(value || (local ? "http://localhost:5000" : location.origin), location.origin);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid Adumex API protocol.");
        if (!local && url.protocol !== "https:") throw new Error("Production Adumex API requires HTTPS.");
        url.search = "";
        url.hash = "";
        url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/api(?:\/chat)?$/, "") + "/api";
        return url.href.replace(/\/+$/, "");
    }
    const base = normalizeBase(window.ADUMEX_API_BASE || window.ADUMEX_API_URL);
    window.ADUMEX_API_BASE = base;
    window.ADUMEX_API_URL = base + "/chat";

    function scope(parent, timeout = 15000, message = "Adumex request timed out.") {
        const controller = new AbortController();
        const abort = () => controller.abort(parent.reason || new DOMException("Response stopped.", "AbortError"));
        if (parent?.aborted) abort();
        else parent?.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(() => controller.abort(new DOMException(message, "TimeoutError")), timeout);
        return { controller, signal: controller.signal, dispose() {
            clearTimeout(timer);
            parent?.removeEventListener("abort", abort);
        } };
    }
    function wait(promise, signal) {
        return new Promise((resolve, reject) => {
            const abort = () => reject(signal.reason || new DOMException("Response stopped.", "AbortError"));
            if (signal.aborted) { abort(); return; }
            signal.addEventListener("abort", abort, { once: true });
            Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
        });
    }
    async function session(signal) {
        const task = scope(signal, 10000, "Authentication timed out. Please retry.");
        try {
            task.signal.throwIfAborted();
            const client = window.adumexSupabase || window.AdumexSupabase?.getClient?.();
            if (!client?.auth) throw new Error("Adumex authentication is not initialized.");
            const result = await wait(client.auth.getSession(), task.signal);
            if (result.error || !result.data?.session?.access_token) {
                throw new Error("Authentication required. Please sign in again.");
            }
            return result.data.session;
        } finally { task.dispose(); }
    }
    async function json(path, options = {}, expectedUserId) {
        const task = scope(options.signal);
        try {
            const current = await session(task.signal);
            if (expectedUserId && current.user.id !== expectedUserId) throw new Error("The signed-in account changed.");
            const response = await wait(fetch(base + path, {
                ...options, signal: task.signal, credentials: "omit",
                headers: { "Content-Type": "application/json", ...options.headers, Authorization: "Bearer " + current.access_token }
            }), task.signal);
            const data = await wait(response.json().catch(() => null), task.signal);
            if (!response.ok) throw new Error(data?.error || "Adumex request failed (" + response.status + ").");
            if (!data) throw new Error("Adumex returned an invalid response.");
            return data;
        } finally { task.dispose(); }
    }
    window.AdumexApi = { base, normalizeBase, scope, wait, session, json };
})();

window.ADUMEX_SUPABASE_URL =
    "https://xnhscrugektzhxatgccl.supabase.co";

window.ADUMEX_SUPABASE_KEY =
    "sb_publishable_QPys1fzM388AxhSqwum1hw_IC4Q6kzu";



