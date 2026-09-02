"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Groq = require("groq-sdk");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const AdmZip = require("adm-zip");

const app = express();

const PORT = Number(process.env.PORT || 5000);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_TOKENS = Math.min(
  Number(process.env.MAX_TOKENS || 4096),
  4096
);

const MAX_FILE_SIZE = Number(
  process.env.MAX_FILE_SIZE || 15728640
);

const MAX_TOTAL_FILE_SIZE = Number(
  process.env.MAX_TOTAL_FILE_SIZE || 31457280
);

const MAX_EXTRACTED_TEXT = Number(
  process.env.MAX_EXTRACTED_TEXT || 100000
);

const REQUEST_TIMEOUT = Number(
  process.env.REQUEST_TIMEOUT || 120000
);

const HISTORY_LIMIT = 30;
const MEMORY_LIMIT = 50;
const MAX_CONTEXT_CHARS = 50000;
const MAX_MESSAGE_CHARS = 20000;
const MAX_OUTPUT_CHARS = 50000;

const groq = GROQ_API_KEY
  ? new Groq({ apiKey: GROQ_API_KEY })
  : null;

const openai = OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    : null;

const supabaseAuth =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10
  }
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = String(
        process.env.ALLOWED_ORIGINS || "*"
      )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (
        allowed.includes("*") ||
        !origin ||
        allowed.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
      );
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept"
    ]
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

function cleanText(value, maxLength = MAX_EXTRACTED_TEXT) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (item) =>
        item &&
        ["user", "assistant", "system"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .map((item) => ({
      role: item.role,
      content: cleanText(
        item.content,
        MAX_MESSAGE_CHARS
      )
    }))
    .slice(-HISTORY_LIMIT);
}

function limitContext(messages) {
  const normalized = normalizeMessages(messages);
  const result = [];
  let total = 0;

  for (
    let index = normalized.length - 1;
    index >= 0;
    index--
  ) {
    const item = normalized[index];

    if (
      total + item.content.length >
      MAX_CONTEXT_CHARS
    ) {
      break;
    }

    result.unshift(item);
    total += item.content.length;
  }

  return result;
}

function getSystemPrompt(customPrompt = "") {
  const base = `
You are Orbit AI, a highly capable general-purpose AI assistant.

You are helpful, accurate, clear, practical, and conversational.

Help the user with questions, learning, writing, programming, planning, reasoning, research-style explanations, mathematics, and general tasks.

When explaining difficult subjects, make them simple without removing important details.

When writing code, provide valid, runnable code and explain important parts when useful.

Do not claim to have performed actions, accessed information, or used tools that you did not actually use.

If the user asks for current information that you cannot verify, be honest about the limitation.

Keep responses natural and useful.
`;

  const custom = cleanText(customPrompt, 10000);

  return custom
    ? `${base}\nAdditional instructions:\n${custom}`
    : base;
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

async function authenticateRequest(req) {
  const token = getBearerToken(req);

  if (!token || !supabaseAuth) {
    return {
      authenticated: false,
      user: null,
      token
    };
  }

  try {
    const {
      data,
      error
    } = await supabaseAuth.auth.getUser(token);

    if (error || !data?.user) {
      return {
        authenticated: false,
        user: null,
        token
      };
    }

    return {
      authenticated: true,
      user: data.user,
      token
    };
  } catch {
    return {
      authenticated: false,
      user: null,
      token
    };
  }
}

function getAuthenticatedUserId(auth) {
  return auth?.authenticated && auth?.user?.id
    ? String(auth.user.id)
    : null;
}

function setSSEHeaders(res) {
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

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
}

function sendSSE(res, payload) {
  if (res.writableEnded) {
    return;
  }

  const data =
    typeof payload === "string"
      ? payload
      : JSON.stringify(payload);

  res.write(`data: ${data}\n\n`);
}

function sendDone(res) {
  if (res.writableEnded) {
    return;
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

function sendSSEError(res, message) {
  if (res.writableEnded) {
    return;
  }

  sendSSE(res, {
    type: "error",
    error: cleanText(message, 3000)
  });

  sendDone(res);
}

function isImageFile(file) {
  return Boolean(
    file &&
    typeof file.mimetype === "string" &&
    file.mimetype.startsWith("image/")
  );
}

function getFileExtension(filename) {
  const name = String(filename || "");
  const index = name.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return name.slice(index + 1).toLowerCase();
}

function isPdf(file) {
  return (
    file?.mimetype === "application/pdf" ||
    getFileExtension(file?.originalname) === "pdf"
  );
}

function isDocx(file) {
  return (
    file?.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    getFileExtension(file?.originalname) === "docx"
  );
}

function isZip(file) {
  return (
    file?.mimetype === "application/zip" ||
    file?.mimetype === "application/x-zip-compressed" ||
    getFileExtension(file?.originalname) === "zip"
  );
}

function isTextLike(file) {
  const extension = getFileExtension(
    file?.originalname
  );

  const textExtensions = new Set([
    "txt",
    "md",
    "markdown",
    "csv",
    "json",
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    "xml",
    "yaml",
    "yml",
    "sql",
    "py",
    "java",
    "c",
    "h",
    "cpp",
    "hpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "kts",
    "dart",
    "sh",
    "bash",
    "ps1",
    "env",
    "gitignore",
    "log"
  ]);

  return (
    String(file?.mimetype || "").startsWith("text/") ||
    textExtensions.has(extension) ||
    extension === ""
  );
}

function bufferLooksBinary(buffer) {
  const sample = buffer.subarray(
    0,
    Math.min(buffer.length, 4096)
  );

  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }
  }

  return false;
}

async function extractZipText(file) {
  const zip = new AdmZip(file.buffer);
  const entries = zip.getEntries();
  const parts = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    const buffer = entry.getData();

    if (
      buffer.length >
      MAX_EXTRACTED_TEXT
    ) {
      continue;
    }

    if (bufferLooksBinary(buffer)) {
      continue;
    }

    const text = cleanText(
      buffer.toString("utf8"),
      MAX_EXTRACTED_TEXT
    );

    if (text) {
      parts.push(
        `File: ${entry.entryName}\n${text}`
      );
    }

    if (
      parts.join("\n\n").length >=
      MAX_EXTRACTED_TEXT
    ) {
      break;
    }
  }

  return parts.join("\n\n");
}

