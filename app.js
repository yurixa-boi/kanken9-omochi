"use strict";

/*
 * おもち先生と学ぶ 漢検9級チャレンジ
 * Ver.2.1.2
 *
 * このファイルでは、学習・復習・ガチャなどの既存機能に加えて、
 * 漢字図鑑、ミスノート、手書きプリントを同じ学習記録から動かします。
 * Ver.2.1.2では、問題文を文脈付きにし、正解位置を毎回分散させ、
 * 漢検9級（小学校1・2年生配当）の範囲外だった漢字を修正しました。
 *
 * 大切な互換性ルール：
 * LocalStorageのキー「KANJI9_SAVE_V2」は変更しません。
 * 以前の保存データに新しい項目がない場合は、defaults()の内容を
 * merge()で補うため、これまでの進捗やガチャデータを残したまま使えます。
 */

const STORAGE_KEY = "KANJI9_SAVE_V2";
const BACKUP_KEY = "KANJI9_BACKUP";
/* 現在実装済みのカリキュラムと冒険マップは20日分です。 */
const COURSE_DAYS = 20;
const APP_VERSION = "2.1.2";

const FACES = {
  normal: "assets/images/omochi-01-3b54909ac76c.png",
  happy: "assets/images/omochi-02-262385e34177.png",
  smile: "assets/images/omochi-03-1a5323ab4b4e.png",
  sad: "assets/images/omochi-04-debbe8228792.png",
  think: "assets/images/omochi-01-3b54909ac76c.png"
};

const MASCOT = FACES.normal;

/*
 * 現在公開中の学習範囲です。
 * 1つの配列が1日分で、1日5字×読み5問・書き5問を作ります。
 */
const CURRICULUM = [
  ["山", "川", "空", "石", "田"],
  ["春", "夏", "秋", "冬", "雪"],
  ["東", "西", "南", "北", "前"],
  ["父", "母", "兄", "姉", "弟"],
  ["朝", "昼", "夜", "時", "分"],
  ["友", "話", "聞", "読", "書"],
  ["食", "肉", "米", "魚", "茶"],
  ["歩", "走", "止", "道", "近"],
  ["学", "校", "教", "室", "算"],
  ["春", "南", "母", "夜", "書"],
  ["数", "半", "足", "引", "同"],
  ["長", "形", "丸", "角", "線"],
  ["色", "明", "黒", "光", "白"],
  ["鳥", "鳴", "馬", "牛", "羽"],
  ["花", "木", "草", "林", "森"],
  ["町", "店", "市", "公", "園"],
  ["工", "買", "作", "会", "売"],
  ["楽", "元", "強", "弱", "心"],
  ["立", "行", "帰", "来", "休"],
  ["計", "形", "明", "鳥", "市"]
];

const AVAILABLE_DAYS = CURRICULUM.length;

/*
 * Ver.2.1.1までに漢検9級の範囲外だった漢字を差し替えた問題IDです。
 * IDをそのまま使っているため、初回移行時だけ旧問題の復習履歴を外します。
 * それ以外の問題履歴、学習日、星、ガチャなどは一切削除しません。
 */
const AUDITED_REPLACED_QUESTION_IDS = new Set([
  "d7r1", "d7w1",
  "d12r1", "d12w1",
  "d13r2", "d13w2",
  "d15r1", "d15w1", "d15r3", "d15w3", "d15r4", "d15w4",
  "d16r2", "d16w2",
  "d17r0", "d17w0", "d17r1", "d17w1", "d17r3", "d17w3",
  "d19r1", "d19w1", "d19r2", "d19w2", "d19r3", "d19w3", "d19r4", "d19w4",
  "d20r1", "d20w1", "d20r4", "d20w4"
]);

/*
 * READINGSは「このアプリの問題で使う読み」です。
 * 漢和辞典に載るすべての読みを示す項目ではありません。
 */
const READINGS = {
  "山": "やま", "川": "かわ", "空": "そら", "石": "いし", "田": "た",
  "春": "はる", "夏": "なつ", "秋": "あき", "冬": "ふゆ", "雪": "ゆき",
  "東": "ひがし", "西": "にし", "南": "みなみ", "北": "きた", "前": "まえ",
  "父": "ちち", "母": "はは", "兄": "あに", "姉": "あね", "弟": "おとうと",
  "朝": "あさ", "昼": "ひる", "夜": "よる", "時": "とき", "分": "ふん",
  "友": "とも", "話": "はなし", "聞": "きく", "読": "よむ", "書": "かく",
  "食": "たべる", "肉": "にく", "米": "こめ", "魚": "さかな", "茶": "ちゃ",
  "歩": "あるく", "走": "はしる", "止": "とまる", "道": "みち", "近": "ちかい",
  "学": "まなぶ", "校": "こう", "教": "おしえる", "室": "しつ", "算": "さん",
  "数": "かず", "半": "はん", "足": "たす", "引": "ひく", "同": "おなじ",
  "長": "ながい", "形": "かたち", "丸": "まる", "角": "かど", "線": "せん",
  "色": "いろ", "明": "あかるい", "黒": "くろ", "光": "ひかり", "白": "しろ",
  "鳥": "とり", "鳴": "なく", "馬": "うま", "牛": "うし", "羽": "はね",
  "花": "はな", "木": "き", "草": "くさ", "林": "はやし", "森": "もり",
  "町": "まち", "店": "みせ", "市": "し", "公": "こう", "園": "えん",
  "工": "こう", "買": "かう", "作": "つくる", "会": "あう", "売": "うる",
  "楽": "たのしい", "元": "げん", "強": "つよい", "弱": "よわい", "心": "こころ",
  "立": "たつ", "行": "いく", "帰": "かえる", "来": "くる", "休": "やすむ",
  "計": "はかる"
};

/* 図鑑カードとプリントに表示する、短く読みやすい例文です。 */
const EXAMPLES = {
  "山": "山にのぼる。", "川": "川の水がながれる。", "空": "青い空を見上げる。", "石": "丸い石をひろう。", "田": "田に水を入れる。",
  "春": "春に花がさく。", "夏": "夏の海であそぶ。", "秋": "秋に木の葉が色づく。", "冬": "冬に雪がふる。", "雪": "白い雪がつもる。",
  "東": "東から日がのぼる。", "西": "西に日がしずむ。", "南": "南へすすむ。", "北": "北の空を見る。", "前": "前をむいて歩く。",
  "父": "父と出かける。", "母": "母と料理をする。", "兄": "兄と話す。", "姉": "姉と本を読む。", "弟": "弟とあそぶ。",
  "朝": "朝早くおきる。", "昼": "昼ごはんを食べる。", "夜": "夜は星が見える。", "時": "出発する時を決める。", "分": "五分だけ休む。",
  "友": "友だちと学ぶ。", "話": "先生の話を聞く。", "聞": "音をよく聞く。", "読": "本を声に出して読む。", "書": "ノートに字を書く。",
  "食": "ごはんを食べる。", "肉": "肉を食べる。", "米": "米をとぐ。", "魚": "魚が川をおよぐ。", "茶": "あたたかいお茶をのむ。",
  "歩": "道を歩く。", "走": "校庭を走る。", "止": "赤信号で止まる。", "道": "学校までの道。", "近": "家の近くの公園。",
  "学": "漢字を学ぶ。", "校": "学校へ行く。", "教": "先生が教える。", "室": "教室に入る。", "算": "算数の問題をとく。",
  "数": "星の数をかぞえる。", "半": "半分にわける。", "足": "二と三を足す。", "引": "五から二を引く。", "同": "同じ色をえらぶ。",
  "長": "長いひもをむすぶ。", "形": "丸い形をかく。", "丸": "紙に丸をかく。", "角": "紙の角をそろえる。", "線": "まっすぐな線を引く。",
  "色": "好きな色をぬる。", "明": "明るいへや。", "黒": "黒い紙に書く。", "光": "朝の光がさす。", "白": "白い雲がうかぶ。",
  "鳥": "鳥が空をとぶ。", "鳴": "鳥が鳴く。", "馬": "馬が草原を走る。", "牛": "牛が草を食べる。", "羽": "鳥の羽を見つける。",
  "花": "赤い花がさく。", "木": "木の下で休む。", "草": "草の上にすわる。", "林": "林の中を歩く。", "森": "森で鳥の声を聞く。",
  "町": "にぎやかな町を歩く。", "店": "店でパンを買う。", "市": "市でおまつりがある。", "公": "公園であそぶ。", "園": "公園に花がさく。",
  "工": "工場で車を作る。", "買": "店で本を買う。", "作": "紙で花を作る。", "会": "友だちに会う。", "売": "店で野菜を売る。",
  "楽": "楽しくべんきょうする。", "元": "元気にあいさつする。", "強": "強い風がふく。", "弱": "弱い力でおす。", "心": "やさしい心をもつ。",
  "立": "いすから立つ。", "行": "学校へ行く。", "帰": "家に帰る。", "来": "友だちが来る。", "休": "学校を休む。", "計": "時間を計る。"
};

