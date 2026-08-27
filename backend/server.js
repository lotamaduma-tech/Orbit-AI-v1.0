"use strict";

const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const SIMPLE_MODEL =
  process.env.GROQ_SIMPLE_MODEL || MODEL;

const CODING_MODEL =
  process.env.GROQ_CODING_MODEL || MODEL;

const LARGE_CODING_MODEL =
  process.env.GROQ_LARGE_CODING_MODEL || MODEL;

const HISTORY_LIMIT = 60;
const MEMORY_LIMIT = 50;

const SIMPLE_MAX_TOKENS = 3000;
const CODING_MAX_TOKENS = 10000;
const LARGE_CODING_MAX_TOKENS = 14000;

const MAX_MESSAGE_LENGTH = 50000;
const MAX_CONTEXT_CHARS = 100000;

const groq = GROQ_API_KEY
  ? new Groq({
    apiKey: GROQ_API_KEY,
  })
  : null;

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(
      SUPABASE_URL,
      SUPABASE_SECRET_KEY
    )
    : null;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5500",
  "http://localhost:5501",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:5501",
  "https://orbit-ai-self.vercel.app",
  "https://orbit-ai-v1-0.netlify.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: [
      "GET",
      "POST",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
    credentials: false,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

function cleanUserId(userId) {
  if (typeof userId !== "string") {
    return "default-user";
  }

  const value = userId.trim();

  return value || "default-user";
}

function cleanConversationId(conversationId) {
  if (typeof conversationId !== "string") {
    return "";
  }

  return conversationId.trim();
}

function createConversationTitle(message) {
  if (typeof message !== "string") {
    return "New Chat";
  }

  const title = message
    .trim()
    .replace(/\s+/g, " ");

  if (!title) {
    return "New Chat";
  }

  return title.length > 60
    ? `${title.slice(0, 57)}...`
    : title;
}

function cleanHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .slice(-HISTORY_LIMIT);
}

function cleanMemory(memory) {
  if (!Array.isArray(memory)) {
    return [];
  }

  return [
    ...new Set(
      memory
        .filter(
          (item) =>
            typeof item === "string" &&
            item.trim()
        )
        .map((item) => item.trim())
    ),
  ].slice(-MEMORY_LIMIT);
}

function normalizeConversationMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (item) =>
        item &&
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }));
}

function classifyRequest(message, history = []) {
  const recentContext = history
    .slice(-8)
    .map((item) => item.content)
    .join(" ");

  const text =
    `${message} ${recentContext}`.toLowerCase();

  const codingSignals =
    /\b(code|coding|program|programming|javascript|js|typescript|html|css|node|nodejs|express|backend|frontend|api|database|supabase|sql|postgres|github|git|python|java|c\+\+|react|function|class|bug|error|debug|debugging|server|authentication|auth|login|signup|route|endpoint|component|variable|array|object|json|npm|package|deploy|deployment|vercel|render|netlify|schema|query|async|await|promise|dom|fetch|event|listener|element|div|button|form|input|navbar|sidebar|responsive|media query)\b/i;

  const debuggingSignals =
    /\b(error|bug|broken|doesn't work|does not work|not working|failed|failure|exception|crash|crashing|fix this|fix it|why isn't|why is not|undefined|null|syntax error|cors|401|403|404|500|stack trace|issue|problem)\b/i;

  const largeCodingSignals =
    /\b(complete|full|entire|whole|rewrite|refactor|architecture|system|codebase|multi[- ]file|multiple files|project|backend and frontend|authentication system|database system|rest api|api system|entire application|full website|complete website|complete application)\b/i;

  const explanationSignals =
    /\b(what is|what does|explain|meaning|difference between|how does|why does|teach me|what are|why is|how do)\b/i;

  const isCoding =
    codingSignals.test(text);

  const isDebugging =
    debuggingSignals.test(text);

  const isLargeCoding =
    largeCodingSignals.test(text) ||
    message.length > 20000 ||
    history.some(
      (item) =>
        typeof item.content === "string" &&
        item.content.length > 12000
    );

  if (isCoding && isLargeCoding) {
    return "LARGE_CODING";
  }

  if (isCoding && isDebugging) {
    return "DEBUGGING";
  }

  if (isCoding) {
    return "CODING";
  }

  if (explanationSignals.test(message)) {
    return "EXPLANATION";
  }

  return "SIMPLE";
}

