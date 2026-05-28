/* server.js — 아트북 제작기 로컬 정적 서버 (외부망 미사용, localhost 전용)
   실행: node server.js  →  http://localhost:8787/
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8787;
const ROOT = __dirname;
const PAGES_DIR = "G:\\내 드라이브\\Claude_works\\make_book\\pages";
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

function safeName(s) {
  return String(s || "").replace(/[^\w.\-가-힣]+/g, "_").slice(0, 80);
}

function topicBookDir(j) {
  const topic = safeName(j.topicLabel || j.topicName || j.topic || "");
  const bookRaw = j.book || j.bookLabel || "";
  const book = safeName(bookRaw).slice(0, 40);
  if (!topic || !book) return null;
  const full = path.resolve(PAGES_DIR, topic, book);
  const base = path.resolve(PAGES_DIR);
  if (!full.startsWith(base)) return null;
  fs.mkdirSync(full, { recursive: true });
  return full;
}

// PDF 저장 — 새 구조는 make_book/pages/<주제>/<권>/pdf/, 구 구조는 make_book/pdf/
function savePdf(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 80e6) req.destroy(); });
  req.on("end", () => {
    try {
      const j = JSON.parse(body);
      let name = safeName(j.filename || "artbook.pdf");
      if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";
      const bookDir = topicBookDir(j);
      const dir = bookDir ? path.join(bookDir, "pdf") : path.join(PAGES_DIR, "pdf");
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

// 페이지 파일 저장
// 새 구조 기본: make_book/pages/<주제>/<권>/001_a.txt|001_a.png|002_b.png
// folderPerPage=true: make_book/pages/<주제>/<권>/001_a/001_a.txt|001_a.png
// 구 구조: make_book/pages/<권>/<NNN_a>/...
function savePage(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 80e6) req.destroy(); });
  req.on("end", () => {
    try {
      const j = JSON.parse(body);
      const book = safeName(j.book || "기타").slice(0, 40);   // 예: 001권
      const written = [];

      const bookDir = topicBookDir(j);
      if (bookDir) {
        (j.pages || []).forEach(pg => {
          const id = safeName(pg.id).slice(0, 40);
          const pageDir = j.folderPerPage && id ? path.join(bookDir, id) : bookDir;
          fs.mkdirSync(pageDir, { recursive: true });
          (pg.files || []).forEach(f => {
            const name = safeName(f.name);
            if (!name) return;
            const sub = f.sub ? safeName(f.sub).slice(0, 32) : "";
            const tgtDir = sub ? path.join(pageDir, sub) : pageDir;
            fs.mkdirSync(tgtDir, { recursive: true });
            const full = path.join(tgtDir, name);
            if (typeof f.text === "string") fs.writeFileSync(full, f.text, "utf8");
            else if (f.b64) fs.writeFileSync(full, Buffer.from(f.b64, "base64"));
            else if (f.copyFrom) {
              const srcPath = path.join(ROOT, path.normalize(decodeURIComponent(f.copyFrom.split("?")[0])));
              if (fs.existsSync(srcPath) && srcPath !== full) fs.copyFileSync(srcPath, full);
            }
            else return;
            written.push(path.relative(ROOT, full));
          });
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ ok: true, root: bookDir, written }));
      }

      // 하위호환: 페이지마다 독립 폴더: pages/<권>/<NNN_a>/...
      (j.pages || []).forEach(pg => {
        const id = safeName(pg.id).slice(0, 40);              // 예: 009_a
        if (!id) return;
        const dir = path.join(PAGES_DIR, book, id);
        fs.mkdirSync(dir, { recursive: true });
        (pg.files || []).forEach(f => {
          const name = safeName(f.name);
          if (!name) return;
          let tgtDir = dir;
          if (f.sub) {
            tgtDir = path.join(dir, safeName(f.sub).slice(0, 24));
            fs.mkdirSync(tgtDir, { recursive: true });
          }
          const full = path.join(tgtDir, name);
          if (typeof f.text === "string") fs.writeFileSync(full, f.text, "utf8");
          else if (f.b64) fs.writeFileSync(full, Buffer.from(f.b64, "base64"));
          else if (f.copyFrom) {
            const srcPath = path.join(ROOT, path.normalize(decodeURIComponent(f.copyFrom.split("?")[0])));
            if (fs.existsSync(srcPath) && srcPath !== full) fs.copyFileSync(srcPath, full);
          }
          else return;
          written.push(path.join("pages", book, id, name));
        });
      });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, root: path.join(PAGES_DIR, book), written }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
  });
}

// 페이지(스프레드) 디스크 삭제 — 새 구조는 파일 삭제, 구 구조는 페이지 폴더 삭제
function deletePage(req, res) {
  let body = "";
  req.on("data", c => { body += c; if (body.length > 1e6) req.destroy(); });
  req.on("end", () => {
    try {
      const j = JSON.parse(body);
      const book = safeName(j.book || "").slice(0, 40);
      const removed = [];
      const bookDir = topicBookDir(j);
      if (bookDir) {
        (j.ids || []).forEach(id => {
          const sid = safeName(id).slice(0, 40);
          if (!sid) return;
          [".txt", ".png", ".jpg", ".jpeg", ".webp"].forEach(ext => {
            const full = path.join(bookDir, sid + ext);
            if (full.startsWith(bookDir) && fs.existsSync(full)) {
              fs.rmSync(full, { force: true });
              removed.push(path.relative(PAGES_DIR, full));
            }
          });
        });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ ok: true, removed }));
      }
      (j.ids || []).forEach(id => {
        const sid = safeName(id).slice(0, 40);
        if (!sid || !book) return;
        const dir = path.join(PAGES_DIR, book, sid);
        if (dir.startsWith(PAGES_DIR) && fs.existsSync(dir)) {
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
  if (req.url.split("?")[0] === "/api/book-files" && req.method === "GET") {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const topic = urlObj.searchParams.get("topic");
      const book = urlObj.searchParams.get("book");
      if (!topic || !book) {
        res.writeHead(400); return res.end("Missing topic or book");
      }
      const bookDir = path.join(PAGES_DIR, safeName(topic), safeName(book).slice(0, 40));
      const pdfDir = path.join(bookDir, "pdf");
      let files = [];
      if (fs.existsSync(pdfDir)) {
        files = fs.readdirSync(pdfDir).filter(f => fs.statSync(path.join(pdfDir, f)).isFile());
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ files }));
    } catch(e) {
      res.writeHead(500); return res.end(e.message);
    }
  }

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  
  let filePath;
  if (urlPath.startsWith("/pages/")) {
    filePath = path.join(PAGES_DIR, urlPath.slice(7));
    if (!filePath.startsWith(PAGES_DIR)) { res.writeHead(403); return res.end("Forbidden"); }
  } else {
    filePath = path.join(ROOT, path.normalize(urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  }

  const serveFile = (p, res, reqExt) => {
    fs.readFile(p, (err, data) => {
      if (err) {
        const ext = path.extname(p).toLowerCase();
        if (reqExt !== "fallback") {
          if (ext === ".jpg" || ext === ".jpeg") {
            const altPath = p.replace(/\.jpe?g$/i, ".png");
            if (fs.existsSync(altPath)) return serveFile(altPath, res, "fallback");
          } else if (ext === ".png") {
            const altPath = p.replace(/\.png$/i, ".jpg");
            if (fs.existsSync(altPath)) return serveFile(altPath, res, "fallback");
          }
        }
        res.writeHead(404); return res.end("Not found: " + urlPath);
      }
      const actualExt = path.extname(p).toLowerCase();
      res.writeHead(200, {
        "Content-Type": TYPES[actualExt] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      });
      res.end(data);
    });
  };
  serveFile(filePath, res, "");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[artbook] http://localhost:${PORT}/아트북 제작.html`);
});
