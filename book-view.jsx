/* book-view.jsx — 책 구조 탭 + 미리보기/PDF 출력 */

const { useState: useStateBV, useRef: useRefBV } = React;

/* ────────── 자동 폰트 축소 ────────── */
// 한 페이지에 맞도록 폰트 크기를 줄여서 fit
function AutoFitBody({ text, titleText, maxFontSize = 60, minFontSize = 22 }) {
  const wrapRef = useRefBV();
  const innerRef = useRefBV();
  const [fontSize, setFontSize] = useStateBV(maxFontSize);
  const lastFitRef = useRefBV(null);

  React.useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current;
      const inner = innerRef.current;
      if (!wrap || !inner || wrap.clientHeight < 8) return; // 숨김 상태(0높이) 측정 방지
      let fs = maxFontSize;
      inner.style.fontSize = fs + "px";
      let guard = 200; // maxFontSize(60)→minFontSize(12) 전 구간 커버
      while (inner.scrollHeight > wrap.clientHeight && fs > minFontSize && guard-- > 0) {
        fs -= 0.5;
        inner.style.fontSize = fs + "px";
      }
      if (lastFitRef.current !== fs) {
        lastFitRef.current = fs;
        setFontSize(fs);
      }
    };
    fit();
    const t1 = setTimeout(fit, 180);
    let ro;
    if (window.ResizeObserver && wrapRef.current) {
      ro = new ResizeObserver(() => fit());
      ro.observe(wrapRef.current);
    }
    return () => { clearTimeout(t1); ro && ro.disconnect(); };
  }, [text, titleText, maxFontSize, minFontSize]);

  return (
    <div ref={wrapRef} className="text-body-wrap">
      <div ref={innerRef} className="text-body" style={{fontSize}}>
        {titleText && (
          <div style={{
            fontWeight: 800,
            marginBottom: "0.5em",
            paddingBottom: "0.3em",
            borderBottom: "1px solid var(--rule)"
          }}>{titleText}</div>
        )}
        {text || "(이 페이지의 본문이 아직 작성되지 않았습니다.)"}
      </div>
    </div>
  );
}

function AutoFitTextarea({ value, onChange, onExpand, maxFontSize = 30, minFontSize = 16 }) {
  const wrapRef = useRefBV();
  const taRef = useRefBV();
  const [fontSize, setFontSize] = useStateBV(maxFontSize);
  const [fitWarn, setFitWarn] = useStateBV(false);
  const lastFitRef = useRefBV(null);

  React.useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current;
      const ta = taRef.current;
      if (!wrap || !ta || wrap.clientHeight < 8) return;
      let fs = maxFontSize;
      ta.style.fontSize = fs + "px";
      let guard = 90;
      while (ta.scrollHeight > wrap.clientHeight && fs > minFontSize && guard-- > 0) {
        fs -= 0.5;
        ta.style.fontSize = fs + "px";
      }
      if (lastFitRef.current !== fs) {
        lastFitRef.current = fs;
        setFontSize(fs);
      }
      setFitWarn(ta.scrollHeight > wrap.clientHeight);
    };
    fit();
    const t1 = setTimeout(fit, 180);
    let ro;
    if (window.ResizeObserver && wrapRef.current) {
      ro = new ResizeObserver(() => fit());
      ro.observe(wrapRef.current);
    }
    return () => { clearTimeout(t1); ro && ro.disconnect(); };
  }, [value, maxFontSize, minFontSize]);

  return (
    <div ref={wrapRef} className="text-body-wrap edit-wrap">
      <textarea
        ref={taRef}
        className="text-body-edit"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="이 페이지의 본문"
        spellCheck="false"
        style={{fontSize}}
      />
      <div className="edit-tools">
        <span className="fit-info">
          {fitWarn ? <span style={{color:"#a83232"}}>⚠ 잘림</span> : <span>✓ {fontSize.toFixed(1)}px</span>}
        </span>
        <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onExpand && onExpand(); }} title="확대 편집">
          ⛶
        </button>
      </div>
    </div>
  );
}

// 인쇄용 임포지션 — 본문 5장 양면(2026-05-23 재배치, 사장님 워크플로우)
// 사장님이 직접 5장 앞면 인쇄 → 뒤집어서 5장 뒷면 인쇄. 그래서 PDF 순서는
//   ①철학종 → ②~⑥본문 앞 5장(001_a/002_b ... 009_a/010_b)
//   → ⑦~⑪뒷면 5장(목차·줄·줄·줄·명언) → ⑫줄공책(별도) 순.
// (옛 2026-05-22 2up imposition 방식 폐기)
function labelOfSlot(slot) {
  if (slot === "lined-note") return "줄공책";
  if (slot === "contents") return "목차";
  if (slot === "back-inner") return "명언·구절";
  if (slot === "philosophy-mark") return "철학종";
  if (typeof slot === "number") return String(slot).padStart(3, "0") + (slot % 2 ? "_a" : "_b");
  return "";
}

const BOOKLET_IMPOSITION = [
  /* ① 철학종 — 커버(첫 시트, 앞면만) */
  { sheet: "철학종", face: "front",
    left:  { folio: null, label: "",      slot: null },
    right: { folio: null, label: "철학종", slot: "philosophy-mark" } },
  /* ②~⑥ 본문 5장 앞면 (001_a/002_b … 009_a/010_b 순서) */
  { sheet: "A1 앞", face: "front",
    left:  { folio: null, label: "001_a", slot: 1 },
    right: { folio: null, label: "002_b", slot: 2 } },
  { sheet: "A2 앞", face: "front",
    left:  { folio: null, label: "003_a", slot: 3 },
    right: { folio: null, label: "004_b", slot: 4 } },
  { sheet: "A3 앞", face: "front",
    left:  { folio: null, label: "005_a", slot: 5 },
    right: { folio: null, label: "006_b", slot: 6 } },
  { sheet: "A4 앞", face: "front",
    left:  { folio: null, label: "007_a", slot: 7 },
    right: { folio: null, label: "008_b", slot: 8 } },
  { sheet: "A5 앞", face: "front",
    left:  { folio: null, label: "009_a", slot: 9 },
    right: { folio: null, label: "010_b", slot: 10 } },
  /* ⑦~⑪ 본문 5장 뒷면 (목차 → 줄 → 줄 → 줄 → 명언) — 사장님이 5장 뒤집어 인쇄 */
  { sheet: "A1 뒤", face: "back",
    left:  { folio: null, label: "줄공책", slot: "lined-note" },
    right: { folio: null, label: "목차",   slot: "contents" } },
  { sheet: "A2 뒤", face: "back",
    left:  { folio: null, label: "줄공책", slot: "lined-note" },
    right: { folio: null, label: "줄공책", slot: "lined-note" } },
  { sheet: "A3 뒤", face: "back",
    left:  { folio: null, label: "줄공책", slot: "lined-note" },
    right: { folio: null, label: "줄공책", slot: "lined-note" } },
  { sheet: "A4 뒤", face: "back",
    left:  { folio: null, label: "줄공책", slot: "lined-note" },
    right: { folio: null, label: "줄공책", slot: "lined-note" } },
  { sheet: "A5 뒤", face: "back",
    left:  { folio: null, label: "명언",   slot: "back-inner" },
    right: { folio: null, label: "줄공책", slot: "lined-note" } },
  /* ⑫ 줄공책 (별도 시트 — 사장님이 여러 장 인쇄해 작품 사이 끼움) */
  { sheet: "줄공책", face: "front",
    left:  { folio: null, label: "줄공책", slot: "lined-note" },
    right: { folio: null, label: "줄공책", slot: "lined-note" } },
];

const BOOKLET_IMPOSITION_LABELS = BOOKLET_IMPOSITION
  .map(row => `${row.sheet}: ${row.left.label || "—"} | ${row.right.label || "—"}`);

const BOOKLET_READING_SPREADS = [
  /* 철학종 — 책 첫 펼침(2026-05-23 사장님 지정). 페이지번호 없음. */
  { left: { folio: null, slot: null }, right: { folio: null, slot: "philosophy-mark" } },
  { left: { folio: null, slot: null }, right: { folio: 1, slot: "front-inner" } },
  { left: { folio: 2, slot: null }, right: { folio: 3, slot: "contents" } },
  { left: { folio: 4, slot: 1 }, right: { folio: 5, slot: 2 } },
  { left: { folio: 6, slot: 3 }, right: { folio: 7, slot: 4 } },
  { left: { folio: 8, slot: 5 }, right: { folio: 9, slot: 6 } },
  { left: { folio: 10, slot: 7 }, right: { folio: 11, slot: 8 } },
  { left: { folio: 12, slot: 9 }, right: { folio: 13, slot: 10 } },
  { left: { folio: 14, slot: "back-inner" }, right: { folio: null, slot: null } },
];

const PDF_PAPER = "#f6ecd6";          // 화면 미리보기용 종이톤
const PRINT_PAPER = "#ffffff";        // 인쇄 산출물용 흰색 — 크래프트지에 잉크 안 나가게(낭비 방지)
const LINED_NOTE_COLOR = "rgba(124,94,60,0.80)"; // 줄공책·본문하단 줄 — 크래프트지에서도 보이게 2배 진하게(2026-05-23 사장님)

const HANGUL_RE = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
function hasHangul(text) {
  return HANGUL_RE.test(String(text || ""));
}
function findHangulInCompletedMap(completed) {
  const out = [];
  Object.keys(completed || {}).forEach(k => {
    const d = completed[k] || {};
    ["title", "body", "quote", "topicLabel", "catLabel"].forEach(field => {
      const v = d[field];
      if (typeof v === "string" && hasHangul(v)) out.push({ key: k, field, value: v });
    });
  });
  return out;
}
function describeHangulLeaks(leaks) {
  const fieldKo = { title: "제목(첫 줄)", body: "본문", quote: "명언", catLabel: "카테고리", topicLabel: "주제" };
  return leaks.map(lk => {
    const sample = String(lk.value || "").split("\n").find(l => l.trim()) || lk.value || "";
    return `· ${lk.key}번 본문 ${fieldKo[lk.field] || lk.field}: "${sample.slice(0, 40)}${sample.length > 40 ? "…" : ""}"`;
  }).join("\n");
}

function splitTitleBodyText(text) {
  const source = text || "";
  const lines = source.split("\n");
  const firstIdx = lines.findIndex(line => line.trim().length > 0);
  if (firstIdx < 0) return { title: "", body: source };
  
  let title = lines[firstIdx].trim();
  let body = lines.slice(firstIdx + 1).join("\n").replace(/\s+$/, "");

  // 본문과 명언이 엔터 없이 한 줄로 묶여서 너무 긴 경우, 첫 문장(명언)만 추출
  if (!body && title.length > 60) {
    const match = title.match(/^[^.!?]+[.!?]+["']?/);
    if (match) {
      title = match[0].trim();
      body = source.slice(title.length).trim();
    } else {
      body = source;
    }
  } else if (!body) {
    body = title;
  }
  
  return { title, body };
}

async function buildEnglishCompletedForPdf(src, T, onProg) {
  const OLLAMA_TR_URL = (location.protocol === "http:" || location.protocol === "https:")
    ? (location.origin + "/ollama/chat") : "http://localhost:11434/api/chat";
  const djb2 = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "tr_" + (h >>> 0);
  };
  const translateText = async (ko) => {
    if (!ko || !ko.trim()) return ko;
    const key = djb2(ko);
    if (window.ArtbookStore) {
      const cached = await window.ArtbookStore.get(key);
      if (cached && cached.en && !hasHangul(cached.en)) return cached.en;
    }
    const attempts = [
      { sys: "You are a professional literary translator. Translate the Korean text into natural, elegant English suitable for a philosophy art book. Preserve line breaks exactly. Output ONLY the English translation.",
        temperature: 0.3, top_p: 0.9 },
      { sys: "Translate the Korean text into clean, natural English only. Do not output any Korean, labels, notes, or quotation marks. Preserve line breaks exactly.",
        temperature: 0.1, top_p: 0.8 },
      { sys: "Translate every Korean character into English. The output MUST contain zero Korean characters. Keep each input line on its own English line. Output English only — no notes, no quotes, no Korean.",
        temperature: 0.0, top_p: 0.5 },
    ];
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      try {
        const res = await fetch(OLLAMA_TR_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "qwen2.5:14b",
            stream: false,
            keep_alive: "10m",
            messages: [{ role: "system", content: a.sys }, { role: "user", content: ko }],
            options: { temperature: a.temperature, top_p: a.top_p, num_predict: 1400 }
          })
        });
        const j = await res.json();
        const en = ((j && j.message && j.message.content) || "").trim();
        if (en && !hasHangul(en)) {
          if (window.ArtbookStore) window.ArtbookStore.set(key, { en });
          return en;
        }
      } catch (e) {
        console.warn("[print-en] 번역 시도 " + (i + 1) + " 실패:", e.message);
      }
    }
    console.warn("[print-en] 모든 시도에서 한글이 남음:", ko.slice(0, 60));
    return ko;
  };

  const out = {};
  const keys = Object.keys(src || {});
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const d = src[k] || {};
    const parts = splitTitleBodyText(d.body || "");
    const titleSrc = parts.title || d.quote || "";
    const bodySrc = parts.body || "";
    onProg && onProg(i + 1, keys.length);
    out[k] = {
      ...d,
      title: titleSrc ? await translateText(titleSrc) : "",
      body: bodySrc ? await translateText(bodySrc) : "",
      quote: d.quote ? await translateText(d.quote) : (d.quote || ""),
      topicLabel: T ? T.name : "",
      catLabel: (window.CATEGORY_EN && window.CATEGORY_EN[d.category]) || d.category
    };
  }
  return out;
}

