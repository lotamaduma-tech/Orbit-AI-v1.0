"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    const loginMessage = document.getElementById("login-message");
    const signupMessage = document.getElementById("signup-message");

    const AUTH_REDIRECT_URL = `${window.location.origin}/index.html`;

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

    function setButtonLoading(button, loading, text) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;

            button.innerHTML = `
                <span class="auth-loading"></span>
                <span>${text}</span>
            `;
        } else {
            button.disabled = false;

            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

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

    async function getCurrentSession() {
        try {
            const { data, error } =
                await supabaseClient.auth.getSession();

            if (error) {
                console.error("Session check failed:", error);
                return null;
            }

            return data?.session || null;
        } catch (error) {
            console.error("Session error:", error);
            return null;
        }
    }

    async function redirectIfLoggedIn() {
        const session = await getCurrentSession();

        if (!session) return;

        const currentPage =
            window.location.pathname.split("/").pop();

        if (
            currentPage === "login.html" ||
            currentPage === "signup.html" ||
            currentPage === ""
        ) {
            window.location.href = "index.html";
        }
    }

    redirectIfLoggedIn();

    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
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
                emailInput?.value.trim().toLowerCase() || "";

            const password =
                passwordInput?.value || "";

            const confirmPassword =
                confirmPasswordInput?.value || "";

            if (!email || !password || !confirmPassword) {
                showMessage(
                    signupMessage,
                    "Please complete all fields."
                );
                return;
            }

            if (password.length < 6) {
                showMessage(
                    signupMessage,
                    "Password must be at least 6 characters."
                );
                return;
            }

            if (password !== confirmPassword) {
                showMessage(
                    signupMessage,
                    "Passwords do not match."
                );
                return;
            }

            setButtonLoading(
                submitButton,
                true,
                "Creating account..."
            );

            try {
                const { data, error } =
                    await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            emailRedirectTo: AUTH_REDIRECT_URL
                        }
                    });

                if (error) {
                    throw error;
                }

                console.log("Signup successful:", data);

                if (data.session) {
                    showMessage(
                        signupMessage,
                        "Account created successfully. Redirecting...",
                        "success"
                    );

                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 800);

                    return;
                }

                showMessage(
                    signupMessage,
                    "Account created. Check your email to confirm your account.",
                    "success"
                );

                signupForm.reset();

            } catch (error) {
                console.error("Signup error:", error);

                let message =
                    "Could not create your account. Please try again.";

                if (
                    error?.message
                        ?.toLowerCase()
                        .includes("already registered")
                ) {
                    message =
                        "An account with this email already exists.";
                }

                if (
                    error?.message
                        ?.toLowerCase()
                        .includes("password")
                ) {
                    message =
                        "Your password does not meet the requirements.";
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
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            clearMessage(loginMessage);

            const emailInput =
                document.getElementById("login-email");

            const passwordInput =
                document.getElementById("login-password");

            const submitButton =
                document.getElementById("login-submit");

            const email =
                emailInput?.value.trim().toLowerCase() || "";

            const password =
                passwordInput?.value || "";

            if (!email || !password) {
                showMessage(
                    loginMessage,
                    "Please enter your email and password."
                );
                return;
            }

            setButtonLoading(
                submitButton,
                true,
                "Signing in..."
            );

            try {
                const { data, error } =
                    await supabaseClient.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) {
                    throw error;
                }

                console.log(
                    "Login successful:",
                    data.user?.id
                );

                showMessage(
                    loginMessage,
                    "Signed in successfully. Redirecting...",
                    "success"
                );

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 500);

            } catch (error) {
                console.error("Login error:", error);

                let message =
                    "Could not sign in. Please check your email and password.";

                const errorText =
                    error?.message?.toLowerCase() || "";

                if (
                    errorText.includes("email not confirmed")
                ) {
                    message =
                        "Please confirm your email before signing in.";
                }

                if (
                    errorText.includes("invalid login credentials")
                ) {
                    message =
                        "Incorrect email or password.";
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
        });
    }

    const forgotPassword =
        document.getElementById("forgot-password");

    if (forgotPassword) {
        forgotPassword.addEventListener(
            "click",
            async (event) => {
                event.preventDefault();

                clearMessage(loginMessage);

                const emailInput =
                    document.getElementById("login-email");

                const email =
                    emailInput?.value.trim().toLowerCase() || "";

                if (!email) {
                    showMessage(
                        loginMessage,
                        "Enter your email address first."
                    );

                    emailInput?.focus();
                    return;
                }

                try {
                    const { error } =
                        await supabaseClient.auth.resetPasswordForEmail(
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
                        "Password reset error:",
                        error
                    );

                    showMessage(
                        loginMessage,
                        error?.message ||
                        "Could not send password reset instructions."
                    );
                }
            }
        );
    }

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {
            console.log(
                "Orbit authentication event:",
                event
            );

            if (event === "SIGNED_IN" && session) {
                console.log(
                    "Authenticated user:",
                    session.user.id
                );
            }

            if (event === "SIGNED_OUT") {
                console.log(
                    "User signed out."
                );
            }
        }
    );
});