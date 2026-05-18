/* prompt-generator.jsx — 이미지 / 4컷 프롬프트 생성 페이지 */

const { useState: useStatePG, useMemo: useMemoPG, useRef: useRefPG } = React;

/* ────────── 공통: 선택 가능한 칩 그리드 ────────── */
function OptionChips({ options, selected, onToggle, columns = 4 }) {
  const [q, setQ] = useStatePG("");
  const big = options.length > 24;
  const filtered = useMemoPG(() => {
    const k = q.trim().toLowerCase();
    if (!k) return options;
    return options.filter(o => {
      const v = (typeof o === "string" ? o : o.value) || "";
      const l = (typeof o === "string" ? o : o.label) || "";
      return v.toLowerCase().includes(k) || l.toLowerCase().includes(k);
    });
  }, [options, q]);

  return (
    <div className="opt-wrap">
      {big && (
        <div className="opt-tools">
          <input
            className="opt-search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`검색 — 전체 ${options.length}개`}
          />
          <span className="opt-count">{filtered.length} 표시 · {selected.length} 선택</span>
        </div>
      )}
      <div className={"opt-scroll" + (big ? " scrollable" : "")}>
        <div className="opt-grid" style={{gridTemplateColumns: `repeat(${columns}, 1fr)`}}>
          {filtered.map(opt => {
            const value = typeof opt === "string" ? opt : opt.value;
            const label = typeof opt === "string" ? opt : opt.label;
            const isSel = selected.includes(value);
            return (
              <button
                key={value}
                className={"opt-chip" + (isSel ? " active" : "")}
                onClick={() => onToggle(value)}
                title={value}
              >{label}</button>
            );
          })}
          {filtered.length === 0 && <div className="opt-empty">검색 결과가 없습니다</div>}
        </div>
      </div>
    </div>
  );
}

/* ────────── 섹션 ────────── */
function PromptSection({ title, subtitle, children, headRight }) {
  return (
    <section className="pg-section">
      <div className="pg-section-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <span className="pg-section-sub">{subtitle}</span>}
        </div>
        {headRight}
      </div>
      {children}
    </section>
  );
}

/* ────────── 단일 선택 (화풍·비율) ────────── */
function SingleSelect({ options, value, onChange, render }) {
  return (
    <div className="single-select">
      {options.map(opt => {
        const v = typeof opt === "string" ? opt : opt.id;
        const label = typeof opt === "string" ? opt : (opt.ko || opt.label);
        const sub = typeof opt === "string" ? null : opt.label;
        return (
          <button
            key={v}
            className={"single-chip" + (value === v ? " active" : "")}
            onClick={() => onChange(value === v ? null : v)}
          >
            <div className="single-label">{label}</div>
            {sub && <div className="single-sub">{sub}</div>}
          </button>
        );
      })}
    </div>
  );
}

/* ────────── 캐릭터 카드 ────────── */
function CharacterCard({ char, selected, onToggle }) {
  return (
    <button
      className={"char-card" + (selected ? " active" : "")}
      onClick={onToggle}
    >
      <div className="char-emoji">{char.species}</div>
      <div className="char-name">{char.ko}</div>
      <div className="char-en">{char.en}</div>
    </button>
  );
}

