"use strict";

/* Clear only the current authenticated account's actual backend history. */
document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("clear-history-btn");
    button?.addEventListener("click", async () => {
        if (button.disabled || !window.confirm("Clear your conversation history? This cannot be undone.")) return;
        const original = button.innerHTML;
        button.disabled = true;
        try {
            const session = await window.AdumexApi.session();
            await window.AdumexApi.json("/conversations", { method: "DELETE" }, session.user.id);
            for (const key of ["adumex-conversation-history", "adumex-active-chat", "adumex-server-conversations"]) {
                localStorage.removeItem(key + ":" + session.user.id);
            }
            window.dispatchEvent(new CustomEvent("adumex:history-cleared"));
            button.textContent = "History cleared";
        } catch (error) { window.alert(error.message || "Unable to clear history."); }
        finally { button.disabled = false; setTimeout(() => { button.innerHTML = original; }, 1800); }
    });
});
