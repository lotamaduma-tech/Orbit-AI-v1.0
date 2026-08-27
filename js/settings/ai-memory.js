"use strict";

(() => {
    const MEMORY_ENABLED_KEY = "orbit_memory_enabled";
    const MEMORY_DATA_KEY = "orbit_memory";

    function getMemoryEnabled() {
        return localStorage.getItem(MEMORY_ENABLED_KEY) !== "false";
    }

    function setMemoryEnabled(enabled) {
        const value = Boolean(enabled);

        localStorage.setItem(
            MEMORY_ENABLED_KEY,
            value ? "true" : "false"
        );

        document.documentElement.setAttribute(
            "data-memory",
            value ? "enabled" : "disabled"
        );

        window.dispatchEvent(
            new CustomEvent("orbitMemoryChanged", {
                detail: {
                    enabled: value
                }
            })
        );
    }

    function getAllMemory() {
        try {
            const stored = localStorage.getItem(
                MEMORY_DATA_KEY
            );

            if (!stored) {
                return [];
            }

            const memory = JSON.parse(stored);

            return Array.isArray(memory)
                ? memory
                : [];
        } catch {
            return [];
        }
    }

    function saveAllMemory(memory) {
        if (!Array.isArray(memory)) {
            return false;
        }

        try {
            localStorage.setItem(
                MEMORY_DATA_KEY,
                JSON.stringify(memory)
            );

            window.dispatchEvent(
                new CustomEvent("orbitMemoryUpdated", {
                    detail: {
                        memory
                    }
                })
            );

            return true;
        } catch (error) {
            console.error(
                "Orbit memory could not be saved.",
                error
            );

            return false;
        }
    }

    function normalizeMemoryEntry(entry) {
        if (typeof entry === "string") {
            const text = entry.trim();

            if (!text) {
                return null;
            }

            return {
                id: createMemoryId(),
                text,
                createdAt: new Date().toISOString()
            };
        }

        if (
            typeof entry !== "object" ||
            entry === null
        ) {
            return null;
        }

        const text = String(
            entry.text ||
            entry.content ||
            entry.memory ||
            ""
        ).trim();

        if (!text) {
            return null;
        }

        return {
            id:
                entry.id ||
                createMemoryId(),

            text,

            createdAt:
                entry.createdAt ||
                new Date().toISOString()
        };
    }

    function createMemoryId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            "memory-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .slice(2)
        );
    }

    function memoryAlreadyExists(text) {
        const normalized = text
            .trim()
            .toLowerCase();

        return getAllMemory().some(entry => {
            const existing =
                typeof entry === "string"
                    ? entry
                    : entry?.text ||
                    entry?.content ||
                    entry?.memory ||
                    "";

            return (
                String(existing)
                    .trim()
                    .toLowerCase() === normalized
            );
        });
    }

    function addMemory(entry) {
        if (!getMemoryEnabled()) {
            return false;
        }

        const normalized =
            normalizeMemoryEntry(entry);

        if (!normalized) {
            return false;
        }

        if (
            memoryAlreadyExists(
                normalized.text
            )
        ) {
            return false;
        }

        const memory = getAllMemory();

        memory.push(normalized);

        return saveAllMemory(memory);
    }

    function removeMemory(memoryId) {
        const memory = getAllMemory();

        const updated = memory.filter(
            (entry, index) => {
                if (
                    typeof entry === "string"
                ) {
                    return String(index) !==
                        String(memoryId);
                }

                return (
                    entry?.id !== memoryId
                );
            }
        );

        if (
            updated.length ===
            memory.length
        ) {
            return false;
        }

        return saveAllMemory(updated);
    }

    function clearAllMemory() {
        const memory = getAllMemory();

        if (!memory.length) {
            return true;
        }

        return saveAllMemory([]);
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
                            Review information Orbit has saved
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
                        When Orbit remembers something useful
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
                    () => {
                        removeMemory(
                            memoryId
                        );

                        renderMemoryManager();
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

    function openMemoryManager() {
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
        const toggle =
            document.getElementById(
                "memory-toggle"
            );

        const enabled =
            getMemoryEnabled();

        if (toggle) {
            toggle.checked = enabled;

            if (
                toggle.dataset
                    .orbitMemoryReady !==
                "true"
            ) {
                toggle.dataset
                    .orbitMemoryReady =
                    "true";

                toggle.addEventListener(
                    "change",
                    event => {
                        setMemoryEnabled(
                            event.target.checked
                        );
                    }
                );
            }
        }

        setMemoryEnabled(enabled);

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
        event => {
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
                        "Delete all saved Orbit memory?"
                    );

                if (!confirmed) {
                    return;
                }

                clearAllMemory();

                renderMemoryManager();

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

    window.OrbitMemory = {
        isEnabled:
            getMemoryEnabled,

        setEnabled:
            setMemoryEnabled,

        getAll:
            getAllMemory,

        save:
            addMemory,

        add:
            addMemory,

        remove:
            removeMemory,

        clear:
            clearAllMemory,

        openManager:
            openMemoryManager,

        closeManager:
            closeMemoryManager,

        render:
            renderMemoryManager
    };

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