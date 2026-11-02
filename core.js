export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const initial = () => ({
  version: 1,
  workouts: [],
  meals: [],
  goals: { kcal: 2000, p: 120, f: 60, c: 245 },
});
export const round = (n) => Math.round(n * 10) / 10;
export function totals(meals, date) {
  return meals
    .filter((m) => m.date === date)
    .reduce(
      (a, m) => {
        for (const k of ["kcal", "p", "f", "c"]) a[k] += (m[k] * m.grams) / 100;
        return a;
      },
      { kcal: 0, p: 0, f: 0, c: 0 },
    );
}
export function energy(t) {
  const sum = t.p * 4 + t.f * 9 + t.c * 4;
  return Object.fromEntries(
    ["p", "f", "c"].map((k) => [
      k,
      sum ? ((t[k] * (k === "f" ? 9 : 4)) / sum) * 100 : 0,
    ]),
  );
}
export const estimate = (weight, reps) => weight * (1 + reps / 30);
const validDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  s.slice(0, 4) >= "1900" &&
  new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
const num = (n, max = 100000) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
export function validate(s) {
  try {
    if (
      !s ||
      s.version !== 1 ||
      !Array.isArray(s.workouts) ||
      !Array.isArray(s.meals) ||
      s.workouts.length + s.meals.length > 20000
    )
      return false;
    if (
      !["kcal", "p", "f", "c"].every((k) => num(s.goals?.[k]) && s.goals[k] > 0)
    )
      return false;
    const ids = new Set();
    for (const [items, kind] of [
      [s.workouts, "w"],
      [s.meals, "m"],
    ])
      for (const x of items) {
        if (
          typeof x.id !== "string" ||
          !x.id ||
          ids.has(x.id) ||
          !validDate(x.date) ||
          typeof x.name !== "string" ||
          !x.name.trim() ||
          x.name.length > 120
        )
          return false;
        ids.add(x.id);
        if (
          kind === "w" &&
          (!groups.includes(x.group) ||
            !num(x.weight, 1000) ||
            !Number.isInteger(x.reps) ||
            x.reps < 1 ||
            x.reps > 1000 ||
            !Number.isInteger(x.sets) ||
            x.sets < 1 ||
            x.sets > 100)
        )
          return false;
        if (
          kind === "m" &&
          (!slots.includes(x.slot) ||
            !num(x.grams, 10000) ||
            x.grams <= 0 ||
            !["kcal", "p", "f", "c"].every((k) => num(x[k], 1000)) ||
            typeof x.source !== "string" ||
            x.source.length > 300)
        )
          return false;
      }
    return true;
  } catch {
    return false;
  }
}
export const groups = ["胸", "背中", "脚", "肩", "腕", "体幹"];
export const slots = ["朝食", "昼食", "夕食", "間食"];
// USDA FoodData Central, SR Legacy values per 100 g. Limited seed, not brand-specific.
export const foods = [
  {
    name: "白米（長粒種・炊飯後）",
    kcal: 130,
    p: 2.69,
    f: 0.28,
    c: 28.17,
    source: "USDA SR Legacy NDB 20045",
  },
  {
    name: "鶏むね肉（皮なし・ロースト後）",
    kcal: 165,
    p: 31.02,
    f: 3.57,
    c: 0,
    source: "USDA SR Legacy NDB 05064",
  },
  {
    name: "卵（全卵・ゆで）",
    kcal: 155,
    p: 12.58,
    f: 10.61,
    c: 1.12,
    source: "USDA SR Legacy NDB 01129",
  },
  {
    name: "バナナ（生・可食部）",
    kcal: 89,
    p: 1.09,
    f: 0.33,
    c: 22.84,
    source: "USDA SR Legacy NDB 09040",
  },
  {
    name: "ブロッコリー（生）",
    kcal: 34,
    p: 2.82,
    f: 0.37,
    c: 6.64,
    source: "USDA SR Legacy NDB 11090",
  },
];
export function mealSuggestions(
  t,
  g,
  { vegetarian = false, minutes = 30, budget = 600 } = {},
) {
  const recipes = [
    {
      name: "鶏むねとご飯のプレート",
      parts: [
        [0, 150],
        [1, 100],
        [4, 100],
      ],
      minutes: 20,
      budget: 400,
      vegetarian: false,
    },
    {
      name: "卵とご飯のボウル",
      parts: [
        [0, 150],
        [2, 100],
        [4, 50],
      ],
      minutes: 10,
      budget: 250,
      vegetarian: true,
    },
    {
      name: "バナナとゆで卵",
      parts: [
        [3, 100],
        [2, 50],
      ],
      minutes: 5,
      budget: 150,
      vegetarian: true,
    },
  ];
  return recipes
    .filter(
      (r) =>
        (!vegetarian || r.vegetarian) &&
        r.minutes <= minutes &&
        r.budget <= budget,
    )
    .map((r) => {
      const nutrition = totals(
        r.parts.map(([i, grams]) => ({ ...foods[i], grams, date: "x" })),
        "x",
      );
      const score = ["kcal", "p", "f", "c"].reduce(
        (s, k) => s + Math.abs(Math.max(0, g[k] - t[k]) - nutrition[k]) / g[k],
        0,
      );
      return { ...r, nutrition, score };
    })
    .sort((a, b) => a.score - b.score);
}
export function workoutSuggestion(
  workouts,
  date,
  {
    pain = false,
    fatigue = "普通",
    goal = "筋肥大",
    experience = "初心者",
    equipment = "自重",
  } = {},
) {
  if (pain)
    return "痛み・体調不良があるため運動は休止。症状が続く場合は医療専門家に相談してください。";
  if (fatigue === "高い")
    return "疲労が高いため休養、または無理のない軽い散歩を候補にしてください。";
  const recent = workouts.filter((w) => {
    const days =
      (new Date(`${date}T12:00:00Z`) - new Date(`${w.date}T12:00:00Z`)) /
      86400000;
    return days >= 0 && days < 2;
  });
  const available = groups.filter((g) => !recent.some((w) => w.group === g));
  if (!available.length)
    return "直近2日で全ての部位を記録しています。今日は休養を候補にしてください。";
  const group = available[0];
  const exercises = {
    胸: equipment === "ジム" ? "チェストプレス" : "壁・膝つきプッシュアップ",
    背中: equipment === "ジム" ? "ラットプルダウン" : "うつ伏せYレイズ",
    脚: "スクワット",
    肩: equipment === "ジム" ? "ショルダープレス" : "ウォールスライド",
    腕:
      equipment === "ジム"
        ? "ケーブルカール"
        : "軽い自重トライセプスエクステンション",
    体幹: "デッドバグ",
  };
  return `${group}：${exercises[group]}。${experience === "初心者" ? "1〜2" : "2〜3"}セット × ${goal === "健康維持" ? "10〜15" : goal === "筋力向上" && equipment === "ジム" ? "5〜8" : "8〜12"}回を目安に、余力を残す負荷で。直近2日の同部位記録を避けた候補です。フォームを優先し、痛みが出たら中止してください。`;
}
