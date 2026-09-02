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
