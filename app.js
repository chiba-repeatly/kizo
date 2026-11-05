import { collectTitles, featuredTitle, titleCategories } from "./titles.js";
import {
  today,
  initial,
  round,
  totals,
  energy,
  estimate,
  validate,
  groups,
  slots,
  foods,
  mealSuggestions,
  workoutSuggestion,
  weightComparison,
  trainingAdventure,
} from "./core.js";
const $ = (s) => document.querySelector(s),
  key = "kizo.v1";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const notify = (s) => {
  $("#notice").textContent = s;
};
let state = initial(),
  editingWorkout = null,
  editingMeal = null,
  storageBlocked = false;
try {
  const saved = localStorage.getItem(key);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!validate(parsed)) throw Error();
    state = parsed;
  }
} catch {
  storageBlocked = true;
  notify(
    "保存データを読み込めません。元データを保護するため保存を停止しています。バックアップを確認し、JSONを読み込むか全データを削除してください。",
  );
}
function save(next) {
  try {
    localStorage.setItem(key, JSON.stringify(next));
    state = next;
    return true;
  } catch {
    notify(
      "保存できませんでした。ブラウザの保存権限・空き容量を確認してください。変更は反映していません。",
    );
    return false;
  }
}
function commit(next) {
  if (storageBlocked) {
    notify("保存停止中です。JSON読込または全データ削除で復旧してください。");
    return false;
  }
  return save(next);
}
$("#date").value = today();
const options = (a) => a.map((x) => `<option>${escape(x)}</option>`).join("");
$("#workout-form [name=group]").innerHTML = options(groups);
$("#meal-form [name=slot]").innerHTML = options(slots);
const values = (f) => Object.fromEntries(new FormData(f));
const fill = (f, data) => {
  for (const [k, v] of Object.entries(data))
    if (f.elements.namedItem(k)) f.elements.namedItem(k).value = v;
};
const nutrition = (t) =>
  `${round(t.kcal)} kcal · P ${round(t.p)} / F ${round(t.f)} / C ${round(t.c)} g`;
