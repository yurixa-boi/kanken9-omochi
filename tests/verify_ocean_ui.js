"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const css = fs.readFileSync(require.resolve("../style.css"), "utf8");
const ui = fs.readFileSync(require.resolve("../ocean-ui.js"), "utf8");

assert.match(html, /id="oceanBtn"/);
assert.match(html, /id="ocean" class="screen"/);
assert.match(html, /id="oceanBattle" class="screen"/);
assert.match(html, /ocean-ui\.js\?v=3\.0\.0-part4/);
assert.ok(html.indexOf("app.js?v=3.0.0-part4") < html.indexOf("ocean-ui.js?v=3.0.0-part4"));

[
  "oceanMap", "oceanShells", "oceanBossName", "oceanBossHpBar",
  "oceanChoices", "oceanNextBtn", "oceanBattleResult"
].forEach(id => assert.match(html, new RegExp(`id="${id}"`), `${id} が必要`));

assert.match(css, /\.ocean-area/);
assert.match(css, /\.ocean-battle-stage/);
assert.match(css, /@media\(max-width:500px\).*\.ocean-header/s);

assert.match(ui, /engine\.load\(localStorage\)/);
assert.match(ui, /engine\.save\(localStorage/);
assert.match(ui, /engine\.markNodeCleared/);
assert.match(ui, /engine\.applyBossDamage/);
assert.match(ui, /QUESTIONS_PER_BATTLE = 5/);
assert.match(ui, /DAMAGE_PER_CORRECT = 10/);
assert.match(ui, /function applyStudyResult/);
assert.match(ui, /appliedSessionIds\.includes/);
assert.match(ui, /result\.mode !== "regular"/);
assert.match(ui, /calculateStudyDamage/);
assert.match(ui, /COLLECTION_ITEMS/);
assert.match(ui, /function purchaseCollectionItem/);
assert.match(ui, /function renderParentProgress/);
assert.match(ui, /function exportSave/);
assert.match(ui, /function importSave/);
assert.doesNotMatch(ui, /KANJI9_SAVE_V2/);

console.log("Ocean Engine Ver.3.0 Part2 UI: all checks passed");
