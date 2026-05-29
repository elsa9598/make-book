/* pdf-viewer.jsx — 생성된 PDF 및 이미지 뷰어 대시보드 */
const { useState: useStatePdf, useEffect: useEffectPdf, useMemo: useMemoPdf } = React;

window.PdfViewer = function PdfViewer({ currentTopic, onChangeTopic }) {
  const [activeTab, setActiveTab] = useStatePdf(currentTopic || "talmud");
  const [selectedBook, setSelectedBook] = useStatePdf(null);
  const [files, setFiles] = useStatePdf([]);
  const [loading, setLoading] = useStatePdf(false);
  const [bookStats, setBookStats] = useStatePdf({});

  const T = window.TOPICS[activeTab];

  useEffectPdf(() => {
    fetch(`/api/book-stats?topic=${encodeURIComponent(T?.nameKo || activeTab)}`)
      .then(r => r.json())
      .then(d => setBookStats(d.stats || {}))
      .catch(e => {
        console.error("Failed to fetch book stats", e);
        setBookStats({});
      });
  }, [activeTab]);

  useEffectPdf(() => {
    if (selectedBook) {
      setLoading(true);
      const bName = String(selectedBook).padStart(3, "0") + "권";
      fetch(`/api/book-files?topic=${encodeURIComponent(T?.nameKo || activeTab)}&book=${encodeURIComponent(bName)}`)
        .then(r => r.json())
        .then(d => {
          setFiles(d.files || []);
          setLoading(false);
        })
        .catch(e => {
          console.error("Failed to fetch files", e);
          setFiles([]);
          setLoading(false);
        });
    } else {
      setFiles([]);
    }
  }, [activeTab, selectedBook]);

  // 분류 로직 (파일 이름을 보고 매칭)
  const fileMap = useMemoPdf(() => {
    const map = {};
    files.forEach(f => {
      const lower = f.toLowerCase();
      const isEn = lower.includes("_en") || lower.includes("en_");
      
      if (lower.includes("16p")) {
        if (isEn) map.enPdf = f;
        else map.koPdf = f;
      } else if (lower.includes("카드") || lower.includes("card")) {
        if (isEn) map.enCard = f;
        else map.koCard = f;
      } else if (lower.includes("출력용") || lower.includes("인쇄")) {
        if (isEn) map.enPrint = f;
        else map.koPrint = f;
      } else if ((lower.includes("스프레드") || lower.includes("spread")) && lower.endsWith(".png")) {
        if (isEn) map.enSpread = f;
        else map.koSpread = f;
      }
    });
    return map;
  }, [files]);

  const openFile = (filename) => {
    if (!filename) return;
    const tName = window.TOPICS[activeTab]?.nameKo || activeTab;
    const bName = String(selectedBook).padStart(3, "0") + "권";
    const url = `/pages/${encodeURIComponent(tName)}/${encodeURIComponent(bName)}/pdf/${encodeURIComponent(filename)}`;
    window.open(url, "_blank");
  };

  const renderFileButton = (key, label) => {
    const filename = fileMap[key];
    const isAvail = !!filename;
    return (
      <button 
        key={key}
        className={"btn " + (isAvail ? "pdf-btn" : "ghost")}
        onClick={() => openFile(filename)}
        disabled={!isAvail}
        style={{
          background: isAvail ? "#4f4536" : "#e0d5c1",
          color: isAvail ? "#f6ecd6" : "#a89f8c",
          opacity: isAvail ? 1 : 0.6,
          padding: "10px",
          width: "100%",
          marginBottom: 8,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: 10 }}>{isAvail ? "열기 ↗" : "(미생성)"}</span>
      </button>
    );
  };

  return (
    <div className="pdf-viewer" style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", height: "100%" }}>
      <h2 style={{ fontFamily: "var(--font-display)", color: "var(--ink)", margin: "20px 0" }}>철학종별 생성된 PDF 및 이미지 보기</h2>
      
      <div className="tabs" style={{ marginBottom: 20, flexShrink: 0, justifyContent: "flex-start", gap: 10 }}>
        {Object.keys(window.TOPICS).map(k => (
          <button 
            key={k} 
            className={"tab" + (activeTab === k ? " active" : "")} 
            onClick={() => { setActiveTab(k); setSelectedBook(null); onChangeTopic && onChangeTopic(k); }}
            style={{ 
              minWidth: 120,
              ...(activeTab === k ? { background: "#a83232", color: "#ffffff", borderColor: "#8c2525" } : {})
            }}
          >
            {window.TOPICS[k].nameKo}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--rule)", background: "var(--paper-page)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", background: "#eee4ce" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>
              {T.nameKo} - 총 {window.QuoteLedger.SERIES_BOOKS}권
            </h3>
          </div>
          <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8 }}>
              {Array.from({ length: window.QuoteLedger.SERIES_BOOKS }, (_, i) => i + 1).map(b => {
                const isComplete = bookStats[b] >= 8;
                return (
                <button 
                  key={b}
                  onClick={() => setSelectedBook(b)}
                  style={{
                    padding: "8px 4px",
                    background: selectedBook === b ? (isComplete ? "#27633b" : "#2a221a") : (isComplete ? "#e8f2ec" : "#fffbfa"),
                    color: selectedBook === b ? "#ffffff" : (isComplete ? "#27633b" : "#2a221a"),
                    border: isComplete ? "1px solid #27633b" : "1px solid #c7b48c",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    transition: "all 0.1s"
                  }}
                >
                  {b}권
                </button>
              )})}
            </div>
          </div>
        </div>

        <div style={{ width: 320, border: "1px solid var(--rule)", background: "var(--paper-page)", borderRadius: 6, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", background: "#eee4ce" }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>
              {selectedBook ? `${T.nameKo} ${selectedBook}권 파일목록` : "권수를 선택하세요"}
            </h3>
          </div>
          <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
            {!selectedBook ? (
              <div style={{ color: "var(--ink-muted)", textAlign: "center", marginTop: 40, fontSize: 13 }}>
                왼쪽에서 조회할 권을 클릭해주세요.
              </div>
            ) : loading ? (
              <div style={{ color: "var(--ink-muted)", textAlign: "center", marginTop: 40, fontSize: 13 }}>
                파일을 확인 중입니다...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {renderFileButton("koPdf", "한글 PDF")}
                {renderFileButton("enPdf", "영어 PDF")}
                <div style={{ height: 10 }}></div>
                {renderFileButton("koCard", "한글 카드")}
                {renderFileButton("enCard", "영어 카드")}
                <div style={{ height: 10 }}></div>
                {renderFileButton("koPrint", "한글 인쇄")}
                {renderFileButton("enPrint", "영어 인쇄")}
                <div style={{ height: 10 }}></div>
                {renderFileButton("koSpread", "한글 스프레드")}
                {renderFileButton("enSpread", "영어 스프레드")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
