// ==========================================
// ORBIT AI BOOT SYSTEM
// ==========================================

const bootMessages = [
    "Initializing Orbit Kernel...",
    "Loading Neural Engine...",
    "Encrypting Memory Core...",
    "Connecting Voice Recognition...",
    "Establishing Secure Connection...",
    "Activating AI Modules...",
    "Enabling GPU Acceleration...",
    "Running System Diagnostics...",
    "Launching Dashboard..."
];

// ==========================================
// ELEMENTS
// ==========================================

const bootText = document.getElementById("boot-text");
const loadingFill = document.getElementById("loading-fill");
const bootState = document.getElementById("boot-state");
const coreText = document.querySelector(".boot-center span");
const bootScreen = document.getElementById("boot-screen");

const indicators = [
    document.getElementById("status1"),
    document.getElementById("status2"),
    document.getElementById("status3"),
    document.getElementById("status4"),
    document.getElementById("status5"),
    document.getElementById("status6"),
    document.getElementById("status7"),
    document.getElementById("status8"),
    document.getElementById("status9")
];

const coreStates = [
    "BOOT",
    "INIT",
    "SYNC",
    "SCAN",
    "LINK",
    "LOAD",
    "READY",
    "AI",
    "ONLINE"
];

let step = 0;

// ==========================================
// START BOOT
// ==========================================

const bootInterval = setInterval(() => {

    bootText.textContent = bootMessages[step];

    const progress = ((step + 1) / bootMessages.length) * 100;
    loadingFill.style.width = progress + "%";

    coreText.textContent = coreStates[step];

    indicators[step].classList.add("active");

    indicators[step].innerHTML =
        "✓ " +
        indicators[step].textContent.replace("○ ", "");

    step++;

    // ==========================================
    // FINISH BOOT
    // ==========================================

    if (step >= bootMessages.length) {

        clearInterval(bootInterval);

        bootState.textContent = "STATUS : ONLINE";
        bootText.textContent = "Orbit AI Ready";
        coreText.textContent = "AI";

        setTimeout(() => {

            bootScreen.style.opacity = "0";
            bootScreen.style.visibility = "hidden";

            setTimeout(() => {

                window.location.href = "index.html";

            }, 1000);

        }, 1200);
    }

}, 800);