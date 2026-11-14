import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { createInitialState, reduceEvent } from "./shared/engine.js";
import { trainingReply } from "./shared/training-assistant.js";
import { rephraseApproved } from "./shared/model-gateway.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;
const sessions = new Map();
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const assistantRequests = new Map();

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1024) throw new Error("Question is too long.");
  }
  return JSON.parse(body);
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
  if (url.pathname === "/api/assistant") {
    if (request.method !== "POST") return json(response, 405, { error: "POST required." });
    const origin = request.headers.origin;
    if (origin) {
      let originHost;
      try { originHost = new URL(origin).host; } catch { return json(response, 403, { error: "Origin not allowed." }); }
      if (originHost !== url.host) return json(response, 403, { error: "Origin not allowed." });
    }
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
    const generated = recent.length <= 8 ? await rephraseApproved(reply, language) : null;
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