/* ───────── 책 그리드 (구조 한눈에) ───────── */
function BookGrid({ spreads, completed, onPickSpread, onOpenPreview, topic, coverImg, backImg, onCoverUpload, onBackUpload, bookNo, oduniImg }) {
  const bookTopic = React.useMemo(() => {
    const found = [1, 2, 3, 4, 5]
      .map(i => completed[i])
      .find(d => d && d.topic && window.TOPICS[d.topic]);
    return found ? found.topic : topic;
  }, [completed, topic]);
  const T = window.TOPICS[bookTopic] || window.TOPICS[topic];
  const [printBusy, setPrintBusy] = useStateBV("");
  const [printExportData, setPrintExportData] = useStateBV(null);
  const [printLang, setPrintLang] = useStateBV("ko");
  const [workImageBusy, setWorkImageBusy] = useStateBV(false);
  const printPoRef = useRefBV(null);
  const workImagePoRef = useRefBV(null);

  const waitForRender = async () => {
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => requestAnimationFrame(() => r()));
  };

  const exportStructurePrintPDF = async (lang = "ko", opts = {}) => {
    if (printBusy) return;
    const jspdfNS = window.jspdf || window.jsPDF;
    const JsPDF = jspdfNS && (jspdfNS.jsPDF || jspdfNS);
    if (!window.html2canvas || !JsPDF) {
      alert("PDF 라이브러리를 불러오지 못했습니다.");
      return;
    }

    const EN = lang === "en";
    setPrintBusy(EN ? "en" : "ko");
    let usedEn = false;
    try {
      if (EN) {
        const en = await buildEnglishCompletedForPdf(completed, T, (n, total) => setPrintBusy(`번역 ${n}/${total}`));
        const leaks = findHangulInCompletedMap(en);
        if (leaks.length) throw new Error(`영문 번역이 일부 실패해 한글이 남았습니다 (Ollama 재시도해도 안 됨):\n\n${describeHangulLeaks(leaks)}\n\n해당 본문 줄을 더 일반적인 문장으로 바꾸거나 잠시 후 다시 시도해주세요.`);
        setPrintExportData(en);
        setPrintLang("en");
        usedEn = true;
        await new Promise(r => requestAnimationFrame(() => r()));
        await waitForRender();
        await new Promise(r => setTimeout(r, 300));
      } else {
        setPrintLang("ko");
        await waitForRender();
      }

      const po = printPoRef.current || document.querySelector(".book-structure-print-only");
      if (!po) {
        alert("책 구조 출력 DOM을 찾지 못했습니다. React 렌더링 지연 문제일 수 있습니다.");
        return;
      }

      const prevStyle = po.getAttribute("style") || "";
      const W = 1980, H = 1400;
      po.setAttribute("style", "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:" + PRINT_PAPER + ";z-index:-1;");
      const pages = Array.from(po.querySelectorAll(".a4-page"));
      if (pages.length !== BOOKLET_IMPOSITION.length) {
        po.setAttribute("style", prevStyle);
        alert("출력용 PDF 인쇄면 수가 맞지 않습니다.\n\n필수 배치:\n" + BOOKLET_IMPOSITION_LABELS.join("\n"));
        return;
      }

      const prevPageStyles = pages.map(el => el.getAttribute("style") || "");
      pages.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;"));

      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }
      await new Promise(r => setTimeout(r, 200));

      const doc = new JsPDF({ orientation: "landscape", unit: "px", format: [W, H] });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await window.html2canvas(pages[i], {
          scale: 2, useCORS: true, backgroundColor: PRINT_PAPER,
          width: W, height: H, windowWidth: W, windowHeight: H
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) doc.addPage([W, H], "landscape");
        doc.addImage(img, "JPEG", 0, 0, W, H);
      }

      pages.forEach((el, i) => el.setAttribute("style", prevPageStyles[i]));
      po.setAttribute("style", prevStyle);

      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0")
        + "_" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
      const volPad = String(bookNo || 1).padStart(3, "0");
      const fname = EN
        ? `${volPad}권_출력용_${T ? T.name : "book"}_EN_${stamp}.pdf`
        : `${volPad}권_출력용_${T ? T.nameKo : "book"}_한글_${stamp}.pdf`;

      let saved = false;
      if (location.protocol === "http:" || location.protocol === "https:") {
        try {
          const b64 = doc.output("datauristring").split(",")[1];
          const r = await fetch(location.origin + "/save-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: T ? T.nameKo : topic,
              book: String(bookNo || 1).padStart(3, "0") + "권",
              filename: fname,
              data: b64,
              printVol: bookNo || 1
            })
          });
          const j = await r.json();
          if (j && j.ok) {
            saved = true;
            if (!opts.silent) alert(`${EN ? "영문" : "한글"} 출력용 PDF 저장 완료\n${j.path}`);
          }
        } catch (e) {
          console.warn("[book-structure-print] 폴더 저장 실패:", e.message);
        }
      }
      if (!saved) doc.save(fname);
    } catch (e) {
      console.error("[book-structure-print] 생성 실패:", e);
      alert("출력용 PDF 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      if (usedEn) setPrintExportData(null);
      setPrintLang("ko");
      setPrintBusy("");
    }
  };

  const exportStructureWorkImage = async (lang = "ko", opts = {}) => {
    if (workImageBusy) return;
    if (!window.html2canvas) {
      alert("이미지 캡처 라이브러리를 불러오지 못했습니다.");
      return;
    }
    const EN = lang === "en";
    setWorkImageBusy(EN ? "en" : "ko");
    let usedEn = false;
    try {
      if (EN) {
        const en = await buildEnglishCompletedForPdf(completed, T, (n, total) => setPrintBusy(`작업본문 EN 번역 ${n}/${total}`));
        const leaks = findHangulInCompletedMap(en);
        if (leaks.length) throw new Error(`영문 작업본문 번역이 일부 실패해 한글이 남았습니다:\n\n${describeHangulLeaks(leaks)}\n\n해당 본문 줄을 더 일반적인 문장으로 바꾸거나 잠시 후 다시 시도해주세요.`);
        setPrintExportData(en);
        setPrintLang("en");
        setPrintBusy("");
        usedEn = true;
        await new Promise(r => requestAnimationFrame(() => r()));
      } else {
        setPrintExportData(null);
        setPrintLang("ko");
      }
      await waitForRender();
      await new Promise(r => setTimeout(r, EN ? 300 : 150));
      const po = workImagePoRef.current || document.querySelector(".book-structure-work-image-only");
      if (!po) return;
      const prevStyle = po.getAttribute("style") || "";
      const W = 1980, H = 1400;
      po.setAttribute("style", "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:" + PRINT_PAPER + ";z-index:-1;");
      const pages = Array.from(po.querySelectorAll(".a4-page"));
      const prevPageStyles = pages.map(el => el.getAttribute("style") || "");
      pages.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;display:flex;flex-direction:row;background:" + PRINT_PAPER + ";"));
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }
      await new Promise(r => setTimeout(r, 150));
      const canvases = [];
      for (let i = 0; i < pages.length; i++) {
        canvases.push(await window.html2canvas(pages[i], {
          scale: 1, useCORS: true, backgroundColor: PRINT_PAPER,
          width: W, height: H, windowWidth: W, windowHeight: H
        }));
      }
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H * canvases.length;
      const ctx2d = out.getContext("2d");
      ctx2d.fillStyle = PRINT_PAPER;
      ctx2d.fillRect(0, 0, out.width, out.height);
      canvases.forEach((c, i) => ctx2d.drawImage(c, 0, H * i, W, H));

      const volPad = String(bookNo || 1).padStart(3, "0");
      const fname = EN
        ? `${volPad}권_${T ? T.name : "book"}_work5spreads_EN.png`
        : `${volPad}권_${T ? T.nameKo : "book"}_작업본문5스프레드.png`;
      const b64 = out.toDataURL("image/png").split(",")[1];
      let saved = false;
      if (location.protocol === "http:" || location.protocol === "https:") {
        const r = await fetch(location.origin + "/save-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: T ? T.nameKo : topic,
            book: volPad + "권",
            pages: [{ id: "pdf", files: [{ sub: "pdf", name: fname, b64 }] }]
          })
        });
        const j = await r.json();
        if (j && j.ok) {
          saved = true;
          if (!opts.silent) alert((EN ? "영문 작업본문" : "작업본문") + " 5스프레드 이미지 저장 완료\n" + j.root + "\\pdf\\" + fname);
        }
      }
      if (!saved) {
        const a = document.createElement("a");
        a.href = out.toDataURL("image/png");
        a.download = fname;
        a.click();
      }
      pages.forEach((el, i) => el.setAttribute("style", prevPageStyles[i]));
      po.setAttribute("style", prevStyle);
    } catch (e) {
      console.error("[book-structure-work-image] 생성 실패:", e);
      alert("작업본문 이미지 생성 중 오류가 발생했습니다: " + e.message);
    } finally {
      if (usedEn) setPrintExportData(null);
      setPrintLang("ko");
      setPrintBusy("");
      setWorkImageBusy(false);
    }
  };
  const exportAllStructure = async () => {
    if (printBusy || workImageBusy) return;
    if (!confirm(`한/영 인쇄용 PDF와 한/영 5스프레드 이미지 총 4개를 일괄 생성하시겠습니까?\n(시간이 다소 걸립니다)`)) return;
    try {
      await window._exportStructure4();
      alert("✅ 책구조의 모든 PDF 및 이미지가 성공적으로 생성되었습니다.");
    } catch (e) {
      alert("일괄 생성 중 오류 발생: " + e.message);
    }
  };

  {(() => {
    window._exportStructure4 = async () => {
      await exportStructurePrintPDF("ko", { silent: true });
      await exportStructurePrintPDF("en", { silent: true });
      await exportStructureWorkImage("ko", { silent: true });
      await exportStructureWorkImage("en", { silent: true });
    };
    return null;
  })()}

  return (
    <div className="book-grid">
      {/* 표지 행 */}
      <SectionHeader title="표지" subtitle="cover · left back / right front" />
      <CoverAttach
        side="back"
        img={backImg}
        onUpload={onBackUpload}
        topicName=""
        topicSub="❦"
      />
      <CoverAttach
        side="front"
        img={coverImg}
        onUpload={onCoverUpload}
        topicName={T?.nameKo}
        topicSub={T?.sub}
      />
      <div style={{gridColumn: "span 2", display: "flex", alignItems: "center", padding: "12px 16px"}}>
        <div className="hint">
          표지는 스케치처럼 펼침 기준 좌측이 뒷표지, 우측이 앞표지입니다.
          본문 10장 양면(앞=본문 / 뒤=목차·줄·명언) + 줄공책 1장. 표지(철학종)는 250g 별도.
        </div>
      </div>

      {/* 철학종 데코 섹션 제거(2026-05-23) — BookletMap 첫 시트가 이미 철학종이라 중복.
         철학종은 인쇄구조(BookletMap)와 PDF 첫 페이지로만 1회 노출. */}

      <SectionHeader title="인쇄 구조" subtitle="본문 10장 양면 + 줄공책 1장" />
      <BookletMap
        completed={completed}
        T={T}
        topic={bookTopic}
        oduniImg={oduniImg}
        onOpenPreview={onOpenPreview}
      />
      <div style={{
        gridColumn: "1 / -1",
        display: "flex",
        justifyContent: "center",
        gap: 10,
        padding: "0 0 16px"
      }}>
        <button
          className="btn pdf-btn"
          style={{ background: "#4f4536" }}
          onClick={exportAllStructure}
          disabled={!!printBusy || !!workImageBusy}
          title={`${bookNo || 1}권 4개 파일 일괄 생성 (한/영 PDF + 한/영 이미지) → pages/${T ? T.nameKo : topic}/${String(bookNo || 1).padStart(3, "0")}권/pdf/`}
        >
          {printBusy ? `${printBusy.startsWith("번역") ? printBusy : (printBusy==="ko" ? "한글 인쇄용" : "영문 인쇄용")} PDF 생성 중...` 
            : (workImageBusy ? `${workImageBusy==="ko" ? "한글" : "영문"} 5스프레드 이미지 생성 중...` 
            : "인쇄용 PDF / 작업본문 이미지 (4개 파일 일괄 생성)")}
        </button>
      </div>
      <div ref={printPoRef} className="print-impose-only book-structure-print-only">
        {BOOKLET_IMPOSITION.map((layout, i) => (
          <div key={"book-structure-a4-" + i} className="a4-page" style={{
            display: "flex", flexDirection: "row", background: PRINT_PAPER,
            position: "relative", overflow: "hidden"
          }}>
            <A4Side slot={layout.left.slot} folio={layout.left.folio} side="left" T={T} topic={topic}
                    completed={printExportData || completed} oduniImg={oduniImg}
                    lang={printLang} paper={PRINT_PAPER} />
            <div className="a4-punch"></div>
            <A4Side slot={layout.right.slot} folio={layout.right.folio} side="right" T={T} topic={topic}
                    completed={printExportData || completed} oduniImg={oduniImg}
                    lang={printLang} paper={PRINT_PAPER} />
          </div>
        ))}
      </div>

      {workImageBusy && (
        <div ref={workImagePoRef} className="book-structure-work-image-only" style={{ display: "none" }}>
          {BOOKLET_READING_SPREADS.slice(3, 8).map((layout, i) => (
            <div key={"work-img-" + i} className="a4-page">
              <A4Side slot={layout.left.slot} folio={layout.left.folio} side="left" T={T} topic={bookTopic}
                      completed={printExportData || completed} oduniImg={oduniImg} lang={printLang} paper={PRINT_PAPER} />
              <div className="a4-punch" style={{
                width: 100, height: "100%", flexShrink: 0, position: "relative",
                background: "linear-gradient(to right, " + PRINT_PAPER + " calc(50% - 0.5px), rgba(0,0,0,0.22) 50%, " + PRINT_PAPER + " calc(50% + 0.5px))"
              }}></div>
              <A4Side slot={layout.right.slot} folio={layout.right.folio} side="right" T={T} topic={bookTopic}
                      completed={printExportData || completed} oduniImg={oduniImg} lang={printLang} paper={PRINT_PAPER} />
            </div>
          ))}
        </div>
      )}

      {/* 본문 — 5편 (001_a ~ 010_b) */}
      <SectionHeader title="작업 본문" subtitle="5 works · 10 cards · physical pp.4–13" />
      {spreads.slice(1).map(sp => (
        <SpreadCell
          key={sp.index}
          sp={sp}
          done={completed[sp.index]}
          completed={completed}
          T={T}
          topic={bookTopic}
          onPick={() => onPickSpread(sp.index)}
          onOpenPreview={onOpenPreview}
        />
      ))}
    </div>
  );
}

