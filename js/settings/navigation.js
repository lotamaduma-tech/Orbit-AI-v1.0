"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".settings-nav-item");
    const sections = document.querySelectorAll(".settings-section");

    if (!navItems.length || !sections.length) {
        return;
    }

    function setActiveSection(targetId) {
        const id = targetId.replace("#", "");

        const targetSection = document.getElementById(id);

        if (!targetSection) {
            setActiveSection("#appearance");
            return;
        }

        navItems.forEach(item => {
            const href = item.getAttribute("href") || "";
            item.classList.toggle(
                "active",
                href === `#${id}`
            );
        });

        sections.forEach(section => {
            section.classList.toggle(
                "active",
                section.id === id
            );
        });
    }

    navItems.forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();

            const targetId =
                item.getAttribute("href");

            if (!targetId) {
                return;
            }

            if (window.location.hash !== targetId) {
                window.location.hash = targetId;
            } else {
                setActiveSection(targetId);
            }
        });
    });

    window.addEventListener("hashchange", () => {
        setActiveSection(
            window.location.hash || "#appearance"
        );
    });

    setActiveSection(
        window.location.hash || "#appearance"
    );
});