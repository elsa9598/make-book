/* usage-tracker.jsx — 시리즈 명언 사용 대장(중복 0) + picker + 사용 현황
   ledger 구조: { [topic]: { [quote]: { book, spread, leftPage, rightPage, category, at } } }
*/

const { useState: useStateUT, useMemo: useMemoUT } = React;

const LEDGER_KEY = "artbook_quote_ledger_v1";
const BOOKNO_KEY = "artbook_book_no_v1";
const SERIES_BOOKS = 30;     // 주제별 30권
const WORKS_PER_BOOK = 24;   // 권당 본문 24편
const TARGET_PER_TOPIC = SERIES_BOOKS * WORKS_PER_BOOK; // 720

function ledgerLoad() {
  try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "{}"); }
  catch (e) { return {}; }
}
function ledgerSave(obj) {
  try { localStorage.setItem(LEDGER_KEY, JSON.stringify(obj)); } catch (e) {}
}
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
  findUse, register: ledgerRegister, clearSlot: ledgerClearSlot,
  topicUsedCount,
  SERIES_BOOKS, WORKS_PER_BOOK, TARGET_PER_TOPIC
};

/* ───────── 명언 Picker — 폼박스 아래 100개 리스트 ───────── */
function QuotePicker(props) {
  const { topic, category, quote, setQuote, ledger, bookNo, currentSpread } = props;
  const [filter, setFilter] = useStateUT("");
  const [onlyUnused, setOnlyUnused] = useStateUT(false);

  const pool = (window.QUOTES && window.QUOTES[topic] && window.QUOTES[topic][category]) || [];

  const rows = useMemoUT(() => {
    const f = filter.trim();
    return pool.map((q, i) => {
      const use = findUse(ledger, topic, q);
      let state = "free";
      if (use) state = (use.book === bookNo && use.spread === currentSpread) ? "here" : "used";
      return { q, i, use, state };
    }).filter(r => {
      if (onlyUnused && r.state === "used") return false;
      if (f && r.q.indexOf(f) === -1) return false;
      return true;
    });
  }, [pool, filter, onlyUnused, ledger, topic, bookNo, currentSpread]);

  const usedInCat = pool.reduce((n, q) => n + (findUse(ledger, topic, q) ? 1 : 0), 0);
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
              title={r.use ? `이미 사용: ${r.use.book}권 본문#${r.use.spread} (${r.use.category})` : "미사용"}
            >
              <span className="qp-no">{String(r.i + 1).padStart(3, "0")}</span>
              <span className="qp-text">{r.q}</span>
              {r.state === "used" && (
                <span className="qp-badge used">📕 {r.use.book}권·본문{String(r.use.spread).padStart(2, "0")}</span>
              )}
              {r.state === "here" && <span className="qp-badge here">● 현재 본문</span>}
            </button>
          );
        })}
      </div>
      <div className="qp-foot">
        선택한 명언이 위 폼박스에 들어갑니다 · <b className="dot-used">📕</b> 표시는 시리즈에서 이미 쓴 구절(중복 방지)
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
