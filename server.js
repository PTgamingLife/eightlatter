import crypto from "node:crypto";
import http from "node:http";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

loadDotEnv();

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const dataDir = join(root, "data");
const statePath = join(dataDir, "line-state.json");
const preferredPort = getPreferredPort(process.env.PORT, 3000);
const config = {
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET || "",
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  targetChatId: process.env.LINE_TARGET_CHAT_ID || "",
  adminUserIds: splitList(process.env.LINE_ADMIN_USER_IDS),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, ""),
  dailyImageUrl: process.env.DAILY_HEALTH_IMAGE_URL || "",
  mockMode: process.env.MOCK_MODE !== "false",
  aiTriggerPattern: new RegExp(process.env.AI_TRIGGER_PATTERN || "^(AI|ai|問AI|請問AI)[:：\\s]+"),
  dailyAiQuota: getPositiveInteger(process.env.DAILY_AI_QUOTA, 10),
  dailyPushTime: process.env.DAILY_PUSH_TIME || "08:00",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || "gemini-flash-latest",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || "creator-videos",
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

await ensureState();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, { ok: true, mockMode: config.mockMode });
    }

    if (req.method === "GET" && url.pathname === "/app-config") {
      return sendJson(res, {
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
        supabaseStorageBucket: config.supabaseStorageBucket,
      });
    }

    if (req.method === "GET" && url.pathname === "/line/daily-card.svg") {
      return sendSvg(res, createHealthSvg(await createDailyHealthContent()));
    }

    if (req.method === "POST" && url.pathname === "/line/webhook") {
      return await handleLineWebhook(req, res);
    }

    if (req.method === "POST" && url.pathname === "/admin/daily-push") {
      return await handleDailyPush(req, res);
    }

    if (req.method !== "GET") {
      return sendJson(res, { error: "Method not allowed" }, 405);
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, { error: "Internal server error" }, 500);
  }
});

scheduleDailyPush();
listenOnAvailablePort(server, preferredPort);

async function handleLineWebhook(req, res) {
  const body = await readRequestBody(req);

  if (!config.mockMode && !verifyLineSignature(body, req.headers["x-line-signature"])) {
    return sendJson(res, { error: "Invalid LINE signature" }, 401);
  }

  const payload = JSON.parse(body || "{}");
  const events = Array.isArray(payload.events) ? payload.events : [];

  for (const event of events) {
    await processLineEvent(event);
  }

  sendJson(res, { ok: true });
}

async function processLineEvent(event) {
  if (event.type !== "message" || event.message?.type !== "text") {
    return;
  }

  const chatId = getChatId(event.source);
  const userId = event.source?.userId;
  const text = event.message.text || "";

  if (config.targetChatId && chatId !== config.targetChatId) {
    return;
  }

  if (containsUrl(text)) {
    await recordViolation({ chatId, userId, text, messageId: event.message.id });
    await notifyModeration(event, chatId, userId, text);
    return;
  }

  if (config.aiTriggerPattern.test(text)) {
    await handleAiReply(event, text.replace(config.aiTriggerPattern, "").trim());
  }
}

async function handleAiReply(event, question) {
  const replyToken = event.replyToken;
  const userId = event.source?.userId || "unknown";

  if (!replyToken) {
    return;
  }

  const state = await readState();
  const today = getLocalDateKey();
  state.aiQuota[today] ||= { used: 0, users: {} };

  if (state.blockedUsers[userId]) {
    await replyText(replyToken, "你目前無法使用 AI 回覆功能，請聯繫管理員。");
    return;
  }

  if (state.aiQuota[today].used >= config.dailyAiQuota) {
    await replyText(replyToken, "今日 AI 名額已額滿，明天早上會重新開放。");
    return;
  }

  state.aiQuota[today].used += 1;
  state.aiQuota[today].users[userId] = (state.aiQuota[today].users[userId] || 0) + 1;
  await writeState(state);

  const answer = await createAiAnswer(question || "請提供一個簡短的健康建議。");
  await replyText(replyToken, `AI 回覆（今日剩餘 ${config.dailyAiQuota - state.aiQuota[today].used} 名額）\n\n${answer}`);
}

async function handleDailyPush(req, res) {
  const body = await readJsonBody(req);
  const secret = process.env.ADMIN_WEBHOOK_SECRET || "";

  if (secret && body.secret !== secret) {
    return sendJson(res, { error: "Forbidden" }, 403);
  }

  const result = await pushDailyHealthInfo();
  sendJson(res, result);
}

