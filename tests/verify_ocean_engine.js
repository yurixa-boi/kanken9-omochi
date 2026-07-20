"use strict";

const assert = require("assert");
const OceanEngine = require("../ocean-engine.js");

const fixedClock = () => new Date("2026-07-20T00:00:00.000Z");

assert.strictEqual(OceanEngine.areas.length, 4, "4海域を定義する");
assert.strictEqual(OceanEngine.bosses.length, 4, "各海域にボスを定義する");
assert.strictEqual(OceanEngine.STORAGE_KEY, "KANKEN9_OCEAN_V3", "既存保存キーを使わない");

const initial = OceanEngine.createInitialSave(fixedClock);
assert.deepStrictEqual(initial.unlockedAreaIds, ["coral-bay"]);
assert.strictEqual(initial.bosses["boss-crab"].hp, 30);
assert.strictEqual(initial.currency.shells, 0);

const nodeCleared = OceanEngine.markNodeCleared(initial, "coral-1", fixedClock);
assert.deepStrictEqual(nodeCleared.clearedNodeIds, ["coral-1"]);
assert.deepStrictEqual(initial.clearedNodeIds, [], "更新前データを変更しない");

const damaged = OceanEngine.applyBossDamage(nodeCleared, "boss-crab", 12, fixedClock);
assert.strictEqual(damaged.bosses["boss-crab"].hp, 18);
assert.strictEqual(damaged.bosses["boss-crab"].attempts, 1);

const defeated = OceanEngine.applyBossDamage(damaged, "boss-crab", 99, fixedClock);
assert.strictEqual(defeated.bosses["boss-crab"].defeated, true);
assert.strictEqual(defeated.bosses["boss-crab"].hp, 0);
assert.strictEqual(defeated.currency.shells, 10);
assert.ok(defeated.unlockedAreaIds.includes("bubble-strait"));

const repeated = OceanEngine.applyBossDamage(defeated, "boss-crab", 10, fixedClock);
assert.strictEqual(repeated.currency.shells, 10, "ボス報酬を重複付与しない");

assert.throws(
  () => OceanEngine.applyBossDamage(initial, "boss-octopus", 1, fixedClock),
  /locked/,
  "未解放海域のボスとは戦えない"
);

const oldSave = {
  currentAreaId: "unknown",
  unlockedAreaIds: ["deep-blue", "unknown", "deep-blue"],
  bosses: { "boss-crab": { hp: -10, defeated: false, attempts: -2 } },
  currency: { shells: -100 },
  meta: { createdAt: "2026-01-01T00:00:00.000Z" }
};
const migrated = OceanEngine.migrateSave(oldSave, fixedClock);
assert.strictEqual(migrated.schemaVersion, 1);
assert.deepStrictEqual(migrated.unlockedAreaIds, ["coral-bay", "deep-blue"]);
assert.strictEqual(migrated.currentAreaId, "deep-blue");
assert.strictEqual(migrated.currency.shells, 0);
assert.strictEqual(migrated.bosses["boss-crab"].hp, 30);

const memoryStorage = {
  values: new Map(),
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
  setItem(key, value) { this.values.set(key, value); }
};
const stored = OceanEngine.save(memoryStorage, defeated, fixedClock);
assert.deepStrictEqual(OceanEngine.load(memoryStorage, fixedClock), stored);
assert.strictEqual(memoryStorage.getItem("KANJI9_SAVE_V2"), null, "既存データを変更しない");

console.log("Ocean Engine Ver.3.0 Part1: all checks passed");
