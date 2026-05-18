/* prompt-data.jsx — 캐릭터 프리셋 + 프롬프트 옵션 데이터
   옵션은 { value (영문, 프롬프트용), label (한글, UI용) } 형태 */

const CHARACTERS = [
  {
    id: "sangchu", ko: "상추", en: "Sangchu",
    species: "🐶",
    desc: "Old English Sheepdog, large and sturdy 35kg heavy-set breed, entire head and both ears must be 100% pure solid white without any gray markings, white fluffy chest and white front legs, dark charcoal gray fur starting strictly from the shoulders and covering the back and hindquarters, very cute big round gentle puppy eyes with heterochromia: one soft brown eye and one soft blue eye, sparkling kind expression, rounded fluffy muzzle, large soft body, thick shaggy fur texture, the tail is entirely solid dark charcoal gray, very short and stubby, absolutely no white color at the tip, gentle loyal protector personality."
  },
  {
    id: "yeolmu", ko: "열무", en: "Yeolmu",
    species: "🐶",
    desc: "Papillon dog, small and dainty 5kg toy breed, brown and white fur pattern, very large butterfly-shaped ears with long brown ear fur and soft feathered edges, warm brown round expressive eyes, white blaze running down the center of the face, white muzzle, white chest and belly, brown patches on the face and body, fluffy curled tail with white and brown fur, elegant tiny body, gentle cheerful expression, cute refined cartoon style."
  },
  {
    id: "baechu", ko: "배추", en: "Baechu",
    species: "🐶",
    desc: "American Cocker Spaniel, medium-sized 15kg dog, golden beige and cream silky wavy fur, long floppy ears with thick flowing wavy curls, large warm gentle brown eyes, small rounded brown-black nose, sweet innocent smiling expression, fluffy cream chest fur, rounded forehead, soft golden tan coloring throughout the body, short soft tail, plush cute cartoon proportions, warm friendly personality."
  },
  {
    id: "ggami", ko: "까미", en: "Ggami",
    species: "🐱",
    desc: "Gray tuxedo cat, dark charcoal gray body with white chest and white belly, round face with dark charcoal gray mask pattern over the head and around the eyes, white muzzle area, distinctive thick black mustache marking above the mouth, sharp yellow amber half-lidded eyes with intense tsundere gaze, small pink heart-shaped nose, pink inner ears, pink heart-shaped paw pads, compact muscular body, long dark gray tail, grumpy exterior but secretly caring personality, bold clean cartoon line style."
  },
  {
    id: "gimchi", ko: "김치", en: "Gimchi",
    species: "🐱",
    desc: "Scottish Fold cat, all white fluffy coat, distinctive folded flat ears pressed close to a very round chubby head, sharp yellow amber half-lidded eyes with perpetually grumpy stern expression, small pink heart-shaped nose, tiny freckles near the nose, short whisker lines, plump round chubby body, short stubby legs, soft rounded paws, thick fluffy tail, always looks displeased and unimpressed, minimalist clean cartoon style."
  },
  {
    id: "dniro", ko: "드니로", en: "Dniro",
    species: "👤",
    desc: "Male human character, height 178cm, weight 70kg, young adult appearance in soft Ghibli-inspired animation style, dark brown short straight hair parted naturally, calm gentle face, soft warm eyes, straight eyebrows, natural relaxed expression, slim-to-average build, casual light gray hoodie or simple everyday clothes, jeans or casual pants, relaxed confident posture, kind and quiet atmosphere."
  },
  {
    id: "elsa", ko: "엘사", en: "Elsa",
    species: "👤",
    desc: "Female human character, height 167cm, weight 55kg, young adult woman in soft Ghibli-inspired animation style, medium-length dark brown slightly wavy bob hair, warm smiling face, soft brown eyes, gentle curved eyebrows, natural soft facial features, approachable calm expression, slim natural build, casual gray hoodie or simple everyday clothing, warm thoughtful mood, friendly emotional presence."
  },
  {
    id: "jeongman", ko: "정만", en: "Jeongman",
    species: "👤",
    desc: "Female human character, height 172cm, weight 60kg, young adult woman in soft Ghibli-inspired watercolor animation style, long flowing black wavy hair, distinctive round black glasses, warm gentle smile, kind thoughtful eyes behind the glasses, natural elegant face, slim-to-average build, blue or earth-tone casual outdoor clothing, nature-loving intellectual atmosphere, calm confident posture, soft wind-blown hair, warm countryside mood."
  }
];

