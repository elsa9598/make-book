/* server.js — 아트북 제작기 로컬 정적 서버 (외부망 미사용, localhost 전용)
   실행: node server.js  →  http://localhost:8787/
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8787;
const ROOT = __dirname;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp"
};

// 로컬 Ollama 프록시 — 브라우저는 같은 출처(/ollama/chat)로만 호출 → CORS 소멸
function proxyOllama(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 2e6) req.destroy(); });
  req.on("end", () => {
    const opt = {
      host: "127.0.0.1", port: 11434, path: "/api/chat", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    };
    const fwd = http.request(opt, r => {
      res.writeHead(r.statusCode || 502, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      r.pipe(res);
    });
    fwd.on("error", e => {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "ollama_unreachable", detail: e.message }));
    });
    fwd.setTimeout(120000, () => fwd.destroy(new Error("ollama timeout")));
    fwd.end(body);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.split("?")[0] === "/ollama/chat" && req.method === "POST") {
    return proxyOllama(req, res);
  }
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found: " + urlPath); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[artbook] http://localhost:${PORT}/아트북 제작.html`);
});
