"use strict";

(() => {
    const getAllMemory = () => window.AdumexMemory.getMemory();
    const getMemoryEnabled = () => window.AdumexSettings.getValue("memory") !== false;
    const setMemoryEnabled = value => window.AdumexSettings.set("memory", value);
    async function removeMemory(id) {
        const all = getAllMemory();
        const text = all.find((entry, index) => getMemoryId(entry, index) === id);
        if (text && !await window.AdumexMemory.remove(getMemoryText(text))) throw new Error("Memory was not deleted.");
    }
    async function clearAllMemory() {
        if (!await window.AdumexMemory.clear()) throw new Error("Memory was not cleared.");
    }

    function createMemoryManager() {
        let manager =
            document.getElementById(
                "orbit-memory-manager"
            );

        if (manager) {
            return manager;
        }

        manager =
            document.createElement("div");

        manager.id =
            "orbit-memory-manager";

        manager.className =
            "orbit-memory-manager";

        manager.innerHTML = `
            <div
                class="orbit-memory-manager-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="orbit-memory-manager-title"
            >
                <div class="orbit-memory-manager-header">
                    <div>
                        <span class="orbit-memory-manager-eyebrow">
                            ORBIT MEMORY
                        </span>

                        <h3 id="orbit-memory-manager-title">
                            Manage saved memory
                        </h3>

                        <p>
                            Review information Adumex has saved
                            to personalize your conversations.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="orbit-memory-close"
                        id="orbit-memory-close"
                        aria-label="Close memory manager"
                    >
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div
                    class="orbit-memory-list"
                    id="orbit-memory-list"
                ></div>

                <div class="orbit-memory-manager-footer">
                    <button
                        type="button"
                        class="orbit-memory-clear"
                        id="orbit-memory-clear"
                    >
                        <i class="fa-solid fa-trash"></i>
                        Clear all memory
                    </button>

                    <button
                        type="button"
                        class="orbit-memory-done"
                        id="orbit-memory-done"
                    >
                        Done
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(manager);

        return manager;
    }

    function getMemoryText(entry) {
        if (typeof entry === "string") {
            return entry;
        }

        if (
            entry &&
            typeof entry === "object"
        ) {
            return (
                entry.text ||
                entry.content ||
                entry.memory ||
                ""
            );
        }

        return "";
    }

    function getMemoryId(entry, index) {
        if (
            entry &&
            typeof entry === "object" &&
            entry.id
        ) {
            return entry.id;
        }

        return String(index);
    }

    function renderMemoryManager() {
        const manager =
            createMemoryManager();

        const list =
            manager.querySelector(
                "#orbit-memory-list"
            );

        if (!list) {
            return;
        }

        const memory =
            getAllMemory();

        list.innerHTML = "";

        if (!memory.length) {
            list.innerHTML = `
                <div class="orbit-memory-empty">
                    <div class="orbit-memory-empty-icon">
                        <i class="fa-solid fa-brain"></i>
                    </div>

                    <strong>
                        No saved memory
                    </strong>

                    <p>
                        When Adumex remembers something useful
                        about you, it will appear here.
                    </p>
                </div>
            `;

            return;
        }

        memory.forEach(
            (entry, index) => {
                const item =
                    document.createElement("div");

                item.className =
                    "orbit-memory-item";

                const content =
                    document.createElement("div");

                content.className =
                    "orbit-memory-content";

                const text =
                    document.createElement("p");

                text.className =
                    "orbit-memory-text";

                text.textContent =
                    getMemoryText(entry);

                content.appendChild(text);

                if (
                    entry &&
                    typeof entry === "object" &&
                    entry.createdAt
                ) {
                    const date =
                        document.createElement(
                            "small"
                        );

                    date.className =
                        "orbit-memory-date";

                    const parsedDate =
                        new Date(
                            entry.createdAt
                        );

                    if (
                        !Number.isNaN(
                            parsedDate.getTime()
                        )
                    ) {
                        date.textContent =
                            parsedDate.toLocaleDateString(
                                undefined,
                                {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                }
                            );

                        content.appendChild(
                            date
                        );
                    }
                }

                const deleteButton =
                    document.createElement(
                        "button"
                    );

                deleteButton.type =
                    "button";

                deleteButton.className =
                    "orbit-memory-delete";

                deleteButton.setAttribute(
                    "aria-label",
                    "Delete saved memory"
                );

                deleteButton.innerHTML =
                    '<i class="fa-solid fa-trash"></i>';

                const memoryId =
                    getMemoryId(
                        entry,
                        index
                    );

                deleteButton.addEventListener(
                    "click",
                    async () => {
                        deleteButton.disabled = true;
                        try { await removeMemory(memoryId); renderMemoryManager(); }
                        catch (error) { window.alert(error.message); deleteButton.disabled = false; }
                    }
                );

                item.appendChild(
                    content
                );

                item.appendChild(
                    deleteButton
                );

                list.appendChild(item);
            }
        );
    }

    async function openMemoryManager() {
        try { await window.AdumexMemory.load(true); }
        catch (error) { window.alert(error.message); return; }
        const manager =
            createMemoryManager();

        renderMemoryManager();

        manager.classList.add(
            "is-open"
        );

        document.body.classList.add(
            "orbit-memory-manager-open"
        );

        requestAnimationFrame(() => {
            manager
                .querySelector(
                    "#orbit-memory-close"
                )
                ?.focus();
        });
    }

    function closeMemoryManager() {
        const manager =
            document.getElementById(
                "orbit-memory-manager"
            );

        if (!manager) {
            return;
        }

        manager.classList.remove(
            "is-open"
        );

        document.body.classList.remove(
            "orbit-memory-manager-open"
        );
    }

    function initialize() {
        const manageButton =
            document.getElementById(
                "manage-memory"
            );

        if (
            manageButton &&
            manageButton.dataset
                .orbitMemoryReady !==
            "true"
        ) {
            manageButton.dataset
                .orbitMemoryReady =
                "true";

            manageButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();

                    openMemoryManager();
                }
            );
        }
    }

    document.addEventListener(
        "click",
        async event => {
            if (
                event.target.closest(
                    "#orbit-memory-close"
                ) ||
                event.target.closest(
                    "#orbit-memory-done"
                )
            ) {
                closeMemoryManager();

                return;
            }

            if (
                event.target.closest(
                    "#orbit-memory-clear"
                )
            ) {
                const memory =
                    getAllMemory();

                if (!memory.length) {
                    return;
                }

                const confirmed =
                    window.confirm(
                        "Delete all saved Adumex memory?"
                    );

                if (!confirmed) {
                    return;
                }

                try { await clearAllMemory(); renderMemoryManager(); }
                catch (error) { window.alert(error.message); }

                return;
            }

            const manager =
                document.getElementById(
                    "orbit-memory-manager"
                );

            if (
                manager &&
                event.target === manager
            ) {
                closeMemoryManager();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape"
            ) {
                closeMemoryManager();
            }
        }
    );

    window.AdumexMemoryManager = { openManager: openMemoryManager, closeManager: closeMemoryManager };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );
    } else {
        initialize();
    }
})();