const AREA_BG = {
  forest: "assets/images/omochi-05-75614288795c.webp",
  flower: "assets/images/omochi-06-6e1e1ce060c3.webp",
  town: "assets/images/omochi-07-bad5b467551a.webp",
  sea: "assets/images/omochi-08-89a3b9fdf6dc.webp",
  snow: "assets/images/omochi-09-dac41058cf4b.webp",
  castle: "assets/images/omochi-10-21d09e72ffae.webp"
};

const AREAS = [
  { name: "はじめの森", key: "forest", start: 1, end: 5 },
  { name: "花の丘", key: "flower", start: 6, end: 10 },
  { name: "青空の町", key: "town", start: 11, end: 15 },
  { name: "海辺の道", key: "sea", start: 16, end: 20 }
];

const MAP_COORDS = [[8, 72], [25, 60], [45, 68], [65, 49], [88, 38]];

const STICKER_CATALOG = [
  { id: "area5", icon: "🌳", name: "森の宝箱シール" },
  { id: "area10", icon: "🌸", name: "花の丘シール" },
  { id: "area15", icon: "🏘️", name: "青空の町シール" },
  { id: "area20", icon: "🌊", name: "海辺の宝箱シール" },
  { id: "bonus1", icon: "⭐", name: "がんばり星" },
  { id: "bonus2", icon: "📚", name: "読書のおもち先生" }
];

const GACHA_ITEMS = [
  { id: "g1", icon: "🎩", name: "シルクハット", rarity: "N", weight: 26 },
  { id: "g2", icon: "👓", name: "まるメガネ", rarity: "N", weight: 25 },
  { id: "g3", icon: "🎀", name: "赤いリボン", rarity: "N", weight: 22 },
  { id: "g4", icon: "🧢", name: "冒険キャップ", rarity: "R", weight: 13 },
  { id: "g5", icon: "🦸", name: "ヒーローマント", rarity: "R", weight: 8 },
  { id: "g6", icon: "👑", name: "きらきら王冠", rarity: "SR", weight: 5 },
  { id: "g7", icon: "🌈", name: "虹のおもちオーラ", rarity: "SSR", weight: 1 }
];

const $ = id => document.getElementById(id);

/*
 * CURRICULUMから、同じ漢字を1度だけ収録した図鑑データを作ります。
 * firstDayは、その漢字が最初に登場するDayです。
 */
const KANJI_CATALOG = (() => {
  const seen = new Set();
  const result = [];
  CURRICULUM.forEach((characters, dayIndex) => {
    characters.forEach(character => {
      if (seen.has(character)) return;
      seen.add(character);
      result.push({
        character,
        reading: READINGS[character] || "",
        example: EXAMPLES[character] || `「${character}」をつかった文を作ろう。`,
        firstDay: dayIndex + 1
      });
    });
  });
  return result;
})();

/* 新しくゲームを始めるときの初期データです。 */
function defaults() {
  return {
    version: APP_VERSION,
    profile: { name: "" },
    progress: {
      currentDay: 1,
      completedDays: [],
      totalStars: 0,
      streak: 0,
      lastStudyDate: ""
    },
    statistics: { totalCorrect: 0, totalWrong: 0, sessions: [] },
    review: { queue: [], history: {}, weakIds: [] },
    stickers: { owned: [] },
    gacha: { tickets: 0, owned: [], history: [] },
    daily: { lastLogin: "", loginStreak: 0, totalDays: 0 },
    rewards: {
      catalog: [
        { id: "r1", icon: "🍦", name: "アイス", cost: 20 },
        { id: "r2", icon: "📺", name: "動画15分", cost: 15 },
        { id: "r3", icon: "🥤", name: "コーラ", cost: 25 },
        { id: "r4", icon: "🍩", name: "好きなおやつ", cost: 20 }
      ],
      earned: []
    },
    player: { totalExp: 0, equippedItemId: "" },
    kanji: { stats: {}, printSelection: [] },
    ui: { mood: "normal" },
    parent: { pinHash: "", pinEnabled: false },
    meta: { updatedAt: new Date().toISOString() }
  };
}

/*
 * 以前の保存データに足りない項目だけを初期値から補います。
 * 配列は以前の内容をそのまま使い、オブジェクトは深い階層まで統合します。
 */
function merge(base, saved) {
  if (!saved || typeof saved !== "object") {
    return JSON.parse(JSON.stringify(base));
  }

  if (Array.isArray(base)) {
    return Array.isArray(saved) ? saved : JSON.parse(JSON.stringify(base));
  }

  const result = {};
  Object.keys(base).forEach(key => {
    if (base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      result[key] = merge(base[key], saved[key]);
    } else {
      result[key] = saved[key] !== undefined ? saved[key] : base[key];
    }
  });

  Object.keys(saved).forEach(key => {
    if (result[key] === undefined) result[key] = saved[key];
  });

  return result;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return merge(defaults(), saved);
  } catch (error) {
    return defaults();
  }
}

let data = load();

