/* recovery.jsx — 자동저장(IndexedDB) 복구 패널
   workspace(최신 전체) + page_backups(페이지별 20버전) + spread_backups(구버전) 에서
   작업물을 꺼내 미리보고 completed 로 되살린다. 구조 변경 전 인덱스도 파일명으로 재매핑.
*/
const { useState: useStateRC, useEffect: useEffectRC } = React;

// 파일명(009_a) → 새 구조의 스프레드 인덱스 (본문 i: leftPage=(i-1)*2+1)
function fileToSpreadIdx(file) {
  const m = /(\d{1,3})_([ab])/.exec(file || "");
  if (!m) return null;
  const pg = parseInt(m[1], 10);
  const i = Math.floor((pg - 1) / 2) + 1; // 1..24
  return (i >= 1 && i <= 24) ? i : null;
}

function RecoveryPanel({ completed, setCompleted, setToast }) {
  const [ws, setWs] = useStateRC(null);
  const [pageBk, setPageBk] = useStateRC({});
  const [legacy, setLegacy] = useStateRC({});
  const [loading, setLoading] = useStateRC(true);

  const reload = async () => {
    setLoading(true);
    if (!window.ArtbookStore) { setLoading(false); return; }
    const a = await window.ArtbookStore.get("workspace");
    const b = await window.ArtbookStore.get("page_backups");
    const c = await window.ArtbookStore.get("spread_backups");
    setWs(a || null);
    setPageBk(b || {});
    setLegacy(c || {});
    setLoading(false);
  };
  useEffectRC(() => { reload(); }, []);

  const restoreWorkspace = () => {
    if (!ws || !ws.completed) return;
    if (!window.confirm("자동저장된 전체 작업물을 현재 화면으로 되살립니다. 계속할까요?")) return;
    setCompleted(ws.completed);
    if (ws.coverImg && window.__setCover) window.__setCover(ws.coverImg);
    const firstKey = Object.keys(ws.completed)[0];
    if (firstKey != null && window.restoreToWorkshop) {
      window.restoreToWorkshop(parseInt(firstKey, 10), ws.completed[firstKey]);
    } else if (window.gotoTab) {
      window.gotoTab("workshop");
    }
    setToast && setToast({ kind: "ok", text: "✓ 자동저장 전체 복원됨 — 작업실에서 확인하세요" });
    setTimeout(() => setToast && setToast(null), 4000);
  };

  // 페이지 백업 1건을 해당 스프레드로 복원 → 작업실에 카테고리·명언·본문 표시
  const restorePage = (file, entry) => {
    const idx = fileToSpreadIdx(file);
    if (idx == null) { alert("이 파일명은 본문 스프레드로 매핑할 수 없습니다: " + file); return; }
    const d = entry.data || {};
    const data = {};
    if (file.endsWith("_a")) {
      if (d.body != null) data.body = d.body;
      if (d.comicImg) data.comicImg = d.comicImg;
      if (d.comicFile) data.comicFile = d.comicFile;
    } else {
      if (d.illustImg) data.illustImg = d.illustImg;
      if (d.illustFile) data.illustFile = d.illustFile;
    }
    ["topic", "category", "quote", "book"].forEach(k => { if (d[k] != null) data[k] = d[k]; });
    if (window.restoreToWorkshop) {
      window.restoreToWorkshop(idx, data);
    } else {
      setCompleted(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), ...data } }));
    }
    setToast && setToast({ kind: "ok", text: `✓ ${file} → 본문#${String(idx).padStart(2,"0")} 복원 — 작업실에서 확인하세요` });
    setTimeout(() => setToast && setToast(null), 3500);
  };

  const wsCount = ws && ws.completed ? Object.keys(ws.completed).length : 0;
  const pageFiles = Object.keys(pageBk).sort();
  const legacyKeys = Object.keys(legacy);

  return (
    <div className="usage-view">
      <div className="usage-top">
        <div>
          <div className="usage-h">작업물 복구</div>
          <div className="usage-sub">
            브라우저 자동저장(IndexedDB)에서 복원합니다. AI 생성·저장·MAKE한 내용은 여기 남아 있습니다.
          </div>
        </div>
        <div className="usage-actions">
          <button className="btn ghost" onClick={reload}>새로고침</button>
        </div>
      </div>

      {loading ? (
        <div className="hint" style={{ padding: 30 }}>불러오는 중…</div>
      ) : (
        <>
          <div className="usage-book-card" style={{ marginBottom: 14 }}>
            <div className="ubc-head">
              <span className="ubc-no">최신 자동저장 (workspace)</span>
              <span className="ubc-cnt">{wsCount}개 스프레드 · {ws && ws.savedAt ? ws.savedAt : "기록 없음"}</span>
              <span className="ubc-spacer"></span>
              {wsCount > 0 && (
                <button className="btn primary" style={{ fontSize: 11 }} onClick={restoreWorkspace}>전체 복원</button>
              )}
            </div>
            {wsCount === 0
              ? <div className="ubc-empty">자동저장된 전체 스냅샷이 없습니다. 아래 페이지별 백업을 확인하세요.</div>
              : (
                <ul className="ubc-list">
                  {Object.keys(ws.completed).map(k => {
                    const d = ws.completed[k] || {};
                    const first = (d.body || "").split("\n").find(l => l.trim()) || "(본문 없음)";
                    return (
                      <li key={k}>
                        <span className="ubc-pos">#{k}</span>
                        <span className="ubc-cat">{d.category || "—"}</span>
                        <span className="ubc-q">{first.slice(0, 40)}{d.comicImg ? " 🖼4컷" : ""}{d.illustImg ? " 🖼상징" : ""}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>

          <div className="usage-h" style={{ fontSize: 18, margin: "10px 0 8px" }}>페이지별 백업 ({pageFiles.length}개 파일)</div>
          {pageFiles.length === 0 && <div className="ubc-empty">페이지별 백업이 없습니다.</div>}
          <div className="usage-books">
            {pageFiles.map(file => {
              const arr = pageBk[file] || [];
              const idx = fileToSpreadIdx(file);
              return (
                <div key={file} className="usage-book-card">
                  <div className="ubc-head">
                    <span className="ubc-no">{file}</span>
                    <span className="ubc-cnt">{arr.length}버전 {idx ? `→ 본문#${String(idx).padStart(2,"0")}` : ""}</span>
                  </div>
                  <ul className="ubc-list">
                    {arr.map((e, i) => {
                      const d = e.data || {};
                      const first = (d.body || "").split("\n").find(l => l.trim()) || (d.illustImg ? "(상징 이미지)" : "(내용)");
                      return (
                        <li key={i}>
                          <span className="ubc-pos">{e.at ? String(e.at).slice(5, 16) : "v" + (arr.length - i)}</span>
                          <span className="ubc-q">{first.slice(0, 30)}{d.comicImg ? " 🖼" : ""}{d.illustImg ? " 🖼" : ""}</span>
                          <button className="ubc-x" style={{ width: "auto", padding: "1px 7px" }}
                            onClick={() => restorePage(file, e)} title="이 버전으로 복원">복원</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {legacyKeys.length > 0 && (
            <>
              <div className="usage-h" style={{ fontSize: 18, margin: "16px 0 8px" }}>구버전 백업 (spread_backups)</div>
              <div className="hint" style={{ marginBottom: 8 }}>
                구조 변경 전 백업입니다. 항목을 펼쳐 본문 텍스트를 직접 복사해 사용하세요.
              </div>
              <div className="usage-books">
                {legacyKeys.map(k => {
                  const arr = legacy[k] || [];
                  return (
                    <div key={k} className="usage-book-card">
                      <div className="ubc-head"><span className="ubc-no">스프레드 {k}</span><span className="ubc-cnt">{arr.length}버전</span></div>
                      <ul className="ubc-list">
                        {arr.slice(0, 8).map((e, i) => {
                          const t = (e.data && e.data.body) || "";
                          return (
                            <li key={i}>
                              <span className="ubc-pos">{e.at ? String(e.at).slice(5, 16) : i}</span>
                              <span className="ubc-q" title={t}>{t.replace(/\n/g, " ").slice(0, 50) || "(내용 없음)"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

window.RecoveryPanel = RecoveryPanel;
