"use strict";

/*
 * おもち先生と学ぶ 漢検9級チャレンジ
 * Ver.2.1.5
 *
 * このファイルでは、学習・復習・ガチャなどの既存機能に加えて、
 * 漢字図鑑、ミスノート、手書きプリントを同じ学習記録から動かします。
 * Ver.2.1.5では、通常シールとの択一抽選になるリアルごほうび交換券と、
 * 保護者が設定できるドロップ率・使用済み履歴を追加しました。
 *
 * 大切な互換性ルール：
 * LocalStorageのキー「KANJI9_SAVE_V2」は変更しません。
 * 以前の保存データに新しい項目がない場合は、defaults()の内容を
 * merge()で補うため、これまでの進捗やガチャデータを残したまま使えます。
 */

const APP_VERSION = "2.1.5";
const BACKUP_FORMAT_VERSION = 1;
const UPDATE_CHECK_INTERVAL = 60 * 1000;

/* 画像にも版番号を付け、GitHub Pages更新直後の古い画像キャッシュを避けます。 */
function assetUrl(path) {
  return `${path}?v=${encodeURIComponent(APP_VERSION)}`;
}

const FACES = {
  normal: assetUrl("assets/images/omochi-01-3b54909ac76c.png"),
  happy: assetUrl("assets/images/omochi-02-262385e34177.png"),
  smile: assetUrl("assets/images/omochi-03-1a5323ab4b4e.png"),
  sad: assetUrl("assets/images/omochi-04-debbe8228792.png"),
  think: assetUrl("assets/images/omochi-01-3b54909ac76c.png")
};

const MASCOT = FACES.normal;

/*
 * 現在は9級コースを読み込みます。8級・7級は同じレジストリへ登録すると、
 * 画面・採点・復習エンジンを変更せずに切り替えられます。
 */
const DEFAULT_COURSE_ID = "k9";
const requestedCourseId = localStorage.getItem("KANKEN_ACTIVE_COURSE") || DEFAULT_COURSE_ID;
const ACTIVE_COURSE = window.KankenCourseRegistry
  ? window.KankenCourseRegistry.get(requestedCourseId)
    || window.KankenCourseRegistry.get(DEFAULT_COURSE_ID)
  : null;

if (!ACTIVE_COURSE) {
  throw new Error("9級のコースデータを読み込めませんでした");
}

const CURRICULUM = ACTIVE_COURSE.curriculum;
const READINGS = ACTIVE_COURSE.readings;
const EXAMPLES = ACTIVE_COURSE.examples;
const QUESTION_DATA = ACTIVE_COURSE.questionData;
const QUESTION_FORMATS = ACTIVE_COURSE.formats;
const AVAILABLE_DAYS = CURRICULUM.length;
const COURSE_DAYS = AVAILABLE_DAYS;
const ACTIVE_COURSE_ID = ACTIVE_COURSE.id;
/* 9級では従来の保存キーをそのまま使います。 */
const STORAGE_KEY = ACTIVE_COURSE.storageKey || "KANJI9_SAVE_V2";
const BACKUP_KEY = ACTIVE_COURSE.backupKey || `${STORAGE_KEY}_BACKUP`;

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

const AREA_BG = {
  forest: assetUrl("assets/images/omochi-05-75614288795c.webp"),
  flower: assetUrl("assets/images/omochi-06-6e1e1ce060c3.webp"),
  town: assetUrl("assets/images/omochi-07-bad5b467551a.webp"),
  sea: assetUrl("assets/images/omochi-08-89a3b9fdf6dc.webp"),
  snow: assetUrl("assets/images/omochi-09-dac41058cf4b.webp"),
  castle: assetUrl("assets/images/omochi-10-21d09e72ffae.webp")
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
    statistics: { totalCorrect: 0, totalWrong: 0, sessions: [], byFormat: {} },
    review: { queue: [], history: {}, weakIds: [] },
    stickers: { owned: [] },
    gacha: { tickets: 0, owned: [], history: [] },
    daily: { lastLogin: "", loginStreak: 0, totalDays: 0 },
    rewards: {
      catalog: [
        { id: "r1", icon: "🍦", name: "アイス", cost: 20, dropRate: 0 },
        { id: "r2", icon: "📺", name: "動画15分", cost: 15, dropRate: 0 },
        { id: "r3", icon: "🥤", name: "コーラ", cost: 25, dropRate: 0 },
        { id: "r4", icon: "🍩", name: "好きなおやつ", cost: 20, dropRate: 0 }
      ],
      earned: []
    },
    player: { totalExp: 0, equippedItemId: "" },
    kanji: { stats: {}, printSelection: [] },
    ui: { mood: "normal" },
    parent: { pinHash: "", pinEnabled: false },
    course: { activeId: ACTIVE_COURSE_ID },
    courses: {},
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
    /* 読み込んだJSONからオブジェクトのプロトタイプを変更させません。 */
    if (["__proto__", "constructor", "prototype"].includes(key)) return;
    if (result[key] === undefined) result[key] = saved[key];
  });

  return result;
}