/* HTMLへ入れる文字列を安全に表示するための簡単な変換です。 */
function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value) {
  if (!value) return "まだ記録なし";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function getLevel(totalExp = data.player.totalExp || 0) {
  return Math.floor(totalExp / 100) + 1;
}

function getLevelProgress(totalExp = data.player.totalExp || 0) {
  return totalExp % 100;
}

/* 問題から、その問題で学習している漢字を取り出します。 */
function questionKanji(question) {
  if (!question) return "";
  if (question.kanji) return question.kanji;
  if (question.type === "読み") return question.main;
  return question.choices && question.choices[question.answer]
    ? question.choices[question.answer]
    : "";
}

/*
 * 旧版のreview.historyを漢字単位の成績へ変換します。
 * 変換済みの漢字には加算しないため、起動するたびに数字が増えることはありません。
 */
function migrateData() {
  const needsQuestionAuditMigration = data.version !== APP_VERSION;

  /*
   * 差し替え前の問題を苦手問題として出さないよう、該当IDだけを整理します。
   * 旧問題と新問題は同じIDなので、ここを残すと別の漢字へ誤って履歴が
   * 引き継がれる可能性があります。
   */
  if (needsQuestionAuditMigration) {
    AUDITED_REPLACED_QUESTION_IDS.forEach(questionId => {
      delete data.review.history[questionId];
    });
    data.review.queue = (data.review.queue || []).filter(item => !AUDITED_REPLACED_QUESTION_IDS.has(item.id));
    data.review.weakIds = (data.review.weakIds || []).filter(questionId => !AUDITED_REPLACED_QUESTION_IDS.has(questionId));
  }

  data.version = APP_VERSION;
  data.player = data.player || { totalExp: 0, equippedItemId: "" };
  data.kanji = data.kanji || { stats: {}, printSelection: [] };
  data.kanji.stats = data.kanji.stats || {};
  data.kanji.printSelection = Array.isArray(data.kanji.printSelection)
    ? data.kanji.printSelection.filter(character => KANJI_CATALOG.some(item => item.character === character))
    : [];

  /* 過去版で別の場所に保存されていた可能性がある装備情報も引き継ぎます。 */
  if (!data.player.equippedItemId && data.ui && data.ui.equippedItemId) {
    data.player.equippedItemId = data.ui.equippedItemId;
  }

  /* 過去版のレベル・EXP項目がある場合は、現在のtotalExpへ読み替えます。 */
  if (!data.player.totalExp) {
    const oldLevel = Number(data.player.level || data.progress.level || 1);
    const oldExp = Number(data.player.exp || data.progress.exp || 0);
    if (oldLevel > 1 || oldExp > 0) {
      data.player.totalExp = Math.max(0, (oldLevel - 1) * 100 + oldExp);
    }
  }

  Object.entries(data.review.history || {}).forEach(([questionId, history]) => {
    const question = getQuestionById(questionId);
    const character = questionKanji(question);
    if (!character || data.kanji.stats[character]) return;

    const firstSession = (data.statistics.sessions || []).find(item => item.day === question.day);
    data.kanji.stats[character] = {
      attempts: Number(history.correctCount || 0) + Number(history.wrongCount || 0),
      correct: Number(history.correctCount || 0),
      wrong: Number(history.wrongCount || 0),
      correctStreak: Math.max(0, Number(history.correctCount || 0) - Number(history.wrongCount || 0)),
      firstStudiedAt: firstSession ? firstSession.date : "",
      lastStudiedAt: firstSession ? firstSession.date : ""
    };
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    /* 保存できない環境でも、画面上ではそのまま利用できるようにします。 */
  }
}

function save() {
  data.meta.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderAll();
  } catch (error) {
    toast("保存できませんでした");
  }
}

function show(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === screenId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (screenId === "map") renderMap();
  if (screenId === "stickers") renderStickers();
  if (screenId === "gacha") renderGacha();
  if (screenId === "rewards") renderRewards();
  if (screenId === "parent") renderParent();
  if (screenId === "dress") renderDress();
  if (screenId === "dict") renderDictionary();
  if (screenId === "practice") renderPractice();
}

let toastTimer = null;
function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2300);
}

/* 暗証番号をそのまま保存しないための簡易ハッシュです。 */
function hash(pinValue) {
  let result = 2166136261;
  for (const character of `omochi|${pinValue}`) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}

/*
 * 1日分の10問を作ります。
 * 読みが複数ある漢字を単独で表示すると正解を決められないことがあるため、
 * 読み問題も書き問題も、必ず短い例文の中で出題します。
 */
function generateQuestions(day) {
  const characters = CURRICULUM[day - 1] || CURRICULUM[0];
  const questions = [];

  for (let index = 0; index < 5; index += 1) {
    const character = characters[index];
    const reading = READINGS[character] || character;
    const example = EXAMPLES[character] || `${character}をつかった文。`;
    const otherReadings = characters
      .filter(item => item !== character)
      .map(item => READINGS[item] || item)
      .slice(0, 2);

    questions.push({
      id: `d${day}r${index}`,
      day,
      type: "読み",
      kanji: character,
      prompt: `文の中の【${character}】の読みを選ぼう`,
      main: example,
      choices: [reading, ...otherReadings],
      answer: 0,
      explain: `この文の【${character}】は「${reading}」と読みます。`
    });
  }

  for (let index = 0; index < 5; index += 1) {
    const character = characters[index];
    const reading = READINGS[character] || character;
    const example = EXAMPLES[character] || `${character}をつかった文。`;
    const otherCharacters = characters.filter(item => item !== character).slice(0, 2);

    questions.push({
      id: `d${day}w${index}`,
      day,
      type: index === 4 ? "まとめ" : "書き",
      kanji: character,
      prompt: `「${reading}」と読む、□に入る漢字を選ぼう`,
      main: example.replace(character, "□"),
      choices: [character, ...otherCharacters],
      answer: 0,
      explain: `□には「${character}」が入ります。`
    });
  }

  return questions;
}

/* 配列を直接書き換えず、ランダムな順番の複製を返します。 */
function shuffledCopy(values) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/*
 * 選択肢の正解位置を学習開始ごとに組み替えます。
 * 上・中央・下がほぼ同じ回数になる位置リストを先に作り、そのリスト自体を
 * ランダムに混ぜます。偏りと単純な並び方の両方を避けています。
 * 不正解の2択も入れ替え、位置だけで答えを覚えにくくしています。
 */
function prepareQuestionsForSession(questions) {
  const answerPositions = shuffledCopy(questions.map((question, index) => index % question.choices.length));

  return questions.map((question, questionIndex) => {
    const correctChoice = question.choices[question.answer];
    const incorrectChoices = question.choices.filter((choice, choiceIndex) => choiceIndex !== question.answer);
    const targetAnswerIndex = answerPositions[questionIndex];
    const choices = shuffledCopy(incorrectChoices);
    choices.splice(targetAnswerIndex, 0, correctChoice);

    return {
      ...question,
      choices,
      answer: targetAnswerIndex
    };
  });
}

function getQuestionById(questionId) {
  for (let day = 1; day <= AVAILABLE_DAYS; day += 1) {
    const question = generateQuestions(day).find(item => item.id === questionId);
    if (question) return question;
  }
  return null;
}

let session = null;

function startStudy(day, customQuestions) {
  const safeDay = Math.max(1, Math.min(AVAILABLE_DAYS, day || 1));
  let questions = customQuestions ? customQuestions.slice() : generateQuestions(safeDay);

  /* 通常学習のときだけ、復習期限が来た問題を最大3問追加します。 */
  if (!customQuestions) {
    const reviewQuestions = (data.review.queue || [])
      .filter(item => item.dueDay <= safeDay)
      .map(item => getQuestionById(item.id))
      .filter(Boolean)
      .slice(0, 3);
    questions = questions.concat(reviewQuestions);
  }

  /* 復習問題を追加した後、全問題の正解位置をまとめて分散させます。 */
  questions = prepareQuestionsForSession(questions);

  session = {
    day: safeDay,
    questions,
    index: 0,
    correct: 0,
    wrong: [],
    results: [],
    combo: 0,
    maxCombo: 0,
    stars: 0,
    answered: false
  };

  $("studyDay").textContent = `Day ${safeDay}`;
  $("sessionStars").textContent = "0";
  show("study");
  renderQuestion();
}

function renderQuestion() {
  if (session.index >= session.questions.length) {
    finishStudy();
    return;
  }

  setMood("think");
  const question = session.questions[session.index];
  session.answered = false;

  $("studyBar").style.width = `${Math.round(session.index / session.questions.length * 100)}%`;
  $("qtype").textContent = question.type;
  $("qprompt").textContent = question.prompt;
  $("qmain").textContent = question.main;
  $("qmain").classList.toggle("sentence", question.main.length > 4);
  $("feedback").className = "feedback";
  $("nextBtn").classList.add("hidden");
  $("combo").textContent = session.combo >= 2 ? `🔥 ${session.combo}コンボ！` : "";

  const choices = $("choices");
  choices.innerHTML = "";
  question.choices.forEach((choice, choiceIndex) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.textContent = choice;
    button.addEventListener("click", () => answer(choiceIndex, button));
    choices.appendChild(button);
  });
}