async function extractFileText(file) {
  if (!file) {
    throw new Error("Invalid file.");
  }

  const filename =
    file.originalname || "uploaded-file";

  if (isPdf(file)) {
    const result = await pdfParse(file.buffer);

    return {
      name: filename,
      type: file.mimetype,
      size: file.size,
      text: cleanText(
        result?.text || "",
        MAX_EXTRACTED_TEXT
      ),
      readable: true
    };
  }

  if (isDocx(file)) {
    const result =
      await mammoth.extractRawText({
        buffer: file.buffer
      });

    return {
      name: filename,
      type: file.mimetype,
      size: file.size,
      text: cleanText(
        result?.value || "",
        MAX_EXTRACTED_TEXT
      ),
      readable: true
    };
  }

  if (isZip(file)) {
    return {
      name: filename,
      type: file.mimetype,
      size: file.size,
      text: await extractZipText(file),
      readable: true
    };
  }

  if (
    isTextLike(file) ||
    file.mimetype === "application/json"
  ) {
    return {
      name: filename,
      type: file.mimetype,
      size: file.size,
      text: cleanText(
        file.buffer.toString("utf8"),
        MAX_EXTRACTED_TEXT
      ),
      readable: true
    };
  }

  return {
    name: filename,
    type: file.mimetype,
    size: file.size,
    text: "",
    readable: false
  };
}

function buildFileContext(files) {
  if (!Array.isArray(files) || !files.length) {
    return "";
  }

  const parts = [];

  for (const file of files) {
    if (!file?.text) {
      continue;
    }

    parts.push(
      `File: ${file.name}\n${file.text}`
    );
  }

  return cleanText(
    parts.join("\n\n"),
    MAX_CONTEXT_CHARS
  );
}

function buildUserMessage(message, fileContext = "") {
  const cleanMessage = cleanText(
    message,
    MAX_MESSAGE_CHARS
  );

  if (!fileContext) {
    return cleanMessage;
  }

  return `${cleanMessage}\n\nAttached file context:\n${fileContext}`;
}

function getRequestNumber(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    256,
    Math.min(number, MAX_TOKENS)
  );
}