function render() {
  const date = $("#date").value,
    t = totals(state.meals, date),
    g = state.goals;
  $("#metrics").innerHTML = Object.entries({
    kcal: "エネルギー",
    p: "たんぱく質",
    f: "脂質",
    c: "炭水化物",
  })
    .map(
      ([k, label]) =>
        `<article class="metric metric-${k}"><span class="metric-label"><i aria-hidden="true">${k === "kcal" ? "◎" : k.toUpperCase()}</i>${label}</span><strong>${round(t[k])}<small> ${k === "kcal" ? "kcal" : "g"}</small></strong><progress aria-label="${label}の目標達成" max="${g[k]}" value="${Math.min(t[k], g[k])}"></progress><p>目標 ${g[k]} · ${t[k] > g[k] ? "超過" : "残り"} ${round(Math.abs(g[k] - t[k]))}</p></article>`,
    )
    .join("");
  const adventure = trainingAdventure(state.workouts, date);
  const comparison = adventure.comparison;
  const featured = featuredTitle(state, date);
  const ratioText = (c) => `${c.name} 約${c.count}${c.unit}分`;
  $("#adventure").innerHTML =
    `<div class="volume-story"><span class="story-emoji" aria-hidden="true">${comparison?.emoji || "🌱"}</span><div><p class="story-caption">この日の記録上の総重量 · ${round(adventure.volume).toLocaleString("ja-JP")} kg</p><p class="story-title">${comparison ? ratioText(comparison) : "小さな一歩も、立派な記録。"}</p><p class="story-note">${comparison ? `目安：${comparison.name} ${comparison.kg.toLocaleString("ja-JP")}kg。積み重ねると、こんな重さに。` : "自重トレーニングも記録日数にカウント。"}</p></div></div><div class="level-story"><p class="story-caption">いまの称号 · トレーニング記録 ${adventure.days}日</p><p class="story-title"><span aria-hidden="true">${featured?.emoji || adventure.level.emoji}</span> ${escape(featured?.name || adventure.level.name)}</p><progress max="100" value="${adventure.progress}" aria-label="次の称号への進捗"></progress><p class="story-note">${adventure.next ? `基本の継続レベル：次は「${adventure.next.name}」。あと${adventure.next.days - adventure.days}日分の記録。` : "基本の継続レベルを達成！図鑑には、さらに先の称号も。"}</p></div>`;
  renderTitleCollection();
  const ratios = energy(t);
  const hasEnergy = t.p * 4 + t.f * 9 + t.c * 4 > 0;
  $("#energy").innerHTML =
    `<div class="balance-ring" aria-hidden="true" style="background:${hasEnergy ? `conic-gradient(#b7d6a7 0% ${ratios.p}%, #e1bc8a ${ratios.p}% ${ratios.p + ratios.f}%, #a5bbc8 ${ratios.p + ratios.f}% 100%)` : "#38443d"}"><span><b>PFC</b><small>${hasEnergy ? "記録のバランス" : "記録から、はじめよう"}</small></span></div><div class="balance-legend">${Object.entries(
      ratios,
    )
      .map(
        ([k, v]) =>
          `<p><span class="macro-dot dot-${k}" aria-hidden="true"></span>${{ p: "たんぱく質", f: "脂質", c: "炭水化物" }[k]} <strong>${round(v)}%</strong></p>`,
      )
      .join("")}</div>`;
  const latest = [...state.workouts]
    .filter((w) => w.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  $("#latest").innerHTML = latest
    ? `<p>${escape(latest.date)} · ${escape(latest.group)}</p><h3>${escape(latest.name)}</h3><p>${latest.weight} kg × ${latest.reps}回 × ${latest.sets}セット</p>`
    : '<p class="muted">この日以前の記録はありません。最初のトレーニングを記録しましょう。</p>';
  $("#workout-list").innerHTML =
    state.workouts
      .filter((w) => w.date === date)
      .map(
        (w) =>
          `<div class="row"><strong>${escape(w.name)} · ${escape(w.group)}</strong>${w.weight} kg × ${w.reps}回 × ${w.sets}セット <p class="weight-fun">${weightComparison(w.weight) ? `${weightComparison(w.weight).emoji} 1回の入力重量は ${ratioText(weightComparison(w.weight))}（目安）` : "🌱 自重トレーニング。自分の体で、コツコツ。"}</p><div>${buttons("workout", w.id)}</div></div>`,
      )
      .join("") ||
    '<p class="muted">この日のトレーニングはまだありません。</p>';
  $("#meal-list").innerHTML =
    state.meals
      .filter((m) => m.date === date)
      .map(
        (m) =>
          `<div class="row"><strong>${escape(m.slot)} · ${escape(m.name)} ${m.grams} g</strong><p>${nutrition(totals([m], date))}</p><small>出典：${escape(m.source)}</small><div>${buttons("meal", m.id)}</div></div>`,
      )
      .join("") || '<p class="muted">この日の食事はまだありません。</p>';
  const prev = $("#history-exercise").value;
  $("#history-exercise").innerHTML = options([
    ...new Set(state.workouts.map((w) => w.name)),
  ]);
  if ([...$("#history-exercise").options].some((o) => o.value === prev))
    $("#history-exercise").value = prev;
  renderHistory();
  renderCalendar();
  renderSuggestions();
  fill($("#goal-form"), g);
}
function renderTitleCollection() {
  const all = collectTitles(state, $("#date").value),
    selected = featuredTitle(state, $("#date").value);
  const category = $("#title-category").value,
    mode = $("#title-status").value;
  const filtered = all.filter(
    (t) =>
      (!category || t.category === category) &&
      (mode !== "earned" || t.unlocked) &&
      (mode !== "locked" || !t.unlocked),
  );
  $("#title-count").textContent =
    `${all.filter((t) => t.unlocked).length} / ${all.length} 獲得`;
  $("#title-grid").innerHTML =
    filtered
      .map(
        (t) =>
          `<article class="title-tile ${t.unlocked ? "earned" : "locked"}"><div class="title-tile-top"><span aria-hidden="true">${t.emoji}</span><small>${t.category} · ${t.unlocked ? "獲得済み" : "未獲得"}</small></div><h4>${escape(t.name)}</h4><p>${escape(t.condition)}</p><div class="title-progress"><progress aria-label="${escape(t.name)}の獲得進捗" max="${t.target}" value="${Math.min(t.value, t.target)}"></progress><small>${t.unlocked ? "達成" : `${t.value} / ${t.target}`}</small></div><button type="button" class="secondary" data-title="${t.id}" ${!t.unlocked || selected?.id === t.id ? "disabled" : ""}>${selected?.id === t.id ? "表示中" : t.unlocked ? "この称号を飾る" : "まだ未獲得"}</button></article>`,
      )
      .join("") || '<p class="muted">この条件の称号はありません。</p>';
}
$("#title-category").innerHTML =
  '<option value="">すべてのジャンル</option>' +
  titleCategories.map((c) => `<option>${c}</option>`).join("");
$("#title-category").onchange = renderTitleCollection;
$("#title-status").onchange = renderTitleCollection;
$("#title-grid").addEventListener("click", (e) => {
  const button = e.target.closest("[data-title]");
  if (!button) return;
  const title = collectTitles(state, $("#date").value).find(
    (t) => t.id === button.dataset.title,
  );
  if (title?.unlocked && commit({ ...state, selectedTitle: title.id })) {
    render();
    notify(`「${title.name}」を飾りました。`);
  }
});
function buttons(kind, id) {
  return `<button type="button" class="secondary" data-action="edit-${kind}" data-id="${escape(id)}">編集</button><button type="button" class="secondary" data-action="delete-${kind}" data-id="${escape(id)}">削除</button>`;
}
function renderHistory() {
  const rows = state.workouts
    .filter((w) => w.name === $("#history-exercise").value)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) {
    $("#history").innerHTML =
      '<p class="muted">記録すると自己ベストと推移が表示されます。</p>';
    return;
  }
  const max = Math.max(...rows.map((w) => w.weight)),
    pr = Math.max(...rows.map((w) => estimate(w.weight, w.reps)));
  const pts = rows
    .map(
      (w, i) =>
        `${20 + (rows.length === 1 ? 0 : (i / (rows.length - 1)) * 360)},${110 - (max ? (w.weight / max) * 90 : 0)}`,
    )
    .join(" ");
  $("#history").innerHTML =
    `<p>最高重量 ${max} kg · 推定1RM ${round(pr)} kg</p><p class="muted">Epley式：重量 × (1 + 回数 ÷ 30)。自重の推定値は0。高回数では誤差が大きく、実際の最大挙上を保証しません。</p><svg viewBox="0 0 400 130" role="img" aria-label="重量の推移。詳細は以下の履歴"><polyline fill="none" stroke="#9cf4be" stroke-width="3" points="${pts}"/>${rows.map((w, i) => `<circle cx="${20 + (rows.length === 1 ? 0 : (i / (rows.length - 1)) * 360)}" cy="${110 - (max ? (w.weight / max) * 90 : 0)}" r="4" fill="#9cf4be"/>`).join("")}</svg><p class="muted">左から記録日順 / 縦軸：重量 0〜${max} kg</p>${rows
      .slice()
      .reverse()
      .map(
        (w) =>
          `<div class="row">${escape(w.date)} · ${w.weight} kg × ${w.reps}回 × ${w.sets}セット</div>`,
      )
      .join("")}`;
}
function renderCalendar() {
  const date = $("#date").value,
    [y, m] = date.split("-").map(Number);
  const count = new Date(y, m, 0).getDate(),
    offset = new Date(y, m - 1, 1).getDay();
  $("#calendar").innerHTML =
    `<p>${y}年${m}月 · ミント色は記録あり</p><div class="calendar">${["日", "月", "火", "水", "木", "金", "土"].map((d) => `<small>${d}</small>`).join("")}${"<span></span>".repeat(offset)}${Array.from(
      { length: count },
      (_, i) => {
        const day = `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        const logged = state.workouts.some((w) => w.date === day);
        return `<button type="button" data-day="${day}" aria-label="${day}${logged ? " 記録あり" : ""}" class="${logged ? "logged " : ""}${day === date ? "selected" : ""}">${i + 1}</button>`;
      },
    ).join("")}</div>`;
}
function renderSuggestions() {
  const mf = $("#meal-options"),
    opts = values(mf);
  opts.vegetarian = mf.elements.vegetarian.checked;
  const recipes = mealSuggestions(
    totals(state.meals, $("#date").value),
    state.goals,
    opts,
  );
  $("#meal-suggestions").innerHTML =
    recipes
      .map(
        (r) =>
          `<div class="row"><strong>${r.name}</strong><p>${r.parts.map(([i, g]) => `${foods[i].name} ${g}g`).join("、")}</p><p>概算 ${nutrition(r.nutrition)}</p><small>${r.minutes}分・参考予算 ${r.budget}円（地域・価格で変動）</small></div>`,
      )
      .join("") ||
    "<p>条件に合う候補がありません。時間・予算を広げてください。</p>";
  $("#meal-suggestions").innerHTML +=
    '<p class="muted">残り目標（超過時は0）と候補の差を目標値で割り、P/F/C・kcalの合計差が小さい順です。栄養値は上記カタログから計算。加熱・調味料の差は含みません。目標達成後も表示する参考候補で、追加摂取の推奨ではありません。</p>';
  const tf = $("#training-options"),
    to = values(tf);
  to.pain = tf.elements.pain.checked;
  $("#training-suggestion").textContent = workoutSuggestion(
    state.workouts,
    $("#date").value,
    to,
  );
}
function clearEdit(kind) {
  const f = $(`#${kind}-form`);
  f.reset();
  if (kind === "workout") editingWorkout = null;
  else editingMeal = null;
  $(`#cancel-${kind}`).hidden = true;
  $(`#${kind === "workout" ? "workout" : "meal"}-title`).textContent =
    kind === "workout" ? "トレーニングを記録" : "食事を記録 / 手入力";
}
$("#workout-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = values(e.target);
  const record = {
    ...d,
    id: editingWorkout || crypto.randomUUID(),
    date: $("#date").value,
    weight: +d.weight,
    reps: +d.reps,
    sets: +d.sets,
  };
  const next = {
    ...state,
    workouts: [...state.workouts.filter((w) => w.id !== record.id), record],
  };
  if (!validate(next)) {
    notify("トレーニングの入力値を確認してください。");
    return;
  }
  if (commit(next)) {
    clearEdit("workout");
    render();
    notify("トレーニングを保存しました。");
  }
});
$("#meal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = values(e.target);
  const record = {
    ...d,
    id: editingMeal || crypto.randomUUID(),
    date: $("#date").value,
  };
  for (const k of ["grams", "kcal", "p", "f", "c"]) record[k] = +record[k];
  const next = {
    ...state,
    meals: [...state.meals.filter((m) => m.id !== record.id), record],
  };
  if (!validate(next)) {
    notify("食事の入力値を確認してください。");
    return;
  }
  if (commit(next)) {
    clearEdit("meal");
    render();
    notify("食事を保存しました。");
  }
});
$("#goal-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const next = {
    ...state,
    goals: Object.fromEntries(
      Object.entries(values(e.target)).map(([k, v]) => [k, +v]),
    ),
  };
  if (!validate(next)) {
    notify("目標には正の数値を入力してください。");
    return;
  }
  if (commit(next)) {
    render();
    notify("目標を保存しました。");
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.day) {
    $("#date").value = b.dataset.day;
    render();
    return;
  }
  if (!b.dataset.action) return;
  const [action, kind] = b.dataset.action.split("-"),
    field = kind === "workout" ? "workouts" : "meals",
    record = state[field].find((x) => x.id === b.dataset.id);
  if (!record) return;
  if (action === "delete") {
    if (!confirm("この記録を削除しますか？")) return;
    if (
      commit({
        ...state,
        [field]: state[field].filter((x) => x.id !== record.id),
      })
    ) {
      clearEdit(kind);
      render();
      notify("記録を削除しました。");
    }
  } else {
    fill($(`#${kind}-form`), record);
    $("#date").value = record.date;
    if (kind === "workout") editingWorkout = record.id;
    else editingMeal = record.id;
    $(`#cancel-${kind}`).hidden = false;
    $(`#${kind}-title`).textContent = "記録を編集中";
    $(`#${kind}-form input`).focus();
  }
});
for (const kind of ["workout", "meal"])
  $(`#cancel-${kind}`).onclick = () => clearEdit(kind);