function answer(choiceIndex, selectedButton) {
  if (session.answered) return;
  session.answered = true;

  const question = session.questions[session.index];
  const isCorrect = choiceIndex === question.answer;

  Array.from($("choices").children).forEach((button, index) => {
    button.disabled = true;
    if (index === question.answer) button.classList.add("ok");
  });

  if (!isCorrect) selectedButton.classList.add("ng");

  const feedback = $("feedback");
  session.results.push({ question, isCorrect });

  if (isCorrect) {
    setMood(session.combo >= 4 ? "happy" : "smile");
    session.correct += 1;
    session.combo += 1;
    session.maxCombo = Math.max(session.maxCombo, session.combo);
    session.stars += 1;
    feedback.className = "feedback show ok";
    feedback.textContent = `せいかい！ ${question.explain}`;
    if ([5, 10].includes(session.combo)) burst(25);
  } else {
    setMood("sad");
    session.combo = 0;
    session.wrong.push(question);
    feedback.className = "feedback show ng";
    feedback.textContent = `おしい！ ${question.explain}`;
  }

  $("sessionStars").textContent = String(session.stars);
  $("combo").textContent = session.combo >= 2 ? `🔥 ${session.combo}コンボ！` : "";
  $("nextBtn").classList.remove("hidden");
}