function buildOptimizedContext(
  frontendHistory,
  databaseHistory,
  currentMessage
) {
  const clientMessages =
    normalizeConversationMessages(
      frontendHistory
    );

  const dbMessages =
    normalizeConversationMessages(
      databaseHistory
    );

  const sourceMessages =
    dbMessages.length
      ? dbMessages
      : clientMessages;

  if (!sourceMessages.length) {
    return [];
  }

  const recentMessages =
    sourceMessages.slice(-HISTORY_LIMIT);

  const codingSignals =
    /\b(html|css|javascript|js|typescript|node|nodejs|express|supabase|database|sql|postgres|auth|authentication|login|signup|server|api|frontend|backend|function|class|component|route|schema|github|git|vercel|render|netlify|error|bug|debug|fix|code|coding|npm|package|dom|fetch|event|listener|element|div|button|form|navbar|sidebar|responsive|media query)\b/i;

  const isCoding =
    codingSignals.test(currentMessage);

  let selectedMessages =
    recentMessages;

  if (
    isCoding &&
    recentMessages.length > 24
  ) {
    const olderRelevant =
      recentMessages
        .slice(0, -24)
        .filter((item) =>
          codingSignals.test(item.content)
        )
        .slice(-12);

    selectedMessages = [
      ...olderRelevant,
      ...recentMessages.slice(-24),
    ];
  }

  const result = [];
  let totalCharacters = 0;

  for (
    let index = selectedMessages.length - 1;
    index >= 0;
    index--
  ) {
    const item =
      selectedMessages[index];

    if (
      totalCharacters +
      item.content.length >
      MAX_CONTEXT_CHARS
    ) {
      break;
    }

    result.unshift(item);

    totalCharacters +=
      item.content.length;
  }

  return result;
}

async function getUserMemory(userId) {
  if (!supabase || !userId) {
    return [];
  }

  const { data, error } =
    await supabase
      .from("memories")
      .select("memory")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(MEMORY_LIMIT);

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => item?.memory)
    .filter(
      (item) =>
        typeof item === "string" &&
        item.trim().length > 0
    )
    .reverse();
}

async function saveUserMemory(
  userId,
  memories
) {
  if (
    !supabase ||
    !userId ||
    !Array.isArray(memories) ||
    !memories.length
  ) {
    return;
  }

  const cleanMemories = [
    ...new Set(
      memories
        .filter(
          (item) =>
            typeof item === "string" &&
            item.trim().length > 0
        )
        .map((item) => item.trim())
    ),
  ].slice(-MEMORY_LIMIT);

  if (!cleanMemories.length) {
    return;
  }

  const existingMemory =
    await getUserMemory(userId);

  const existingSet =
    new Set(existingMemory);

  const newMemories =
    cleanMemories.filter(
      (memory) =>
        !existingSet.has(memory)
    );

  if (!newMemories.length) {
    return;
  }

  const rows = newMemories.map(
    (memory) => ({
      user_id: userId,
      memory,
    })
  );

  const { error } =
    await supabase
      .from("memories")
      .insert(rows);

  if (error) {
    throw error;
  }
}

async function createConversation(
  userId,
  title
) {
  if (!supabase) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title: title || "New Chat",
      })
      .select(
        "id, user_id, title, created_at, updated_at"
      )
      .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getConversationForUser(
  conversationId,
  userId
) {
  if (!supabase) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("conversations")
      .select(
        "id, user_id, title, created_at, updated_at"
      )
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getConversationMessages(
  conversationId,
  userId
) {
  if (!supabase) {
    return null;
  }

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  if (!conversation) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("conversation_messages")
      .select(
        "id, conversation_id, role, content, created_at"
      )
      .eq(
        "conversation_id",
        conversationId
      )
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw error;
  }

  return {
    conversation,
    messages: Array.isArray(data)
      ? data
      : [],
  };
}

