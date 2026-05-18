/* book-view.jsx — 책 탭 (60p 그리드) + 미리보기 탭 (펼침면) */

const { useState: useStateBV, useRef: useRefBV } = React;

/* ────────── 자동 폰트 축소 ────────── */
// 한 페이지에 맞도록 폰트 크기를 줄여서 fit
function AutoFitBody({ text }) {
  const wrapRef = useRefBV();
  const innerRef = useRefBV();
  const [fontSize, setFontSize] = useStateBV(11);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    let fs = 11;
    inner.style.fontSize = fs + "px";
    let guard = 40;
    while (inner.scrollHeight > wrap.clientHeight && fs > 6 && guard-- > 0) {
      fs -= 0.5;
      inner.style.fontSize = fs + "px";
    }
    setFontSize(fs);
  }, [text]);

  return (
    <div ref={wrapRef} className="text-body-wrap">
      <div ref={innerRef} className="text-body" style={{fontSize}}>
        {text || "(이 페이지의 본문이 아직 작성되지 않았습니다.)"}
      </div>
    </div>
  );
}

function AutoFitTextarea({ value, onChange, onExpand }) {
  const wrapRef = useRefBV();
  const taRef = useRefBV();
  const [fontSize, setFontSize] = useStateBV(11);
  const [fitWarn, setFitWarn] = useStateBV(false);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const ta = taRef.current;
    if (!wrap || !ta) return;
    ta.style.fontSize = "11px";
    let fs = 11;
    let guard = 40;
    while (ta.scrollHeight > wrap.clientHeight && fs > 6 && guard-- > 0) {
      fs -= 0.5;
      ta.style.fontSize = fs + "px";
    }
    setFontSize(fs);
    setFitWarn(ta.scrollHeight > wrap.clientHeight);
  }, [value]);

  return (
    <div ref={wrapRef} className="text-body-wrap edit-wrap">
      <textarea
        ref={taRef}
        className="text-body-edit"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="이 페이지의 본문"
        spellCheck="false"
        style={{fontSize}}
      />
      <div className="edit-tools">
        <span className="fit-info">
          {fitWarn ? <span style={{color:"#a83232"}}>⚠ 잘림</span> : <span>✓ {fontSize.toFixed(1)}px</span>}
        </span>
        <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onExpand && onExpand(); }} title="확대 편집">
          ⛶
        </button>
      </div>
    </div>
  );
}

/* ───────── 책 그리드 (60p 한눈에) ───────── */
function BookGrid({ spreads, completed, onPickSpread, topic, coverImg, backImg, onCoverUpload, onBackUpload }) {
  const T = window.TOPICS[topic];
  return (
    <div className="book-grid">
      {/* 표지 행 */}
      <SectionHeader title="표지" subtitle="cover" />
      <CoverAttach
        side="front"
        img={coverImg}
        onUpload={onCoverUpload}
        topicName={T?.nameKo}
        topicSub={T?.sub}
      />
      <div style={{gridColumn: "span 4", display: "flex", alignItems: "center", padding: "12px 16px"}}>
        <div className="hint">
          표지 이미지는 테두리 없이 종이 톤 위에 얹힙니다.
          이미지가 없으면 주제 색상이 표시됩니다.
        </div>
      </div>

      {/* 프롤로그 */}
      <SectionHeader title="프롤로그" subtitle="prologue · p2–4" />
      {spreads.slice(0, 2).map(sp => (
        <SpreadCell key={sp.index} sp={sp} done={completed[sp.index]} onPick={() => onPickSpread(sp.index)} />
      ))}
      <div style={{gridColumn: "span 4"}}></div>

      {/* 챕터 타이틀 */}
      <SectionHeader title="챕터 표제" subtitle="chapter titles · p5–8" />
      {spreads.slice(2, 4).map(sp => (
        <SpreadCell key={sp.index} sp={sp} done={completed[sp.index]} onPick={() => onPickSpread(sp.index)} />
      ))}
      <div style={{gridColumn: "span 4"}}></div>

      {/* 본문 */}
      <SectionHeader title="본문" subtitle={`body · 24 works · p9–56`} />
      {spreads.slice(4, 28).map(sp => (
        <SpreadCell key={sp.index} sp={sp} done={completed[sp.index]} onPick={() => onPickSpread(sp.index)} />
      ))}

      {/* 에필로그 */}
      <SectionHeader title="에필로그" subtitle="epilogue · p57–59" />
      {spreads.slice(28, 30).map(sp => (
        <SpreadCell key={sp.index} sp={sp} done={completed[sp.index]} onPick={() => onPickSpread(sp.index)} />
      ))}

      {/* 뒷표지 */}
      <SectionHeader title="뒷표지" subtitle="back · p60" />
      <CoverAttach
        side="back"
        img={backImg}
        onUpload={onBackUpload}
        topicName=""
        topicSub="❦"
      />
      <div style={{gridColumn: "span 4", display: "flex", alignItems: "center", padding: "12px 16px"}}>
        <div className="hint">
          뒷표지에는 짧은 헌사, 발문, 또는 단순 이미지를 올립니다. 책등에는 실 노출 제본으로 마감.
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <i>{title}</i>
      <span>{subtitle}</span>
    </div>
  );
}