/* 問題単位の復習データを、これまでと同じ形式で更新します。 */
function updateReview() {
  const queue = (data.review.queue || []).filter(item => {
    return !session.questions.some(question => question.id === item.id);
  });

  session.results.forEach(result => {
    const question = result.question;
    const history = data.review.history[question.id] || {
      wrongCount: 0,
      correctCount: 0,
      level: 0
    };

    if (!result.isCorrect) {
      history.wrongCount += 1;
      history.level = 1;
      queue.push({
        id: question.id,
        dueDay: Math.min(AVAILABLE_DAYS, session.day + 1),
        level: 1
      });
    } else {
      history.correctCount += 1;
      if (history.wrongCount > 0 && history.correctCount < history.wrongCount + 3) {
        history.level = Math.min(4, (history.level || 1) + 1);
        const gap = [0, 1, 3, 5, 7][history.level];
        queue.push({
          id: question.id,
          dueDay: Math.min(AVAILABLE_DAYS, session.day + gap),
          level: history.level
        });
      }
    }

    data.review.history[question.id] = history;
  });

  data.review.queue = queue;
  data.review.weakIds = Object.entries(data.review.history)
    .map(([id, history]) => ({
      id,
      score: Number(history.wrongCount || 0) * 2 - Number(history.correctCount || 0)
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20)
    .map(item => item.id);
}

/* 漢字単位の図鑑成績を更新し、ミスノートとプリントに連動させます。 */
function updateKanjiStatistics() {
  const now = new Date().toISOString();

  session.results.forEach(result => {
    const character = questionKanji(result.question);
    if (!character) return;

    const statistics = data.kanji.stats[character] || {
      attempts: 0,
      correct: 0,
      wrong: 0,
      correctStreak: 0,
      firstStudiedAt: now,
      lastStudiedAt: now
    };

    statistics.attempts += 1;
    statistics.lastStudiedAt = now;
    if (!statistics.firstStudiedAt) statistics.firstStudiedAt = now;

    if (result.isCorrect) {
      statistics.correct += 1;
      statistics.correctStreak += 1;
    } else {
      statistics.wrong += 1;
      statistics.correctStreak = 0;
    }

    data.kanji.stats[character] = statistics;
  });
}

function finishStudy() {
  updateReview();
  updateKanjiStatistics();

  data.statistics.totalCorrect += session.correct;
  data.statistics.totalWrong += session.wrong.length;
  data.statistics.sessions.push({
    day: session.day,
    date: new Date().toISOString(),
    correct: session.correct,
    total: session.questions.length
  });

  data.progress.totalStars += session.stars;
  data.gacha.tickets = (data.gacha.tickets || 0) + 1;

  /* 正解1問につき10EXP、学習完了ボーナスとして20EXPを加えます。 */
  const previousLevel = getLevel();
  data.player.totalExp += session.correct * 10 + 20;
  const newLevel = getLevel();

  setMood(session.correct === session.questions.length ? "happy" : "smile");

  if (!data.progress.completedDays.includes(session.day)) {
    data.progress.completedDays.push(session.day);
  }
  data.progress.completedDays.sort((left, right) => left - right);
  data.progress.currentDay = Math.min(
    AVAILABLE_DAYS,
    Math.max(data.progress.currentDay, session.day + 1)
  );

  const today = localDateKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);

  if (data.progress.lastStudyDate !== today) {
    data.progress.streak = data.progress.lastStudyDate === yesterday
      ? data.progress.streak + 1
      : 1;
    data.progress.lastStudyDate = today;
  }

  save();
  renderResult();
  show("result");

  if (newLevel > previousLevel) {
    toast(`🎉 レベル${newLevel}になったよ！`);
    burst(55);
  } else {
    toast("🎫 ガチャ券を1枚もらったよ！");
  }

  if ([5, 10, 15, 20].includes(session.day)
      && !data.stickers.owned.includes(`area${session.day}`)) {
    setTimeout(() => openTreasure(session.day), 450);
  }
}

function renderResult() {
  const accuracy = Math.round(session.correct / session.questions.length * 100);
  $("resultStars").textContent = accuracy === 100
    ? "⭐⭐⭐"
    : accuracy >= 80
      ? "⭐⭐☆"
      : accuracy >= 60
        ? "⭐☆☆"
        : "☆☆☆";

  $("correctNum").textContent = String(session.correct);
  $("totalNum").textContent = String(session.questions.length);
  $("resultMsg").textContent = accuracy === 100
    ? "全問正解！すごい！"
    : accuracy >= 80
      ? "とてもよくできました！"
      : "まちがいは成長のたねだよ！";

  const wrongList = $("wrongList");
  wrongList.innerHTML = session.wrong.length
    ? ""
    : "<div class='notice'>全問正解です！</div>";

  session.wrong.forEach(question => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<b>${escapeHTML(question.main)}</b><br><small>正解：${escapeHTML(question.choices[question.answer])}</small>`;
    wrongList.appendChild(item);
  });

  $("retryBtn").classList.toggle("hidden", !session.wrong.length);
}

/* -------------------- ぼうけんマップ・シール帳 -------------------- */

function renderMap() {
  const completed = new Set(data.progress.completedDays);
  const currentDay = Math.min(AVAILABLE_DAYS, data.progress.currentDay);

  $("mapProgress").textContent = `${completed.size} / ${AVAILABLE_DAYS}日`;
  const currentArea = AREAS.find(area => currentDay >= area.start && currentDay <= area.end) || AREAS[AREAS.length - 1];
  $("mapPlace").textContent = currentArea.name;

  const container = $("mapContainer");
  container.innerHTML = "";

  AREAS.forEach(area => {
    const article = document.createElement("article");
    article.className = "map-area";
    article.style.backgroundImage = `url("${AREA_BG[area.key]}")`;
    article.innerHTML = `<div class="map-label">${area.name}　Day${area.start}〜${area.end}</div><div class="map-route"></div>`;

    const route = article.querySelector(".map-route");
    const landmark = document.createElement("div");
    landmark.className = "landmark chest";
    landmark.style.setProperty("--x", "91%");
    landmark.style.setProperty("--y", "68%");
    landmark.textContent = "🎁";
    route.appendChild(landmark);

    for (let day = area.start; day <= area.end; day += 1) {
      const node = document.createElement("div");
      const [x, y] = MAP_COORDS[day - area.start];
      node.className = `node${completed.has(day) ? " done" : day === currentDay ? " now" : " lock"}`;
      node.style.setProperty("--x", `${x}%`);
      node.style.setProperty("--y", `${y}%`);

      const content = completed.has(day)
        ? "✓"
        : day === currentDay
          ? `<img src="${MASCOT}" alt="おもち先生">`
          : "🔒";

      node.innerHTML = `<div class="step">${content}</div><small>Day ${day}</small>`;
      route.appendChild(node);
    }

    container.appendChild(article);
  });
}

function renderStickers() {
  const grid = $("stickerGrid");
  grid.innerHTML = "";

  STICKER_CATALOG.forEach(sticker => {
    const owned = data.stickers.owned.includes(sticker.id);
    const card = document.createElement("div");
    card.className = `sticker${owned ? " got" : ""}`;
    card.innerHTML = `<div class="big">${owned ? sticker.icon : "？"}</div><b>${owned ? sticker.name : "まだ見つけていないシール"}</b><small>${owned ? "獲得済み" : "未獲得"}</small>`;
    grid.appendChild(card);
  });
}

function openTreasure(day) {
  const sticker = STICKER_CATALOG.find(item => item.id === `area${day}`);
  if (!sticker) return;

  data.stickers.owned.push(sticker.id);
  save();
  $("treasureText").textContent = `Day${day}をクリアして宝箱を開けたよ！`;
  $("treasureIcon").textContent = sticker.icon;
  $("treasureName").textContent = sticker.name;
  $("treasureModal").classList.add("show");
  burst(45);
}

/* -------------------- ガチャ・着せ替え -------------------- */

function setMood(mood) {
  data.ui = data.ui || {};
  data.ui.mood = mood;

  const image = $("homeMascot");
  const mark = $("homeMood");
  const marks = { normal: "😊", think: "🤔", smile: "😄", happy: "🥳", sad: "💪" };

  if (image) image.src = FACES[mood] || FACES.normal;
  if (mark) mark.textContent = marks[mood] || "😊";
}

function weightedItem() {
  const totalWeight = GACHA_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  let randomValue = Math.random() * totalWeight;

  for (const item of GACHA_ITEMS) {
    randomValue -= item.weight;
    if (randomValue <= 0) return item;
  }

  return GACHA_ITEMS[0];
}

function renderGacha() {
  $("gachaTickets").textContent = String(data.gacha.tickets || 0);
  $("drawGacha").disabled = (data.gacha.tickets || 0) < 1;
  $("drawGacha").textContent = (data.gacha.tickets || 0) < 1
    ? "ガチャ券がありません"
    : "ガチャを回す（1枚）";

  const collection = $("gachaCollection");
  collection.innerHTML = "";

  GACHA_ITEMS.forEach(item => {
    const owned = (data.gacha.owned || []).includes(item.id);
    const card = document.createElement("div");
    card.className = `collect-item${owned ? " got" : ""}`;
    card.innerHTML = `<span class="emoji">${owned ? item.icon : "？"}</span><b>${owned ? item.name : "未発見"}</b><small>${owned ? item.rarity : ""}</small>`;
    collection.appendChild(card);
  });
}

function drawGacha() {
  if ((data.gacha.tickets || 0) < 1) {
    toast("ガチャ券がありません");
    return;
  }

  data.gacha.tickets -= 1;
  const item = weightedItem();
  const isNew = !data.gacha.owned.includes(item.id);

  if (isNew) data.gacha.owned.push(item.id);
  data.gacha.history.push({ id: item.id, date: new Date().toISOString(), isNew });
  save();

  $("gachaMachine").classList.add("spin");
  $("drawGacha").disabled = true;
  $("gachaTitle").textContent = "ガラガラ…";

  setTimeout(() => {
    $("gachaMachine").classList.remove("spin");
    $("gachaTitle").textContent = "おもちガチャ";
    $("gachaRarity").className = `rarity ${item.rarity}`;
    $("gachaRarity").textContent = item.rarity;
    $("gachaIcon").textContent = item.icon;
    $("gachaName").textContent = item.name;
    $("gachaResultText").textContent = isNew
      ? "新しいアイテムです！着せ替え画面で装備できます。"
      : "持っているアイテムなので、⭐3個に交換しました。";

    if (!isNew) data.progress.totalStars += 3;
    $("gachaMascot").src = FACES.happy;
    save();
    $("gachaModal").classList.add("show");
    burst(item.rarity === "SSR" ? 70 : item.rarity === "SR" ? 50 : 30);
    renderGacha();
  }, 1200);
}

function applyEquipment() {
  const equipped = GACHA_ITEMS.find(item => item.id === data.player.equippedItemId);
  const homeAccessory = $("homeAccessory");
  const homeWrap = $("homeFaceWrap");

  if (homeAccessory) {
    homeAccessory.textContent = equipped ? equipped.icon : "";
    homeAccessory.dataset.itemId = equipped ? equipped.id : "";
  }
  if (homeWrap) homeWrap.classList.toggle("rainbow-aura", Boolean(equipped && equipped.id === "g7"));
}

function renderDress() {
  const equipped = GACHA_ITEMS.find(item => item.id === data.player.equippedItemId);
  $("dressMascot").src = FACES.happy;
  $("dressAccessory").textContent = equipped ? equipped.icon : "";
  $("dressAccessory").dataset.itemId = equipped ? equipped.id : "";
  $("dressFaceWrap").classList.toggle("rainbow-aura", Boolean(equipped && equipped.id === "g7"));
  $("dressEquippedName").textContent = equipped ? `${equipped.name}を装備中` : "何もつけていません";

  const list = $("dressList");
  list.innerHTML = "";

  const removeButton = document.createElement("button");
  removeButton.className = `dress-item${!equipped ? " selected" : ""}`;
  removeButton.innerHTML = "<span>○</span><b>何もつけない</b><small>装備を外す</small>";
  removeButton.addEventListener("click", () => {
    data.player.equippedItemId = "";
    save();
    renderDress();
    toast("装備を外しました");
  });
  list.appendChild(removeButton);

  GACHA_ITEMS.forEach(item => {
    const owned = data.gacha.owned.includes(item.id);
    const button = document.createElement("button");
    button.className = `dress-item${data.player.equippedItemId === item.id ? " selected" : ""}${owned ? "" : " locked"}`;
    button.disabled = !owned;
    button.innerHTML = `<span>${owned ? item.icon : "🔒"}</span><b>${owned ? item.name : "未獲得"}</b><small>${owned ? item.rarity : "ガチャで獲得"}</small>`;

    if (owned) {
      button.addEventListener("click", () => {
        data.player.equippedItemId = item.id;
        save();
        renderDress();
        toast(`${item.name}を装備しました`);
      });
    }

    list.appendChild(button);
  });
}

/* -------------------- 漢字図鑑・ミスノート -------------------- */

function getKanjiStatistics(character) {
  const statistics = data.kanji.stats[character];
  if (statistics) return statistics;

  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    correctStreak: 0,
    firstStudiedAt: "",
    lastStudiedAt: ""
  };
}

function isKanjiLearned(item) {
  return data.progress.completedDays.includes(item.firstDay)
    || data.progress.currentDay > item.firstDay
    || getKanjiStatistics(item.character).attempts > 0;
}

function getKanjiWeakScore(character) {
  const statistics = getKanjiStatistics(character);
  return statistics.wrong * 2 - statistics.correct;
}

function isWeakKanji(character) {
  return getKanjiStatistics(character).wrong > 0 && getKanjiWeakScore(character) > 0;
}

function getWeakKanji() {
  return KANJI_CATALOG
    .filter(item => isWeakKanji(item.character))
    .sort((left, right) => getKanjiWeakScore(right.character) - getKanjiWeakScore(left.character));
}

function kanjiAccuracy(character) {
  const statistics = getKanjiStatistics(character);
  return statistics.attempts
    ? Math.round(statistics.correct / statistics.attempts * 100)
    : null;
}

let dictionaryFilter = "all";

function renderDictionary() {
  const searchValue = $("dictSearch").value.trim().toLowerCase();
  const learnedCount = KANJI_CATALOG.filter(isKanjiLearned).length;
  const weakCount = getWeakKanji().length;

  $("dictOwnedCount").textContent = String(learnedCount);
  $("dictWeakCount").textContent = String(weakCount);
  $("dictTotalCount").textContent = String(KANJI_CATALOG.length);
  $("dictSelectedCount").textContent = String(data.kanji.printSelection.length);

  document.querySelectorAll("[data-dict-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.dictFilter === dictionaryFilter);
  });

  const filtered = KANJI_CATALOG.filter(item => {
    const learned = isKanjiLearned(item);
    const weak = isWeakKanji(item.character);
    const searchMatches = !searchValue
      || item.character.includes(searchValue)
      || item.reading.includes(searchValue)
      || item.example.includes(searchValue);

    if (!searchMatches) return false;
    if (dictionaryFilter === "learned") return learned;
    if (dictionaryFilter === "weak") return weak;
    if (dictionaryFilter === "locked") return !learned;
    return true;
  });

  const grid = $("dictList");
  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML = "<div class='notice dict-empty'>条件に合う漢字はありません。</div>";
    return;
  }

  filtered.forEach(item => {
    const learned = isKanjiLearned(item);
    const weak = isWeakKanji(item.character);
    const selected = data.kanji.printSelection.includes(item.character);
    const statistics = getKanjiStatistics(item.character);
    const accuracy = kanjiAccuracy(item.character);

    const card = document.createElement("article");
    card.className = `kanji-card${learned ? " learned" : " locked"}${weak ? " weak" : ""}`;
    card.innerHTML = `
      <div class="kanji-card-top">
        <span class="kanji-character">${item.character}</span>
        <div><b>Day ${item.firstDay}</b><small>${weak ? "📝 ミスノート" : learned ? "学習済み" : "未学習"}</small></div>
      </div>
      <div class="kanji-reading"><small>このアプリでの読み</small><b>${item.reading}</b></div>
      <p>${item.example}</p>
      <div class="kanji-stats">
        <span>正答率<b>${accuracy === null ? "--" : `${accuracy}%`}</b></span>
        <span>正解<b>${statistics.correct}</b></span>
        <span>ミス<b>${statistics.wrong}</b></span>
      </div>
      <small class="learned-date">最初の学習：${displayDate(statistics.firstStudiedAt)}</small>
    `;

    const selectButton = document.createElement("button");
    selectButton.className = `mini-btn card-print-btn${selected ? " selected" : ""}`;
    selectButton.textContent = selected ? "✓ プリントに選択中" : "✏️ プリントに追加";
    selectButton.disabled = !learned;
    selectButton.addEventListener("click", () => togglePrintKanji(item.character));
    card.appendChild(selectButton);
    grid.appendChild(card);
  });
}

function togglePrintKanji(character) {
  const selection = data.kanji.printSelection;
  const index = selection.indexOf(character);

  if (index >= 0) {
    selection.splice(index, 1);
  } else {
    if (selection.length >= 12) {
      toast("一度に選べる漢字は12字までです");
      return;
    }
    selection.push(character);
  }

  save();
  renderDictionary();
}

/* -------------------- 手書き練習プリント -------------------- */

function makeAutomaticPrintSelection() {
  const currentDay = Math.max(1, Math.min(AVAILABLE_DAYS, data.progress.currentDay));
  const todayCharacters = CURRICULUM[currentDay - 1] || [];
  const weakCharacters = getWeakKanji()
    .map(item => item.character)
    .filter(character => !todayCharacters.includes(character))
    .slice(0, 3);

  data.kanji.printSelection = [...todayCharacters, ...weakCharacters];
  save();
}

function renderPractice() {
  const selection = data.kanji.printSelection;
  const selectedBox = $("practiceSelected");
  selectedBox.innerHTML = "";

  if (!selection.length) {
    selectedBox.innerHTML = "<div class='notice'>まだ漢字を選んでいません。「今日＋苦手を自動選択」を押してください。</div>";
  } else {
    selection.forEach(character => {
      const chip = document.createElement("button");
      chip.className = "kanji-chip";
      chip.innerHTML = `<b>${character}</b><span>×</span>`;
      chip.setAttribute("aria-label", `${character}をプリントから外す`);
      chip.addEventListener("click", () => {
        data.kanji.printSelection = data.kanji.printSelection.filter(item => item !== character);
        save();
        renderPractice();
      });
      selectedBox.appendChild(chip);
    });
  }

  const pageCount = Math.max(1, Math.ceil(selection.length / 4));
  $("practicePageHint").textContent = selection.length
    ? `${selection.length}字を選択中です。印刷は${pageCount}ページです（1ページ4字）。`
    : "漢字を選ぶと、ここに印刷見本が表示されます。";
  $("printBtn").disabled = !selection.length;

  const currentDay = Math.max(1, Math.min(AVAILABLE_DAYS, data.progress.currentDay));
  const printSheet = $("printSheet");
  const printDate = displayDate(new Date().toISOString());
  printSheet.innerHTML = "";

  if (!selection.length) {
    printSheet.innerHTML = "<div class='print-empty'>漢字を選ぶと、ここにA4印刷見本が表示されます。</div>";
    return;
  }

  /*
   * 4字ごとに独立したA4ページを作ります。
   * 見出しと名前欄を各ページへ入れるため、2ページ目以降だけを印刷しても
   * 何のプリントか分かり、ブラウザーによる途中改ページも起こりにくくなります。
   */
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageCharacters = selection.slice(pageIndex * 4, pageIndex * 4 + 4);
    const page = document.createElement("section");
    page.className = "print-page";
    page.innerHTML = `
      <div class="print-title">
        <div><h1>漢字れんしゅうプリント</h1><p>Day ${currentDay}　今日の漢字＋ミスノート</p></div>
        <div class="print-meta"><span>日づけ：<b>${printDate}</b></span><span>なまえ：</span></div>
      </div>
      <div class="print-kanji-list"></div>
      <footer><span>おもち先生と学ぶ　漢検9級チャレンジ</span><span>${pageIndex + 1} / ${pageCount}</span></footer>
    `;

    const printList = page.querySelector(".print-kanji-list");
    pageCharacters.forEach(character => {
      const item = KANJI_CATALOG.find(card => card.character === character);
      if (!item) return;

      const accuracy = kanjiAccuracy(character);
      const block = document.createElement("article");
      block.className = "print-kanji-block";
      block.innerHTML = `
        <div class="print-kanji-heading">
          <span>${character}</span>
          <div><b>読み：${item.reading}</b><small>${item.example}</small></div>
          <em>${accuracy === null ? "これから学習" : `正答率 ${accuracy}%`}</em>
        </div>
        <div class="writing-row"><b>なぞる</b><div class="writing-box trace">${character}</div><div class="writing-box trace">${character}</div><div class="writing-box trace">${character}</div><div class="writing-box trace">${character}</div></div>
        <div class="writing-row"><b>見て書く</b><div class="model-kanji">${character}</div><div class="writing-box"></div><div class="writing-box"></div><div class="writing-box"></div><div class="writing-box"></div></div>
        <div class="writing-row"><b>見ないで</b><div class="writing-box"></div><div class="writing-box"></div><div class="writing-box"></div><div class="writing-box"></div></div>
      `;
      printList.appendChild(block);
    });

    printSheet.appendChild(page);
  }
}

/* -------------------- ごほうび・ログインボーナス -------------------- */

function renderRewards() {
  const wallet = $("rewardWallet");
  wallet.innerHTML = "";
  const earned = data.rewards.earned || [];

  if (!earned.length) {
    wallet.innerHTML = "<div class='notice'>獲得したごほうびはまだありません。</div>";
    return;
  }

  earned.slice().reverse().forEach(earnedReward => {
    const reward = data.rewards.catalog.find(item => item.id === earnedReward.rewardId);
    if (!reward) return;

    const row = document.createElement("div");
    row.className = `reward-row${earnedReward.used ? " used" : ""}`;
    row.innerHTML = `<span class="reward-icon">${escapeHTML(reward.icon)}</span><div><b>${escapeHTML(reward.name)}</b><small>${earnedReward.used ? "使用済み" : "未使用"}</small></div><span>${earnedReward.used ? "✓" : "🎁"}</span>`;
    wallet.appendChild(row);
  });
}

function renderRewardManage() {
  const box = $("rewardManage");
  if (!box) return;
  box.innerHTML = "";

  data.rewards.catalog.forEach(reward => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<div class="row"><b>${escapeHTML(reward.icon)} ${escapeHTML(reward.name)}</b><span>⭐${reward.cost}</span></div><div class="row reward-buttons"><button class="mini-btn use">星と交換</button><button class="mini-btn delete">削除</button></div>`;

    item.querySelector(".use").addEventListener("click", () => {
      if (data.progress.totalStars < reward.cost) {
        toast("星が足りません");
        return;
      }

      data.progress.totalStars -= reward.cost;
      data.rewards.earned.push({
        id: `e${Date.now()}`,
        rewardId: reward.id,
        used: false,
        date: new Date().toISOString()
      });
      save();
      renderRewardManage();
      toast("ごほうびを獲得しました");
    });

    item.querySelector(".delete").addEventListener("click", () => {
      if (!window.confirm("このごほうびを削除しますか？")) return;
      data.rewards.catalog = data.rewards.catalog.filter(itemValue => itemValue.id !== reward.id);
      save();
      renderRewardManage();
    });

    box.appendChild(item);
  });

  const unused = (data.rewards.earned || []).filter(item => !item.used);
  if (!unused.length) return;

  const heading = document.createElement("div");
  heading.innerHTML = "<br><b>獲得済みのごほうび</b>";
  box.appendChild(heading);

  unused.forEach(earnedReward => {
    const reward = data.rewards.catalog.find(item => item.id === earnedReward.rewardId);
    if (!reward) return;

    const row = document.createElement("div");
    row.className = "reward-row";
    row.innerHTML = `<span class="reward-icon">${escapeHTML(reward.icon)}</span><b>${escapeHTML(reward.name)}</b><button class="mini-btn use">使用済みにする</button>`;
    row.querySelector("button").addEventListener("click", () => {
      earnedReward.used = true;
      save();
      renderRewardManage();
    });
    box.appendChild(row);
  });
}

