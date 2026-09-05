const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const source = (file) =>
  fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

function environment({
  timeoutCap = Infinity,
  apiUrl,
  origin = "https://adumex.example",
} = {}) {
  const window = new EventTarget();
  class Element extends EventTarget {
    value = "";
    style = {};
    dataset = {};
    innerHTML = "";
    disabled = false;
    classList = { toggle() {}, add() {}, remove() {} };
    setAttribute() {}
    setCustomValidity(value) {
      this.validityMessage = value;
    }
    reportValidity() {}
    focus() {}
    querySelectorAll() {
      return [];
    }
  }
  const input = new Element(),
    button = new Element();
  const document = new EventTarget();
  Object.assign(document, {
    readyState: "loading",
    getElementById: (id) =>
      ({ "command-input": input, "send-btn": button })[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    documentElement: new Element(),
  });
  document.documentElement.toggleAttribute = () => {};
  document.documentElement.removeAttribute = () => {};
  const storage = new Map();
  let session = { user: { id: "user-a" }, access_token: "test-token" };
  const client = { auth: { getSession: async () => ({ data: { session } }) } };
  Object.assign(window, {
    adumexSupabase: client,
    location: new URL(origin),
    innerWidth: 1000,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    ADUMEX_API_URL: apiUrl,
  });
  const context = vm.createContext({
    window,
    location: window.location,
    document,
    console,
    URL,
    URLSearchParams,
    AbortController,
    DOMException,
    TextDecoder,
    TextEncoder,
    FormData,
    CustomEvent,
    Event,
    requestAnimationFrame: (fn) => fn(),
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, timeoutCap)),
    clearTimeout,
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    fetch: (...args) => context.fetchImpl(...args),
  });
  context.fetchImpl = async () =>
    new Response("{}", { headers: { "content-type": "application/json" } });
  vm.runInContext(source("js/config.js"), context);
  const changes = [],
    chats = new Map();
  let settings = { memory: true, enterToSend: true };
  window.AdumexSettings = { getValue: (key) => settings[key] };
  window.AdumexRecentChats = {
    getUserId: () => session?.user.id,
    createChat: () => {
      const chat = { id: "chat-a" };
      chats.set(chat.id, chat);
      return chat;
    },
    updateChat: (id, values) => changes.push({ id, ...values }),
    getActiveChat: () => null,
  };
  let remembered = 0;
  window.AdumexMemory = {
    rememberFromMessage: () => {
      remembered++;
      return Promise.resolve();
    },
  };
  // View adapters are simulated. Request, SSE, state and event handlers are the actual source.
  let chat = source("js/adumex.js");
  chat = chat.replace(
    "    if (\n        document.readyState ===",
    `
        window.__chat = { state, processSse };
        createMessage = () => ({ text: "" });
        renderMessage = (element, text) => { if (element) element.text = text; };
        scrollToResponse = scrollToBottom = renderGreeting = refreshGreetingFromAuth = updatePlaceholder = autoGrowInput = updateComposerState = () => {};
        renderConversation = messages => { state.messages = normalizeMessages(messages); };
        if (\n        document.readyState ===`,
  );
  vm.runInContext(chat, context);
  document.dispatchEvent(new Event("DOMContentLoaded"));
  return {
    window,
    document,
    context,
    input,
    button,
    storage,
    changes,
    settings,
    client,
    setSession: (value) => {
      session = value;
    },
    get remembered() {
      return remembered;
    },
  };
}

function stream(frames, { open = false } = {}) {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      for (const frame of frames)
        controller.enqueue(new TextEncoder().encode(frame));
      if (!open) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  return {
    response: new Response(body, {
      headers: { "content-type": "text/event-stream" },
    }),
    get cancelled() {
      return cancelled;
    },
  };
}
const frame = (payload) => "data: " + JSON.stringify(payload) + "\n\n";
const ok = () =>
  stream(
    [
      frame({ type: "text", token: "Hello" }),
      frame({ type: "complete", reply: "Hello", conversationId: "server-a" }),
    ],
    { open: true },
  );

test("normal message completes on complete without waiting for EOF; memory cannot hold busy state", async () => {
  const e = environment();
  const response = ok();
  e.context.fetchImpl = async () => response.response;
  e.window.AdumexMemory.rememberFromMessage = () => new Promise(() => {});
  const result = await e.window.AdumexAI.sendMessage("Hi");
  assert.equal(result.success, true);
  assert.equal(e.window.AdumexAI.getState().generating, false);
  assert.equal(response.cancelled, true);
  assert.equal(e.changes.at(-1).conversationId, "server-a");
});

test("actual Enter/button handlers send; Shift+Enter and disabled Enter preference do not", async () => {
  const e = environment();
  let calls = 0;
  e.context.fetchImpl = async () => {
    calls++;
    return ok().response;
  };
  function key(shiftKey = false) {
    const event = new Event("keydown", { cancelable: true });
    Object.assign(event, { key: "Enter", shiftKey, isComposing: false });
    e.input.dispatchEvent(event);
    return event;
  }
  e.input.value = "hello";
  assert.equal(key(true).defaultPrevented, false);
  await delay(5);
  assert.equal(calls, 0);
  assert.equal(key().defaultPrevented, true);
  await delay(5);
  assert.equal(calls, 1);
  e.settings.enterToSend = false;
  e.input.value = "next";
  key();
  await delay(5);
  assert.equal(calls, 1);
  e.button.dispatchEvent(new Event("click", { cancelable: true }));
  await delay(5);
  assert.equal(calls, 2);
});