/* ────────── 출력 프롬프트 빌더 ────────── */
function buildImagePrompt(s) {
  const lines = [];
  const charsBy = (id) => window.CHARACTERS.find(c => c.id === id);

  // 화풍
  if (s.artStyle) {
    const style = window.ART_STYLES.find(a => a.id === s.artStyle);
    if (style) lines.push(`[ART STYLE]\n${style.en}.`);
  }

  // 캐릭터
  if (s.chars.length || s.customChars.trim()) {
    lines.push("[CHARACTERS — maintain perfect appearance consistency]");
    s.chars.forEach(id => {
      const c = charsBy(id);
      if (c) lines.push(`• ${c.en} (${c.ko}): ${c.desc}`);
    });
    if (s.customChars.trim()) lines.push(`• Additional: ${s.customChars.trim()}`);
  }

  // 배경 / 시간 / 날씨 / 조명 / 분위기
  const setting = [
    ...s.backgrounds, s.customBg.trim(),
    s.times.map(t => `time of day: ${t}`).join(", "),
    s.times.length === 0 && s.customTime.trim() ? `time of day: ${s.customTime.trim()}` : "",
    s.weathers.map(w => `weather: ${w}`).join(", "),
    s.customWeather.trim() ? `weather: ${s.customWeather.trim()}` : ""
  ].filter(Boolean);
  if (setting.length) lines.push(`[SETTING]\n${setting.join("; ")}.`);

  const ambience = [
    ...s.moods.map(m => `mood: ${m}`),
    s.customMood.trim() ? `mood: ${s.customMood.trim()}` : "",
    ...s.lightings.map(l => `lighting: ${l}`),
    s.customLighting.trim() ? `lighting: ${s.customLighting.trim()}` : ""
  ].filter(Boolean);
  if (ambience.length) lines.push(`[ATMOSPHERE]\n${ambience.join("; ")}.`);

  // 카메라 / 포커싱
  const composition = [
    ...s.cameras.map(c => `camera: ${c}`),
    s.customCamera.trim() ? `camera: ${s.customCamera.trim()}` : "",
    s.focusPreset ? `depth of field: ${s.focusPreset}` : "",
    s.focusSubject.trim() ? `focus on: ${s.focusSubject.trim()}` : "",
    s.outFocus.trim() ? `out-of-focus: ${s.outFocus.trim()}` : ""
  ].filter(Boolean);
  if (composition.length) lines.push(`[COMPOSITION]\n${composition.join("; ")}.`);

  // 철학 주제 반영
  const topic = s.ctx?.topic;
  const T = topic ? window.TOPICS[topic] : null;
  if (T || s.ctx?.quote || s.ctx?.category) {
    const themeLines = [];
    if (T) themeLines.push(`Philosophical theme: ${T.name} philosophy (${T.sub}).`);
    if (s.ctx?.category) themeLines.push(`Category: ${s.ctx.category}.`);
    if (s.ctx?.quote) themeLines.push(`Quote (translate the FEELING, not the words): "${s.ctx.quote}"`);
    if (s.ctx?.bodySnippet) themeLines.push(`Narrative context: ${s.ctx.bodySnippet}`);
    lines.push(`[SUBJECT MEANING]\n${themeLines.join("\n")}`);
  }

  // 비율
  if (s.ratio) lines.push(`[OUTPUT]\nAspect ratio: ${s.ratio}.`);

  return lines.join("\n\n");
}

function buildComicPrompt(s) {
  // 이미지 프롬프트 빌더와 거의 동일 + 4컷 규칙 추가
  const lines = [];
  const charsBy = (id) => window.CHARACTERS.find(c => c.id === id);

  // 4컷 고정 규칙
  lines.push(`[4-PANEL COMIC RULES]\n${window.COMIC_RULES}`);

  // 캐릭터
  if (s.chars.length || s.customChars.trim()) {
    lines.push("[CHARACTERS — perfect consistency across all four panels]");
    s.chars.forEach(id => {
      const c = charsBy(id);
      if (c) lines.push(`• ${c.en} (${c.ko}): ${c.desc}`);
    });
    if (s.customChars.trim()) lines.push(`• Additional: ${s.customChars.trim()}`);
  }

  // 철학 주제
  const topic = s.ctx?.topic;
  const T = topic ? window.TOPICS[topic] : null;
  if (T || s.ctx?.quote || s.ctx?.category) {
    const themeLines = [];
    if (T) themeLines.push(`Philosophy: ${T.name} (${T.sub}).`);
    if (s.ctx?.category) themeLines.push(`Category: ${s.ctx.category}.`);
    if (s.ctx?.quote) themeLines.push(`Anchor quote (interpret poetically — story conveys the meaning indirectly): "${s.ctx.quote}"`);
    if (s.ctx?.bodySnippet) themeLines.push(`Story narrative to dramatize across the 4 panels: ${s.ctx.bodySnippet}`);
    lines.push(`[STORY MEANING]\n${themeLines.join("\n")}`);
  }

  // 비율은 9:16 고정
  lines.push(`[OUTPUT]\nAspect ratio: 9:16 (vertical 4-panel comic).`);

  return lines.join("\n\n");
}