const BACKGROUNDS = [
  // 자연
  { value: "ancient forest at dawn", label: "새벽의 고대 숲" },
  { value: "misty mountain peak", label: "안개 자욱한 산 정상" },
  { value: "quiet lakeside at sunrise", label: "해 뜨는 호숫가" },
  { value: "wildflower meadow under blue sky", label: "푸른 하늘 들꽃 들판" },
  { value: "autumn maple grove", label: "단풍나무 숲" },
  { value: "snow-covered pine forest", label: "눈 덮인 소나무 숲" },
  { value: "rocky seaside cliff", label: "바닷가 절벽" },
  { value: "tranquil bamboo grove", label: "고요한 대나무 숲" },
  { value: "cherry blossom path in spring", label: "봄 벚꽃길" },
  { value: "moonlit river bank", label: "달빛 비치는 강가" },
  { value: "starlit desert", label: "별빛 사막" },
  { value: "tropical jungle clearing", label: "열대 정글" },
  // 도시 / 실내
  { value: "old library with tall shelves", label: "오래된 도서관" },
  { value: "cozy cafe by the window", label: "창가의 작은 카페" },
  { value: "rainy city street at night", label: "비 오는 밤거리" },
  { value: "rooftop terrace at golden hour", label: "황금빛 옥상 테라스" },
  { value: "minimalist Japanese tatami room", label: "다다미 방" },
  { value: "european cobblestone alley", label: "유럽 골목길" },
  { value: "Korean traditional hanok courtyard", label: "한옥 마당" },
  { value: "subway platform late at night", label: "심야 지하철 승강장" },
  { value: "art gallery interior", label: "미술관 내부" },
  { value: "small bookstore with warm lighting", label: "따뜻한 헌책방" },
  { value: "vintage train compartment", label: "옛 기차 객실" },
  { value: "rustic kitchen with morning light", label: "아침 햇살 부엌" },
  // 추상 / 상징
  { value: "endless white void with single tree", label: "흰 여백 속 나무 하나" },
  { value: "floating islands in pastel sky", label: "파스텔 하늘 떠 있는 섬" },
  { value: "labyrinth of mirrors", label: "거울 미로" },
  { value: "ocean of clouds at dusk", label: "황혼의 구름 바다" },
  { value: "ruined ancient temple", label: "폐허가 된 신전" },
  { value: "stone bridge over silent water", label: "고요한 물 위 돌다리" }
];

const TIMES = [
  { value: "dawn first light", label: "여명" },
  { value: "early morning golden hour", label: "이른 아침 황금빛" },
  { value: "late morning soft light", label: "오전 부드러운 빛" },
  { value: "midday bright sunlight", label: "정오 강한 햇빛" },
  { value: "afternoon warm light", label: "오후 따뜻한 빛" },
  { value: "late afternoon long shadows", label: "늦은 오후 긴 그림자" },
  { value: "golden hour before sunset", label: "노을 직전 골든아워" },
  { value: "blue hour after sunset", label: "노을 직후 블루아워" },
  { value: "twilight purple sky", label: "보랏빛 황혼" },
  { value: "evening lamp light", label: "저녁 등불" },
  { value: "midnight starry", label: "한밤 별빛" },
  { value: "deep night with moonlight", label: "달빛 깊은 밤" }
];

const MOODS = [
  { value: "melancholic", label: "쓸쓸한" },
  { value: "hopeful", label: "희망적인" },
  { value: "serene", label: "잔잔한" },
  { value: "contemplative", label: "사색적인" },
  { value: "nostalgic", label: "그리운" },
  { value: "mysterious", label: "신비로운" },
  { value: "warm and intimate", label: "따뜻하고 친밀한" },
  { value: "lonely", label: "외로운" },
  { value: "uplifting", label: "고양되는" },
  { value: "bittersweet", label: "씁쓸하고 달콤한" },
  { value: "spiritual", label: "영적인" },
  { value: "peaceful", label: "평화로운" },
  { value: "tense and quiet", label: "긴장된 정적" },
  { value: "dreamlike", label: "꿈결 같은" },
  { value: "introspective", label: "내면을 향한" },
  { value: "longing", label: "그리움" },
  { value: "comforting", label: "위로하는" },
  { value: "wistful", label: "애틋한" },
  { value: "ethereal", label: "초월적인" },
  { value: "grounded and earthy", label: "흙냄새 나는" }
];

