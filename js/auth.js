
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /* Auth elements */

    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    const loginMessage = document.getElementById("login-message");
    const signupMessage = document.getElementById("signup-message");

    const AUTH_REDIRECT_URL =
        `${ window.location.origin }/index.html`;

/* Messages */

function showMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.className = `auth-message ${type} show`;
}

function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.className = "auth-message";
}

/* Button loading */

function setButtonLoading(button, loading, text) {
    if (!button) return;

    if (loading) {
        button.disabled = true;

        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }

        button.innerHTML = `
                <span class="auth-loading"></span>
                <span>${text}</span>
            `;

        return;
    }

    button.disabled = false;

    if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

/* Password visibility */

function setupPasswordToggle(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);

    if (!input || !button) return;

    button.addEventListener("click", () => {
        const isPassword = input.type === "password";

        input.type = isPassword ? "text" : "password";

        button.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );

        button.setAttribute(
            "title",
            isPassword ? "Hide password" : "Show password"
        );

        const icon = button.querySelector("i");

        if (icon) {
            icon.classList.toggle("fa-eye", !isPassword);
            icon.classList.toggle("fa-eye-slash", isPassword);
        }
    });
}

setupPasswordToggle(
    "login-password",
    "login-password-toggle"
);

setupPasswordToggle(
    "signup-password",
    "signup-password-toggle"
);

setupPasswordToggle(
    "signup-confirm-password",
    "signup-confirm-password-toggle"
);

/* Supabase */

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

    if (
        typeof window.supabase !== "undefined" &&
        typeof window.SUPABASE_URL !== "undefined" &&
        typeof window.SUPABASE_PUBLISHABLE_KEY !== "undefined"
    ) {
        if (!window.adumexSupabase) {
            window.adumexSupabase =
                window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_PUBLISHABLE_KEY
                );
        }

        return window.adumexSupabase;
    }

    console.error(
        "Adumex authentication: Supabase client is unavailable."
    );

    return null;
}

const authClient = getSupabaseClient();

if (!authClient) {
    showMessage(
        loginMessage,
        "Authentication is currently unavailable."
    );

    showMessage(
        signupMessage,
        "Authentication is currently unavailable."
    );

    return;
}

/* Session */

async function getCurrentSession() {
    try {
        const {
            data,
            error
        } = await authClient.auth.getSession();

        if (error) {
            console.error(
                "Adumex session check failed:",
                error
            );

            return null;
        }

        return data?.session || null;
    } catch (error) {
        console.error(
            "Adumex session error:",
            error
        );

        return null;
    }
}

/* Redirect authenticated users */

async function redirectIfLoggedIn() {
    const session = await getCurrentSession();

    if (!session) return;

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    if (
        currentPage === "login.html" ||
        currentPage === "signup.html" ||
        currentPage === ""
    ) {
        window.location.replace("index.html");
    }
}

redirectIfLoggedIn();

/* Signup */

if (signupForm) {
    signupForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            clearMessage(signupMessage);

            const emailInput =
                document.getElementById("signup-email");

            const passwordInput =
                document.getElementById("signup-password");

            const confirmPasswordInput =
                document.getElementById(
                    "signup-confirm-password"
                );

            const submitButton =
                document.getElementById("signup-submit");

            const email =
                emailInput?.value
                    .trim()
                    .toLowerCase() || "";

            const password =
                passwordInput?.value || "";

            const confirmPassword =
                confirmPasswordInput?.value || "";

            /* Validation */

            if (
                !email ||
                !password ||
                !confirmPassword
            ) {
                showMessage(
                    signupMessage,
                    "Please complete all fields."
                );

                return;
            }

            if (!emailInput?.checkValidity()) {
                showMessage(
                    signupMessage,
                    "Please enter a valid email address."
                );

                emailInput?.focus();

                return;
            }

            if (password.length < 6) {
                showMessage(
                    signupMessage,
                    "Password must be at least 6 characters."
                );

                passwordInput?.focus();

                return;
            }

            if (password !== confirmPassword) {
                showMessage(
                    signupMessage,
                    "Passwords do not match."
                );

                confirmPasswordInput?.focus();

                return;
            }

            setButtonLoading(
                submitButton,
                true,
                "Creating account..."
            );

            try {
                const {
                    data,
                    error
                } = await authClient.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo:
                            AUTH_REDIRECT_URL
                    }
                });

                if (error) {
                    throw error;
                }

                console.log(
                    "Adumex account created:",
                    data.user?.id
                );

                /* Immediate session */

                if (data.session) {
                    showMessage(
                        signupMessage,
                        "Account created successfully. Opening Adumex...",
                        "success"
                    );

                    setTimeout(() => {
                        window.location.replace(
                            "index.html"
                        );
                    }, 700);

                    return;
                }

                /* Email confirmation required */

                showMessage(
                    signupMessage,
                    "Account created successfully. Check your email to confirm your account.",
                    "success"
                );

                signupForm.reset();
            } catch (error) {
                console.error(
                    "Adumex signup error:",
                    error
                );

                const errorText =
                    error?.message?.toLowerCase() || "";

                let message =
                    "Could not create your account. Please try again.";

                if (
                    errorText.includes(
                        "already registered"
                    ) ||
                    errorText.includes(
                        "user already registered"
                    )
                ) {
                    message =
                        "An account with this email already exists.";
                } else if (
                    errorText.includes("password")
                ) {
                    message =
                        "Your password does not meet the requirements.";
                } else if (
                    errorText.includes("email")
                ) {
                    message =
                        "Please check that your email address is valid.";
                }

                showMessage(
                    signupMessage,
                    message
                );
            } finally {
                setButtonLoading(
                    submitButton,
                    false,
                    "Create account"
                );
            }
        }
    );
}