async function saveConversationMessage(
  conversationId,
  role,
  content
) {
  if (
    !supabase ||
    !conversationId ||
    !["user", "assistant"].includes(
      role
    ) ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("conversation_messages")
      .insert({
        conversation_id:
          conversationId,
        role,
        content: content.trim(),
      })
      .select(
        "id, conversation_id, role, content, created_at"
      )
      .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateConversationTime(
  conversationId
) {
  if (!supabase || !conversationId) {
    return;
  }

  const { error } =
    await supabase
      .from("conversations")
      .update({
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", conversationId);

  if (error) {
    console.error(
      "Conversation timestamp update failed:",
      error.message
    );
  }
}

async function getDatabaseHistory(
  conversationId,
  userId
) {
  if (!supabase || !conversationId) {
    return [];
  }

  const result =
    await getConversationMessages(
      conversationId,
      userId
    );

  if (!result) {
    return [];
  }

  return normalizeConversationMessages(
    result.messages
  );
}

function setupStreamingResponse(res) {
  res.status(200);

  res.setHeader(
    "Content-Type",
    "text/event-stream; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.setHeader(
    "X-Accel-Buffering",
    "no"
  );

  if (
    typeof res.flushHeaders ===
    "function"
  ) {
    res.flushHeaders();
  }
}

function sendSSE(
  res,
  event,
  data
) {
  if (
    res.writableEnded ||
    res.destroyed
  ) {
    return false;
  }

  res.write(
    `event: ${event}\ndata: ${JSON.stringify(
      data
    )}\n\n`
  );

  return true;
}

function createRequestAbortController(
  req,
  res
) {
  const controller =
    new AbortController();

  let disconnected = false;

  const handleDisconnect = () => {
    if (disconnected) {
      return;
    }

    disconnected = true;

    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  req.once(
    "aborted",
    handleDisconnect
  );

  res.once("close", () => {
    if (!res.writableEnded) {
      handleDisconnect();
    }
  });

  return {
    controller,
    isDisconnected: () =>
      disconnected,
  };
}

function getSystemPrompt(
  requestType,
  memory
) {
  const memoryText =
    memory.length > 0
      ? `\n\nUser memory:\n${memory
        .map(
          (item) => `- ${item}`
        )
        .join("\n")}`
      : "";

  const basePrompt = `
You are Orbit AI, a highly capable general-purpose AI assistant.

Your job is to give accurate, useful, direct, natural responses.

Understand the user's actual request before answering.

Never say that you received a request but no response was returned.

Never produce an empty response when the user has provided a valid request.

Do not ask unnecessary clarification questions when the request is already clear.

For normal conversation:
- Be natural and helpful.
- Answer directly.
- Match the user's tone when appropriate.
- Do not over-explain simple questions.

For coding requests:
- Act as an expert software engineer.
- Provide working, complete code.
- Use the exact language, framework, or technology requested.
- Make code directly copyable.
- Preserve the user's existing architecture when code is provided.
- Do not randomly redesign their project.
- Do not invent files, APIs, functions, database tables, configuration, or dependencies unless they are actually needed.
- If the user asks to update existing code, return the complete updated version when that is the most useful approach.
- Do not omit important sections of code just to make the response shorter.
- Make sure syntax is valid.
- Pay attention to quotation marks, brackets, parentheses, semicolons where appropriate, imports, exports, asynchronous functions, and variable names.
- If HTML is requested, provide valid HTML.
- If CSS is requested, provide valid CSS.
- If JavaScript is requested, provide valid JavaScript.
- If multiple technologies are requested, clearly separate each file or section.
- Do not wrap code in unnecessary explanation when the user only wants the code.

For debugging requests:
- Identify the most likely cause.
- Explain the cause briefly.
- Give the exact correction.
- Check the surrounding code for related problems.
- Do not pretend that code works if there is an obvious issue.
- Prefer a complete corrected version when the user provides a complete file.

For larger coding tasks:
- Think through the architecture before producing the solution.
- Keep existing functionality unless the user explicitly asks to remove it.
- Avoid unnecessary dependencies.
- Make the implementation consistent across frontend and backend.
- Ensure endpoints, request formats, response formats, and database field names agree.

For code formatting:
- Always use Markdown fenced code blocks for code.
- Specify the language after the opening fence when known.
- Never put important code outside the code block.
- Do not replace code with placeholders such as "rest of code here" unless the user explicitly asks for a shortened example.

Request category: ${requestType}
${memoryText}
`;

  return basePrompt.trim();
}

function getModelConfig(
  requestType
) {
  switch (requestType) {
    case "LARGE_CODING":
      return {
        model: LARGE_CODING_MODEL,
        maxTokens:
          LARGE_CODING_MAX_TOKENS,
        temperature: 0.2,
      };

    case "CODING":
      return {
        model: CODING_MODEL,
        maxTokens:
          CODING_MAX_TOKENS,
        temperature: 0.2,
      };

    case "DEBUGGING":
      return {
        model: CODING_MODEL,
        maxTokens:
          CODING_MAX_TOKENS,
        temperature: 0.15,
      };

    case "EXPLANATION":
      return {
        model: SIMPLE_MODEL,
        maxTokens:
          SIMPLE_MAX_TOKENS,
        temperature: 0.35,
      };

    default:
      return {
        model: SIMPLE_MODEL,
        maxTokens:
          SIMPLE_MAX_TOKENS,
        temperature: 0.4,
      };
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message:
      "Orbit AI backend is running.",
    provider: "Groq",
    model: MODEL,
    streaming: true,
    historyLimit: HISTORY_LIMIT,
    maxContextCharacters:
      MAX_CONTEXT_CHARS,
    memory: supabase
      ? "Persistent Supabase memory"
      : "Disabled",
    conversations: supabase
      ? "Persistent Supabase conversations"
      : "Disabled",
    database: supabase
      ? "Supabase PostgreSQL"
      : "Not configured",
  });
});

app.get(
  "/api/test-groq",
  async (req, res) => {
    if (!groq) {
      return res.status(503).json({
        success: false,
        error:
          "Groq API key is not configured.",
      });
    }

    try {
      const completion =
        await groq.chat.completions.create({
          model: SIMPLE_MODEL,
          messages: [
            {
              role: "user",
              content:
                "Reply with exactly: Orbit AI is working.",
            },
          ],
          temperature: 0,
          max_tokens: 20,
        });

      const response =
        completion?.choices?.[0]?.message?.content?.trim();

      return res.json({
        success: true,
        response: response || null,
      });
    } catch (error) {
      console.error(
        "Groq test failed:",
        error?.message || error
      );

      return res.status(502).json({
        success: false,
        error:
          "Groq connection failed.",
      });
    }
  }
);

app.get(
  "/api/test-supabase",
  async (req, res) => {
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error:
          "Supabase is not configured.",
      });
    }

    try {
      const { data, error } =
        await supabase
          .from("memories")
          .select("memory")
          .limit(1);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message:
          "Supabase connection is working.",
        rowsFound:
          Array.isArray(data)
            ? data.length
            : 0,
      });
    } catch (error) {
      console.error(
        "Supabase test failed:",
        error?.message || error
      );

      return res.status(502).json({
        success: false,
        error:
          "Supabase connection failed.",
      });
    }
  }
);

