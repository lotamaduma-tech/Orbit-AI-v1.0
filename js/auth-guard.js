"use strict";

/* The backend remains the authorization boundary. Transient errors do not sign out users. */
(async () => {
    try {
        const session = await window.AdumexApi.session();
        const task = window.AdumexApi.scope(null, 10000, "Authentication verification timed out.");
        let result;
        try { result = await window.AdumexApi.wait(window.adumexSupabase.auth.getUser(), task.signal); }
        finally { task.dispose(); }
        if (result.error) {
            if ([401, 403].includes(result.error.status)) {
                await window.adumexSupabase.auth.signOut({ scope: "local" });
                window.location.replace("login.html");
                return;
            }
            throw new Error("Authentication is temporarily unavailable. Please retry.");
        }
        if (!result.data?.user || result.data.user.id !== session.user.id) {
            window.location.replace("login.html"); return;
        }
        window.AdumexAuth = { authenticated: true, user: result.data.user, session };
        window.dispatchEvent(new CustomEvent("adumex:auth-ready", { detail: { user: result.data.user } }));
    } catch (error) {
        if (error.message === "Authentication required. Please sign in again.") window.location.replace("login.html");
        else {
            console.warn("Adumex authentication could not be checked. Please retry.");
            window.dispatchEvent(new CustomEvent("adumex:error", { detail: { error: error.message } }));
        }
    }
    window.addEventListener("adumex:account-changed", event => {
        if (!event.detail?.user) window.location.replace("login.html");
    });
})();