/* Login */

if (loginForm) {
    loginForm.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            clearMessage(loginMessage);

            const emailInput =
                document.getElementById("login-email");

            const passwordInput =
                document.getElementById("login-password");

            const submitButton =
                document.getElementById("login-submit");

            const email =
                emailInput?.value
                    .trim()
                    .toLowerCase() || "";

            const password =
                passwordInput?.value || "";

            /* Validation */

            if (!email || !password) {
                showMessage(
                    loginMessage,
                    "Please enter your email and password."
                );

                return;
            }

            if (!emailInput?.checkValidity()) {
                showMessage(
                    loginMessage,
                    "Please enter a valid email address."
                );

                emailInput?.focus();

                return;
            }

            setButtonLoading(
                submitButton,
                true,
                "Signing in..."
            );

            try {
                const {
                    data,
                    error
                } =
                    await authClient.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) {
                    throw error;
                }

                console.log(
                    "Adumex login successful:",
                    data.user?.id
                );

                showMessage(
                    loginMessage,
                    "Signed in successfully. Opening Adumex...",
                    "success"
                );

                setTimeout(() => {
                    window.location.replace(
                        "index.html"
                    );
                }, 500);
            } catch (error) {
                console.error(
                    "Adumex login error:",
                    error
                );

                const errorText =
                    error?.message?.toLowerCase() || "";

                let message =
                    "Could not sign in. Please check your email and password.";

                if (
                    errorText.includes(
                        "email not confirmed"
                    )
                ) {
                    message =
                        "Please confirm your email before signing in.";
                } else if (
                    errorText.includes(
                        "invalid login credentials"
                    )
                ) {
                    message =
                        "Incorrect email or password.";
                } else if (
                    errorText.includes(
                        "too many requests"
                    )
                ) {
                    message =
                        "Too many attempts. Please wait a moment and try again.";
                }

                showMessage(
                    loginMessage,
                    message
                );
            } finally {
                setButtonLoading(
                    submitButton,
                    false,
                    "Sign in"
                );
            }
        }
    );
}

/* Password reset */

const forgotPassword =
    document.getElementById("forgot-password");

if (forgotPassword) {
    forgotPassword.addEventListener(
        "click",
        async event => {
            event.preventDefault();

            clearMessage(loginMessage);

            const emailInput =
                document.getElementById("login-email");

            const email =
                emailInput?.value
                    .trim()
                    .toLowerCase() || "";

            if (!email) {
                showMessage(
                    loginMessage,
                    "Enter your email address first."
                );

                emailInput?.focus();

                return;
            }

            if (!emailInput?.checkValidity()) {
                showMessage(
                    loginMessage,
                    "Please enter a valid email address."
                );

                emailInput?.focus();

                return;
            }

            try {
                const {
                    error
                } =
                    await authClient.auth.resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                `${window.location.origin}/reset-password.html`
                        }
                    );

                if (error) {
                    throw error;
                }

                showMessage(
                    loginMessage,
                    "Password reset instructions have been sent to your email.",
                    "success"
                );
            } catch (error) {
                console.error(
                    "Adumex password reset error:",
                    error
                );

                showMessage(
                    loginMessage,
                    "Could not send password reset instructions. Please try again."
                );
            }
        }
    );
}

/* Auth state */

authClient.auth.onAuthStateChange(
    (event, session) => {
        console.log(
            "Adumex authentication event:",
            event
        );

        if (
            event === "SIGNED_IN" &&
            session?.user
        ) {
            console.log(
                "Adumex authenticated user:",
                session.user.id
            );
        }

        if (event === "SIGNED_OUT") {
            console.log(
                "Adumex user signed out."
            );
        }
    }
);
});
