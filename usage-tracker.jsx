/* usage-tracker.jsx — 시리즈 명언 사용 대장(중복 0) + picker + 사용 현황
   ledger 구조: { [topic]: { [quote]: { book, spread, leftPage, rightPage, category, at } } }
*/

const { useState: useStateUT, useMemo: useMemoUT } = React;

const LEDGER_KEY = "artbook_quote_ledger_v1";
const BOOKNO_KEY = "artbook_book_no_v1";                 // (legacy) 글로벌 단일 권 번호
const BOOKNO_BY_TOPIC_KEY = "artbook_book_no_by_topic_v1"; // 주제별 권 번호 (2026-05-21~)
const SERIES_BOOKS = 200;    // 주제별 200권 (1주제 명언 풀 1000개 ÷ 5편 = 200권)
const WORKS_PER_BOOK = 5;    // 권당 본문 5편 (스프레드 5)
const TARGET_PER_TOPIC = SERIES_BOOKS * WORKS_PER_BOOK; // 1000 (= 카테고리 10 × 100, 풀 전체 사용)

function ledgerLoad() {
  try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "{}"); }
  catch (e) { return {}; }
}
function ledgerSave(obj) {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(obj)); } catch (e) {}
}
// 주제별 권 번호 — { talmud: 1, nietzsche: 1, schopenhauer: 1 }
function bookNoByTopicLoad() {
  try {
    const obj = JSON.parse(localStorage.getItem(BOOKNO_BY_TOPIC_KEY) || "null");
    if (obj && typeof obj === "object") return obj;
  } catch (e) {}
  // 마이그레이션: 기존 단일 BOOKNO_KEY 값을 모든 주제 권으로 복사 (사장님 작업 데이터 보존)
  const legacy = parseInt(localStorage.getItem(BOOKNO_KEY) || "1", 10);
  const n = (legacy >= 1 && legacy <= SERIES_BOOKS) ? legacy : 1;
  return { talmud: n, nietzsche: n, schopenhauer: n };
}
function bookNoByTopicSave(obj) {
  try { localStorage.setItem(BOOKNO_BY_TOPIC_KEY, JSON.stringify(obj || {})); } catch (e) {}
}
function bookNoOf(byTopic, topic) {
  const n = byTopic && byTopic[topic];
  return (n >= 1 && n <= SERIES_BOOKS) ? n : 1;
}
// 워크스페이스 IndexedDB 키 — 주제+권 조합 (`workspace_탈무드_001권`)
function workspaceKey(topic, bookNo) {
  const T = window.TOPICS && window.TOPICS[topic];
  const name = T ? T.nameKo : (topic || "기타");
  const n = String(bookNo || 1).padStart(3, "0");
  return `workspace_${name}_${n}권`;
}
// (legacy) 단일 권 번호 호환
function bookNoLoad() {
  const n = parseInt(localStorage.getItem(BOOKNO_KEY) || "1", 10);
  return (n >= 1 && n <= SERIES_BOOKS) ? n : 1;
}
function bookNoSave(n) {
  try { localStorage.setItem(BOOKNO_KEY, String(n)); } catch (e) {}
}

/* 특정 명언이 어디에 쓰였는지 조회 (없으면 null) */
function findUse(ledger, topic, quote) {
  if (!quote) return null;
  const t = ledger && ledger[topic];
  if (!t) return null;
  return t[quote.trim()] || null;
}

/* 명언 등록 — 같은 (book,spread)면 덮어쓰기, 다른 곳에 이미 있으면 false 반환 */
function ledgerRegister(ledger, topic, quote, info) {
  const q = (quote || "").trim();
  if (!q) return { ok: false, reason: "empty" };
  const t = { ...(ledger[topic] || {}) };
  const exist = t[q];
  if (exist && !(exist.book === info.book && exist.spread === info.spread)) {
    return { ok: false, reason: "duplicate", at: exist };
  }
  t[q] = { ...info, at: Date.now() };
  return { ok: true, next: { ...ledger, [topic]: t } };
}