function SpreadCell({ sp, done, onPick }) {
  const leftLabel = `${String(sp.leftPage).padStart(3, "0")}_a`;
  const rightLabel = `${String(sp.rightPage).padStart(3, "0")}_b`;
  return (
    <div className="spread-cell" onClick={onPick} title={`${sp.leftMeta.label} · ${sp.rightMeta.label}`}>
      <div className={"cell-thumb" + (done ? "" : " empty")}>
        {done ? (
          <MiniSpread sp={sp} />
        ) : (
          <span>{sp.leftMeta.label}</span>
        )}
      </div>
      <div className="cell-label">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function MiniSpread({ sp }) {
  // 작은 썸네일
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      width: "100%", height: "100%",
      borderRight: 0
    }}>
      <div style={{
        background: "linear-gradient(135deg, var(--paper-warm), var(--paper-page-edge))",
        borderRight: "1px solid rgba(74,48,20,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <svg viewBox="0 0 20 30" width="40%">
          <rect x="3" y="2" width="14" height="6" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
          <rect x="3" y="9" width="14" height="6" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
          <rect x="3" y="16" width="14" height="6" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
          <rect x="3" y="23" width="14" height="5" stroke="#4a2415" strokeWidth="0.5" fill="none"/>
        </svg>
      </div>
      <div style={{
        background: "radial-gradient(circle, var(--topic-tint), var(--paper-warm))",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <svg viewBox="0 0 20 20" width="40%">
          <circle cx="10" cy="10" r="6" stroke="#4a2415" strokeWidth="0.6" fill="none"/>
        </svg>
      </div>
    </div>
  );
}

function CoverAttach({ side, img, onUpload, topicName, topicSub }) {
  const ref = useRefBV();
  return (
    <div
      className={"cover-attach spread-cell section-cover " + (img ? "has-image" : "")}
      onClick={() => ref.current?.click()}
      style={{ gridColumn: "span 2", aspectRatio: "1 / 1" }}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        onChange={e => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          onUpload(url);
        }}
      />
      {img ? (
        <img src={img} alt="" />
      ) : (
        <div className="cover-empty">
          {topicName ? <div style={{fontSize: 22}}>{topicName}</div> : <div style={{fontSize: 22}}>{topicSub}</div>}
          <span className="small">{side === "front" ? "표지 이미지 첨부" : "뒷표지 이미지 첨부"}</span>
        </div>
      )}
    </div>
  );
}

/* ───────── 미리보기 — 펼침면 넘기기 ───────── */
function BookPreview({ spreads, completed, setCompleted, topic, coverImg, backImg, comicSide, currentIdx, setCurrentIdx }) {
  const T = window.TOPICS[topic];
  const total = spreads.length;
  const sp = spreads[currentIdx];
  const saved = completed[sp.index];

  // 미리보기에서 본문 텍스트 인라인 편집
  const [editBuf, setEditBuf] = useStateBV(saved?.body || "");
  const [dirty, setDirty] = useStateBV(false);
  const [lastSaved, setLastSaved] = useStateBV(null);
  const [expandOpen, setExpandOpen] = useStateBV(false);

  // 스프레드 변경 또는 저장 데이터 변경 시 버퍼 동기화
  React.useEffect(() => {
    setEditBuf(saved?.body || "");
    setDirty(false);
  }, [currentIdx, saved?.body]);

  const onSaveEdit = () => {
    if (!saved) return;
    setCompleted({
      ...completed,
      [sp.index]: { ...saved, body: editBuf }
    });
    const now = new Date();
    setLastSaved(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setDirty(false);
  };

  const isBodySpread = sp.leftMeta.section === "body" && saved;

  return (
    <div className="preview-stage">
      <div className="book-spread">
        <PreviewPage
          page={sp.leftPage}
          meta={sp.leftMeta}
          topic={topic}
          coverImg={coverImg}
          backImg={backImg}
          data={saved}
          comicSide={comicSide}
          side="left"
          editBuf={editBuf}
          setEditBuf={(v) => { setEditBuf(v); setDirty(true); }}
          editable={isBodySpread}
          onExpandEdit={() => setExpandOpen(true)}
        />
        <SpineDeep />
        <PreviewPage
          page={sp.rightPage}
          meta={sp.rightMeta}
          topic={topic}
          coverImg={coverImg}
          backImg={backImg}
          data={saved}
          comicSide={comicSide}
          side="right"
          editBuf={editBuf}
          setEditBuf={(v) => { setEditBuf(v); setDirty(true); }}
          editable={isBodySpread}
          onExpandEdit={() => setExpandOpen(true)}
        />
      </div>

      <div className="preview-nav">
        <button
          className="nav-arrow"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
        >‹</button>
        <span className="pages">
          {String(sp.leftPage).padStart(2, "0")} – {String(sp.rightPage).padStart(2, "0")} / 60
        </span>
        <button
          className="nav-arrow"
          disabled={currentIdx === total - 1}
          onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
        >›</button>
        <div className="nav-spacer"></div>
        <button
          className="btn pdf-btn"
          onClick={() => window.print()}
          title="브라우저 인쇄 대화상자에서 ‘PDF로 저장’을 선택하세요"
        >
          ▤ PDF 변환
        </button>
      </div>

      {/* 인쇄 전용: 60p 전체 스프레드 */}
      <div className="print-only">
        {spreads.map(spr => (
          <div key={spr.index} className="book-spread print-spread">
            <PreviewPage
              page={spr.leftPage}
              meta={spr.leftMeta}
              topic={topic}
              coverImg={coverImg}
              backImg={backImg}
              data={completed[spr.index]}
              comicSide={comicSide}
              side="left"
              editable={false}
            />
            <SpineDeep />
            <PreviewPage
              page={spr.rightPage}
              meta={spr.rightMeta}
              topic={topic}
              coverImg={coverImg}
              backImg={backImg}
              data={completed[spr.index]}
              comicSide={comicSide}
              side="right"
              editable={false}
            />
          </div>
        ))}
      </div>

      {isBodySpread && (
        <div className="preview-edit-bar">
          <div className="edit-status">
            {dirty
              ? <span style={{color: "#a83232"}}>● 텍스트가 수정되었습니다 — 저장하세요</span>
              : (lastSaved
                  ? <span>✓ 저장됨 · {lastSaved}</span>
                  : <span>좌측 페이지의 텍스트를 클릭해 직접 수정할 수 있습니다</span>)
            }
          </div>
          <button
            className="btn primary"
            disabled={!dirty}
            onClick={onSaveEdit}
            style={{fontSize: 10}}
          >
            저장
          </button>
        </div>
      )}

      <div className="hint" style={{fontSize: 11}}>
        ← / → 키로 페이지를 넘길 · 펼침면 {currentIdx + 1} / {total} · 텍스트를 클릭해 수정 · ⚶ 버튼으로 확대 편집
      </div>

      {expandOpen && isBodySpread && (
        <div className="expand-modal" onClick={() => setExpandOpen(false)}>
          <div className="expand-card" onClick={(e) => e.stopPropagation()}>
            <div className="expand-head">
              <div>
                <div className="expand-title">확대 편집 · 스프레드 #{sp.index + 1}</div>
                <div className="expand-sub">pp.{sp.leftPage}–{sp.rightPage} · 수정 후 저장하면 책에 반영됩니다</div>
              </div>
              <button className="expand-x" onClick={() => setExpandOpen(false)}>✕</button>
            </div>
            <textarea
              className="expand-textarea"
              value={editBuf}
              onChange={(e) => { setEditBuf(e.target.value); setDirty(true); }}
              spellCheck="false"
              autoFocus
            />
            <div className="expand-foot">
              <span className="expand-meta">
                {editBuf.split("\n").filter(l => l.trim()).length}줄 · {editBuf.length}자
                {dirty && <span style={{color: "#a83232", marginLeft: 12}}>● 수정됨</span>}
              </span>
              <div style={{display: "flex", gap: 8}}>
                <button className="btn ghost" onClick={() => setExpandOpen(false)}>닫기</button>
                <button
                  className="btn primary"
                  disabled={!dirty}
                  onClick={onSaveEdit}
                >저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpineDeep() {
  // 실 노출 제본 시각화 — 가운데에 책등을 따라 굵게
  return (
    <div className="spine-deep">
      <svg viewBox="0 0 20 100" preserveAspectRatio="none" style={{position:"absolute", inset:0, width:"100%", height:"100%"}}>
        {Array.from({ length: 8 }).map((_, i) => {
          const y = ((i + 0.5) / 8) * 100;
          return (
            <g key={i}>
              <line x1="2" y1={y} x2="18" y2={y} stroke="rgba(74,36,21,0.55)" strokeWidth="0.6" strokeDasharray="1 0.8"/>
              <circle cx="10" cy={y} r="1.6" fill="#4a2415" />
              <circle cx="10" cy={y} r="1.6" fill="none" stroke="rgba(246,236,214,0.4)" strokeWidth="0.3"/>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PreviewPage({ page, meta, topic, coverImg, backImg, data, comicSide, side, editBuf, setEditBuf, editable, onExpandEdit }) {
  const T = window.TOPICS[topic];

  // 표지
  if (meta.section === "cover") {
    return (
      <div className={"spread-page " + side}>
        <div className={"cover-page " + (coverImg ? "has-image" : "")}>
          {coverImg && <img src={coverImg} alt="" />}
          {!coverImg && (
            <div className="cover-title">
              <div className="main">{T.nameKo}</div>
              <div className="sub">{T.sub}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  // 뒷표지
  if (meta.section === "back") {
    return (
      <div className={"spread-page " + side}>
        <div className={"cover-page " + (backImg ? "has-image" : "")} style={{background: backImg ? "#1a1410" : "var(--paper-warm)"}}>
          {backImg && <img src={backImg} alt="" />}
          {!backImg && (
            <div className="cover-title" style={{color: "var(--ink-soft)"}}>
              <div className="main" style={{fontSize: 28}}>❦</div>
              <div className="sub">FIN</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 프롤로그
  if (meta.section === "prologue") {
    return (
      <div className={"spread-page " + side}>
        <div className="text-page">
          {page === 2 && (
            <>
              <div className="label">Prologue</div>
              <h2>들어가며</h2>
              <p>이 책은 어렵다고 알려진 철학을 일상의 언어로 옮기려 한다.</p>
              <p>한 편의 4컷 만화와 한 장의 상징, 그리고 짧은 글이 한 쌍을 이룬다.</p>
              <p>왼쪽에서 이야기가 시작되고, 오른쪽에서 상이 맺힌다.</p>
              <div className="quote">"읽는 동안, 당신은 잠시 사유의 손님이 된다."</div>
            </>
          )}
          {page === 3 && (
            <>
              <div className="label">how to read</div>
              <h2>읽는 법</h2>
              <p>한 펼침면을 한 호흡으로 읽으십시오.</p>
              <p>4컷에서 일어난 일을 기억하며 오른쪽 그림을 바라보면, 두 장면이 마음 안에서 한 장의 풍경으로 합쳐집니다.</p>
              <p>이해하려 하기보다, 느끼려 하면 됩니다.</p>
            </>
          )}
          {page === 4 && (
            <>
              <div className="label">about the topic</div>
              <h2>{T.nameKo}에 관하여</h2>
              <p>{T.name === "Talmud" && "탈무드는 2천 년에 걸쳐 쌓인 유대의 지혜다. 정답이 아니라 질문하는 법을 알려준다."}</p>
              <p>{T.name === "Nietzsche" && "니체는 무너진 시대 위에서 다시 일어서는 법을 물었다. 절망 너머의 긍정이 있다."}</p>
              <p>{T.name === "Schopenhauer" && "쇼펜하우어는 욕망의 시계추를 멈추는 짧은 순간들을 사랑했다. 예술과 동정이 그 길이었다."}</p>
            </>
          )}
          <div className="page-num">{page}</div>
        </div>
      </div>
    );
  }

  // 챕터 타이틀
  if (meta.section === "chapter") {
    const isLeft = side === "left";
    if (isLeft && meta.idx === 1) {
      return (
        <div className={"spread-page " + side}>
          <div className="chapter-title-page">
            <div className="ch-num">PART · 01</div>
            <div className="ch-title">고요한 시작</div>
            <div className="ch-divider"></div>
            <div className="ch-desc">처음 만나는 12편의 사유.<br/>일상 안에 숨어 있는 질문들.</div>
            <div className="page-num">{page}</div>
          </div>
        </div>
      );
    }
    if (isLeft && meta.idx === 2) {
      return (
        <div className={"spread-page " + side}>
          <div className="chapter-title-page">
            <div className="ch-num">PART · 02</div>
            <div className="ch-title">깊어지는 침묵</div>
            <div className="ch-divider"></div>
            <div className="ch-desc">나머지 12편의 사유.<br/>당신의 한 줄을 기다리는 여백.</div>
            <div className="page-num">{page}</div>
          </div>
        </div>
      );
    }
    // 빈 오른쪽 (챕터 타이틀의 짝)
    return (
      <div className={"spread-page " + side}>
        <div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>
          <svg viewBox="0 0 100 100" width="40%">
            <circle cx="50" cy="50" r="32" stroke="var(--topic-accent)" strokeWidth="0.8" fill="none"/>
            <circle cx="50" cy="50" r="22" stroke="var(--topic-accent)" strokeWidth="0.8" fill="none"/>
            <circle cx="50" cy="50" r="12" stroke="var(--topic-accent)" strokeWidth="0.8" fill="none"/>
          </svg>
        </div>
        <div className="page-num">{page}</div>
      </div>
    );
  }

  // 에필로그
  if (meta.section === "epilogue") {
    return (
      <div className={"spread-page " + side}>
        <div className="text-page">
          {page === 57 && (<>
            <div className="label">Epilogue</div>
            <h2>마치며</h2>
            <p>한 페이지가 끝나도 사유는 계속된다.</p>
            <p>책을 덮은 뒤의 침묵이, 사실은 이 책이 시작되는 자리다.</p>
            <div className="quote">"끝은 다른 시작의 다른 이름."</div>
          </>)}
          {page === 58 && (<>
            <div className="label">closing letter</div>
            <h2>독자에게</h2>
            <p>여기까지 함께해 주어 고맙다.</p>
            <p>당신이 가장 오래 머문 한 페이지, 그 한 줄이 당신의 오늘이다.</p>
          </>)}
          {page === 59 && (<>
            <div className="label">colophon</div>
            <h2>제작</h2>
            <p>본 도서는 60페이지 24편의 사유로 구성되었습니다.</p>
            <p>표지는 무광 종이, 책등은 실 노출 제본.</p>
            <p>본문은 100g 미색지에 인쇄.</p>
          </>)}
          <div className="page-num">{page}</div>
        </div>
      </div>
    );
  }

  // 본문 (작품)
  if (meta.section === "body") {
    const isLeft = side === "left";
    // 4컷 위치 — 기본: 왼쪽에 4컷+글, 오른쪽 일러스트
    const showComicHere = (comicSide === "left" && isLeft) || (comicSide === "right" && !isLeft);

    if (showComicHere) {
      return (
        <div className={"spread-page " + side}>
          <div className="page-left-content">
            <div className="left-comic placeholder-label">
              {data?.comicImg ? (
                <img src={data.comicImg} alt="" />
              ) : [0,1,2,3].map(i => (
                <div key={i}>
                  <PanelGlyph shape={["circle","triangle","square","wave"][((meta.workIdx || 0) + i) % 4]} />
                </div>
              ))}
            </div>
            <div className="left-text">
              {(() => {
                const source = editable ? (editBuf || "") : (data?.body || "");
                const lines = source.split("\n");
                const firstIdx = lines.findIndex(l => l.trim().length > 0);
                const titleLine = firstIdx >= 0 ? lines[firstIdx] : "";
                if (editable) {
                  const titleIdx = lines.findIndex(l => l.trim().length > 0);
                  const restEditable = titleIdx >= 0
                    ? lines.slice(titleIdx + 1).join("\n")
                    : "";
                  return (
                    <>
                      <div className="text-title book-title-strong">
                        <span className="title-quote">“{titleLine || `사유 #${meta.workIdx}`}”</span>
                      </div>
                      <AutoFitTextarea
                        value={restEditable}
                        onChange={(v) => {
                          // title 유지 + 새 body 결합
                          const newSource = (titleLine ? titleLine + "\n" : "") + v;
                          setEditBuf(newSource);
                        }}
                        onExpand={onExpandEdit}
                      />
                    </>
                  );
                }
                // 빈 줄 제거
                const restCompact = (firstIdx >= 0
                  ? lines.slice(firstIdx + 1).join("\n")
                  : "")
                  .replace(/\n\s*\n+/g, "\n")
                  .trim();
                return (
                  <>
                    <div className="text-title book-title-strong">
                      <span className="title-quote">“{titleLine || `사유 #${meta.workIdx}`}”</span>
                    </div>
                    <AutoFitBody text={restCompact} />
                  </>
                );
              })()}
            </div>
          </div>
          <div className="page-num">{page}</div>
        </div>
      );
    } else {
      return (
        <div className={"spread-page " + side}>
          <div className="right-illust" style={{height: "100%"}}>
            {data?.illustImg ? (
              <img src={data.illustImg} alt="" />
            ) : (
              <svg viewBox="0 0 100 100" style={{width: "55%", height: "55%"}}>
                {(() => {
                  const seed = meta.workIdx || 0;
                  const glyphs = [
                    <g key="g1"><circle cx="50" cy="40" r="22" stroke="var(--ink)" strokeWidth="1.4" fill="none"/><path d="M30,65 L70,65" stroke="var(--ink)" strokeWidth="1.4"/></g>,
                    <g key="g2"><path d="M30,30 L70,30 L50,70 Z" stroke="var(--ink)" strokeWidth="1.4" fill="none"/></g>,
                    <g key="g3"><circle cx="40" cy="40" r="14" stroke="var(--ink)" strokeWidth="1.4" fill="none"/><circle cx="60" cy="55" r="14" stroke="var(--ink)" strokeWidth="1.4" fill="none"/></g>,
                    <g key="g4"><path d="M25,50 Q50,20 75,50" stroke="var(--ink)" strokeWidth="1.4" fill="none"/><path d="M25,55 Q50,80 75,55" stroke="var(--ink)" strokeWidth="1.4" fill="none"/></g>,
                    <g key="g5"><rect x="30" y="25" width="40" height="40" stroke="var(--ink)" strokeWidth="1.4" fill="none"/><line x1="30" y1="25" x2="70" y2="65" stroke="var(--ink)" strokeWidth="1.2"/></g>,
                    <g key="g6"><circle cx="50" cy="50" r="22" stroke="var(--ink)" strokeWidth="1.4" fill="none"/><circle cx="50" cy="50" r="10" stroke="var(--ink)" strokeWidth="1.4" fill="none"/></g>
                  ];
                  return glyphs[seed % glyphs.length];
                })()}
              </svg>
            )}
          </div>
          <div className="page-num">{page}</div>
        </div>
      );
    }
  }

  return (
    <div className={"spread-page " + side}>
      <div className="page-num">{page}</div>
    </div>
  );
}

Object.assign(window, { BookGrid, BookPreview });
