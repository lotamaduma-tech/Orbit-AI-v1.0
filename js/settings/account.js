"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /* Account state */

    let currentUser = null;
    let currentProfile = null;

    const accountName =
        document.getElementById("account-name");

    const accountEmail =
        document.getElementById("account-email");

    const editProfileBtn =
        document.getElementById("edit-profile-btn");

    /* Supabase */

    function getSupabaseClient() {
        if (
            window.AdumexSupabase &&
            typeof window.AdumexSupabase.getClient === "function"
        ) {
            return window.AdumexSupabase.getClient();
        }

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

        console.error(
            "Adumex account: Supabase client is unavailable."
        );

        return null;
    }

    /* User metadata */

    function getMetadataName() {
        return (
            currentUser?.user_metadata?.full_name?.trim() ||
            currentUser?.user_metadata?.name?.trim() ||
            ""
        );
    }

    /* Display name */

    function getDisplayName() {
        return (
            currentProfile?.display_name?.trim() ||
            getMetadataName() ||
            "Adumex User"
        );
    }

    /* Render account */

    function renderProfile() {
        if (!currentUser) {
            return;
        }

        if (accountName) {
            accountName.textContent =
                getDisplayName();
        }

        if (accountEmail) {
            accountEmail.textContent =
                currentUser.email ||
                "No email available";
        }
    }

    /* Account error */

    function showAccountError(message) {
        if (accountName) {
            accountName.textContent = message;
        }

        if (accountEmail) {
            accountEmail.textContent = "";
        }
    }

    /* Load profile */

    async function loadProfile() {
        const client = getSupabaseClient();

        if (!client) {
            showAccountError(
                "Account connection unavailable."
            );

            return;
        }

        try {
            const {
                data: {
                    user
                },
                error: userError
            } = await client.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                showAccountError(
                    "Not signed in."
                );

                return;
            }

            currentUser = user;

            const {
                data: profile,
                error: profileError
            } = await client
                .from("profiles")
                .select(
                    "display_name, avatar_url"
                )
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!profile) {
                const {
                    data: newProfile,
                    error: createError
                } = await client
                    .from("profiles")
                    .insert({
                        id: user.id,
                        display_name: null,
                        avatar_url: null
                    })
                    .select(
                        "display_name, avatar_url"
                    )
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
                "Adumex account could not be loaded:",
                error
            );

            showAccountError(
                "Unable to load your account."
            );
        }
    }

    /* Profile editor */

    function createEditor() {
        const existingEditor =
            document.getElementById(
                "adumex-profile-editor"
            );

        if (existingEditor) {
            return existingEditor;
        }

        const editor =
            document.createElement("div");

        editor.id =
            "adumex-profile-editor";

        editor.className =
            "adumex-profile-editor";

        editor.innerHTML = `
            <div class="adumex-profile-editor-card">

                <div class="adumex-profile-editor-header">

                    <div>
                        <span class="adumex-profile-editor-eyebrow">
                            ADUMEX ACCOUNT
                        </span>

                        <h3>Edit profile</h3>

                        <p>
                            Choose the name Adumex should use for you.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="adumex-profile-close"
                        id="adumex-profile-close"
                        aria-label="Close profile editor"
                        title="Close"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>

                </div>

                <label
                    class="adumex-profile-label"
                    for="adumex-profile-name-input"
                >
                    Display name
                </label>

                <input
                    type="text"
                    id="adumex-profile-name-input"
                    class="adumex-profile-name-input"
                    maxlength="80"
                    autocomplete="name"
                    placeholder="Enter your name"
                >

                <p class="adumex-profile-email"></p>

                <div class="adumex-profile-actions">

                    <button
                        type="button"
                        class="adumex-profile-cancel"
                        id="adumex-profile-cancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="adumex-profile-save"
                        id="adumex-profile-save"
                    >
                        Save
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(editor);

        return editor;
    }

    /* Open editor */

    function openEditor() {
        if (!currentUser) {
            loadProfile().then(() => {
                if (currentUser) {
                    openEditor();
                }
            });

            return;
        }

        const editor = createEditor();

        const input =
            document.getElementById(
                "adumex-profile-name-input"
            );

        const email =
            editor.querySelector(
                ".adumex-profile-email"
            );

        if (input) {
            input.value =
                currentProfile?.display_name?.trim() ||
                getMetadataName() ||
                "";
        }

        if (email) {
            email.textContent =
                currentUser.email ||
                "No email available";
        }

        editor.classList.add("is-open");

        document.body.classList.add(
            "profile-editor-open"
        );

        requestAnimationFrame(() => {
            input?.focus();
            input?.select();
        });
    }

    /* Close editor */

    function closeEditor() {
        const editor =
            document.getElementById(
                "adumex-profile-editor"
            );

        if (editor) {
            editor.classList.remove(
                "is-open"
            );
        }

        document.body.classList.remove(
            "profile-editor-open"
        );
    }

    /* Save profile */

    async function saveProfile() {
        if (!currentUser) {
            return;
        }

        const client = getSupabaseClient();

        if (!client) {
            alert(
                "Account connection is unavailable. Please try again."
            );

            return;
        }

        const input =
            document.getElementById(
                "adumex-profile-name-input"
            );

        const saveButton =
            document.getElementById(
                "adumex-profile-save"
            );

        const displayName =
            input?.value.trim() || "";

        if (!displayName) {
            alert(
                "Please enter a display name."
            );

            input?.focus();

            return;
        }

        if (displayName.length > 80) {
            alert(
                "Your display name must be 80 characters or less."
            );

            input?.focus();

            return;
        }

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent =
                "Saving...";
        }

        try {
            const {
                data,
                error
            } = await client
                .from("profiles")
                .update({
                    display_name:
                        displayName,
                    updated_at:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    currentUser.id
                )
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

            window.dispatchEvent(
                new CustomEvent(
                    "adumexProfileChanged",
                    {
                        detail: {
                            profile:
                                currentProfile
                        }
                    }
                )
            );
        } catch (error) {
            console.error(
                "Adumex profile could not be saved:",
                error
            );

            alert(
                "Unable to save your profile. Please try again."
            );
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent =
                    "Save";
            }
        }
    }

    /* Profile button */

    editProfileBtn?.addEventListener(
        "click",
        openEditor
    );

    /* Editor actions */

    document.addEventListener(
        "click",
        event => {
            if (
                event.target.closest(
                    "#adumex-profile-close"
                ) ||
                event.target.closest(
                    "#adumex-profile-cancel"
                )
            ) {
                closeEditor();
                return;
            }

            if (
                event.target.closest(
                    "#adumex-profile-save"
                )
            ) {
                saveProfile();
            }
        }
    );

    /* Keyboard */

    document.addEventListener(
        "keydown",
        event => {
            const editor =
                document.getElementById(
                    "adumex-profile-editor"
                );

            if (
                event.key === "Escape" &&
                editor?.classList.contains(
                    "is-open"
                )
            ) {
                closeEditor();
            }

            if (
                event.key === "Enter" &&
                event.target.id ===
                "adumex-profile-name-input"
            ) {
                event.preventDefault();

                saveProfile();
            }
        }
    );

    /* Auth state */

    const client = getSupabaseClient();

    if (client) {
        client.auth.onAuthStateChange(
            (event, session) => {
                console.log(
                    "Adumex authentication event:",
                    event
                );

                if (
                    event === "SIGNED_IN" &&
                    session?.user
                ) {
                    currentUser =
                        session.user;

                    loadProfile();
                }

                if (
                    event === "TOKEN_REFRESHED" &&
                    session?.user
                ) {
                    currentUser =
                        session.user;
                }

                if (
                    event === "SIGNED_OUT"
                ) {
                    currentUser = null;
                    currentProfile = null;

                    showAccountError(
                        "Not signed in."
                    );

                    closeEditor();
                }
            }
        );
    }

    /* Initialize */

    loadProfile();
});