/* (book,spread) 자리에 등록된 명언 제거 — 본문 교체 시 정리용 */
function ledgerClearSlot(ledger, topic, book, spread) {
  const t = { ...(ledger[topic] || {}) };
  let changed = false;
  for (const q of Object.keys(t)) {
    if (t[q].book === book && t[q].spread === spread) { delete t[q]; changed = true; }
  }
  return changed ? { ...ledger, [topic]: t } : ledger;
}

function topicUsedCount(ledger, topic) {
  return Object.keys((ledger && ledger[topic]) || {}).length;
}

window.QuoteLedger = {
  KEY: LEDGER_KEY,
  load: ledgerLoad, save: ledgerSave,
  bookNoLoad, bookNoSave,
  bookNoByTopicLoad, bookNoByTopicSave, bookNoOf, workspaceKey,
  findUse, register: ledgerRegister, clearSlot: ledgerClearSlot,
  topicUsedCount,
  SERIES_BOOKS, WORKS_PER_BOOK, TARGET_PER_TOPIC
};

/* ───────── 명언 Picker — 폼박스 아래 100개 리스트 ───────── */
function QuotePicker(props) {
  const { topic, category, quote, setQuote, ledger, bookNo, currentSpread, completed, heroName } = props;
  const [filter, setFilter] = useStateUT("");
  const [onlyUnused, setOnlyUnused] = useStateUT(false);
  const [copied, setCopied] = useStateUT(false);

  // 챗GPT용 본문 생성 프롬프트를 클립보드에 복사 (사장님이 챗GPT 채팅창에 붙여넣기)
  const onCopyChatGPTPrompt = async () => {
    if (!quote.trim()) return;
    const hero = heroName || "오둥이";
    const text = `주인공은 ${hero}이다. ${hero}를 이 철학 이야기의 중심 인물로 설정한다.
"${quote.trim()}"
한국어 20줄 이내, 각 줄은 짧게 (한 문장 한 줄)
명언을 직접 인용하거나 반복 설명하지 말고,
이야기로 명언의 진실을 드러낼 것`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("[copy] 클립보드 복사 실패:", e.message);
      alert("복사 실패. 콘솔을 확인해주세요.");
    }
  };

  const pool = (window.QUOTES && window.QUOTES[topic] && window.QUOTES[topic][category]) || [];

  // 스프레드에 '선택한 명언(구절)' 기준 — 명언 박스 = 그 스프레드의 구절
  const norm = (s) => (s || "").replace(/^["'“”‘’\s]+|["'“”‘’\s.]+$/g, "").trim();
  const usedMap = useMemoUT(() => {
    const m = {};
    const c = completed || {};
    Object.keys(c).forEach(idx => {
      const d = c[idx] || {};
      const firstLine = (d.body || "").split("\n").map(l => l.trim()).find(Boolean) || "";
      // 확정 스프레드 = 실제 인쇄될 본문 첫 줄(진짜 구절) 기준
      // 미확정 스프레드 = 작업 중 고른 명언(quote) 기준
      const key = d.confirmed
        ? (norm(firstLine) || norm(d.quote))
        : (norm(d.quote) || norm(firstLine));
      if (!key) return;
      const prev = m[key];
      if (!prev || (d.confirmed && !prev.confirmed)) {
        m[key] = { spread: Number(idx), confirmed: !!d.confirmed };
      }
    });
    return m;
  }, [completed]);

  const rows = useMemoUT(() => {
    const f = filter.trim();
    const c = completed || {};
    return pool.map((q, i) => {
      // 실제 책 내용(completed)만 신뢰 — 표시는 보이는 것과 정확히 일치
      const ce = usedMap[norm(q)];
      const le = findUse(ledger, topic, q);
      let state = "free", info = null;
      if (ce) {
        // 이 책의 어떤 스프레드가 실제 이 명언을 쓰고 있음
        state = ce.confirmed ? "confirmed" : "used";  // 확정 = 쫙 줄(중복 방지)
        info = { spread: ce.spread };
      } else if (le && Number(le.book) !== Number(bookNo)) {
        // 다른 권(시리즈)에서만 사용 — stale 동일권 ledger는 무시
        state = "used"; info = { spread: le.spread, book: le.book, series: true };
      }
      return { q, i, state, info };
    }).filter(r => {
      if (onlyUnused && (r.state === "used" || r.state === "confirmed")) return false;
      if (f && r.q.indexOf(f) === -1) return false;
      return true;
    });
  }, [pool, filter, onlyUnused, usedMap, ledger, topic, currentSpread, bookNo, completed]);

  const usedInCat = pool.reduce((n, q) => n + ((usedMap[norm(q)] || findUse(ledger, topic, q)) ? 1 : 0), 0);
  const usedTopic = topicUsedCount(ledger, topic);

  return (
    <div className="qp">
      <div className="qp-head">
        <span className="qp-title">명언 풀 · {category}</span>
        <span className="qp-counts">
          이 카테고리 <b>{pool.length - usedInCat}</b>/{pool.length} 미사용 ·
          {" "}주제 누적 <b style={{color: usedTopic >= TARGET_PER_TOPIC ? "var(--ink)" : undefined}}>{usedTopic}</b>/{TARGET_PER_TOPIC}
        </span>
      </div>
      <div className="qp-tools">
        <input
          className="qp-search"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="명언 검색…"
        />
        <label className="qp-only">
          <input type="checkbox" checked={onlyUnused} onChange={e => setOnlyUnused(e.target.checked)} />
          미사용만
        </label>
      </div>
      <div className="qp-list">
        {rows.length === 0 && <div className="qp-empty">표시할 명언이 없습니다.</div>}
        {rows.map(r => {
          const selected = quote.trim() === r.q.trim();
          return (
            <button
              key={r.i}
              className={"qp-item state-" + r.state + (selected ? " selected" : "")}
              onClick={() => setQuote(r.q)}
              title={
                r.state === "confirmed" ? `✓ 확정된 본문#${String(r.info.spread).padStart(2, "0")} — 중복 사용 금지`
                : r.state === "used" ? (r.info && r.info.series ? `다른 권(${r.info.book}권)에서 사용` : `본문#${String(r.info.spread).padStart(2, "0")}에 사용(미확정)`)
                : "미사용"
              }
            >
              <span className="qp-no">{String(r.i + 1).padStart(3, "0")}</span>
              <span className="qp-text">{r.q}</span>
              {r.state === "confirmed" && (
                <span className="qp-badge confirmed">✓ 확정 본문{String(r.info.spread).padStart(2, "0")}</span>
              )}
              {r.state === "used" && (
                <span className="qp-badge used">{r.info && r.info.series ? `📕 ${r.info.book}권` : `· 본문${String(r.info.spread).padStart(2, "0")}`}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="qp-foot" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span>선택한 명언이 위 폼박스에 들어갑니다 · <b className="dot-used">📕</b> 표시는 시리즈에서 이미 쓴 구절(중복 방지)</span>
        <button
          className="btn ghost"
          disabled={!quote.trim()}
          onClick={onCopyChatGPTPrompt}
          title="선택된 명언으로 챗GPT 본문 생성용 프롬프트를 클립보드에 복사"
          style={{
            fontSize: 11, padding: "5px 10px", whiteSpace: "nowrap",
            background: copied ? "#2f5d3a" : undefined,
            color: copied ? "#f6ecd6" : undefined
          }}
        >
          {copied ? "✓ 복사됨" : "📋 챗GPT용 복사"}
        </button>
      </div>
    </div>
  );
}

/* ───────── 사용 현황 — 권별/카테고리별 사용 내역 ───────── */
function UsageIndex(props) {
  const { topic, ledger, setLedger, bookNo, setBookNo } = props;
  const T = window.TOPICS[topic];
  const entries = useMemoUT(() => {
    const t = (ledger && ledger[topic]) || {};
    return Object.keys(t).map(q => ({ q, ...t[q] }));
  }, [ledger, topic]);

  const byBook = useMemoUT(() => {
    const m = {};
    for (let b = 1; b <= SERIES_BOOKS; b++) m[b] = [];
    entries.forEach(e => { (m[e.book] = m[e.book] || []).push(e); });
    Object.values(m).forEach(arr => arr.sort((a, b) => a.spread - b.spread));
    return m;
  }, [entries]);

  const used = entries.length;
  const pct = Math.min(100, Math.round((used / TARGET_PER_TOPIC) * 100));

  const exportText = () => {
    let out = `[${T.nameKo} 시리즈 명언 사용 대장] ${used}/${TARGET_PER_TOPIC}\n`;
    for (let b = 1; b <= SERIES_BOOKS; b++) {
      const arr = byBook[b];
      if (!arr || arr.length === 0) continue;
      out += `\n■ ${b}권 (${arr.length}/${WORKS_PER_BOOK})\n`;
      arr.forEach(e => {
        out += `  - 본문${String(e.spread).padStart(2, "0")} [${e.category}] ${e.q}\n`;
      });
    }
    if (navigator.clipboard) navigator.clipboard.writeText(out);
    return out;
  };

  const clearBook = (b) => {
    if (!window.confirm(`${b}권에 등록된 명언 ${(byBook[b] || []).length}개를 사용 대장에서 비웁니다. 계속할까요?`)) return;
    const t = { ...((ledger && ledger[topic]) || {}) };
    Object.keys(t).forEach(q => { if (t[q].book === b) delete t[q]; });
    setLedger({ ...ledger, [topic]: t });
  };

  const removeOne = (q) => {
    const t = { ...((ledger && ledger[topic]) || {}) };
    delete t[q];
    setLedger({ ...ledger, [topic]: t });
  };

  return (
    <div className="usage-view">
      <div className="usage-top">
        <div>
          <div className="usage-h">{T.nameKo} 시리즈 사용 현황</div>
          <div className="usage-sub">
            주제별 30권 × 본문 24편 = 목표 {TARGET_PER_TOPIC} · 시리즈 전체 중복 0 추적
          </div>
        </div>
        <div className="usage-actions">
          <label className="usage-book">
            작업 권:
            <select value={bookNo} onChange={e => setBookNo(parseInt(e.target.value, 10))}>
              {Array.from({ length: SERIES_BOOKS }, (_, i) => i + 1).map(b => (
                <option key={b} value={b}>{b}권 ({(byBook[b] || []).length}/{WORKS_PER_BOOK})</option>
              ))}
            </select>
          </label>
          <button className="btn ghost" onClick={exportText}>대장 복사</button>
        </div>
      </div>

      <div className="usage-bar">
        <div className="usage-bar-fill" style={{ width: pct + "%" }}></div>
        <span className="usage-bar-label">{used} / {TARGET_PER_TOPIC} ({pct}%)</span>
      </div>

      <div className="usage-books">
        {Array.from({ length: SERIES_BOOKS }, (_, i) => i + 1).map(b => {
          const arr = byBook[b] || [];
          const isCur = b === bookNo;
          return (
            <div key={b} className={"usage-book-card" + (isCur ? " current" : "") + (arr.length >= WORKS_PER_BOOK ? " full" : "")}>
              <div className="ubc-head">
                <span className="ubc-no">{b}권</span>
                <span className="ubc-cnt">{arr.length}/{WORKS_PER_BOOK}</span>
                {isCur && <span className="ubc-tag">작업중</span>}
                <span className="ubc-spacer"></span>
                {arr.length > 0 && (
                  <button className="ubc-clear" onClick={() => clearBook(b)} title="이 권 사용 기록 비우기">비우기</button>
                )}
              </div>
              {arr.length === 0 ? (
                <div className="ubc-empty">아직 등록된 명언이 없습니다.</div>
              ) : (
                <ul className="ubc-list">
                  {arr.map(e => (
                    <li key={e.q}>
                      <span className="ubc-pos">본문{String(e.spread).padStart(2, "0")}</span>
                      <span className="ubc-cat">{e.category}</span>
                      <span className="ubc-q">{e.q}</span>
                      <button className="ubc-x" onClick={() => removeOne(e.q)} title="이 항목 삭제">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { QuotePicker, UsageIndex });
