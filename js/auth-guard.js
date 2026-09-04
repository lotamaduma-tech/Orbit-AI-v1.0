"use strict";

/* Adumex AI authentication guard */

(async function () {
    /* Prevent normal page interaction while checking */

    document.documentElement.classList.add(
        "adumex-auth-checking"
    );

    const AUTH_PAGE = "signup.html";
    const APP_PAGE = "index.html";

    function redirectToSignup() {
        const currentUrl =
            window.location.pathname +
            window.location.search +
            window.location.hash;

        if (
            currentUrl.includes("signup.html") ||
            currentUrl.includes("login.html")
        ) {
            return;
        }

        window.location.replace(AUTH_PAGE);
    }

    function getSupabaseClient() {
        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        if (
            typeof window.supabaseClient !== "undefined" &&
            window.supabaseClient
        ) {
            return window.supabaseClient;
        }

        if (
            typeof window.adumexSupabase !== "undefined" &&
            window.adumexSupabase
        ) {
            return window.adumexSupabase;
        }

        return null;
    }

    function finishGuard() {
        document.documentElement.classList.remove(
            "adumex-auth-checking"
        );
    }

    try {
        const client = getSupabaseClient();

        /* Supabase must be available */

        if (!client) {
            console.error(
                "Adumex authentication guard: Supabase client unavailable."
            );

            redirectToSignup();
            return;
        }

        /* Check the current authenticated session */

        const {
            data,
            error
        } = await client.auth.getSession();

        if (error) {
            console.error(
                "Adumex authentication check failed:",
                error
            );

            redirectToSignup();
            return;
        }

        const session = data?.session;

        /* No valid session */

        if (
            !session ||
            !session.user ||
            !session.user.id ||
            !session.access_token
        ) {
            redirectToSignup();
            return;
        }

        /* Verify the authenticated user */

        const {
            data: userData,
            error: userError
        } = await client.auth.getUser();

        if (userError || !userData?.user) {
            console.error(
                "Adumex authenticated user verification failed:",
                userError
            );

            await client.auth.signOut();

            redirectToSignup();
            return;
        }

        /* Confirm the session user matches the verified user */

        if (
            userData.user.id !==
            session.user.id
        ) {
            console.error(
                "Adumex authentication identity mismatch."
            );

            await client.auth.signOut();

            redirectToSignup();
            return;
        }

        /* Authentication is valid */

        window.AdumexAuth = {
            authenticated: true,
            user: userData.user,
            session: session
        };

        window.dispatchEvent(
            new CustomEvent("adumex:auth-ready", {
                detail: {
                    user: userData.user
                }
            })
        );

        finishGuard();

        console.log(
            "Adumex authentication verified."
        );

        /* Monitor authentication changes */

        client.auth.onAuthStateChange(
            (event, updatedSession) => {
                if (event === "SIGNED_OUT") {
                    window.AdumexAuth = {
                        authenticated: false,
                        user: null,
                        session: null
                    };

                    redirectToSignup();

                    return;
                }

                if (
                    event === "TOKEN_REFRESHED" &&
                    !updatedSession
                ) {
                    redirectToSignup();

                    return;
                }

                if (
                    event === "SIGNED_IN" &&
                    updatedSession?.user
                ) {
                    window.AdumexAuth = {
                        authenticated: true,
                        user: updatedSession.user,
                        session: updatedSession
                    };
                }
            }
        );

    } catch (error) {
        console.error(
            "Adumex authentication guard error:",
            error
        );

        try {
            const client = getSupabaseClient();

            if (client) {
                await client.auth.signOut();
            }
        } catch (signOutError) {
            console.error(
                "Adumex authentication cleanup failed:",
                signOutError
            );
        }

        redirectToSignup();
        return;
    } finally {
        finishGuard();
    }
})();