async function pushDailyHealthInfo() {
  if (!config.targetChatId) {
    return { ok: false, error: "LINE_TARGET_CHAT_ID is not set" };
  }

  const content = await createDailyHealthContent();
  const messages = [createHealthFlexMessage(content)];

  if (config.dailyImageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: config.dailyImageUrl,
      previewImageUrl: config.dailyImageUrl,
    });
  }

  await pushMessages(config.targetChatId, messages);
  return { ok: true, sentTo: config.targetChatId, title: content.title };
}

async function createDailyHealthContent() {
  const fallback = {
    title: "今日健康提醒",
    summary: "早餐加入蛋白質、午餐多一份蔬菜，並在下午安排 10 分鐘步行，有助於穩定精神與血糖。",
    tip: "今天先做到一件小事：每 60 分鐘起身喝水、伸展 1 分鐘。",
    source: "系統健康知識庫",
  };

  if (config.mockMode || !config.geminiApiKey) {
    return fallback;
  }

  const prompt = "請用繁體中文產生一則適合 LINE 早晨推播的健康新聞或知識，JSON 格式含 title、summary、tip、source。內容需保守、不可取代醫療診斷。";
  const text = await callGemini(prompt);

  try {
    return { ...fallback, ...JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}") };
  } catch {
    return { ...fallback, summary: text.slice(0, 180) || fallback.summary };
  }
}

async function createAiAnswer(question) {
  const safeQuestion = question.slice(0, 500);

  if (config.mockMode || !config.geminiApiKey) {
    return `我收到你的問題：「${safeQuestion}」。建議先用低風險方式處理：補充水分、規律作息、觀察症狀變化；若有胸痛、呼吸困難、劇烈疼痛或症狀持續，請優先尋求專業醫療協助。`;
  }

  return await callGemini(`請用繁體中文簡短回答會員的健康提問。請加入醫療免責提醒，不做診斷、不開藥。\n\n問題：${safeQuestion}`);
}

async function callGemini(prompt) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.geminiTextModel}:generateContent?key=${config.geminiApiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

async function recordViolation(violation) {
  const state = await readState();
  const userId = violation.userId || "unknown";
  state.blockedUsers[userId] = {
    reason: "link_detected",
    blockedAt: new Date().toISOString(),
    chatId: violation.chatId,
  };
  state.violations.push({ ...violation, createdAt: new Date().toISOString() });
  await writeState(state);
}

async function notifyModeration(event, chatId, userId, text) {
  const message = [
    "偵測到含連結訊息，已將該會員加入系統封鎖名單。",
    `chatId: ${chatId}`,
    `userId: ${userId || "unknown"}`,
    `內容: ${text.slice(0, 300)}`,
    "注意：LINE Official Messaging API 不提供刪除他人訊息或踢出會員的官方端點，需由群組管理員手動處理。",
  ].join("\n");

  if (event.replyToken) {
    await replyText(event.replyToken, "系統偵測到連結訊息，已通知管理員處理。");
  }

  for (const adminId of config.adminUserIds) {
    await pushMessages(adminId, [{ type: "text", text: message }]);
  }
}

function createHealthFlexMessage(content) {
  return {
    type: "flex",
    altText: content.title,
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: config.dailyImageUrl || "https://placehold.co/1040x1040/png?text=Health",
        size: "full",
        aspectRatio: "1:1",
        aspectMode: "cover",
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          { type: "text", text: content.title, weight: "bold", size: "lg", wrap: true },
          { type: "text", text: content.summary, size: "sm", wrap: true, color: "#334155" },
          { type: "text", text: content.tip, size: "sm", wrap: true, color: "#0f766e" },
          { type: "text", text: `來源：${content.source}`, size: "xs", wrap: true, color: "#64748b" },
        ],
      },
    },
  };
}

function createHealthSvg(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="1040" viewBox="0 0 1040 1040">
  <rect width="1040" height="1040" fill="#f8fafc"/>
  <rect x="64" y="64" width="912" height="912" rx="42" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
  <circle cx="858" cy="176" r="78" fill="#d9f99d"/>
  <circle cx="776" cy="252" r="42" fill="#99f6e4"/>
  <text x="112" y="178" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#0f766e">每日健康資訊</text>
  <text x="112" y="282" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#0f172a">${escapeXml(content.title)}</text>
  ${wrapSvgText(content.summary, 112, 390, 42, 17, "#334155")}
  <rect x="112" y="710" width="816" height="154" rx="28" fill="#ecfdf5"/>
  <text x="152" y="778" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#047857">今天可以這樣做</text>
  ${wrapSvgText(content.tip, 152, 832, 30, 26, "#065f46")}
  <text x="112" y="926" font-family="Arial, sans-serif" font-size="24" fill="#64748b">來源：${escapeXml(content.source)}</text>
</svg>`;
}

function wrapSvgText(text, x, y, fontSize, maxChars, color) {
  const lines = [];
  let current = "";

  for (const char of text) {
    current += char;
    if (current.length >= maxChars || /[。！？；]/.test(char)) {
      lines.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) {
    lines.push(current.trim());
  }

  return lines.slice(0, 6).map((line, index) => (
    `<text x="${x}" y="${y + index * (fontSize + 18)}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="${color}">${escapeXml(line)}</text>`
  )).join("\n  ");
}