const WEATHERS = [
  { value: "clear blue sky", label: "맑은 하늘" },
  { value: "soft drifting clouds", label: "부드러운 구름" },
  { value: "overcast gentle gray", label: "흐린 회색" },
  { value: "light drizzle", label: "가는 비" },
  { value: "heavy rain", label: "장대비" },
  { value: "after-rain shimmer", label: "비 갠 뒤 반짝임" },
  { value: "morning mist", label: "아침 안개" },
  { value: "thick fog", label: "짙은 안개" },
  { value: "first snowfall", label: "첫눈" },
  { value: "blizzard", label: "눈보라" },
  { value: "spring breeze", label: "봄바람" },
  { value: "autumn wind with falling leaves", label: "낙엽 가을바람" },
  { value: "summer heat haze", label: "여름 아지랑이" },
  { value: "stormy with distant lightning", label: "먼 천둥과 폭풍" },
  { value: "rainbow after rain", label: "비 갠 무지개" }
];

const LIGHTINGS = [
  { value: "soft window light", label: "부드러운 창문 빛" },
  { value: "warm rim light", label: "따뜻한 윤곽광" },
  { value: "backlight halo", label: "역광 후광" },
  { value: "cinematic side lighting", label: "시네마틱 측광" },
  { value: "candlelight glow", label: "촛불 빛" },
  { value: "lantern warmth", label: "등잔 온기" },
  { value: "moonlight silver", label: "은빛 달빛" },
  { value: "neon city reflections", label: "도시 네온 반사" },
  { value: "fireplace amber", label: "벽난로 호박빛" },
  { value: "diffused overcast light", label: "흐린 날 산광" },
  { value: "harsh noon shadow", label: "한낮의 강한 그림자" },
  { value: "split-light chiaroscuro", label: "명암 대비 키아로스쿠로" },
  { value: "volumetric god rays", label: "신의 빛줄기" },
  { value: "lens flare from setting sun", label: "노을 렌즈 플레어" },
  { value: "underwater caustics", label: "수중 빛결" }
];

const CAMERA_VIEWS = [
  { value: "bird's eye view", label: "버드아이 (조감)" },
  { value: "high angle", label: "하이앵글" },
  { value: "eye-level medium shot", label: "아이레벨 미디엄" },
  { value: "low angle dramatic", label: "로우앵글" },
  { value: "close-up portrait", label: "클로즈업 인물" },
  { value: "extreme close-up", label: "익스트림 클로즈업" },
  { value: "wide establishing shot", label: "와이드 설정샷" },
  { value: "over-the-shoulder", label: "오버숄더" },
  { value: "front facing", label: "정면" },
  { value: "rear back-shot", label: "후면" },
  { value: "side profile", label: "측면 프로필" },
  { value: "Dutch angle", label: "더치앵글" },
  { value: "isometric perspective", label: "아이소메트릭" },
  { value: "two-shot composition", label: "투샷" },
  { value: "POV first-person", label: "1인칭 POV" }
];

const FOCUS_PRESETS = [
  { value: "shallow depth of field, sharp subject and soft creamy bokeh", label: "얕은 심도 · 인물 선명 + 배경 보케" },
  { value: "deep focus, everything sharp from foreground to background", label: "딥포커스 · 전·중·후경 전부 선명" },
  { value: "rack focus from foreground object to character", label: "랙 포커스 · 전경→인물 초점 이동" },
  { value: "blurred foreground frame with sharp midground subject", label: "흐린 전경 프레임 + 선명한 중경 인물" },
  { value: "tilt-shift miniature effect", label: "틸트쉬프트 미니어처" }
];

const ART_STYLES = [
  {
    id: "oil",
    ko: "마띠에르 유화",
    label: "Impasto Oil",
    en: "thick impasto oil painting style, palette knife technique, rough textured matiere, sculptural dimensional brushstrokes, tactile surface, rich saturated pigment, visible knife marks and ridges"
  },
  {
    id: "watercolor",
    ko: "수채화",
    label: "Watercolor",
    en: "soft watercolor wash with natural pigment bleeds, gentle gradient boundaries, transparent overlapping layers, organic flowing brushwork, paper-grain visible"
  },
  {
    id: "cinematic-wc",
    ko: "시네마틱 수채화",
    label: "Cinematic WC",
    en: "cinematic watercolor with strong shallow depth of field, sharp focal subject and soft dreamy out-of-focus watercolor wash background, atmospheric perspective, painterly cinematic framing, rich tonal range"
  },
  {
    id: "ghibli",
    ko: "지브리 감성",
    label: "Ghibli",
    en: "soft Studio Ghibli inspired animation style, hand-drawn warmth, gentle natural lighting, lush nature integration, emotional storytelling, painterly cel-shading"
  },
  {
    id: "post-imp",
    ko: "포스트 인상주의",
    label: "Post-Imp",
    en: "post-impressionist emotional painting style, expressive bold brushwork, intensified non-naturalistic color, structured composition with rhythmic strokes, in the spirit of Cézanne and Van Gogh"
  }
];

