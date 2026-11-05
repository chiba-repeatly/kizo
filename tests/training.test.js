import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  validate,
  trainingAdventure,
  workoutSuggestion,
} from "../core.js";
import { collectTitles } from "../titles.js";
import {
  migrateState,
  completedRows,
  previousWorkout,
  draftSets,
  applyTemplate,
  exerciseHistory,
  defaultTimer,
  changeTimer,
  remainingTime,
} from "../training-model.js";
const legacy = () => ({
  ...initial(),
  selectedTitle: "days-1",
  exportCount: 3,
  workouts: [
    {
      id: "w",
      date: "2026-11-01",
      name: "ベンチプレス",
      group: "胸",
      weight: 60,
      reps: 10,
      sets: 3,
    },
  ],
});
test("lossless migration preserves old records, nutrition, title and volume without mutating input", () => {
  const old = legacy(),
    raw = JSON.stringify(old),
    s = migrateState(old);
  assert.equal(JSON.stringify(old), raw);
  assert.ok(validate(s));
  assert.equal(s.version, 2);
  assert.equal(s.workouts[0].sets.length, 3);
  assert.equal(trainingAdventure(s.workouts, "2026-11-01").volume, 1800);
  assert.equal(
    collectTitles(s, "2026-11-01").find((t) => t.id === "days-1").value,
    1,
  );
  assert.equal(s.selectedTitle, "days-1");
  assert.equal(s.exportCount, 3);
  assert.deepEqual(migrateState(s), s);
  assert.deepEqual(migrateState(JSON.parse(raw)), s);
});
test("drafts never contribute to history, volume, titles or training advice", () => {
  const s = migrateState(legacy());
  s.workouts[0].sets = s.workouts[0].sets.map((x) => ({
    ...x,
    completed: false,
  }));
  assert.ok(validate(s));
  assert.equal(completedRows(s.workouts).length, 0);
  assert.equal(trainingAdventure(s.workouts, "2026-11-01").days, 0);
  assert.equal(
    exerciseHistory(s.workouts, "ベンチプレス", "2026-11-02").length,
    0,
  );
  assert.ok(
    !collectTitles(s, "2026-11-01").find((t) => t.id === "days-1").unlocked,
  );
  assert.match(workoutSuggestion(s.workouts, "2026-11-01"), /^胸/);
});
test("previous matches normalized names, strictly earlier latest date and only completed sets", () => {
  const s = migrateState(legacy());
  s.workouts.push({ ...s.workouts[0], id: "future", date: "2026-11-03" });
  s.workouts[0].sets[1].completed = false;
  assert.equal(previousWorkout(s.workouts, "ベンチプレス", "2026-11-01"), null);
  const p = previousWorkout(s.workouts, " ベンチプレス ", "2026-11-02");
  assert.equal(p.date, "2026-11-01");
  assert.equal(p.sets.length, 2);
  let i = 0;
  const drafts = draftSets(p.sets, () => String(i++));
  assert.ok(drafts.every((x) => !x.completed));
  assert.equal(drafts[0].weight, 60);
});
test("set edits and deletes recompute volume and same-weight best reps; bodyweight has no 1RM", () => {
  const s = migrateState(legacy());
  s.workouts[0].sets[1].reps = 8;
  s.workouts[0].sets[2].weight = 55;
  let h = exerciseHistory(s.workouts, "ベンチプレス", "2026-11-02")[0];
  assert.equal(h.volume, 1630);
  s.workouts[0].sets.splice(0, 1);
  h = exerciseHistory(s.workouts, "ベンチプレス", "2026-11-02")[0];
  assert.equal(h.volume, 1030);
  s.workouts[0].sets.forEach((x) => (x.weight = 0));
  assert.equal(
    exerciseHistory(s.workouts, "ベンチプレス", "2026-11-02")[0].estimated1RM,
    0,
  );
});
test("templates are drafts and duplicate application cannot add records", () => {
  const s = migrateState(initial()),
    t = {
      id: "t",
      name: "胸の日",
      exercises: [
        {
          id: "e",
          name: "ベンチプレス",
          group: "胸",
          sets: [{ id: "s", weight: 60, reps: 10, completed: false }],
        },
      ],
    };
  s.templates = [t];
  assert.ok(validate(s));
  let i = 0;
  const applied = applyTemplate(s, t, "2026-11-02", () => String(i++));
  assert.ok(validate(applied));
  assert.equal(completedRows(applied.workouts).length, 0);
  assert.throws(() => applyTemplate(applied, t, "2026-11-02"));
  assert.equal(s.workouts.length, 0);
});
test("v2 validation rejects duplicate set IDs, invalid completion, templates, timer and preserves legacy checks", () => {
  const s = migrateState(legacy());
  assert.equal(validate({ ...s, timer: { ...s.timer, deadline: 1 } }), false);
  s.workouts[0].sets[1].id = s.workouts[0].sets[0].id;
  assert.equal(validate(s), false);
  const x = migrateState(legacy());
  x.workouts[0].sets[0].completed = "true";
  assert.equal(validate(x), false);
  assert.ok(validate(legacy()));
});
test("timer uses absolute deadlines, pauses/resumes accurately and finishes after background sleep", () => {
  let t = changeTimer(defaultTimer(), "start", 1000);
  assert.equal(remainingTime(t, 31000), 60000);
  t = changeTimer(t, "pause", 31000);
  assert.equal(remainingTime(t, 80000), 60000);
  t = changeTimer(t, "resume", 100000);
  assert.equal(t.deadline, 160000);
  t = changeTimer(t, "tick", 200000);
  assert.equal(t.status, "finished");
  assert.equal(t.remaining, 0);
  t = changeTimer(t, "reset", 200000);
  assert.equal(t.status, "idle");
  assert.equal(t.remaining, 90000);
});
