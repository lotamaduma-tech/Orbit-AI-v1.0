/* =========================================================
   ORBIT AI
   BOOT SEQUENCE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const bootScreen = document.getElementById("boot-screen");

  if (!bootScreen) {
    console.warn("Orbit AI Boot: #boot-screen not found.");
    return;
  }


  /* =======================================================
     BOOT INTERFACE
     ======================================================= */

  bootScreen.innerHTML = `

    <div class="boot-container">

      <!-- ORBIT LOGO -->

      <div class="boot-logo">

        <div class="boot-orbit">

          <div class="boot-orbit-ring ring-one"></div>

          <div class="boot-orbit-ring ring-two"></div>

          <div class="boot-orbit-ring ring-three"></div>

          <div class="boot-core">

            <span>O</span>

          </div>

        </div>

        <h1>ORBIT AI</h1>

        <p>INTELLIGENT SYSTEM INTERFACE</p>

      </div>


      <!-- SYSTEM STATUS -->

      <div class="boot-status">

        <div class="boot-status-row">

          <span>CORE SYSTEM</span>

          <span
            id="boot-core-status"
            class="boot-value"
          >
            WAITING
          </span>

        </div>


        <div class="boot-status-row">

          <span>MEMORY</span>

          <span
            id="boot-memory-status"
            class="boot-value"
          >
            WAITING
          </span>

        </div>


        <div class="boot-status-row">

          <span>NETWORK</span>

          <span
            id="boot-network-status"
            class="boot-value"
          >
            WAITING
          </span>

        </div>


        <div class="boot-status-row">

          <span>INTERFACE</span>

          <span
            id="boot-interface-status"
            class="boot-value"
          >
            WAITING
          </span>

        </div>

      </div>


      <!-- CURRENT OPERATION -->

      <div class="boot-message">

        <span class="boot-prefix">
          >
        </span>

        <span id="boot-message">
          INITIALIZING ORBIT AI...
        </span>

      </div>


      <!-- PROGRESS -->

      <div class="boot-progress">

        <div
          id="boot-progress-fill"
          class="boot-progress-fill"
        ></div>

      </div>


      <div class="boot-progress-info">

        <span>SYSTEM INITIALIZATION</span>

        <span id="boot-percentage">
          0%
        </span>

      </div>


      <!-- FINAL STATUS -->

      <div
        id="boot-ready"
        class="boot-ready"
      >
        SYSTEM READY
      </div>

    </div>

  `;


  /* =======================================================
     ELEMENTS
     ======================================================= */

  const progressFill =
    document.getElementById("boot-progress-fill");

  const percentage =
    document.getElementById("boot-percentage");

  const message =
    document.getElementById("boot-message");

  const ready =
    document.getElementById("boot-ready");

  const coreStatus =
    document.getElementById("boot-core-status");

  const memoryStatus =
    document.getElementById("boot-memory-status");

  const networkStatus =
    document.getElementById("boot-network-status");

  const interfaceStatus =
    document.getElementById("boot-interface-status");


  /* =======================================================
     BOOT STEPS
     ======================================================= */

  const bootSteps = [

    {
      progress: 15,

      message: "INITIALIZING CORE SYSTEM...",

      element: coreStatus
    },

    {
      progress: 35,

      message: "CHECKING MEMORY...",

      element: memoryStatus
    },

    {
      progress: 55,

      message: "CHECKING NETWORK...",

      element: networkStatus
    },

    {
      progress: 75,

      message: "LOADING INTERFACE...",

      element: interfaceStatus
    },

    {
      progress: 90,

      message: "LOADING ORBIT MODULES...",

      element: null
    },

    {
      progress: 100,

      message: "ORBIT AI INITIALIZATION COMPLETE.",

      element: null
    }

  ];


  /* =======================================================
     DELAY
     ======================================================= */

  const delay = (milliseconds) => {

    return new Promise(resolve => {

      setTimeout(resolve, milliseconds);

    });

  };


  /* =======================================================
     UPDATE PROGRESS
     ======================================================= */

  function updateProgress(value) {

    progressFill.style.width = `${value}%`;

    percentage.textContent = `${value}%`;

  }


  /* =======================================================
     MARK STEP COMPLETE
     ======================================================= */

  function completeStep(element) {

    if (!element) return;

    element.textContent = "ONLINE";

    element.classList.add("complete");

  }


  /* =======================================================
     SYSTEM CHECKS
     ======================================================= */

  async function runBootSequence() {

    for (const step of bootSteps) {

      message.textContent = step.message;

      updateProgress(step.progress);

      await delay(450);

      completeStep(step.element);

    }


    /* =====================================================
       FINAL STATE
       ===================================================== */

    message.textContent =
      "ALL SYSTEMS OPERATIONAL.";

    ready.classList.add("show");

    await delay(900);


    /* =====================================================
       FADE OUT
       ===================================================== */

    bootScreen.classList.add("boot-complete");


    await delay(900);


    /* =====================================================
       REMOVE BOOT SCREEN
       ===================================================== */

    bootScreen.remove();

  }


  /* =======================================================
     START BOOT
     ======================================================= */

  runBootSequence();

});