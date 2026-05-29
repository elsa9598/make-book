/* app.jsx — 메인 앱 */

const { useState: useStateApp, useEffect, useMemo: useMemoApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "comicSide": "left",
  "paperWarmth": 1.0,
  "showStitching": true
}/*EDITMODE-END*/;

const ODUNI_CHARACTERS = [
  { id: "sangchu", name: "상추멍" },
  { id: "baechu", name: "배추멍" },
  { id: "yeolmu", name: "열무멍" },
  { id: "kkami", name: "까미냥" },
  { id: "kimchi", name: "김치냥" }
];

function App() {
  const [topic, setTopic] = useStateApp("talmud");
  const [category, setCategory] = useStateApp("지혜");
  const [quote, setQuote] = useStateApp("한 사람을 구하는 것은 온 세계를 구하는 것이다.");
  const [heroCharacter, setHeroCharacter] = useStateApp("sangchu");

  // 작업 중인 스프레드 인덱스 (본문 = 1~5 = 5편)
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
      if (data.heroCharacter) setHeroCharacter(data.heroCharacter);
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
  const [activeVer, setActiveVer] = useStateApp(null); // 선택된 버전 인덱스 — 프롬프트 페이지 왕복에도 유지

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

  // A4 인쇄용 PDF의 3번 스프레드에 들어갈 오둥이 사진 (권별 첨부)
  const [oduniImg, setOduniImg] = useStateApp(null);

  // Toast
  const [toast, setToast] = useStateApp(null);

  // 시리즈 명언 사용 대장 + 주제별 작업 권 (각 주제 1~200)
  const [ledger, setLedger] = useStateApp(() => window.QuoteLedger.load());
  const [bookNoByTopic, setBookNoByTopic] = useStateApp(() => window.QuoteLedger.bookNoByTopicLoad());
  const bookNo = window.QuoteLedger.bookNoOf(bookNoByTopic, topic);
  const setBookNo = (n) => setBookNoByTopic(prev => ({ ...prev, [topic]: n }));
  useEffect(() => { window.QuoteLedger.save(ledger); }, [ledger]);
  useEffect(() => { window.QuoteLedger.bookNoByTopicSave(bookNoByTopic); }, [bookNoByTopic]);

  // ───────── 자동 저장 (IndexedDB) — 새로고침·재부팅에도 글·그림 보존 ─────────
  const hydrated = React.useRef(false);
  const saveTimer = React.useRef(null);
  const diskAutosaveTimer = React.useRef(null);
  const diskAutosaveState = React.useRef({});
  const diskAutosaveSignatures = React.useRef({});
  const [savedAt, setSavedAt] = useStateApp(null);
  const topicLabel = (window.TOPICS[topic] && window.TOPICS[topic].nameKo) || topic;
  const bookLabel = String(bookNo).padStart(3, "0") + "권";
  const splitDataUrl = (u) => {
    if (!u || u.indexOf(",") < 0) return null;
    const m = /data:image\/(\w+)/.exec(u);
    return { ext: m ? m[1].replace("jpeg", "jpg") : "png", b64: u.split(",")[1] };
  };
  const saveBookFiles = (pages) => {
    if (!(location.protocol === "http:" || location.protocol === "https:")) return Promise.resolve(null);
    return fetch(location.origin + "/save-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topicLabel, book: bookLabel, folderPerPage: true, pages })
    }).then(r => r.json());
  };
  const applyWorkspaceSnapshot = (snap, fallback = {}) => {
    if (!snap || typeof snap !== "object") return;
    
    // 기존 데이터 마이그레이션: Base64 -> URL 변환 (IndexedDB 용량/메모리 확보)
    const getMigratedUrl = (u, spIdx, isComic) => {
      if (u && u.startsWith("data:")) {
        const curSp = window.BOOK_SPREADS[spIdx];
        if (curSp) {
          const tName = window.TOPICS[topic] ? window.TOPICS[topic].nameKo : topic;
          const padBook = String(bookNo).padStart(3, "0");
          const ext = splitDataUrl(u)?.ext || "jpg";
          const id = String(isComic ? curSp.leftPage : curSp.rightPage).padStart(3, "0") + (isComic ? "_a" : "_b");
          return `/pages/${encodeURIComponent(tName)}/${padBook}권/autosave/${id}.${ext}`;
        }
      }
      return u;
    };

    if (snap.completed) {
      const migratedCompleted = { ...snap.completed };
      Object.keys(migratedCompleted).forEach(k => {
        const d = { ...migratedCompleted[k] };
        if (d.comicImg) d.comicImg = getMigratedUrl(d.comicImg, k, true);
        if (d.illustImg) d.illustImg = getMigratedUrl(d.illustImg, k, false);
        migratedCompleted[k] = d;
      });
      setCompleted(migratedCompleted);
    }
    if (snap.coverImg !== undefined) setCoverImg(snap.coverImg);
    if (snap.backImg !== undefined) setBackImg(snap.backImg);
    if (snap.oduniImg !== undefined) setOduniImg(snap.oduniImg);
    if (snap.heroCharacter) setHeroCharacter(snap.heroCharacter);
    if (snap.currentSpread != null) setCurrentSpread(snap.currentSpread);
    else if (fallback.currentSpread != null) setCurrentSpread(fallback.currentSpread);
    if (snap.category != null) setCategory(snap.category);
    if (snap.quote != null) setQuote(snap.quote);
    if (snap.body != null) setBody(snap.body);
    else if (snap.completed && snap.currentSpread && snap.completed[snap.currentSpread] && snap.completed[snap.currentSpread].body != null) {
      setBody(snap.completed[snap.currentSpread].body);
    }
    if (snap.versions != null) setVersions(Array.isArray(snap.versions) ? snap.versions : []);
    if (snap.activeVer != null) setActiveVer(typeof snap.activeVer === "number" ? snap.activeVer : null);
    if (snap.pickedComic !== undefined) setPickedComic(snap.pickedComic);
    if (snap.pickedIllust !== undefined) setPickedIllust(snap.pickedIllust);
    if (snap.comicImg !== undefined) setComicImg(getMigratedUrl(snap.comicImg, snap.currentSpread || fallback.currentSpread || 1, true));
    if (snap.illustImg !== undefined) setIllustImg(getMigratedUrl(snap.illustImg, snap.currentSpread || fallback.currentSpread || 1, false));
    if (snap.savedAt !== undefined) setSavedAt(snap.savedAt);
  };
  const postAutosaveFiles = (meta, pages) => {
    if (!(location.protocol === "http:" || location.protocol === "https:")) return Promise.resolve(null);
    return fetch(location.origin + "/save-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: meta.topicLabel, book: meta.bookLabel, pages })
    }).then(r => r.json());
  };
  const stripImagesForAutosave = (entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const out = { ...entry };
    if (out.comicImg) out.comicImg = "[autosaved-image]";
    if (out.illustImg) out.illustImg = "[autosaved-image]";
    return out;
  };
  const runDiskAutosave = async (reason = "timer") => {
    const s = diskAutosaveState.current || {};
    if (!s.topicLabel || !s.bookLabel) return;
    const pad = n => String(n).padStart(3, "0");
    const now = new Date();
    const completedSnapshot = {};
    Object.keys(s.completed || {}).forEach(k => {
      completedSnapshot[k] = stripImagesForAutosave((s.completed || {})[k]);
    });
    const snapshot = {
      autosavedAt: now.toISOString(),
      autosavedAtKo: now.toLocaleString("ko-KR"),
      reason,
      topic: s.topic,
      topicLabel: s.topicLabel,
      bookNo: s.bookNo,
      bookLabel: s.bookLabel,
      currentSpread: s.currentSpread,
      category: s.category,
      quote: s.quote,
      heroCharacter: s.heroCharacter,
      body: s.body || "",
      activeVer: s.activeVer,
      versions: s.versions || [],
      pickedComic: s.pickedComic || null,
      pickedIllust: s.pickedIllust || null,
      completed: completedSnapshot,
      coverImg: s.coverImg ? "[stored-in-browser]" : null,
      backImg: s.backImg ? "[stored-in-browser]" : null,
      oduniImg: s.oduniImg ? "[stored-in-browser]" : null
    };
    const textFiles = [
      { sub: "autosave", name: "workspace_autosave.json", text: JSON.stringify(snapshot, null, 2) },
      { sub: "autosave", name: "current_body.txt", text: s.body || "" }
    ];
    const curSp = window.BOOK_SPREADS[s.currentSpread];
    if (curSp && curSp.leftMeta.section === "body" && s.body && s.body.trim()) {
      const aId = pad(curSp.leftPage) + "_a";
      textFiles.push({ sub: "autosave", name: aId + ".txt", text: s.body });
    }
    Object.keys(s.completed || {}).forEach(idx => {
      const d = (s.completed || {})[idx] || {};
      const sp = window.BOOK_SPREADS[idx];
      if (!sp || sp.leftMeta.section !== "body" || !d.body) return;
      const aId = pad(sp.leftPage) + "_a";
      textFiles.push({ sub: "autosave", name: aId + ".txt", text: d.body });
    });
    await postAutosaveFiles(s, [{ id: "", files: textFiles }]);

    const imageJobs = [];
    const addImage = (name, dataUrl) => {
      const img = splitDataUrl(dataUrl);
      if (!img) return;
      const fname = name + "." + img.ext;
      const sig = img.ext + "|" + img.b64.length + "|" + img.b64.slice(0, 64) + "|" + img.b64.slice(-64);
      if (diskAutosaveSignatures.current[fname] === sig) return;
      diskAutosaveSignatures.current[fname] = sig;
      imageJobs.push(postAutosaveFiles(s, [{ id: "", files: [{ sub: "autosave", name: fname, b64: img.b64 }] }]));
    };
    if (curSp && curSp.leftMeta.section === "body") {
      addImage(pad(curSp.leftPage) + "_a", s.comicImg);
      addImage(pad(curSp.rightPage) + "_b", s.illustImg);
    }
    Object.keys(s.completed || {}).forEach(idx => {
      const d = (s.completed || {})[idx] || {};
      const sp = window.BOOK_SPREADS[idx];
      if (!sp || sp.leftMeta.section !== "body") return;
      addImage(pad(sp.leftPage) + "_a", d.comicImg);
      addImage(pad(sp.rightPage) + "_b", d.illustImg);
    });
    if (imageJobs.length) await Promise.all(imageJobs);
    console.info(`[disk-autosave] ${s.topicLabel}/${s.bookLabel}/autosave saved (${reason})`);
  };
  const saveCurrentBodyFile = (text) => {
    const curSp = window.BOOK_SPREADS[currentSpread];
    if (!curSp || curSp.leftMeta.section !== "body" || !text || !text.trim()) return;
    const aId = String(curSp.leftPage).padStart(3, "0") + "_a";
    saveBookFiles([{ id: aId, files: [{ name: aId + ".txt", text }] }])
      .catch(e => console.warn("[body-backup] 저장 실패:", e.message));
  };
  const saveCurrentImageFile = async (kind, dataUrl) => {
    const curSp = window.BOOK_SPREADS[currentSpread];
    const img = splitDataUrl(dataUrl);
    if (!curSp || curSp.leftMeta.section !== "body" || !img) return null;
    const id = kind === "comic"
      ? String(curSp.leftPage).padStart(3, "0") + "_a"
      : String(curSp.rightPage).padStart(3, "0") + "_b";
    try {
      const padBook = String(bookNo).padStart(3, "0");
      const tName = window.TOPICS[topic] ? window.TOPICS[topic].nameKo : topic;
      await postAutosaveFiles({ topicLabel: tName, bookLabel: padBook + "권" }, [{ id: "", files: [{ sub: "autosave", name: id + "." + img.ext, b64: img.b64 }] }]);
      return `/pages/${encodeURIComponent(tName)}/${padBook}권/autosave/${id}.${img.ext}?t=${Date.now()}`;
    } catch(e) {
      console.warn("[image-backup] 저장 실패:", e.message);
      return null;
    }
  };
  const setComicImgAndBackup = async (u) => {
    setComicImg(u);
    if (u && u.startsWith("data:")) {
      const url = await saveCurrentImageFile("comic", u);
      if (url) setComicImg(url);
    }
  };
  const setIllustImgAndBackup = async (u) => {
    setIllustImg(u);
    if (u && u.startsWith("data:")) {
      const url = await saveCurrentImageFile("illust", u);
      if (url) setIllustImg(url);
    }
  };
  const resetCurrentBookAfterFinalize = async () => {
    clearTimeout(saveTimer.current);
    setCompleted({});
    setCoverImg(null);
    setBackImg(null);
    setOduniImg(null);
    setCurrentSpread(1);
    setPreviewSpread(0);
    setBody("");
    setRetryLog([]);
    setVersions([]);
    setActiveVer(null);
    setPickedComic(null);
    setPickedIllust(null);
    setComicImg(null);
    setIllustImg(null);
    setSavedAt(null);
    if (window.ArtbookStore) {
      await window.ArtbookStore.set(window.QuoteLedger.workspaceKey(topic, bookNo), {
        completed: {},
        coverImg: null,
        backImg: null,
        oduniImg: null,
        heroCharacter,
        savedAt: null,
        finalizedReset: Date.now()
      });
      await window.ArtbookStore.set("prompt_draft_image", {});
      await window.ArtbookStore.set("prompt_draft_comic", {});
    }
    setTab("workshop");
    setToast({ kind: "ok", text: `✅ ${topicLabel} ${bookNo}권 PDF 저장 완료 — 화면을 비우고 다음 작업 준비 상태로 전환됨` });
    setTimeout(() => setToast(null), 5000);
  };
  const restoreCurrentWorkspace = async () => {
    if (!window.ArtbookStore) return false;
    const key = window.QuoteLedger.workspaceKey(topic, bookNo);
    const snap = await window.ArtbookStore.get(key);
    if (!snap) return false;
    applyWorkspaceSnapshot(snap, { currentSpread: 1 });
    setTab("workshop");
    setToast({ kind: "ok", text: `✓ 현재 작업 ${topicLabel} ${bookNo}권 복구 완료` });
    setTimeout(() => setToast(null), 3000);
    return true;
  };
  useEffect(() => {
    window.restoreCurrentWorkspace = restoreCurrentWorkspace;
    return () => { delete window.restoreCurrentWorkspace; };
  }, [topic, bookNo, topicLabel]);

  diskAutosaveState.current = {
    topic,
    topicLabel,
    bookNo,
    bookLabel,
    currentSpread,
    category,
    quote,
    heroCharacter,
    body,
    retryLog,
    versions,
    activeVer,
    pickedComic,
    pickedIllust,
    comicImg,
    illustImg,
    completed,
    coverImg,
    backImg,
    oduniImg
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!window.ArtbookStore) { hydrated.current = true; return; }
      const newKey = window.QuoteLedger.workspaceKey(topic, bookNo);  // workspace_탈무드_001권
      let snap = await window.ArtbookStore.get(newKey);
      // 마이그레이션: 새 키 없으면 기존 권별 단일 키(workspace_N권) → 그 본문 topic 기준 새 키로 이전
      if (!snap) {
        const legacy = await window.ArtbookStore.get(`workspace_${bookNo}권`);
        if (legacy && typeof legacy === "object") {
          // legacy.completed의 본문 topic으로 새 키 결정
          const c = legacy.completed || {};
          const bodyTopic = [1, 2, 3, 4, 5]
            .map(i => c[i] && c[i].topic)
            .find(Boolean);
          const migrateKey = window.QuoteLedger.workspaceKey(bodyTopic || topic, bookNo);
          await window.ArtbookStore.set(migrateKey, legacy);
          if (migrateKey === newKey) snap = legacy;
        }
      }
      // 더 오래된 마이그레이션: 단일 workspace 키 → 현재 topic+1권
      if (!snap && bookNo === 1) {
        const veryLegacy = await window.ArtbookStore.get("workspace");
        if (veryLegacy && typeof veryLegacy === "object") {
          const c = veryLegacy.completed || {};
          const bodyTopic = [1, 2, 3, 4, 5]
            .map(i => c[i] && c[i].topic)
            .find(Boolean);
          const migrateKey = window.QuoteLedger.workspaceKey(bodyTopic || topic, 1);
          await window.ArtbookStore.set(migrateKey, veryLegacy);
          if (migrateKey === newKey) snap = veryLegacy;
        }
      }
      if (alive && snap && typeof snap === "object") {
        applyWorkspaceSnapshot(snap, { currentSpread: 1 });
      }
      hydrated.current = true;
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    clearInterval(diskAutosaveTimer.current);
    const run = (reason) => {
      runDiskAutosave(reason).catch(e => console.warn("[disk-autosave] 저장 실패:", e.message));
    };
    const first = setTimeout(() => run("startup"), 15000);
    diskAutosaveTimer.current = setInterval(() => run("5min"), 5 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(diskAutosaveTimer.current);
    };
  }, [topic, bookNo]);

  useEffect(() => {
    if (!hydrated.current || !window.ArtbookStore) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const now = new Date();
      const ts = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      const snap = {
        completed, coverImg, backImg, oduniImg, heroCharacter, savedAt: ts,
        currentSpread, category, quote, body, versions, activeVer,
        pickedComic, pickedIllust, comicImg, illustImg
      };
      const ok = await window.ArtbookStore.set(window.QuoteLedger.workspaceKey(topic, bookNo), snap);
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
  }, [completed, coverImg, backImg, oduniImg, heroCharacter, bookNo, topic]);

  // 주제·권 전환 공통 헬퍼 — (newTopic, newBookNo)로 이전 키 저장 + 새 키 로드 + 상태 리셋
  const switchWorkspace = async (newTopic, newBookNo, opts = {}) => {
    const prevTopic = topic, prevBookNo = bookNo;
    if (newTopic === prevTopic && newBookNo === prevBookNo) return;

    try {
      if (window.ArtbookStore) {
        clearTimeout(saveTimer.current);
        const now = new Date();
        const ts = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
        // 1) 이전 주제+권 데이터 즉시 저장
        await window.ArtbookStore.set(window.QuoteLedger.workspaceKey(prevTopic, prevBookNo), {
          completed, coverImg, backImg, oduniImg, heroCharacter, savedAt: ts,
          currentSpread, category, quote, body, versions, activeVer,
          pickedComic, pickedIllust, comicImg, illustImg
        });
        // 2) 새 주제+권 데이터 로드
        const next = await window.ArtbookStore.get(window.QuoteLedger.workspaceKey(newTopic, newBookNo));
        if (next && typeof next === "object") {
          const T = window.TOPICS[newTopic] || window.TOPICS[newTopic || "talmud"];
          const tName = T ? T.nameKo : (newTopic || "탈무드");
          const padBook = String(newBookNo).padStart(3, "0");
          const migrate = (u, spIdx, isComic) => {
            if (u && typeof u === "string" && (u.startsWith("blob:") || u.startsWith("data:"))) {
              const curSp = window.BOOK_SPREADS[spIdx];
              if (curSp) {
                const ext = (u.indexOf("image/png") > 0) ? "png" : "jpg";
                const id = String(isComic ? curSp.leftPage : curSp.rightPage).padStart(3, "0") + (isComic ? "_a" : "_b");
                return `/pages/${encodeURIComponent(tName)}/${padBook}권/autosave/${id}.${ext}`;
              }
            }
            return u;
          };

          const migratedCompleted = { ...(next.completed || {}) };
          Object.keys(migratedCompleted).forEach(k => {
            const d = { ...migratedCompleted[k] };
            if (d.comicImg) d.comicImg = migrate(d.comicImg, k, true);
            if (d.illustImg) d.illustImg = migrate(d.illustImg, k, false);
            migratedCompleted[k] = d;
          });

          setCompleted(migratedCompleted);
          setCoverImg(next.coverImg || null);
          setBackImg(next.backImg || null);
          setOduniImg(next.oduniImg || null);
          setHeroCharacter(next.heroCharacter || "sangchu");
          setSavedAt(next.savedAt || null);
          
          const cur1 = migratedCompleted[1];
          if (cur1) {
            setBody(cur1.body || "");
            setPickedComic(cur1.comicFile || null);
            setPickedIllust(cur1.illustFile || null);
            setComicImg(cur1.comicImg || null);
            setIllustImg(cur1.illustImg || null);
            setVersions(Array.isArray(cur1.versions) ? cur1.versions : []);
            setActiveVer(typeof cur1.activeVerIdx === "number" ? cur1.activeVerIdx : null);
            if (cur1.quote != null) setQuote(cur1.quote);
            if (cur1.category != null) setCategory(cur1.category);
          } else {
            setBody("");
            setPickedComic(null);
            setPickedIllust(null);
            setComicImg(null);
            setIllustImg(null);
            setVersions([]);
            setActiveVer(null);
            setQuote("");
          }
        } else {
          setCompleted({});
          setCoverImg(null);
          setBackImg(null);
          setOduniImg(null);
          setHeroCharacter("sangchu");
          setSavedAt(null);
          
          setBody("");
          setPickedComic(null);
          setPickedIllust(null);
          setComicImg(null);
          setIllustImg(null);
          setVersions([]);
          setActiveVer(null);
          setQuote("");
        }
      }
    } catch (e) {
      console.warn("[workspace-switch] 저장/로드 실패:", e.message);
    }

    // 3) 작업실 상태 리셋
    setCurrentSpread(1);
    setPreviewSpread(0);
    setRetryLog([]);

    // 4) 주제·권 갱신
    if (newTopic !== prevTopic) setTopic(newTopic);
    setBookNoByTopic(prev => ({ ...prev, [newTopic]: newBookNo }));

    const T = window.TOPICS[newTopic];
    const tName = T ? T.nameKo : newTopic;
    if (!opts.silent) {
      setToast({ kind: "ok", text: `📘 ${tName} ${newBookNo}권으로 전환됨` });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // 권 전환 — 현재 주제 안에서 권만 바꿈
  const onChangeBookNo = async (newBookNo) => {
    if (newBookNo === bookNo) return;
    await switchWorkspace(topic, newBookNo);
  };

  // 주제 전환 — 그 주제의 마지막 작업 권으로 자동 이동
  const onChangeTopic = async (newTopic) => {
    if (newTopic === topic) return;
    const newBookNo = window.QuoteLedger.bookNoOf(bookNoByTopic, newTopic);
    await switchWorkspace(newTopic, newBookNo);
  };

  // 주제와 권 동시 전환 (복구 패널의 레이스컨디션 방지)
  const onChangeTopicAndBookNo = async (newTopic, newBookNo) => {
    if (newTopic === topic && newBookNo === bookNo) return;
    await switchWorkspace(newTopic, newBookNo);
  };

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
      if (e.key === "ArrowRight") setPreviewSpread(i => Math.min(5, i + 1));
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
      if (saved.heroCharacter) setHeroCharacter(saved.heroCharacter);
      if (saved.book) setBookNo(saved.book);
      setVersions(Array.isArray(saved.versions) ? saved.versions : []); // 생성 이력 복원
      setActiveVer(typeof saved.activeVerIdx === "number" ? saved.activeVerIdx : null); // 선택 버전 복원
    } else {
      // 새 스프레드 — 완전 리셋: 카테고리부터 스토리·프롬프트 새로 시작
      setBody("");
      setPickedComic(null);
      setPickedIllust(null);
      setComicImg(null);
      setIllustImg(null);
      const T0 = window.TOPICS[topic];
      if (T0 && T0.categories && T0.categories.length) setCategory(T0.categories[0]);
      setQuote("");
      setVersions([]);
      setActiveVer(null);
    }
    setRetryLog([]);
  }, [currentSpread]);

  const sp = window.BOOK_SPREADS[currentSpread];
  const leftFile = `${String(sp.leftPage).padStart(3, "0")}_a.jpg`;
  const rightFile = `${String(sp.rightPage).padStart(3, "0")}_b.jpg`;

  const completedForView = useMemoApp(() => {
    const curSp = window.BOOK_SPREADS[currentSpread];
    const draftHasContent = !!(
      (body && body.trim()) || comicImg || illustImg ||
      (versions && versions.length) || pickedComic || pickedIllust
    );
    if (!draftHasContent || !curSp || curSp.leftMeta.section !== "body") return completed;
    if (completed[currentSpread] && completed[currentSpread].confirmed) return completed;
    const pad = n => String(n).padStart(3, "0");
    return {
      ...completed,
      [currentSpread]: {
        ...(completed[currentSpread] || {}),
        body,
        topic, category, quote, heroCharacter,
        book: bookNo,
        comicFile: pickedComic || `${pad(curSp.leftPage)}_a.jpg`,
        illustFile: pickedIllust || `${pad(curSp.rightPage)}_b.jpg`,
        comicImg: comicImg || completed[currentSpread]?.comicImg || null,
        illustImg: illustImg || completed[currentSpread]?.illustImg || null,
        versions,
        activeVerIdx: activeVer,
        draft: true
      }
    };
  }, [completed, currentSpread, body, comicImg, illustImg, versions, pickedComic, pickedIllust, topic, category, quote, heroCharacter, bookNo, activeVer]);

  // 이 스프레드가 '확정'되었나 → 확정 시 새 본문이 덮어쓰지 못하게 잠금
  const spreadLocked = !!(completed[currentSpread] && completed[currentSpread].confirmed);

  const onUnlockSpread = () => {
    setCompleted(prev => {
      const cur = prev[currentSpread];
      if (!cur) return prev;
      const { confirmed, confirmedAt, ...rest } = cur;
      return { ...prev, [currentSpread]: rest };
    });
    setToast({ kind: "ok", text: "🔓 이 스프레드 잠금 해제 — 이제 새 본문을 적용할 수 있습니다" });
    setTimeout(() => setToast(null), 3000);
  };

  // 본문이 저장되면 즉시 완성함에 광안 반영 (메모·미리보기 연동)
  const saveBodyToBook = (text) => {
    if (completed[currentSpread] && completed[currentSpread].confirmed) {
      setToast({ kind: "warn", text: `🔒 확정된 스프레드(본문#${String(currentSpread).padStart(2,"0")})입니다 — 잠금 해제 후에만 새 본문이 적용됩니다` });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setCompleted(prev => ({
      ...prev,
      [currentSpread]: {
        ...(prev[currentSpread] || {}),
        body: text,
        topic, category, quote, heroCharacter,
        comicFile: leftFile,
        illustFile: rightFile,
        comicImg: comicImg || prev[currentSpread]?.comicImg || null,
        illustImg: illustImg || prev[currentSpread]?.illustImg || null
      }
    }));
    saveCurrentBodyFile(text);
  };

  // 생성한 본문 후보들(versions)을 해당 스프레드에 영구 보존
  // → 프롬프트 페이지 갔다 와도/새로고침해도 픽한 것·후보 전부 유지(복구 가능)
  useEffect(() => {
    if (!versions || versions.length === 0) return;
    if (completed[currentSpread] && completed[currentSpread].confirmed) return; // 확정 스프레드 보호
    setCompleted(prev => {
      const cur = prev[currentSpread] || {};
      if (cur.versions === versions) return prev;
      return { ...prev, [currentSpread]: { ...cur, versions, topic, category, quote, heroCharacter } };
    });
  }, [versions, heroCharacter]);

  // 선택된 버전 인덱스(activeVer)도 영구 저장 — 프롬프트 페이지 왕복 후에도 어떤 버전을 골랐는지 표시 유지
  useEffect(() => {
    if (completed[currentSpread] && completed[currentSpread].confirmed) return;
    setCompleted(prev => {
      const cur = prev[currentSpread] || {};
      // 빈 스프레드(versions 없음)에 null 저장하면서 빈 entry 만들지 않게
      if (!cur.versions && activeVer == null) return prev;
      if (cur.activeVerIdx === activeVer) return prev;
      return { ...prev, [currentSpread]: { ...cur, activeVerIdx: activeVer } };
    });
  }, [activeVer]);

  // 선택한 명언(구절)을 현재 스프레드의 quote로 즉시 반영 (확정 잠금 아닐 때)
  // → 명언 목록의 줄긋기·확정표시가 '그 스프레드에 고른 구절'과 정확히 일치
  useEffect(() => {
    const cur = completed[currentSpread];
    if (!cur || cur.confirmed) return;            // 미작업/확정 스프레드는 건드리지 않음
    if ((cur.quote || "") === quote) return;
    setCompleted(prev => {
      const c = prev[currentSpread];
      if (!c || c.confirmed) return prev;
      return { ...prev, [currentSpread]: { ...c, quote } };
    });
  }, [quote]);

  // MAKE 가능 조건: 본문 + 이미지 2장 첨부 (폴더 선택은 참고용)
  const canMake = sp.leftMeta.section === "body"
    && body.trim().length > 0
    && comicImg && illustImg;

  const onMake = () => {
    if (completed[currentSpread] && completed[currentSpread].confirmed) {
      setToast({ kind: "warn", text: `🔒 확정된 스프레드입니다 — 다시 만들려면 ‘잠금 해제’ 후 진행하세요` });
      setTimeout(() => setToast(null), 4000);
      return;
    }
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
        topic, category, quote, heroCharacter, book: bookNo
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
      const getExt = (u) => { const m = u.match(/\.([a-z0-9]+)(?:[\?#]|$)/i); return m ? m[1] : "jpg"; };
      const aImgUrl = comicImg && !comicImg.startsWith("data:") ? comicImg : null;
      const bImgUrl = illustImg && !illustImg.startsWith("data:") ? illustImg : null;
      const aImgB64 = comicImg && comicImg.startsWith("data:") ? splitDataUrl(comicImg) : null;
      const bImgB64 = illustImg && illustImg.startsWith("data:") ? splitDataUrl(illustImg) : null;
      
      const payload = {
        topic: topicLabel,
        book: bookLabel,
        folderPerPage: true,
        pages: [
          {
            id: aId,
            files: [
              { name: aId + ".txt", text: body },
              ...(aImgB64 ? [{ name: aId + "." + aImgB64.ext, b64: aImgB64.b64 }] : 
                 (aImgUrl ? [{ name: aId + "." + getExt(aImgUrl), copyFrom: aImgUrl }] : []))
            ]
          },
          {
            id: bId,
            files: [
              ...(bImgB64 ? [{ name: bId + "." + bImgB64.ext, b64: bImgB64.b64 }] : 
                 (bImgUrl ? [{ name: bId + "." + getExt(bImgUrl), copyFrom: bImgUrl }] : []))
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
        body: JSON.stringify({ topic: topicLabel, book: bookLabel, ids: [aF, bF] })
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
    setCurrentSpread(Math.min(5, currentSpread + 1));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="brand-mark">아트북 제작</div>
          <button 
            className="btn"
            style={{ fontSize: 11, background: "#a83232", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}
            onClick={async () => {
              if (!confirm("현재 권의 PDF/이미지 8종을 전체 생성하시겠습니까?\n(화면이 자동으로 전환되며 시간이 다소 소요됩니다)")) return;
              
              const currentTab = tab;
              
              try {
                // 1. 미리보기 4종 생성
                setToast({ kind: "ok", text: "미리보기 산출물(4종) 생성 중..." });
                window.gotoTab("preview");
                await new Promise(r => setTimeout(r, 1000));
                if (window._exportPreview4) {
                  await window._exportPreview4();
                } else {
                  console.warn("미리보기 내보내기 함수를 찾을 수 없습니다.");
                }
                
                // 2. 책구조 4종 생성
                setToast({ kind: "ok", text: "책구조 산출물(4종) 생성 중..." });
                window.gotoTab("book");
                await new Promise(r => setTimeout(r, 1000));
                if (window._exportStructure4) {
                  await window._exportStructure4();
                } else {
                  console.warn("책구조 내보내기 함수를 찾을 수 없습니다.");
                }
                
                setToast({ kind: "ok", text: "✅ 8종 생성 완료!" });
                setTimeout(() => setToast(null), 3000);
                
                // 3. 완료 후 PDF 뷰어로 이동
                window.gotoTab("pdf-viewer");
                
              } catch (e) {
                console.error(e);
                alert("일괄 생성 중 오류 발생: " + e.message);
                setToast(null);
                window.gotoTab(currentTab);
              }
            }}
          >
            🚀 8개 전체파일 생성
          </button>
        </div>
        <div className="tabs">
          <button className={"tab" + (tab === "workshop" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("workshop"); }}>작업실</button>
          <button className={"tab" + (tab === "book" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("book"); }}>책 구조</button>
          <button className={"tab" + (tab === "preview" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("preview"); }}>미리보기</button>
          <button className={"tab" + (tab === "usage" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("usage"); }}>사용 현황</button>
          <button className={"tab" + (tab === "pdf-viewer" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("pdf-viewer"); }} style={{color:"#27633b"}}>PDF 뷰어</button>
          <button className={"tab" + (tab === "recovery" && !promptPage ? " active" : "")} onClick={() => { setPromptPage(null); setTab("recovery"); }} style={{color:"#a83232"}}>복구</button>
        </div>
        <div className="header-meta">
          <label className="book-select">
            {window.TOPICS[topic].nameKo}
            <select value={bookNo} onChange={e => onChangeBookNo(parseInt(e.target.value, 10))}>
              {Array.from({ length: window.QuoteLedger.SERIES_BOOKS }, (_, i) => i + 1).map(b => (
                <option key={b} value={b}>{b}권</option>
              ))}
            </select>
            / {window.QuoteLedger.SERIES_BOOKS}권
          </label>
          <span>완성 {Object.keys(completed).filter(k => parseInt(k) >= 1 && parseInt(k) <= 5).length}/5</span>
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
          ctx={{ topic, category, quote, body, heroCharacter }}
          onBack={() => setPromptPage(null)}
        />
      ) : (
        <>
          {tab === "workshop" && (
        <Workshop
          topic={topic} setTopic={setTopic} onChangeTopic={onChangeTopic}
          heroCharacter={heroCharacter} setHeroCharacter={setHeroCharacter}
          characters={ODUNI_CHARACTERS}
          category={category} setCategory={setCategory}
          quote={quote} setQuote={setQuote}
          currentSpread={currentSpread} setCurrentSpread={setCurrentSpread}
          body={body} setBody={setBody}
          retryLog={retryLog} setRetryLog={setRetryLog}
          busy={busy} setBusy={setBusy}
          versions={versions} setVersions={setVersions}
          activeVer={activeVer} setActiveVer={setActiveVer}
          onSaveToBook={saveBodyToBook}
          spreadLocked={spreadLocked} onUnlockSpread={onUnlockSpread}
          pickedComic={pickedComic} setPickedComic={setPickedComic}
          pickedIllust={pickedIllust} setPickedIllust={setPickedIllust}
          comicImg={comicImg} setComicImg={setComicImgAndBackup}
          illustImg={illustImg} setIllustImg={setIllustImgAndBackup}
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
          completed={completedForView}
          onPickSpread={(idx) => {
            setCurrentSpread(idx);
            setTab("workshop");
          }}
          onOpenPreview={(idx) => {
            setPreviewSpread(idx);
            setTab("preview");
          }}
          topic={topic}
          coverImg={coverImg} backImg={backImg}
          onCoverUpload={setCoverImg} onBackUpload={setBackImg}
          bookNo={bookNo}
          oduniImg={oduniImg}
        />
      )}

      {tab === "preview" && (
        <BookPreview
          spreads={window.BOOK_SPREADS}
          completed={completedForView} setCompleted={setCompleted}
          onPreviewBodyChange={(idx, patch) => {
            setCurrentSpread(idx);
            if (patch && patch.body != null) setBody(patch.body);
            setCompleted(prev => ({
              ...prev,
              [idx]: {
                ...(prev[idx] || {}),
                ...(patch || {})
              }
            }));
          }}
          topic={topic}
          coverImg={coverImg} backImg={backImg}
          oduniImg={oduniImg} setOduniImg={setOduniImg}
          comicSide={tweakValues.comicSide}
          currentIdx={previewSpread} setCurrentIdx={setPreviewSpread}
          bookNo={bookNo}
          onBookFinalized={resetCurrentBookAfterFinalize}
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
          bookNo={bookNo}
          onChangeBookNo={onChangeBookNo}
          topic={topic}
          onChangeTopic={onChangeTopic}
          onChangeTopicAndBookNo={onChangeTopicAndBookNo}
        />
      )}

      {tab === "pdf-viewer" && (
        <window.PdfViewer
          currentTopic={topic}
          onChangeTopic={onChangeTopic}
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
    topic, setTopic, onChangeTopic, category, setCategory, quote, setQuote,
    heroCharacter, setHeroCharacter, characters,
    currentSpread, setCurrentSpread,
    body, setBody, retryLog, setRetryLog, busy, setBusy,
    versions, setVersions, activeVer, setActiveVer, onSaveToBook,
    spreadLocked, onUnlockSpread,
    pickedComic, setPickedComic, pickedIllust, setPickedIllust,
    comicImg, setComicImg, illustImg, setIllustImg,
    completed, leftFile, rightFile, canMake, onMake, onDeleteSpread, goNextBody, tweakValues,
    ledger, bookNo
  } = props;

  const T = window.TOPICS[topic];
  const sp = window.BOOK_SPREADS[currentSpread];
  const isBody = sp.leftMeta.section === "body";
  const heroList = characters || ODUNI_CHARACTERS;

  return (
    <div className="workshop">
      {/* 왼쪽 패널: 입력 */}
      <aside className="panel">
        <div className="panel-section">
          <h4 className="panel-title">오둥이 주인공</h4>
          <div className="hero-grid">
            {heroList.map(c => (
              <button
                key={c.id}
                className={"hero-card" + (heroCharacter === c.id ? " active" : "")}
                onClick={() => setHeroCharacter(c.id)}
                type="button"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-title">주제</h4>
          <div className="topic-grid">
            {Object.entries(window.TOPICS).map(([k, v]) => (
              <div
                key={k}
                className={"topic-card" + (topic === k ? " active" : "")}
                onClick={() => onChangeTopic && onChangeTopic(k)}
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
              onChange={e => {
                const q = e.target.value;
                setQuote(q);
                setBody(prev => {
                  if (!prev) return q + "\n\n";
                  const lines = prev.split("\n");
                  lines[0] = q;
                  return lines.join("\n");
                });
              }}
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
            setQuote={(q) => {
              setQuote(q);
              setBody(prev => {
                if (!prev) return q + "\n\n";
                const lines = prev.split("\n");
                lines[0] = q;
                return lines.join("\n");
              });
            }}
            ledger={ledger}
            bookNo={bookNo}
            currentSpread={currentSpread}
            completed={completed}
            heroName={(heroList.find(c => c.id === heroCharacter) || heroList[0]).name}
          />
        </div>

        <div className="panel-section">
          {spreadLocked && (
            <div style={{
              background: "#3a2a2a", color: "#f6ecd6", padding: "10px 12px",
              border: "1px solid #a83232", marginBottom: 12, fontSize: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10
            }}>
              <span>🔒 확정된 스프레드입니다. 새 본문은 적용되지 않습니다.</span>
              <button className="btn" style={{ fontSize: 11 }} onClick={onUnlockSpread}>🔓 잠금 해제</button>
            </div>
          )}
          <window.AiWriter
            topic={topic} category={category} quote={quote}
            output={body} setOutput={setBody}
            retryLog={retryLog} setRetryLog={setRetryLog}
            busy={busy} setBusy={setBusy}
            versions={versions} setVersions={setVersions}
            activeVer={activeVer} setActiveVer={setActiveVer}
            onSaveToBook={onSaveToBook}
            locked={spreadLocked}
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
              {leftFile} · {rightFile} · pp.{String(sp.leftPage).padStart(3,"0")}–{String(sp.rightPage).padStart(3,"0")} · 스프레드 {currentSpread + 1}/6
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
              disabled={currentSpread >= 5}
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
