/* ai-writer.jsx — 로컬 Ollama(qwen2.5:14b) 실연결 본문 생성
   - localhost:11434 직접 호출 · 클라우드/외부망 미사용 (회사 핵심 원칙)
   - 한자(CJK Unified Ideographs) / 일본어(히라가나·가타카나) 검출
   - 검출 시 최대 4회 재생성, 마지막엔 섞인 줄 제거 후처리
   - Ollama 미기동 시 데모 텍스트로 폴백(UI 흐름 유지)
*/

const { useState, useRef } = React;

// ───────── 로컬 Ollama 연결 (100% 로컬 · 외부망 미사용) ─────────
// 서버(http://localhost:8787)로 열렸으면 같은 출처 프록시 → CORS 없음.
// 파일(file://)로 열렸으면 직접 호출(브라우저 CORS 정책 영향 받음).
const OLLAMA_URL = (location.protocol === "http:" || location.protocol === "https:")
  ? (location.origin + "/ollama/chat")
  : "http://localhost:11434/api/chat";
const OLLAMA_MODEL = "qwen2.5:14b";

// CJK 한자 + 일본어 가나 검출
const CJK_HANJA = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
const HIRAGANA = /[\u3040-\u309F]/;
const KATAKANA = /[\u30A0-\u30FF\u31F0-\u31FF]/;

function detectForeign(text) {
  const hits = [];
  if (CJK_HANJA.test(text)) hits.push("한자");
  if (HIRAGANA.test(text)) hits.push("히라가나");
  if (KATAKANA.test(text)) hits.push("가타카나");
  return hits;
}

function stripMixedLines(text) {
  // 한자/가나가 포함된 줄을 제거
  const lines = text.split("\n");
  const kept = [];
  let removed = 0;
  for (const ln of lines) {
    if (CJK_HANJA.test(ln) || HIRAGANA.test(ln) || KATAKANA.test(ln)) {
      removed++;
      continue;
    }
    kept.push(ln);
  }
  return { cleaned: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(), removed };
}

function lineCount(t) {
  return t.split("\n").filter(l => l.trim().length > 0).length;
}

/* 모델이 문단으로 써도 '한 문장 = 한 줄'로 분해 + 구절 중복/잡표기 제거
   - [도입]/[이야기] 같은 대괄호 표기, 머리표(- • 1.) 제거
   - 한국어 종결부호(. ! ? …) 기준으로 문장 분리
   - 본문 첫 부분이 구절을 그대로 반복하면 그 줄 제거 (제목으로 따로 들어감) */