/* 2.1.10なども正しく比較できる、保存データ移行用の版比較です。 */
function isVersionBefore(version, target) {
  const parse = value => String(value || "0")
    .split(".")
    .map(part => Number.parseInt(part, 10) || 0);
  const left = parse(version);
  const right = parse(target);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] || 0;
    const rightPart = right[index] || 0;
    if (leftPart !== rightPart) return leftPart < rightPart;
  }
  return false;
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
  /*
   * 問題差し替えの整理は2.1.2で完了済みです。単なる版違いを条件にすると、
   * 2.1.2→2.1.3でも正しい学習履歴を消すため、旧版だけを対象にします。
   */
  const needsQuestionAuditMigration = isVersionBefore(data.version, "2.1.2");

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
  data.course = data.course || { activeId: ACTIVE_COURSE_ID };
  data.course.activeId = ACTIVE_COURSE_ID;
  data.courses = data.courses || {};
  data.statistics.byFormat = data.statistics.byFormat || {};
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

/* -------------------- 学習データの書き出し・復元 -------------------- */

function createBackupEnvelope(saveData = data, reason = "export") {
  return {
    app: "kanken9-omochi",
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    storageKey: STORAGE_KEY,
    reason,
    exportedAt: new Date().toISOString(),
    data: saveData
  };
}

function getSaveDataFromPayload(payload) {
  if (payload && payload.app === "kanken9-omochi" && payload.data) return payload.data;
  /* Ver.2.1.2までの初期化バックアップ（保存データ本体のみ）も復元できます。 */
  return payload;
}

function isValidSaveData(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
  const requiredObjects = ["progress", "statistics", "review", "gacha", "parent"];
  if (!requiredObjects.every(key => candidate[key] && typeof candidate[key] === "object")) return false;
  if (!Array.isArray(candidate.progress.completedDays)) return false;
  if (!Array.isArray(candidate.statistics.sessions)) return false;
  if (!Array.isArray(candidate.gacha.owned)) return false;
  return true;
}

function storeCurrentBackup(reason) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(createBackupEnvelope(data, reason)));
    return true;
  } catch (error) {
    toast("直前データを保存できませんでした");
    return false;
  }
}

function backupFileName() {
  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(value => String(value).padStart(2, "0"))
    .join("");
  return `${ACTIVE_COURSE_ID}-backup-${localDateKey(now)}-${time}.json`;
}

