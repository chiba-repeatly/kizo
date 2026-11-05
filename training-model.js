export const normalizeExercise = (name) =>
  name.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
export const defaultTimer = () => ({
  duration: 90,
  remaining: 90000,
  deadline: null,
  status: "idle",
  autoStart: false,
  sound: false,
});
export const completedRows = (workouts) =>
  workouts.flatMap((w) =>
    Array.isArray(w.sets)
      ? w.sets
          .filter((s) => s.completed)
          .map((s) => ({
            id: JSON.stringify([w.id, s.id]),
            date: w.date,
            name: w.name,
            group: w.group,
            weight: s.weight,
            reps: s.reps,
            sets: 1,
          }))
      : [w],
  );
export function migrateState(state) {
  if (state.version === 2) return structuredClone(state);
  if (state.version !== 1) throw Error("Unsupported version");
  return {
    ...structuredClone(state),
    version: 2,
    workouts: state.workouts.map((w) => ({
      id: w.id,
      date: w.date,
      name: w.name,
      group: w.group,
      sets: Array.from({ length: w.sets }, (_, i) => ({
        id: `legacy-${i}`,
        weight: w.weight,
        reps: w.reps,
        completed: true,
      })),
    })),
    templates: [],
    timer: defaultTimer(),
  };
}
const groups = ["胸", "背中", "脚", "肩", "腕", "体幹"];
const text = (x, max = 120) =>
  typeof x === "string" && x.trim().length > 0 && x.length <= max;
const validDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  s.slice(0, 4) >= "1900" &&
  new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
