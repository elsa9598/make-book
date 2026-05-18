/* ai-writer.jsx — 로컬 Ollama(qwen2.5:14b) 실연결 본문 생성
   - localhost:11434 직접 호출 · 클라우드/외부망 미사용 (회사 핵심 원칙)
   - 한자(CJK Unified Ideographs) / 일본어(히라가나·가타카나) 검출
   - 검출 시 최대 4회 재생성, 마지막엔 섞인 줄 제거 후처리
   - Ollama 미기동 시 데모 텍스트로 폴백(UI 흐름 유지)
*/

const { useState, useRef } = React;

// ───────── 로컬 Ollama 연결 (100% 로컬 · 외부망 미사용) ─────────
const OLLAMA_URL = "http://localhost:11434/api/chat";
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

async function generateOnce({ topic, category, quote, temperature = 0.8 }) {
  // 실제 로컬 모델 호출처럼 window.claude.complete 사용
  const T = window.TOPICS[topic];
  const sys = `당신은 한국어로만 글을 쓰는 철학 아트북 작가입니다.
주제: ${T.nameKo}(${T.name}) 철학
카테고리: ${category}
독자의 명언/구절: "${quote}"

요구사항:
- 한국어 한글로만 쓰십시오. 한자(漢字), 일본어 히라가나·가타카나는 절대 사용 금지.
- 외래어 표기도 한글로만. (예: 니체, 쇼펜하우어)
- 어려운 철학을 일반 독자가 이해하기 쉽게 풀어주십시오.
- 짧은 일상 스토리(예시)로 개념을 보여주십시오.
- 시적이고 따뜻한 톤. 한 문장씩 줄바꿈하여 시처럼 배치.
- 정확히 14~17줄. 각 줄은 짧게.
- 제목·머리말·번호·괄호 설명 없이 본문만.
- 독자의 구절(명언)은 제목으로 따로 표시되니, 본문 안에서 그 구절을 반복하지 마십시오.`;

  const prompt = `위 주제·구절을 받아 14~18줄의 한국어 본문을 써 주세요.`;

  // 로컬 Ollama(localhost:11434) 직접 호출 — 클라우드 미사용
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt }
        ],
        options: {
          temperature,
          top_p: 0.9,
          num_predict: 512
        }
      })
    });
    if (!res.ok) throw new Error("Ollama HTTP " + res.status);
    const data = await res.json();
    const text = (data && data.message && data.message.content || "").trim();
    if (!text) throw new Error("빈 응답");
    return text;
  } catch (e) {
    // fallback: Ollama 미기동/모델 없음 → 데모 텍스트로 흐름 유지
    console.warn("[ai-writer] Ollama 호출 실패 → 데모 텍스트:", e.message);
    return demoText(topic, category, quote);
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

function AiWriter({ topic, category, quote, output, setOutput, retryLog, setRetryLog, busy, setBusy, versions, setVersions, onSaveToBook }) {
  const [dirty, setDirty] = useState(false);
  const [activeVer, setActiveVer] = useState(null);

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
    setOutput(versions[i].text);
    setActiveVer(i);
    setDirty(false);
  };
  const onGenerate = async () => {
    if (!topic || !category || !quote) return;
    setBusy(true);
    setOutput("");
    setRetryLog([]);

    const MAX_ATTEMPTS = 4;
    let finalText = "";
    let logs = [];

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      logs.push({ step: `T${attempt}`, status: "생성 중…", kind: "pending" });
      setRetryLog([...logs]);

      const text = await generateOnce({
        topic, category, quote,
        temperature: 0.6 + attempt * 0.1
      });

      const hits = detectForeign(text);
      logs[logs.length - 1] = {
        step: `T${attempt}`,
        status: hits.length === 0
          ? `통과 · ${lineCount(text)}줄`
          : `검출: ${hits.join(", ")}`,
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
          status: `섞인 줄 ${removed}개 제거`,
          kind: "strip"
        });
        setRetryLog([...logs]);
        finalText = cleaned;
      } else {
        await new Promise(r => setTimeout(r, 350));
      }
    }

    // 첫 줄에 명언/구절을 타이틀로 자동 삽입 + 빈 줄 제거
    const compact = finalText.replace(/\n\s*\n+/g, "\n").trim();
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
          {dirty
            ? <span style={{color: "#a83232"}}>● 수정됨 — 저장하세요</span>
            : (versions.length > 0
              ? `✓ ‘v${versions.length}’ 저장됨 · ${versions[versions.length-1].savedAt}`
              : "qwen2.5:14b · 한자/가나 자동 검출 · 최대 4회 재시도")}
        </div>
        <div style={{display: "flex", gap: 8}}>
          {output && (
            <button className="btn ghost" onClick={() => { setOutput(""); setRetryLog([]); setDirty(false); setActiveVer(null); }}>
              비우기
            </button>
          )}
          <button
            className="btn"
            disabled={!output.trim() || !dirty || busy}
            onClick={() => saveVersion("manual")}
          >
            저장
          </button>
          <button
            className="btn primary"
            disabled={!topic || !category || !quote || busy}
            onClick={onGenerate}
          >
            {busy ? "생성 중…" : (output ? "다시 생성" : "본문 생성")}
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
              <button
                key={v.id}
                className={"version-row" + (activeVer === i ? " active" : "")}
                onClick={() => restoreVersion(i)}
                title={`${v.savedAt} · ${v.source === "ai" ? "AI" : "수정"}`}
              >
                <span className="v-tag">v{i+1}</span>
                <span className="v-source">{v.source === "ai" ? "✷ AI" : "✎ 수정"}</span>
                <span className="v-lines">{v.lines}줄</span>
                <span className="v-snip">{v.text.replace(/\n/g, " ").slice(0, 36)}…</span>
              </button>
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
