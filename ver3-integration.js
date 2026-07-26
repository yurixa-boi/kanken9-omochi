"use strict";
(function initializeVer3Integration() {
  const SAVE_KEY = "KANJI9_SAVE_V2";
  const TOTAL_DAYS = 100;
  const DAYS_PER_SEA = 10;
  const SEAS = [
    "日本海",
    "東シナ海",
    "南シナ海",
    "太平洋",
    "インド洋",
    "紅海",
    "地中海",
    "大西洋",
    "南極海",
    "深海",
  ];
  let cardTotal = 0;
  const byId = id => document.getElementById(id);

  function readSave() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function render() {
    const save = readSave();
    const ocean = save.oceanAdventure || {};
    const position = Math.max(0, Math.min(TOTAL_DAYS, Number(ocean.position) || 0));
    const day = Math.max(1, Math.min(TOTAL_DAYS, Number(ocean.currentDay) || position + 1));
    const stage = Math.max(
      1,
      Math.min(SEAS.length, Number(ocean.currentStage) || Math.ceil(day / DAYS_PER_SEA)),
    );
    const stageStart = (stage - 1) * DAYS_PER_SEA;
    const inStage = Math.max(0, Math.min(DAYS_PER_SEA, position - stageStart));
    const owned = Array.isArray(save.ownedCardIds)
      ? new Set(save.ownedCardIds.map(Number)).size
      : 0;
    const bosses = Array.isArray(ocean.bossCleared) ? ocean.bossCleared.length : 0;
    const completedDays =
      save.progress && Array.isArray(save.progress.completedDays)
        ? save.progress.completedDays.length
        : position;

    if (byId("ver3HomeSea")) byId("ver3HomeSea").textContent = SEAS[stage - 1];
    if (byId("ver3HomeOceanDay")) byId("ver3HomeOceanDay").textContent = `Day ${day}`;
    if (byId("ver3HomeOceanBar")) {
      byId("ver3HomeOceanBar").style.width = `${inStage * 10}%`;
    }
    if (byId("ver3HomeOceanText")) {
      byId("ver3HomeOceanText").textContent =
        `${"■".repeat(inStage)}${"□".repeat(DAYS_PER_SEA - inStage)}　全体 ${position}/${TOTAL_DAYS}`;
    }
    if (byId("ver3ParentDays")) byId("ver3ParentDays").textContent = `${completedDays}日`;
    const completion = cardTotal ? Math.round((owned / cardTotal) * 100) : 0;
    if (byId("ver3ParentCards")) {
      byId("ver3ParentCards").textContent =
        `${owned} / ${cardTotal || "-"}枚 ／ ${completion}%`;
    }
    if (byId("ver3ParentOcean")) {
      byId("ver3ParentOcean").textContent = `${SEAS[stage - 1]} ／ ボス${bosses}回`;
    }
  }

  fetch("ocean-adventure/data/cards.json?v=3.1-test", { cache: "no-store" })
    .then(response => (response.ok ? response.json() : []))
    .then(cards => {
      cardTotal = Array.isArray(cards) ? cards.length : 0;
      render();
    })
    .catch(() => render());

  window.addEventListener("storage", render);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });
  render();
})();
