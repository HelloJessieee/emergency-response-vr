import 'dotenv/config';
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { createInitialState, reduceEvent } from "./shared/engine.js";
import { trainingReply } from "./shared/training-assistant.js";
import { rephraseApproved } from "./shared/model-gateway.js";
import { inspectTrainingImage, transcribeTrainingAudio, speakApprovedAnswer } from "./shared/media-gateway.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;
const sessions = new Map();
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const assistantRequests = new Map();
const mediaRequests = new Map();

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readBytes(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('Request too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request, maxBytes = 1024) {
  return JSON.parse((await readBytes(request, maxBytes)).toString('utf8'));
}

function sameOrigin(request, url) {
  if (!request.headers.origin) return true;
  try { return new URL(request.headers.origin).host === url.host; }
  catch { return false; }
}

function aiAvailable(request) {
  const address = request.socket.remoteAddress || '';
  return Boolean(process.env.OPENAI_API_KEY) && (
    process.env.AI_ALLOW_LAN === '1' || ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
  );
}

function limited(request, route, max) {
  const key = `${route}:${request.socket.remoteAddress || 'local'}`;
  const now = Date.now();
  const recent = (mediaRequests.get(key) || []).filter(time => now - time < 60000);
  recent.push(now);
  mediaRequests.set(key, recent);
  return recent.length > max;
}

function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, { state: createInitialState(id), clients: new Set() });
  return sessions.get(id);
}

function publish(session) {
  const message = JSON.stringify({ type: "SNAPSHOT", state: session.state });
  for (const client of session.clients) if (client.readyState === WebSocket.OPEN) client.send(message);
}

function apply(session, event) {
  session.state = reduceEvent(session.state, event);
  publish(session);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith('/api/') && !sameOrigin(request, url)) return json(response, 403, { error: 'Origin not allowed.' });
  if (url.pathname === '/api/ai-status') return json(response, 200, { enabled: aiAvailable(request) });
  if (url.pathname === '/api/vision') {
    if (request.method !== 'POST') return json(response, 405, { error: 'POST required.' });
    if (!aiAvailable(request)) return json(response, 503, { error: 'AI is unavailable on this connection.' });
    if (limited(request, 'vision', 4)) return json(response, 429, { error: 'Try again in a minute.' });
    try {
      const payload = await readJson(request, 2_800_100);
      return json(response, 200, await inspectTrainingImage(payload?.image));
    } catch (error) {
      return json(response, error.message === 'INVALID_IMAGE' || error.message === 'Request too large.' ? 400 : 502, { error: error.message === 'INVALID_IMAGE' ? 'Use a PNG, JPEG, or WebP under 2 MB.' : 'Image analysis unavailable.' });
    }
  }
  if (url.pathname === '/api/transcribe') {
    if (request.method !== 'POST') return json(response, 405, { error: 'POST required.' });
    if (!aiAvailable(request)) return json(response, 503, { error: 'AI is unavailable on this connection.' });
    if (limited(request, 'transcribe', 6)) return json(response, 429, { error: 'Try again in a minute.' });
    try {
      const bytes = await readBytes(request, 2_000_000);
      return json(response, 200, { text: await transcribeTrainingAudio(bytes, request.headers['content-type']) });
    } catch (error) {
      return json(response, ['INVALID_AUDIO', 'Request too large.'].includes(error.message) ? 400 : 502, { error: 'Audio unavailable. Record a short clip under 2 MB.' });
    }
  }
  if (url.pathname === '/api/speech') {
    if (request.method !== 'POST') return json(response, 405, { error: 'POST required.' });
    if (!aiAvailable(request)) return json(response, 503, { error: 'AI is unavailable on this connection.' });
    if (limited(request, 'speech', 6)) return json(response, 429, { error: 'Try again in a minute.' });
    let payload;
    try { payload = await readJson(request); } catch { return json(response, 400, { error: 'Invalid question.' }); }
    const question = typeof payload?.question === 'string' ? payload.question.trim() : '';
    if (!question || question.length > 240) return json(response, 400, { error: 'Question must be 1–240 characters.' });
    const id = String(payload.sessionId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48) || 'demo';
    try {
      const bytes = await speakApprovedAnswer(trainingReply(getSession(id).state, question).answer);
      response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
      response.end(bytes);
    } catch { json(response, 502, { error: 'Speech unavailable.' }); }
    return;
  }
  if (url.pathname === "/api/assistant") {
    if (request.method !== "POST") return json(response, 405, { error: "POST required." });
    let payload;
    try { payload = await readJson(request); }
    catch { return json(response, 400, { error: "Invalid question." }); }
    const question = typeof payload?.question === "string" ? payload.question.trim() : "";
    if (!question || question.length > 240) return json(response, 400, { error: "Question must be 1–240 characters." });
    const id = String(payload.sessionId || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 48) || "demo";
    const reply = trainingReply(getSession(id).state, question);
    const requester = String(request.socket.remoteAddress || "local");
    const now = Date.now();
    const recent = (assistantRequests.get(requester) || []).filter(time => now - time < 60000);
    recent.push(now);
    assistantRequests.set(requester, recent);
    const language = /[\u3400-\u9fff]/.test(question) ? "Chinese" : "English";
    const generated = aiAvailable(request) && recent.length <= 8 ? await rephraseApproved(reply, language) : null;
    return json(response, 200, { answer: generated || reply.answer, mode: generated ? "model" : "scripted", topic: reply.topic });
  }
  if (url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, sessions: sessions.size }));
    return;
  }
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  if (!pathname.startsWith("/shared/") && !pathname.startsWith("/public/") && pathname !== "/index.html") {
    response.writeHead(404).end("Not found");
    return;
  }
  const target = pathname === "/index.html" ? path.join(root, "public/index.html") : path.join(root, pathname.slice(1));
  if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

