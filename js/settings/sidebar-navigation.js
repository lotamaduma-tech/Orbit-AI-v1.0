"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".settings-nav-item");
    const sections = document.querySelectorAll(".settings-section");

    function setActiveSection(targetId) {
        const id = targetId.replace("#", "");

        navItems.forEach(item => {
            const href = item.getAttribute("href").replace("#", "");
            item.classList.toggle("active", href === id);
        });

        sections.forEach(section => {
            section.classList.toggle("active", section.id === id);
        });
    }

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = item.getAttribute("href");
            window.location.hash = targetId;
            setActiveSection(targetId);
        });
    });

    const initialHash = window.location.hash || "#appearance";
    setActiveSection(initialHash);
});