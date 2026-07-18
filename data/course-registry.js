"use strict";

/*
 * 級別コースの共通レジストリです。
 * 8級・7級を追加するときは、このファイルを変更せず、各級のデータファイルから
 * KankenCourseRegistry.register(courseData) を呼び出します。
 */
(function createCourseRegistry(global) {
  const courses = new Map();

  function register(course) {
    if (!course || typeof course !== "object") throw new Error("コースデータが不正です");
    if (!/^k\d+$/.test(course.id || "")) throw new Error("コースIDは k9 の形式で指定してください");
    if (!Array.isArray(course.curriculum) || !course.curriculum.length) {
      throw new Error(`${course.id}: カリキュラムがありません`);
    }
    if (!course.curriculum.every(characters => Array.isArray(characters) && characters.length === 5)) {
      throw new Error(`${course.id}: 各Dayの対象漢字は5字にしてください`);
    }
    if (!course.readings || !course.examples || !course.questionData) {
      throw new Error(`${course.id}: 必須の問題データがありません`);
    }
    const requiredFormats = ["reading", "writing", "usage", "pair", "family"];
    if (!course.formats || !requiredFormats.every(format => course.formats[format])) {
      throw new Error(`${course.id}: 5形式の定義がそろっていません`);
    }
    if (!course.storageKey) throw new Error(`${course.id}: 保存キーがありません`);
    ["usageByDay", "pairByDay", "familyByDay"].forEach(key => {
      const dailyData = course.questionData[key];
      if (!Array.isArray(dailyData) || dailyData.length !== course.curriculum.length) {
        throw new Error(`${course.id}: ${key}の日数がカリキュラムと一致しません`);
      }
      if (!dailyData.every(items => Array.isArray(items) && items.length >= 2)) {
        throw new Error(`${course.id}: ${key}は各Dayに2問以上必要です`);
      }
    });
    if (courses.has(course.id)) throw new Error(`${course.id}: コースIDが重複しています`);
    courses.set(course.id, course);
    return course;
  }

  function get(courseId) {
    return courses.get(courseId) || null;
  }

  function list() {
    return Array.from(courses.values());
  }

  global.KankenCourseRegistry = Object.freeze({ register, get, list });
})(window);
