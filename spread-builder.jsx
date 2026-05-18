/* spread-builder.jsx — 폴더 / 스프레드 미리보기 / MAKE 버튼 */

const { useState: useStateSB, useMemo } = React;

/* 4컷 만화 placeholder 그림 — 컨텐츠 폴더 가상 썸네일 */
function FourCutThumb({ seed = 0 }) {
  const shapes = ["circle", "triangle", "square", "wave"];
  return (
    <div className="thumb-4cut">
      {[0, 1, 2, 3].map(i => (
        <div key={i}>
          <PanelGlyph shape={shapes[(seed + i) % 4]} />
        </div>
      ))}
    </div>
  );
}

function PanelGlyph({ shape }) {
  const style = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div style={style}>
      <svg viewBox="0 0 40 40" width="55%" height="55%" style={{ opacity: 0.55 }}>
        {shape === "circle" && <circle cx="20" cy="20" r="12" stroke="#4a2415" strokeWidth="1.4" fill="none" />}
        {shape === "triangle" && <polygon points="20,7 33,30 7,30" stroke="#4a2415" strokeWidth="1.4" fill="none" />}
        {shape === "square" && <rect x="9" y="9" width="22" height="22" stroke="#4a2415" strokeWidth="1.4" fill="none" />}
        {shape === "wave" && <path d="M5,22 Q12,12 20,22 T35,22" stroke="#4a2415" strokeWidth="1.4" fill="none" />}
      </svg>
    </div>
  );
}

function IllustThumb({ seed = 0 }) {
  const glyphs = [
    <g key="g1"><circle cx="50" cy="40" r="22" stroke="#4a2415" strokeWidth="1.6" fill="none"/><path d="M30,65 L70,65" stroke="#4a2415" strokeWidth="1.6"/></g>,
    <g key="g2"><path d="M30,30 L70,30 L50,70 Z" stroke="#4a2415" strokeWidth="1.6" fill="none"/></g>,
    <g key="g3"><circle cx="40" cy="40" r="14" stroke="#4a2415" strokeWidth="1.6" fill="none"/><circle cx="60" cy="55" r="14" stroke="#4a2415" strokeWidth="1.6" fill="none"/></g>,
    <g key="g4"><path d="M25,50 Q50,20 75,50" stroke="#4a2415" strokeWidth="1.6" fill="none"/><path d="M25,55 Q50,80 75,55" stroke="#4a2415" strokeWidth="1.6" fill="none"/></g>,
    <g key="g5"><rect x="30" y="25" width="40" height="40" stroke="#4a2415" strokeWidth="1.6" fill="none"/><line x1="30" y1="25" x2="70" y2="65" stroke="#4a2415" strokeWidth="1.2"/></g>,
    <g key="g6"><circle cx="50" cy="50" r="22" stroke="#4a2415" strokeWidth="1.6" fill="none"/><circle cx="50" cy="50" r="10" stroke="#4a2415" strokeWidth="1.6" fill="none"/></g>
  ];
  return (
    <div className="thumb-illust">
      <svg viewBox="0 0 100 100">{glyphs[seed % glyphs.length]}</svg>
    </div>
  );
}

/* 좌·우측 페이지 첨부 슬롯 (표지 첨부와 같은 패턴) */
function AttachSlot({ filename, img, onChange, kind, aspect }) {
  const inputRef = React.useRef(null);
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = (ev) => onChange(ev.target.result);
    r.readAsDataURL(f);
  };
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => onChange(ev.target.result);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="attach-slot">
      <div
        className={"attach-thumb " + (img ? "has-image" : "")}
        style={{aspectRatio: aspect}}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        title="클릭하거나 이미지를 끌어다 놓으세요"
      >
        <input type="file" ref={inputRef} accept="image/*" onChange={handleFile} />
        {img ? (
          <img src={img} alt="" />
        ) : (
          <div className="attach-empty">
            <div className="attach-icon">⊕</div>
            <div className="attach-kind">{kind}</div>
            <div className="attach-sub">클릭 · 드래그 첨부</div>
          </div>
        )}
      </div>
      <div className="attach-meta">
        <span className="attach-filename">{filename}</span>
        {img && (
          <button
            className="attach-clear"
            onClick={() => onChange(null)}
          >제거</button>
        )}
      </div>
    </div>
  );
}

