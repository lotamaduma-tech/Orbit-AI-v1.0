// ========================================
// ORBIT AI LIVE CLOCK
// ========================================

const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

function updateClock() {

    const now = new Date();

    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2, "0");
    let seconds = String(now.getSeconds()).padStart(2, "0");

    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    if (timeEl) {
        timeEl.textContent =
            `${displayHour}:${minutes}:${seconds} ${period}`;
    }

    if (dateEl) {
        dateEl.textContent =
            now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });
    }

    if (greetingEl) {

        let greeting = "Good Evening";

        if (hours >= 5 && hours < 12) {

            greeting = "Good Morning";

        } else if (hours >= 12 && hours < 17) {

            greeting = "Good Afternoon";

        }

        greetingEl.textContent = `${greeting}, Kingsley`;

    }

}

updateClock();

setInterval(updateClock, 1000);

// ========================================
// CHAT
// ========================================

const chat = document.getElementById("chat-window");

function addMessage(text, sender) {

    if (!chat) return;

    const div = document.createElement("div");

    div.className = `message ${sender}`;

    div.innerText = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;

}

// Initial message

addMessage("Orbit AI Online.", "orbit");