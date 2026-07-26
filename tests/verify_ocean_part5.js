"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const OceanEngine = require("../ocean-engine.js");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const css = fs.readFileSync(require.resolve("../style.css"), "utf8");
const ui = fs.readFileSync(require.resolve("../ocean-ui.js"), "utf8");

// Part1〜4の保存・航海・撃破・交換基盤をPart5でも維持する。
let save = OceanEngine.createInitialSave(() => new Date("2026-07-20T00:00:00Z"));
for (const nodeId of ["coral-1", "coral-2", "coral-3"]) {
  save = OceanEngine.markNodeCleared(save, nodeId);
}
save = OceanEngine.applyBossDamage(save, "boss-crab", 30);
assert.equal(save.bosses["boss-crab"].defeated, true);
assert.equal(save.currency.shells, 10);
assert.ok(save.unlockedAreaIds.includes("bubble-strait"));
const restored = OceanEngine.migrateSave(JSON.parse(JSON.stringify(save)));
assert.equal(restored.bosses["boss-crab"].defeated, true);
assert.equal(restored.currency.shells, 10);

// 演出、読み上げ、キーボード操作、スマホ・動作軽減設定の接続を検証する。
assert.match(html, /id="oceanCelebration" role="dialog" aria-modal="true"/);
assert.match(html, /id="oceanBossHp" role="progressbar"/);
assert.match(html, /style\.css\?v=3\.0\.0-part5/);
assert.match(ui, /showOceanCelebration/);
assert.match(ui, /label: "ボス撃破！"/);
assert.match(ui, /label: "コレクション獲得！"/);
assert.match(ui, /aria-valuenow/);
assert.match(ui, /event\.key === "Escape"/);
assert.match(ui, /event\.key === "Tab"/);
assert.match(ui, /returnFocus: acquiredCard/);
assert.match(css, /@media\(max-width:380px\)/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /:focus-visible/);

console.log("Ocean Engine Ver.3.0 Part5: integrated regression checks passed");
