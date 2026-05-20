/* book-view.jsx — 책 탭 (60p 그리드) + 미리보기 탭 (펼침면) */

const { useState: useStateBV, useRef: useRefBV } = React;

/* ────────── 자동 폰트 축소 ────────── */
// 한 페이지에 맞도록 폰트 크기를 줄여서 fit
function AutoFitBody({ text }) {
  const wrapRef = useRefBV();
  const innerRef = useRefBV();
  const [fontSize, setFontSize] = useStateBV(13);

  React.useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current;
      const inner = innerRef.current;
      if (!wrap || !inner || wrap.clientHeight < 8) return; // 숨김 상태(0높이) 측정 방지
      let fs = 16;
      inner.style.fontSize = fs + "px";
      let guard = 90;
      while (inner.scrollHeight > wrap.clientHeight && fs > 7 && guard-- > 0) {
        fs -= 0.5;
        inner.style.fontSize = fs + "px";
      }
      setFontSize(fs);
    };
    fit();
    const t1 = setTimeout(fit, 180);
    let ro;
    if (window.ResizeObserver && wrapRef.current) {
      ro = new ResizeObserver(() => fit());
      ro.observe(wrapRef.current);
    }
    return () => { clearTimeout(t1); ro && ro.disconnect(); };
  }, [text]);

  return (
    <div ref={wrapRef} className="text-body-wrap">
      <div ref={innerRef} className="text-body" style={{fontSize}}>
        {text || "(이 페이지의 본문이 아직 작성되지 않았습니다.)"}
      </div>
    </div>
  );
}

function AutoFitTextarea({ value, onChange, onExpand }) {
  const wrapRef = useRefBV();
  const taRef = useRefBV();
  const [fontSize, setFontSize] = useStateBV(13);
  const [fitWarn, setFitWarn] = useStateBV(false);

  React.useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current;
      const ta = taRef.current;
      if (!wrap || !ta || wrap.clientHeight < 8) return;
      let fs = 16;
      ta.style.fontSize = fs + "px";
      let guard = 90;
      while (ta.scrollHeight > wrap.clientHeight && fs > 7 && guard-- > 0) {
        fs -= 0.5;
        ta.style.fontSize = fs + "px";
      }
      setFontSize(fs);
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
  }, [value]);

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

