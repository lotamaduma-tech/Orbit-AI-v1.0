"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const memoryToggle = document.getElementById("memory-toggle");
    const manageMemoryBtn = document.getElementById("manage-memory");

    const memoryEnabled = localStorage.getItem("orbit_memory_enabled") !== "false";

    if (memoryToggle) {
        memoryToggle.checked = memoryEnabled;
        memoryToggle.addEventListener("change", (e) => {
            localStorage.setItem("orbit_memory_enabled", e.target.checked);
        });
    }

    if (manageMemoryBtn) {
        manageMemoryBtn.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Orbit Memory Manager: Memory entries cleared or updated.");
        });
    }
});