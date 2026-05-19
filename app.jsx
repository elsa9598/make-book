/* app.jsx — 메인 앱 */

const { useState: useStateApp, useEffect, useMemo: useMemoApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "comicSide": "left",
  "paperWarmth": 1.0,
  "showStitching": true
}/*EDITMODE-END*/;

function App() {
  const [topic, setTopic] = useStateApp("talmud");
  const [category, setCategory] = useStateApp("지혜");
  const [quote, setQuote] = useStateApp("한 사람을 구하는 것은 온 세계를 구하는 것이다.");

  // 작업 중인 스프레드 인덱스 (본문 = 4~27 = 24편)
  const [currentSpread, setCurrentSpread] = useStateApp(1); // 첫 본문 스프레드 (001_a/002_b)
  const [previewSpread, setPreviewSpread] = useStateApp(0);
  const [tab, setTab] = useStateApp("workshop"); // workshop / book / preview
  const [promptPage, setPromptPage] = useStateApp(null); // null | "image" | "comic"

  // 전역 논출 — AI Writer의 버튼에서 호출
  useEffect(() => {
    window.openPromptPage = (kind) => setPromptPage(kind);
    window.gotoTab = (t) => { setPromptPage(null); setTab(t); };
    window.restoreToWorkshop = (spreadIdx, d) => {
      const data = d || {};
      setCompleted(prev => ({ ...prev, [spreadIdx]: { ...(prev[spreadIdx] || {}), ...data } }));
      setCurrentSpread(spreadIdx);
      if (data.topic) setTopic(data.topic);
      if (data.category) setCategory(data.category);
      if (data.quote != null) setQuote(data.quote);
      if (data.body != null) setBody(data.body);
      if (data.comicImg) setComicImg(data.comicImg);
      if (data.illustImg) setIllustImg(data.illustImg);
      if (data.book) setBookNo(data.book);
      setPromptPage(null);
      setTab("workshop");
    };
    return () => { delete window.openPromptPage; delete window.gotoTab; delete window.restoreToWorkshop; };
  }, []);

  // AI 출력
  const [body, setBody] = useStateApp("");
  const [retryLog, setRetryLog] = useStateApp([]);
  const [busy, setBusy] = useStateApp(false);
  const [versions, setVersions] = useStateApp([]);

  // 폴더에서 선택된 파일명 (페이지 번호 매칭 검증용)
  const [pickedComic, setPickedComic] = useStateApp(null);
  const [pickedIllust, setPickedIllust] = useStateApp(null);

  // 스프레드에 직접 첨부된 실제 이미지 (data URL)
  const [comicImg, setComicImg] = useStateApp(null);
  const [illustImg, setIllustImg] = useStateApp(null);

  // 완성된 스프레드 저장
  const [completed, setCompleted] = useStateApp({});

  // 표지/뒷표지 이미지
  const [coverImg, setCoverImg] = useStateApp(null);
  const [backImg, setBackImg] = useStateApp(null);

  // Toast
  const [toast, setToast] = useStateApp(null);

  // 시리즈 명언 사용 대장 + 작업 권 (1~30)
  const [ledger, setLedger] = useStateApp(() => window.QuoteLedger.load());
  const [bookNo, setBookNo] = useStateApp(() => window.QuoteLedger.bookNoLoad());
  useEffect(() => { window.QuoteLedger.save(ledger); }, [ledger]);
  useEffect(() => { window.QuoteLedger.bookNoSave(bookNo); }, [bookNo]);

  // ───────── 자동 저장 (IndexedDB) — 새로고침·재부팅에도 글·그림 보존 ─────────
  const hydrated = React.useRef(false);
  const saveTimer = React.useRef(null);
  const [savedAt, setSavedAt] = useStateApp(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!window.ArtbookStore) { hydrated.current = true; return; }
      const snap = await window.ArtbookStore.get("workspace");
      if (alive && snap && typeof snap === "object") {
        if (snap.completed) setCompleted(snap.completed);
        if (snap.coverImg) setCoverImg(snap.coverImg);
        if (snap.backImg) setBackImg(snap.backImg);
        if (snap.savedAt) setSavedAt(snap.savedAt);
      }
      hydrated.current = true;
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated.current || !window.ArtbookStore) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const now = new Date();
      const ts = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      const snap = { completed, coverImg, backImg, savedAt: ts };
      const ok = await window.ArtbookStore.set("workspace", snap);
      if (ok) setSavedAt(ts);

      // 페이지별 백업 누적 — 명세 파일명 규칙: NNN_a(왼쪽) / NNN_b(오른쪽)
      // 스프레드 1개 = 2페이지: 왼쪽=4컷+글, 오른쪽=상징 이미지
      try {
        const stamp = now.toLocaleString("ko-KR");
        const backups = (await window.ArtbookStore.get("page_backups")) || {};
        const pad = n => String(n).padStart(3, "0");
        const pushPage = (file, page, sig, data) => {
          const arr = backups[file] || [];
          if (!arr.length || arr[0].sig !== sig) {
            arr.unshift({ at: stamp, page, file, sig, data });
            backups[file] = arr.slice(0, 20); // 페이지당 최근 20개
          }
        };
        Object.keys(completed).forEach(idx => {
          const d = completed[idx] || {};
          const sp = window.BOOK_SPREADS[idx];
          if (!sp) return;
          const aFile = pad(sp.leftPage) + "_a";   // 왼쪽 페이지
          const bFile = pad(sp.rightPage) + "_b";  // 오른쪽 페이지
          // 왼쪽(_a): 본문 글 + 4컷 이미지
          pushPage(aFile, sp.leftPage,
            (d.body || "").length + "|" + (d.body || "").slice(0, 40) + "|" + (d.comicImg ? "C" : "-"),
            { body: d.body || "", comicImg: d.comicImg || null, comicFile: d.comicFile || null,
              topic: d.topic, category: d.category, quote: d.quote, book: d.book });
          // 오른쪽(_b): 상징 일러스트
          pushPage(bFile, sp.rightPage,
            (d.illustImg ? "I" : "-") + "|" + (d.illustFile || ""),
            { illustImg: d.illustImg || null, illustFile: d.illustFile || null,
              topic: d.topic, category: d.category, quote: d.quote, book: d.book });
        });
        await window.ArtbookStore.set("page_backups", backups);
      } catch (e) { /* 백업 실패는 본 저장에 영향 주지 않음 */ }
    }, 700);
  }, [completed, coverImg, backImg]);

  // Tweaks
  const [tweakValues, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // 주제 변경 시 카테고리 디폴트 조정
  useEffect(() => {
    const T = window.TOPICS[topic];
    if (!T.categories.includes(category)) {
      setCategory(T.categories[0]);
    }
    document.documentElement.setAttribute("data-topic", topic);
  }, [topic]);

  // 키보드 네비 (미리보기 탭)
  useEffect(() => {
    if (tab !== "preview") return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setPreviewSpread(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setPreviewSpread(i => Math.min(24, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  // 스프레드 변경 시 — 저장된 데이터가 있으면 복원, 없으면 초기화
  useEffect(() => {
    const saved = completed[currentSpread];
    if (saved) {
      setBody(saved.body || "");
      setPickedComic(saved.comicFile || null);
      setPickedIllust(saved.illustFile || null);
      setComicImg(saved.comicImg || null);
      setIllustImg(saved.illustImg || null);
      if (saved.topic) setTopic(saved.topic);
      if (saved.category) setCategory(saved.category);
      if (saved.quote != null) setQuote(saved.quote);
      if (saved.book) setBookNo(saved.book);
    } else {
      setBody("");
      setPickedComic(null);
      setPickedIllust(null);
      setComicImg(null);
      setIllustImg(null);
    }
    setRetryLog([]);
    setVersions([]);
  }, [currentSpread]);

  const sp = window.BOOK_SPREADS[currentSpread];
  const leftFile = `${String(sp.leftPage).padStart(3, "0")}_a.jpg`;
  const rightFile = `${String(sp.rightPage).padStart(3, "0")}_b.jpg`;

  // 본문이 저장되면 즉시 완성함에 광안 반영 (메모·미리보기 연동)
  const saveBodyToBook = (text) => {
    setCompleted(prev => ({
      ...prev,
      [currentSpread]: {
        ...(prev[currentSpread] || {}),
        body: text,
        topic, category, quote,
        comicFile: leftFile,
        illustFile: rightFile,
        comicImg: comicImg || prev[currentSpread]?.comicImg || null,
        illustImg: illustImg || prev[currentSpread]?.illustImg || null
      }
    }));
  };

  // MAKE 가능 조건: 본문 + 이미지 2장 첨부 (폴더 선택은 참고용)
  const canMake = sp.leftMeta.section === "body"
    && body.trim().length > 0
    && comicImg && illustImg;

  const onMake = () => {
    // 시리즈 중복 방지 — 이미 다른 권/본문에 쓴 명언이면 차단
    const reg = window.QuoteLedger.register(ledger, topic, quote, {
      book: bookNo, spread: currentSpread,
      leftPage: sp.leftPage, rightPage: sp.rightPage, category
    });
    if (!reg.ok && reg.reason === "duplicate") {
      const a = reg.at;
      setToast({
        kind: "warn",
        text: `⚠ 중복 — 이 구절은 이미 ${a.book}권 본문#${String(a.spread).padStart(2,"0")} (${a.category})에 사용됨. 다른 명언을 선택하세요.`
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    // 이 (권,스프레드) 자리에 옛 명언이 있었다면 정리 후 새로 등록
    let nextLedger = window.QuoteLedger.clearSlot(ledger, topic, bookNo, currentSpread);
    const reg2 = window.QuoteLedger.register(nextLedger, topic, quote, {
      book: bookNo, spread: currentSpread,
      leftPage: sp.leftPage, rightPage: sp.rightPage, category
    });
    if (reg2.ok) setLedger(reg2.next);

    setCompleted({
      ...completed,
      [currentSpread]: {
        body,
        comicFile: pickedComic || leftFile,
        illustFile: pickedIllust || rightFile,
        comicImg,
        illustImg,
        topic, category, quote, book: bookNo
      }
    });
    // 페이지별 폴더로 실제 파일 저장 (서버로 열렸을 때만): pages/<권>/<NNN_a>/...
    if (location.protocol === "http:" || location.protocol === "https:") {
      const pad = n => String(n).padStart(3, "0");
      const splitDataUrl = (u) => {
        if (!u || u.indexOf(",") < 0) return null;
        const m = /data:image\/(\w+)/.exec(u);
        return { ext: m ? m[1].replace("jpeg", "jpg") : "jpg", b64: u.split(",")[1] };
      };
      const aId = pad(sp.leftPage) + "_a";
      const bId = pad(sp.rightPage) + "_b";
      const aImg = splitDataUrl(comicImg);
      const bImg = splitDataUrl(illustImg);
      // MAKE 스냅샷 — 이 스토리+4컷+이미지 묶음을 versions/ 에 영구 보존
      // (이후 작업실에서 다시 생성해도 이 스냅샷은 덮어쓰지 않음 → 스토리 유실 방지)
      const d = new Date();
      const vstamp = d.getFullYear() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0")
        + "_" + String(d.getHours()).padStart(2,"0") + String(d.getMinutes()).padStart(2,"0") + String(d.getSeconds()).padStart(2,"0");
      const payload = {
        book: String(bookNo).padStart(2, "0") + "권",
        pages: [
          {
            id: aId,
            files: [
              { name: aId + ".txt", text: body },
              ...(aImg ? [{ name: aId + "." + aImg.ext, b64: aImg.b64 }] : []),
              // 영구 스냅샷(스토리+4컷 함께)
              { sub: "versions", name: aId + "_" + vstamp + ".txt", text: body },
              ...(aImg ? [{ sub: "versions", name: aId + "_" + vstamp + "." + aImg.ext, b64: aImg.b64 }] : [])
            ]
          },
          {
            id: bId,
            files: [
              ...(bImg ? [{ name: bId + "." + bImg.ext, b64: bImg.b64 }] : []),
              // 상징 이미지 영구 스냅샷(같은 스토리 묶음)
              ...(bImg ? [{ sub: "versions", name: bId + "_" + vstamp + "." + bImg.ext, b64: bImg.b64 }] : []),
              { sub: "versions", name: bId + "_" + vstamp + ".txt", text: body }
            ]
          }
        ]
      };
      fetch(location.origin + "/save-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json()).then(j => {
        if (j && j.ok) {
          setToast({ kind: "ok", text: `📁 페이지 저장 — ${j.root}\n${(j.written || []).join(", ")}` });
          setTimeout(() => setToast(null), 4000);
        }
      }).catch(e => console.warn("[save-page] 실패:", e.message));
    }

    setToast({
      kind: "ok",
      text: `✦ ${bookNo}권 본문#${String(currentSpread).padStart(2,"0")} 완성 — pp.${String(sp.leftPage).padStart(3,"0")}–${String(sp.rightPage).padStart(3,"0")} · 명언 사용 대장에 기록됨`
    });
    setTimeout(() => setToast(null), 3500);
  };

  // 현재 스프레드 1개만 삭제 (다른 페이지는 그대로 · IndexedDB 백업은 보존)
  const onDeleteSpread = () => {
    const aF = `${String(sp.leftPage).padStart(3, "0")}_a`;
    const bF = `${String(sp.rightPage).padStart(3, "0")}_b`;
    if (!window.confirm(
      `본문#${String(currentSpread).padStart(2, "0")} (pp.${aF} · ${bF})만 삭제합니다.\n` +
      `다른 페이지(완료한 1·2페이지 등)는 그대로 유지됩니다.\n` +
      `복구 탭의 백업은 남으니 되살릴 수 있습니다. 삭제할까요?`
    )) return;

    setCompleted(prev => {
      const n = { ...prev };
      delete n[currentSpread];
      return n;
    });
    setLedger(window.QuoteLedger.clearSlot(ledger, topic, bookNo, currentSpread));
    setBody(""); setComicImg(null); setIllustImg(null);
    setPickedComic(null); setPickedIllust(null);
    setRetryLog([]); setVersions([]);

    if (location.protocol === "http:" || location.protocol === "https:") {
      fetch(location.origin + "/delete-page", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: String(bookNo).padStart(2, "0") + "권", ids: [aF, bF] })
      }).then(r => r.json()).then(j => {
        setToast({ kind: "ok", text: `🗑 본문#${String(currentSpread).padStart(2,"0")} 삭제됨 · 디스크 ${(j.removed||[]).length}개 폴더 제거 (1·2페이지 유지)` });
        setTimeout(() => setToast(null), 4000);
      }).catch(() => {
        setToast({ kind: "ok", text: `🗑 본문#${String(currentSpread).padStart(2,"0")} 삭제됨 (화면·자동저장)` });
        setTimeout(() => setToast(null), 4000);
      });
    } else {
      setToast({ kind: "ok", text: `🗑 본문#${String(currentSpread).padStart(2,"0")} 삭제됨` });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // 다음 스프레드로 이동 (useEffect가 상태 복원/초기화 담당)
  const goNextBody = () => {
    setCurrentSpread(Math.min(24, currentSpread + 1));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">아트북 제작</div>
        </div>
        <div className="tabs">
          <button className={"tab" + (tab === "workshop" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("workshop"); }}>작업실</button>
          <button className={"tab" + (tab === "book" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("book"); }}>책 구조</button>
          <button className={"tab" + (tab === "preview" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("preview"); }}>미리보기</button>
          <button className={"tab" + (tab === "usage" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("usage"); }}>사용 현황</button>
          <button className={"tab" + (tab === "recovery" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("recovery"); }} style={{color:"#a83232"}}>복구</button>
        </div>
        <div className="header-meta">
          <label className="book-select">
            시리즈
            <select value={bookNo} onChange={e => setBookNo(parseInt(e.target.value, 10))}>
              {Array.from({ length: window.QuoteLedger.SERIES_BOOKS }, (_, i) => i + 1).map(b => (
                <option key={b} value={b}>{b}권</option>
              ))}
            </select>
            / {window.QuoteLedger.SERIES_BOOKS}권
          </label>
          <span>완성 {Object.keys(completed).length}/24</span>
          <span>대장 {window.QuoteLedger.topicUsedCount(ledger, topic)}/{window.QuoteLedger.TARGET_PER_TOPIC}</span>
          <span title="새로고침·재부팅에도 보존 (IndexedDB, 백업본 5개 유지)">
            {savedAt ? `자동저장 ${savedAt}` : "자동저장 대기"}
          </span>
          <div className="topic-chip">
            <span className="dot"></span>
            {window.TOPICS[topic].nameKo} · {window.TOPICS[topic].name}
          </div>
        </div>
      </header>

      {promptPage ? (
        <window.PromptGeneratorPage
          mode={promptPage}
          ctx={{ topic, category, quote, body }}
          onBack={() => setPromptPage(null)}
        />
      ) : (
        <>
          {tab === "workshop" && (
        <Workshop
          topic={topic} setTopic={setTopic}
          category={category} setCategory={setCategory}
          quote={quote} setQuote={setQuote}
          currentSpread={currentSpread} setCurrentSpread={setCurrentSpread}
          body={body} setBody={setBody}
          retryLog={retryLog} setRetryLog={setRetryLog}
          busy={busy} setBusy={setBusy}
          versions={versions} setVersions={setVersions}
          onSaveToBook={saveBodyToBook}
          pickedComic={pickedComic} setPickedComic={setPickedComic}
          pickedIllust={pickedIllust} setPickedIllust={setPickedIllust}
          comicImg={comicImg} setComicImg={setComicImg}
          illustImg={illustImg} setIllustImg={setIllustImg}
          completed={completed}
          leftFile={leftFile} rightFile={rightFile}
          canMake={canMake} onMake={onMake} onDeleteSpread={onDeleteSpread}
          goNextBody={goNextBody}
          tweakValues={tweakValues}
          ledger={ledger} bookNo={bookNo}
        />
      )}

      {tab === "book" && (
        <BookGrid
          spreads={window.BOOK_SPREADS}
          completed={completed}
          onPickSpread={(idx) => {
            setCurrentSpread(idx);
            setTab("workshop");
          }}
          topic={topic}
          coverImg={coverImg} backImg={backImg}
          onCoverUpload={setCoverImg} onBackUpload={setBackImg}
        />
      )}

      {tab === "preview" && (
        <BookPreview
          spreads={window.BOOK_SPREADS}
          completed={completed} setCompleted={setCompleted}
          topic={topic}
          coverImg={coverImg} backImg={backImg}
          comicSide={tweakValues.comicSide}
          currentIdx={previewSpread} setCurrentIdx={setPreviewSpread}
        />
      )}

      {tab === "usage" && (
        <window.UsageIndex
          topic={topic}
          ledger={ledger} setLedger={setLedger}
          bookNo={bookNo} setBookNo={setBookNo}
        />
      )}

      {tab === "recovery" && (
        <window.RecoveryPanel
          completed={completed}
          setCompleted={setCompleted}
          setToast={setToast}
        />
      )}
        </>
      )}

      {toast && (
        <div className="toast">{toast.text}</div>
      )}

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="레이아웃">
          <window.TweakRadio
            label="4컷 만화 위치"
            value={tweakValues.comicSide}
            onChange={v => setTweak("comicSide", v)}
            options={[
              { value: "left", label: "왼쪽" },
              { value: "right", label: "오른쪽" }
            ]}
          />
        </window.TweakSection>

        <window.TweakSection label="주제 (Topic Palette)">
          <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "4px 0"}}>
            {Object.entries(window.TOPICS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setTopic(k)}
                style={{
                  padding: "10px 4px", textAlign: "center",
                  background: topic === k ? "#2a221a" : "#f6ecd6",
                  color: topic === k ? "#f6ecd6" : "#2a221a",
                  border: "1px solid #c7b48c",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  borderRadius: 2
                }}
              >
                <div style={{
                  width: 18, height: 18, margin: "0 auto 4px",
                  background: v.color,
                  borderRadius: "50%",
                  border: `2px solid ${v.accent}`
                }}></div>
                {v.nameKo}
              </button>
            ))}
          </div>
        </window.TweakSection>

        <window.TweakSection label="제본 디테일">
          <window.TweakToggle
            label="실 노출 제본 스티칭 표시"
            value={tweakValues.showStitching}
            onChange={v => setTweak("showStitching", v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </div>
  );
}

/* ───────── 작업실 ───────── */
function Workshop(props) {
  const {
    topic, setTopic, category, setCategory, quote, setQuote,
    currentSpread, setCurrentSpread,
    body, setBody, retryLog, setRetryLog, busy, setBusy,
    versions, setVersions, onSaveToBook,
    pickedComic, setPickedComic, pickedIllust, setPickedIllust,
    comicImg, setComicImg, illustImg, setIllustImg,
    completed, leftFile, rightFile, canMake, onMake, onDeleteSpread, goNextBody, tweakValues,
    ledger, bookNo
  } = props;

  const T = window.TOPICS[topic];
  const sp = window.BOOK_SPREADS[currentSpread];
  const isBody = sp.leftMeta.section === "body";

  return (
    <div className="workshop">
      {/* 왼쪽 패널: 입력 */}
      <aside className="panel">
        <div className="panel-section">
          <h4 className="panel-title">주제</h4>
          <div className="topic-grid">
            {Object.entries(window.TOPICS).map(([k, v]) => (
              <div
                key={k}
                className={"topic-card" + (topic === k ? " active" : "")}
                onClick={() => setTopic(k)}
              >
                <div className="topic-name">{v.nameKo}</div>
                <div className="topic-sub">{v.name}</div>
                <div className="topic-bar" style={{"--topic-color": v.color}}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-title">카테고리</h4>
          <div className="cat-grid">
            {T.categories.map(c => (
              <button
                key={c}
                className={"chip cat-chip" + (category === c ? " active" : "")}
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-title">명언 / 구절</h4>
          <div className="field">
            <textarea
              value={quote}
              onChange={e => setQuote(e.target.value)}
              placeholder="이 페이지의 출발이 될 한 줄을 입력하세요"
            ></textarea>
          </div>
          <div className="hint" style={{fontSize: 10, margin: "6px 0", fontStyle: "italic"}}>
            이 구절이 본문의 첫 줄 타이틀로 자동 삽입됩니다. 아래에서 카테고리별 100개 명언을 골라보세요.
          </div>
          <window.QuotePicker
            topic={topic}
            category={category}
            quote={quote}
            setQuote={setQuote}
            ledger={ledger}
            bookNo={bookNo}
            currentSpread={currentSpread}
          />
        </div>

        <div className="panel-section">
          <window.AiWriter
            topic={topic} category={category} quote={quote}
            output={body} setOutput={setBody}
            retryLog={retryLog} setRetryLog={setRetryLog}
            busy={busy} setBusy={setBusy}
            versions={versions} setVersions={setVersions}
            onSaveToBook={onSaveToBook}
          />
        </div>
      </aside>

      {/* 가운데 패널: 미리보기 + 스텝 */}
      <main className="panel center">
        <div className="steps">
          <button
            className="step-badge as-btn"
            onClick={() => window.gotoTab && window.gotoTab("preview")}
            title="미니북을 넘기며 어디까지 작업됐는지 한눈에 봅니다"
          >
            <span className="num">◳</span>한눈에 보기
          </button>
          <button
            className="step-badge as-btn"
            onClick={() => window.openPromptPage && window.openPromptPage("image")}
            title="이미지 생성 프롬프트 페이지로 이동"
          >
            <span className="num">▦</span>이미지 프롬프트
          </button>
          <button
            className="step-badge as-btn"
            onClick={() => window.openPromptPage && window.openPromptPage("comic")}
            title="4컷 만화 프롬프트 페이지로 이동"
          >
            <span className="num">▤</span>4컷 프롬프트
          </button>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14
        }}>
          <div>
            <div className="panel-title" style={{margin: 0, display: "flex", alignItems: "center", gap: 8}}>
              현재 스프레드
              <span className={"section-badge section-" + sp.leftMeta.section}>
                {window.sectionLabel(sp.leftMeta.section)}
              </span>
            </div>
            <div style={{
              fontFamily: "var(--font-display)", fontStyle: "italic",
              fontSize: 22, color: "var(--ink)"
            }}>
              {sp.leftMeta.label} · {sp.rightMeta.label}
            </div>
            <div style={{fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", marginTop: 2}}>
              {leftFile} · {rightFile} · pp.{String(sp.leftPage).padStart(3,"0")}–{String(sp.rightPage).padStart(3,"0")} · 스프레드 {currentSpread + 1}/25
            </div>
          </div>
          <div style={{display: "flex", gap: 6}}>
            <button
              className="btn ghost"
              disabled={currentSpread <= 0}
              onClick={() => setCurrentSpread(Math.max(0, currentSpread - 1))}
            >‹ 이전</button>
            <button
              className="btn ghost"
              disabled={currentSpread >= 24}
              onClick={goNextBody}
            >다음 ›</button>
          </div>
        </div>

        <window.SpreadPreview
          spreadIdx={currentSpread}
          leftPage={sp.leftPage}
          rightPage={sp.rightPage}
          comicSeed={(sp.leftMeta.workIdx || 0) * 3}
          illustSeed={(sp.leftMeta.workIdx || 0) % 6}
          comicImg={comicImg}
          illustImg={illustImg}
          onComicUpload={setComicImg}
          onIllustUpload={setIllustImg}
          bodyText={body}
          comicSide={tweakValues.comicSide}
          topic={topic}
          category={category}
        />
      </main>

      {/* 오른쪽 패널: 첨부 + MAKE */}
      <aside className="panel">
        <div className="panel-section">
          <h4 className="panel-title">좌측 페이지 — 4컷 카툰</h4>
          <window.AttachSlot
            filename={leftFile}
            img={comicImg}
            onChange={setComicImg}
            kind="9:16 4컷 카툰"
            aspect="9 / 16"
          />
        </div>

        <div className="panel-section">
          <h4 className="panel-title">우측 페이지 — 상징 이미지</h4>
          <window.AttachSlot
            filename={rightFile}
            img={illustImg}
            onChange={setIllustImg}
            kind="1:1 상징 일러스트"
            aspect="1 / 1"
          />
        </div>

        <div className="panel-section">
          <h4 className="panel-title">조립 · MAKE</h4>
          <div style={{
            background: "var(--paper-page)",
            border: "1px solid var(--rule)",
            padding: 14,
            marginBottom: 12
          }}>
            <div style={{display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--ink-muted)", letterSpacing: "0.08em"}}>
              <span>본문</span>
              <span>{body ? "✓ 작성됨" : "—"}</span>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--ink-muted)", letterSpacing: "0.08em"}}>
              <span>4컷 카툰 ({leftFile})</span>
              <span>{comicImg ? "✓ 첨부됨" : "— 좌측 클릭"}</span>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--ink-muted)", letterSpacing: "0.08em"}}>
              <span>상징 이미지 ({rightFile})</span>
              <span>{illustImg ? "✓ 첨부됨" : "— 우측 클릭"}</span>
            </div>
          </div>
          <button
            className="btn-make"
            disabled={!canMake}
            onClick={onMake}
          >
            MAKE
          </button>
          <div className="hint" style={{marginTop: 10, fontSize: 11, textAlign: "center"}}>
            완성된 스프레드는 즉시 PDF 미리보기에 반영됩니다.
          </div>
          <button
            className="btn ghost"
            style={{marginTop: 10, width: "100%", color: "#a83232", borderColor: "#a83232"}}
            onClick={onDeleteSpread}
            title="지금 보고 있는 이 스프레드 1개만 삭제 (다른 페이지·완료분은 그대로)"
          >
            🗑 이 스프레드만 삭제 ({leftFile} · {rightFile})
          </button>
        </div>

        {Object.keys(completed).length > 0 && (
          <div className="panel-section">
            <h4 className="panel-title">완성 — {Object.keys(completed).length}편</h4>
            <div style={{fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-soft)", lineHeight: 1.8}}>
              {Object.keys(completed).map(k => {
                const s = window.BOOK_SPREADS[k];
                const firstLine = (completed[k].body || "").split("\n").find(l => l.trim()) || "—";
                const snip = firstLine.length > 22 ? firstLine.slice(0, 22) + "…" : firstLine;
                return (
                  <div key={k}>· {String(s.leftPage).padStart(3,"0")}_a · {String(s.rightPage).padStart(3,"0")}_b — {snip}</div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ───────── 마운트 ───────── */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
