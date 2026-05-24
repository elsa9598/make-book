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
  const i = Math.floor((pg - 1) / 2) + 1; // 1..5
  return (i >= 1 && i <= 5) ? i : null;
}

function RecoveryPanel({ completed, setCompleted, setToast, bookNo, onChangeBookNo, topic, onChangeTopic, onChangeTopicAndBookNo }) {
  // workspaces = [{ topic, topicLabel, vol, key, data }, …]
  const [workspaces, setWorkspaces] = useStateRC([]);
  const [pageBk, setPageBk] = useStateRC({});
  const [legacy, setLegacy] = useStateRC({});
  const [loading, setLoading] = useStateRC(true);

  // workspace 키 → { topic, vol } 파싱
  const parseWsKey = (k) => {
    // 새 형식: workspace_{nameKo}_{NNN}권 (예: workspace_탈무드_001권)
    const mNew = /^workspace_(.+)_(\d{1,3})권$/.exec(k);
    if (mNew) {
      const nameKo = mNew[1];
      // nameKo → topic 키 역매핑
      const topics = window.TOPICS || {};
      const found = Object.keys(topics).find(t => topics[t].nameKo === nameKo);
      return { topic: found || nameKo, topicLabel: nameKo, vol: parseInt(mNew[2], 10) };
    }
    // 구 형식: workspace_{NNN}권 — 주제 모름 ("미지정" 표시)
    const mOld = /^workspace_(\d{1,3})권$/.exec(k);
    if (mOld) return { topic: null, topicLabel: "(주제 미지정)", vol: parseInt(mOld[1], 10) };
    return null;
  };

  const reload = async () => {
    setLoading(true);
    if (!window.ArtbookStore) { setLoading(false); return; }

    const allKeys = (window.ArtbookStore.keys ? await window.ArtbookStore.keys() : []);
    const volKeys = allKeys.filter(k => typeof k === "string" && /^workspace_.+_\d{1,3}권$|^workspace_\d{1,3}권$/.test(k));

    const vols = [];
    for (const k of volKeys) {
      const parsed = parseWsKey(k);
      const v = await window.ArtbookStore.get(k);
      if (parsed && v) vols.push({ ...parsed, key: k, data: v });
    }

    // 정렬: ① 현재 주제+권 맨 위 → ② 같은 주제(현재 topic)의 다른 권 → ③ 다른 주제 → savedAt 내림차순
    vols.sort((a, b) => {
      const aCurrent = a.topic === topic && a.vol === bookNo;
      const bCurrent = b.topic === topic && b.vol === bookNo;
      if (aCurrent && !bCurrent) return -1;
      if (bCurrent && !aCurrent) return 1;
      const aSameTopic = a.topic === topic;
      const bSameTopic = b.topic === topic;
      if (aSameTopic && !bSameTopic) return -1;
      if (bSameTopic && !aSameTopic) return 1;
      const ta = (a.data && a.data.savedAt) || "";
      const tb = (b.data && b.data.savedAt) || "";
      if (ta && !tb) return -1;
      if (!ta && tb) return 1;
      return tb.localeCompare(ta);
    });

    // 현재 주제·권이 vols에 없으면 빈 카드 맨 위 추가
    if (!vols.find(v => v.topic === topic && v.vol === bookNo)) {
      const T = window.TOPICS[topic];
      vols.unshift({
        topic, topicLabel: T ? T.nameKo : topic, vol: bookNo,
        key: window.QuoteLedger.workspaceKey(topic, bookNo),
        data: { completed: {}, savedAt: null }
      });
    }
    setWorkspaces(vols);

    const b = await window.ArtbookStore.get("page_backups");
    const c = await window.ArtbookStore.get("spread_backups");
    setPageBk(b || {});
    setLegacy(c || {});
    setLoading(false);
  };
  useEffectRC(() => { reload(); }, [bookNo, topic]);

  const restoreCurrentWork = async () => {
    if (window.restoreCurrentWorkspace) {
      const ok = await window.restoreCurrentWorkspace();
      await reload();
      if (!ok) {
        setToast && setToast({ kind: "ok", text: "현재 작업 복구본이 없습니다" });
        setTimeout(() => setToast && setToast(null), 2500);
      }
      return;
    }
    await reload();
  };

  const restoreFromDiskAutosave = async () => {
    if (!window.ArtbookStore) return;
    const T = window.TOPICS[topic];
    const tName = T ? T.nameKo : topic;
    const padBook = String(bookNo).padStart(3, "0");
    const url = `/pages/${encodeURIComponent(tName)}/${padBook}권/autosave/workspace_autosave_fixed.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("디스크에 저장된 자동저장본이 없습니다. (" + res.status + ")");
      const snap = await res.json();
      if (!snap || typeof snap !== "object") throw new Error("데이터 형식이 올바르지 않습니다.");
      
      const key = window.QuoteLedger.workspaceKey(topic, bookNo);
      await window.ArtbookStore.set(key, snap);
      if (window.restoreCurrentWorkspace) await window.restoreCurrentWorkspace();
      await reload();
      setToast && setToast({ kind: "ok", text: `✓ ${tName} ${bookNo}권 디스크 백업본을 성공적으로 불러왔습니다.` });
      setTimeout(() => setToast && setToast(null), 3000);
    } catch (e) {
      alert("디스크 백업 불러오기 실패:\n" + e.message);
    }
  };

  // 특정 주제·권으로 전환 + 자동 복원
  const switchToVolume = async (toTopic, vol) => {
    if (toTopic === topic && vol === bookNo) {
      setToast && setToast({ kind: "ok", text: `이미 작업 중입니다` });
      setTimeout(() => setToast && setToast(null), 2500);
      return;
    }
    const T = window.TOPICS[toTopic];
    const label = T ? T.nameKo : toTopic;
    if (!window.confirm(`${label} ${vol}권으로 전환하시겠습니까?\n(현재 작업물은 자동 저장됩니다)`)) return;
    
    if (onChangeTopicAndBookNo) {
      await onChangeTopicAndBookNo(toTopic, vol);
    } else if (toTopic !== topic && onChangeTopic) {
      await onChangeTopic(toTopic);
      if (onChangeBookNo) await onChangeBookNo(vol);
    } else if (onChangeBookNo) {
      await onChangeBookNo(vol);
    }
    if (window.gotoTab) window.gotoTab("workshop");
  };

  // 명언으로 올바른 주제·카테고리 자동 판별
  const normQ = (s) => (s || "").replace(/^["'“”‘’\s]+|["'“”‘’\s.]+$/g, "").trim();
  const findQuoteCat = (q) => {
    const Q = window.QUOTES || {};
    const key = normQ(q);
    if (!key) return null;
    for (const tp of Object.keys(Q)) {
      const cats = Q[tp] || {};
      for (const cat of Object.keys(cats)) {
        if ((cats[cat] || []).some(x => normQ(x) === key)) return { topic: tp, category: cat };
      }
    }
    return null;
  };
  const realQuote = (d) => {
    const fl = (d.body || "").split("\n").map(l => l.trim()).find(Boolean) || "";
    return d.confirmed ? (fl || d.quote || "") : (d.quote || fl || "");
  };

  // 특정 카드의 카테고리·구절 자동 정정 (IndexedDB·화면 모두 갱신)
  const fixCategoriesForVolume = async (w) => {
    if (!w || !w.data || !w.data.completed) return;
    const next = {};
    let fixed = 0;
    Object.keys(w.data.completed).forEach(k => {
      const d = { ...w.data.completed[k] };
      const hit = findQuoteCat(realQuote(d));
      if (hit) {
        if (d.topic !== hit.topic || d.category !== hit.category) fixed++;
        d.topic = hit.topic; d.category = hit.category;
        const fl = (d.body || "").split("\n").map(l => l.trim()).find(Boolean) || "";
        if (d.confirmed && fl) d.quote = fl;
      }
      next[k] = d;
    });
    const newData = { ...w.data, completed: next };
    await window.ArtbookStore.set(w.key, newData);
    setWorkspaces(prev => prev.map(x => x.key === w.key ? { ...x, data: newData } : x));
    if (w.topic === topic && w.vol === bookNo) setCompleted(next);
    setToast && setToast({ kind: "ok", text: `🛠 ${w.topicLabel} ${w.vol}권 — ${fixed}개 항목 자동 정정` });
    setTimeout(() => setToast && setToast(null), 3500);
  };

  // 특정 카드의 스프레드 항목 삭제
  const deleteVolumeSpread = async (w, k) => {
    if (!w || !w.data || !w.data.completed) return;
    if (!window.confirm(`${w.topicLabel} ${w.vol}권 #${k} 항목을 자동저장에서 삭제할까요? (페이지별 백업은 남습니다)`)) return;
    const next = { ...w.data.completed };
    delete next[k];
    const newData = { ...w.data, completed: next };
    await window.ArtbookStore.set(w.key, newData);
    setWorkspaces(prev => prev.map(x => x.key === w.key ? { ...x, data: newData } : x));
    if (w.topic === topic && w.vol === bookNo) setCompleted(next);
    setToast && setToast({ kind: "ok", text: `🗑 ${w.topicLabel} ${w.vol}권 #${k} 삭제됨` });
    setTimeout(() => setToast && setToast(null), 3000);
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

  const pageFiles = Object.keys(pageBk).sort();
  const legacyKeys = Object.keys(legacy);

  return (
    <div className="usage-view">
      <div className="usage-top">
        <div>
          <div className="usage-h">작업물 복구</div>
          <div className="usage-sub">
            주제별 권 자동저장(IndexedDB)에서 복원합니다. <b style={{color:"#2f5d3a"}}>현재 작업 중인 {window.TOPICS[topic] ? window.TOPICS[topic].nameKo : topic} {bookNo}권</b>을 맨 위, 그 다음은 같은 주제의 다른 권 → 다른 주제 순으로 정렬합니다.
          </div>
        </div>
        <div className="usage-actions">
          <button className="btn ghost" onClick={restoreCurrentWork}>현재작업복구</button>
          <button className="btn" style={{ marginLeft: 8 }} onClick={restoreFromDiskAutosave}>폴더 백업 불러오기</button>
        </div>
      </div>

      {loading ? (
        <div className="hint" style={{ padding: 30 }}>불러오는 중…</div>
      ) : (
        <>
          {workspaces.length === 0 && (
            <div className="ubc-empty" style={{ padding: 24 }}>저장된 권별 작업물이 없습니다.</div>
          )}
          {workspaces.map(w => {
            const c = (w.data && w.data.completed) || {};
            const ks = Object.keys(c);
            const isCurrent = w.topic === topic && w.vol === bookNo;
            const confirmedN = ks.filter(k => c[k] && c[k].confirmed).length;
            return (
              <div key={w.key}
                className="usage-book-card"
                style={{
                  marginBottom: 14,
                  border: isCurrent ? "2px solid #2f5d3a" : undefined,
                  background: isCurrent ? "rgba(47,93,58,0.04)" : undefined
                }}>
                <div className="ubc-head">
                  <span className="ubc-no" style={{ fontWeight: 700, color: isCurrent ? "#2f5d3a" : undefined }}>
                    {isCurrent ? "📘 " : ""}{w.topicLabel} {w.vol}권{isCurrent ? " (작업 중)" : ""}
                  </span>
                  <span className="ubc-cnt">
                    {ks.length}/5 스프레드 · 확정 {confirmedN}/5 · {w.data && w.data.savedAt ? w.data.savedAt : "기록 없음"}
                  </span>
                  <span className="ubc-spacer"></span>
                  {ks.length > 0 && (
                    <button className="btn" style={{ fontSize: 11, marginRight: 6 }}
                      onClick={() => fixCategoriesForVolume(w)}
                      title="명언 풀과 대조해 잘못된 카테고리·구절을 자동 정정">🛠 자동정정</button>
                  )}
                  {!isCurrent && w.topic && (
                    <button className="btn primary" style={{ fontSize: 11 }}
                      onClick={() => switchToVolume(w.topic, w.vol)}>이 권으로 전환</button>
                  )}
                </div>
                {ks.length === 0
                  ? <div className="ubc-empty">이 권엔 저장된 스프레드가 없습니다.</div>
                  : (
                    <ul className="ubc-list">
                      {ks.sort((a, b) => parseInt(a) - parseInt(b)).map(k => {
                        const d = c[k] || {};
                        const first = (d.body || "").split("\n").find(l => l.trim()) || "(본문 없음)";
                        const hit = findQuoteCat(realQuote(d));
                        const catNow = hit ? hit.category : (d.category || "—");
                        const wrong = hit && d.category !== hit.category;
                        return (
                          <li key={k}>
                            <span className="ubc-pos">#{k}{d.confirmed ? " ✓" : ""}</span>
                            <span className="ubc-cat" title={wrong ? `저장값: ${d.category} → 정정: ${hit.category}` : ""}
                              style={wrong ? { color: "#a83232" } : undefined}>{catNow}{wrong ? " ⚠" : ""}</span>
                            <span className="ubc-q">{first.slice(0, 38)}{d.comicImg ? " 🖼4컷" : ""}{d.illustImg ? " 🖼상징" : ""}</span>
                            <button className="ubc-x" onClick={() => deleteVolumeSpread(w, k)} title="이 항목 삭제">✕</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
              </div>
            );
          })}

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
