"use strict";

/* Adumex AI Supabase */

const SUPABASE_URL =
    "https://xnhscrugektzhxatgccl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_QPys1fzM388AxhSqwum1hw_IC4Q6kzu";

let supabaseClient = null;

function initializeAdumexSupabase() {
    if (supabaseClient) {
        return supabaseClient;
    }

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {
        console.error(
            "Adumex Supabase: Supabase library is unavailable."
        );

        return null;
    }

    try {
        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                        storage: window.localStorage
                    }
                }
            );

        window.adumexSupabase = supabaseClient;
        let currentUserId;
        let authVersion = 0;
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            const version = ++authVersion;
            // Leave the Supabase auth callback before consumers request sessions.
            setTimeout(() => {
                if (version !== authVersion) return;
                const user = session?.user || null;
                window.AdumexAuth = { authenticated: Boolean(user), user, session };
                if (currentUserId !== (user?.id || null)) {
                    currentUserId = user?.id || null;
                    window.dispatchEvent(new CustomEvent("adumex:account-changed", { detail: { user } }));
                }
            }, 0);
        });

        return supabaseClient;
    } catch (error) {
        console.error(
            "Adumex Supabase initialization failed:",
            error
        );

        return null;
    }
}

initializeAdumexSupabase();

window.AdumexSupabase = {
    getClient() {
        return supabaseClient;
    }
};