function buildGroqMessages({
  systemPrompt,
  history,
  message,
  memory,
  fileContext
}) {
  const messages = [
    {
      role: "system",
      content: systemPrompt
    }
  ];

  const memoryText = Array.isArray(memory)
    ? memory
      .filter(Boolean)
      .join("\n")
    : String(memory || "");

  if (memoryText.trim()) {
    messages.push({
      role: "system",
      content:
        `Relevant user memory:\n${cleanText(
          memoryText,
          12000
        )}`
    });
  }

  const normalizedHistory =
    limitContext(history);

  for (const item of normalizedHistory) {
    messages.push({
      role: item.role,
      content: item.content
    });
  }

  messages.push({
    role: "user",
    content: buildUserMessage(
      message,
      fileContext
    )
  });

  return messages;
}

async function createGroqStream(
  model,
  messages,
  options,
  signal
) {
  if (!groq) {
    throw new Error(
      "Groq API is not configured."
    );
  }

  return groq.chat.completions.create(
    {
      model,
      messages,
      temperature:
        typeof options.temperature === "number"
          ? options.temperature
          : 0.2,
      max_tokens: getRequestNumber(
        options.max_tokens,
        MAX_TOKENS
      ),
      stream: true
    },
    {
      signal
    }
  );
}

async function streamGroqResponse(
  messages,
  options,
  onToken
) {
  if (!groq) {
    throw new Error(
      "Groq API is not configured."
    );
  }

  const controller =
    new AbortController();

  const timeoutId = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  const primaryModel =
    options.model || GROQ_MODEL;

  const fallbackModel =
    GROQ_FALLBACK_MODEL &&
      GROQ_FALLBACK_MODEL !== primaryModel
      ? GROQ_FALLBACK_MODEL
      : null;

  try {
    let stream;
    let activeModel = primaryModel;

    try {
      stream =
        await createGroqStream(
          primaryModel,
          messages,
          options,
          controller.signal
        );
    } catch (primaryError) {
      if (!fallbackModel) {
        throw primaryError;
      }

      activeModel = fallbackModel;

      stream =
        await createGroqStream(
          fallbackModel,
          messages,
          options,
          controller.signal
        );
    }

    let fullText = "";

    for await (const chunk of stream) {
      const token =
        chunk?.choices?.[0]?.delta?.content ||
        "";

      if (!token) {
        continue;
      }

      fullText += token;

      if (fullText.length > MAX_OUTPUT_CHARS) {
        break;
      }

      if (typeof onToken === "function") {
        onToken(token);
      }
    }

    return {
      text: cleanText(
        fullText,
        MAX_OUTPUT_CHARS
      ),
      model: activeModel
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getUserMemories(userId) {
  if (!supabaseAdmin || !userId) {
    return [];
  }

  try {
    const { data, error } =
      await supabaseAdmin
        .from("memories")
        .select("memory, created_at")
        .eq(
          "user_id",
          String(userId)
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        )
        .limit(MEMORY_LIMIT);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data
      .map((item) =>
        cleanText(
          item?.memory,
          4000
        )
      )
      .filter(Boolean)
      .slice(-MEMORY_LIMIT);
  } catch {
    return [];
  }
}

async function saveMemory(
  userId,
  memory
) {
  if (!supabaseAdmin || !userId) {
    return false;
  }

  try {
    const { error } =
      await supabaseAdmin
        .from("memories")
        .insert({
          user_id: String(userId),
          memory: cleanText(
            memory,
            4000
          )
        });

    return !error;
  } catch {
    return false;
  }
}

async function createConversation(
  userId,
  title
) {
  if (!supabaseAdmin || !userId) {
    return null;
  }

  try {
    const { data, error } =
      await supabaseAdmin
        .from("conversations")
        .insert({
          user_id: String(userId),
          title: cleanText(
            title,
            200
          ) || "New Chat"
        })
        .select(
          "id, title, is_pinned, created_at, updated_at"
        )
        .single();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

async function getConversation(
  conversationId,
  userId
) {
  if (
    !supabaseAdmin ||
    !conversationId ||
    !userId
  ) {
    return null;
  }

  try {
    const { data, error } =
      await supabaseAdmin
        .from("conversations")
        .select(
          "id, title, is_pinned, created_at, updated_at"
        )
        .eq(
          "id",
          conversationId
        )
        .eq(
          "user_id",
          String(userId)
        )
        .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

async function getConversationMessages(
  conversationId,
  userId
) {
  if (
    !supabaseAdmin ||
    !conversationId ||
    !userId
  ) {
    return [];
  }

  try {
    const conversation =
      await getConversation(
        conversationId,
        userId
      );

    if (!conversation) {
      return [];
    }

    const { data, error } =
      await supabaseAdmin
        .from("messages")
        .select(
          "role, content, created_at"
        )
        .eq(
          "conversation_id",
          conversationId
        )
        .eq(
          "user_id",
          String(userId)
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        )
        .limit(HISTORY_LIMIT);

    if (
      error ||
      !Array.isArray(data)
    ) {
      return [];
    }

    return normalizeMessages(data);
  } catch {
    return [];
  }
}

async function saveMessage(
  conversationId,
  userId,
  role,
  content
) {
  if (
    !supabaseAdmin ||
    !conversationId ||
    !userId
  ) {
    return false;
  }

  try {
    const { error } =
      await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id:
            conversationId,
          user_id:
            String(userId),
          role,
          content: cleanText(
            content,
            MAX_MESSAGE_CHARS
          )
        });

    return !error;
  } catch {
    return false;
  }
}

async function listConversations(userId) {
  if (!supabaseAdmin || !userId) {
    return [];
  }

  try {
    const { data, error } =
      await supabaseAdmin
        .from("conversations")
        .select(
          "id, title, is_pinned, created_at, updated_at"
        )
        .eq(
          "user_id",
          String(userId)
        )
        .order(
          "is_pinned",
          {
            ascending: false
          }
        )
        .order(
          "updated_at",
          {
            ascending: false
          }
        )
        .limit(HISTORY_LIMIT);

    if (
      error ||
      !Array.isArray(data)
    ) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

async function deleteConversation(
  conversationId,
  userId
) {
  if (
    !supabaseAdmin ||
    !conversationId ||
    !userId
  ) {
    return false;
  }

  try {
    const conversation =
      await getConversation(
        conversationId,
        userId
      );

    if (!conversation) {
      return null;
      
    }

    const {
      error: messagesError
    } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq(
        "conversation_id",
        conversationId
      )
      .eq(
        "user_id",
        String(userId)
      );

    if (messagesError) {
      return false;
    }

    const { error } =
      await supabaseAdmin
        .from("conversations")
        .delete()
        .eq(
          "id",
          conversationId
        )
        .eq(
          "user_id",
          String(userId)
        );

    return !error;
  } catch {
    return false;
  }
}

async function setConversationPinned(
  conversationId,
  userId,
  isPinned
) {
  if (
    !supabaseAdmin ||
    !conversationId ||
    !userId
  ) {
    return null;
  }

  try {
    const { data, error } =
      await supabaseAdmin
        .from("conversations")
        .update({
          is_pinned: Boolean(
            isPinned
          ),
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          conversationId
        )
        .eq(
          "user_id",
          String(userId)
        )
        .select(
          "id, title, is_pinned, created_at, updated_at"
        )
        .maybeSingle();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function detectImageRequest(message) {
  const text = String(
    message || ""
  ).toLowerCase();

  return (
    text.includes("generate an image") ||
    text.includes("generate image") ||
    text.includes("create an image") ||
    text.includes("make an image") ||
    text.includes("draw an image")
  );
}

async function generateImage(prompt) {
  if (!openai) {
    throw new Error(
      "OpenAI image generation is not configured."
    );
  }

  const result =
    await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: cleanText(
        prompt,
        4000
      ),
      size: "1024x1024"
    });

  const item =
    result?.data?.[0];

  if (!item) {
    throw new Error(
      "OpenAI did not return an image."
    );
  }

  if (item.b64_json) {
    return {
      type: "image",
      data: item.b64_json,
      mimeType: "image/png"
    };
  }

  if (item.url) {
    return {
      type: "image_url",
      url: item.url
    };
  }

  throw new Error(
    "OpenAI returned an unsupported image response."
  );
}

async function readImageWithOpenAI(
  file,
  message = ""
) {
  if (!openai) {
    throw new Error(
      "OpenAI is not configured for image reading."
    );
  }

  const base64 =
    file.buffer.toString("base64");

  const response =
    await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                cleanText(
                  message,
                  8000
                ) ||
                "Analyze this image and describe the important information visible in it."
            },
            {
              type: "input_image",
              image_url:
                `data:${file.mimetype};base64,${base64}`
            }
          ]
        }
      ],
      max_output_tokens: 3000
    });

  return cleanText(
    response?.output_text || "",
    MAX_EXTRACTED_TEXT
  );
}

app.get("/", (req, res) => {
  res.json({
    name: "Orbit AI API",
    status: "online",
    version: "2.2.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    groq: Boolean(groq),
    openai: Boolean(openai),
    supabase: Boolean(
      supabaseAdmin
    ),
    model: GROQ_MODEL,
    fallbackModel:
      GROQ_FALLBACK_MODEL
  });
});

app.post(
  "/api/chat",
  upload.array("files", 10),
  async (req, res) => {
    const message = cleanText(
      req.body?.message,
      MAX_MESSAGE_CHARS
    );

    if (!message) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const auth =
      await authenticateRequest(req);

    const userId =
      getAuthenticatedUserId(auth);

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    if (!groq) {
      return res.status(503).json({
        error:
          "Groq API is not configured."
      });
    }

    const files = Array.isArray(
      req.files
    )
      ? req.files
      : [];

    const totalFileSize =
      files.reduce(
        (total, file) =>
          total +
          Number(
            file.size || 0
          ),
        0
      );

    if (
      totalFileSize >
      MAX_TOTAL_FILE_SIZE
    ) {
      return res.status(413).json({
        error:
          "The combined uploaded files are too large."
      });
    }

    let parsedFiles = [];

    try {
      parsedFiles =
        await Promise.all(
          files.map(
            extractFileText
          )
        );
    } catch (error) {
      return res.status(400).json({
        error:
          error?.message ||
          "Unable to read one of the uploaded files."
      });
    }

    const imageFiles =
      files.filter(isImageFile);

    if (
      imageFiles.length &&
      message
    ) {
      const imageResults = [];

      for (
        const image of imageFiles
      ) {
        try {
          const description =
            await readImageWithOpenAI(
              image,
              message
            );

          if (description) {
            imageResults.push(
              `Image: ${image.originalname}\n${description}`
            );
          }
        } catch {
          imageResults.push(
            `Image: ${image.originalname}\nUnable to analyze this image.`
          );
        }
      }

      if (imageResults.length) {
        parsedFiles.push({
          name:
            "Image analysis",
          type:
            "image/analysis",
          size: 0,
          text:
            imageResults.join(
              "\n\n"
            ),
          readable: true
        });
      }
    }

    let history = [];

    const suppliedHistory =
      typeof req.body?.history ===
        "string"
        ? (() => {
          try {
            return JSON.parse(
              req.body.history
            );
          } catch {
            return [];
          }
        })()
        : req.body?.history;

    history =
      normalizeMessages(
        suppliedHistory
      );

    let memories =
      await getUserMemories(
        userId
      );

    if (!memories.length) {
      const suppliedMemory =
        typeof req.body?.memory ===
          "string"
          ? req.body.memory
          : "";

      if (suppliedMemory) {
        memories =
          suppliedMemory
            .split("\n")
            .map(
              (item) =>
                item.trim()
            )
            .filter(Boolean)
            .slice(
              -MEMORY_LIMIT
            );
      }
    }

    let conversationId =
      cleanText(
        req.body?.conversationId,
        100
      );

    if (
      conversationId
    ) {
      const existing =
        await getConversation(
          conversationId,
          userId
        );

      if (existing) {
        const storedMessages =
          await getConversationMessages(
            conversationId,
            userId
          );

        if (
          storedMessages.length
        ) {
          history =
            storedMessages;
        }
      } else {
        conversationId = "";
      }
    }

    if (!conversationId) {
      const title =
        message.length > 80
          ? `${message.slice(
            0,
            80
          )}...`
          : message;

      const conversation =
        await createConversation(
          userId,
          title
        );

      conversationId =
        conversation?.id || "";
    }

    const fileContext =
      buildFileContext(
        parsedFiles
      );

    const userContent =
      buildUserMessage(
        message,
        fileContext
      );

    if (conversationId) {
      await saveMessage(
        conversationId,
        userId,
        "user",
        userContent
      );
    }

    const systemPrompt =
      getSystemPrompt(
        req.body?.systemPrompt
      );

    const messages =
      buildGroqMessages({
        systemPrompt,
        history,
        message,
        memory: memories,
        fileContext
      });

    setSSEHeaders(res);

    let disconnected = false;

    req.on("close", () => {
      disconnected = true;
    });

    const startedAt =
      Date.now();

    try {
      if (
        detectImageRequest(
          message
        )
      ) {
        try {
          const generated =
            await generateImage(
              message
            );

          if (
            disconnected
          ) {
            return;
          }

          sendSSE(res, {
            type: "image",
            ...generated
          });

          sendSSE(res, {
            type: "text",
            token:
              "I generated the image based on your request."
          });

          sendDone(res);
          return;
        } catch {
        }
      }

      let fullResponse = "";
      let activeModel =
        GROQ_MODEL;

      const result =
        await streamGroqResponse(
          messages,
          {
            model:
              req.body?.model ||
              GROQ_MODEL,
            max_tokens:
              req.body?.max_tokens,
            temperature:
              req.body?.temperature
          },
          (token) => {
            if (
              disconnected
            ) {
              return;
            }

            fullResponse +=
              token;

            sendSSE(res, {
              type: "text",
              token
            });
          }
        );

      fullResponse =
        result.text;

      activeModel =
        result.model;

      if (
        disconnected
      ) {
        return;
      }

      if (
        !fullResponse.trim()
      ) {
        throw new Error(
          "Groq returned an empty response."
        );
      }

      if (
        conversationId
      ) {
        await saveMessage(
          conversationId,
          userId,
          "assistant",
          fullResponse
        );

        if (
          supabaseAdmin
        ) {
          await supabaseAdmin
            .from(
              "conversations"
            )
            .update({
              updated_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              conversationId
            )
            .eq(
              "user_id",
              String(
                userId
              )
            );
        }
      }

      sendSSE(res, {
        type: "complete",
        reply: fullResponse,
        conversationId,
        model: activeModel,
        responseTime:
          Date.now() -
          startedAt
      });

      sendDone(res);
    } catch (error) {
      if (
        disconnected
      ) {
        return;
      }

      sendSSEError(
        res,
        error?.message ||
        "Unable to generate a response."
      );
    }
  }
);

app.get(
  "/api/conversations",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const conversations =
      await listConversations(
        userId
      );

    return res.json({
      conversations
    });
  }
);

app.post(
  "/api/conversations",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const title =
      cleanText(
        req.body?.title,
        200
      ) || "New Chat";

    if (!supabaseAdmin) {
      return res.status(503).json({
        error:
          "Supabase is not configured."
      });
    }

    try {
      const conversation =
        await createConversation(
          userId,
          title
        );

      if (!conversation) {
        return res.status(500).json({
          error:
            "Unable to create conversation."
        });
      }

      return res.json({
        success: true,
        conversation
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to create conversation."
      });
    }
  }
);

app.get(
  "/api/conversations/:id/messages",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const conversation =
      await getConversation(
        req.params.id,
        userId
      );

    if (!conversation) {
      return res.status(404).json({
        error:
          "Conversation not found."
      });
    }

    const messages =
      await getConversationMessages(
        req.params.id,
        userId
      );

    return res.json({
      messages
    });
  }
);

