/* Orbit AI authentication guard */

"use strict";

(async function () {
    try {
        if (typeof supabaseClient === "undefined") {
            console.error("Supabase client is not available.");
            window.location.replace("login.html");
            return;
        }

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error(
                "Authentication check failed:",
                error
            );

            window.location.replace("login.html");
            return;
        }

        if (!data || !data.session) {
            window.location.replace("login.html");
            return;
        }

    } catch (error) {
        console.error(
            "Authentication guard error:",
            error
        );

        window.location.replace("login.html");
    }
})();