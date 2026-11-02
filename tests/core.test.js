import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  validate,
  totals,
  energy,
  estimate,
  mealSuggestions,
  workoutSuggestion,
  foods,
  today,
} from "../core.js";
const meal = {
  ...foods[0],
  id: "m1",
  grams: 150,
  date: "2026-11-02",
  slot: "昼食",
};
test("daily totals scale grams and isolate dates", () => {
  assert.equal(totals([meal], "2026-11-02").kcal, 195);
  assert.equal(totals([meal], "2026-11-01").kcal, 0);
  assert.equal(totals([meal], "2026-11-02").p, 4.035);
});
test("macro energy uses 4/9/4 and handles empty logs", () => {
  assert.deepEqual(energy({ p: 10, f: 0, c: 10 }), { p: 50, f: 0, c: 50 });
  assert.deepEqual(energy({ p: 0, f: 0, c: 0 }), { p: 0, f: 0, c: 0 });
  assert.equal(energy({ p: 0, f: 10, c: 0 }).f, 100);
});
test("Epley estimate", () => assert.equal(estimate(60, 10), 80));
test("backup validation protects existing records", () => {
  const s = initial();
  assert.ok(validate(s));
  s.meals.push(meal);
  assert.ok(validate(s));
  assert.ok(validate(JSON.parse(JSON.stringify(s))));
  assert.equal(validate({ ...s, version: 2 }), false);
  assert.equal(validate({ ...s, goals: {} }), false);
  for (const patch of [
    { grams: -1 },
    { p: NaN },
    { date: "2026-02-30" },
    { name: "" },
    { date: "bad" },
    { slot: "other" },
  ])
    assert.equal(validate({ ...s, meals: [{ ...meal, ...patch }] }), false);
  assert.equal(validate({ ...s, meals: [meal, meal] }), false);
});
test("workouts reject invalid reps and groups", () => {
  const w = {
    id: "w",
    name: "スクワット",
    date: today(),
    group: "脚",
    weight: 20,
    reps: 10,
    sets: 3,
  };
  assert.ok(validate({ ...initial(), workouts: [w] }));
  assert.equal(
    validate({ ...initial(), workouts: [{ ...w, reps: 1.5 }] }),
    false,
  );
});
test("meal suggestions obey time, budget and meat preference", () => {
  const r = mealSuggestions({ kcal: 0, p: 0, f: 0, c: 0 }, initial().goals, {
    minutes: 5,
    budget: 150,
    vegetarian: true,
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "バナナとゆで卵");
  assert.equal(r[0].nutrition.kcal, 166.5);
  assert.equal(mealSuggestions({}, initial().goals, { minutes: 0 }).length, 0);
});
test("meal rankings respond to remaining goals", () => {
  const a = mealSuggestions({ kcal: 0, p: 0, f: 0, c: 0 }, initial().goals);
  const b = mealSuggestions(initial().goals, initial().goals);
  assert.notEqual(a[0].name, b[0].name);
});
test("pain and fatigue override training; recent groups rest", () => {
  assert.match(workoutSuggestion([], today(), { pain: true }), /休止/);
  assert.match(workoutSuggestion([], today(), { fatigue: "高い" }), /休養/);
  assert.match(
    workoutSuggestion([{ group: "胸", date: "2026-11-01" }], "2026-11-02"),
    /^背中/,
  );
  assert.match(
    workoutSuggestion([{ group: "胸", date: "2026-10-30" }], "2026-11-02"),
    /^胸/,
  );
});

test('today follows the local calendar across UTC midnight', () => {
  const RealDate = globalThis.Date;
  const originalTZ = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tokyo';
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : ['2026-11-01T16:00:00Z'])); }
    };
    assert.equal(today(), '2026-11-02');
    process.env.TZ = 'America/Los_Angeles';
    assert.equal(today(), '2026-11-01');
  } finally {
    globalThis.Date = RealDate;
    if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ;
  }
});