const RATIOS = ["1:1", "3:2", "7:5", "16:9", "9:16", "5:7", "2:3"];

const COMIC_RULES_KO = [
  "9:16 세로 4컷 만화 (위→아래 4컷, 각 컷 흰 테두리)",
  "지문·말풍선·자막·의성어·번호·라벨 등 텍스트 일체 금지 — 모든 의미를 이미지만으로 전달",
  "전개·발단·위기·결말 구조 — 명언을 직역하지 않고 시적으로 의역",
  "1·2·3·4컷의 카메라뷰는 중복 없이 다양하게 (조감/전신/미디엄/후면/정면/로우앵글/투시/클로즈/와이드/아이소메트릭/측면 중 4개)",
  "4컷 중 한 컷은 무작위로 세로 2등분 — 우측은 손·눈·사물 같은 상징 요소의 클로즈뷰",
  "캐릭터 외모는 모든 컷에서 동일 유지 (얼굴·머리·옷·체형·색감). 표정과 자세만 풍부하게 변화",
  "심도(포커스/아웃포커스)로 메시지 강조 — 선명한 부분이 그 컷의 주제",
  "1컷→4컷으로 이어지는 상징 사물·빛·색 모티브가 미세하게 변화하며 명언의 의미를 시각적으로 운반",
  "조명은 각 컷의 감정에 맞춰 자동 구성",
  "시네마틱 수채화 — 자연스러운 물번짐, 부드러운 그라데이션, 얕은 심도"
];

const COMIC_RULES = `4-panel vertical comic strip, strict 9:16 aspect ratio, single image containing four stacked panels from top to bottom, consistent thin white border around each panel.
IMAGE-ONLY STORYTELLING — absolutely NO text, NO captions, NO speech bubbles, NO dialogue, NO narration, NO written words, NO subtitles, NO onomatopoeia, NO sound effect text, NO panel numbers, NO labels of any kind anywhere in the image. The meaning of the philosophical quote MUST be conveyed purely through visual storytelling: through facial expressions, body language, gestures, posture, eye direction, hand positions, symbolic objects, color temperature, light and shadow, composition, and scene staging alone.
Story arc structure: panel 1 — quiet introduction that establishes the character's ordinary state through one telling visual detail; panel 2 — an external trigger or inner stirring shown through a single concrete action or object; panel 3 — visible turning point dramatized by a strong visual contrast (light shift, posture break, mirrored framing, or a meaningful object change); panel 4 — quiet resolution that reveals the quote's truth through a small but unmistakable visual transformation in the character or scene compared to panel 1. The story is a poetic, indirect interpretation of the quote — never a literal illustration of its words.
Randomly choose one panel out of four to be split vertically in half: the left half continues the main scene of that panel, while the right half is a tight wordless close-up of a meaningful element (a hand, an eye, an object, a tear, a touched surface) from the same moment that carries the panel's emotional weight.
Each panel must use a different and dynamic camera view drawn from this pool — no repeats: bird's-eye view, full-body shot, medium shot, rear view, front view, low-angle, perspective view, close-up, wide shot, isometric view, side profile.
Each panel uses clear depth-of-field focus and defocus to dramatize the quote's meaning with persuasion — what is sharp tells the viewer what the moment is truly about.
Character appearance must remain perfectly consistent across all panels (same face, hair, clothing, body proportions, color palette), but emotional expressions and body poses must vary expressively from panel to panel so the inner change is legible without any words.
Use recurring symbolic objects, light direction, or color motifs that subtly evolve from panel 1 to panel 4 to visually carry the meaning of the quote.
Lighting is automatically chosen per panel to match the story beat.
Art direction: cinematic watercolor with natural water bleeding and soft color gradients, shallow depth of field, sharp clear focal subjects against soft painterly out-of-focus backgrounds.`;

Object.assign(window, {
  CHARACTERS, BACKGROUNDS, TIMES, MOODS, WEATHERS, LIGHTINGS,
  CAMERA_VIEWS, FOCUS_PRESETS, ART_STYLES, RATIOS, COMIC_RULES, COMIC_RULES_KO
});