app.get(
  "/api/memory/:userId",
  async (req, res) => {
    const userId =
      cleanUserId(
        req.params.userId
      );

    if (!supabase) {
      return res.json({
        userId,
        memory: [],
      });
    }

    try {
      const memory =
        await getUserMemory(userId);

      return res.json({
        userId,
        memory,
      });
    } catch (error) {
      console.error(
        "Memory load failed:",
        error?.message || error
      );

      return res.status(500).json({
        error:
          "Could not load user memory.",
      });
    }
  }
);

app.get(
  "/api/conversations/:userId",
  async (req, res) => {
    const userId =
      cleanUserId(
        req.params.userId
      );

    if (!supabase) {
      return res.json({
        userId,
        conversations: [],
      });
    }

    try {
      const { data, error } =
        await supabase
          .from("conversations")
          .select(
            "id, user_id, title, created_at, updated_at"
          )
          .eq("user_id", userId)
          .order("updated_at", {
            ascending: false,
          })
          .limit(HISTORY_LIMIT);

      if (error) {
        throw error;
      }

      return res.json({
        userId,
        conversations:
          Array.isArray(data)
            ? data
            : [],
      });
    } catch (error) {
      console.error(
        "Conversation load failed:",
        error?.message || error
      );

      return res.status(500).json({
        error:
          "Could not load conversations.",
      });
    }
  }
);

