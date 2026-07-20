"use strict";

/*
 * Ocean Engine Ver.3.0 Part1
 *
 * 海域・ボス・保存データの共通基盤です。画面や既存の学習処理から独立させ、
 * 従来の KANJI9_SAVE_V2 には触れません。
 */
(function initializeOceanEngine(globalObject) {
  const ENGINE_VERSION = "3.0.0-part4";
  const SAVE_SCHEMA_VERSION = 1;
  const STORAGE_KEY = "KANKEN9_OCEAN_V3";

  const OCEAN_AREAS = Object.freeze([
    freezeArea({
      id: "coral-bay",
      order: 1,
      name: "さんごの入り江",
      icon: "🪸",
      requiredAreaId: null,
      nodes: ["coral-1", "coral-2", "coral-3", "coral-boss"],
      bossId: "boss-crab"
    }),
    freezeArea({
      id: "bubble-strait",
      order: 2,
      name: "あわあわ海峡",
      icon: "🫧",
      requiredAreaId: "coral-bay",
      nodes: ["bubble-1", "bubble-2", "bubble-3", "bubble-boss"],
      bossId: "boss-octopus"
    }),
    freezeArea({
      id: "deep-blue",
      order: 3,
      name: "深海ブルー",
      icon: "🐋",
      requiredAreaId: "bubble-strait",
      nodes: ["deep-1", "deep-2", "deep-3", "deep-boss"],
      bossId: "boss-angler"
    }),
    freezeArea({
      id: "dragon-palace",
      order: 4,
      name: "りゅうぐうの海",
      icon: "🐉",
      requiredAreaId: "deep-blue",
      nodes: ["palace-1", "palace-2", "palace-3", "palace-boss"],
      bossId: "boss-dragon"
    })
  ]);

  const BOSSES = Object.freeze([
    freezeBoss({ id: "boss-crab", areaId: "coral-bay", name: "ハサミ大王", maxHp: 30, reward: { shells: 10 } }),
    freezeBoss({ id: "boss-octopus", areaId: "bubble-strait", name: "すみだこ船長", maxHp: 45, reward: { shells: 15 } }),
    freezeBoss({ id: "boss-angler", areaId: "deep-blue", name: "ちょうちん魔王", maxHp: 60, reward: { shells: 20 } }),
    freezeBoss({ id: "boss-dragon", areaId: "dragon-palace", name: "海竜王", maxHp: 80, reward: { shells: 30 } })
  ]);

  const AREA_BY_ID = new Map(OCEAN_AREAS.map(area => [area.id, area]));
  const BOSS_BY_ID = new Map(BOSSES.map(boss => [boss.id, boss]));

  function freezeArea(area) {
    return Object.freeze({ ...area, nodes: Object.freeze(area.nodes.slice()) });
  }

  function freezeBoss(boss) {
    return Object.freeze({ ...boss, reward: Object.freeze({ ...boss.reward }) });
  }

  function nowIso(clock) {
    const value = typeof clock === "function" ? clock() : new Date();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
  }

  function createBossState() {
    return Object.fromEntries(BOSSES.map(boss => [boss.id, {
      hp: boss.maxHp,
      defeated: false,
      attempts: 0,
      defeatedAt: ""
    }]));
  }

  function createInitialSave(clock) {
    const createdAt = nowIso(clock);
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      currentAreaId: OCEAN_AREAS[0].id,
      unlockedAreaIds: [OCEAN_AREAS[0].id],
      clearedNodeIds: [],
      bosses: createBossState(),
      currency: { shells: 0 },
      study: { appliedSessionIds: [] },
      collection: { ownedIds: [] },
      meta: { createdAt, updatedAt: createdAt }
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueKnown(values, knownIds) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter(value => knownIds.has(value)))];
  }

  function migrateSave(candidate, clock) {
    const initial = createInitialSave(clock);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return initial;

    const areaIds = new Set(OCEAN_AREAS.map(area => area.id));
    const nodeIds = new Set(OCEAN_AREAS.flatMap(area => area.nodes));
    const unlockedAreaIds = uniqueKnown(candidate.unlockedAreaIds, areaIds);
    if (!unlockedAreaIds.includes(OCEAN_AREAS[0].id)) unlockedAreaIds.unshift(OCEAN_AREAS[0].id);

    const bosses = createBossState();
    BOSSES.forEach(boss => {
      const savedBoss = candidate.bosses && candidate.bosses[boss.id];
      if (!savedBoss || typeof savedBoss !== "object") return;
      const defeated = savedBoss.defeated === true;
      const savedHp = Number(savedBoss.hp);
      bosses[boss.id] = {
        hp: defeated ? 0 : Number.isFinite(savedHp) && savedHp > 0
          ? Math.min(boss.maxHp, savedHp)
          : boss.maxHp,
        defeated,
        attempts: Math.max(0, Math.floor(Number(savedBoss.attempts) || 0)),
        defeatedAt: defeated && typeof savedBoss.defeatedAt === "string" ? savedBoss.defeatedAt : ""
      };
    });

    const currentAreaId = areaIds.has(candidate.currentAreaId)
      && unlockedAreaIds.includes(candidate.currentAreaId)
      ? candidate.currentAreaId
      : unlockedAreaIds[unlockedAreaIds.length - 1];

    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      currentAreaId,
      unlockedAreaIds,
      clearedNodeIds: uniqueKnown(candidate.clearedNodeIds, nodeIds),
      bosses,
      currency: { shells: Math.max(0, Math.floor(Number(candidate.currency && candidate.currency.shells) || 0)) },
      study: {
        appliedSessionIds: Array.isArray(candidate.study && candidate.study.appliedSessionIds)
          ? [...new Set(candidate.study.appliedSessionIds.filter(value => typeof value === "string"))].slice(-200)
          : []
      },
      collection: {
        ownedIds: Array.isArray(candidate.collection && candidate.collection.ownedIds)
          ? [...new Set(candidate.collection.ownedIds.filter(value => typeof value === "string"))].slice(0, 100)
          : []
      },
      meta: {
        createdAt: candidate.meta && typeof candidate.meta.createdAt === "string"
          ? candidate.meta.createdAt
          : initial.meta.createdAt,
        updatedAt: nowIso(clock)
      }
    };
  }

  function getArea(areaId) {
    const area = AREA_BY_ID.get(areaId);
    return area ? clone(area) : null;
  }

  function getBoss(bossId) {
    const boss = BOSS_BY_ID.get(bossId);
    return boss ? clone(boss) : null;
  }

  function markNodeCleared(saveData, nodeId, clock) {
    const area = OCEAN_AREAS.find(item => item.nodes.includes(nodeId));
    if (!area) throw new Error(`Unknown ocean node: ${nodeId}`);
    const next = migrateSave(saveData, clock);
    if (!next.unlockedAreaIds.includes(area.id)) throw new Error(`Ocean area is locked: ${area.id}`);
    if (!next.clearedNodeIds.includes(nodeId)) next.clearedNodeIds.push(nodeId);
    next.currentAreaId = area.id;
    next.meta.updatedAt = nowIso(clock);
    return next;
  }

  function applyBossDamage(saveData, bossId, damage, clock) {
    const boss = BOSS_BY_ID.get(bossId);
    if (!boss) throw new Error(`Unknown ocean boss: ${bossId}`);
    if (!Number.isFinite(damage) || damage <= 0) throw new Error("Boss damage must be a positive number");

    const next = migrateSave(saveData, clock);
    if (!next.unlockedAreaIds.includes(boss.areaId)) throw new Error(`Ocean area is locked: ${boss.areaId}`);
    const state = next.bosses[bossId];
    if (state.defeated) return next;

    state.attempts += 1;
    state.hp = Math.max(0, state.hp - Math.floor(damage));
    if (state.hp === 0) {
      state.defeated = true;
      state.defeatedAt = nowIso(clock);
      next.currency.shells += boss.reward.shells;
      const areaIndex = OCEAN_AREAS.findIndex(area => area.id === boss.areaId);
      const nextArea = OCEAN_AREAS[areaIndex + 1];
      if (nextArea && !next.unlockedAreaIds.includes(nextArea.id)) next.unlockedAreaIds.push(nextArea.id);
    }
    next.currentAreaId = boss.areaId;
    next.meta.updatedAt = nowIso(clock);
    return next;
  }

  function load(storage, clock) {
    if (!storage || typeof storage.getItem !== "function") return createInitialSave(clock);
    try {
      return migrateSave(JSON.parse(storage.getItem(STORAGE_KEY) || "null"), clock);
    } catch (error) {
      return createInitialSave(clock);
    }
  }

  function save(storage, saveData, clock) {
    if (!storage || typeof storage.setItem !== "function") throw new Error("Ocean storage is unavailable");
    const normalized = migrateSave(saveData, clock);
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  const api = Object.freeze({
    ENGINE_VERSION,
    SAVE_SCHEMA_VERSION,
    STORAGE_KEY,
    areas: OCEAN_AREAS,
    bosses: BOSSES,
    createInitialSave,
    migrateSave,
    getArea,
    getBoss,
    markNodeCleared,
    applyBossDamage,
    load,
    save
  });

  globalObject.OceanEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
