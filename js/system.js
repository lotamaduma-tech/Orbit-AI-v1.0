// ==========================================
// ORBIT AI - SYSTEM PAGE
// ==========================================

// CPU Elements
const cpuBar = document.querySelector(".cpu-progress");
const cpuValue = document.getElementById("cpu-value");

// Memory Elements
const memoryBar = document.querySelector(".memory-progress");
const memoryValue = document.getElementById("memory-value");

// Activity Log
const systemLog = document.querySelector(".system-log");

// Buttons
const restartBtn = document.getElementById("restart-btn");
const diagnosticsBtn = document.getElementById("diagnostics-btn");
const cacheBtn = document.getElementById("cache-btn");
const updateBtn = document.getElementById("update-btn");



const timeEl = document.getElementById("time");
const dateEl = document.getElementById("date");
const greetingEl = document.getElementById("greeting");

function updateClock(){

    const now = new Date();

    let hours = now.getHours();
    let minutes = String(now.getMinutes()).padStart(2,"0");
    let seconds = String(now.getSeconds()).padStart(2,"0");

    const period = hours >= 12 ? "PM" : "AM";

    const displayHour = hours % 12 || 12;

    if(timeEl){
        timeEl.textContent =
            `${displayHour}:${minutes}:${seconds} ${period}`;
    }

    if(dateEl){
        dateEl.textContent =
            now.toLocaleDateString("en-US",{
                weekday:"long",
                year:"numeric",
                month:"long",
                day:"numeric"
            });
    }

    if(greetingEl){

        let greeting = "Good Evening";

        if(hours >= 5 && hours < 12){

            greeting = "Good Morning";

        }else if(hours >= 12 && hours < 17){

            greeting = "Good Afternoon";

        }

        greetingEl.textContent = `${greeting}, Kingsley`;

    }

}

updateClock();

setInterval(updateClock,1000);

// ==========================================
// RANDOM NUMBER
// ==========================================

function randomNumber(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
}

// ==========================================
// UPDATE CPU & MEMORY
// ==========================================

function updateSystem(){

    const cpu = randomNumber(20,70);
    const memory = randomNumber(35,85);

    cpuBar.style.width = cpu + "%";
    memoryBar.style.width = memory + "%";

    cpuValue.textContent = cpu + "%";
    memoryValue.textContent = memory + "%";

}

updateSystem();

setInterval(updateSystem,3000);

// ==========================================
// SYSTEM LOG
// ==========================================

const logMessages = [

    "AI Core synchronized.",
    "Voice Engine initialized.",
    "Memory optimization completed.",
    "Security scan passed.",
    "Neural Engine updated.",
    "Network connection stable.",
    "Storage scan completed.",
    "Background services running.",
    "Firewall active.",
    "Orbit AI operating normally."

];

function addLog(message){

    const p = document.createElement("p");

    const time = new Date().toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit"
    });

    p.textContent = `${time} • ${message}`;

    systemLog.prepend(p);

    while(systemLog.children.length > 10){
        systemLog.removeChild(systemLog.lastChild);
    }

}

// Automatic logs

setInterval(()=>{

    const randomLog =
        logMessages[Math.floor(Math.random()*logMessages.length)];

    addLog(randomLog);

},7000);

// ==========================================
// BUTTON ACTIONS
// ==========================================

restartBtn.addEventListener("click",()=>{

    addLog("Restarting Orbit AI...");
    updateSystem();

});

diagnosticsBtn.addEventListener("click",()=>{

    addLog("Running diagnostics...");
});

cacheBtn.addEventListener("click",()=>{

    addLog("Cache cleared successfully.");
});

updateBtn.addEventListener("click",()=>{

    addLog("Checking for updates...");
});