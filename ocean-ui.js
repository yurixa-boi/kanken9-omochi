"use strict";

/* Ocean Engine Ver.3.0 Part2: 海域マップとボス戦画面 */
(function initializeOceanAdventure(globalObject) {
  const engine = globalObject.OceanEngine;
  if (!engine) return;

  const BOSS_ICONS = {
    "boss-crab": "🦀",
    "boss-octopus": "🐙",
    "boss-angler": "🐡",
    "boss-dragon": "🐉"
  };
  const AREA_THEMES = {
    "coral-bay": "coral",
    "bubble-strait": "bubble",
    "deep-blue": "deep",
    "dragon-palace": "palace"
  };
  const QUESTIONS_PER_BATTLE = 5;
  const DAMAGE_PER_CORRECT = 10;
  const COLLECTION_ITEMS = Object.freeze([
    { id: "sea-badge", icon: "⚓", name: "船長バッジ", cost: 5 },
    { id: "pearl", icon: "🦪", name: "きらきら真珠", cost: 8 },
    { id: "coral-crown", icon: "🪸", name: "さんごの王冠", cost: 12 },
    { id: "dolphin", icon: "🐬", name: "イルカのおとも", cost: 15 },
    { id: "treasure-map", icon: "🗺️", name: "海賊の宝の地図", cost: 20 },
    { id: "golden-ship", icon: "⛵", name: "黄金のおもち号", cost: 30 }
  ]);

  let oceanSave = engine.load(localStorage);
  let battle = null;
  let celebrationReturnFocus = null;

  function element(id) {
    return document.getElementById(id);
  }

  function persist(nextSave) {
    oceanSave = engine.save(localStorage, nextSave);
    return oceanSave;
  }

  function showOceanCelebration({ icon, label, title, text, returnFocus }) {
    const modal = element("oceanCelebration");
    if (!modal) return;
    celebrationReturnFocus = returnFocus || document.activeElement;
    element("oceanCelebrationIcon").textContent = icon;
    element("oceanCelebrationLabel").textContent = label;
    element("oceanCelebrationTitle").textContent = title;
    element("oceanCelebrationText").textContent = text;
    modal.classList.add("show");
    document.body.classList.add("modal-open");
    element("oceanCelebrationClose").focus();
    if (typeof burst === "function") burst(55);
  }

  function closeOceanCelebration() {
    const modal = element("oceanCelebration");
    if (!modal || !modal.classList.contains("show")) return;
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
    if (celebrationReturnFocus && document.contains(celebrationReturnFocus)) celebrationReturnFocus.focus();
    celebrationReturnFocus = null;
  }

  function exportSave() {
    return JSON.parse(JSON.stringify(oceanSave));
  }

  function importSave(candidate) {
    persist(engine.migrateSave(candidate));
    renderOceanMap();
    renderParentProgress();
    return exportSave();
  }

  function resetSave() {
    persist(engine.createInitialSave());
    renderOceanMap();
    renderParentProgress();
  }

  function currentOceanArea() {
    const unlocked = engine.areas.filter(area => isAreaUnlocked(area.id));
    return unlocked[unlocked.length - 1] || engine.areas[0];
  }

  function calculateStudyDamage(result) {
    return Math.max(0, Number(result.correct) || 0) * 2
      + Math.min(10, Math.max(0, Number(result.maxCombo) || 0));
  }

  function applyStudyResult(result) {
    if (!result || typeof result.sessionId !== "string") return null;
    if (result.mode !== "regular") {
      return { type: "review", title: "復習を完了！", text: "復習では航海進行と報酬は増えません。" };
    }
    oceanSave.study = oceanSave.study || { appliedSessionIds: [] };
    if (oceanSave.study.appliedSessionIds.includes(result.sessionId)) {
      return { type: "duplicate", title: "航海記録済み", text: "この学習結果はすでに反映されています。" };
    }

    const area = currentOceanArea();
    const boss = engine.getBoss(area.bossId);
    const bossBefore = oceanSave.bosses[boss.id];
    const nodeId = nextSailingNode(area);
    let outcome;

    if (nodeId) {
      oceanSave = engine.markNodeCleared(oceanSave, nodeId);
      const progress = areaProgress(area);
      outcome = {
        type: "sailing",
        icon: "⛵",
        title: `${area.name}を進んだ！`,
        text: `航海ポイント ${progress} / 3。${progress === 3 ? "ボス戦が開きました！" : "次の学習でもう一歩進めます。"}`
      };
    } else if (!bossBefore.defeated) {
      const damage = calculateStudyDamage(result);
      if (damage > 0) oceanSave = engine.applyBossDamage(oceanSave, boss.id, damage);
      const bossAfter = oceanSave.bosses[boss.id];
      outcome = bossAfter.defeated
        ? {
          type: "boss-defeated",
          icon: "🏆",
          title: `${boss.name}をたおした！`,
          text: `${damage}ダメージ！ 🐚${boss.reward.shells}個を獲得し、次の海域が開きました。`,
          celebration: true
        }
        : {
          type: "boss-damage",
          icon: "⚔️",
          title: `${boss.name}に${damage}ダメージ！`,
          text: `正解${result.correct}問・最大${result.maxCombo}コンボ。残りHP ${bossAfter.hp} / ${boss.maxHp}`
        };
    } else {
      outcome = { type: "complete", icon: "🌊", title: "この海域はクリア済み！", text: "海域マップから次の海へ進もう。" };
    }

    oceanSave.study.appliedSessionIds.push(result.sessionId);
    oceanSave.study.appliedSessionIds = oceanSave.study.appliedSessionIds.slice(-200);
    persist(oceanSave);
    return outcome;
  }

  function renderStudyOutcome(outcome) {
    const panel = element("oceanStudyResult");
    if (!panel) return;
    panel.classList.toggle("hidden", !outcome);
    if (!outcome) return;
    element("oceanStudyIcon").textContent = outcome.icon || (outcome.type === "review" ? "📘" : "⛵");
    element("oceanStudyTitle").textContent = outcome.title;
    element("oceanStudyText").textContent = outcome.text;
    panel.dataset.outcome = outcome.type;
    if (outcome.celebration) {
      outcome.celebration = false;
      const area = currentOceanArea();
      showOceanCelebration({
        icon: "🏆",
        label: "ボス撃破！",
        title: outcome.title,
        text: `${outcome.text} 次は「${area.name}」へ進もう！`,
        returnFocus: panel
      });
    }
  }

  function isAreaUnlocked(areaId) {
    return oceanSave.unlockedAreaIds.includes(areaId);
  }

  function regularNodes(area) {
    return area.nodes.filter(nodeId => !nodeId.endsWith("-boss"));
  }

  function isBossAvailable(area) {
    return regularNodes(area).every(nodeId => oceanSave.clearedNodeIds.includes(nodeId));
  }

  function nextSailingNode(area) {
    return regularNodes(area).find(nodeId => !oceanSave.clearedNodeIds.includes(nodeId)) || null;
  }

  function areaProgress(area) {
    return regularNodes(area).filter(nodeId => oceanSave.clearedNodeIds.includes(nodeId)).length;
  }

  function showOceanMap() {
    if (typeof show === "function") show("ocean");
    renderOceanMap();
  }

  function renderOceanMap() {
    element("oceanShells").textContent = String(oceanSave.currency.shells);
    element("oceanShopShells").textContent = String(oceanSave.currency.shells);
    const container = element("oceanMap");
    container.innerHTML = "";

    engine.areas.forEach(area => {
      const unlocked = isAreaUnlocked(area.id);
      const boss = engine.getBoss(area.bossId);
      const bossState = oceanSave.bosses[boss.id];
      const progress = areaProgress(area);
      const nextNode = nextSailingNode(area);
      const bossAvailable = unlocked && isBossAvailable(area);
      const card = document.createElement("article");
      card.className = `ocean-area ocean-theme-${AREA_THEMES[area.id]}${unlocked ? "" : " ocean-locked"}`;
      card.setAttribute("aria-label", `${area.name}、航海 ${progress} / 3${unlocked ? "" : "、未解放"}`);

      const nodes = regularNodes(area).map((nodeId, index) => {
        const cleared = oceanSave.clearedNodeIds.includes(nodeId);
        const active = unlocked && nodeId === nextNode;
        const stateLabel = cleared ? "クリア済み" : active ? "現在地" : "未到達";
        return `<div class="ocean-node${cleared ? " cleared" : active ? " active" : " locked"}" aria-label="航海ポイント ${index + 1}、${stateLabel}"><span aria-hidden="true">${cleared ? "✓" : active ? "⛵" : "🔒"}</span><small>${index + 1}</small></div>`;
      }).join("<i class='ocean-route-line'></i>");

      const action = !unlocked
        ? `<button class="ocean-action" disabled>🔒 前の海域をクリアしよう</button>`
        : bossState.defeated
          ? `<button class="ocean-action defeated" disabled>🏆 ${escapeHTML(boss.name)} 撃破済み</button>`
          : nextNode
            ? `<button class="ocean-action sail" data-ocean-node="${nextNode}">⛵ 航海する（${progress + 1} / 3）</button>`
            : `<button class="ocean-action boss" data-ocean-boss="${boss.id}"${bossAvailable ? "" : " disabled"}>⚔️ ${escapeHTML(boss.name)}に挑戦</button>`;

      card.innerHTML = `<div class="ocean-area-heading"><span class="ocean-area-icon" aria-hidden="true">${area.icon}</span><div><small>AREA ${area.order}</small><h2>${escapeHTML(area.name)}</h2></div><span class="ocean-area-progress" aria-label="航海 ${progress} / 3">${progress}/3</span></div><div class="ocean-route">${nodes}<div class="ocean-node boss-node${bossState.defeated ? " cleared" : bossAvailable ? " active" : " locked"}" aria-label="${escapeHTML(boss.name)}、${bossState.defeated ? "撃破済み" : bossAvailable ? "挑戦可能" : "未到達"}"><span aria-hidden="true">${bossState.defeated ? "🏆" : BOSS_ICONS[boss.id]}</span><small>BOSS</small></div></div>${action}`;
      container.appendChild(card);
    });

    container.querySelectorAll("[data-ocean-node]").forEach(button => {
      button.addEventListener("click", () => completeSailingNode(button.dataset.oceanNode));
    });
    container.querySelectorAll("[data-ocean-boss]").forEach(button => {
      button.addEventListener("click", () => startBossBattle(button.dataset.oceanBoss));
    });
    renderOceanCollection();
  }

  function renderOceanCollection() {
    const container = element("oceanCollection");
    if (!container) return;
    const ownedIds = oceanSave.collection && Array.isArray(oceanSave.collection.ownedIds)
      ? oceanSave.collection.ownedIds
      : [];
    container.innerHTML = "";
    COLLECTION_ITEMS.forEach(item => {
      const owned = ownedIds.includes(item.id);
      const canBuy = oceanSave.currency.shells >= item.cost;
      const card = document.createElement("div");
      card.className = `ocean-collect-item${owned ? " owned" : ""}`;
      card.tabIndex = -1;
      card.innerHTML = `<span aria-hidden="true">${item.icon}</span><b>${escapeHTML(item.name)}</b><small>${owned ? "獲得済み" : `🐚 ${item.cost}個`}</small><button class="mini-btn" data-ocean-item="${item.id}" aria-label="${escapeHTML(item.name)}、${owned ? "獲得済み" : `${item.cost}個の貝で交換`}"${owned || !canBuy ? " disabled" : ""}>${owned ? "コレクション済み" : canBuy ? "交換する" : "貝が足りません"}</button>`;
      container.appendChild(card);
    });
    container.querySelectorAll("[data-ocean-item]").forEach(button => {
      button.addEventListener("click", () => purchaseCollectionItem(button.dataset.oceanItem));
    });
  }

  function purchaseCollectionItem(itemId) {
    const item = COLLECTION_ITEMS.find(candidate => candidate.id === itemId);
    if (!item) return false;
    oceanSave.collection = oceanSave.collection || { ownedIds: [] };
    if (oceanSave.collection.ownedIds.includes(item.id)) return false;
    if (oceanSave.currency.shells < item.cost) {
      if (typeof toast === "function") toast("貝が足りません");
      return false;
    }
    oceanSave.currency.shells -= item.cost;
    oceanSave.collection.ownedIds.push(item.id);
    persist(oceanSave);
    renderOceanMap();
    const acquiredCard = document.querySelector(`[data-ocean-item="${item.id}"]`).closest(".ocean-collect-item");
    showOceanCelebration({
      icon: item.icon,
      label: "コレクション獲得！",
      title: item.name,
      text: `海限定の宝物を手に入れました。残りの貝は${oceanSave.currency.shells}個です。`,
      returnFocus: acquiredCard
    });
    return true;
  }

  function renderParentProgress() {
    if (!element("parentOceanArea")) return;
    const area = currentOceanArea();
    const defeatedCount = engine.bosses.filter(boss => oceanSave.bosses[boss.id].defeated).length;
    const boss = engine.getBoss(area.bossId);
    const bossState = oceanSave.bosses[boss.id];
    const ownedCount = oceanSave.collection && Array.isArray(oceanSave.collection.ownedIds)
      ? oceanSave.collection.ownedIds.length
      : 0;
    element("parentOceanArea").textContent = area.name;
    element("parentOceanBosses").textContent = `${defeatedCount} / ${engine.bosses.length}`;
    element("parentOceanShells").textContent = String(oceanSave.currency.shells);
    element("parentOceanOwned").textContent = String(ownedCount);
    element("parentOceanBoss").textContent = bossState.defeated
      ? `${boss.name}：撃破済み`
      : `${boss.name}：HP ${bossState.hp} / ${boss.maxHp}（航海 ${areaProgress(area)} / 3）`;
  }

  function completeSailingNode(nodeId) {
    const next = engine.markNodeCleared(oceanSave, nodeId);
    persist(next);
    renderOceanMap();
    const button = document.querySelector(`[data-ocean-node="${nodeId}"]`);
    if (button) button.focus();
    if (typeof toast === "function") toast("航海ポイントをクリアしました！");
  }

  function battleQuestions() {
    const day = data && data.progress ? data.progress.currentDay : 1;
    const questions = typeof generateQuestions === "function" ? generateQuestions(day) : [];
    const prepared = typeof prepareQuestionsForSession === "function"
      ? prepareQuestionsForSession(questions.slice(0, QUESTIONS_PER_BATTLE))
      : questions.slice(0, QUESTIONS_PER_BATTLE);
    return prepared;
  }

  function startBossBattle(bossId) {
    const boss = engine.getBoss(bossId);
    if (!boss || !isAreaUnlocked(boss.areaId)) return;
    const area = engine.getArea(boss.areaId);
    if (!isBossAvailable(area)) return;

    battle = {
      boss,
      area,
      questions: battleQuestions(),
      index: 0,
      correct: 0,
      answered: false,
      finished: false
    };
    element("oceanBattleResult").classList.add("hidden");
    element("oceanQuestionCard").classList.remove("hidden");
    if (typeof show === "function") show("oceanBattle");
    renderBossHeader();
    renderBossQuestion();
  }

  function renderBossHeader() {
    if (!battle) return;
    const state = oceanSave.bosses[battle.boss.id];
    const hpPercent = Math.round(state.hp / battle.boss.maxHp * 100);
    element("oceanBattleArea").textContent = battle.area.name;
    element("oceanBossIcon").textContent = BOSS_ICONS[battle.boss.id] || "👾";
    element("oceanBossName").textContent = battle.boss.name;
    element("oceanBossHpText").textContent = `${state.hp} / ${battle.boss.maxHp}`;
    element("oceanBossHpBar").style.width = `${hpPercent}%`;
    element("oceanBossHp").setAttribute("aria-valuemax", String(battle.boss.maxHp));
    element("oceanBossHp").setAttribute("aria-valuenow", String(state.hp));
  }

  function renderBossQuestion() {
    if (!battle || battle.finished) return;
    if (battle.index >= battle.questions.length) {
      finishBossBattle();
      return;
    }
    const question = battle.questions[battle.index];
    battle.answered = false;
    element("oceanQuestionType").textContent = `${question.type}　${battle.index + 1} / ${battle.questions.length}`;
    element("oceanQuestionPrompt").textContent = question.prompt;
    element("oceanQuestionMain").textContent = question.main;
    element("oceanQuestionMain").classList.toggle("sentence", question.main.length > 4);
    element("oceanFeedback").className = "feedback";
    element("oceanNextBtn").classList.add("hidden");
    const choices = element("oceanChoices");
    choices.innerHTML = "";
    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.className = "choice";
      button.textContent = choice;
      button.addEventListener("click", () => answerBossQuestion(index, button));
      choices.appendChild(button);
    });
  }

  function answerBossQuestion(choiceIndex, selectedButton) {
    if (!battle || battle.answered || battle.finished) return;
    battle.answered = true;
    const question = battle.questions[battle.index];
    const correct = choiceIndex === question.answer;
    Array.from(element("oceanChoices").children).forEach((button, index) => {
      button.disabled = true;
      if (index === question.answer) button.classList.add("ok");
    });
    const feedback = element("oceanFeedback");
    if (correct) {
      battle.correct += 1;
      selectedButton.classList.add("ok");
      feedback.className = "feedback show ok";
      feedback.textContent = `正解！ ${DAMAGE_PER_CORRECT}ダメージ！`;
      const bossState = oceanSave.bosses[battle.boss.id];
      const previewHp = Math.max(0, bossState.hp - battle.correct * DAMAGE_PER_CORRECT);
      element("oceanBossHpText").textContent = `${previewHp} / ${battle.boss.maxHp}`;
      element("oceanBossHpBar").style.width = `${Math.round(previewHp / battle.boss.maxHp * 100)}%`;
      element("oceanBossHp").setAttribute("aria-valuenow", String(previewHp));
      element("oceanBossIcon").classList.add("boss-hit");
      setTimeout(() => element("oceanBossIcon").classList.remove("boss-hit"), 450);
    } else {
      selectedButton.classList.add("ng");
      feedback.className = "feedback show ng";
      feedback.textContent = `おしい！ 正解は「${question.choices[question.answer]}」`;
    }
    element("oceanNextBtn").classList.remove("hidden");
  }

  function nextBossQuestion() {
    if (!battle || !battle.answered || battle.finished) return;
    battle.index += 1;
    renderBossQuestion();
  }

  function finishBossBattle() {
    if (!battle || battle.finished) return;
    battle.finished = true;
    const damage = battle.correct * DAMAGE_PER_CORRECT;
    if (damage > 0) persist(engine.applyBossDamage(oceanSave, battle.boss.id, damage));
    const state = oceanSave.bosses[battle.boss.id];
    renderBossHeader();
    element("oceanQuestionCard").classList.add("hidden");
    element("oceanBattleResult").classList.remove("hidden");
    element("oceanResultIcon").textContent = state.defeated ? "🏆" : "⚔️";
    element("oceanResultTitle").textContent = state.defeated ? "ボスをたおした！" : `${damage}ダメージ！`;
    element("oceanResultText").textContent = state.defeated
      ? `🐚${battle.boss.reward.shells}個を獲得！ 次の海域が開きました。`
      : `正解 ${battle.correct} / ${battle.questions.length}。ボスの残りHPは${state.hp}です。`;
    element("oceanResultBtn").textContent = state.defeated ? "次の海域を見る" : "海域マップへ戻る";
    if (state.defeated) {
      const nextArea = engine.areas.find(area => area.requiredAreaId === battle.area.id);
      showOceanCelebration({
        icon: "🏆",
        label: "ボス撃破！",
        title: `${battle.boss.name}をたおした！`,
        text: nextArea
          ? `貝を${battle.boss.reward.shells}個獲得し、「${nextArea.name}」が開きました！`
          : `貝を${battle.boss.reward.shells}個獲得し、すべての海域を制覇しました！`,
        returnFocus: element("oceanResultBtn")
      });
    }
  }

  function leaveBossBattle() {
    battle = null;
    showOceanMap();
  }

  element("oceanBtn").addEventListener("click", () => {
    location.href = "ocean-adventure/ocean-adventure.html";
  });
  element("oceanBack").addEventListener("click", () => show("home"));
  element("oceanBattleBack").addEventListener("click", leaveBossBattle);
  element("oceanNextBtn").addEventListener("click", nextBossQuestion);
  element("oceanResultBtn").addEventListener("click", leaveBossBattle);
  element("oceanCelebrationClose").addEventListener("click", closeOceanCelebration);
  element("oceanCelebration").addEventListener("click", event => {
    if (event.target === element("oceanCelebration")) closeOceanCelebration();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeOceanCelebration();
    if (event.key === "Tab" && element("oceanCelebration").classList.contains("show")) {
      event.preventDefault();
      element("oceanCelebrationClose").focus();
    }
  });

  globalObject.OceanAdventureUI = Object.freeze({
    renderOceanMap,
    showOceanMap,
    startBossBattle,
    applyStudyResult,
    renderStudyOutcome,
    calculateStudyDamage,
    purchaseCollectionItem,
    renderOceanCollection,
    renderParentProgress,
    exportSave,
    importSave,
    resetSave,
    showOceanCelebration,
    getSave: () => JSON.parse(JSON.stringify(oceanSave))
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