app.post(
  "/api/conversations",
  async (req, res) => {
    if (!supabase) {
      return res.status(503).json({
        error:
          "Supabase is not configured.",
      });
    }

    const userId =
      cleanUserId(
        req.body?.userId
      );

    const rawTitle =
      req.body?.title;

    const title =
      typeof rawTitle === "string" &&
        rawTitle.trim()
        ? rawTitle
          .trim()
          .slice(0, 100)
        : "New Chat";

    try {
      const conversation =
        await createConversation(
          userId,
          title
        );

      return res.status(201).json({
        conversation,
      });
    } catch (error) {
      console.error(
        "Conversation creation failed:",
        error?.message || error
      );

      return res.status(500).json({
        error:
          "Could not create conversation.",
      });
    }
  }
);

app.get(
  "/api/conversations/:conversationId/messages",
  async (req, res) => {
    const conversationId =
      cleanConversationId(
        req.params.conversationId
      );

    const userId =
      cleanUserId(
        req.query.userId
      );

    if (!conversationId) {
      return res.status(400).json({
        error:
          "Conversation ID is required.",
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error:
          "Supabase is not configured.",
      });
    }

    try {
      const result =
        await getConversationMessages(
          conversationId,
          userId
        );

      if (!result) {
        return res.status(404).json({
          error:
            "Conversation not found.",
        });
      }

      return res.json(result);
    } catch (error) {
      console.error(
        "Conversation messages failed:",
        error?.message || error
      );

      return res.status(500).json({
        error:
          "Could not load conversation.",
      });
    }
  }
);

app.delete(
  "/api/conversations/:conversationId",
  async (req, res) => {
    const conversationId =
      cleanConversationId(
        req.params.conversationId
      );

    const userId =
      cleanUserId(
        req.query.userId
      );

    if (!conversationId) {
      return res.status(400).json({
        error:
          "Conversation ID is required.",
      });
    }

    if (!supabase) {
      return res.status(503).json({
        error:
          "Supabase is not configured.",
      });
    }

    try {
      const conversation =
        await getConversationForUser(
          conversationId,
          userId
        );

      if (!conversation) {
        return res.status(404).json({
          error:
            "Conversation not found.",
        });
      }

      const { error } =
        await supabase
          .from("conversations")
          .delete()
          .eq("id", conversationId)
          .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        conversationId,
      });
    } catch (error) {
      console.error(
        "Conversation deletion failed:",
        error?.message || error
      );

      return res.status(500).json({
        error:
          "Could not delete conversation.",
      });
    }
  }
);