$("#date").addEventListener("change", () => {
  if (!$("#date").value || !/^\d{4}-\d{2}-\d{2}$/.test($("#date").value)) {
    notify("日付を選択してください。");
    $("#date").value = today();
  }
  render();
});
$("#history-exercise").onchange = renderHistory;
$("#meal-options").onchange = renderSuggestions;
$("#training-options").onchange = renderSuggestions;
function search() {
  const query = $("#food-search").value.trim();
  $("#food-results").innerHTML =
    foods
      .map((f, i) => ({ ...f, i }))
      .filter((f) => f.name.includes(query))
      .map(
        (f) =>
          `<div class="row"><strong>${f.name}</strong><small>100 g：${nutrition(f)}<br>${f.source}</small><br><button type="button" class="secondary" data-food="${f.i}">この食品を入力</button></div>`,
      )
      .join("") || "<p>該当なし。商品ラベルなどから手入力できます。</p>";
}
$("#food-search").oninput = search;
$("#food-results").onclick = (e) => {
  const b = e.target.closest("[data-food]");
  if (b) {
    clearEdit("meal");
    fill($("#meal-form"), foods[+b.dataset.food]);
    $("#meal-form [name=grams]").focus();
  }
};
$("#export").onclick = () => {
  if (storageBlocked) {
    notify("破損データ保護中のため書き出しを停止しています。");
    return;
  }
  const next = {
    ...state,
    exportCount: Math.min(100000, (state.exportCount || 0) + 1),
  };
  if (!commit(next)) return;
  render();
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `kizo-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#import").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 5000000) throw Error();
    const parsed = JSON.parse(await f.text());
    if (!validate(parsed)) throw Error();
    if (
      confirm("現在の全記録・目標をこのJSONで置き換えますか？") &&
      save(parsed)
    ) {
      storageBlocked = false;
      clearEdit("workout");
      clearEdit("meal");
      render();
      notify("JSONを読み込みました。");
    }
  } catch {
    notify(
      "JSONを読み込めません。形式・値・サイズ（5MB以下）を確認してください。現在の記録は保持しました。",
    );
  } finally {
    e.target.value = "";
  }
};
$("#reset").onclick = () => {
  if (
    confirm(
      "全記録と目標を削除します。この操作は取り消せません。続けますか？",
    ) &&
    save(initial())
  ) {
    storageBlocked = false;
    clearEdit("workout");
    clearEdit("meal");
    render();
    notify("全データを削除しました。");
  }
};
function nav() {
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === (location.hash || "#dashboard"))
      a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", nav);
nav();
search();
render();