app.patch(
  "/api/conversations/:id",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({
        error:
          "Supabase is not configured."
      });
    }

    const conversation =
      await getConversation(
        req.params.id,
        userId
      );

    if (!conversation) {
      return res.status(404).json({
        error:
          "Conversation not found."
      });
    }

    const title =
      cleanText(
        req.body?.title,
        200
      );

    if (!title) {
      return res.status(400).json({
        error:
          "Conversation title is required."
      });
    }

    try {
      const {
        data,
        error
      } = await supabaseAdmin
        .from(
          "conversations"
        )
        .update({
          title,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          req.params.id
        )
        .eq(
          "user_id",
          String(
            userId
          )
        )
        .select(
          "id, title, is_pinned, created_at, updated_at"
        )
        .maybeSingle();

      if (error) {
        return res.status(500).json({
          error:
            error.message
        });
      }

      return res.json({
        success: true,
        conversation: data
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to rename conversation."
      });
    }
  }
);

app.patch(
  "/api/conversations/:id/pin",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const conversation =
      await getConversation(
        req.params.id,
        userId
      );

    if (!conversation) {
      return res.status(404).json({
        error:
          "Conversation not found."
      });
    }

    const isPinned =
      typeof req.body?.isPinned ===
        "boolean"
        ? req.body.isPinned
        : !Boolean(
          conversation.is_pinned
        );

    try {
      const updated =
        await setConversationPinned(
          req.params.id,
          userId,
          isPinned
        );

      if (!updated) {
        return res.status(500).json({
          error:
            "Unable to update conversation pin."
        });
      }

      return res.json({
        success: true,
        conversation: updated
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to update conversation pin."
      });
    }
  }
);