async function exportData() {
  const json = JSON.stringify(createBackupEnvelope(), null, 2);
  const fileName = backupFileName();
  const blob = new Blob([json], { type: "application/json" });
  const file = typeof File === "function"
    ? new File([blob], fileName, { type: "application/json" })
    : null;

  /* iPhoneでは共有シートから「ファイルに保存」を選べるようにします。 */
  if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${ACTIVE_COURSE.name}チャレンジ 学習データ` });
      toast("学習データを書き出しました");
      return;
    } catch (error) {
      if (error && error.name === "AbortError") return;
      /* 共有できなかった場合は通常のダウンロードへ進みます。 */
    }
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast("学習データを書き出しました");
}

function applyImportedData(candidate, reason = "import") {
  if (!isValidSaveData(candidate)) throw new Error("invalid-save-data");
  if (!storeCurrentBackup(reason)) throw new Error("backup-failed");
  data = merge(defaults(), candidate);
  migrateData();
  save();
}

async function importDataFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast("ファイルが大きすぎます（5MBまで）");
    return;
  }

  try {
    const payload = JSON.parse(await file.text());
    const candidate = getSaveDataFromPayload(payload);
    if (!isValidSaveData(candidate)) throw new Error("invalid-save-data");
    if (!window.confirm("現在のデータを退避して、このファイルの学習データを復元しますか？")) return;
    applyImportedData(candidate, "before-import");
    renderBackupStatus();
    show("home");
    toast("学習データを復元しました");
  } catch (error) {
    toast("このファイルは復元できません");
  } finally {
    $("importDataInput").value = "";
  }
}

function readStoredBackup() {
  try {
    const payload = JSON.parse(localStorage.getItem(BACKUP_KEY) || "null");
    const candidate = getSaveDataFromPayload(payload);
    if (!isValidSaveData(candidate)) return null;
    return { payload, data: candidate };
  } catch (error) {
    return null;
  }
}

function renderBackupStatus() {
  const backup = readStoredBackup();
  $("restoreBackupBtn").disabled = !backup;
  if (!backup) {
    $("backupStatus").textContent = "直前バックアップはまだありません。";
    return;
  }
  const date = backup.payload && (backup.payload.exportedAt || backup.payload.backedUpAt);
  $("backupStatus").textContent = `直前バックアップ：${date ? displayDate(date) : "日時不明"}`;
}

function restoreStoredBackup() {
  const backup = readStoredBackup();
  if (!backup) {
    toast("復元できるバックアップがありません");
    return;
  }
  if (!window.confirm("現在のデータと直前バックアップを入れ替えますか？")) return;

  const current = createBackupEnvelope(data, "before-restore");
  data = merge(defaults(), backup.data);
  migrateData();
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(current));
  } catch (error) {
    /* 学習データ本体の復元を優先します。 */
  }
  save();
  renderBackupStatus();
  show("home");
  toast("直前の学習データへ戻しました");
}

let activeScreenId = "home";
let handlingHistory = false;

/* 画面描画と履歴操作を分け、iPhoneのスワイプバックにも対応します。 */
function renderScreen(screenId) {
  const target = $(screenId) ? screenId : "home";
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.toggle("active", screen.id === target);
  });
  activeScreenId = target;

  window.scrollTo({ top: 0, behavior: "auto" });

  if (target === "map") renderMap();
  if (target === "stickers") renderStickers();
  if (target === "gacha") renderGacha();
  if (target === "rewards") renderRewards();
  if (target === "parent") renderParent();
  if (target === "dress") renderDress();
  if (target === "dict") renderDictionary();
  if (target === "practice") renderPractice();
}

function show(screenId) {
  const target = $(screenId) ? screenId : "home";

  if (!handlingHistory) {
    const currentHistoryScreen = history.state && history.state.screenId
      ? history.state.screenId
      : "home";
    if (target === "home") {
      if (currentHistoryScreen !== "home") {
        history.back();
        return;
      }
    } else if (activeScreenId === "home" && currentHistoryScreen === "home") {
      history.pushState({ screenId: target }, "", location.href);
    } else {
      history.replaceState({ screenId: target }, "", location.href);
    }
  }

  renderScreen(target);
}

function hasUnfinishedStudy() {
  return activeScreenId === "study" && session && !session.finished && !session.abandoned;
}

function confirmStudyExit() {
  return window.confirm("学習の途中です。ここまでの回答は保存されません。ホームへ戻りますか？");
}

function leaveStudy() {
  if (hasUnfinishedStudy() && !confirmStudyExit()) return;
  if (session) session.abandoned = true;
  session = null;
  show("home");
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

function questionTypeLabel(format) {
  return QUESTION_FORMATS[format] ? QUESTION_FORMATS[format].label : format;
}

function makeQuestion({ id, day, format, kanji, prompt, main, choices, answer, explain }) {
  const answerIndex = typeof answer === "number" ? answer : choices.indexOf(answer);
  if (answerIndex < 0) throw new Error(`${id}: 正解が選択肢にありません`);
  return {
    id,
    courseId: ACTIVE_COURSE_ID,
    day,
    format,
    type: questionTypeLabel(format),
    kanji,
    prompt,
    main,
    choices: choices.slice(),
    answer: answerIndex,
    explain
  };
}

/*
 * 1日分の全問題バンクを作ります。既存の読み・書きIDは変更せず、
 * 新しい3形式だけ u（使い分け）・p（対）・b（仲間）のIDを追加します。
 */
function generateQuestionBank(day) {
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

    questions.push(makeQuestion({
      id: `d${day}r${index}`,
      day,
      format: "reading",
      kanji: character,
      prompt: `文の中の【${character}】の読みを選ぼう`,
      main: example,
      choices: [reading, ...otherReadings],
      answer: 0,
      explain: `この文の【${character}】は「${reading}」と読みます。`
    }));
  }

  for (let index = 0; index < 5; index += 1) {
    const character = characters[index];
    const reading = READINGS[character] || character;
    const example = EXAMPLES[character] || `${character}をつかった文。`;
    const otherCharacters = characters.filter(item => item !== character).slice(0, 2);

    questions.push(makeQuestion({
      id: `d${day}w${index}`,
      day,
      format: "writing",
      kanji: character,
      prompt: `「${reading}」と読む、□に入る漢字を選ぼう`,
      main: example.replace(character, "□"),
      choices: [character, ...otherCharacters],
      answer: 0,
      explain: `□には「${character}」が入ります。`
    }));
  }

  const usageItems = QUESTION_DATA.usageByDay[day - 1] || [];
  usageItems.forEach((item, index) => {
    questions.push(makeQuestion({
      id: `d${day}u${index}`,
      day,
      format: "usage",
      kanji: item.answer,
      prompt: "文に合う漢字を選ぼう",
      main: item.main,
      choices: item.choices,
      answer: item.answer,
      explain: `この文では「${item.answer}」を使います。`
    }));
  });

  for (let index = 0; index < 2; index += 1) {
    const item = QUESTION_DATA.pairByDay[day - 1][index];
    questions.push(makeQuestion({
      id: `d${day}p${index}`,
      day,
      format: "pair",
      kanji: item.answer,
      prompt: "対になる・関係の深い漢字を選ぼう",
      main: item.main,
      choices: item.choices,
      answer: item.answer,
      explain: `答えは「${item.answer}」です。漢字の組み合わせで覚えよう。`
    }));
  }

  for (let index = 0; index < 2; index += 1) {
    const item = QUESTION_DATA.familyByDay[day - 1][index];
    questions.push(makeQuestion({
      id: `d${day}b${index}`,
      day,
      format: "family",
      kanji: item.answer,
      prompt: "同じ部分・部首の仲間を選ぼう",
      main: item.main,
      choices: item.choices,
      answer: item.answer,
      explain: item.explain
    }));
  }

  return questions;
}

/*
 * 通常学習は5形式を2問ずつ、合計10問にします。読み・書きの5問は
 * 学習回数に応じて選ぶ位置をずらし、繰り返すと全漢字へ戻ってきます。
 */
function generateQuestions(day) {
  const bank = generateQuestionBank(day);
  const formatOrder = ["reading", "writing", "usage", "pair", "family"];
  const previousSessions = data && data.statistics && Array.isArray(data.statistics.sessions)
    ? data.statistics.sessions.filter(item => item.day === day && (item.courseId || "k9") === ACTIVE_COURSE_ID).length
    : 0;

  const selected = formatOrder.flatMap(format => {
    const candidates = bank.filter(question => question.format === format);
    if (candidates.length <= 2) return candidates;
    const startIndex = (previousSessions * 2) % candidates.length;
    return [candidates[startIndex], candidates[(startIndex + 1) % candidates.length]];
  });

  return selected;
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
    const question = generateQuestionBank(day).find(item => item.id === questionId);
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

  /* 形式の順番と正解位置の両方を毎回組み替えます。 */
  questions = prepareQuestionsForSession(shuffledCopy(questions));

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
    answered: false,
    transitioning: false,
    finished: false,
    abandoned: false
  };

  $("studyDay").textContent = `Day ${safeDay}`;
  $("sessionStars").textContent = "0";
  show("study");
  renderQuestion();
}

function renderQuestion() {
  if (!session || session.finished || session.abandoned) return;
  if (session.index >= session.questions.length) {
    finishStudy();
    return;
  }

  setMood("think");
  const question = session.questions[session.index];
  session.answered = false;
  session.transitioning = false;

  $("studyBar").style.width = `${Math.round(session.index / session.questions.length * 100)}%`;
  $("qCounter").textContent = `${session.index + 1} / ${session.questions.length}`;
  $("qtype").textContent = question.type;
  $("qprompt").textContent = question.prompt;
  $("qmain").textContent = question.main;
  $("qmain").classList.toggle("sentence", question.main.length > 4);
  $("feedback").className = "feedback";
  $("nextBtn").classList.add("hidden");
  $("nextBtn").disabled = true;
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
  /* タップ直後にロックし、同じイベントループ内の連打も1回答にします。 */
  if (!session || session.answered || session.transitioning || session.finished || session.abandoned) return;
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
  $("nextBtn").disabled = false;
}

function goToNextQuestion() {
  if (!session || !session.answered || session.transitioning || session.finished || session.abandoned) return;
  session.transitioning = true;
  $("nextBtn").disabled = true;
  session.index += 1;
  renderQuestion();
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

function updateFormatStatistics() {
  data.statistics.byFormat = data.statistics.byFormat || {};
  session.results.forEach(result => {
    const format = result.question.format || "legacy";
    const statistics = data.statistics.byFormat[format] || { correct: 0, wrong: 0 };
    if (result.isCorrect) statistics.correct += 1;
    else statistics.wrong += 1;
    data.statistics.byFormat[format] = statistics;
  });
}

function finishStudy() {
  /* 結果保存・EXP・ガチャ券付与を、どの経路から呼ばれても1度だけにします。 */
  if (!session || session.finished || session.abandoned) return;
  session.finished = true;
  updateReview();
  updateKanjiStatistics();
  updateFormatStatistics();

  data.statistics.totalCorrect += session.correct;
  data.statistics.totalWrong += session.wrong.length;
  data.statistics.sessions.push({
    courseId: ACTIVE_COURSE_ID,
    day: session.day,
    date: new Date().toISOString(),
    correct: session.correct,
    total: session.questions.length,
    formats: session.results.reduce((summary, result) => {
      const format = result.question.format || "legacy";
      summary[format] = (summary[format] || 0) + 1;
      return summary;
    }, {})
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

function rewardDropTotal() {
  return (data.rewards.catalog || []).reduce((sum, reward) => {
    const rate = Number(reward.dropRate);
    return sum + (Number.isFinite(rate) && rate > 0 ? rate : 0);
  }, 0);
}

/* 0〜100の同じ抽選枠から交換券を判定し、残りを通常シールにします。 */
function drawRealReward() {
  let value = Math.random() * 100;
  for (const reward of data.rewards.catalog || []) {
    const rate = Math.max(0, Number(reward.dropRate) || 0);
    value -= rate;
    if (value < 0) return reward;
  }
  return null;
}

function createEarnedReward(reward, source = "gacha") {
  const earned = {
    id: `e${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    rewardId: reward.id,
    rewardName: reward.name,
    rewardIcon: reward.icon,
    source,
    used: false,
    date: new Date().toISOString(),
    usedAt: ""
  };
  data.rewards.earned.push(earned);
  return earned;
}

