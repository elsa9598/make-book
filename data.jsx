/* data.jsx — 주제/카테고리/가상 파일 데이터 */

const TOPICS = {
  talmud: {
    id: "talmud",
    name: "Talmud",
    nameKo: "탈무드",
    sub: "지혜의 책",
    color: "#6e2828",
    accent: "#b8923b",
    categories: ["지혜", "관계", "돈과 부", "교육", "정의", "용기", "겸손", "시간", "신앙", "가족"],
    sampleQuotes: [
      { q: "한 사람을 구하는 것은 온 세계를 구하는 것이다.", cat: "정의" },
      { q: "현명한 자에게는 모든 사람이 스승이다.", cat: "교육" },
      { q: "혀는 마음의 펜이다.", cat: "관계" }
    ]
  },
  nietzsche: {
    id: "nietzsche",
    name: "Nietzsche",
    nameKo: "니체",
    sub: "초인의 길",
    color: "#1f1f23",
    accent: "#a83232",
    categories: ["초인", "권력 의지", "영원회귀", "자기극복", "고독", "운명애", "도덕", "예술", "허무", "춤과 웃음"],
    sampleQuotes: [
      { q: "당신을 죽이지 못하는 것은 당신을 더 강하게 만든다.", cat: "자기극복" },
      { q: "괴물과 싸우는 자는 자신도 괴물이 되지 않도록 조심해야 한다.", cat: "도덕" },
      { q: "사람은 극복되어야 할 그 무엇이다.", cat: "초인" }
    ]
  },
  schopenhauer: {
    id: "schopenhauer",
    name: "Schopenhauer",
    nameKo: "쇼펜하우어",
    sub: "의지와 표상",
    color: "#2f3a4d",
    accent: "#8b7355",
    categories: ["의지", "고통", "예술", "고독", "행복", "권태", "동정", "성격", "독서", "죽음"],
    sampleQuotes: [
      { q: "삶은 욕망과 권태 사이를 오가는 시계추다.", cat: "고통" },
      { q: "고독은 모든 위대한 영혼의 운명이다.", cat: "고독" },
      { q: "예술은 의지의 진정제다.", cat: "예술" }
    ]
  }
};

/* 가상 콘텐츠 폴더 — 데모용 미리 채워둠 */
function buildMockFiles() {
  const files = { a: [], b: [] };
  for (let i = 1; i <= 60; i++) {
    const num = String(i).padStart(3, "0");
    const isLeft = i % 2 === 1;
    const slot = isLeft ? "a" : "b";

    // 60페이지 모두 가상 파일 생성 (실제로는 사용자가 컨텐츠 폴더에 채워 넣음)
    files[slot].push({
      name: `${num}_${slot}.jpg`,
      page: i,
      slot,
      kind: isLeft ? "4cut" : "illust",
      section: getPageMeta(i).section,
      seed: i * 17
    });
  }
  return files;
}

const MOCK_FILES = buildMockFiles();

/* 책 구조 — 표지 별도 + 본문 인쇄물 16페이지 (임포지션은 8 스프레드, 2026-05-22 개정)
   · 표지          : 바깥 표지 1장, 펼침 기준 좌=뒤 / 우=앞
   · 본문 인쇄물   : 16페이지 (인쇄 임포지션 = 8 스프레드, 사장님 지정 배치)
   · 001_a~010_b   : 실제 작업 본문 5편의 카드 10장, 물리 페이지 4~13에 배치
   · 특수 페이지   : 1 철학종 / 2 공백 / 3 목차 / 14 공백 / 16 명언 / 15 오둥이
   · 줄공책        : 임포지션 맨 끝 1면(좌·우 20줄). 사장님이 별도로 여러 장 인쇄해 끼움.
   · 작업실 단위   : 기존처럼 본문 5편(각 2카드)만 편집한다.
*/
function getPageMeta(p) {
  if (p >= 1 && p <= 10) {
    const workIdx = Math.floor((p - 1) / 2) + 1;
    return { section: "body", label: `본문 #${String(workIdx).padStart(2, "0")}`, workIdx };
  }
  return { section: "blank", label: "" };
}

function buildSpreads() {
  const spreads = [];
  // 스프레드 0 — 표지 (펼침 기준: 뒤표지 / 앞표지)
  spreads.push({
    index: 0,
    leftPage: 0,
    rightPage: 0,
    leftMeta: { section: "back", label: "뒷표지" },
    rightMeta: { section: "cover", label: "앞표지" }
  });
  // 스프레드 1~5 — 본문
  for (let i = 1; i <= 5; i++) {
    const left = (i - 1) * 2 + 1;   // 1,3,5,7,9  (_a 왼쪽)
    const right = (i - 1) * 2 + 2;  // 2,4,6,8,10 (_b 오른쪽)
    spreads.push({
      index: i,
      leftPage: left,
      rightPage: right,
      workIdx: i,
      leftMeta: { section: "body", label: `본문 #${String(i).padStart(2, "0")}`, workIdx: i },
      rightMeta: { section: "body", label: `본문 #${String(i).padStart(2, "0")}`, workIdx: i }
    });
  }
  return spreads;
}

const BOOK_SPREADS = buildSpreads();

/* 4컷 일러스트 placeholder generator — 실제로는 컨텐츠 폴더에서 불러옴 */
function panelArt(seed, panelIdx) {
  // simple shape vocab
  const shapes = ["circle", "triangle", "square", "wave", "line"];
  const s = shapes[(seed + panelIdx) % shapes.length];
  return s;
}

/* 카테고리 한→영 (영문판 카드 헤더용 · 철학 표준 용어) */
const CATEGORY_EN = {
  // 탈무드
  "지혜": "Wisdom", "관계": "Relationships", "돈과 부": "Money & Wealth",
  "교육": "Education", "정의": "Justice", "용기": "Courage", "겸손": "Humility",
  "시간": "Time", "신앙": "Faith", "가족": "Family",
  // 니체
  "초인": "The Overman", "권력 의지": "Will to Power", "영원회귀": "Eternal Recurrence",
  "자기극복": "Self-Overcoming", "고독": "Solitude", "운명애": "Amor Fati",
  "도덕": "Morality", "예술": "Art", "허무": "Nihilism", "춤과 웃음": "Dance & Laughter",
  // 쇼펜하우어
  "의지": "The Will", "고통": "Suffering", "행복": "Happiness", "권태": "Boredom",
  "동정": "Compassion", "성격": "Character", "독서": "Reading", "죽음": "Death"
};

Object.assign(window, {
  TOPICS,
  CATEGORY_EN,
  MOCK_FILES,
  BOOK_SPREADS,
  getPageMeta,
  panelArt,
  sectionLabel: (s) => ({
    cover: "표지",
    frontInner: "앞내지",
    contents: "목차",
    prologue: "프롤로그",
    chapter: "챕터 표제",
    body: "본문",
    epilogue: "에필로그",
    back: "뒷표지"
  }[s] || s)
});
