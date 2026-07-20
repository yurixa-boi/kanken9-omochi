"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync(require.resolve("../app.js"), "utf8");
const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const engine = fs.readFileSync(require.resolve("../ocean-engine.js"), "utf8");
const ui = fs.readFileSync(require.resolve("../ocean-ui.js"), "utf8");

assert.match(app, /mode: customQuestions \? "review" : "regular"/);
assert.match(app, /session\.oceanResult = window\.OceanAdventureUI/);
assert.match(app, /applyStudyResult\(\{/);
assert.match(app, /renderStudyOutcome\(session\.oceanResult\)/);
assert.match(html, /id="oceanStudyResult"/);
assert.match(engine, /study: \{ appliedSessionIds: \[\] \}/);
assert.match(ui, /type: "sailing"/);
assert.match(ui, /type: "boss-damage"/);
assert.match(ui, /type: "boss-defeated"/);
assert.match(ui, /slice\(-200\)/);

console.log("Ocean Engine Ver.3.0 Part3 study integration: all checks passed");
