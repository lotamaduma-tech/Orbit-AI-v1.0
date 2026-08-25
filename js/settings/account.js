"use strict";

document.addEventListener("DOMContentLoaded", () => {
    let currentUser = null;
    let currentProfile = null;

    // Elements
    const accountName = document.getElementById("account-name");
    const accountEmail = document.getElementById("account-email");
    const editProfileBtn = document.getElementById("edit-profile-btn");

    // Supabase
    function getSupabase() {
        if (
            typeof window.supabase === "undefined" ||
            !window.ORBIT_SUPABASE_URL ||
            !window.ORBIT_SUPABASE_KEY
        ) {
            console.error("Supabase configuration is missing.");
            return null;
        }

        if (!window.orbitSupabase) {
            window.orbitSupabase = window.supabase.createClient(
                window.ORBIT_SUPABASE_URL,
                window.ORBIT_SUPABASE_KEY
            );
        }

        return window.orbitSupabase;
    }

    // Load profile
    async function loadProfile() {
        const client = getSupabase();

        if (!client) {
            showError("Account connection unavailable.");
            return;
        }

        try {
            const {
                data: { user },
                error: userError
            } = await client.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                showError("Not signed in.");
                return;
            }

            currentUser = user;

            const {
                data: profile,
                error: profileError
            } = await client
                .from("profiles")
                .select("display_name, avatar_url")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!profile) {
                const { data: newProfile, error: createError } =
                    await client
                        .from("profiles")
                        .insert({
                            id: user.id,
                            display_name: null,
                            avatar_url: null
                        })
                        .select("display_name, avatar_url")
                        .single();

                if (createError) {
                    throw createError;
                }

                currentProfile = newProfile;
            } else {
                currentProfile = profile;
            }

            renderProfile();
        } catch (error) {
            console.error(
                "Orbit account could not be loaded.",
                error
            );

            showError("Unable to load your account.");
        }
    }

    // Render profile
    function renderProfile() {
        if (!currentUser) {
            return;
        }

        const metadataName =
            currentUser.user_metadata?.full_name?.trim() ||
            currentUser.user_metadata?.name?.trim() ||
            "";

        const displayName =
            currentProfile?.display_name?.trim() ||
            metadataName ||
            "Orbit User";

        const email =
            currentUser.email ||
            "No email available";

        if (accountName) {
            accountName.textContent = displayName;
        }

        if (accountEmail) {
            accountEmail.textContent = email;
        }
    }

    // Show error
    function showError(message) {
        if (accountName) {
            accountName.textContent = message;
        }

        if (accountEmail) {
            accountEmail.textContent = "";
        }
    }

    // Create editor
    function createEditor() {
        const existingEditor =
            document.getElementById("orbit-profile-editor");

        if (existingEditor) {
            return existingEditor;
        }

        const editor = document.createElement("div");

        editor.id = "orbit-profile-editor";
        editor.className = "orbit-profile-editor";

        editor.innerHTML = `
            <div class="orbit-profile-editor-card">

                <div class="orbit-profile-editor-header">
                    <div>
                        <span class="orbit-profile-editor-eyebrow">
                            ORBIT ACCOUNT
                        </span>

                        <h3>Edit profile</h3>

                        <p>
                            Choose the name Orbit should use for you.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="orbit-profile-close"
                        id="orbit-profile-close"
                        aria-label="Close profile editor"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <label
                    class="orbit-profile-label"
                    for="orbit-profile-name-input"
                >
                    Display name
                </label>

                <input
                    type="text"
                    id="orbit-profile-name-input"
                    class="orbit-profile-name-input"
                    maxlength="80"
                    autocomplete="name"
                    placeholder="Enter your name"
                >

                <p class="orbit-profile-email"></p>

                <div class="orbit-profile-actions">

                    <button
                        type="button"
                        class="orbit-profile-cancel"
                        id="orbit-profile-cancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="orbit-profile-save"
                        id="orbit-profile-save"
                    >
                        Save
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(editor);

        return editor;
    }

    // Open editor
    function openEditor() {
        if (!currentUser) {
            alert("Please sign in before editing your profile.");
            return;
        }

        const editor = createEditor();

        const input = document.getElementById(
            "orbit-profile-name-input"
        );

        const email = editor.querySelector(
            ".orbit-profile-email"
        );

        const currentName =
            currentProfile?.display_name?.trim() ||
            currentUser.user_metadata?.full_name?.trim() ||
            currentUser.user_metadata?.name?.trim() ||
            "";

        if (input) {
            input.value = currentName;
        }

        if (email) {
            email.textContent =
                currentUser.email || "No email available";
        }

        editor.classList.add("is-open");

        requestAnimationFrame(() => {
            input?.focus();
        });
    }

    // Close editor
    function closeEditor() {
        const editor = document.getElementById(
            "orbit-profile-editor"
        );

        if (editor) {
            editor.classList.remove("is-open");
        }
    }

    // Save profile
    async function saveProfile() {
        if (!currentUser) {
            return;
        }

        const client = getSupabase();

        if (!client) {
            return;
        }

        const input = document.getElementById(
            "orbit-profile-name-input"
        );

        const saveButton = document.getElementById(
            "orbit-profile-save"
        );

        const displayName =
            input?.value.trim() || "";

        if (displayName.length > 80) {
            alert(
                "Your display name must be 80 characters or less."
            );
            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        try {
            const {
                data,
                error
            } = await client
                .from("profiles")
                .update({
                    display_name:
                        displayName || null,
                    updated_at:
                        new Date().toISOString()
                })
                .eq("id", currentUser.id)
                .select(
                    "display_name, avatar_url"
                )
                .single();

            if (error) {
                throw error;
            }

            currentProfile = data;

            renderProfile();
            closeEditor();
        } catch (error) {
            console.error(
                "Orbit profile could not be saved.",
                error
            );

            alert(
                "Unable to save your profile. Please try again."
            );
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = "Save";
            }
        }
    }

    // Profile events
    editProfileBtn?.addEventListener(
        "click",
        openEditor
    );

    document.addEventListener(
        "click",
        (event) => {
            if (
                event.target.closest(
                    "#orbit-profile-close"
                ) ||
                event.target.closest(
                    "#orbit-profile-cancel"
                )
            ) {
                closeEditor();
            }

            if (
                event.target.closest(
                    "#orbit-profile-save"
                )
            ) {
                saveProfile();
            }
        }
    );

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape"
            ) {
                closeEditor();
            }

            if (
                event.key === "Enter" &&
                event.target.id ===
                "orbit-profile-name-input"
            ) {
                event.preventDefault();
                saveProfile();
            }
        }
    );

    // Start
    loadProfile();
});