app.delete(
  "/api/conversations/:id",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    if (!supabaseAdmin) {
      return res.status(503).json({
        error:
          "Supabase is not configured."
      });
    }

    try {
      const deleted =
        await deleteConversation(
          req.params.id,
          userId
        );

      if (deleted === null) {
        return res.status(404).json({
          error:
            "Conversation not found."
        });
      }

      if (!deleted) {
        return res.status(500).json({
          error:
            "Unable to delete conversation."
        });
      }

      return res.json({
        success: true,
        conversationId:
          req.params.id
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to delete conversation."
      });
    }
  }
);

app.get(
  "/api/memories",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const memories =
      await getUserMemories(
        userId
      );

    return res.json({
      memories
    });
  }
);

app.post(
  "/api/memories",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    const userId =
      getAuthenticatedUserId(
        auth
      );

    if (!userId) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const memory =
      cleanText(
        req.body?.memory,
        4000
      );

    if (!memory) {
      return res.status(400).json({
        error:
          "Memory is required."
      });
    }

    const success =
      await saveMemory(
        userId,
        memory
      );

    if (!success) {
      return res.status(500).json({
        error:
          "Unable to save memory."
      });
    }

    return res.json({
      success: true
    });
  }
);

app.post(
  "/api/generate-image",
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    if (!auth.authenticated) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    const prompt =
      cleanText(
        req.body?.prompt,
        4000
      );

    if (!prompt) {
      return res.status(400).json({
        error:
          "Image prompt is required."
      });
    }

    try {
      const image =
        await generateImage(
          prompt
        );

      return res.json({
        success: true,
        ...image
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to generate image."
      });
    }
  }
);