async function replyText(replyToken, text) {
  await lineRequest("/v2/bot/message/reply", {
    replyToken,
    messages: [{ type: "text", text: text.slice(0, 5000) }],
  });
}

async function pushMessages(to, messages) {
  await lineRequest("/v2/bot/message/push", {
    to,
    messages,
    notificationDisabled: false,
  });
}

async function lineRequest(pathname, payload) {
  if (config.mockMode || !config.lineChannelAccessToken) {
    console.log("[MOCK LINE]", pathname, JSON.stringify(payload));
    return { mocked: true };
  }

  const response = await fetch(`https://api.line.me${pathname}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.lineChannelAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE request failed ${response.status}: ${detail}`);
  }

  return response.status === 204 ? {} : await response.json();
}

function scheduleDailyPush() {
  setInterval(async () => {
    const now = new Date();
    const time = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei",
    }).format(now);
    const today = getLocalDateKey();
    const state = await readState();

    if (time === config.dailyPushTime && state.lastDailyPushDate !== today) {
      const result = await pushDailyHealthInfo();
      if (result.ok) {
        state.lastDailyPushDate = today;
        await writeState(state);
      }
      console.log("Daily health push result:", result);
    }
  }, 30_000);
}

async function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    return sendJson(res, { error: "Forbidden" }, 403);
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    sendJson(res, { error: "Not found" }, 404);
  }
}

async function readJsonBody(req) {
  const body = await readRequestBody(req);
  return body ? JSON.parse(body) : {};
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendSvg(res, payload) {
  res.writeHead(200, { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" });
  res.end(payload);
}

function verifyLineSignature(body, signature) {
  if (!config.lineChannelSecret || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", config.lineChannelSecret).update(body).digest("base64");
  const expected = Buffer.from(digest);
  const received = Buffer.from(signature);

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function containsUrl(text) {
  return /(https?:\/\/|www\.|line\.me\/R\/|bit\.ly\/|tinyurl\.com\/|reurl\.cc\/)\S+/i.test(text);
}

function getChatId(source = {}) {
  return source.groupId || source.roomId || source.userId || "";
}

async function ensureState() {
  await mkdir(dirname(statePath), { recursive: true });

  try {
    await readFile(statePath, "utf8");
  } catch {
    await writeState({ aiQuota: {}, blockedUsers: {}, violations: [], lastDailyPushDate: "" });
  }
}

async function readState() {
  return JSON.parse(await readFile(statePath, "utf8"));
}

async function writeState(state) {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

function getLocalDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(new Date());
}

function getPreferredPort(value, fallback) {
  const port = Number(value || fallback);

  if (Number.isInteger(port) && port > 0 && port < 65536) {
    return port;
  }

  console.warn(`Invalid PORT "${value}", falling back to ${fallback}.`);
  return fallback;
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function splitList(value = "") {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function listenOnAvailablePort(server, port) {
  const handleError = (error) => {
    server.off("listening", handleListening);

    if (!["EADDRINUSE", "EACCES"].includes(error.code)) {
      throw error;
    }

    const nextPort = port + 1;

    if (nextPort >= 65536) {
      throw new Error("No available ports found below 65536.");
    }

    console.warn(`Port ${port} is unavailable, trying ${nextPort}...`);
    listenOnAvailablePort(server, nextPort);
  };

  const handleListening = () => {
    server.off("error", handleError);

    const actualPort = server.address().port;
    console.log(`LINE health bot system running at http://localhost:${actualPort}`);
  };

  server.once("error", handleError);
  server.once("listening", handleListening);
  server.listen(port);
}

function loadDotEnv() {
  try {
    const envPath = fileURLToPath(new URL(".env", import.meta.url));
    const content = readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

      if (!match || line.trim().startsWith("#")) {
        continue;
      }

      const [, key, rawValue] = match;
      process.env[key] ??= rawValue.replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env is optional.
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