app.post(
  "/api/chat",
  async (req, res) => {
    if (!groq) {
      return res.status(503).json({
        error:
          "Groq API is not configured.",
      });
    }

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error:
          "Message is required.",
      });
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return res.status(413).json({
        error:
          "Message is too long.",
      });
    }

    const userId =
      cleanUserId(
        req.body?.userId
      );

    const conversationId =
      cleanConversationId(
        req.body?.conversationId
      );

    const frontendHistory =
      cleanHistory(
        req.body?.history
      );

    const frontendMemory =
      cleanMemory(
        req.body?.memory
      );

    let databaseHistory = [];

    if (
      supabase &&
      conversationId
    ) {
      try {
        databaseHistory =
          await getDatabaseHistory(
            conversationId,
            userId
          );
      } catch (error) {
        console.error(
          "Database history load failed:",
          error?.message || error
        );
      }
    }

    const context =
      buildOptimizedContext(
        frontendHistory,
        databaseHistory,
        message
      );

    let memory = [];

    if (supabase) {
      try {
        memory =
          await getUserMemory(
            userId
          );
      } catch (error) {
        console.error(
          "Memory load failed:",
          error?.message || error
        );

        memory = [];
      }
    }

    if (!memory.length) {
      memory = frontendMemory;
    }

    const requestType =
      classifyRequest(
        message,
        context
      );

    const modelConfig =
      getModelConfig(
        requestType
      );

    const systemPrompt =
      getSystemPrompt(
        requestType,
        memory
      );

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...context,
      {
        role: "user",
        content: message,
      },
    ];

    const {
      controller,
      isDisconnected,
    } =
      createRequestAbortController(
        req,
        res
      );

    setupStreamingResponse(res);

    sendSSE(
      res,
      "start",
      {
        type: "start",
        requestType,
        model:
          modelConfig.model,
      }
    );

    let fullResponse = "";

    try {
      const stream =
        await groq.chat.completions.create(
          {
            model:
              modelConfig.model,
            messages,
            temperature:
              modelConfig.temperature,
            max_tokens:
              modelConfig.maxTokens,
            stream: true,
          },
          {
            signal:
              controller.signal,
          }
        );

      for await (
        const chunk of stream
      ) {
        if (
          isDisconnected() ||
          res.writableEnded ||
          res.destroyed
        ) {
          break;
        }

        const token =
          chunk?.choices?.[0]
            ?.delta?.content || "";

        if (!token) {
          continue;
        }

        fullResponse += token;

        sendSSE(
          res,
          "token",
          token
        );
      }

      if (
        !isDisconnected() &&
        fullResponse.trim()
      ) {
        if (
          supabase &&
          conversationId
        ) {
          try {
            await saveConversationMessage(
              conversationId,
              "user",
              message
            );

            await saveConversationMessage(
              conversationId,
              "assistant",
              fullResponse
            );

            await updateConversationTime(
              conversationId
            );
          } catch (error) {
            console.error(
              "Conversation save failed:",
              error?.message || error
            );
          }
        }

        sendSSE(
          res,
          "done",
          {
            success: true,
            response:
              fullResponse,
            conversationId:
              conversationId || null,
            requestType,
          }
        );
      } else if (
        !isDisconnected()
      ) {
        sendSSE(
          res,
          "error",
          {
            error:
              "Orbit did not receive a response from the AI.",
          }
        );
      }
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }

      console.error(
        "Chat request failed:",
        error?.message || error
      );

      if (
        !res.writableEnded &&
        !res.destroyed
      ) {
        sendSSE(
          res,
          "error",
          {
            error:
              error?.message ||
              "Orbit could not generate a response.",
          }
        );
      }
    } finally {
      if (
        !res.writableEnded &&
        !res.destroyed
      ) {
        res.end();
      }
    }
  }
);

app.use(
  (req, res) => {
    res.status(404).json({
      error: "Route not found.",
      path: req.originalUrl,
    });
  }
);

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error?.message || error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      error:
        "Internal server error.",
    });
  }
);

app.listen(PORT, () => {
  console.log(
    `Orbit AI backend running on port ${PORT}`
  );

  console.log(
    `Groq: ${groq ? "configured" : "not configured"
    }`
  );

  console.log(
    `Supabase: ${supabase
      ? "configured"
      : "not configured"
    }`
  );

  console.log(
    `Model: ${MODEL}`
  );
});