/* ────────── 메인 페이지 컴포넌트 ────────── */
function PromptGeneratorPage({ mode, ctx, onBack }) {
  // 공통 선택 상태
  const [chars, setChars] = useStatePG([]);
  const [customChars, setCustomChars] = useStatePG("");
  const [backgrounds, setBackgrounds] = useStatePG([]);
  const [customBg, setCustomBg] = useStatePG("");
  const [times, setTimes] = useStatePG([]);
  const [customTime, setCustomTime] = useStatePG("");
  const [moods, setMoods] = useStatePG([]);
  const [customMood, setCustomMood] = useStatePG("");
  const [weathers, setWeathers] = useStatePG([]);
  const [customWeather, setCustomWeather] = useStatePG("");
  const [lightings, setLightings] = useStatePG([]);
  const [customLighting, setCustomLighting] = useStatePG("");
  const [cameras, setCameras] = useStatePG([]);
  const [customCamera, setCustomCamera] = useStatePG("");
  const [focusPreset, setFocusPreset] = useStatePG("");
  const [focusSubject, setFocusSubject] = useStatePG("");
  const [outFocus, setOutFocus] = useStatePG("");
  const [artStyle, setArtStyle] = useStatePG(mode === "comic" ? "cinematic-wc" : "");
  const [ratio, setRatio] = useStatePG(mode === "comic" ? "9:16" : "1:1");

  const [copied, setCopied] = useStatePG(false);

  const toggleArr = (arr, setArr) => (v) =>
    arr.includes(v) ? setArr(arr.filter(x => x !== v)) : setArr([...arr, v]);

  // 본문 → 첫 줄 제거(타이틀=명언) → 250자 요약
  const bodySnippet = useMemoPG(() => {
    const body = ctx?.body || "";
    const lines = body.split("\n").filter(l => l.trim());
    const rest = lines.slice(1).join(" ").trim();
    return rest.slice(0, 280);
  }, [ctx?.body]);

  const builderState = {
    chars, customChars, backgrounds, customBg, times, customTime,
    moods, customMood, weathers, customWeather, lightings, customLighting,
    cameras, customCamera, focusPreset, focusSubject, outFocus,
    artStyle, ratio,
    ctx: { ...ctx, bodySnippet }
  };

  const prompt = useMemoPG(() => {
    return mode === "comic" ? buildComicPrompt(builderState) : buildImagePrompt(builderState);
  }, [builderState, mode]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const isComic = mode === "comic";
  const title = isComic ? "4컷 만화 프롬프트 생성기" : "이미지 프롬프트 생성기";
  const subtitle = isComic
    ? "9:16 vertical 4-panel · cinematic watercolor · 캐릭터 일관성"
    : "1장 이미지 · 화풍·구도·캐릭터 일관성";

  return (
    <div className="pg-page">
      {/* 헤더 */}
      <div className="pg-header">
        <button className="pg-back" onClick={onBack}>‹ 작업실로 돌아가기</button>
        <div className="pg-title-block">
          <h2>{title}</h2>
          <span className="pg-subtitle">{subtitle}</span>
        </div>
        <div className="pg-ctx-chip">
          {ctx?.topic && <span>{window.TOPICS[ctx.topic].nameKo}</span>}
          {ctx?.category && <span>· {ctx.category}</span>}
        </div>
      </div>

      {/* 본문 */}
      <div className="pg-body">
        {/* 왼쪽: 구성 */}
        <div className="pg-config">
          <PromptSection
            title="캐릭터"
            subtitle="복수 선택 · 외모 일관성이 유지됩니다"
          >
            <div className="char-grid">
              {window.CHARACTERS.map(c => (
                <CharacterCard
                  key={c.id}
                  char={c}
                  selected={chars.includes(c.id)}
                  onToggle={() => toggleArr(chars, setChars)(c.id)}
                />
              ))}
            </div>
            <textarea
              className="pg-input"
              placeholder="추가 캐릭터/설정 (영문 권장)"
              value={customChars}
              onChange={e => setCustomChars(e.target.value)}
              rows={2}
            />
          </PromptSection>

          {!isComic && (
            <PromptSection title="배경" subtitle="500가지 중 큐레이션 · 복수 선택 · 자유 입력 가능">
              <OptionChips
                options={window.BACKGROUNDS}
                selected={backgrounds}
                onToggle={toggleArr(backgrounds, setBackgrounds)}
                columns={3}
              />
              <input className="pg-input" placeholder="추가 배경" value={customBg} onChange={e => setCustomBg(e.target.value)} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="시간대" subtitle="복수 선택 가능">
              <OptionChips
                options={window.TIMES}
                selected={times}
                onToggle={toggleArr(times, setTimes)}
                columns={4}
              />
              <input className="pg-input" placeholder="추가 시간대" value={customTime} onChange={e => setCustomTime(e.target.value)} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="분위기" subtitle="100가지 중 핵심 · 복수 선택">
              <OptionChips
                options={window.MOODS}
                selected={moods}
                onToggle={toggleArr(moods, setMoods)}
                columns={4}
              />
              <input className="pg-input" placeholder="추가 분위기" value={customMood} onChange={e => setCustomMood(e.target.value)} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="날씨">
              <OptionChips
                options={window.WEATHERS}
                selected={weathers}
                onToggle={toggleArr(weathers, setWeathers)}
                columns={4}
              />
              <input className="pg-input" placeholder="추가 날씨" value={customWeather} onChange={e => setCustomWeather(e.target.value)} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="조명 · 빛">
              <OptionChips
                options={window.LIGHTINGS}
                selected={lightings}
                onToggle={toggleArr(lightings, setLightings)}
                columns={3}
              />
              <input className="pg-input" placeholder="추가 조명" value={customLighting} onChange={e => setCustomLighting(e.target.value)} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="카메라 뷰" subtitle="복수 선택 가능">
              <OptionChips
                options={window.CAMERA_VIEWS}
                selected={cameras}
                onToggle={toggleArr(cameras, setCameras)}
                columns={3}
              />
              <input className="pg-input" placeholder="추가 카메라" value={customCamera} onChange={e => setCustomCamera(e.target.value)} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="포커싱 · 아웃포커싱">
              <div className="focus-grid">
                {window.FOCUS_PRESETS.map((f, i) => (
                  <button
                    key={i}
                    className={"opt-chip focus-chip" + (focusPreset === f.value ? " active" : "")}
                    onClick={() => setFocusPreset(focusPreset === f.value ? "" : f.value)}
                    title={f.value}
                  >{f.label}</button>
                ))}
              </div>
              <div className="focus-inputs">
                <input className="pg-input" placeholder="포커스 대상 (예: 인물의 눈)" value={focusSubject} onChange={e => setFocusSubject(e.target.value)} />
                <input className="pg-input" placeholder="아웃포커싱 대상 (예: 배경 나무)" value={outFocus} onChange={e => setOutFocus(e.target.value)} />
              </div>
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="화풍">
              <SingleSelect options={window.ART_STYLES} value={artStyle} onChange={setArtStyle} />
            </PromptSection>
          )}

          {!isComic && (
            <PromptSection title="출력 비율">
              <SingleSelect options={window.RATIOS} value={ratio} onChange={setRatio} />
            </PromptSection>
          )}

          {isComic && (
            <PromptSection title="규칙 (자동 포함)" subtitle="비율 9:16 · 텍스트 일체 금지 · 시네마틱 수채화 · 전개·발단·위기·결말">
              <div className="rule-card">
                <ol className="rule-list">
                  {window.COMIC_RULES_KO.map((rule, i) => (
                    <li key={i}>{rule}</li>
                  ))}
                </ol>
                <div className="rule-foot">
                  ※ 위 규칙은 영어로 변환되어 최종 프롬프트의 <code>[4-PANEL COMIC RULES]</code> 섹션에 자동 포함됩니다.
                </div>
              </div>
            </PromptSection>
          )}
        </div>

        {/* 오른쪽: 프롬프트 출력 */}
        <div className="pg-output">
          <div className="pg-output-head">
            <h3>최종 영어 프롬프트</h3>
            <button className={"btn primary copy-btn" + (copied ? " copied" : "")} onClick={onCopy}>
              {copied ? "✓ 복사됨" : "📋 복사하기"}
            </button>
          </div>
          <pre className="pg-prompt">{prompt || "옵션을 선택하면 프롬프트가 여기에 생성됩니다."}</pre>
          <div className="pg-meta">
            <span>{prompt.length}자 · {prompt.split("\n").length}줄</span>
            <span>{ctx?.topic ? window.TOPICS[ctx.topic].name : ""} · {ctx?.category || ""}</span>
          </div>

          {ctx?.quote && (
            <div className="pg-context">
              <div className="pg-context-label">명언 / 구절</div>
              <div className="pg-context-quote">"{ctx.quote}"</div>
              {bodySnippet && (
                <>
                  <div className="pg-context-label" style={{marginTop: 10}}>본문 (요약 280자)</div>
                  <div className="pg-context-body">{bodySnippet}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  PromptGeneratorPage,
  buildImagePrompt,
  buildComicPrompt
});
