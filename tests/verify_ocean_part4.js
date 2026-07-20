"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync(require.resolve("../app.js"), "utf8");
const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const engine = fs.readFileSync(require.resolve("../ocean-engine.js"), "utf8");
const ui = fs.readFileSync(require.resolve("../ocean-ui.js"), "utf8");

assert.match(html, /id="oceanCollection"/);
assert.match(html, /id="parentOceanArea"/);
assert.match(html, /id="parentOceanBosses"/);
assert.match(html, /Ocean進捗・設定をJSONファイルに保存/);
assert.match(html, /style\.css\?v=3\.0\.0-part4/);
assert.match(html, /app\.js\?v=3\.0\.0-part4/);
assert.match(engine, /collection: \{ ownedIds: \[\] \}/);
assert.match(app, /oceanData: window\.OceanAdventureUI/);
assert.match(app, /payload\.oceanData/);
assert.match(app, /backup\.payload\.oceanData/);
assert.match(app, /OceanAdventureUI\.resetSave\(\)/);
assert.match(ui, /oceanSave\.currency\.shells -= item\.cost/);
assert.match(ui, /oceanSave\.collection\.ownedIds\.push/);
assert.match(ui, /renderParentProgress/);

console.log("Ocean Engine Ver.3.0 Part4: all checks passed");