function formatBody(raw, quote) {
  let t = (raw || "").replace(/\r/g, "").trim();
  // 대괄호 구간표기 / 머리표 제거
  t = t.replace(/\[[^\]]{0,12}\]/g, " ");
  t = t.replace(/^\s*(?:[-•*▶◦·]|\d+[.)])\s*/gm, "");
  // 문장 단위 분해: 종결부호 뒤 또는 줄바꿈에서 끊는다
  const parts = t
    .split(/(?<=[.!?…。])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);

  const qNorm = (quote || "").replace(/[\s"'“”‘’.,!?…]/g, "");
  const lines = [];
  for (let s of parts) {
    // 잔존 따옴표·군더더기 정리
    s = s.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "").trim();
    if (!s) continue;
    const sNorm = s.replace(/[\s"'“”‘’.,!?…]/g, "");
    // 구절을 그대로 반복한 줄은 버림(제목으로 별도 삽입되므로)
    if (qNorm && sNorm.includes(qNorm)) continue;
    lines.push(s);
  }
  // 너무 길면 17줄까지만
  return lines.slice(0, 17).join("\n").trim();
}

async function generateOnce({ topic, category, quote, temperature = 0.8 }) {
  const T = window.TOPICS[topic];

  // 한국어 강제 + 중국어 드리프트 차단 (qwen2.5 대응) + 1-shot 앵커
  const sys = `너는 오직 한국어 한글로만 글을 쓰는 철학 아트북 작가다.
절대 규칙:
- 모든 문장을 한국어 한글로만 쓴다. 중국어(汉字)·한자(漢字)·일본어 가나는 한 글자도 쓰지 않는다.
- 한자어도 전부 한글로 표기한다. 영어 단어도 쓰지 않는다.
- 위 규칙을 어기면 실패다. 한국어가 아니면 다시 한국어로 바꿔 쓴다.

집필 지침:
- 주제는 ${T.nameKo} 철학, 카테고리는 "${category}".
- 어려운 철학을 일반 독자가 쉽게 이해하도록 풀어 설명한다.
- 본문은 반드시 다음 세 부분으로 구성한다:
  (1) 도입 2~4줄: 구절이 가리키는 철학 개념을 쉬운 말로 푼다.
  (2) 이야기 7~10줄: 구체적인 인물 한 명이 등장하는 '하나의' 짧은 이야기.
      그 인물에게 작은 사건이 일어나고, 마음의 전환이 생기는 장면을 보여 준다.
      (예: 한 노인이, 어떤 아이가, 길 잃은 나그네가 …처럼 인물·상황·전환이 분명할 것)
  (3) 마무리 3~5줄: 그 이야기에서 끌어낸 통찰을 독자의 삶으로 잇는다.
- 이야기는 정확히 '하나'만. 추상적 설명만으로 끝내지 말 것 — 장면이 그려져야 한다.
- 시적이고 따뜻한 톤. 한 문장씩 줄바꿈해 시처럼 배치한다.
- 정확히 14~17줄. 각 줄은 짧게.
- 제목·머리말·번호·소제목·괄호 설명 없이 본문만 쓴다.
- 주어진 구절을 본문 안에서 그대로 반복하지 않는다.`;

  const example = `구성 예시(형식만 참고, 내용은 완전히 새로 쓸 것):
[도입] 가진 것을 세는 마음은 늘 부족함을 본다.
[도입] 진짜 부유함은 그 셈을 멈출 때 온다.
[이야기] 한 상인이 매일 금화를 세며 잠들지 못했다.
[이야기] 어느 밤 창밖에서 노랫소리가 들렸다.
[이야기] 빵 한 덩이로 저녁을 나누던 가난한 부부였다.
[이야기] 상인은 처음으로 금고가 아니라 사람을 보았다.
[이야기] 다음 날 그는 빵을 사 들고 그 문을 두드렸다.
[마무리] 채움이 아니라 나눔이 곳간을 따뜻하게 했다.
[마무리] 오늘 나는 무엇을 세고 있는가.`;

  const userMsg = `${example}

이제 아래 구절을 출발점으로, 위 지침에 맞춰 한국어 본문을 새로 써라.
(위 [도입]/[이야기]/[마무리] 표기는 쓰지 말고 본문 문장만 쓴다.)
구절: "${quote}"

분량·구성 규칙(엄수):
- 반드시 14줄 이상 17줄 이하. 5~12줄로 짧게 끝내지 말 것.
- 각 줄은 한 호흡 길이(대략 10~25자)로 짧게. 한 줄에 한 문장.
- 구체적 인물이 등장하는 '하나의' 이야기를 7~10줄로 반드시 넣는다.
- 그 이야기에는 인물·작은 사건·마음의 전환이 분명히 보여야 한다.
- 추상적 설명만 나열하지 말 것. 장면이 눈에 그려져야 한다.
- 줄 끝에 쉼표·말줄임표를 남발하지 말 것.
반드시 한국어 한글로만. 첫 줄부터 본문을 시작하라.`;

  // 로컬 Ollama(localhost:11434) 직접 호출 — 클라우드 미사용
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: "10m",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userMsg }
        ],
        options: {
          temperature,
          top_p: 0.85,
          repeat_penalty: 1.15,
          num_predict: 1000
        }
      })
    });
    if (!res.ok) throw new Error("Ollama HTTP " + res.status);
    const data = await res.json();
    const text = (data && data.message && data.message.content || "").trim();
    if (!text) throw new Error("빈 응답");
    return { text, via: "ollama" };
  } catch (e) {
    // 실패를 숨기지 않는다 — 호출자에서 명확히 표시
    console.warn("[ai-writer] Ollama 호출 실패:", e.message);
    return { text: demoText(topic, category, quote), via: "demo", err: e.message };
  }
}

