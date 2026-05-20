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

// PDF 저장 — 브라우저가 보낸 PDF를 make_book/pdf 폴더에 기록
function savePdf(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 80e6) req.destroy(); });
  req.on("end", () => {
    try {
      const j = JSON.parse(body);
      let name = String(j.filename || "artbook.pdf").replace(/[^\w.\-가-힣]+/g, "_");
      if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";
      const sub = j.sub ? String(j.sub).replace(/[^\w.\-가-힣]+/g, "_").slice(0, 32) : "";
      // pdf_4ea = 1권 최종 확정 산출물 → ROOT 직속 (make_book/pdf_4ea/)
      // printVol (1~600) = A4 인쇄용 임포지션 PDF → ROOT/pdf_인쇄용/{N}권/
      // 그 외는 pdf/{sub}
      let dir;
      if (sub === "pdf_4ea") {
        dir = path.join(ROOT, "pdf_4ea");
      } else if (j.printVol) {
        const vol = parseInt(j.printVol, 10);
        if (Number.isFinite(vol) && vol >= 1 && vol <= 600) {
          dir = path.join(ROOT, "pdf_인쇄용", vol + "권");
        } else {
          dir = path.join(ROOT, "pdf_인쇄용");
        }
      } else {
        dir = sub ? path.join(ROOT, "pdf", sub) : path.join(ROOT, "pdf");
      }
      fs.mkdirSync(dir, { recursive: true });
      const buf = Buffer.from(String(j.data || ""), "base64");
      const full = path.join(dir, name);
      fs.writeFileSync(full, buf);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, path: full, bytes: buf.length }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
}

// 페이지 파일 저장 — make_book/pages/<권>/NNN_a.jpg|.txt, NNN_b.jpg
function savePage(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 80e6) req.destroy(); });
  req.on("end", () => {
    try {
      const j = JSON.parse(body);
      const safe = s => String(s || "").replace(/[^\w.\-가-힣]+/g, "_");
      const book = safe(j.book || "기타").slice(0, 40);   // 예: 01권
      const written = [];
      // 페이지마다 독립 폴더: pages/<권>/<NNN_a>/...
      (j.pages || []).forEach(pg => {
        const id = safe(pg.id).slice(0, 40);              // 예: 009_a
        if (!id) return;
        const dir = path.join(ROOT, "pages", book, id);
        fs.mkdirSync(dir, { recursive: true });
        (pg.files || []).forEach(f => {
          const name = safe(f.name);
          if (!name) return;
          let tgtDir = dir;
          if (f.sub) {                                    // 예: versions (영구 스냅샷)
            tgtDir = path.join(dir, safe(f.sub).slice(0, 24));
            fs.mkdirSync(tgtDir, { recursive: true });
          }
          const full = path.join(tgtDir, name);
          if (typeof f.text === "string") fs.writeFileSync(full, f.text, "utf8");
          else if (f.b64) fs.writeFileSync(full, Buffer.from(f.b64, "base64"));
          else return;
          written.push(path.join("pages", book, id, name));
        });
      });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, root: path.join(ROOT, "pages", book), written }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
}

// 페이지(스프레드) 디스크 폴더 삭제 — pages/<권>/<NNN_a>, <NNN_b>
function deletePage(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => {
    try {
      const j = JSON.parse(body);
      const safe = s => String(s || "").replace(/[^\w.\-가-힣]+/g, "_");
      const book = safe(j.book || "").slice(0, 40);
      const removed = [];
      (j.ids || []).forEach(id => {
        const sid = safe(id).slice(0, 40);
        if (!sid || !book) return;
        const dir = path.join(ROOT, "pages", book, sid);
        if (dir.startsWith(path.join(ROOT, "pages")) && fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          removed.push(path.join("pages", book, sid));
        }
      });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, removed }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.url.split("?")[0] === "/ollama/chat" && req.method === "POST") {
    return proxyOllama(req, res);
  }
  if (req.url.split("?")[0] === "/delete-page" && req.method === "POST") {
    return deletePage(req, res);
  }
  if (req.url.split("?")[0] === "/save-pdf" && req.method === "POST") {
    return savePdf(req, res);
  }
  if (req.url.split("?")[0] === "/save-page" && req.method === "POST") {
    return savePage(req, res);
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