const wss = new WebSocketServer({ server, path: "/session" });
wss.on("connection", (socket, request) => {
  const url = new URL(request.url, "http://localhost");
  const id = url.searchParams.get("id")?.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 48) || "demo";
  const session = getSession(id);
  session.clients.add(socket);
  socket.send(JSON.stringify({ type: "SNAPSHOT", state: session.state }));

  socket.on("message", raw => {
    try {
      const message = JSON.parse(String(raw));
      if (message.type === "HELLO") {
        const participantId = String(message.id || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 48);
        const name = String(message.name || "Rescuer").trim().slice(0, 30);
        if (!participantId) throw new Error("Participant ID required.");
        socket.participantId = participantId;
        socket.participantName = name;
        apply(session, { type: "PARTICIPANT_JOIN", payload: { id: participantId, name }, actor: name });
      } else if (message.type === "EVENT") {
        if (!socket.participantId) throw new Error("Join the session first.");
        if (message.event?.type === "PARTICIPANT_JOIN") throw new Error("Use HELLO to join.");
        if (message.event?.type === "RESET") {
          session.state = createInitialState(id);
          for (const client of session.clients) {
            if (client.participantId) session.state = reduceEvent(session.state, { type: "PARTICIPANT_JOIN", payload: { id: client.participantId, name: client.participantName }, actor: client.participantName });
          }
          publish(session);
        } else {
          apply(session, { type: message.event.type, payload: message.event.payload, actor: socket.participantName });
        }
      }
    } catch (error) {
      socket.send(JSON.stringify({ type: "ERROR", message: error.message }));
    }
  });

  socket.on("close", () => {
    session.clients.delete(socket);
    if (socket.participantId && ![...session.clients].some(client => client.participantId === socket.participantId)) {
      apply(session, { type: "PARTICIPANT_LEAVE", payload: { id: socket.participantId }, actor: "System" });
    }
  });
});

server.listen(port, () => console.log(`SECOND CHANCE demo: http://localhost:${port}`));