// 분량이 짧을 때 1회 확장: 같은 이야기를 14~17개의 짧은 한 줄 문장으로 재구성
async function expandToLines(draft) {
  const sys = `너는 한국어 한글로만 쓰는 편집자다. 한자·일본어 가나 금지.
주어진 글을 다시 쓰되, 내용·이야기·인물·교훈은 그대로 유지하고
형식만 바꾼다: 한 문장을 한 줄로, 짧게(대략 10~25자) 끊어
정확히 14~17줄로 만든다. 새 이야기를 추가하지 말고, 있던 한 이야기를 더 천천히 풀어 줄을 늘린다.
번호·소제목·따옴표·괄호 설명 없이 본문 줄만 출력한다.`;
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        keep_alive: "10m",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: "다음 글을 14~17개의 짧은 한국어 줄로 재구성하라:\n\n" + draft }
        ],
        options: { temperature: 0.5, top_p: 0.85, repeat_penalty: 1.15, num_predict: 1000 }
      })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return (data && data.message && data.message.content || "").trim();
  } catch (e) {
    console.warn("[ai-writer] 확장 패스 실패:", e.message);
    return "";
  }
}

function demoText(topic, category, quote) {
  const samples = {
    talmud: `한 사람이 시장에 갔다.
그는 가장 값진 것을 사오라는 말을 들었다.
돌아온 그의 손에는 혀가 있었다.
다음 날, 가장 천한 것을 사오라 했다.
그는 또 혀를 사왔다.

같은 것이 가장 귀하고도 가장 천하다.
${category}이란 손에 쥔 칼과 같다.
누구의 손에 들렸느냐로 값이 달라진다.

오늘 당신의 말은 어느 쪽이었는가.
어제 받은 한 마디를 떠올려 본다.
그 한 마디로 우리는 자라거나 무너진다.

지혜는 말을 아끼는 것에서 시작된다.
침묵이 길어질수록 마음의 결이 살아난다.
듣는 자는 두 번 배우고, 말하는 자는 한 번 가르친다.

오늘 나는 무엇을 사 올 것인가.`,
    nietzsche: `절벽 끝에 선 사람이 있다.
그는 뒤로 물러설 수 있었지만 머물렀다.
바람은 차가웠고, 발밑은 흔들렸다.

고통은 부수지 않고 깎아낸다.

${category}는 평탄한 길 위에서는 자라지 않는다.
무거운 짐을 진 어깨가 단단해지듯,
영혼도 짓눌리며 모양을 얻는다.

낙타가 사자가 되고, 사자가 아이가 되듯
우리도 우리를 넘어 다시 태어난다.

세 번의 변신 끝에 비로소 가벼워진다.

오늘 당신을 흔드는 그 무게는
당신을 무너뜨리려는 것이 아니라
당신이 누구인지 묻고 있다.

답은 한 발 더 내딛는 것뿐.`,
    schopenhauer: `한 사람이 욕망을 채웠다.
잠시 기뻤다. 곧 권태가 찾아왔다.
다른 욕망이 일어나기까지의 짧은 막간.

${category}은 그래서 외부에서 오지 않는다.
밖에서 채우려 할수록 안은 비어간다.

음악을 들을 때, 그림 앞에 설 때
우리는 잠시 의지를 내려놓는다.
그 순간, 시간이 멈춘 것 같다.

예술은 의지의 진정제다.
타인의 슬픔에 함께 젖는 마음,
그 동정이 우리를 인간으로 묶는다.

오늘 당신이 멈춘 그 한 순간,
바로 거기에 자유가 있었다.`
  };
  return samples[topic] || samples.talmud;
}