/* ───────── 책 그리드 (60p 한눈에) ───────── */
function BookGrid({ spreads, completed, onPickSpread, topic, coverImg, backImg, onCoverUpload, onBackUpload }) {
  const T = window.TOPICS[topic];
  return (
    <div className="book-grid">
      {/* 표지 행 */}
      <SectionHeader title="표지" subtitle="cover" />
      <CoverAttach
        side="front"
        img={coverImg}
        onUpload={onCoverUpload}
        topicName={T?.nameKo}
        topicSub={T?.sub}
      />
      <div style={{gridColumn: "span 4", display: "flex", alignItems: "center", padding: "12px 16px"}}>
        <div className="hint">
          표지 이미지는 테두리 없이 종이 톤 위에 얹힙니다.
          이미지가 없으면 주제 색상이 표시됩니다.
        </div>
      </div>

      {/* 뒷표지 */}
      <SectionHeader title="뒷표지" subtitle="back cover" />
      <CoverAttach
        side="back"
        img={backImg}
        onUpload={onBackUpload}
        topicName=""
        topicSub="❦"
      />
      <div style={{gridColumn: "span 4", display: "flex", alignItems: "center", padding: "12px 16px"}}>
        <div className="hint">
          노출 제본 빈 템플릿 — 표지 1 스프레드 + 본문 5 스프레드(카드 10장). 책등은 실 노출 제본.
        </div>
      </div>

      {/* 본문 — 5편 (001_a ~ 010_b) */}
      <SectionHeader title="본문" subtitle="body · 5 spreads · 001_a–010_b" />
      {spreads.slice(1).map(sp => (
        <SpreadCell key={sp.index} sp={sp} done={completed[sp.index]} onPick={() => onPickSpread(sp.index)} />
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

function SpreadCell({ sp, done, onPick }) {
  const leftLabel = `${String(sp.leftPage).padStart(3, "0")}_a`;
  const rightLabel = `${String(sp.rightPage).padStart(3, "0")}_b`;
  return (
    <div className="spread-cell" onClick={onPick} title={`${sp.leftMeta.label} · ${sp.rightMeta.label}`}>
      <div className={"cell-thumb" + (done ? "" : " empty")}>
        {done ? (
          <MiniSpread sp={sp} />
        ) : (
          <span>{sp.leftMeta.label}</span>
        )}
      </div>
      <div className="cell-label">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
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
function BookPreview({ spreads, completed, setCompleted, topic, coverImg, backImg, comicSide, currentIdx, setCurrentIdx, bookNo, oduniImg, setOduniImg }) {
  // ⚠ 인쇄 사고 방지 — 워크스페이스 본문의 실제 topic을 우선 사용 (현재 topic state X)
  // 본문 내용은 니체인데 헤더가 탈무드로 잘못 표시되는 케이스 방지
  const bookTopic = React.useMemo(() => {
    const found = [1, 2, 3, 4, 5]
      .map(i => completed[i])
      .find(d => d && d.topic && window.TOPICS[d.topic]);
    return found ? found.topic : topic;
  }, [completed, topic]);
  const T = window.TOPICS[bookTopic] || window.TOPICS[topic];
  const total = spreads.length;
  const sp = spreads[currentIdx];
  const saved = completed[sp.index];

  // 미리보기에서 본문 텍스트 인라인 편집
  const [editBuf, setEditBuf] = useStateBV(saved?.body || "");
  const [dirty, setDirty] = useStateBV(false);
  const [lastSaved, setLastSaved] = useStateBV(null);
  const [expandOpen, setExpandOpen] = useStateBV(false);
  const [busyKind, setBusyKind] = useStateBV(""); // "" | "pdf" | "card" | "..번역.."
  const [exportData, setExportData] = useStateBV(null); // 영문판 캡처용 임시 데이터

  // 로컬 Ollama 번역 (한국어→영어, 클라우드 미사용) + IndexedDB 캐시
  const OLLAMA_TR_URL = (location.protocol === "http:" || location.protocol === "https:")
    ? (location.origin + "/ollama/chat") : "http://localhost:11434/api/chat";
  const djb2 = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "tr_" + (h >>> 0); };
  const translateText = async (ko) => {
    if (!ko || !ko.trim()) return ko;
    const key = djb2(ko);
    if (window.ArtbookStore) { const c = await window.ArtbookStore.get(key); if (c && c.en) return c.en; }
    const sys = "You are a professional literary translator. Translate the Korean text into natural, elegant English suitable for a philosophy art book. Preserve line breaks exactly (one source line = one English line). Output ONLY the English translation — no notes, no quotation marks.";
    try {
      const res = await fetch(OLLAMA_TR_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "qwen2.5:14b", stream: false, keep_alive: "10m",
          messages: [{ role: "system", content: sys }, { role: "user", content: ko }],
          options: { temperature: 0.3, top_p: 0.9, num_predict: 1400 } })
      });
      const j = await res.json();
      const en = ((j && j.message && j.message.content) || "").trim();
      if (en && window.ArtbookStore) window.ArtbookStore.set(key, { en });
      return en || ko;
    } catch (e) { console.warn("[translate] 실패:", e.message); return ko; }
  };
  const buildEnCompleted = async (src, onProg) => {
    const out = {}; const keys = Object.keys(src);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]; const d = src[k] || {};
      onProg && onProg(i + 1, keys.length);
      out[k] = {
        ...d,
        body: d.body ? await translateText(d.body) : (d.body || ""),
        topicLabel: (T ? T.name : ""),
        catLabel: (window.CATEGORY_EN && window.CATEGORY_EN[d.category]) || d.category
      };
    }
    return out;
  };

  // 미리보기 → 로컬 PDF 파일로 저장 (전 스프레드, 클라이언트 전용)
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
    if (EN) {
      try {
        const en = await buildEnCompleted(printCompleted, (n, t) => setBusyKind("번역 " + n + "/" + t));
        setExportData(en); usedEn = true;
        await new Promise(r => setTimeout(r, 200)); // EN 재렌더 대기
      } catch (e) { console.warn("[pdf-en] 번역 실패:", e.message); }
      setBusyKind("pdf-en");
    }
    // opts.selector로 다른 hidden DOM 선택 가능 (예: .print-book-only 인쇄용 본문 디자인)
    const selector = opts.selector || ".print-only";
    const childSelector = opts.childSelector || ".print-spread";
    const po = document.querySelector(selector);
    if (!po) { if (usedEn) setExportData(null); setBusyKind(""); return; }

    const prevStyle = po.getAttribute("style") || "";
    const W = 1980, H = 1400; // 스프레드 29.7:21 (1980/1400 ≈ 1.4143)
    po.setAttribute("style",
      "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:#ffffff;z-index:-1;");
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
          scale: 2, useCORS: true, backgroundColor: "#ffffff",
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
        ? ("artbook_" + (T ? T.name : "book") + "_" + stamp + "_EN.pdf")
        : ("아트북_" + (T ? T.nameKo : "book") + "_" + stamp + ".pdf"));

      // 서버로 열렸으면 make_book/pdf 폴더에 저장, 아니면 브라우저 다운로드 폴백
      let savedToFolder = false;
      if (location.protocol === "http:" || location.protocol === "https:") {
        try {
          const b64 = doc.output("datauristring").split(",")[1];
          const r = await fetch(location.origin + "/save-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: fname, data: b64, sub: opts.sub != null ? opts.sub : (EN ? "en" : "") })
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
      setBusyKind("");
    }
  };

  // 인쇄소용 — 페이지마다 10cm 정사각 카드 1장 (001_a~010_b, 10장)
  // 좌→우→좌→우 인터리브 순서 (자연스러운 책 페이지 순서). KR → pdf/card_pdf/, EN → pdf/card_pdf_en/
  const exportCardPDF = async (lang = "ko", opts = {}) => {
    const jspdfNS = window.jspdf || window.jsPDF;
    const JsPDF = jspdfNS && (jspdfNS.jsPDF || jspdfNS);
    if (!window.html2canvas || !JsPDF) { alert("PDF 라이브러리를 불러오지 못했습니다."); return; }
    if (busyKind) return;
    const EN = lang === "en";
    setBusyKind(EN ? "card-en" : "card");
    let usedEn = false;
    if (EN) {
      try {
        const en = await buildEnCompleted(printCompleted, (n, t) => setBusyKind("번역 " + n + "/" + t));
        setExportData(en); usedEn = true;
        await new Promise(r => setTimeout(r, 200));
      } catch (e) { console.warn("[card-en] 번역 실패:", e.message); }
      setBusyKind("card-en");
    }
    const po = document.querySelector(".print-only");
    if (!po) { if (usedEn) setExportData(null); setBusyKind(""); return; }

    const prevStyle = po.getAttribute("style") || "";
    const W = 1980, H = 1400;
    po.setAttribute("style",
      "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:#ffffff;z-index:-1;");
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
          scale: 2, useCORS: true, backgroundColor: "#ffffff"
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
            body: JSON.stringify({ filename: fname, data: b64, sub: opts.sub || (EN ? "card_pdf_en" : "card_pdf") })
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
      setBusyKind("");
    }
  };

  // 1권 최종 확정 — 본문 5스프레드가 모두 확정됐는지 검사 후 4 PDF (KR PDF · KR 카드 · EN PDF · EN 카드)를 pdf_4ea/ 폴더에 일괄 저장
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
    if (!confirm(`📘 ${bookNo}권 (${tnameKo}) 최종 확정\n\n4개의 PDF를 make_book/pdf_4ea/ 폴더에 저장합니다.\n  · 한글 PDF\n  · 한글 카드 PDF (좌→우 인터리브 10장)\n  · 영어 PDF\n  · 영어 카드 PDF (좌→우 인터리브 10장)\n\n계속하시겠습니까?`)) return;

    try {
      setBusyKind("finalize");
      // 1) KR 본문 PDF — 인쇄용 본문 페이지 디자인(좌 본문카드 / 우 일러스트 1:1 정사각 상단 가득), 자연 책 순서 5장
      await exportPDF("ko", {
        sub: "pdf_4ea",
        filename: `v${bk}_${tnameKo}_한글본문.pdf`,
        selector: ".print-book-only",
        childSelector: ".a4-page",
        silent: true
      });
      // 2) KR 카드 PDF (좌→우 인터리브 10장)
      await exportCardPDF("ko", {
        sub: "pdf_4ea",
        filename: `v${bk}_${tnameKo}_한글카드.pdf`,
        silent: true
      });
      // 3) EN 본문 PDF — 동일 디자인, 영어
      await exportPDF("en", {
        sub: "pdf_4ea",
        filename: `v${bk}_${tname}_EN_body.pdf`,
        selector: ".print-book-only",
        childSelector: ".a4-page",
        silent: true
      });
      // 4) EN 카드 PDF
      await exportCardPDF("en", {
        sub: "pdf_4ea",
        filename: `v${bk}_${tname}_EN_cards.pdf`,
        silent: true
      });
      alert(`✅ ${bookNo}권 최종 확정 완료\n\n4개의 PDF가 make_book/pdf_4ea/ 폴더에 저장되었습니다.\n  · v${bk}_${tnameKo}_한글본문.pdf\n  · v${bk}_${tnameKo}_한글카드.pdf\n  · v${bk}_${tname}_EN_body.pdf\n  · v${bk}_${tname}_EN_cards.pdf`);
    } catch (e) {
      console.error("[finalize] 실패:", e);
      alert("최종 확정 중 오류 발생: " + e.message);
    } finally {
      setBusyKind("");
    }
  };

  // A4 인쇄용 임포지션 매핑 — 총 8 A4 스프레드
  // 각 항목: { left: 페이지번호|특수키, right: 페이지번호|특수키 }
  // 특수키: "front-inner"(앞내지), "back-inner"(뒷내지), "oduni-photo"(오둥이 사진), null(공백)
  const A4_LAYOUT = [
    { left: null, right: "front-inner" },  // 1
    { left: null, right: "back-inner" },   // 2
    { left: "oduni-photo", right: "theme-mark" },  // 3
    { left: 1, right: 10 },                // 4: 001_a | 010_b
    { left: 9, right: 2 },                 // 5: 009_a | 002_b
    { left: 3, right: 8 },                 // 6: 003_a | 008_b
    { left: 7, right: 4 },                 // 7: 007_a | 004_b
    { left: 5, right: 6 },                 // 8: 005_a | 006_b
  ];

  // 자연 책 순서 — 본문 PDF용 (한글본·영문본 4ea에서 사용). 표지/내지/오둥이 제외, 본문 5스프레드만.
  // 임포지션 매핑 X, 1권 본문을 페이지 순서대로 (001_a/002_b → 003_a/004_b → … → 009_a/010_b)
  const A4_LAYOUT_BOOK = [
    { left: 1, right: 2 },
    { left: 3, right: 4 },
    { left: 5, right: 6 },
    { left: 7, right: 8 },
    { left: 9, right: 10 },
  ];

  // A4 인쇄용 PDF — 권별 폴더(pdf_인쇄용/{N}권/)에 임포지션 PDF 저장
  // 본문 페이지: A4 가로 297×210, 중앙 1.5cm 펀칭 여백, 좌·우 141mm 영역에 1:1 정사각 이미지 (141×141mm) 상단 고정
  const exportPrintPDF = async () => {
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
    if (!confirm(`🖨 ${bookNo}권 (${printTname}) A4 인쇄용 PDF\n\n8장의 A4 가로 임포지션 PDF 2개(한글본·영문본)를\nmake_book/pdf_인쇄용/${bookNo}권/ 폴더에 저장합니다.\n\n  · 1번: 앞내지 (테마 + 카테고리 목차)\n  · 2번: 뒷내지 (명언·구절)\n  · 3번: 오둥이 사진 + 테마 마크\n  · 4~8번: 본문 임포지션 (001_a~010_b)\n\n영문본은 로컬 Ollama 번역(qwen2.5:14b)을 사용합니다. 시간이 좀 걸릴 수 있습니다.\n\n계속하시겠습니까?`)) return;

    setBusyKind("print");
    const po = document.querySelector(".print-impose-only");
    if (!po) { alert("임포지션 레이아웃 DOM이 없습니다."); setBusyKind(""); return; }
    const prevStyle = po.getAttribute("style") || "";
    // A4 가로 297×210mm → 1980×1400 픽셀 (비율 동일, 1mm ≈ 6.66px)
    const W = 1980, H = 1400;
    po.setAttribute("style", "display:block;position:fixed;left:-99999px;top:0;width:" + W + "px;background:#ffffff;z-index:-1;");
    const pages = Array.from(po.querySelectorAll(".a4-page"));
    const prevPageStyles = pages.map(el => el.getAttribute("style") || "");
    pages.forEach(el => el.setAttribute("style", "width:" + W + "px;height:" + H + "px;overflow:hidden;"));

    // 8장 캡처해서 한 PDF로 만드는 헬퍼
    const capturePagesToPdf = async () => {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      await new Promise(r => setTimeout(r, 250));
      const doc = new JsPDF({ orientation: "landscape", unit: "px", format: [W, H] });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await window.html2canvas(pages[i], {
          scale: 2, useCORS: true, backgroundColor: "#ffffff",
          width: W, height: H, windowWidth: W, windowHeight: H
        });
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
            body: JSON.stringify({ filename: fname, data: b64, printVol: bookNo })
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
      const fnameKo = `${volPad}권_인쇄용_${tnameKo}_한글_${stamp}.pdf`;
      const resKo = await savePdf(docKo, fnameKo);

      // 2) 영문본 — 본문 텍스트·카테고리를 로컬 Ollama로 번역 후 캡처
      setBusyKind("print-en-번역");
      const enCompleted = await buildEnCompleted(completed, (n, t) => setBusyKind("print-en-번역 " + n + "/" + t));
      setExportData(enCompleted); // A4Side 호출부에서 lang="en"으로 전환
      setBusyKind("print-en");
      await new Promise(r => setTimeout(r, 300)); // 영문 데이터로 재렌더 대기
      const docEn = await capturePagesToPdf();
      const fnameEn = `${volPad}권_인쇄용_${tname}_EN_${stamp}.pdf`;
      const resEn = await savePdf(docEn, fnameEn);

      alert(`✅ ${bookNo}권 A4 인쇄용 PDF 2개 저장 완료\n\n` +
        `· 한글본: ${resKo.ok ? resKo.path : fnameKo + " (다운로드)"}\n` +
        `· 영문본: ${resEn.ok ? resEn.path : fnameEn + " (다운로드)"}\n` +
        `\n폴더: make_book/pdf_인쇄용/${bookNo}권/`);
    } catch (e) {
      console.error("[print-pdf] 생성 실패:", e);
      alert("인쇄용 PDF 생성 중 오류 발생: " + e.message);
    } finally {
      setExportData(null);
      po.setAttribute("style", prevStyle);
      pages.forEach((el, i) => el.setAttribute("style", prevPageStyles[i]));
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
  }, [currentIdx, saved?.body]);

  const onSaveEdit = () => {
    if (!saved) return;
    const next = { ...saved, body: editBuf };
    setCompleted({
      ...completed,
      [sp.index]: next
    });
    const now = new Date();
    setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setDirty(false);

    // 디스크 페이지 파일(.txt)도 갱신 — 서버로 열렸고 권 정보가 있을 때
    if ((location.protocol === "http:" || location.protocol === "https:") && next.book) {
      const aId = String(sp.leftPage).padStart(3, "0") + "_a";
      fetch(location.origin + "/save-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: String(next.book).padStart(2, "0") + "권",
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
    if (!saved) return;
    const body = dirty ? editBuf : (saved.body || "");
    const now = new Date();
    const stamp = now.toLocaleString("ko-KR");
    const next = { ...saved, body, confirmed: true, confirmedAt: stamp };
    setCompleted({ ...completed, [sp.index]: next });
    setDirty(false);
    setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " · 확정");

    // 확정 직후 — 이미지/4컷 프롬프트 페이지 자동저장 키 비우기
    // (다음 스프레드 작업 시 직전 텍스트·선택 옵션이 남아있지 않도록 빈 상태로 리셋)
    if (window.ArtbookStore) {
      window.ArtbookStore.set("prompt_draft_image", {});
      window.ArtbookStore.set("prompt_draft_comic", {});
    }

    if ((location.protocol === "http:" || location.protocol === "https:") && sp.leftMeta.section === "body") {
      const pad = n => String(n).padStart(3, "0");
      const splitDU = (u) => {
        if (!u || u.indexOf(",") < 0) return null;
        const m = /data:image\/(\w+)/.exec(u);
        return { ext: m ? m[1].replace("jpeg", "jpg") : "jpg", b64: u.split(",")[1] };
      };
      const aId = pad(sp.leftPage) + "_a", bId = pad(sp.rightPage) + "_b";
      const aImg = splitDU(next.comicImg), bImg = splitDU(next.illustImg);
      const vs = now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0")
        + "_" + String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0") + String(now.getSeconds()).padStart(2, "0");
      fetch(location.origin + "/save-page", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: String(next.book || 1).padStart(2, "0") + "권",
          pages: [
            { id: aId, files: [
              { name: aId + ".txt", text: body },
              ...(aImg ? [{ name: aId + "." + aImg.ext, b64: aImg.b64 }] : []),
              { sub: "versions", name: aId + "_" + vs + ".txt", text: body },
              ...(aImg ? [{ sub: "versions", name: aId + "_" + vs + "." + aImg.ext, b64: aImg.b64 }] : [])
            ]},
            { id: bId, files: [
              ...(bImg ? [{ name: bId + "." + bImg.ext, b64: bImg.b64 }] : []),
              ...(bImg ? [{ sub: "versions", name: bId + "_" + vs + "." + bImg.ext, b64: bImg.b64 }] : []),
              { sub: "versions", name: bId + "_" + vs + ".txt", text: body }
            ]}
          ]
        })
      }).then(r => r.json()).then(j => {
        if (j && j.ok) setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " · 확정·폴더 저장");
      }).catch(e => console.warn("[confirm] 디스크 확정 실패:", e.message));
    }
  };

  const isBodySpread = sp.leftMeta.section === "body" && saved;

  // 미리보기를 PDF와 동일한 1980×1400으로 렌더 → 화면 폭에 맞춰 축소(픽셀 단위 동일)
  const stageRef = useRefBV();
  const [pvScale, setPvScale] = useStateBV(0.4);
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const calc = () => {
      const w = el.clientWidth - 24;
      setPvScale(Math.min(1, Math.max(0.18, w / 1980)));
    };
    calc();
    let ro;
    if (window.ResizeObserver) { ro = new ResizeObserver(calc); ro.observe(el); }
    window.addEventListener("resize", calc);
    return () => { ro && ro.disconnect(); window.removeEventListener("resize", calc); };
  }, []);

  // 인쇄(PDF)는 completed 기반 → 저장 안 한 현재 편집(editBuf)도 즉시 반영
  const printCompleted = (dirty && saved)
    ? { ...completed, [sp.index]: { ...saved, body: editBuf } }
    : completed;

  return (
    <div className="preview-stage" ref={stageRef}>
      <div className="pv-scaler" style={{ height: (1400 * pvScale) + "px" }}>
      <div className="book-spread pv-fixed" style={{ width: 1980, height: 1400, transform: "translateX(-50%) scale(" + pvScale + ")" }}>
        <PreviewPage
          page={sp.leftPage}
          meta={sp.leftMeta}
          topic={topic}
          coverImg={coverImg}
          backImg={backImg}
          data={saved}
          comicSide={comicSide}
          side="left"
          editBuf={editBuf}
          setEditBuf={(v) => { setEditBuf(v); setDirty(true); }}
          editable={isBodySpread}
          onExpandEdit={() => setExpandOpen(true)}
        />
        <SpineDeep />
        <PreviewPage
          page={sp.rightPage}
          meta={sp.rightMeta}
          topic={topic}
          coverImg={coverImg}
          backImg={backImg}
          data={saved}
          comicSide={comicSide}
          side="right"
          editBuf={editBuf}
          setEditBuf={(v) => { setEditBuf(v); setDirty(true); }}
          editable={isBodySpread}
          onExpandEdit={() => setExpandOpen(true)}
        />
      </div>
      </div>

      <div className="preview-nav">
        <button
          className="nav-arrow"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
        >‹</button>
        <span className="pages">
          {sp.leftMeta.section === "body"
            ? `${String(sp.leftPage).padStart(3, "0")}_a – ${String(sp.rightPage).padStart(3, "0")}_b / 010`
            : "표지 스프레드"}
        </span>
        <button
          className="nav-arrow"
          disabled={currentIdx === total - 1}
          onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
        >›</button>
        <div className="nav-spacer"></div>
        {/* 한글판 */}
        <button
          className="btn pdf-btn"
          onClick={() => exportPDF("ko")}
          disabled={!!busyKind}
          title="한글판 전 스프레드 PDF (pdf 폴더)"
        >
          {busyKind === "pdf" ? "PDF 생성 중…" : "▤ PDF 저장"}
        </button>
        <button
          className="btn pdf-btn"
          onClick={() => exportCardPDF("ko")}
          disabled={!!busyKind}
          title="한글판 10cm 카드 10장 (좌→우 인터리브, 001_a~010_b) — 인쇄소용 (pdf/card_pdf/)"
        >
          {busyKind === "card" ? "카드 생성 중…" : "▣ PDF카드"}
        </button>

        <div className="nav-spacer"></div>
        {/* 영문판 (로컬 번역) */}
        <button
          className="btn pdf-btn"
          style={{ background: "#2f3a4d" }}
          onClick={() => exportPDF("en")}
          disabled={!!busyKind}
          title="영문판 PDF — 로컬 번역(한→영) · pdf/en/ 저장 · 글로벌"
        >
          {busyKind === "pdf-en" ? "EN 생성 중…"
            : (busyKind.startsWith && busyKind.startsWith("번역") ? busyKind : "🌐 EN PDF")}
        </button>
        <button
          className="btn pdf-btn"
          style={{ background: "#2f3a4d" }}
          onClick={() => exportCardPDF("en")}
          disabled={!!busyKind}
          title="영문판 카드 10장 (좌→우 인터리브) — 로컬 번역(한→영) · pdf/card_pdf_en/ 저장"
        >
          {busyKind === "card-en" ? "EN 카드 중…"
            : (busyKind.startsWith && busyKind.startsWith("번역") ? busyKind : "🌐 EN 카드")}
        </button>

        <div className="nav-spacer"></div>
        {/* 1권 최종 확정 — 4 PDF 일괄 생성 → pdf_4ea/ */}
        <button
          className="btn pdf-btn"
          style={{ background: "#2f5d3a", color: "#f6ecd6", fontWeight: 600 }}
          onClick={finalizeBook}
          disabled={!!busyKind}
          title={`${bookNo || 1}권 최종 확정 — 4 PDF 일괄 생성 (KR 본문/카드 + EN 본문/카드) → make_book/pdf_4ea/`}
        >
          {busyKind === "finalize" ? "📘 최종 확정 중…" : `📘 ${bookNo || 1}권 최종 확정`}
        </button>

        {/* 오둥이 사진 첨부 — 3번 A4 스프레드용 */}
        <label
          className="btn pdf-btn"
          style={{ background: oduniImg ? "#3a2f5d" : "#5d3a2f", color: "#f6ecd6", cursor: "pointer" }}
          title="A4 인쇄용 PDF의 3번 스프레드에 들어갈 오둥이 사진 (권별)"
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

        {/* A4 인쇄용 PDF — 권별 폴더 자동 생성 */}
        <button
          className="btn pdf-btn"
          style={{ background: "#a83232", color: "#f6ecd6", fontWeight: 600 }}
          onClick={exportPrintPDF}
          disabled={!!busyKind}
          title={`${bookNo || 1}권 A4 인쇄용 PDF (8장 임포지션) → make_book/pdf_인쇄용/${bookNo || 1}권/`}
        >
          {busyKind === "print-kr" ? "🖨 한글본 생성 중…"
           : busyKind === "print-en" ? "🖨 영문본 생성 중…"
           : (busyKind && busyKind.startsWith && busyKind.startsWith("print-en-번역"))
              ? ("🖨 영문 " + busyKind.replace("print-en-", ""))
              : `🖨 ${bookNo || 1}권 인쇄용 PDF`}
        </button>
      </div>

      {/* 인쇄 전용: 60p 전체 스프레드 */}
      <div className="print-only">
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
      </div>

      {/* A4 인쇄용 임포지션 — 8 A4 가로 페이지, 중앙 1.5cm 펀칭, 좌·우 141mm × 210mm */}
      <div className="print-impose-only">
        {A4_LAYOUT.map((layout, i) => (
          <div key={"a4-" + i} className="a4-page" style={{
            display: "flex", flexDirection: "row", background: "#ffffff",
            position: "relative", overflow: "hidden"
          }}>
            <A4Side slot={layout.left} side="left" T={T} topic={topic}
                    completed={exportData || completed} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} />
            {/* 중심 재단선 — 옅은 회색 점선 1줄 (CSS .a4-punch::before) */}
            <div className="a4-punch"></div>
            <A4Side slot={layout.right} side="right" T={T} topic={topic}
                    completed={exportData || completed} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} />
          </div>
        ))}
      </div>

      {/* 1권 최종 확정용 본문 PDF — 자연 책 순서(임포지션 X), A4 본문 페이지 디자인(좌 본문카드 + 우 일러스트) */}
      <div className="print-book-only">
        {A4_LAYOUT_BOOK.map((layout, i) => (
          <div key={"book-" + i} className="a4-page">
            <A4Side slot={layout.left} side="left" T={T} topic={topic}
                    completed={exportData || completed} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} />
            <div className="a4-punch"></div>
            <A4Side slot={layout.right} side="right" T={T} topic={topic}
                    completed={exportData || completed} oduniImg={oduniImg}
                    lang={exportData ? "en" : "ko"} />
          </div>
        ))}
      </div>

      {isBodySpread && (
        <div className="preview-edit-bar">
          <div className="edit-status">
            {dirty
              ? <span style={{color: "#a83232"}}>● 텍스트가 수정되었습니다 — 저장 또는 확정하세요</span>
              : (saved && saved.confirmed
                  ? <span style={{color: "#2f5d3a"}}>✓ 확정됨 · {saved.confirmedAt}</span>
                  : (lastSaved ? <span>✓ 저장됨 · {lastSaved}</span>
                      : <span style={{color: "var(--ink-soft)"}}>미리보기 확인 후 ‘확정’을 누르세요</span>))
            }
          </div>
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
            style={{fontSize: 10, background: "#2f5d3a", borderColor: "#2f5d3a" }}
            title="이 스프레드 1개를 확정 — 본문+이미지 묶음을 디스크에 확정 저장(versions 스냅샷)"
          >
            {saved && saved.confirmed && !dirty ? "✓ 확정됨 · 재확정" : "✓ 확정"}
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
                <div className="expand-title">확대 편집 · 스프레드 #{sp.index + 1}</div>
                <div className="expand-sub">pp.{sp.leftPage}–{sp.rightPage} · 수정 후 저장하면 책에 반영됩니다</div>
              </div>
              <button className="expand-x" onClick={() => setExpandOpen(false)}>✕</button>
            </div>
            <textarea
              className="expand-textarea"
              value={editBuf}
              onChange={(e) => { setEditBuf(e.target.value); setDirty(true); }}
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
    // 카드 title-quote = 사장님이 선택한 quote(있으면 우선) / 없으면 본문 첫 줄
    const cardTitle = (data?.quote && data.quote.trim()) || titleLine || "";
    // 카드 본문에 표시할 텍스트 — 첫 줄이 quote와 같으면 제거(중복 방지), 아니면 본문 전체 유지
    const firstIsQuote = data?.quote && titleLine && titleLine.trim() === data.quote.trim();
    const bodyForCard = firstIsQuote
      ? lines0.slice(fIdx + 1).join("\n").replace(/\s+$/, "")
      : source.replace(/\s+$/, "");

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
                      <span className="title-quote">“{cardTitle || `사유 #${meta.workIdx}`}”</span>
                    </div>
                    {editable ? (
                      <AutoFitTextarea
                        value={fIdx >= 0 ? lines0.slice(fIdx + 1).join("\n") : ""}
                        onChange={(v) => setEditBuf((titleLine ? titleLine + "\n" : "") + v)}
                        onExpand={onExpandEdit}
                      />
                    ) : (
                      <AutoFitBody text={bodyForCard} />
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
// 슬롯 타입: null(공백) / "front-inner"(앞내지) / "back-inner"(뒷내지) / "oduni-photo"(오둥이) / 페이지번호(본문)
// 본문 페이지: 상단 1:1 정사각 이미지(141×141mm), 아래 69mm 필기 여백
// ─────────────────────────────────────────────────────────────────────────
function A4Side({ slot, side, T, topic, completed, oduniImg, lang }) {
  const isEn = lang === "en";
  // 영어 모드일 때 d.topicLabel / d.catLabel은 buildEnCompleted가 미리 채워둠
  const baseStyle = {
    width: "calc(141 / 297 * 100%)",
    height: "100%",
    background: "#ffffff",
    position: "relative",
    boxSizing: "border-box"
  };

  // 공백
  if (slot === null || slot === undefined) {
    return <div className={"a4-side a4-blank a4-" + side} style={baseStyle}></div>;
  }

  // 앞내지 — 테마(10px) + 고딕 ⚜ 장식 + 카테고리 목차
  if (slot === "front-inner") {
    return (
      <div className={"a4-side a4-front-inner a4-" + side} style={{
        ...baseStyle,
        padding: "10% 8%",
        display: "flex", flexDirection: "column"
      }}>
        <div style={{
          textAlign: "center", marginBottom: "8%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "1em"
        }}>
          <span style={{ fontSize: "32px", color: "var(--topic-accent, #8b7355)" }}>⚜</span>
          <span style={{
            fontSize: "30px", letterSpacing: "0.5em",
            color: "var(--ink, #2b1d13)", textTransform: "uppercase",
            fontFamily: "var(--font-serif, serif)"
          }}>
            {isEn ? (T ? T.name : "") : ((T ? T.nameKo : "") + " · " + (T ? T.name : ""))}
          </span>
          <span style={{ fontSize: "32px", color: "var(--topic-accent, #8b7355)" }}>⚜</span>
        </div>
        <div style={{
          height: 1, background: "rgba(74,36,21,0.25)", margin: "0 auto 6%", width: "60%"
        }}></div>
        <div style={{
          fontSize: "14px", color: "var(--ink-soft, #6b5440)",
          letterSpacing: "0.2em", textAlign: "center", marginBottom: "5%"
        }}>{isEn ? "CONTENTS" : "목 차"}</div>
        <div style={{
          display: "flex", flexDirection: "column", gap: "14px",
          fontFamily: "var(--font-serif, serif)", fontSize: "20px",
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
                <span style={{ fontWeight: 600 }}>{isEn ? (d.catLabel || d.category || "—") : (d.category || "—")}</span>
              </div>
            );
          })}
        </div>
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
          display: "flex", flexDirection: "column", gap: "20px",
          fontFamily: "var(--font-serif, serif)", fontSize: "16px",
          color: "var(--ink, #2b1d13)", lineHeight: 1.55
        }}>
          {[1, 2, 3, 4, 5].map(i => {
            const d = completed[i] || {};
            const firstLine = (d.body || "").split("\n").find(l => l.trim()) || "";
            const q = d.quote || firstLine || "—";
            const pa = String((i - 1) * 2 + 1).padStart(3, "0");
            return (
              <div key={i}>
                <div style={{
                  fontSize: "11px", letterSpacing: "0.15em",
                  color: "var(--ink-muted, #8a7560)", marginBottom: "4px"
                }}>{pa} · {isEn ? (d.catLabel || d.category || "") : (d.category || "")}</div>
                <div style={{ fontStyle: "italic" }}>"{q}"</div>
              </div>
            );
          })}
        </div>
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
            {isEn ? (T ? T.name : "") : ((T ? T.nameKo : "") + " · " + (T ? T.name : ""))}
          </span>
          <span style={{
            fontSize: "32px",
            color: "var(--topic-accent, #8b7355)",
            lineHeight: 1
          }}>⚜</span>
        </div>
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

    // 카드 title = 사장님이 선택한 quote(있으면 우선) / 없으면 본문 첫 줄
    const source = d.body || "";
    const lines0 = source.split("\n");
    const fIdx = lines0.findIndex(l => l.trim().length > 0);
    const titleLine = fIdx >= 0 ? lines0[fIdx] : "";
    const cardTitle = (d.quote && d.quote.trim()) || titleLine || `사유 #${workIdx}`;
    // 첫 줄이 quote와 같으면 제거(중복 방지), 아니면 본문 전체 유지
    const firstIsQuote = d.quote && titleLine && titleLine.trim() === d.quote.trim();
    const bodyText = firstIsQuote
      ? lines0.slice(fIdx + 1).join("\n").replace(/\s+$/, "")
      : source.replace(/\s+$/, "");

    return (
      <div className={"a4-side a4-body a4-" + side} style={{
        ...baseStyle,
        display: "flex", flexDirection: "column",
        padding: 0
      }}>
        {/* 상단 1:1 정사각 영역 (141×141mm = 영역 폭만큼) */}
        <div style={{
          width: "100%",
          aspectRatio: "1 / 1",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0
        }}>
          {isAside ? (
            // _a 페이지 — 본문 카드 (기존 .card-slot 디자인 그대로)
            <div className="card-slot" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%"
            }}>
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <span className="corner bl"></span>
              <span className="corner br"></span>
              <div className="card-inner">
                <div className="card-cat">
                  <span className="orn">⚜</span>
                  <span className="cc-topic">{isEn ? (d.topicLabel || (T ? T.name : "")) : (T ? T.nameKo : "")}</span>
                  {(d.catLabel || d.category) && <span className="cc-cat">· {isEn ? (d.catLabel || d.category) : d.category}</span>}
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
                    <div className="text-title book-title-strong">
                      <span className="title-quote">"{cardTitle}"</span>
                    </div>
                    <AutoFitBody text={bodyText} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // _b 페이지 — 일러스트 이미지 1장 (1:1 가득)
            d.illustImg ? (
              <img src={d.illustImg} alt=""
                   style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
        {/* 하단 필기 여백 (69mm) — 페이지 번호는 영역 중앙 하단에 - NNN - 형식 */}
        <div style={{
          flex: 1,
          position: "relative",
          background: "#ffffff"
        }}>
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: 0, right: 0,
            textAlign: "center",
            fontSize: "13px",
            color: "rgba(74,36,21,0.55)",
            letterSpacing: "0.3em",
            fontFamily: "var(--font-serif, serif)"
          }}>– {slot} –</div>
        </div>
      </div>
    );
  }

  return <div className={"a4-side a4-" + side} style={baseStyle}></div>;
}

Object.assign(window, { BookGrid, BookPreview, A4Side });
