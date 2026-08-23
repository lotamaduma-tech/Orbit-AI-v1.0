/* =========================================================
   ORBIT AI — QUICK REPLIES
   ========================================================= */

"use strict";

/* =========================================================
   GET ELEMENTS
   ========================================================= */

function getOrbitQuickReplyElements() {
  return {
    container: document.querySelector(".quick-prompts"),
    buttons: document.querySelectorAll(".quick-prompt"),
    intro: document.getElementById("chat-intro"),
    input: document.getElementById("command-input"),
  };
}

/* =========================================================
   HIDE QUICK REPLIES
   ========================================================= */

function hideOrbitQuickReplies() {
  const { container } = getOrbitQuickReplyElements();

  if (!container) {
    return;
  }

  container.classList.add("quick-prompts-hidden");
}

/* =========================================================
   SHOW QUICK REPLIES
   ========================================================= */

function showOrbitQuickReplies() {
  const { container } = getOrbitQuickReplyElements();

  if (!container) {
    return;
  }

  container.classList.remove("quick-prompts-hidden");
}

/* =========================================================
   CLEAR COMMAND INPUT
   ========================================================= */

function clearOrbitCommandInput() {
  const { input } = getOrbitQuickReplyElements();

  if (!input) {
    return;
  }

  /*
   * Clear the input completely so the user can
   * immediately type their next message.
   */

  input.value = "";

  /*
   * Notify any other input-related JavaScript.
   */

  input.dispatchEvent(
    new Event("input", {
      bubbles: true,
    }),
  );

  /*
   * Keep the cursor inside the input.
   */

  input.focus();

  /*
   * Reset textarea height if another script
   * dynamically resizes the input.
   */

  input.style.height = "auto";
}

/* =========================================================
   SEND QUICK PROMPT
   ========================================================= */

function sendOrbitQuickPrompt(prompt) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    return;
  }

  /*
   * Hide quick prompts immediately.
   */

  hideOrbitQuickReplies();

  const { input } = getOrbitQuickReplyElements();

  /*
   * Put the selected prompt into the command input
   * temporarily.
   */

  if (input) {
    input.value = cleanPrompt;

    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );
  }

  /*
   * Send through the main Orbit AI engine.
   */

  if (window.OrbitAI && typeof window.OrbitAI.sendMessage === "function") {
    window.OrbitAI.sendMessage(cleanPrompt);

    /*
     * Clear the command input AFTER sending.
     *
     * A small timeout makes sure the Orbit engine
     * has already received the prompt before the
     * input is cleared.
     */

    requestAnimationFrame(() => {
      clearOrbitCommandInput();
    });
  } else {
    console.warn("Orbit AI engine is not available yet.");

    /*
     * If Orbit isn't available, keep the prompt
     * visible so the user doesn't lose it.
     */

    if (input) {
      input.focus();
    }
  }
}

/* =========================================================
   SETUP QUICK REPLIES
   ========================================================= */

function setupOrbitQuickReplies() {
  const { buttons } = getOrbitQuickReplyElements();

  if (!buttons || buttons.length === 0) {
    return;
  }

  buttons.forEach((button) => {
    /*
     * Prevent duplicate listeners.
     */

    if (button.dataset.orbitQuickReady === "true") {
      return;
    }

    button.dataset.orbitQuickReady = "true";

    button.addEventListener("click", () => {
      const prompt =
        button.dataset.prompt || button.getAttribute("data-prompt");

      sendOrbitQuickPrompt(prompt);
    });
  });
}

/* =========================================================
   RESET QUICK REPLIES FOR NEW CHAT
   ========================================================= */

function resetOrbitQuickReplies() {
  showOrbitQuickReplies();
}

/* =========================================================
   PUBLIC API
   ========================================================= */

window.OrbitQuickReplies = {
  send: sendOrbitQuickPrompt,
  hide: hideOrbitQuickReplies,
  show: showOrbitQuickReplies,
  reset: resetOrbitQuickReplies,
  clearInput: clearOrbitCommandInput,
};

/* =========================================================
   INITIALIZE
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupOrbitQuickReplies);
} else {
  setupOrbitQuickReplies();
}
