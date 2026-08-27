"use strict";

function getOrbitQuickReplyElements() {
  return {
    container: document.querySelector(".quick-prompts"),
    buttons: document.querySelectorAll(".quick-prompt"),
    intro: document.getElementById("chat-intro"),
    input: document.getElementById("command-input")
  };
}

function hideOrbitQuickReplies() {
  const { container } = getOrbitQuickReplyElements();

  if (!container) {
    return;
  }

  container.classList.add("quick-prompts-hidden");
}

function showOrbitQuickReplies() {
  const { container } = getOrbitQuickReplyElements();

  if (!container) {
    return;
  }

  container.classList.remove("quick-prompts-hidden");
}

function clearOrbitCommandInput() {
  const { input } = getOrbitQuickReplyElements();

  if (!input) {
    return;
  }

  input.value = "";

  input.dispatchEvent(
    new Event("input", {
      bubbles: true
    })
  );

  input.focus();
  input.style.height = "auto";
}

function sendOrbitQuickPrompt(prompt) {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    return;
  }

  hideOrbitQuickReplies();

  const { input } = getOrbitQuickReplyElements();

  if (input) {
    input.value = cleanPrompt;

    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );
  }

  if (
    window.OrbitAI &&
    typeof window.OrbitAI.sendMessage === "function"
  ) {
    window.OrbitAI.sendMessage(cleanPrompt);

    requestAnimationFrame(() => {
      clearOrbitCommandInput();
    });
  } else {
    console.warn("Orbit AI engine is not available yet.");

    if (input) {
      input.focus();
    }
  }
}

function setupOrbitQuickReplies() {
  const { buttons } = getOrbitQuickReplyElements();

  if (!buttons || buttons.length === 0) {
    return;
  }

  buttons.forEach(button => {
    if (button.dataset.orbitQuickReady === "true") {
      return;
    }

    button.dataset.orbitQuickReady = "true";

    button.addEventListener("click", () => {
      const prompt =
        button.dataset.prompt ||
        button.getAttribute("data-prompt");

      sendOrbitQuickPrompt(prompt);
    });
  });
}

function resetOrbitQuickReplies() {
  showOrbitQuickReplies();
}

window.OrbitQuickReplies = {
  send: sendOrbitQuickPrompt,
  hide: hideOrbitQuickReplies,
  show: showOrbitQuickReplies,
  reset: resetOrbitQuickReplies,
  clearInput: clearOrbitCommandInput
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    setupOrbitQuickReplies
  );
} else {
  setupOrbitQuickReplies();
}