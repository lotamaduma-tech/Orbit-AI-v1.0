"use strict";

(async function protectOrbit() {
    try {
        const {
            data: { session },
            error,
        } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("Authentication check failed:", error);
            window.location.replace("login.html");
            return;
        }

        if (!session) {
            window.location.replace("login.html");
            return;
        }

        window.ORBIT_USER = session.user;

        console.log("Orbit user authenticated:", session.user.id);
    } catch (error) {
        console.error("Authentication guard failed:", error);
        window.location.replace("login.html");
    }
})();