function previewIndexForFolio(folio) {
  return BOOKLET_READING_SPREADS.findIndex(layout =>
    (layout.left && layout.left.folio === folio) ||
    (layout.right && layout.right.folio === folio)
  );
}

function BookletMap({ completed, T, topic, oduniImg, onOpenPreview }) {
  const openFolio = (folio) => {
    if (!folio || !onOpenPreview) return;
    const idx = previewIndexForFolio(folio);
    if (idx >= 0) onOpenPreview(idx);
  };
  return (
    <div className="booklet-map">
      {BOOKLET_IMPOSITION.map(row => (
        <div key={row.sheet} className="booklet-sheet">
          {[row.left, row.right].map((side, idx) => (
            <div
              key={idx}
              className={"booklet-page-cell" + (side.slot == null ? " is-blank" : "")}
              role="button"
              tabIndex={side.folio ? 0 : -1}
              onClick={() => openFolio(side.folio)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openFolio(side.folio);
                }
              }}
              title={side.folio ? `미리보기 p.${side.folio}로 이동` : "공백 페이지"}
            >
              <div className="booklet-page-head">
                <strong>{side.label}</strong>
                <span>p.{side.folio}</span>
              </div>
              <div className="booklet-page-preview" aria-hidden="true">
                <div className="booklet-page-preview-inner">
                  <A4Side
                    slot={side.slot}
                    folio={side.folio}
                    side={idx === 0 ? "left" : "right"}
                    T={T}
                    topic={topic}
                    completed={completed}
                    oduniImg={oduniImg}
                    lang="ko"
                    noAutoFit={true}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="booklet-sheet-label">
            인쇄면 {row.sheet}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <i>{title}</i>
      <span>{subtitle}</span>
    </div>
  );
}

function SpreadCell({ sp, done, completed, T, topic, onPick, onOpenPreview }) {
  const leftLabel = `${String(sp.leftPage).padStart(3, "0")}_a`;
  const rightLabel = `${String(sp.rightPage).padStart(3, "0")}_b`;
  const leftSlot = (sp.index - 1) * 2 + 1;
  const rightSlot = leftSlot + 1;
  const leftFolio = leftSlot + 3;
  const rightFolio = rightSlot + 3;
  const openPreview = () => {
    const idx = previewIndexForFolio(leftFolio);
    if (idx >= 0 && onOpenPreview) onOpenPreview(idx);
  };
  return (
    <div
      className={"spread-cell body-linked" + (done ? "" : " empty")}
      onClick={openPreview}
      title={`미리보기 p.${leftFolio}–p.${rightFolio}로 이동`}
    >
      <div className="cell-thumb body-preview-thumb">
        <div className="body-page-preview">
          <div className="body-page-preview-inner">
            <A4Side
              slot={leftSlot}
              folio={leftFolio}
              side="left"
              T={T}
              topic={topic}
              completed={completed}
              oduniImg={null}
              lang="ko"
              noAutoFit={true}
            />
          </div>
        </div>
        <div className="body-page-preview">
          <div className="body-page-preview-inner">
            <A4Side
              slot={rightSlot}
              folio={rightFolio}
              side="right"
              T={T}
              topic={topic}
              completed={completed}
              oduniImg={null}
              lang="ko"
              noAutoFit={true}
            />
          </div>
        </div>
        {!done && <div className="body-empty-label">{sp.leftMeta.label}</div>}
      </div>
      <div className="cell-label">
        <span>{leftLabel} · p.{leftFolio}</span>
        <span>{rightLabel} · p.{rightFolio}</span>
      </div>
      <button
        type="button"
        className="cell-edit-btn"
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        title="작업실에서 이 본문 편집"
      >
        작업실
      </button>
    </div>
  );
}

function MiniSpread({ sp }) {
  // 작은 썸네일
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      width: "100%", height: "100%",
      borderRight: 0
    }}>
      <div style={{
        background: "linear-gradient(135deg, var(--paper-warm), var(--paper-page-edge))",
        borderRight: "1px solid rgba(74,48,20,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <svg viewBox="0 0 20 30" width="40%">
          <rect x="3" y="2" width="14" height="6" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
          <rect x="3" y="9" width="14" height="6" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
          <rect x="3" y="16" width="14" height="6" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
          <rect x="3" y="23" width="14" height="5" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
        </svg>
      </div>
      <div style={{
        background: "radial-gradient(circle, var(--topic-tint), var(--paper-warm))",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <svg viewBox="0 0 20 20" width="40%">
          <circle cx="10" cy="10" r="6" stroke="#4a2415" strokeWidth="0.6" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

function CoverAttach({ side, img, onUpload, topicName, topicSub }) {
  const ref = useRefBV();
  return (
    <div
      className={"cover-attach spread-cell section-cover " + (img ? "has-image" : "")}
      onClick={() => ref.current?.click()}
      style={{ gridColumn: "span 2", aspectRatio: "1 / 1" }}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          onUpload(url);
        }}
      />
      {img ? (
        <img src={img} alt="" />
      ) : (
        <div className="cover-empty">
          {topicName ? <div style={{fontSize: 22}}>{topicName}</div> : <div style={{fontSize: 22}}>{topicSub}</div>}
          <span className="small">{side === "front" ? "표지 이미지 첨부" : "뒷표지 이미지 첨부"}</span>
        </div>
      )}
    </div>
  );
}

/* ───────── 미리보기 — 펼침면 넘기기 ───────── */
function BookPreview({ spreads, completed, setCompleted, onPreviewBodyChange, topic, coverImg, backImg, comicSide, currentIdx, setCurrentIdx, bookNo, oduniImg, setOduniImg, onBookFinalized }) {
  // ⚠ 인쇄 사고 방지 — 워크스페이스 본문의 실제 topic을 우선 사용 (현재 topic state X)
  // 본문 내용은 니체인데 헤더가 탈무드로 잘못 표시되는 케이스 방지
  const bookTopic = React.useMemo(() => {
    const found = [1, 2, 3, 4, 5]
      .map(i => completed[i])
      .find(d => d && d.topic && window.TOPICS[d.topic]);
    return found ? found.topic : topic;
  }, [completed, topic]);
  const T = window.TOPICS[bookTopic] || window.TOPICS[topic];
  const previewSpreads = BOOKLET_READING_SPREADS;
  const total = previewSpreads.length;
  const previewIdx = Math.min(Math.max(currentIdx, 0), total - 1);
  const previewLayout = previewSpreads[previewIdx];
  const bodySlot = [previewLayout.left && previewLayout.left.slot, previewLayout.right && previewLayout.right.slot]
    .find(slot => typeof slot === "number");
  const bodyWorkIdx = typeof bodySlot === "number" ? Math.floor((bodySlot - 1) / 2) + 1 : null;
  const bodySpread = bodyWorkIdx ? spreads[bodyWorkIdx] : null;
  const saved = bodyWorkIdx ? completed[bodyWorkIdx] : null;

  // 미리보기에서 본문 텍스트 인라인 편집
  const [editBuf, setEditBuf] = useStateBV(saved?.body || "");
  const [dirty, setDirty] = useStateBV(false);
  const [lastSaved, setLastSaved] = useStateBV(null);
  const [expandOpen, setExpandOpen] = useStateBV(false);
  const [busyKind, setBusyKind] = useStateBV(""); // "" | "pdf" | "card" | "..번역.."
  const [exportData, setExportData] = useStateBV(null); // 영문판 캡처용 임시 데이터
  const [exportDom, setExportDom] = useStateBV(null); // null | "book" | "cards" | "impose"
  const topicLabel = (T && T.nameKo) || topic;
  const bookLabel = String(bookNo || 1).padStart(3, "0") + "권";
  const saveMeta = { topic: topicLabel, book: bookLabel };
  const mountExportDom = async (kind) => {
    setExportDom(kind);
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => requestAnimationFrame(() => r()));
  };
  const unmountExportDom = () => setExportDom(null);

  // 로컬 Ollama 번역 (한국어→영어, 클라우드 미사용) + IndexedDB 캐시
  const OLLAMA_TR_URL = (location.protocol === "http:" || location.protocol === "https:")
    ? (location.origin + "/ollama/chat") : "http://localhost:11434/api/chat";
  const djb2 = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "tr_" + (h >>> 0); };
  const translateText = async (ko) => {
    if (!ko || !ko.trim()) return ko;
    const key = djb2(ko);
    if (window.ArtbookStore) { const c = await window.ArtbookStore.get(key); if (c && c.en && !hasHangul(c.en)) return c.en; }
    const attempts = [
      { sys: "You are a professional literary translator. Translate the Korean text into natural, elegant English suitable for a philosophy art book. Preserve line breaks exactly (one source line = one English line). Output ONLY the English translation — no notes, no quotation marks.",
        temperature: 0.3, top_p: 0.9 },
      { sys: "Translate the Korean text into clean natural English only. Do not include any Korean. Preserve line breaks exactly.",
        temperature: 0.1, top_p: 0.8 },
      { sys: "Translate every Korean character into English. The output MUST contain zero Korean characters. Keep each input line on its own English line. Output English only — no notes, no quotes, no Korean.",
        temperature: 0.0, top_p: 0.5 },
    ];
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      try {
        const res = await fetch(OLLAMA_TR_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "qwen2.5:14b", stream: false, keep_alive: "10m",
            messages: [{ role: "system", content: a.sys }, { role: "user", content: ko }],
            options: { temperature: a.temperature, top_p: a.top_p, num_predict: 1400 } })
        });
        const j = await res.json();
        const en = ((j && j.message && j.message.content) || "").trim();
        if (en && !hasHangul(en)) {
          if (window.ArtbookStore) window.ArtbookStore.set(key, { en });
          return en;
        }
      } catch (e) { console.warn("[translate] 시도 " + (i + 1) + " 실패:", e.message); }
    }
    console.warn("[translate] 모든 시도에서 한글이 남음:", ko.slice(0, 60));
    return ko;
  };
  const buildEnCompleted = async (src, onProg) => {
    const out = {}; const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]; const d = src[k] || {};
      const parts = splitTitleBodyText(d.body || "");
      const titleSrc = parts.title || d.quote || "";
      const bodySrc = parts.body || "";
      onProg && onProg(i + 1, keys.length);
      out[k] = {
        ...d,
        title: titleSrc ? await translateText(titleSrc) : "",
        body: bodySrc ? await translateText(bodySrc) : "",
        /* 좌측 본문카드 제목은 001_a.txt 첫 줄(title)을 별도 번역하고,
           뒷내지(back-inner)의 명언 목록용 quote도 같이 번역한다. */
        quote: d.quote ? await translateText(d.quote) : (d.quote || ""),
        topicLabel: (T ? T.name : ""),
        catLabel: (window.CATEGORY_EN && window.CATEGORY_EN[d.category]) || d.category
      };
    }
    return out;
  };

  // 미리보기 → 로컬 PDF 파일로 저장. 기본값은 스케치 기준 p.1~p.16 자연 순서 PDF.
  const exportPDF = async (lang = "ko", opts = {}) => {
    const jspdfNS = window.jspdf || window.jsPDF;
    const JsPDF = jspdfNS && (jspdfNS.jsPDF || jspdfNS);
    if (!window.html2canvas || !JsPDF) {
      alert("PDF 라이브러리를 불러오지 못해 인쇄 대화상자로 전환합니다. ‘PDF로 저장’을 선택하세요.");
      window.print();
      return;
    }
    if (busyKind) return;
    const EN = lang === "en";
    setBusyKind(EN ? "pdf-en" : "pdf");
    let usedEn = false;
    let enBuildErr = null;
    if (EN) {
      try {
        const en = await buildEnCompleted(printCompleted, (n, t) => setBusyKind("번역 " + n + "/" + t));
        const leaks = findHangulInCompletedMap(en);
        if (leaks.length) throw new Error(`영문 번역이 일부 실패해 한글이 남았습니다 (Ollama 재시도해도 안 됨):\n\n${describeHangulLeaks(leaks)}\n\n해당 본문 줄을 더 일반적인 문장으로 바꾸거나 잠시 후 다시 시도해주세요.`);
        setExportData(en); usedEn = true;
        await new Promise(r => setTimeout(r, 200)); // EN 재렌더 대기
      } catch (e) { enBuildErr = e; console.warn("[pdf-en] 번역 실패:", e.message); }
      if (enBuildErr) {
        alert("영문 PDF 생성이 중단되었습니다.\n" + enBuildErr.message);
        setExportData(null);
        setBusyKind("");
        return;
      }
      setBusyKind("pdf-en");
    }
    // opts.selector로 다른 hidden DOM 선택 가능. 기본은 16p 본문 구조.
    const selector = opts.selector || ".print-book-only";
    const childSelector = opts.childSelector || ".a4-page";
    await mountExportDom(selector.indexOf("print-impose") >= 0 ? "impose" : "book");
    const po = document.querySelector(selector);
    if (!po) { if (usedEn) setExportData(null); unmountExportDom(); setBusyKind(""); return; }

    const prevStyle = po.getAttribute("style") || "";
    const W = 1980, H = 1400; // 스프레드 29.7:21 (1980/1400 ≈ 1.4143)
    po.setAttribute("style",
      "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:" + PRINT_PAPER + ";z-index:-1;");
    const spreadsEls = Array.from(po.querySelectorAll(childSelector));
    const prevSpreadStyles = spreadsEls.map(el => el.getAttribute("style") || "");
    spreadsEls.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;"));

    try {
      // 폰트/이미지 렌더 안정화
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      await new Promise(r => setTimeout(r, 120));

      const doc = new JsPDF({ orientation: "landscape", unit: "px", format: [W, H] });
      for (let i = 0; i < spreadsEls.length; i++) {
        const canvas = await window.html2canvas(spreadsEls[i], {
          scale: 2, useCORS: true, backgroundColor: PRINT_PAPER,
          width: W, height: H, windowWidth: W, windowHeight: H
        });
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) doc.addPage([W, H], "landscape");
        doc.addImage(img, "JPEG", 0, 0, W, H);
      }
      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0")
        + "_" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
      const fname = opts.filename || (EN
        ? ("artbook_" + (T ? T.name : "book") + "_16p_" + stamp + "_EN.pdf")
        : ("아트북_" + (T ? T.nameKo : "book") + "_16p_" + stamp + ".pdf"));

      // 서버로 열렸으면 pages/<주제>/<권>/pdf 폴더에 저장, 아니면 브라우저 다운로드 폴백
      let savedToFolder = false;
      if (location.protocol === "http:" || location.protocol === "https:") {
        try {
          const b64 = doc.output("datauristring").split(",")[1];
          const r = await fetch(location.origin + "/save-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...saveMeta, filename: fname, data: b64, sub: opts.sub != null ? opts.sub : (EN ? "en" : "") })
          });
          const j = await r.json();
          if (j && j.ok) {
            savedToFolder = true;
            if (!opts.silent) alert("PDF 저장 완료\n" + j.path + "\n(" + Math.round(j.bytes / 1024) + " KB)");
          }
        } catch (e) {
          console.warn("[pdf] 폴더 저장 실패 → 다운로드로 전환:", e.message);
        }
      }
      if (!savedToFolder && !opts.silent) doc.save(fname);
      if (opts.returnPath) return savedToFolder ? fname : null;
    } catch (e) {
      console.error("[pdf] 생성 실패:", e);
      alert("PDF 생성 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      po.setAttribute("style", prevStyle);
      spreadsEls.forEach((el, i) => el.setAttribute("style", prevSpreadStyles[i]));
      if (usedEn) setExportData(null);
      unmountExportDom();
      setBusyKind("");
    }
  };

  // 인쇄소용 — 페이지마다 10cm 정사각 카드 1장 (001_a~010_b, 10장)
  // 좌→우→좌→우 인터리브 순서 (자연스러운 책 페이지 순서). 서버 실행 시 pages/<주제>/<권>/pdf/에 저장.
  const exportCardPDF = async (lang = "ko", opts = {}) => {
    const jspdfNS = window.jspdf || window.jsPDF;
    const JsPDF = jspdfNS && (jspdfNS.jsPDF || jspdfNS);
    if (!window.html2canvas || !JsPDF) { alert("PDF 라이브러리를 불러오지 못했습니다."); return; }
    if (busyKind) return;
    const EN = lang === "en";
    setBusyKind(EN ? "card-en" : "card");
    let usedEn = false;
    let enBuildErr = null;
    if (EN) {
      try {
        const en = await buildEnCompleted(printCompleted, (n, t) => setBusyKind("번역 " + n + "/" + t));
        const leaks = findHangulInCompletedMap(en);
        if (leaks.length) throw new Error(`영문 카드 PDF 번역이 일부 실패해 한글이 남았습니다:\n\n${describeHangulLeaks(leaks)}\n\n해당 본문 줄을 더 일반적인 문장으로 바꾸거나 잠시 후 다시 시도해주세요.`);
        setExportData(en); usedEn = true;
        await new Promise(r => requestAnimationFrame(() => r()));
        await new Promise(r => setTimeout(r, 200));
      } catch (e) { enBuildErr = e; console.warn("[card-en] 번역 실패:", e.message); }
      if (enBuildErr) {
        alert("영문 카드 PDF 생성이 중단되었습니다.\n" + enBuildErr.message);
        setExportData(null);
        setBusyKind("");
        return;
      }
      setBusyKind("card-en");
    }
    await mountExportDom("cards");
    const po = document.querySelector(".print-only");
    if (!po) { if (usedEn) setExportData(null); unmountExportDom(); setBusyKind(""); return; }

    const prevStyle = po.getAttribute("style") || "";
    const W = 1980, H = 1400;
    po.setAttribute("style",
      "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:" + PRINT_PAPER + ";z-index:-1;");
    const spreadsEls = Array.from(po.querySelectorAll(".print-spread"));
    const prevSpreadStyles = spreadsEls.map(el => el.getAttribute("style") || "");
    spreadsEls.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;"));

    try {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      await new Promise(r => setTimeout(r, 120));

      // 본문 스프레드(표지 제외)의 카드를 좌→우→좌→우 인터리브 순서로 (책 페이지 자연 순서)
      // 001_a, 002_b, 003_a, 004_b, … 010_b
      const bodySpreadEls = spreadsEls.filter((_, idx) => idx >= 1);
      const cards = [];
      bodySpreadEls.forEach(spEl => {
        const leftPage = spEl.querySelector(".spread-page.left");
        const rightPage = spEl.querySelector(".spread-page.right");
        const leftCard = leftPage ? leftPage.querySelector(".card-slot") : null;
        const rightCard = rightPage ? rightPage.querySelector(".card-slot") : null;
        if (leftCard) cards.push(leftCard);
        if (rightCard) cards.push(rightCard);
      });
      console.log("[card-pdf] 좌·우 인터리브 — 총 " + cards.length + "장");
      if (cards.length === 0) { alert("카드가 없습니다. 본문을 먼저 만들어 주세요."); return; }

      const S = 1000; // 10cm @ 100dpi 상당 (정사각)
      const doc = new JsPDF({ orientation: "portrait", unit: "px", format: [S, S] });
      for (let i = 0; i < cards.length; i++) {
        const canvas = await window.html2canvas(cards[i], {
          scale: 2, useCORS: true, backgroundColor: PRINT_PAPER
        });
        const img = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) doc.addPage([S, S], "portrait");
        doc.addImage(img, "JPEG", 0, 0, S, S);
      }
      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0")
        + "_" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
      const fname = opts.filename || (EN
        ? ("artbook_" + (T ? T.name : "book") + "_cards10_" + stamp + "_EN.pdf")
        : ("아트북_" + (T ? T.nameKo : "book") + "_카드10_" + stamp + ".pdf"));

      let saved2 = false;
      if (location.protocol === "http:" || location.protocol === "https:") {
        try {
          const b64 = doc.output("datauristring").split(",")[1];
          const r = await fetch(location.origin + "/save-pdf", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...saveMeta, filename: fname, data: b64, sub: opts.sub != null ? opts.sub : (EN ? "card_pdf_en" : "card_pdf") })
          });
          const j = await r.json();
          if (j && j.ok) { saved2 = true; if (!opts.silent) alert("카드 PDF 저장 완료 (" + cards.length + "장)\n" + j.path); }
        } catch (e) { console.warn("[card-pdf] 폴더 저장 실패 → 다운로드:", e.message); }
      }
      if (!saved2 && !opts.silent) doc.save(fname);
      if (opts.returnPath) return saved2 ? fname : null;
    } catch (e) {
      console.error("[card-pdf] 생성 실패:", e);
      alert("카드 PDF 생성 중 오류가 발생했습니다. 콘솔을 확인하세요.");
    } finally {
      po.setAttribute("style", prevStyle);
      spreadsEls.forEach((el, i) => el.setAttribute("style", prevSpreadStyles[i]));
      if (usedEn) setExportData(null);
      unmountExportDom();
      setBusyKind("");
    }
  };

  const exportWorkSpreadsImage = async (opts = {}) => {
    if (!window.html2canvas) { alert("이미지 캡처 라이브러리를 불러오지 못했습니다."); return; }
    if (busyKind) return;
    setBusyKind("spread-image");
    await mountExportDom("cards");
    const po = document.querySelector(".print-only");
    if (!po) { unmountExportDom(); setBusyKind(""); return; }
    const prevStyle = po.getAttribute("style") || "";
    const W = 1980, H = 1400;
    po.setAttribute("style", "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:" + PRINT_PAPER + ";z-index:-1;");
    const spreadsEls = Array.from(po.querySelectorAll(".print-spread")).filter((_, idx) => idx >= 1);
    const prevSpreadStyles = spreadsEls.map(el => el.getAttribute("style") || "");
    spreadsEls.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;"));
    try {
      if (spreadsEls.length === 0) { alert("작업본문 스프레드가 없습니다."); return; }
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      await new Promise(r => setTimeout(r, 120));
      const canvases = [];
      for (let i = 0; i < spreadsEls.length; i++) {
        canvases.push(await window.html2canvas(spreadsEls[i], {
          scale: 1, useCORS: true, backgroundColor: PRINT_PAPER,
          width: W, height: H, windowWidth: W, windowHeight: H
        }));
      }
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H * canvases.length;
      const ctx = out.getContext("2d");
      ctx.fillStyle = PRINT_PAPER;
      ctx.fillRect(0, 0, out.width, out.height);
      canvases.forEach((c, i) => ctx.drawImage(c, 0, H * i, W, H));
      const b64 = out.toDataURL("image/png").split(",")[1];
      const bk = String(bookNo || 1).padStart(3, "0");
      const fname = opts.filename || `v${bk}_${topicLabel}_작업본문5스프레드.png`;
      const r = await fetch(location.origin + "/save-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...saveMeta,
          pages: [{ id: "pdf", files: [{ sub: "pdf", name: fname, b64 }] }]
        })
      });
      const j = await r.json();
      if (j && j.ok && !opts.silent) alert("작업본문 5스프레드 이미지 저장 완료\n" + j.root + "\\pdf\\" + fname);
      if (opts.returnPath) return fname;
    } catch (e) {
      console.error("[spread-image] 생성 실패:", e);
      alert("작업본문 이미지 생성 중 오류 발생: " + e.message);
    } finally {
      po.setAttribute("style", prevStyle);
      spreadsEls.forEach((el, i) => el.setAttribute("style", prevSpreadStyles[i]));
      unmountExportDom();
      setBusyKind("");
    }
  };

  // 1권 최종 확정 — 본문 5스프레드 확정 후 16p 본문 PDF + 10장 카드 PDF를 한/영 4종으로 저장
  const finalizeBook = async () => {
    if (busyKind) return;
    // 본문 스프레드 1~5가 모두 confirmed 인지 검사
    const missing = [];
    for (let i = 1; i <= 5; i++) {
      const d = completed[i];
      if (!d || !d.confirmed) missing.push(i);
    }
    if (missing.length > 0) {
      alert("아직 확정되지 않은 본문 스프레드가 있습니다: " + missing.map(n => "#" + String(n).padStart(2, "0")).join(", ") + "\n각 스프레드를 확정한 뒤 다시 시도해주세요.");
      return;
    }
    // ⚠ 인쇄 사고 방지 — 워크스페이스 본문의 topic과 현재 topic state 일치 검사
    const bodyTopics = new Set([1, 2, 3, 4, 5].map(i => completed[i] && completed[i].topic).filter(Boolean));
    if (bodyTopics.size > 1) {
      alert("⚠ 본문 5개 스프레드의 주제가 서로 다릅니다.\n같은 권에는 동일 주제만 들어가야 합니다.\n복구 탭에서 정리 후 다시 시도해주세요.\n\n발견된 주제: " + Array.from(bodyTopics).join(", "));
      return;
    }
    const bodyTopic = Array.from(bodyTopics)[0];
    if (bodyTopic && bodyTopic !== topic) {
      const bodyT = window.TOPICS[bodyTopic];
      if (!confirm(`⚠ 주제 불일치 경고\n\n· 본문 데이터의 주제: ${bodyT ? bodyT.nameKo : bodyTopic}\n· 작업실 현재 주제: ${T ? T.nameKo : topic}\n\n본문 데이터의 주제(${bodyT ? bodyT.nameKo : bodyTopic})로 PDF를 만듭니다. 계속하시겠습니까?`)) return;
    }
    const bk = String(bookNo || 1).padStart(3, "0");
    const tname = T ? T.name : "book";
    const tnameKo = T ? T.nameKo : "book";
    if (!confirm(`📘 ${bookNo}권 (${tnameKo}) 최종 확정\n\n산출물 5개를 pages/${topicLabel}/${bookLabel}/pdf/ 폴더에 저장합니다.\n  · 한글 16p 본문 PDF\n  · 영문 16p 본문 PDF\n  · 인쇄용 한글 PDF\n  · 인쇄용 영문 PDF\n  · 작업본문 5스프레드 이미지\n\n계속하시겠습니까?`)) return;

    try {
      setBusyKind("finalize");
      // 1) KR 16p 본문 PDF — 앞내지/목차/본문/오둥이/명언을 자연 책 순서로 저장
      await exportPDF("ko", {
        sub: "pdf_4ea",
        filename: `v${bk}_${tnameKo}_한글본문.pdf`,
        selector: ".print-book-only",
        childSelector: ".a4-page",
        silent: true
      });
      // 2) EN 16p 본문 PDF — 동일 디자인, 영어
      await exportPDF("en", {
        sub: "pdf_4ea",
        filename: `v${bk}_${tname}_EN_body.pdf`,
        selector: ".print-book-only",
        childSelector: ".a4-page",
        silent: true
      });
      // 3~4) 인쇄용 임포지션 PDF 한글/영문
      await exportPrintPDF({
        silent: true,
        koFilename: `v${bk}_${tnameKo}_인쇄용_한글.pdf`,
        enFilename: `v${bk}_${tname}_print_EN.pdf`
      });
      // 5) 책 구조 확인용 작업본문 5스프레드 이미지
      await exportWorkSpreadsImage({
        filename: `v${bk}_${tnameKo}_작업본문5스프레드.png`,
        silent: true
      });
      alert(`✅ ${bookNo}권 최종 확정 완료\n\n산출물 5개가 pages/${topicLabel}/${bookLabel}/pdf/ 폴더에 저장되었습니다.\n  · v${bk}_${tnameKo}_한글본문.pdf\n  · v${bk}_${tname}_EN_body.pdf\n  · v${bk}_${tnameKo}_인쇄용_한글.pdf\n  · v${bk}_${tname}_print_EN.pdf\n  · v${bk}_${tnameKo}_작업본문5스프레드.png`);
      if (onBookFinalized) await onBookFinalized();
    } catch (e) {
      console.error("[finalize] 실패:", e);
      alert("최종 확정 중 오류 발생: " + e.message);
    } finally {
      setBusyKind("");
    }
  };

  // A4 인쇄용 임포지션 매핑 — 본문 10장 양면(앞 본문/뒤 목차·줄·명언) + 줄공책 1장 (2026-05-22).
  // 뒷면(data-face=back)은 캡처 시 180° 회전으로 상하 반전 보정. 줄공책 맨끝 1장은 사장님이 여러 장 인쇄.
  const A4_LAYOUT = BOOKLET_IMPOSITION;

  // 자연 책 넘김 순서 — 미리보기/PDF용. p.1 단독 → p.2|3 → ... → p.16 단독.
  const A4_LAYOUT_BOOK = BOOKLET_READING_SPREADS;

  // A4 인쇄용 PDF — 서버 실행 시 pages/<주제>/<권>/pdf/ 폴더에 저장
  // 본문 페이지: A4 가로 297×210, 중앙 1.5cm 펀칭 여백, 좌·우 141mm 영역에 1:1 정사각 이미지 (141×141mm) 상단 고정
  const exportPrintPDF = async (opts = {}) => {
    if (busyKind) return;
    // 본문 5스프레드 모두 confirmed 인지 검사
    const missing = [];
    for (let i = 1; i <= 5; i++) {
      const d = completed[i];
      if (!d || !d.confirmed) missing.push(i);
    }
    if (missing.length > 0) {
      alert("아직 확정되지 않은 본문 스프레드가 있습니다: " + missing.map(n => "#" + String(n).padStart(2, "0")).join(", ") + "\n각 스프레드를 확정한 뒤 다시 시도해주세요.");
      return;
    }
    // ⚠ 인쇄 사고 방지 — 본문 데이터의 topic 통일성 + 현재 topic state 일치 검증
    const bodyTopicsSet = new Set([1, 2, 3, 4, 5].map(i => completed[i] && completed[i].topic).filter(Boolean));
    if (bodyTopicsSet.size > 1) {
      alert("⚠ 본문 5개 스프레드의 주제가 서로 다릅니다.\n같은 권에는 동일 주제만 들어가야 합니다.\n복구 탭에서 정리 후 다시 시도해주세요.\n\n발견된 주제: " + Array.from(bodyTopicsSet).join(", "));
      return;
    }
    const bodyTopicStrict = Array.from(bodyTopicsSet)[0];
    if (bodyTopicStrict && bodyTopicStrict !== topic) {
      const bodyT = window.TOPICS[bodyTopicStrict];
      if (!confirm(`⚠ 주제 불일치 경고\n\n· 본문 데이터의 주제: ${bodyT ? bodyT.nameKo : bodyTopicStrict}\n· 작업실 현재 주제: ${T ? T.nameKo : topic}\n\n본문 데이터의 주제(${bodyT ? bodyT.nameKo : bodyTopicStrict})로 PDF를 만듭니다.\n인쇄 의뢰 전 PDF 내용 반드시 재확인하세요. 계속하시겠습니까?`)) return;
    }

    const jspdfNS = window.jspdf || window.jsPDF;
    const JsPDF = jspdfNS && (jspdfNS.jsPDF || jspdfNS);
    if (!window.html2canvas || !JsPDF) { alert("PDF 라이브러리를 불러오지 못했습니다."); return; }
    const printTname = T ? T.nameKo : "book";
    if (!opts.silent && !confirm(`🖨 ${bookNo}권 (${printTname}) A4 양면 인쇄용 PDF\n\n본문 10장 양면 임포지션 PDF 2개(한글본·영문본)를\npages/${topicLabel}/${bookLabel}/pdf/ 폴더에 저장합니다.\n\n  · 앞면 = 본문 카드 / 뒷면 = 목차·줄공책·명언\n  · A4 가로 양면 → 가운데 재단 → 낱장 스프링\n  · 뒷면(목차·명언)은 상하 반전 보정으로 180° 회전돼 있음\n\n⚠ A4 1장만 먼저 테스트 인쇄해 앞뒤가 맞는지 꼭 확인하세요.\n표지(철학종)·줄공책은 별도로 인쇄합니다.\n\n계속하시겠습니까?`)) return;

    setBusyKind("print");
    await mountExportDom("impose");
    const po = document.querySelector(".print-impose-only");
    if (!po) { alert("임포지션 레이아웃 DOM이 없습니다."); unmountExportDom(); setBusyKind(""); return; }
    const prevStyle = po.getAttribute("style") || "";
    // A4 가로 297×210mm → 1980×1400 픽셀 (비율 동일, 1mm ≈ 6.66px)
    const W = 1980, H = 1400;
    po.setAttribute("style", "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:" + PRINT_PAPER + ";z-index:-1;");
    const pages = Array.from(po.querySelectorAll(".a4-page"));
    if (pages.length !== A4_LAYOUT.length) {
      alert(
        "출력용 PDF 인쇄면 수가 맞지 않습니다.\n\n" +
        `필요: ${A4_LAYOUT.length}면\n` +
        `현재: ${pages.length}면\n\n` +
        "필수 배치:\n" + BOOKLET_IMPOSITION_LABELS.join("\n")
      );
      po.setAttribute("style", prevStyle);
      setBusyKind("");
      return;
    }
    const prevPageStyles = pages.map(el => el.getAttribute("style") || "");
    pages.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;"));

    // 임포지션 전 면(본문 앞면/뒷면)을 캡처해서 한 PDF로 만드는 헬퍼
    // 뒷면(data-face="back")은 상하 뒤집기 보정으로 캡처 캔버스를 180° 회전한다.
    const rotate180 = (canvas) => {
      const rc = document.createElement("canvas");
      rc.width = canvas.width; rc.height = canvas.height;
      const c = rc.getContext("2d");
      c.translate(rc.width, rc.height);
      c.rotate(Math.PI);
      c.drawImage(canvas, 0, 0);
      return rc;
    };
    const capturePagesToPdf = async () => {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      await new Promise(r => setTimeout(r, 250));
      const doc = new JsPDF({ orientation: "landscape", unit: "px", format: [W, H] });
      for (let i = 0; i < pages.length; i++) {
        let canvas = await window.html2canvas(pages[i], {
          scale: 2, useCORS: true, backgroundColor: PRINT_PAPER,
          width: W, height: H, windowWidth: W, windowHeight: H
        });
        if (pages[i].getAttribute("data-face") === "back") canvas = rotate180(canvas);
        const img = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) doc.addPage([W, H], "landscape");
        doc.addImage(img, "JPEG", 0, 0, W, H);
      }
      return doc;
    };

    // 서버 또는 다운로드로 저장
    const savePdf = async (doc, fname) => {
      let saved = false;
      if (location.protocol === "http:" || location.protocol === "https:") {
        try {
          const b64 = doc.output("datauristring").split(",")[1];
          const r = await fetch(location.origin + "/save-pdf", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...saveMeta, filename: fname, data: b64, printVol: bookNo })
          });
          const j = await r.json();
          if (j && j.ok) { saved = true; return { ok: true, path: j.path, bytes: j.bytes }; }
        } catch (e) { console.warn("[print-pdf] 폴더 저장 실패 → 다운로드:", e.message); }
      }
      if (!saved) doc.save(fname);
      return { ok: false };
    };

    try {
      const d = new Date();
      const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0")
        + "_" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
      const tnameKo = T ? T.nameKo : "book";
      const tname = T ? T.name : "book";
      const volPad = String(bookNo).padStart(3, "0");

      // 1) 한글본 캡처·저장
      setBusyKind("print-kr");
      const docKo = await capturePagesToPdf();
      const fnameKo = opts.koFilename || `${volPad}권_인쇄용_${tnameKo}_한글_${stamp}.pdf`;
      const resKo = await savePdf(docKo, fnameKo);

      // 2) 영문본 — 본문 텍스트·카테고리를 로컬 Ollama로 번역 후 캡처
      setBusyKind("print-en-번역");
      const enCompleted = await buildEnCompleted(completed, (n, t) => setBusyKind("print-en-번역 " + n + "/" + t));
      const enLeaks = findHangulInCompletedMap(enCompleted);
      if (enLeaks.length) throw new Error(`영문 인쇄용 PDF 번역이 일부 실패해 한글이 남았습니다 (Ollama 재시도해도 안 됨):\n\n${describeHangulLeaks(enLeaks)}\n\n해당 본문 줄을 더 일반적인 문장으로 바꾸거나 잠시 후 다시 시도해주세요.\n(한글 인쇄용 PDF는 이미 저장되었습니다.)`);
      setExportData(enCompleted); // A4Side 호출부에서 lang="en"으로 전환
      setBusyKind("print-en");
      await new Promise(r => requestAnimationFrame(() => r()));
      await new Promise(r => setTimeout(r, 300)); // 영문 데이터로 재렌더 대기
      const docEn = await capturePagesToPdf();
      const fnameEn = opts.enFilename || `${volPad}권_인쇄용_${tname}_EN_${stamp}.pdf`;
      const resEn = await savePdf(docEn, fnameEn);

      if (!opts.silent) alert(`✅ ${bookNo}권 A4 인쇄용 PDF 2개 저장 완료\n\n` +
        `· 한글본: ${resKo.ok ? resKo.path : fnameKo + " (다운로드)"}\n` +
        `· 영문본: ${resEn.ok ? resEn.path : fnameEn + " (다운로드)"}\n` +
        `\n폴더: pages/${topicLabel}/${bookLabel}/pdf/`);
    } catch (e) {
      console.error("[print-pdf] 생성 실패:", e);
      alert("인쇄용 PDF 생성 중 오류 발생: " + e.message);
    } finally {
      setExportData(null);
      po.setAttribute("style", prevStyle);
      pages.forEach((el, i) => el.setAttribute("style", prevPageStyles[i]));
      unmountExportDom();
      setBusyKind("");
    }
  };

  // 오둥이 사진 첨부 — file input → data URL
  const onOduniUpload = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setOduniImg(r.result);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  // (이미지 자동 선택 로직은 A4Side 본문 분기에서 직접 처리: _a=4컷+본문카드, _b=일러스트)

  // 스프레드 변경 또는 저장 데이터 변경 시 버퍼 동기화
  React.useEffect(() => {
    setEditBuf(saved?.body || "");
    setDirty(false);
  }, [bodyWorkIdx]);

  React.useEffect(() => {
    if (!dirty) setEditBuf(saved?.body || "");
  }, [saved?.body, dirty]);

  const pushBodyEdit = (text) => {
    setEditBuf(text);
    setDirty(true);
    if (!bodyWorkIdx) return;
    const next = {
      ...(saved || {}),
      body: text,
      topic: (saved && saved.topic) || bookTopic,
      book: (saved && saved.book) || bookNo
    };
    if (onPreviewBodyChange) {
      onPreviewBodyChange(bodyWorkIdx, next);
    } else {
      setCompleted(prev => ({ ...prev, [bodyWorkIdx]: { ...(prev[bodyWorkIdx] || {}), ...next } }));
    }
  };

  const onSaveEdit = () => {
    if (!bodyWorkIdx) return;
    const next = {
      ...(saved || {}),
      body: editBuf,
      topic: (saved && saved.topic) || bookTopic,
      book: (saved && saved.book) || bookNo
    };
    if (onPreviewBodyChange) {
      onPreviewBodyChange(bodyWorkIdx, next);
    } else {
      setCompleted(prev => ({ ...prev, [bodyWorkIdx]: { ...(prev[bodyWorkIdx] || {}), ...next } }));
    }
    const now = new Date();
    setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setDirty(false);

    // 디스크 페이지 파일(.txt)도 갱신 — 서버로 열렸고 권 정보가 있을 때
    if ((location.protocol === "http:" || location.protocol === "https:") && next.book && bodySpread) {
      const aId = String(bodySpread.leftPage).padStart(3, "0") + "_a";
      fetch(location.origin + "/save-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...saveMeta,
          pages: [{
            id: aId,
            files: [{ name: aId + ".txt", text: editBuf }]
          }]
        })
      }).then(r => r.json()).then(j => {
        if (j && j.ok) setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " · 폴더 반영");
      }).catch(e => console.warn("[preview save] 디스크 반영 실패:", e.message));
    }
  };

  // 미리보기에서 시각 확인 후 — 이 스프레드 1개만 '확정' (본문+이미지 묶음 디스크 확정 + 잠금 표시)
  const onConfirmSpread = () => {
    if (!bodyWorkIdx || !bodySpread) return;
    const body = dirty ? editBuf : ((saved && saved.body) || "");
    const now = new Date();
    const stamp = now.toLocaleString("ko-KR");
    const wasConfirmed = !!(saved && saved.confirmed);
    const next = { ...(saved || {}), body, confirmed: true, confirmedAt: stamp, topic: (saved && saved.topic) || bookTopic, book: (saved && saved.book) || bookNo };
    const confirmedCompleted = { ...completed, [bodyWorkIdx]: next };
    if (onPreviewBodyChange) {
      onPreviewBodyChange(bodyWorkIdx, next);
    } else {
      setCompleted(prev => ({ ...prev, [bodyWorkIdx]: { ...(prev[bodyWorkIdx] || {}), ...next } }));
    }
    setDirty(false);
    setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + (wasConfirmed ? " · 재확정 처리 중" : " · 확정 처리 중"));

    // 확정 직후 — 이미지/4컷 프롬프트 페이지 자동저장 키 비우기
    // (다음 스프레드 작업 시 직전 텍스트·선택 옵션이 남아있지 않도록 빈 상태로 리셋)
    if (window.ArtbookStore) {
      window.ArtbookStore.set("prompt_draft_image", {});
      window.ArtbookStore.set("prompt_draft_comic", {});
    }

    if ((location.protocol === "http:" || location.protocol === "https:") && bodySpread.leftMeta.section === "body") {
      const pad = n => String(n).padStart(3, "0");
      const splitDU = (u) => {
        if (!u || u.indexOf(",") < 0) return null;
        const m = /data:image\/(\w+)/.exec(u);
        return { ext: m ? m[1].replace("jpeg", "jpg") : "png", b64: u.split(",")[1] };
      };
      const pagesPayload = [];
      for (let i = 1; i <= 5; i++) {
        const spr = window.BOOK_SPREADS[i];
        if (!spr) continue;
        const d = confirmedCompleted[i] || {};
        const aId = pad(spr.leftPage) + "_a";
        const bId = pad(spr.rightPage) + "_b";
        const aImg = splitDU(d.comicImg);
        const bImg = splitDU(d.illustImg);
        const leftFiles = [];
        const rightFiles = [];
        if (d.body) {
          leftFiles.push({ name: aId + ".txt", text: d.body });
        }
        if (aImg) {
          leftFiles.push({ name: aId + "." + aImg.ext, b64: aImg.b64 });
        }
        if (bImg) {
          rightFiles.push({ name: bId + "." + bImg.ext, b64: bImg.b64 });
        }
        pagesPayload.push({ id: aId, files: leftFiles });
        pagesPayload.push({ id: bId, files: rightFiles });
      }
      fetch(location.origin + "/save-page", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...saveMeta,
          folderPerPage: true,
          pages: pagesPayload
        })
      }).then(r => r.json()).then(j => {
        if (j && j.ok) setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + (wasConfirmed ? " · 재확정·덮어쓰기 저장" : " · 확정·덮어쓰기 저장"));
      }).catch(e => console.warn("[confirm] 디스크 확정 실패:", e.message));
    }
  };

  const isBodySpread = !!bodyWorkIdx;

  // 미리보기를 PDF와 동일한 1980×1400으로 렌더 → 화면 폭에 맞춰 축소(픽셀 단위 동일)
  const stageRef = useRefBV();
  const [pvFitScale, setPvFitScale] = useStateBV(0.4);
  const [pvZoom, setPvZoom] = useStateBV(1);
  const pvScale = Math.min(1, Math.max(0.12, pvFitScale * pvZoom));
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth - 24;
      setPvFitScale(Math.min(1, Math.max(0.18, w / 1980)));
    };
    calc();
    let ro;
    if (window.ResizeObserver) { ro = new ResizeObserver(calc); ro.observe(el); }
    window.addEventListener("resize", calc);
    return () => { ro && ro.disconnect(); window.removeEventListener("resize", calc); };
  }, []);

  // 인쇄(PDF)는 completed 기반 → 저장 안 한 현재 편집(editBuf)도 즉시 반영
  const printCompleted = (dirty && bodyWorkIdx)
    ? { ...completed, [bodyWorkIdx]: { ...(saved || {}), body: editBuf, topic: (saved && saved.topic) || bookTopic, book: (saved && saved.book) || bookNo } }
    : completed;

  return (
    <div className="preview-stage" ref={stageRef} style={{ position: "relative" }}>
      <button
        className="nav-arrow"
        style={{ position: "absolute", left: "30px", top: "45%", transform: "translateY(-50%)", zIndex: 10, width: "64px", height: "64px", fontSize: "32px", background: "rgba(255, 248, 230, 0.9)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        disabled={currentIdx === 0}
        onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
        title="이전 페이지"
      >‹</button>

      <button
        className="nav-arrow"
        style={{ position: "absolute", right: "30px", top: "45%", transform: "translateY(-50%)", zIndex: 10, width: "64px", height: "64px", fontSize: "32px", background: "rgba(255, 248, 230, 0.9)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        disabled={currentIdx === total - 1}
        onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
        title="다음 페이지"
      >›</button>

      <div className="pv-scaler" style={{ height: (1400 * pvScale) + "px" }}>
      <div className="book-spread pv-fixed a4-page" style={{
        width: 1980, height: 1400,
        display: "flex", flexDirection: "row", background: PDF_PAPER,
        transform: "translateX(-50%) scale(" + pvScale + ")"
      }}>
        <A4Side slot={previewLayout.left.slot} folio={previewLayout.left.folio} side="left" T={T} topic={topic}
                completed={exportData || printCompleted} oduniImg={oduniImg}
                lang={exportData ? "en" : "ko"} />
        <div className="a4-punch" style={{
          width: 100, height: "100%",
          background: "linear-gradient(to right, " + PDF_PAPER + " calc(50% - 0.5px), rgba(0,0,0,0.22) 50%, " + PDF_PAPER + " calc(50% + 0.5px))",
          flexShrink: 0, position: "relative"
        }}></div>
        <A4Side slot={previewLayout.right.slot} folio={previewLayout.right.folio} side="right" T={T} topic={topic}
                completed={exportData || printCompleted} oduniImg={oduniImg}
                lang={exportData ? "en" : "ko"} />
      </div>
      </div>

      <div className="preview-nav">
        <div className="preview-zoom">
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setPvZoom(z => Math.max(0.45, +(z - 0.1).toFixed(2)))}
            title="미리보기 축소"
          >−</button>
          <button
            type="button"
            className="zoom-btn wide"
            onClick={() => setPvZoom(0.68)}
            title="한눈에 보기"
          >한눈에</button>
          <button
            type="button"
            className="zoom-btn"
            onClick={() => setPvZoom(z => Math.min(1.35, +(z + 0.1).toFixed(2)))}
            title="미리보기 확대"
          >+</button>
          <button
            type="button"
            className="zoom-readout"
            onClick={() => setPvZoom(1)}
            title="창 폭 맞춤으로 되돌리기"
          >{Math.round(pvZoom * 100)}%</button>
        </div>
        <div className="nav-spacer"></div>
        <span className="pages" style={{ fontSize: "13px", fontWeight: "600", padding: "0 12px" }}>
          {previewLayout.left.folio && previewLayout.right.folio
            ? `p.${previewLayout.left.folio} – p.${previewLayout.right.folio}`
            : previewLayout.right.folio
              ? `p.${previewLayout.right.folio}`
              : `p.${previewLayout.left.folio}`}
        </span>
        {isBodySpread && (
          <button
            className="btn pdf-btn"
            type="button"
            onClick={() => setExpandOpen(true)}
            disabled={!!busyKind}
            title="현재 펼침면 본문 크게 편집"
          >
            본문편집
          </button>
        )}
        {isBodySpread && (
          <button
            className="btn pdf-btn ghost"
            type="button"
            onClick={onSaveEdit}
            disabled={!!busyKind || !dirty}
            title="수정한 본문 저장"
          >
            저장
          </button>
        )}
        {(() => {
          window._exportPreview4 = async () => {
            await exportPDF("ko", { silent: true });
            await exportPDF("en", { silent: true });
            await exportCardPDF("ko", { sub: "", silent: true });
            await exportCardPDF("en", { sub: "", silent: true });
          };
          return null;
        })()}
        <div className="nav-spacer"></div>
        <div className="nav-spacer"></div>

        {/* 4개 파일 일괄 생성 (한글/영문 16p PDF, 한글/영문 카드 PDF) */}
        <button
          className="btn pdf-btn"
          style={{ background: "#2f4d4a" }}
          onClick={async () => {
            if (busyKind) return;
            if (!confirm(`한/영 16p PDF와 한/영 10cm 카드 PDF 총 4개를 일괄 생성하시겠습니까?\n(시간이 다소 걸립니다)`)) return;
            try {
              await window._exportPreview4();
              alert("✅ 미리보기의 모든 PDF(총 4개)가 성공적으로 생성되었습니다.");
            } catch (e) {
              alert("일괄 생성 중 오류 발생: " + e.message);
            }
          }}
          disabled={!!busyKind}
          title="한글/영문 16p PDF 및 카드 PDF 4개 일괄 생성"
        >
          {busyKind ? (busyKind.startsWith("번역") ? busyKind : "PDF 일괄 생성 중...") : "모든 미리보기 PDF (4개 파일 일괄 생성)"}
        </button>
        <button
          className="btn pdf-btn ghost"
          onClick={exportPrintPDF}
          disabled={!!busyKind}
          title="A4 인쇄용 임포지션 PDF 한글/영문 저장"
        >
          인쇄용 PDF
        </button>

        <div className="nav-spacer"></div>
        {/* 오둥이 사진 첨부 — p.15 */}
        <label
          className="btn pdf-btn"
          style={{ background: oduniImg ? "#3a2f5d" : "#5d3a2f", color: "#f6ecd6", cursor: "pointer" }}
          title="15페이지에 들어갈 오둥이 사진"
        >
          {oduniImg ? "🐶 오둥이 ✓" : "🐶 오둥이 사진"}
          <input type="file" accept="image/*" onChange={onOduniUpload} style={{ display: "none" }} />
        </label>
        {oduniImg && (
          <button
            className="btn pdf-btn ghost"
            onClick={() => setOduniImg(null)}
            disabled={!!busyKind}
            title="오둥이 사진 제거"
            style={{ padding: "4px 8px" }}
          >✕</button>
        )}
      </div>

      {/* 인쇄 전용: 작업 미리보기 스프레드 — 캡처할 때만 DOM에 올려 미리보기 속도 유지 */}
      {exportDom === "cards" && <div className="print-only">
        {spreads.map(spr => (
          <div key={spr.index} className="book-spread print-spread">
            <PreviewPage
              page={spr.leftPage}
              meta={spr.leftMeta}
              topic={topic}
              coverImg={coverImg}
              backImg={backImg}
              data={(exportData || printCompleted)[spr.index]}
              comicSide={comicSide}
              side="left"
              editable={false}
            />
            <SpineDeep />
            <PreviewPage
              page={spr.rightPage}
              meta={spr.rightMeta}
              topic={topic}
              coverImg={coverImg}
              backImg={backImg}
              data={(exportData || printCompleted)[spr.index]}
              comicSide={comicSide}
              side="right"
              editable={false}
            />
          </div>
        ))}
      </div>}

      {/* A4 인쇄용 임포지션 — PDF 생성 때만 렌더 */}
      {exportDom === "impose" && <div className="print-impose-only">
        {A4_LAYOUT.map((layout, i) => (
          <div key={"a4-" + i} className="a4-page" data-face={layout.face || "front"} style={{
            display: "flex", flexDirection: "row", background: PRINT_PAPER,
            position: "relative", overflow: "hidden"
          }}>
            <A4Side slot={layout.left.slot} folio={layout.left.folio} side="left" T={T} topic={topic}
                    completed={exportData || printCompleted} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} paper={PRINT_PAPER} />
            {/* 중심 재단선 — 옅은 회색 점선 1줄 (CSS .a4-punch::before) */}
            <div className="a4-punch"></div>
            <A4Side slot={layout.right.slot} folio={layout.right.folio} side="right" T={T} topic={topic}
                    completed={exportData || printCompleted} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} paper={PRINT_PAPER} />
          </div>
        ))}
      </div>}

      {/* 1권 최종 확정용 16p 본문 PDF — PDF 생성 때만 렌더 */}
      {exportDom === "book" && <div className="print-book-only">
        {A4_LAYOUT_BOOK.map((layout, i) => (
          <div key={"book-" + i} className="a4-page">
            <A4Side slot={layout.left.slot} folio={layout.left.folio} side="left" T={T} topic={topic}
                    completed={exportData || printCompleted} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} paper={PRINT_PAPER} />
            <div className="a4-punch"></div>
            <A4Side slot={layout.right.slot} folio={layout.right.folio} side="right" T={T} topic={topic}
                    completed={exportData || printCompleted} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} paper={PRINT_PAPER} />
          </div>
        ))}
      </div>}

      {isBodySpread && (
        <div className="preview-edit-bar">
          <div className="edit-status">
            {dirty
              ? <span style={{color: "#a83232"}}>● 텍스트가 수정되었습니다 — 저장 또는 확정하세요</span>
              : (saved && saved.confirmed
                  ? <span style={{color: "#2f5d3a"}}>✓ 확정 완료 · {saved.confirmedAt}</span>
                  : (lastSaved ? <span>✓ 저장됨 · {lastSaved}</span>
                      : <span style={{color: "var(--ink-soft)"}}>미리보기 확인 후 ‘확정’을 누르세요</span>))
            }
          </div>
          <button
            className="btn"
            onClick={() => setExpandOpen(true)}
            style={{fontSize: 10, marginRight: 6}}
          >
            본문편집
          </button>
          <button
            className="btn"
            disabled={!dirty}
            onClick={onSaveEdit}
            style={{fontSize: 10, marginRight: 6}}
          >
            저장
          </button>
          <button
            className="btn primary"
            onClick={onConfirmSpread}
            style={{fontSize: 10, background: saved && saved.confirmed && !dirty ? "#8a5a12" : "#2f5d3a", borderColor: saved && saved.confirmed && !dirty ? "#8a5a12" : "#2f5d3a" }}
            title="이 스프레드 1개를 확정 저장합니다. 다시 누르면 같은 파일명으로 덮어써 재확정합니다."
          >
            {saved && saved.confirmed && !dirty ? "↻ 재확정" : "✓ 확정 저장"}
          </button>
        </div>
      )}

      <div className="hint" style={{fontSize: 11}}>
        ← / → 키로 페이지를 넘길 · 펼침면 {currentIdx + 1} / {total} · 텍스트를 클릭해 수정 · ⚶ 버튼으로 확대 편집
      </div>

      {expandOpen && isBodySpread && (
        <div className="expand-modal" onClick={() => setExpandOpen(false)}>
          <div className="expand-card" onClick={(e) => e.stopPropagation()}>
            <div className="expand-head">
              <div>
                <div className="expand-title">본문 편집 · 본문 #{String(bodyWorkIdx).padStart(2, "0")}</div>
                <div className="expand-sub">pp.{bodySpread.leftPage}–{bodySpread.rightPage} · 수정하는 즉시 미리보기와 책구조에 반영됩니다</div>
              </div>
              <button className="expand-x" onClick={() => setExpandOpen(false)}>✕</button>
            </div>
            <textarea
              className="expand-textarea"
              value={editBuf}
              onChange={(e) => pushBodyEdit(e.target.value)}
              spellCheck="false"
              autoFocus
            />
            <div className="expand-foot">
              <span className="expand-meta">
                {editBuf.split("\n").filter(l => l.trim()).length}줄 · {editBuf.length}자
                {dirty && <span style={{color: "#a83232", marginLeft: 12}}>● 수정됨</span>}
              </span>
              <div style={{display: "flex", gap: 8}}>
                <button className="btn ghost" onClick={() => setExpandOpen(false)}>닫기</button>
                <button
                  className="btn primary"
                  disabled={!dirty}
                  onClick={onSaveEdit}
                >저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpineDeep() {
  // 실 노출 제본 시각화 — 가운데에 책등을 따라 굵게
  return (
    <div className="spine-deep">
      <svg viewBox="0 0 20 100" preserveAspectRatio="none" style={{position:"absolute", inset:0, width:"100%", height:"100%"}}>
        {Array.from({ length: 8 }).map((_, i) => {
          const y = ((i + 0.5) / 8) * 100;
          return (
            <g key={i}>
              <line x1="2" y1={y} x2="18" y2={y} stroke="rgba(74,36,21,0.55)" strokeWidth="0.6" strokeDasharray="1 0.8"/>
              <circle cx="10" cy={y} r="1.6" fill="#4a2415" />
              <circle cx="10" cy={y} r="1.6" fill="none" stroke="rgba(246,236,214,0.4)" strokeWidth="0.3"/>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PreviewPage({ page, meta, topic, coverImg, backImg, data, comicSide, side, editBuf, setEditBuf, editable, onExpandEdit }) {
  const T = window.TOPICS[topic];

  // 표지
  if (meta.section === "cover") {
    return (
      <div className={"spread-page " + side}>
        <div className={"cover-page " + (coverImg ? "has-image" : "")}>
          {coverImg && <img src={coverImg} alt="" />}
          {!coverImg && (
            <div className="cover-title">
              <div className="main">{T.nameKo}</div>
              <div className="sub">{T.sub}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  // 뒷표지
  if (meta.section === "back") {
    return (
      <div className={"spread-page " + side}>
        <div className={"cover-page " + (backImg ? "has-image" : "")} style={{background: backImg ? "#1a1410" : "var(--paper-warm)"}}>
          {backImg && <img src={backImg} alt="" />}
          {!backImg && (
            <div className="cover-title" style={{color: "var(--ink-soft)"}}>
              <div className="main" style={{fontSize: 28}}>❦</div>
              <div className="sub">FIN</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 프롤로그
  if (meta.section === "prologue") {
    return (
      <div className={"spread-page " + side}>
        <div className="text-page">
          {page === 2 && (
            <>
              <div className="label">Prologue</div>
              <h2>들어가며</h2>
              <p>이 책은 어렵다고 알려진 철학을 일상의 언어로 옮기려 한다.</p>
              <p>한 편의 4컷 만화와 한 장의 상징, 그리고 짧은 글이 한 쌍을 이룬다.</p>
              <p>왼쪽에서 이야기가 시작되고, 오른쪽에서 상이 맺힌다.</p>
              <div className="quote">"읽는 동안, 당신은 잠시 사유의 손님이 된다."</div>
            </>
          )}
          {page === 3 && (
            <>
              <div className="label">how to read</div>
              <h2>읽는 법</h2>
              <p>한 펼침면을 한 호흡으로 읽으십시오.</p>
              <p>4컷에서 일어난 일을 기억하며 오른쪽 그림을 바라보면, 두 장면이 마음 안에서 한 장의 풍경으로 합쳐집니다.</p>
              <p>이해하려 하기보다, 느끼려 하면 됩니다.</p>
            </>
          )}
          {page === 4 && (
            <>
              <div className="label">about the topic</div>
              <h2>{T.nameKo}에 관하여</h2>
              <p>{T.name === "Talmud" && "탈무드는 2천 년에 걸쳐 쌓인 유대의 지혜다. 정답이 아니라 질문하는 법을 알려준다."}</p>
              <p>{T.name === "Nietzsche" && "니체는 무너진 시대 위에서 다시 일어서는 법을 물었다. 절망 너머의 긍정이 있다."}</p>
              <p>{T.name === "Schopenhauer" && "쇼펜하우어는 욕망의 시계추를 멈추는 짧은 순간들을 사랑했다. 예술과 동정이 그 길이었다."}</p>
            </>
          )}
          <div className="page-num">{page}</div>
        </div>
      </div>
    );
  }

  // 챕터 타이틀
  if (meta.section === "chapter") {
    const isLeft = side === "left";
    if (isLeft && meta.idx === 1) {
      return (
        <div className={"spread-page " + side}>
          <div className="chapter-title-page">
            <div className="ch-num">PART · 01</div>
            <div className="ch-title">고요한 시작</div>
            <div className="ch-divider"></div>
            <div className="ch-desc">처음 만나는 12편의 사유.<br/>일상 안에 숨어 있는 질문들.</div>
            <div className="page-num">{page}</div>
          </div>
        </div>
      );
    }
    if (isLeft && meta.idx === 2) {
      return (
        <div className={"spread-page " + side}>
          <div className="chapter-title-page">
            <div className="ch-num">PART · 02</div>
            <div className="ch-title">깊어지는 침묵</div>
            <div className="ch-divider"></div>
            <div className="ch-desc">나머지 12편의 사유.<br/>당신의 한 줄을 기다리는 여백.</div>
            <div className="page-num">{page}</div>
          </div>
        </div>
      );
    }
    // 빈 오른쪽 (챕터 타이틀의 짝)
    return (
      <div className={"spread-page " + side}>
        <div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>
          <svg viewBox="0 0 100 100" width="40%">
            <circle cx="50" cy="50" r="32" stroke="var(--topic-accent)" strokeWidth="0.8" fill="none"/>
            <circle cx="50" cy="50" r="22" stroke="var(--topic-accent)" strokeWidth="0.8" fill="none"/>
            <circle cx="50" cy="50" r="12" stroke="var(--topic-accent)" strokeWidth="0.8" fill="none"/>
          </svg>
        </div>
        <div className="page-num">{page}</div>
      </div>
    );
  }

  // 에필로그
  if (meta.section === "epilogue") {
    return (
      <div className={"spread-page " + side}>
        <div className="text-page">
          {page === 57 && (<>
            <div className="label">Epilogue</div>
            <h2>마치며</h2>
            <p>한 페이지가 끝나도 사유는 계속된다.</p>
            <p>책을 덮은 뒤의 침묵이, 사실은 이 책이 시작되는 자리다.</p>
            <div className="quote">"끝은 다른 시작의 다른 이름."</div>
          </>)}
          {page === 58 && (<>
            <div className="label">closing letter</div>
            <h2>독자에게</h2>
            <p>여기까지 함께해 주어 고맙다.</p>
            <p>당신이 가장 오래 머문 한 페이지, 그 한 줄이 당신의 오늘이다.</p>
          </>)}
          {page === 59 && (<>
            <div className="label">colophon</div>
            <h2>제작</h2>
            <p>본 도서는 60페이지 24편의 사유로 구성되었습니다.</p>
            <p>표지는 무광 종이, 책등은 실 노출 제본.</p>
            <p>본문은 100g 미색지에 인쇄.</p>
          </>)}
          <div className="page-num">{page}</div>
        </div>
      </div>
    );
  }

  // 본문 (작품) — 노출제본 빈 템플릿: 상단 2.4cm 여백 → 10cm 1:1 카드 → 8.6cm 필기공간
  if (meta.section === "body") {
    const isLeft = side === "left";
    const showComicHere = (comicSide === "left" && isLeft) || (comicSide === "right" && !isLeft);
    const cardImg = showComicHere ? data?.comicImg : data?.illustImg;

    const source = editable ? (editBuf || "") : (data?.body || "");
    const lines0 = source.split("\n");
    const fIdx = lines0.findIndex(l => l.trim().length > 0);
    const titleLine = fIdx >= 0 ? lines0[fIdx] : "";
    // 카드 제목은 001_a.txt 첫 줄을 우선 사용. 영문 출력 데이터는 d.title에 별도 번역 제목을 넣는다.
    const explicitTitle = data?.title && data.title.trim();
    const cardTitle = explicitTitle || titleLine || (data?.quote && data.quote.trim()) || "";
    const bodyForCard = explicitTitle
      ? source.replace(/\s+$/, "")
      : (fIdx >= 0 ? lines0.slice(fIdx + 1).join("\n").replace(/\s+$/, "") : source.replace(/\s+$/, ""));

    return (
      <div className={"spread-page tpl " + side}>
        <div className="tpl-page">
          {/* 상단 2.4cm — 순수 여백 (글자 없음) */}
          <div className="tpl-topband"></div>

          {/* 10cm 정사각 철학 카드 — 카드 안: 주제·카테고리 헤더 + (좌 4컷 / 우 본문) 정확히 2등분 */}
          <div className="card-slot">
            <span className="corner tl"></span><span className="corner tr"></span>
            <span className="corner bl"></span><span className="corner br"></span>
              <div className="card-inner">
                <div className="card-cat">
                  <span className="orn">⚜</span>
                  <span className="cc-topic">{data?.topicLabel || T?.nameKo}</span>
                  {(data?.catLabel || data?.category) && <span className="cc-cat">· {data?.catLabel || data?.category}</span>}
                  <span className="orn">⚜</span>
                </div>
              {showComicHere ? (
                <div className="card-split">
                  <div className="cs-left">
                    {data?.comicImg ? (
                      <img src={data.comicImg} alt="" />
                    ) : (
                      <div className="cs-comic-ph">
                        {[0,1,2,3].map(i => (
                          <div key={i} className="cc-panel">
                            <PanelGlyph shape={["circle","triangle","square","wave"][((meta.workIdx || 0) + i) % 4]} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="cs-right">
                    <div className="text-title book-title-strong">
                      <span className="title-quote">“{cardTitle || (data?.title || `사유 #${meta.workIdx}`)}”</span>
                    </div>
                    {editable ? (
                      <AutoFitTextarea
                        value={explicitTitle ? (data?.body || source) : (fIdx >= 0 ? lines0.slice(fIdx + 1).join("\n") : "")}
                        onChange={(v) => setEditBuf(explicitTitle ? v : ((titleLine ? titleLine + "\n" : "") + v))}
                        onExpand={onExpandEdit}
                        minFontSize={10}
                      />
                    ) : (
                      <AutoFitBody text={bodyForCard} minFontSize={10} />
                    )}
                  </div>
                </div>
              ) : data?.illustImg ? (
                <div className="card-body"><img src={data.illustImg} alt="" className="card-illust" /></div>
              ) : (
                <div className="card-body card-empty">
                  <span>1:1 상징 카드</span><small>10 × 10 cm</small>
                </div>
              )}
            </div>
          </div>

          {/* 카드 아래 8.6cm — 순수 필기 공간(빈칸) */}
          <div className="write-space">
            <div className="write-hint">필기 공간 · 8.6 cm</div>
          </div>
        </div>
        <div className="page-num">{page}</div>
      </div>
    );
  }

  return (
    <div className={"spread-page " + side}>
      <div className="page-num">{page}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// A4 인쇄용 임포지션 한 면 (좌 또는 우, 141mm × 210mm 영역)
// 슬롯 타입: null(공백) / "front-inner"(앞내지) / "contents"(목차) / "back-inner"(명언) / "oduni-photo"(오둥이) / 페이지번호(본문 카드)
// 본문 페이지: 상단 1:1 정사각 이미지(141×141mm), 아래 69mm 필기 여백
// ─────────────────────────────────────────────────────────────────────────
function A4Side({ slot, folio, side, T, topic, completed, oduniImg, lang, noAutoFit, fixedBodyFontSize, paper }) {
  const isEn = lang === "en";
  const PAPER = paper || PDF_PAPER; // 인쇄 호출부는 PRINT_PAPER(흰색) 전달, 미리보기는 종이톤
  // 영어 모드일 때 d.topicLabel / d.catLabel은 buildEnCompleted가 미리 채워둠
  const baseStyle = {
    width: "940px",
    height: "1400px",
    background: PAPER,
    position: "relative",
    flexShrink: 0,
    boxSizing: "border-box"
  };
  const squareStyle = {
    width: "940px",
    height: "940px",
    aspectRatio: "1 / 1",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0
  };
  /* 페이지번호: 본문 카드(slot=1~10)에만 표시. "{slot}페이지" 포맷.
     앞내지/목차/명언/오둥이/철학종/줄공책 등 비본문 슬롯은 표시 X. 한·영 공통. */
  const FolioMark = ({ size = 22 } = {}) => (typeof slot === "number") ? (
    <div style={{
      position: "absolute",
      bottom: "20px",
      left: 0, right: 0,
      textAlign: "center",
      fontSize: size + "px",
      fontWeight: 700,
      color: "rgba(74,36,21,0.85)",
      letterSpacing: "0.15em",
      fontFamily: "var(--font-serif, serif)"
    }}>Page {slot}</div>
  ) : null;
  const topicTitle = isEn
    ? (T ? T.name : "")
    : ((T ? T.nameKo : "") + " · " + (T ? T.name : ""));
  const categoryLabel = (d) => isEn
    ? (d.catLabel || (window.CATEGORY_EN && window.CATEGORY_EN[d.category]) || d.category || "")
    : (d.category || "");
  const topicLabel = (d) => isEn
    ? (d.topicLabel || (T ? T.name : ""))
    : (T ? T.nameKo : "");

  // 공백
  if (slot === null || slot === undefined) {
    return <div className={"a4-side a4-blank a4-" + side} style={baseStyle}><FolioMark /></div>;
  }

  // 앞내지 — 책의 첫 안쪽 페이지
  if (slot === "front-inner") {
    return (
      <div className={"a4-side a4-front-inner a4-" + side} style={{
        ...baseStyle,
        padding: "12% 8%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "1em",
          width: "100%"
        }}>
          <span style={{ fontSize: "50px", color: "var(--topic-accent, #8b7355)", lineHeight: 1 }}>⚜</span>
          <span style={{
            fontSize: "50px", letterSpacing: isEn ? "0.15em" : "0",
            color: "var(--ink, #2b1d13)", textTransform: "uppercase",
            fontFamily: "var(--font-serif, serif)",
            lineHeight: 1.15,
            whiteSpace: "nowrap"
          }}>
            {topicTitle}
          </span>
          <span style={{ fontSize: "50px", color: "var(--topic-accent, #8b7355)", lineHeight: 1 }}>⚜</span>
        </div>
        <FolioMark />
      </div>
    );
  }

  // 목차 — 카테고리 목록
  if (slot === "contents") {
    return (
      <div className={"a4-side a4-contents a4-" + side} style={{
        ...baseStyle,
        padding: "10% 8%",
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          textAlign: "center", marginBottom: "8%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "1em"
        }}>
          <span style={{ fontSize: "28px", color: "var(--topic-accent, #8b7355)" }}>⚜</span>
          <span style={{
            fontSize: "30px", letterSpacing: "0.3em",
            color: "var(--ink, #2b1d13)", textTransform: "uppercase",
            fontFamily: "var(--font-serif, serif)"
          }}>
            {isEn ? "CONTENTS" : "목 차"}
          </span>
          <span style={{ fontSize: "28px", color: "var(--topic-accent, #8b7355)" }}>⚜</span>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", gap: "18px",
          fontFamily: "var(--font-serif, serif)", fontSize: "24px",
          color: "var(--ink, #2b1d13)"
        }}>
          {[1, 2, 3, 4, 5].map(i => {
            const d = completed[i] || {};
            const pa = String((i - 1) * 2 + 1).padStart(3, "0");
            const pb = String((i - 1) * 2 + 2).padStart(3, "0");
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                borderBottom: "1px dotted rgba(74,36,21,0.25)",
                paddingBottom: "6px"
              }}>
                <span style={{ color: "var(--ink-muted, #8a7560)", letterSpacing: "0.05em" }}>
                  {pa}–{pb}
                </span>
                <span style={{ fontWeight: 600 }}>{categoryLabel(d) || "—"}</span>
              </div>
            );
          })}
        </div>
        <FolioMark />
      </div>
    );
  }

  // 뒷내지 — 5개 본문의 명언·구절 목록
  if (slot === "back-inner") {
    return (
      <div className={"a4-side a4-back-inner a4-" + side} style={{
        ...baseStyle,
        padding: "10% 8%",
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          textAlign: "center", marginBottom: "8%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "1em"
        }}>
          <span style={{ fontSize: "26px", color: "var(--topic-accent, #8b7355)" }}>❦</span>
          <span style={{
            fontSize: "30px", letterSpacing: "0.3em",
            color: "var(--ink, #2b1d13)", fontFamily: "var(--font-serif, serif)"
          }}>{isEn ? "QUOTES" : "명 언 · 구 절"}</span>
          <span style={{ fontSize: "26px", color: "var(--topic-accent, #8b7355)" }}>❦</span>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", gap: "24px",
          fontFamily: "var(--font-serif, serif)", fontSize: "24px",
          color: "var(--ink, #2b1d13)", lineHeight: 1.55
        }}>
          {[1, 2, 3, 4, 5].map(i => {
            const d = completed[i] || {};
            const parts = splitTitleBodyText(d.body || "");
            let q = d.quote || d.title || parts.title || "—";
            
            // 앞뒤 띄어쓰기 및 따옴표 제거
            q = q.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
            
            // 만약 q 안에 줄바꿈이 있다면 첫 줄만 명언으로 취급
            if (q.includes("\n")) {
              q = q.split("\n")[0].trim();
            }
            
            // 만약 줄바꿈 없이 스토리가 한 줄로 길게 들어간 경우, 첫 문장만 추출
            const sentences = q.split(". ");
            if (sentences.length > 1 && q.length > 60) {
              q = sentences[0] + (sentences[0].endsWith(".") ? "" : ".");
            }
            const pa = String((i - 1) * 2 + 1).padStart(3, "0");
            return (
              <div key={i}>
                <div style={{
                  fontSize: "22px", letterSpacing: "0.15em",
                  color: "var(--ink-muted, #8a7560)", marginBottom: "6px"
                }}>{pa} · {categoryLabel(d)}</div>
                <div style={{ fontStyle: "italic" }}>"{q}"</div>
              </div>
            );
          })}
        </div>
        <FolioMark />
      </div>
    );
  }

  // 철학종 — 책 첫 페이지(우측 중앙). 좌측은 null 슬롯이라 공백 페이지로 렌더됨.
  // ⚜ {한글 철학명} ⚜ + 영문 보조. FolioMark 없음(페이지번호 X).
  if (slot === "philosophy-mark") {
    return (
      <div className={"a4-side a4-philosophy-mark a4-" + side} style={{
        ...baseStyle,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9em" }}>
          <span style={{
            fontSize: "120px",
            color: "var(--topic-accent, #8b7355)",
            lineHeight: 1
          }}>⚜</span>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: "0.4em"
          }}>
            <span style={{
              fontSize: isEn ? "70px" : "90px",
              letterSpacing: isEn ? "0.2em" : "0.4em",
              color: "var(--ink, #2b1d13)",
              fontFamily: "var(--font-serif, serif)",
              fontWeight: 600,
              whiteSpace: "nowrap"
            }}>
              {T ? (isEn ? T.name.toUpperCase() : T.nameKo) : ""}
            </span>
            {T && !isEn && T.name ? (
              <span style={{
                fontSize: "32px",
                letterSpacing: "0.4em",
                color: "var(--ink-muted, #6b5440)",
                fontFamily: "var(--font-serif, serif)",
                textTransform: "uppercase",
                opacity: 1,
                fontWeight: 800
              }}>{T.name}</span>
            ) : null}
            <span style={{
              fontSize: "24px",
              letterSpacing: "0.2em",
              color: "var(--ink-muted, #6b5440)",
              fontFamily: "var(--font-serif, serif)",
              marginTop: "12px",
              fontWeight: 600
            }}>
              {(() => {
                const b = (completed && [1, 2, 3, 4, 5].map(i => completed[i] && completed[i].book).find(Boolean)) || 1;
                const bNum = String(b).replace(/권$/, "");
                return isEn ? `Vol. ${bNum}` : `${bNum}권`;
              })()}
            </span>
          </div>
          <span style={{
            fontSize: "120px",
            color: "var(--topic-accent, #8b7355)",
            lineHeight: 1
          }}>⚜</span>
        </div>
        {/* FolioMark 일부러 안 그림 — 페이지번호 없음 */}
      </div>
    );
  }

  // 테마 마크 — 작업실 선택 철학을 한글·영어로 정중앙(15px), 고딕 ⚜ 앞뒤 장식
  if (slot === "theme-mark") {
    return (
      <div className={"a4-side a4-theme-mark a4-" + side} style={{
        ...baseStyle,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: "1.4em"
        }}>
          <span style={{
            fontSize: "32px",
            color: "var(--topic-accent, #8b7355)",
            lineHeight: 1
          }}>⚜</span>
          <span style={{
            fontSize: "50px",
            letterSpacing: "0.4em",
            color: "var(--ink, #2b1d13)",
            fontFamily: "var(--font-serif, serif)",
            fontWeight: 500,
            whiteSpace: "nowrap"
          }}>
            {topicTitle}
          </span>
          <span style={{
            fontSize: "32px",
            color: "var(--topic-accent, #8b7355)",
            lineHeight: 1
          }}>⚜</span>
        </div>
        <FolioMark />
      </div>
    );
  }

  // 오둥이 사진
  if (slot === "oduni-photo") {
    return (
      <div className={"a4-side a4-photo a4-" + side} style={{
        ...baseStyle,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "5%"
      }}>
        {oduniImg ? (
          <img src={oduniImg} alt="오둥이"
               style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
                        boxShadow: "0 6px 24px rgba(0,0,0,0.18)" }} />
        ) : (
          <div style={{
            width: "80%", aspectRatio: "1 / 1",
            border: "2px dashed rgba(74,36,21,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "12px",
            color: "var(--ink-muted, #8a7560)", fontSize: "16px"
          }}>
            <span style={{ fontSize: "48px" }}>🐶</span>
            <span>오둥이 사진 미첨부</span>
            <span style={{ fontSize: "12px" }}>미리보기 nav에서 첨부하세요</span>
          </div>
        )}
        <FolioMark />
      </div>
    );
  }

  // 줄노트 — 20줄 가로줄 (글·그림 겸용, 웜브라운 톤온톤, 페이지번호 없음)
  if (slot === "lined-note") {
    const LINES = 20;
    const lineColor = LINED_NOTE_COLOR; // 크래프트지 가독성 위해 0.40 → 0.80(2배, 사장님 요청)
    return (
      <div className={"a4-side a4-lined-note a4-" + side} style={{
        ...baseStyle,
        padding: "9% 9%",
        display: "flex", flexDirection: "column", justifyContent: "space-between"
      }}>
        {Array.from({ length: LINES }).map((_, i) => (
          <div key={i} style={{ borderBottom: "1.5px solid " + lineColor, width: "100%" }} />
        ))}
      </div>
    );
  }

  // 본문 페이지 (숫자 1~10)
  //  _a (홀수) = 1:1 정사각 카드 안에 좌 4컷 + 우 본문 텍스트 (기존 본문 카드와 동일 디자인)
  //  _b (짝수) = 1:1 정사각 일러스트 이미지 1장
  if (typeof slot === "number") {
    const workIdx = Math.floor((slot - 1) / 2) + 1;
    const d = completed[workIdx] || {};
    const isAside = slot % 2 === 1;
    const pad = String(slot).padStart(3, "0");

    // 카드 제목은 001_a.txt 첫 줄을 우선 사용. 영문 출력 데이터는 d.title에 별도 번역 제목을 넣는다.
    const source = d.body || "";
    const lines0 = source.split("\n");
    const fIdx = lines0.findIndex(l => l.trim().length > 0);
    const titleLine = fIdx >= 0 ? lines0[fIdx] : "";
    const explicitTitle = d.title && d.title.trim();
    const cardTitle = explicitTitle || titleLine || (d.quote && d.quote.trim()) || (isEn ? `Reflection #${workIdx}` : `사유 #${workIdx}`);
    const bodyText = explicitTitle
      ? source.replace(/\s+$/, "")
      : (fIdx >= 0 ? lines0.slice(fIdx + 1).join("\n").replace(/\s+$/, "") : source.replace(/\s+$/, ""));

    return (
      <div className={"a4-side a4-body a4-" + side} style={{
        ...baseStyle,
        display: "flex", flexDirection: "column",
        padding: 0
      }}>
        {/* 상단 1:1 정사각 영역 — a(4컷+글)와 b(이미지) 모두 940×940 동일 크기 */}
        <div className="a4-card-square" style={squareStyle}>
          {isAside ? (
            // _a 페이지 — 본문 카드 (기존 .card-slot 디자인 그대로)
            <div className="card-slot" style={{
              position: "absolute", inset: 0, width: "940px", height: "940px"
            }}>
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>
              <div className="card-inner">
                <div className="card-cat">
                  <span className="orn">⚜</span>
                  <span className="cc-topic">{topicLabel(d)}</span>
                  {categoryLabel(d) && <span className="cc-cat">· {categoryLabel(d)}</span>}
                  <span className="orn">⚜</span>
                </div>
                <div className="card-split">
                  <div className="cs-left">
                    {d.comicImg ? (
                      <img src={d.comicImg} alt="" />
                    ) : (
                      <div className="cs-comic-ph">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="cc-panel"></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="cs-right">
                    <div className="text-body-wrap">
                      <div className="text-body" style={{ fontSize: "22px" }}>
                        <div style={{
                          fontWeight: 800,
                          fontSize: "24px",
                          marginBottom: "0.5em",
                          paddingBottom: "0.3em",
                          borderBottom: "1px solid var(--rule)"
                        }}>"{cardTitle}"</div>
                        {bodyText || "(이 페이지의 본문이 아직 작성되지 않았습니다.)"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // _b 페이지 — 일러스트 이미지 1장 (1:1 가득)
            d.illustImg ? (
              <img src={d.illustImg} alt=""
                   style={{ width: "940px", height: "940px", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                position: "absolute", inset: 0,
                background: "#fafafa",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(74,36,21,0.35)",
                fontSize: "14px", letterSpacing: "0.2em"
              }}>일러스트 이미지 미첨부</div>
            )
          )}
        </div>
        {/* 하단 필기 여백 — 줄 5줄(줄공책 20줄과 동일 간격 60.4px) + 페이지 번호 */}
        <div style={{
          flex: 1,
          position: "relative",
          background: PAPER
        }}>
          {/* 본문 페이지 필기용 줄 5줄 — 줄공책과 동일 색·간격 */}
          <div style={{
            position: "absolute", top: 0, left: "9%", right: "9%",
            display: "flex", flexDirection: "column"
          }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                borderBottom: "1.5px solid " + LINED_NOTE_COLOR,
                height: "60.4px"
              }} />
            ))}
          </div>
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: 0, right: 0,
            textAlign: "center",
            fontSize: "22px",
            fontWeight: 700,
            color: "rgba(74,36,21,0.85)",
            letterSpacing: "0.15em",
            fontFamily: "var(--font-serif, serif)"
          }}>Page {slot}</div>
        </div>
      </div>
    );
  }

  return <div className={"a4-side a4-" + side} style={baseStyle}></div>;
}

Object.assign(window, { BookGrid, BookPreview, A4Side });