app.post(
  "/api/read-image",
  upload.single("file"),
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    if (!auth.authenticated) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error:
          "Image file is required."
      });
    }

    if (!isImageFile(req.file)) {
      return res.status(400).json({
        error:
          "The uploaded file must be an image."
      });
    }

    try {
      const text =
        await readImageWithOpenAI(
          req.file,
          req.body?.message
        );

      return res.json({
        success: true,
        filename:
          req.file.originalname,
        text
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to read the image."
      });
    }
  }
);

app.post(
  "/api/read-file",
  upload.single("file"),
  async (req, res) => {
    const auth =
      await authenticateRequest(
        req
      );

    if (!auth.authenticated) {
      return res.status(401).json({
        error:
          "Authentication required."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error:
          "File is required."
      });
    }

    try {
      if (isImageFile(req.file)) {
        const text =
          await readImageWithOpenAI(
            req.file,
            req.body?.message
          );

        return res.json({
          success: true,
          filename:
            req.file.originalname,
          mimetype:
            req.file.mimetype,
          size:
            req.file.size,
          readable: true,
          text
        });
      }

      const result =
        await extractFileText(
          req.file
        );

      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      return res.status(500).json({
        error:
          error?.message ||
          "Unable to read the file."
      });
    }
  }
);

app.get(
  "/api/test-groq",
  async (req, res) => {
    if (!groq) {
      return res.status(503).json({
        success: false,
        error:
          "Groq API is not configured."
      });
    }

    try {
      const response =
        await groq.chat.completions.create(
          {
            model:
              GROQ_MODEL,
            messages: [
              {
                role: "user",
                content:
                  "Reply with exactly: Orbit AI backend is working."
              }
            ],
            max_tokens: 50,
            temperature: 0
          }
        );

      return res.json({
        success: true,
        model:
          GROQ_MODEL,
        response:
          response
            ?.choices?.[0]
            ?.message
            ?.content || ""
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Groq test failed."
      });
    }
  }
);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found.",
    path: req.path
  });
});

app.use(
  (error, req, res, next) => {
    if (
      error?.code ===
      "LIMIT_FILE_SIZE"
    ) {
      return res.status(413).json({
        error:
          "The uploaded file is too large."
      });
    }

    if (
      error?.code ===
      "LIMIT_FILE_COUNT"
    ) {
      return res.status(413).json({
        error:
          "Too many files were uploaded."
      });
    }

    if (
      error?.message ===
      "Origin not allowed by CORS"
    ) {
      return res.status(403).json({
        error:
          "Origin is not allowed."
      });
    }

    return res.status(500).json({
      error:
        error?.message ||
        "Internal server error."
    });
  }
);

app.listen(
  PORT,
  () => {
    console.log(
      `Orbit AI backend running on port ${PORT}`
    );
  }
);