function handleDailyLogin() {
  const today = localDateKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);

  if (data.daily.lastLogin === today) return;

  data.daily.loginStreak = data.daily.lastLogin === yesterday
    ? Math.min(7, (data.daily.loginStreak || 0) + 1)
    : 1;
  data.daily.totalDays = (data.daily.totalDays || 0) + 1;
  data.daily.lastLogin = today;

  const loginDay = data.daily.loginStreak;
  const rewardStars = loginDay === 7 ? 10 : loginDay;
  data.progress.totalStars += rewardStars;
  if (loginDay === 7) data.gacha.tickets += 1;
  save();

  const grid = $("dailyGrid");
  grid.innerHTML = "";
  for (let day = 1; day <= 7; day += 1) {
    const cell = document.createElement("div");
    cell.className = `daily-day${day < loginDay ? " got" : day === loginDay ? " today" : ""}`;
    cell.innerHTML = `${day}日<br>${day === 7 ? "🎫" : `⭐${day}`}`;
    grid.appendChild(cell);
  }

  $("dailyText").textContent = loginDay === 7
    ? "7日連続！星10個とガチャ券1枚を獲得！"
    : `${loginDay}日目のボーナス：星${rewardStars}個`;
  $("dailyReward").textContent = loginDay === 7 ? "⭐×10 ＋ 🎫" : `⭐×${rewardStars}`;
  $("dailyMascot").src = FACES.happy;
  $("dailyModal").classList.add("show");
  burst(40);
}

