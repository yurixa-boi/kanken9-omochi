"use strict";

/*
 * Ver.2.1.4のブラウザー回帰テストです。
 * 級別データ分離、5形式、旧データ移行、連打防止、戻る操作、復元、
 * iPhone幅、A4印刷、全問題バンクをまとめて確認します。
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.argv[2] || "http://127.0.0.1:4173";
const outputDirectory = path.resolve(process.argv[3] || "output/qa");
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || chromium.executablePath();

const grade1 = "一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六";
const grade2 = "引羽雲園遠何科夏家歌画回会海絵外角楽活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原戸古午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数西声星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話";
const kanken9Characters = new Set([...grade1, ...grade2]);

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const appSource = fs.readFileSync(path.resolve("app.js"), "utf8");
  const courseSource = fs.readFileSync(path.resolve("data/k9-course.js"), "utf8");
  assert.equal(appSource.includes('"山": "やま"'), false, "問題データがapp.jsに残っています");
  assert.equal(courseSource.includes('"山": "やま"'), true, "9級データが分離されていません");
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  /* Ver.2.1.2の監査済み履歴を含む保存データです。 */
  await page.addInitScript(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    localStorage.setItem("KANJI9_SAVE_V2", JSON.stringify({
      version: "2.1.2",
      profile: { name: "テスト" },
      progress: { currentDay: 3, completedDays: [1, 2], totalStars: 42, streak: 2, lastStudyDate: today },
      statistics: { totalCorrect: 18, totalWrong: 2, sessions: [] },
      review: {
        history: {
          d1r0: { correctCount: 1, wrongCount: 0 },
          d7r1: { correctCount: 0, wrongCount: 1 }
        },
        queue: [{ id: "d1r0", dueDay: 3 }, { id: "d7r1", dueDay: 3 }],
        weakIds: ["d7r1"]
      },
      stickers: { owned: ["area5"] },
      gacha: { tickets: 5, owned: ["g1"], history: [] },
      daily: { lastLogin: today, loginStreak: 2, totalDays: 2 },
      player: { totalExp: 125, equippedItemId: "g1" },
      kanji: { stats: {}, printSelection: [] },
      ui: { mood: "normal" },
      parent: { pinHash: "saved-pin-hash", pinEnabled: true }
    }));
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  /* CI環境に日本語フォントがない場合だけ、目視確認用フォントを埋め込みます。 */
  if (process.env.QA_FONT_PATH && fs.existsSync(process.env.QA_FONT_PATH)) {
    const fontData = fs.readFileSync(process.env.QA_FONT_PATH).toString("base64");
    await page.addStyleTag({ content: `
      @font-face {
        font-family: "Kanken9 QA Japanese";
        src: url("data:font/woff2;base64,${fontData}") format("woff2");
        font-style: normal;
        font-weight: 100 900;
      }
      body, button, input { font-family: "Kanken9 QA Japanese", sans-serif !important; }
    ` });
    await page.evaluate(() => document.fonts.ready);
  }

  const compatibility = await page.evaluate(() => window.eval(`({
    version: data.version,
    key: STORAGE_KEY,
    day: data.progress.currentDay,
    stars: data.progress.totalStars,
    tickets: data.gacha.tickets,
    pinHash: data.parent.pinHash,
    equipped: data.player.equippedItemId,
    auditHistoryKept: Boolean(data.review.history.d7r1),
    queueKept: data.review.queue.some(item => item.id === "d7r1")
  })`));
  assert.deepEqual(compatibility, {
    version: "2.1.4",
    key: "KANJI9_SAVE_V2",
    day: 3,
    stars: 42,
    tickets: 5,
    pinHash: "saved-pin-hash",
    equipped: "g1",
    auditHistoryKept: true,
    queueKept: true
  });

  /* 全20日の問題バンク320問と、通常学習10問・5形式を監査します。 */
  const audit = await page.evaluate(() => window.eval(`(() => {
    const bankQuestions = [];
    const sessionQuestions = [];
    const sessionPositions = [];
    for (let day = 1; day <= AVAILABLE_DAYS; day += 1) {
      const dailyQuestions = generateQuestions(day);
      bankQuestions.push(...generateQuestionBank(day));
      sessionQuestions.push(...dailyQuestions);
      sessionPositions.push(prepareQuestionsForSession(dailyQuestions).map(item => item.answer));
    }
    return {
      dayCount: AVAILABLE_DAYS,
      courseId: ACTIVE_COURSE_ID,
      registeredCourses: window.KankenCourseRegistry.list().map(course => course.id),
      catalog: KANJI_CATALOG.map(item => item.character),
      bankQuestions: bankQuestions.map(item => ({
        id: item.id, type: item.type, format: item.format, kanji: item.kanji, main: item.main,
        choices: item.choices, answer: item.answer
      })),
      sessionQuestions: sessionQuestions.map(item => ({ id: item.id, format: item.format })),
      sessionPositions
    };
  })()`));
  assert.equal(audit.dayCount, 20);
  assert.equal(audit.courseId, "k9");
  assert.deepEqual(audit.registeredCourses, ["k9"]);
  assert.equal(audit.bankQuestions.length, 320);
  assert.equal(new Set(audit.bankQuestions.map(question => question.id)).size, 320);
  assert.equal(audit.sessionQuestions.length, 200);
  assert.equal(audit.catalog.length, 91);
  audit.catalog.forEach(character => assert.equal(kanken9Characters.has(character), true, `範囲外: ${character}`));
  audit.bankQuestions.forEach(question => {
    assert.equal(question.choices.length, 3, `${question.id}: 選択肢数`);
    assert.equal(new Set(question.choices).size, 3, `${question.id}: 選択肢重複`);
    assert.equal(question.answer >= 0 && question.answer < 3, true, `${question.id}: 正解番号`);
    assert.equal(question.main.length > 1, true, `${question.id}: 文脈なし`);
    assert.equal(kanken9Characters.has(question.kanji), true, `${question.id}: 対象漢字が9級範囲外`);
    if (question.format === "reading") assert.equal(question.main.includes(question.kanji), true);
    if (["writing", "usage", "pair"].includes(question.format)) assert.equal(question.main.includes("□"), true);
  });
  const expectedFormats = ["family", "pair", "reading", "usage", "writing"];
  assert.deepEqual([...new Set(audit.bankQuestions.map(question => question.format))].sort(), expectedFormats);
  for (let day = 1; day <= audit.dayCount; day += 1) {
    const daily = audit.sessionQuestions.slice((day - 1) * 10, day * 10);
    const formatCounts = Object.fromEntries(expectedFormats.map(format => [format, daily.filter(item => item.format === format).length]));
    assert.deepEqual(formatCounts, { family: 2, pair: 2, reading: 2, usage: 2, writing: 2 }, `Day${day}: 形式数`);
  }
  audit.sessionPositions.forEach((positions, index) => {
    assert.deepEqual([...new Set(positions)].sort(), [0, 1, 2], `Day${index + 1}: 正解位置`);
  });

  const formatUi = await page.evaluate(() => window.eval(`(() => {
    const labels = {};
    ["reading", "writing", "usage", "pair", "family"].forEach(format => {
      const question = generateQuestionBank(15).find(item => item.format === format);
      startStudy(15, [question]);
      labels[format] = {
        badge: document.getElementById("qtype").textContent,
        choiceCount: document.querySelectorAll("#choices .choice").length,
        main: document.getElementById("qmain").textContent
      };
    });
    return labels;
  })()`));
  assert.deepEqual(Object.fromEntries(Object.entries(formatUi).map(([format, value]) => [format, value.badge])), {
    reading: "読み",
    writing: "書き取り",
    usage: "使い分け",
    pair: "対になる漢字",
    family: "漢字の仲間"
  });
  Object.values(formatUi).forEach(item => {
    assert.equal(item.choiceCount, 3);
    assert.equal(item.main.length > 1, true);
  });

  /* 同じ登録形式の8級データを、アプリ本体を変更せず追加できることを確認します。 */
  const extensibility = await page.evaluate(() => {
    window.KankenCourseRegistry.register({
      id: "k8", level: 8, name: "漢検8級テスト",
      storageKey: "KANJI8_TEST",
      curriculum: [["学", "校", "教", "室", "算"]],
      readings: { 学: "がく", 校: "こう", 教: "きょう", 室: "しつ", 算: "さん" },
      examples: { 学: "学ぶ。", 校: "学校。", 教: "教える。", 室: "教室。", 算: "算数。" },
      formats: {
        reading: {}, writing: {}, usage: {}, pair: {}, family: {}
      },
      questionData: {
        usageByDay: [[{}, {}]], pairByDay: [[{}, {}]], familyByDay: [[{}, {}]]
      }
    });
    return window.KankenCourseRegistry.list().map(course => course.id);
  });
  assert.deepEqual(extensibility, ["k9", "k8"]);

  /* 回答と「つぎへ」を連打しても、各1回だけ処理されることを確認します。 */
  const rapidAnswer = await page.evaluate(() => window.eval(`(() => {
    startStudy(1, [generateQuestions(1)[0], generateQuestions(1)[1]]);
    const answerIndex = session.questions[0].answer;
    const buttons = document.querySelectorAll("#choices .choice");
    answer(answerIndex, buttons[answerIndex]);
    answer(answerIndex, buttons[answerIndex]);
    const afterAnswer = { results: session.results.length, correct: session.correct, stars: session.stars };
    goToNextQuestion();
    goToNextQuestion();
    return { afterAnswer, index: session.index, results: session.results.length };
  })()`));
  assert.deepEqual(rapidAnswer, {
    afterAnswer: { results: 1, correct: 1, stars: 1 },
    index: 1,
    results: 1
  });

  /* 学習完了を重ねて呼んでも、報酬と統計が一度だけ増えます。 */
  const finishGuard = await page.evaluate(() => window.eval(`(() => {
    const before = {
      tickets: data.gacha.tickets,
      sessions: data.statistics.sessions.length,
      exp: data.player.totalExp
    };
    startStudy(1, [generateQuestions(1)[0]]);
    const answerIndex = session.questions[0].answer;
    answer(answerIndex, document.querySelectorAll("#choices .choice")[answerIndex]);
    goToNextQuestion();
    finishStudy();
    return {
      ticketDelta: data.gacha.tickets - before.tickets,
      sessionDelta: data.statistics.sessions.length - before.sessions,
      expDelta: data.player.totalExp - before.exp,
      finished: session.finished
    };
  })()`));
  assert.deepEqual(finishGuard, { ticketDelta: 1, sessionDelta: 1, expDelta: 30, finished: true });

  /* ガチャ連打でも券消費・履歴追加は1回です。 */
  const gachaRapid = await page.evaluate(() => window.eval(`(() => {
    gachaDrawing = false;
    data.gacha.tickets = 2;
    const historyBefore = data.gacha.history.length;
    drawGacha();
    drawGacha();
    return {
      tickets: data.gacha.tickets,
      historyDelta: data.gacha.history.length - historyBefore,
      drawing: gachaDrawing
    };
  })()`));
  assert.deepEqual(gachaRapid, { tickets: 1, historyDelta: 1, drawing: true });
  await page.waitForTimeout(1300);
  await page.click("#gachaClose");

  /* ブラウザーの戻るをキャンセルすると学習を維持し、承認するとホームへ戻ります。 */
  await page.evaluate(() => window.eval(`startStudy(1); window.confirm = () => false; history.back();`));
  await page.waitForTimeout(100);
  let backState = await page.evaluate(() => ({
    active: document.querySelector(".screen.active").id,
    hasSession: Boolean(window.eval("session"))
  }));
  assert.deepEqual(backState, { active: "study", hasSession: true });
  await page.evaluate(() => window.eval(`window.confirm = () => true; history.back();`));
  await page.waitForTimeout(100);
  backState = await page.evaluate(() => ({
    active: document.querySelector(".screen.active").id,
    hasSession: Boolean(window.eval("session"))
  }));
  assert.deepEqual(backState, { active: "home", hasSession: false });

  /* 書き出し形式、ファイル復元、直前データとの入れ替えを確認します。 */
  const backup = await page.evaluate(() => window.eval(`(() => {
    const envelope = createBackupEnvelope();
    const beforeName = data.profile.name;
    const imported = JSON.parse(JSON.stringify(data));
    imported.profile.name = "復元テスト";
    applyImportedData(imported, "qa-import");
    const afterImport = data.profile.name;
    window.confirm = () => true;
    restoreStoredBackup();
    return {
      app: envelope.app,
      storageKey: envelope.storageKey,
      valid: isValidSaveData(envelope.data),
      beforeName,
      afterImport,
      afterRestore: data.profile.name,
      backupAvailable: Boolean(readStoredBackup())
    };
  })()`));
  assert.deepEqual(backup, {
    app: "kanken9-omochi",
    storageKey: "KANJI9_SAVE_V2",
    valid: true,
    beforeName: "テスト",
    afterImport: "復元テスト",
    afterRestore: "テスト",
    backupAvailable: true
  });

  /* 既存のマップ・シール・ガチャ・着せ替え・図鑑・ごほうびも再描画します。 */
  const existingFeatures = await page.evaluate(() => window.eval(`(() => {
    show("map");
    const mapAreas = document.querySelectorAll(".map-area").length;
    show("stickers");
    const stickerCards = document.querySelectorAll("#stickerGrid .sticker").length;
    show("gacha");
    const gachaItems = document.querySelectorAll("#gachaCollection .collect-item").length;
    show("dress");
    const dressItems = document.querySelectorAll("#dressList .dress-item").length;
    show("dict");
    const dictionaryCards = document.querySelectorAll("#dictList .kanji-card").length;
    show("rewards");
    const rewardScreen = document.getElementById("rewards").classList.contains("active");
    show("parent");
    const parentDay = document.getElementById("pDay").textContent;
    applyEquipment();
    return {
      mapAreas, stickerCards, gachaItems, dressItems, dictionaryCards,
      rewardScreen, parentDay,
      equippedIcon: document.getElementById("homeAccessory").textContent,
      formatStatCards: document.querySelectorAll("#formatStats .format-stat").length
    };
  })()`));
  assert.deepEqual(existingFeatures, {
    mapAreas: 4,
    stickerCards: 6,
    gachaItems: 7,
    dressItems: 8,
    dictionaryCards: 91,
    rewardScreen: true,
    parentDay: "3",
    equippedIcon: "🎩",
    formatStatCards: 5
  });

  /* 4桁目を連打しても暗証番号判定が一度だけ通ることを確認します。 */
  await page.evaluate(() => window.eval(`
    data.parent.pinHash = hash("1234");
    data.parent.pinEnabled = true;
    save();
    renderScreen("home");
    history.replaceState({ screenId: "home" }, "", location.href);
    openPin("unlock");
  `));
  for (const number of ["1", "2", "3", "4"]) {
    await page.locator(`#keypad .key[data-n="${number}"]`).click();
  }
  await page.locator('#keypad .key[data-n="4"]').dispatchEvent("click");
  await page.waitForTimeout(180);
  assert.equal(await page.locator("#pinModal").evaluate(element => element.classList.contains("show")), false);
  assert.equal(await page.locator("#parent").evaluate(element => element.classList.contains("active")), true);

  const versionFile = await page.evaluate(async () => (await fetch("version.json", { cache: "no-store" })).json());
  assert.equal(versionFile.version, "2.1.4");
  assert.equal(versionFile.storageKey, "KANJI9_SAVE_V2");

  /* iPhone SE相当の幅で横はみ出し・入力ズーム要因を確認します。 */
  await page.setViewportSize({ width: 375, height: 812 });
  await page.evaluate(() => window.eval(`show("home")`));
  await page.waitForTimeout(2600);
  const mobileLayout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth
  }));
  assert.equal(mobileLayout.documentWidth <= mobileLayout.viewportWidth, true, "iPhone幅で横スクロールがあります");
  assert.equal(mobileLayout.bodyWidth <= mobileLayout.viewportWidth, true, "bodyがiPhone幅を超えています");
  await page.screenshot({ path: path.join(outputDirectory, "iphone-375-home.png"), fullPage: true });
  await page.click("#settingsBtn2");
  assert.equal(Number.parseFloat(await page.locator("#nameInput").evaluate(element => getComputedStyle(element).fontSize)) >= 16, true);
  await page.evaluate(() => window.eval(`
    startStudy(15, [generateQuestionBank(15).find(item => item.format === "family")]);
  `));
  await page.screenshot({ path: path.join(outputDirectory, "iphone-375-family-question.png"), fullPage: true });

  /* 8字をA4・2ページへ出力します。 */
  await page.setViewportSize({ width: 1280, height: 900 });
  const printStructure = await page.evaluate(() => window.eval(`(() => {
    data.kanji.printSelection = KANJI_CATALOG.slice(0, 8).map(item => item.character);
    renderPractice();
    show("practice");
    return {
      pages: document.querySelectorAll(".print-page").length,
      blocks: Array.from(document.querySelectorAll(".print-page"))
        .map(pageElement => pageElement.querySelectorAll(".print-kanji-block").length)
    };
  })()`));
  assert.deepEqual(printStructure, { pages: 2, blocks: [4, 4] });

  const pdfPath = path.join(outputDirectory, "ver2_1_4-a4-8kanji.pdf");
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false
  });

  assert.deepEqual(pageErrors, [], `ブラウザーエラー: ${pageErrors.join(" / ")}`);
  await browser.close();

  console.log(JSON.stringify({
    result: "PASS",
    days: audit.dayCount,
    questionBank: audit.bankQuestions.length,
    sessionQuestions: audit.sessionQuestions.length,
    formats: ["読み", "書き取り", "使い分け", "対になる漢字", "漢字の仲間"],
    formatUi,
    extensibility,
    catalogCharacters: audit.catalog.length,
    compatibility,
    rapidAnswer,
    finishGuard,
    gachaRapid,
    backNavigation: "PASS",
    backupRestore: "PASS",
    existingFeatures,
    pinRapidInput: "PASS",
    mobileLayout,
    printStructure,
    pdfPath
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