let gachaDrawing = false;

function renderGacha() {
  $("gachaTickets").textContent = String(data.gacha.tickets || 0);
  $("drawGacha").disabled = gachaDrawing || (data.gacha.tickets || 0) < 1;
  $("drawGacha").textContent = gachaDrawing
    ? "抽選中…"
    : (data.gacha.tickets || 0) < 1
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
  if (gachaDrawing) return;
  if ((data.gacha.tickets || 0) < 1) {
    toast("ガチャ券がありません");
    return;
  }

  /* 抽選前にロックし、連打で複数枚消費されることを防ぎます。 */
  gachaDrawing = true;
  data.gacha.tickets -= 1;
  const reward = drawRealReward();
  const item = reward ? null : weightedItem();
  const isNew = item ? !data.gacha.owned.includes(item.id) : false;
  const drawnAt = new Date().toISOString();
  const earnedReward = reward ? createEarnedReward(reward, "gacha") : null;

  if (item && isNew) data.gacha.owned.push(item.id);
  data.gacha.history.push(reward
    ? { type: "reward", rewardId: reward.id, earnedId: earnedReward.id, date: drawnAt }
    : { type: "sticker", id: item.id, date: drawnAt, isNew });
  save();

  $("gachaMachine").classList.add("spin");
  $("drawGacha").disabled = true;
  $("gachaTitle").textContent = "ガラガラ…";

  setTimeout(() => {
    $("gachaMachine").classList.remove("spin");
    $("gachaTitle").textContent = "おもちガチャ";
    $("gachaRarity").className = reward ? "rarity reward-ticket" : `rarity ${item.rarity}`;
    $("gachaRarity").textContent = reward ? "交換券" : item.rarity;
    $("gachaIcon").textContent = reward ? reward.icon : item.icon;
    $("gachaName").textContent = reward ? reward.name : item.name;
    $("gachaResultText").textContent = reward
      ? "リアルごほうび交換券が当たりました！ごほうび画面に保存しました。"
      : isNew
      ? "新しいアイテムです！着せ替え画面で装備できます。"
      : "持っているアイテムなので、⭐3個に交換しました。";

    if (item && !isNew) data.progress.totalStars += 3;
    $("gachaMascot").src = FACES.happy;
    save();
    $("gachaModal").classList.add("show");
    burst(reward ? 70 : item.rarity === "SSR" ? 70 : item.rarity === "SR" ? 50 : 30);
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
  $("printBtn").disabled = printInProgress || !selection.length;

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
      <footer><span>おもち先生と学ぶ　${escapeHTML(ACTIVE_COURSE.name)}チャレンジ</span><span>${pageIndex + 1} / ${pageCount}</span></footer>
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

let printInProgress = false;

async function printPractice() {
  if (printInProgress || !data.kanji.printSelection.length) return;
  printInProgress = true;
  renderPractice();

  try {
    /* 日本語フォントとレイアウトが確定してから印刷画面を開きます。 */
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.print();
  } finally {
    /* iOSではafterprintが発火しない場合があるため、タイマーでも解除します。 */
    setTimeout(() => {
      printInProgress = false;
      renderPractice();
    }, 1200);
  }
}

window.addEventListener("beforeprint", renderPractice);
window.addEventListener("afterprint", () => {
  printInProgress = false;
  renderPractice();
});

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
    const catalogReward = data.rewards.catalog.find(item => item.id === earnedReward.rewardId);
    const reward = catalogReward || {
      icon: earnedReward.rewardIcon || "🎁",
      name: earnedReward.rewardName || "削除済みのごほうび"
    };
    const sourceLabel = earnedReward.source === "gacha" ? "ガチャ交換券" : "星と交換";

    const row = document.createElement("div");
    row.className = `reward-row${earnedReward.used ? " used" : ""}`;
    row.innerHTML = `<span class="reward-icon">${escapeHTML(reward.icon)}</span><div><b>${escapeHTML(reward.name)}</b><small>${sourceLabel}／${earnedReward.used ? "使用済み" : "未使用"}</small></div><span>${earnedReward.used ? "✓" : "🎟️"}</span>`;
    wallet.appendChild(row);
  });
}