test("Stop during auth, fetch and streaming releases the composer", async () => {
  for (const phase of ["auth", "fetch", "stream"]) {
    const e = environment();
    if (phase === "auth")
      e.client.auth.getSession = () => new Promise(() => {});
    if (phase === "fetch") e.context.fetchImpl = () => new Promise(() => {});
    if (phase === "stream")
      e.context.fetchImpl = async () => stream([], { open: true }).response;
    const pending = e.window.AdumexAI.sendMessage("hello");
    await delay(5);
    e.window.AdumexAI.stopGeneration();
    const result = await pending;
    assert.equal(result.stopped, true, phase);
    assert.equal(e.window.AdumexAI.getState().generating, false, phase);
  }
});

test("DONE succeeds with text; empty DONE, premature EOF, provider errors and malformed-only responses fail", async () => {
  for (const [frames, success] of [
    [[frame({ type: "text", token: "ok" }), "data: [DONE]\n\n"], true],
    [["data: [DONE]\n\n"], false],
    [[frame({ type: "text", token: "partial" })], false],
    [[frame({ type: "error", error: "Provider unavailable" })], false],
    [["data: {invalid}\n\n"], false],
    [
      ["data: {invalid}\n\n", frame({ type: "complete", reply: "valid" })],
      true,
    ],
  ]) {
    const e = environment();
    e.context.fetchImpl = async () => stream(frames).response;
    const result = await e.window.AdumexAI.sendMessage("test");
    assert.equal(result.success, success);
    assert.equal(e.window.AdumexAI.getState().generating, false);
  }
});

test("timeouts, unavailable backend and invalid auth fail with cleanup", async () => {
  for (const mode of ["stalled", "auth-timeout", "unavailable", "invalid"]) {
    const e = environment({ timeoutCap: 25 });
    if (mode === "stalled")
      e.context.fetchImpl = async () => stream([], { open: true }).response;
    if (mode === "auth-timeout")
      e.client.auth.getSession = () => new Promise(() => {});
    if (mode === "unavailable")
      e.context.fetchImpl = async () => {
        throw new TypeError("Failed to fetch");
      };
    if (mode === "invalid")
      e.context.fetchImpl = async () =>
        new Response('{"error":"Authentication required."}', { status: 401 });
    const result = await e.window.AdumexAI.sendMessage("test");
    assert.equal(result.success, false, mode);
    assert.equal(result.stopped, false, mode);
    assert.equal(e.window.AdumexAI.getState().generating, false, mode);
  }
});

test("switching chats cancels generation and stale loads cannot overwrite the new chat", async () => {
  const e = environment();
  e.context.fetchImpl = async () => stream([], { open: true }).response;
  const pending = e.window.AdumexAI.sendMessage("test");
  await delay(5);
  await e.window.AdumexAI.openChat({
    id: "chat-b",
    messages: [{ role: "user", content: "B" }],
  });
  await pending;
  assert.equal(e.window.AdumexAI.getState().chatId, "chat-b");
  const first = deferred();
  let calls = 0;
  e.window.AdumexApi.json = () =>
    ++calls === 1
      ? first.promise
      : Promise.resolve({ messages: [{ role: "user", content: "latest" }] });
  const old = e.window.AdumexAI.openChat({
    id: "old",
    conversationId: "server-old",
  });
  await e.window.AdumexAI.openChat({ id: "new", conversationId: "server-new" });
  first.resolve({ messages: [{ role: "user", content: "stale" }] });
  await old;
  assert.equal(e.window.AdumexAI.getState().messages[0].content, "latest");
  assert.equal(e.window.AdumexAI.getState().conversationId, "server-new");
});

test("memory normalization, disabled memory and save failure", async () => {
  const e = environment();
  vm.runInContext(source("js/adumex-memory.js"), e.context);
  e.context.fetchImpl = async () =>
    new Response(JSON.stringify({ memories: ["Alice", "Bob", "Carol"] }));
  assert.deepEqual(Array.from(await e.window.AdumexMemory.load(true)), [
    "Alice",
    "Bob",
    "Carol",
  ]);
  e.settings.memory = false;
  assert.equal(
    await e.window.AdumexMemory.rememberFromMessage(
      "My name is Alice",
      "user-a",
    ),
    false,
  );
  e.settings.memory = true;
  e.context.fetchImpl = async () => {
    throw new Error("Offline");
  };
  await assert.rejects(
    e.window.AdumexMemory.rememberFromMessage("My name is Ada", "user-a"),
    /Offline/,
  );
  e.window.AdumexMemory.rememberFromMessage = async () => {
    throw new Error("Offline");
  };
  e.context.fetchImpl = async () => ok().response;
  assert.equal(
    (await e.window.AdumexAI.sendMessage("My name is Ada")).success,
    true,
  );
  assert.equal(e.window.AdumexAI.getState().generating, false);
});

test("production origin, /api and /api/chat normalize identically; local development uses localhost", () => {
  const e = environment();
  for (const suffix of ["", "/", "/api", "/api/", "/api/chat", "/api/chat/"]) {
    assert.equal(
      e.window.AdumexApi.normalizeBase("https://backend.example" + suffix),
      "https://backend.example/api",
    );
  }
  assert.equal(e.window.AdumexApi.base, "https://adumex.example/api");
  assert.equal(
    environment({ origin: "http://localhost:5500" }).window.AdumexApi.base,
    "http://localhost:5000/api",
  );
  assert.throws(
    () => e.window.AdumexApi.normalizeBase("http://backend.example"),
    /HTTPS/,
  );
});

module.exports = { environment, source, deferred, delay };
