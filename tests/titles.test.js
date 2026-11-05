import { test } from "node:test";
import assert from "node:assert/strict";
import { collectTitles, featuredTitle } from "../titles.js";
import { initial, validate } from "../core.js";
const date = "2026-11-05";
const w = (
  id,
  day = "2026-11-01",
  group = "胸",
  weight = 0,
  name = "プッシュアップ",
) => ({ id, date: day, group, weight, name, reps: 10, sets: 3 });
test("115 unique titles have names, thresholds and transparent conditions", () => {
  const ts = collectTitles(initial(), date);
  assert.equal(ts.length, 115);
  assert.equal(new Set(ts.map((t) => t.id)).size, 115);
  assert.equal(new Set(ts.map((t) => t.name)).size, 115);
  assert.ok(
    ts.every((t) => t.name && t.condition && t.target > 0 && !t.unlocked),
  );
});
test("same day is counted once; self weight, groups, meals and both are independent", () => {
  const s = {
    ...initial(),
    workouts: [
      w("a"),
      w("b", "2026-11-01", "背中", 20, "ロウ"),
      w("future", "2027-01-01"),
    ],
    meals: [{ date: "2026-11-01" }],
  };
  const ts = collectTitles(s, date);
  for (const id of [
    "days-1",
    "group-胸-1",
    "group-背中-1",
    "bodyweight-1",
    "meals-1",
    "both-1",
    "variety-2",
  ])
    assert.ok(ts.find((t) => t.id === id).unlocked, id);
  assert.equal(ts.find((t) => t.id === "days-2").unlocked, false);
});
test("selected earned title persists through JSON; unearned or removed title falls back", () => {
  const s = {
    ...initial(),
    workouts: [w("a")],
    selectedTitle: "bodyweight-1",
    exportCount: 1,
  };
  assert.ok(validate(s));
  assert.equal(
    featuredTitle(JSON.parse(JSON.stringify(s)), date).name,
    "自分が相棒",
  );
  assert.equal(
    featuredTitle({ ...s, selectedTitle: "days-1000" }, date).name,
    "はじめの一歩",
  );
  assert.equal(
    featuredTitle({ ...s, workouts: [], exportCount: 0 }, date),
    null,
  );
  assert.equal(validate({ ...s, exportCount: -1 }), false);
  assert.equal(validate({ ...s, selectedTitle: 3 }), false);
  assert.ok(validate(initial()));
});
test("return badge uses calendar-day gap and backup uses actual export counter", () => {
  const s = {
    ...initial(),
    workouts: [
      w("a", "2026-10-01"),
      w("b", "2026-10-08"),
      w("c", "2026-10-09"),
    ],
    exportCount: 3,
  };
  const ts = collectTitles(s, date);
  assert.equal(ts.find((t) => t.id === "returns-1").value, 1);
  assert.ok(ts.find((t) => t.id === "export-3").unlocked);
  assert.equal(ts.find((t) => t.id === "export-10").unlocked, false);
});
test("names are normalized for variety and threshold boundaries unlock correctly", () => {
  const s = {
    ...initial(),
    workouts: [
      w("a", "2026-11-01", "胸", 0, "ＡＢＣ"),
      w("b", "2026-11-02", "胸", 0, " abc "),
      w("c", "2026-11-03"),
    ],
  };
  const ts = collectTitles(s, date);
  assert.equal(ts.find((t) => t.id === "variety-2").value, 2);
  assert.ok(ts.find((t) => t.id === "days-3").unlocked);
  assert.equal(ts.find((t) => t.id === "days-5").unlocked, false);
});
