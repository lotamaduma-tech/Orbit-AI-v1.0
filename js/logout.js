/* Orbit AI logout */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const logoutButton =
        document.getElementById("logout-btn");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

            window.location.replace("login.html");

        } catch (error) {
            console.error(
                "Logout error:",
                error
            );

            logoutButton.disabled = false;
        }
    });
});