function renderRewardManage() {
  const box = $("rewardManage");
  if (!box) return;
  box.innerHTML = "";

  data.rewards.catalog.forEach(reward => {
    const rate = Math.max(0, Number(reward.dropRate) || 0);
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `<div class="row"><b>${escapeHTML(reward.icon)} ${escapeHTML(reward.name)}</b><span>⭐${reward.cost}</span></div><label class="drop-rate-row">ガチャ確率 <input class="drop-rate" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${rate}">%</label><div class="row reward-buttons"><button class="mini-btn rate-save">確率を保存</button><button class="mini-btn use">星と交換</button><button class="mini-btn delete">削除</button></div>`;

    item.querySelector(".rate-save").addEventListener("click", () => {
      const input = item.querySelector(".drop-rate");
      const nextRate = Number(input.value);
      if (!Number.isFinite(nextRate) || nextRate < 0 || nextRate > 100) {
        toast("確率は0〜100％で入力してください");
        return;
      }
      const otherTotal = rewardDropTotal() - rate;
      if (otherTotal + nextRate > 100.00001) {
        toast(`確率の合計は100％以下にしてください（残り${Math.max(0, 100 - otherTotal).toFixed(1)}％）`);
        input.value = String(rate);
        return;
      }
      reward.dropRate = Math.round(nextRate * 10) / 10;
      save();
      renderRewardManage();
      toast("ドロップ率を保存しました");
    });

    item.querySelector(".use").addEventListener("click", () => {
      if (data.progress.totalStars < reward.cost) {
        toast("星が足りません");
        return;
      }

      data.progress.totalStars -= reward.cost;
      createEarnedReward(reward, "stars");
      save();
      renderRewardManage();
      toast("ごほうびを獲得しました");
    });

    item.querySelector(".delete").addEventListener("click", () => {
      if (!window.confirm("このごほうびを削除しますか？")) return;
      data.rewards.earned.forEach(earnedReward => {
        if (earnedReward.rewardId !== reward.id) return;
        earnedReward.rewardName = earnedReward.rewardName || reward.name;
        earnedReward.rewardIcon = earnedReward.rewardIcon || reward.icon;
      });
      data.rewards.catalog = data.rewards.catalog.filter(itemValue => itemValue.id !== reward.id);
      save();
      renderRewardManage();
    });

    box.appendChild(item);
  });

  const total = rewardDropTotal();
  const summary = document.createElement("div");
  summary.className = "drop-summary";
  summary.innerHTML = `<b>交換券 合計 ${total.toFixed(1)}％</b><span>通常シール ${(100 - total).toFixed(1)}％</span>`;
  box.prepend(summary);

  const unused = (data.rewards.earned || []).filter(item => !item.used);
  if (!unused.length) return;

  const heading = document.createElement("div");
  heading.innerHTML = "<br><b>獲得済みのごほうび</b>";
  box.appendChild(heading);

  unused.forEach(earnedReward => {
    const reward = data.rewards.catalog.find(item => item.id === earnedReward.rewardId) || {
      icon: earnedReward.rewardIcon || "🎁",
      name: earnedReward.rewardName || "削除済みのごほうび"
    };

    const row = document.createElement("div");
    row.className = "reward-row";
    row.innerHTML = `<span class="reward-icon">${escapeHTML(reward.icon)}</span><b>${escapeHTML(reward.name)}</b><button class="mini-btn use">使用済みにする</button>`;
    row.querySelector("button").addEventListener("click", () => {
      earnedReward.used = true;
      earnedReward.usedAt = new Date().toISOString();
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

function renderFormatStatistics() {
  const container = $("formatStats");
  if (!container) return;
  container.innerHTML = "";

  Object.entries(QUESTION_FORMATS).forEach(([format, definition]) => {
    const statistics = data.statistics.byFormat[format] || { correct: 0, wrong: 0 };
    const total = Number(statistics.correct || 0) + Number(statistics.wrong || 0);
    const accuracy = total ? Math.round(Number(statistics.correct || 0) / total * 100) : null;
    const card = document.createElement("div");
    card.className = "format-stat";
    card.innerHTML = `<b>${escapeHTML(definition.shortLabel || definition.label)}</b><strong>${accuracy === null ? "--" : `${accuracy}%`}</strong><small>${total}問</small>`;
    container.appendChild(card);
  });
}

function renderParent() {
  renderRewardManage();
  renderFormatStatistics();
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
  } else {
    weakKanji.slice(0, 12).forEach(item => {
      const badge = document.createElement("span");
      const statistics = getKanjiStatistics(item.character);
      badge.className = "weak-kanji-badge";
      badge.innerHTML = `<b>${item.character}</b><small>ミス${statistics.wrong}回</small>`;
      weakKanjiBox.appendChild(badge);
    });
  }

  renderBackupStatus();
}

/* -------------------- ホーム画面 -------------------- */

function renderCourseSelector() {
  const select = $("courseSelect");
  if (!select || !window.KankenCourseRegistry) return;
  select.innerHTML = "";
  window.KankenCourseRegistry.list().forEach(course => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = `${course.name}（${course.completionLevel || "学習コース"}）`;
    option.selected = course.id === ACTIVE_COURSE_ID;
    select.appendChild(option);
  });
  $("courseHelp").textContent = select.options.length > 1
    ? "コースを変更すると、その級の保存データへ切り替わります。"
    : "現在は9級のみです。8級・7級のデータ追加後にここから選べます。";
}

function renderAll() {
  const completedCount = data.progress.completedDays.length;
  const coursePercent = Math.round(completedCount / COURSE_DAYS * 100);
  const totalAnswers = data.statistics.totalCorrect + data.statistics.totalWrong;
  const level = getLevel();
  const levelProgress = getLevelProgress();

  document.title = `おもち先生と学ぶ ${ACTIVE_COURSE.name}チャレンジ Ver.${APP_VERSION}`;
  $("brandCourseName").textContent = ACTIVE_COURSE.name;
  $("settingsCourseInfo").textContent = `アプリ Ver.${APP_VERSION}／コースデータ ${ACTIVE_COURSE_ID}`;
  renderCourseSelector();

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
let pinProcessing = false;
let pinTimer = null;

function openPin(mode) {
  clearTimeout(pinTimer);
  pinProcessing = false;
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
  if (!pinProcessing || pinValue.length !== 4) return;
  const enteredPin = pinValue;
  pinValue = "";
  renderPinDots();

  if (pinMode === "setup") {
    firstPin = enteredPin;
    pinMode = "setup2";
    $("pinTitle").textContent = "もう一度入力";
    $("pinDesc").textContent = "確認のため、同じ4桁を入力してください。";
    pinProcessing = false;
    return;
  }

  if (pinMode === "setup2") {
    if (enteredPin !== firstPin) {
      pinMode = "setup";
      $("pinError").textContent = "一致しません。最初から入力してください。";
      pinProcessing = false;
      return;
    }

    data.parent.pinHash = hash(enteredPin);
    data.parent.pinEnabled = true;
    save();
    $("pinModal").classList.remove("show");
    show("parent");
    pinProcessing = false;
    return;
  }

  if (hash(enteredPin) !== data.parent.pinHash) {
    $("pinError").textContent = "暗証番号が違います";
    pinProcessing = false;
    return;
  }

  $("pinModal").classList.remove("show");
  if (pinMode === "change") {
    setTimeout(() => openPin("setup"), 100);
  } else {
    show("parent");
  }
  pinProcessing = false;
}

/* -------------------- ボタン操作 -------------------- */

document.querySelectorAll("#keypad .key").forEach(button => {
  button.addEventListener("click", () => {
    if (pinProcessing) return;
    $("pinError").textContent = "";
    if (button.dataset.n !== undefined && pinValue.length < 4) pinValue += button.dataset.n;
    if (button.dataset.a === "back") pinValue = pinValue.slice(0, -1);
    if (button.dataset.a === "clear") pinValue = "";
    renderPinDots();
    if (pinValue.length === 4) {
      pinProcessing = true;
      clearTimeout(pinTimer);
      pinTimer = setTimeout(processPin, 100);
    }
  });
});

$("pinClose").addEventListener("click", () => {
  clearTimeout(pinTimer);
  pinProcessing = false;
  $("pinModal").classList.remove("show");
});

$("startBtn").addEventListener("click", () => startStudy(data.progress.currentDay));
$("nextBtn").addEventListener("click", goToNextQuestion);
$("studyBack").addEventListener("click", leaveStudy);
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
  gachaDrawing = false;
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
$("printBtn").addEventListener("click", printPractice);

$("rewardBtn").addEventListener("click", () => show("rewards"));
$("rewardBack").addEventListener("click", () => show("home"));
$("addReward").addEventListener("click", () => {
  const name = $("rewardNameInput").value.trim();
  const icon = $("rewardIconInput").value.trim() || "🎁";
  if (!name) {
    toast("ごほうび名を入力してください");
    return;
  }

  const rate = Number($("rewardRateInput").value || 0);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    toast("確率は0〜100％で入力してください");
    return;
  }
  if (rewardDropTotal() + rate > 100.00001) {
    toast("ごほうび確率の合計は100％以下にしてください");
    return;
  }

  data.rewards.catalog.push({ id: `r${Date.now()}`, icon, name, cost: 20, dropRate: Math.round(rate * 10) / 10 });
  $("rewardNameInput").value = "";
  $("rewardRateInput").value = "0";
  save();
  renderRewardManage();
});

$("parentBtn").addEventListener("click", () => {
  if (data.parent.pinEnabled) openPin("unlock");
  else openPin("setup");
});
$("parentBack").addEventListener("click", () => show("home"));
$("changePin").addEventListener("click", () => openPin("change"));
$("exportDataBtn").addEventListener("click", exportData);
$("importDataBtn").addEventListener("click", () => $("importDataInput").click());
$("importDataInput").addEventListener("change", event => importDataFile(event.target.files[0]));
$("restoreBackupBtn").addEventListener("click", restoreStoredBackup);

$("settingsBtn").addEventListener("click", () => show("settings"));
$("settingsBtn2").addEventListener("click", () => show("settings"));
$("settingsBack").addEventListener("click", () => show("home"));
$("saveSettings").addEventListener("click", () => {
  const selectedCourseId = $("courseSelect").value || ACTIVE_COURSE_ID;
  data.profile.name = $("nameInput").value.trim();
  save();
  if (selectedCourseId !== ACTIVE_COURSE_ID) {
    localStorage.setItem("KANKEN_ACTIVE_COURSE", selectedCourseId);
    location.reload();
    return;
  }
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
  if (!storeCurrentBackup("before-reset")) return;
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

/* -------------------- ブラウザーの戻る操作・更新確認 -------------------- */

window.addEventListener("popstate", event => {
  let target = event.state && event.state.screenId ? event.state.screenId : "home";

  if (hasUnfinishedStudy() && target !== "study") {
    if (!confirmStudyExit()) {
      history.pushState({ screenId: "study" }, "", location.href);
      return;
    }
    session.abandoned = true;
    session = null;
  }

  if (target === "study" && (!session || session.finished || session.abandoned)) {
    target = "home";
    history.replaceState({ screenId: "home" }, "", location.href);
  }

  document.querySelectorAll(".modal.show").forEach(modal => modal.classList.remove("show"));
  handlingHistory = true;
  renderScreen(target);
  handlingHistory = false;
});

window.addEventListener("beforeunload", event => {
  if (!hasUnfinishedStudy()) return;
  event.preventDefault();
  event.returnValue = "";
});

let lastUpdateCheck = 0;
let availableVersion = "";

async function checkForAppUpdate(force = false) {
  const now = Date.now();
  if (!force && now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) return;
  lastUpdateCheck = now;

  try {
    const response = await fetch(`version.json?t=${now}`, { cache: "no-store" });
    if (!response.ok) return;
    const latest = await response.json();
    if (latest.version && isVersionBefore(APP_VERSION, latest.version)) {
      availableVersion = latest.version;
      $("updateBanner").classList.add("show");
    }
  } catch (error) {
    /* オフライン時は現在の版をそのまま使えます。 */
  }
}

$("reloadAppBtn").addEventListener("click", () => {
  const url = new URL(location.href);
  url.searchParams.set("appVersion", availableVersion || Date.now());
  location.replace(url.toString());
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkForAppUpdate();
});

/* -------------------- 起動処理 -------------------- */

history.replaceState({ screenId: "home" }, "", location.href);
migrateData();
renderAll();
setTimeout(handleDailyLogin, 450);
setTimeout(() => checkForAppUpdate(true), 1000);
