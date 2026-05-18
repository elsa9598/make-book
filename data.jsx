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

/* 책 구조 — 60페이지 = 30 스프레드
   페이지 1   : 표지(단독, a-side로 왼쪽 첫장)
   페이지 2-4 : 프롤로그 (3p)
   페이지 5-8 : 챕터 타이틀 (4p, 2장)
   페이지 9-56: 본문 (48p, 24 works = 24 spreads)
   페이지 57-60: 에필로그 (4p)
   ※ 사용자 정의: 표지는 1페이지, 뒷표지는 60페이지로 가정
*/
function getPageMeta(p) {
  if (p === 1) return { section: "cover", label: "표지" };
  if (p >= 2 && p <= 4) return { section: "prologue", label: `프롤로그 ${p - 1}/3` };
  if (p >= 5 && p <= 6) return { section: "chapter", label: `1부 표제`, idx: 1 };
  if (p >= 7 && p <= 8) return { section: "chapter", label: `2부 표제`, idx: 2 };
  if (p >= 9 && p <= 56) {
    const workIdx = Math.floor((p - 9) / 2) + 1;
    return { section: "body", label: `본문 #${String(workIdx).padStart(2, "0")}`, workIdx };
  }
  if (p >= 57 && p <= 59) return { section: "epilogue", label: `에필로그 ${p - 56}/3` };
  if (p === 60) return { section: "back", label: "뒷표지" };
  return { section: "blank", label: "" };
}

function buildSpreads() {
  // 30 spreads: (1,2), (3,4), ... (59,60)
  // 단 사용자 정의 페이지1=a(왼쪽), 페이지2=b(오른쪽) → 스프레드는 (홀,짝)
  const spreads = [];
  for (let i = 0; i < 30; i++) {
    const left = i * 2 + 1;
    const right = i * 2 + 2;
    spreads.push({
      index: i,
      leftPage: left,
      rightPage: right,
      leftMeta: getPageMeta(left),
      rightMeta: getPageMeta(right)
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

Object.assign(window, {
  TOPICS,
  MOCK_FILES,
  BOOK_SPREADS,
  getPageMeta,
  panelArt,
  sectionLabel: (s) => ({
    cover: "표지",
    prologue: "프롤로그",
    chapter: "챕터 표제",
    body: "본문",
    epilogue: "에필로그",
    back: "뒷표지"
  }[s] || s)
});