function AiWriter({ topic, category, quote, output, setOutput, retryLog, setRetryLog, busy, setBusy, versions, setVersions, activeVer, setActiveVer, onSaveToBook, locked }) {
  const [dirty, setDirty] = useState(false);
  const [genVia, setGenVia] = useState("");

  const saveVersion = (source = "manual") => {
    if (!output.trim()) return;
    const now = new Date();
    const stamp = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const next = [...versions, {
      id: now.getTime(),
      text: output,
      savedAt: stamp,
      source,
      lines: lineCount(output)
    }];
    setVersions(next);
    setActiveVer(next.length - 1);
    setDirty(false);
    // 책에도 저장 — 미리보기에 즉시 반영
    if (onSaveToBook) onSaveToBook(output);
  };

  const restoreVersion = (i) => {
    const picked = versions[i].text;
    setOutput(picked);
    setActiveVer(i);
    setDirty(false);
    // 픽한 버전을 해당 페이지에 즉시 저장 (자동저장·복구·PDF에 반영)
    if (onSaveToBook) onSaveToBook(picked);
  };
  const onGenerate = async () => {
    if (!topic || !category || !quote) return;
    setBusy(true);
    setOutput("");
    setRetryLog([]);

    const MAX_ATTEMPTS = 4;
    let finalText = "";
    let logs = [];
    let via = "ollama";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      logs.push({ step: `T${attempt}`, status: "생성 중…", kind: "pending" });
      setRetryLog([...logs]);

      const res = await generateOnce({
        topic, category, quote,
        temperature: 0.6 + attempt * 0.1
      });
      via = res.via;

      // Ollama 연결 자체가 실패 → 재시도 무의미, 즉시 명확히 표시
      if (res.via === "demo") {
        logs[logs.length - 1] = {
          step: `T${attempt}`,
          status: `Ollama 연결 실패 — 데모 텍스트 (${res.err || "원인 미상"})`,
          kind: "fail"
        };
        setRetryLog([...logs]);
        finalText = res.text;
        break;
      }

      const text = res.text;
      const hits = detectForeign(text);
      logs[logs.length - 1] = {
        step: `T${attempt}`,
        status: hits.length === 0
          ? `통과 · ${lineCount(text)}줄`
          : `검출: ${hits.join(", ")} → 재생성`,
        kind: hits.length === 0 ? "pass" : "fail"
      };
      setRetryLog([...logs]);

      if (hits.length === 0) {
        finalText = text.trim();
        break;
      }

      if (attempt === MAX_ATTEMPTS) {
        const { cleaned, removed } = stripMixedLines(text);
        logs.push({
          step: "후처리",
          status: `한자/가나 줄 ${removed}개 제거 (모델 한국어 드리프트)`,
          kind: "strip"
        });
        setRetryLog([...logs]);
        finalText = cleaned;
      } else {
        await new Promise(r => setTimeout(r, 350));
      }
    }

    setGenVia(via);

    // 문단 → 한 문장 한 줄로 분해 + 구절 중복 제거
    let compact = formatBody(finalText, quote);

    // 분량이 짧으면(이야기는 있으나 12줄 미만) 1회 확장 패스로 14~17줄 보강
    if (via === "ollama" && lineCount(compact) < 12) {
      logs.push({ step: "확장", status: `${lineCount(compact)}줄 → 14~17줄 재구성 중…`, kind: "pending" });
      setRetryLog([...logs]);
      const expanded = await expandToLines(compact);
      const ce = formatBody(expanded, quote);
      const ok = ce && detectForeign(ce).length === 0 && lineCount(ce) >= lineCount(compact);
      logs[logs.length - 1] = {
        step: "확장",
        status: ok ? `완료 · ${lineCount(ce)}줄` : `생략(원문 유지 · ${lineCount(compact)}줄)`,
        kind: ok ? "pass" : "strip"
      };
      setRetryLog([...logs]);
      if (ok) compact = ce;
    }

    // 구절을 타이틀로 삽입
    const titled = quote.trim() + "\n" + compact;
    setOutput(titled);
    setBusy(false);

    if (titled.trim()) {
      const now = new Date();
      const stamp = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const next = [...versions, {
        id: now.getTime(),
        text: titled,
        savedAt: stamp,
        source: "ai",
        lines: lineCount(titled)
      }];
      setVersions(next);
      setActiveVer(next.length - 1);
      setDirty(false);
      // 책에도 자동 저장
      if (onSaveToBook) onSaveToBook(titled);
    }
  };

  return (
    <div className="writer">
      <div className="writer-head">
        <h3>본문 작성</h3>
        <div className="writer-meta">
          <span>{topic ? window.TOPICS[topic].nameKo : "—"}</span>
          <span>·</span>
          <span>{category || "카테고리 미지정"}</span>
          <span>·</span>
          <span>{output ? lineCount(output) + "줄" : "0줄"}</span>
        </div>
      </div>

      <div className="writer-body editable">
        {busy && (
          <div className="generating-overlay">
            <span className="generating">
              로컬 모델이 사유 중
              <span></span><span></span><span></span>
            </span>
          </div>
        )}
        <textarea
          className="writer-text"
          value={output}
          onChange={e => { setOutput(e.target.value); setDirty(true); }}
          placeholder={busy ? "" : "주제 · 카테고리 · 구절을 입력하고 ‘본문 생성’을 눌러주세요. 생성된 글은 이곳에서 직접 수정해 다시 저장할 수 있습니다."}
          spellCheck="false"
          disabled={busy}
        />
      </div>

      {retryLog.length > 0 && (
        <div className="retry-log">
          {retryLog.map((r, i) => (
            <div key={i} className={`retry-row ${r.kind}`}>
              <span className="step">{r.step}</span>
              <span className="status">{r.status}</span>
            </div>
          ))}
        </div>
      )}

      <div className="writer-toolbar">
        <div className="hint" style={{fontSize: "11px"}}>
          {genVia === "demo"
            ? <span style={{color: "#a83232"}}>⚠ Ollama 미연결 — 데모 텍스트입니다. http://localhost:8787 로 열고 Ollama 실행을 확인하세요</span>
            : (dirty
              ? <span style={{color: "#a83232"}}>● 수정됨 — 저장하세요</span>
              : (versions.length > 0
                ? `✓ ‘v${versions.length}’ 저장됨 · ${versions[versions.length-1].savedAt}`
                : (genVia === "ollama"
                  ? "✓ qwen2.5:14b 로컬 생성 · 한자/가나 자동 검출"
                  : "qwen2.5:14b · 한자/가나 자동 검출 · 최대 4회 재시도")))}
        </div>
        <div style={{display: "flex", gap: 8}}>
          {output && (
            <button className="btn ghost" onClick={() => { setOutput(""); setRetryLog([]); setDirty(false); setActiveVer(null); }}>
              비우기
            </button>
          )}
          <button
            className="btn"
            disabled={!output.trim() || !dirty || busy || locked}
            onClick={() => saveVersion("manual")}
          >
            저장
          </button>
          <button
            className="btn primary"
            disabled={!topic || !category || !quote || busy || locked}
            onClick={onGenerate}
          >
            {locked ? "🔒 확정됨" : (busy ? "생성 중…" : (output ? "다시 생성" : "본문 생성"))}
          </button>
        </div>
      </div>

      {versions.length > 0 && (
        <div className="version-list">
          <div className="version-list-head">
            <span>버전 히스토리</span>
            <span>{versions.length}개</span>
          </div>
          <div className="version-rows">
            {versions.map((v, i) => (
              <div
                key={v.id}
                className={"version-row" + (activeVer === i ? " active" : "")}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                title={`${v.savedAt} · ${v.source === "ai" ? "AI" : "수정"}`}
              >
                <span className="v-tag">v{i+1}</span>
                <span className="v-source">{v.source === "ai" ? "✷ AI" : "✎ 수정"}</span>
                <span className="v-lines">{v.lines}줄</span>
                <span
                  className="v-snip"
                  style={{ flex: 1, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  onClick={() => { setOutput(v.text); setActiveVer(i); setDirty(false); }}
                  title="클릭: 미리보기(저장 안 함)"
                >{v.text.replace(/\n/g, " ").slice(0, 32)}…</span>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: "3px 8px", flexShrink: 0,
                           background: activeVer === i ? "#2f5d3a" : undefined,
                           color: activeVer === i ? "#f6ecd6" : undefined }}
                  disabled={locked}
                  onClick={() => restoreVersion(i)}
                  title="이 버전을 지금 스프레드 페이지에 적용(저장). 확정은 아님"
                >이 페이지에 적용</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 프롬프트 생성기 링크 */}
      <div className="prompt-link-row">
        <button
          className="prompt-link image-link"
          onClick={() => window.openPromptPage && window.openPromptPage("image")}
          title="이 페이지의 명언·본문을 반영한 1:1 이미지 생성용 영어 프롬프트"
        >
          <span className="prompt-link-icon">⌘</span>
          <div className="prompt-link-text">
            <div className="prompt-link-title">이미지 프롬프트 생성기</div>
            <div className="prompt-link-sub">1:1 상징 일러스트용 · 캐릭터·배경·화풍 선택</div>
          </div>
          <span className="prompt-link-arrow">→</span>
        </button>
        <button
          className="prompt-link comic-link"
          onClick={() => window.openPromptPage && window.openPromptPage("comic")}
          title="이 페이지의 명언·본문을 반영한 9:16 4컷 만화용 영어 프롬프트"
        >
          <span className="prompt-link-icon">▦</span>
          <div className="prompt-link-text">
            <div className="prompt-link-title">4컷 만화 프롬프트 생성기</div>
            <div className="prompt-link-sub">9:16 4컷 · 전개·발단·위기·결말 · 시네마틱 수채화</div>
          </div>
          <span className="prompt-link-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AiWriter, detectForeign, stripMixedLines, lineCount });