export function validSet(s) {
  return (
    s &&
    text(s.id, 150) &&
    Number.isFinite(s.weight) &&
    s.weight >= 0 &&
    s.weight <= 1000 &&
    Number.isInteger(s.reps) &&
    s.reps >= 1 &&
    s.reps <= 1000 &&
    typeof s.completed === "boolean"
  );
}
export function validTrainingState(s) {
  try {
    if (
      !Array.isArray(s.workouts) ||
      s.workouts.length > 20000 ||
      !Array.isArray(s.templates) ||
      s.templates.length > 100
    )
      return false;
    const ids = new Set();
    for (const w of s.workouts) {
      if (
        !(typeof w.id === "string" && w.id.length > 0) ||
        ids.has(w.id) ||
        !text(w.name) ||
        !groups.includes(w.group) ||
        !validDate(w.date) ||
        !Array.isArray(w.sets) ||
        !w.sets.length ||
        w.sets.length > 100
      )
        return false;
      ids.add(w.id);
      const setIds = new Set();
      for (const set of w.sets) {
        if (!validSet(set) || setIds.has(set.id)) return false;
        setIds.add(set.id);
      }
    }
    for (const m of s.meals || []) if (ids.has(m.id)) return false;
    const templateIds = new Set();
    for (const t of s.templates) {
      if (
        !text(t.id, 150) ||
        templateIds.has(t.id) ||
        !text(t.name) ||
        !Array.isArray(t.exercises) ||
        !t.exercises.length ||
        t.exercises.length > 50
      )
        return false;
      templateIds.add(t.id);
      const names = new Set(),
        exerciseIds = new Set();
      for (const x of t.exercises) {
        const n = normalizeExercise(x.name);
        if (
          !text(x.id, 150) ||
          exerciseIds.has(x.id) ||
          !text(x.name) ||
          !groups.includes(x.group) ||
          names.has(n) ||
          !Array.isArray(x.sets) ||
          !x.sets.length ||
          x.sets.length > 100
        )
          return false;
        names.add(n);
        exerciseIds.add(x.id);
        const setIds = new Set();
        for (const set of x.sets) {
          if (!validSet(set) || set.completed || setIds.has(set.id))
            return false;
          setIds.add(set.id);
        }
      }
    }
    const t = s.timer;
    return (
      !!t &&
      Number.isInteger(t.duration) &&
      t.duration >= 1 &&
      t.duration <= 3600 &&
      Number.isFinite(t.remaining) &&
      t.remaining >= 0 &&
      t.remaining <= 3600000 &&
      ["idle", "running", "paused", "finished"].includes(t.status) &&
      typeof t.autoStart === "boolean" &&
      typeof t.sound === "boolean" &&
      (t.status === "running"
        ? Number.isSafeInteger(t.deadline) && t.deadline > 0
        : t.deadline === null)
    );
  } catch {
    return false;
  }
}
export function previousWorkout(workouts, name, date) {
  const n = normalizeExercise(name);
  const candidates = workouts.filter(
    (w) =>
      normalizeExercise(w.name) === n &&
      w.date < date &&
      w.sets.some((s) => s.completed),
  );
  if (!candidates.length) return null;
  const previousDate = candidates
    .map((w) => w.date)
    .sort()
    .at(-1);
  const entries = candidates.filter((w) => w.date === previousDate);
  return {
    date: previousDate,
    name: entries[0].name,
    sets: entries.flatMap((w) => w.sets.filter((s) => s.completed)),
  };
}
export function draftSets(sets, id = () => crypto.randomUUID()) {
  return sets.map((s) => ({
    id: id(),
    weight: s.weight,
    reps: s.reps,
    completed: false,
  }));
}
export function applyTemplate(
  state,
  template,
  date,
  id = () => crypto.randomUUID(),
) {
  const names = new Set(
    template.exercises.map((x) => normalizeExercise(x.name)),
  );
  if (
    state.workouts.some(
      (w) => w.date === date && names.has(normalizeExercise(w.name)),
    )
  )
    throw Error(
      "同じ名前の種目が当日にあります。重複追加を防ぐため、今日の種目を確認してください。",
    );
  return {
    ...state,
    workouts: [
      ...state.workouts,
      ...template.exercises.map((x) => ({
        id: id(),
        date,
        name: x.name,
        group: x.group,
        sets: draftSets(x.sets, id),
      })),
    ],
  };
}
export function exerciseHistory(workouts, name, date) {
  const n = normalizeExercise(name),
    rows = workouts.filter(
      (w) => w.date <= date && normalizeExercise(w.name) === n,
    );
  const dates = [...new Set(rows.map((w) => w.date))].sort();
  return dates
    .map((date) => {
      const sets = rows
        .filter((w) => w.date === date)
        .flatMap((w) => w.sets.filter((s) => s.completed));
      if (!sets.length) return null;
      return {
        date,
        sets,
        volume: sets.reduce((v, s) => v + s.weight * s.reps, 0),
        reps: sets.reduce((v, s) => v + s.reps, 0),
        maxWeight: Math.max(...sets.map((s) => s.weight)),
        estimated1RM: Math.max(
          ...sets
            .filter((s) => s.weight > 0 && s.reps <= 12)
            .map((s) => s.weight * (1 + s.reps / 30)),
          0,
        ),
      };
    })
    .filter(Boolean);
}
export const remainingTime = (timer, now = Date.now()) =>
  timer.status === "running"
    ? Math.max(0, timer.deadline - now)
    : timer.remaining;
export function changeTimer(timer, action, now = Date.now()) {
  const remaining = remainingTime(timer, now);
  if (action === "start")
    return {
      ...timer,
      status: "running",
      remaining: timer.duration * 1000,
      deadline: now + timer.duration * 1000,
    };
  if (action === "pause")
    return timer.status === "running"
      ? {
          ...timer,
          status: remaining ? "paused" : "finished",
          remaining,
          deadline: null,
        }
      : timer;
  if (action === "resume")
    return timer.status === "paused" && remaining > 0
      ? { ...timer, status: "running", deadline: now + remaining }
      : timer;
  if (action === "reset")
    return {
      ...timer,
      status: "idle",
      remaining: timer.duration * 1000,
      deadline: null,
    };
  if (action === "tick" && timer.status === "running" && remaining === 0)
    return { ...timer, status: "finished", remaining: 0, deadline: null };
  return timer;
}