/* 컨텐츠 폴더 — 좌(a) / 우(b) 파일 선택 */
function ContentFolder({ slot, label, selected, onSelect }) {
  const files = window.MOCK_FILES[slot] || [];
  return (
    <div className="folder">
      <div className="folder-head">
        <span>📁 contents/{slot === "a" ? "left_9x16" : "right_1x1"}/</span>
        <span>{files.length}개</span>
      </div>
      <div className="folder-grid">
        {files.length === 0 && (
          <div style={{gridColumn: "1/-1", textAlign: "center", padding: "20px 0", color: "var(--ink-faint)", fontStyle: "italic"}}>
            이 폴더는 비어 있습니다
          </div>
        )}
        {files.map(f => (
          <div
            key={f.name}
            className={"file-card" + (selected === f.name ? " selected" : "")}
            onClick={() => onSelect(f.name === selected ? null : f.name)}
            title={`page ${f.page}`}
          >
            <div className="file-thumb">
              {f.kind === "4cut" ? <FourCutThumb seed={f.seed} /> : <IllustThumb seed={f.seed} />}
            </div>
            <div className="file-name">{f.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 스프레드 미리보기 — 작업 중인 한 쌍 */
function SpreadPreview({
  spreadIdx, leftPage, rightPage,
  comicSeed, illustSeed,
  comicImg, illustImg,
  onComicUpload, onIllustUpload,
  bodyText,
  comicSide = "left",
}) {
  const comicInputRef = React.useRef(null);
  const illustInputRef = React.useRef(null);

  const handleFile = (e, cb) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => cb(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const handleDrop = (e, cb) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => cb(ev.target.result);
    reader.readAsDataURL(f);
  };
  const Comic = (
    <div
      className={"left-comic " + (comicImg ? "" : "empty placeholder-label") + " droppable"}
      onClick={() => comicInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, onComicUpload)}
      title="클릭 또는 드래그 · 9:16 4컷 이미지 첨부"
    >
      <input type="file" ref={comicInputRef} accept="image/*" onChange={(e) => handleFile(e, onComicUpload)} />
      {comicImg ? (
        <img src={comicImg} alt="4컷" />
      ) : [0, 1, 2, 3].map(i => (
        <div key={i}>
          <PanelGlyph shape={["circle","triangle","square","wave"][(comicSeed + i) % 4]} />
        </div>
      ))}
      {!comicImg && <div className="attach-hint">⤷ 4컷 첨부</div>}
    </div>
  );

  const Text = (
    <div className="left-text">
      {(() => {
        const lines = (bodyText || "").split("\n");
        const firstNonEmpty = lines.findIndex(l => l.trim().length > 0);
        const titleLine = firstNonEmpty >= 0 ? lines[firstNonEmpty] : "";
        const rest = (firstNonEmpty >= 0
          ? lines.slice(firstNonEmpty + 1).join("\n")
          : "")
          .replace(/\n\s*\n+/g, "\n")
          .trim();
        return (
          <>
            <div className="text-title">
              <span className="title-quote">{titleLine ? `“${titleLine}”` : "—"}</span>
            </div>
            <div className="text-body">{rest || "본문이 아직 작성되지 않았습니다."}</div>
          </>
        );
      })()}
    </div>
  );

  const Illust = (
    <div
      className={"right-illust " + (illustImg ? "" : "empty") + " droppable"}
      onClick={() => illustInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, onIllustUpload)}
      title="클릭 또는 드래그 · 1:1 상징 일러스트 첨부"
    >
      <input type="file" ref={illustInputRef} accept="image/*" onChange={(e) => handleFile(e, onIllustUpload)} />
      {illustImg ? (
        <img src={illustImg} alt="일러스트" />
      ) : (
        <>
          <svg viewBox="0 0 100 100" style={{ width: "55%", height: "55%" }}>
            {(() => {
              const glyphs = [
                <g key="g1"><circle cx="50" cy="40" r="22" stroke="var(--ink)" strokeWidth="1.6" fill="none"/><path d="M30,65 L70,65" stroke="var(--ink)" strokeWidth="1.6"/></g>,
                <g key="g2"><path d="M30,30 L70,30 L50,70 Z" stroke="var(--ink)" strokeWidth="1.6" fill="none"/></g>,
                <g key="g3"><circle cx="40" cy="40" r="14" stroke="var(--ink)" strokeWidth="1.6" fill="none"/><circle cx="60" cy="55" r="14" stroke="var(--ink)" strokeWidth="1.6" fill="none"/></g>
              ];
              return glyphs[illustSeed % glyphs.length];
            })()}
          </svg>
          <div className="attach-hint">⤷ 1:1 일러스트 첨부</div>
        </>
      )}
    </div>
  );

  // 좌 페이지: 4컷 + 글  /  우 페이지: 일러스트   (기본)
  // tweak으로 4컷 위치를 오른쪽 페이지로 옮길 수 있음
  return (
    <div className="spread-stage">
      <div className="spread">
        <div className="spread-page left">
          {comicSide === "left" ? (
            <div className="page-left-content">
              {Comic}
              {Text}
            </div>
          ) : (
            Illust
          )}
          <div className="page-num">{leftPage}</div>
        </div>

        <Spine />

        <div className="spread-page right">
          {comicSide === "left" ? (
            Illust
          ) : (
            <div className="page-left-content">
              {Comic}
              {Text}
            </div>
          )}
          <div className="page-num">{rightPage}</div>
        </div>
      </div>
    </div>
  );
}

/* 실 노출 제본 spine */
function Spine({ tall = false }) {
  // 5~7개의 스티치
  const count = tall ? 7 : 6;
  return (
    <div className="spine">
      <svg viewBox="0 0 14 100" preserveAspectRatio="none">
        {Array.from({ length: count }).map((_, i) => {
          const y = ((i + 0.5) / count) * 100;
          return (
            <g key={i}>
              <line x1="0" y1={y} x2="14" y2={y} stroke="rgba(74,36,21,0.45)" strokeWidth="0.5" strokeDasharray="1 0.7"/>
              <circle cx="7" cy={y} r="1.4" fill="#4a2415" />
            </g>
          );
        })}
        <line x1="7" y1="0" x2="7" y2="100" stroke="rgba(74,36,21,0.18)" strokeWidth="0.6"/>
      </svg>
    </div>
  );
}

Object.assign(window, {
  FourCutThumb, IllustThumb, PanelGlyph,
  ContentFolder, SpreadPreview, Spine,
  AttachSlot
});