/* -------------------- 保護者ページ -------------------- */

function renderParent() {
  renderRewardManage();
  $("pDay").textContent = String(data.progress.currentDay);
  $("pCorrect").textContent = String(data.statistics.totalCorrect);
  $("pWrong").textContent = String(data.statistics.totalWrong);

  const weakQuestionList = $("weakList");
  weakQuestionList.innerHTML = "";
  const weakQuestionIds = data.review.weakIds || [];

  if (!weakQuestionIds.length) {
    weakQuestionList.innerHTML = "<div class='notice'>苦手な問題はまだありません。</div>";
  }

  weakQuestionIds.slice(0, 8).forEach(questionId => {
    const question = getQuestionById(questionId);
    if (!question) return;

    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<b>${escapeHTML(question.main)}</b><br><small>正解：${escapeHTML(question.choices[question.answer])}</small>`;
    weakQuestionList.appendChild(item);
  });

  const weakKanjiBox = $("parentWeakKanji");
  weakKanjiBox.innerHTML = "";
  const weakKanji = getWeakKanji();

  if (!weakKanji.length) {
    weakKanjiBox.innerHTML = "<div class='notice'>ミスノートの漢字はまだありません。</div>";
    return;
  }

  weakKanji.slice(0, 12).forEach(item => {
    const badge = document.createElement("span");
    const statistics = getKanjiStatistics(item.character);
    badge.className = "weak-kanji-badge";
    badge.innerHTML = `<b>${item.character}</b><small>ミス${statistics.wrong}回</small>`;
    weakKanjiBox.appendChild(badge);
  });
}

/* -------------------- ホーム画面 -------------------- */

function renderAll() {
  const completedCount = data.progress.completedDays.length;
  const coursePercent = Math.round(completedCount / COURSE_DAYS * 100);
  const totalAnswers = data.statistics.totalCorrect + data.statistics.totalWrong;
  const level = getLevel();
  const levelProgress = getLevelProgress();

  $("homeDay").textContent = String(data.progress.currentDay);
  $("homeBar").style.width = `${coursePercent}%`;
  $("homePct").textContent = `${coursePercent}%`;
  $("leftDays").textContent = `あと${Math.max(0, COURSE_DAYS - completedCount)}日`;
  $("stars").textContent = String(data.progress.totalStars);
  $("streak").textContent = `${data.progress.streak}日`;
  $("accuracy").textContent = totalAnswers
    ? `${Math.round(data.statistics.totalCorrect / totalAnswers * 100)}%`
    : "--";
  $("nameInput").value = data.profile.name || "";
  $("greeting").textContent = `${data.profile.name ? `${data.profile.name}さん、` : ""}今日もいっしょにがんばろう！`;
  $("homeTickets").textContent = String(data.gacha.tickets || 0);
  $("homeLevel").textContent = String(level);
  $("homeExpBar").style.width = `${levelProgress}%`;
  $("homeExpText").textContent = `次のレベルまで${100 - levelProgress}EXP`;

  setMood((data.ui && data.ui.mood) || "normal");
  applyEquipment();
}

function burst(count) {
  const container = $("confetti");
  container.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.background = ["#ffd977", "#77b99c", "#efaaa9", "#7bb6d9"][index % 4];
    container.appendChild(piece);
  }

  setTimeout(() => {
    container.innerHTML = "";
  }, 1700);
}

/* -------------------- 保護者暗証番号 -------------------- */

let pinMode = "unlock";
let pinValue = "";
let firstPin = "";

function openPin(mode) {
  pinMode = mode;
  pinValue = "";
  firstPin = "";
  $("pinError").textContent = "";
  $("pinTitle").textContent = mode === "setup"
    ? "暗証番号を設定"
    : mode === "change"
      ? "現在の暗証番号"
      : "保護者用暗証番号";
  $("pinDesc").textContent = mode === "setup"
    ? "4桁を入力し、もう一度確認します。"
    : "4桁を入力してください。";
  $("pinModal").classList.add("show");
  renderPinDots();
}

function renderPinDots() {
  document.querySelectorAll(".dot").forEach((dot, index) => {
    dot.classList.toggle("on", index < pinValue.length);
  });
}

function processPin() {
  const enteredPin = pinValue;
  pinValue = "";
  renderPinDots();

  if (pinMode === "setup") {
    firstPin = enteredPin;
    pinMode = "setup2";
    $("pinTitle").textContent = "もう一度入力";
    $("pinDesc").textContent = "確認のため、同じ4桁を入力してください。";
    return;
  }

  if (pinMode === "setup2") {
    if (enteredPin !== firstPin) {
      pinMode = "setup";
      $("pinError").textContent = "一致しません。最初から入力してください。";
      return;
    }

    data.parent.pinHash = hash(enteredPin);
    data.parent.pinEnabled = true;
    save();
    $("pinModal").classList.remove("show");
    show("parent");
    return;
  }

  if (hash(enteredPin) !== data.parent.pinHash) {
    $("pinError").textContent = "暗証番号が違います";
    return;
  }

  $("pinModal").classList.remove("show");
  if (pinMode === "change") {
    setTimeout(() => openPin("setup"), 100);
  } else {
    show("parent");
  }
}

/* -------------------- ボタン操作 -------------------- */

document.querySelectorAll("#keypad .key").forEach(button => {
  button.addEventListener("click", () => {
    $("pinError").textContent = "";
    if (button.dataset.n !== undefined && pinValue.length < 4) pinValue += button.dataset.n;
    if (button.dataset.a === "back") pinValue = pinValue.slice(0, -1);
    if (button.dataset.a === "clear") pinValue = "";
    renderPinDots();
    if (pinValue.length === 4) setTimeout(processPin, 100);
  });
});

$("pinClose").addEventListener("click", () => $("pinModal").classList.remove("show"));

$("startBtn").addEventListener("click", () => startStudy(data.progress.currentDay));
$("nextBtn").addEventListener("click", () => {
  session.index += 1;
  renderQuestion();
});
$("studyBack").addEventListener("click", () => show("home"));
$("resultBack").addEventListener("click", () => show("home"));
$("resultHome").addEventListener("click", () => show("home"));
$("retryBtn").addEventListener("click", () => startStudy(session.day, session.wrong));

$("mapBtn").addEventListener("click", () => show("map"));
$("mapBack").addEventListener("click", () => show("home"));
$("stickerBtn").addEventListener("click", () => show("stickers"));
$("stickerBack").addEventListener("click", () => show("home"));

$("gachaBtn").addEventListener("click", () => show("gacha"));
$("gachaBack").addEventListener("click", () => show("home"));
$("drawGacha").addEventListener("click", drawGacha);
$("gachaClose").addEventListener("click", () => {
  $("gachaModal").classList.remove("show");
  show("gacha");
});

$("dressBtn").addEventListener("click", () => show("dress"));
$("dressBack").addEventListener("click", () => show("home"));

$("dictBtn").addEventListener("click", () => show("dict"));
$("dictBack").addEventListener("click", () => show("home"));
$("dictSearch").addEventListener("input", renderDictionary);
document.querySelectorAll("[data-dict-filter]").forEach(button => {
  button.addEventListener("click", () => {
    dictionaryFilter = button.dataset.dictFilter;
    renderDictionary();
  });
});

$("practiceBtn").addEventListener("click", () => {
  if (!data.kanji.printSelection.length) makeAutomaticPrintSelection();
  show("practice");
});
$("openPracticeFromDict").addEventListener("click", () => {
  if (!data.kanji.printSelection.length) makeAutomaticPrintSelection();
  show("practice");
});
$("practiceBack").addEventListener("click", () => show("home"));
$("practiceAutoBtn").addEventListener("click", () => {
  makeAutomaticPrintSelection();
  renderPractice();
  toast("今日の漢字と苦手漢字を選びました");
});
$("practiceClearBtn").addEventListener("click", () => {
  data.kanji.printSelection = [];
  save();
  renderPractice();
});
$("printBtn").addEventListener("click", () => window.print());

$("rewardBtn").addEventListener("click", () => show("rewards"));
$("rewardBack").addEventListener("click", () => show("home"));
$("addReward").addEventListener("click", () => {
  const name = $("rewardNameInput").value.trim();
  const icon = $("rewardIconInput").value.trim() || "🎁";
  if (!name) {
    toast("ごほうび名を入力してください");
    return;
  }

  data.rewards.catalog.push({ id: `r${Date.now()}`, icon, name, cost: 20 });
  $("rewardNameInput").value = "";
  save();
  renderRewardManage();
});

$("parentBtn").addEventListener("click", () => {
  if (data.parent.pinEnabled) openPin("unlock");
  else openPin("setup");
});
$("parentBack").addEventListener("click", () => show("home"));
$("changePin").addEventListener("click", () => openPin("change"));

$("settingsBtn").addEventListener("click", () => show("settings"));
$("settingsBtn2").addEventListener("click", () => show("settings"));
$("settingsBack").addEventListener("click", () => show("home"));
$("saveSettings").addEventListener("click", () => {
  data.profile.name = $("nameInput").value.trim();
  save();
  toast("保存しました");
  show("home");
});

$("treasureClose").addEventListener("click", () => {
  $("treasureModal").classList.remove("show");
  show("stickers");
});

$("dailyClose").addEventListener("click", () => {
  $("dailyModal").classList.remove("show");
  toast("ボーナスを受け取りました");
});

$("resetBtn").addEventListener("click", () => {
  if (!window.confirm("すべての学習データを初期化しますか？")) return;
  localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
  data = defaults();
  save();
  show("home");
});

/* おもち先生をタップすると、装備を保ったまま喜ぶ動きをします。 */
$("homeFaceWrap").addEventListener("click", () => {
  $("homeFaceWrap").classList.remove("mascot-tap");
  void $("homeFaceWrap").offsetWidth;
  $("homeFaceWrap").classList.add("mascot-tap");
  setMood("happy");
  toast("おもち先生もうれしそう！");
  setTimeout(() => $("homeFaceWrap").classList.remove("mascot-tap"), 650);
});

/* -------------------- 起動処理 -------------------- */

migrateData();
renderAll();
setTimeout(handleDailyLogin, 450);
