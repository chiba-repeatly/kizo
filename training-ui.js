import { featuredTitle } from "./titles.js";
import { groups, round, estimate, weightComparison } from "./core.js";
import {
  normalizeExercise,
  previousWorkout,
  draftSets,
  validSet,
  applyTemplate,
  exerciseHistory,
  changeTimer,
  remainingTime,
} from "./training-model.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () => crypto.randomUUID();
const groupOptions = (selected) =>
  groups
    .map((g) => `<option ${g === selected ? "selected" : ""}>${g}</option>`)
    .join("");
const description = (sets) =>
  sets.map((s) => `${s.weight}kg × ${s.reps}回`).join(" / ");
export function initTraining({
  getState,
  commit,
  renderAll,
  selectedDate,
  setDate,
}) {
  let editor = null,
    editorDirty = false,
    historyName = "",
    audio = null,
    rendering = false;
  const feedback = (s) => {
    $("#training-feedback").textContent = s;
  };
  const state = () => getState();
  function persist(next) {
    if (!commit(next)) {
      feedback(
        "保存できませんでした。入力を確認し、必要ならJSONを退避してください。",
      );
      return false;
    }
    return true;
  }
  function updateWorkout(id, fn) {
    const next = {
      ...state(),
      workouts: state().workouts.map((w) =>
        w.id === id ? fn(structuredClone(w)) : w,
      ),
    };
    if (persist(next)) {
      renderAll();
      return true;
    }
    return false;
  }
  function previousPanel(name) {
    const p = previousWorkout(state().workouts, name, selectedDate());
    return p
      ? `<p>前回 ${esc(p.date)}</p><p>${description(p.sets)}</p>`
      : "<p>この日より前の完了記録はありません。まずは無理のない重さから。</p>";
  }
  function preview() {
    const name = $("#workout-form [name=name]").value;
    $("#previous-preview").innerHTML = previousPanel(name);
    $("#copy-previous").disabled = !previousWorkout(
      state().workouts,
      name,
      selectedDate(),
    );
  }
  function newWorkout(name, group, sets) {
    if (
      state().workouts.some(
        (w) =>
          w.date === selectedDate() &&
          normalizeExercise(w.name) === normalizeExercise(name),
      )
    ) {
      feedback(
        "同じ種目が当日にあります。既存の種目にセットを追加してください。",
      );
      return false;
    }
    if (
      persist({
        ...state(),
        workouts: [
          ...state().workouts,
          {
            id: uid(),
            date: selectedDate(),
            name: name.trim(),
            group,
            sets: draftSets(sets),
          },
        ],
      })
    ) {
      renderAll();
      feedback(
        "未完了のセットを保存しました。終えたセットの「完了」を押してください。",
      );
      return true;
    }
    return false;
  }
  $("#workout-form [name=group]").innerHTML = groupOptions();
  $("#workout-form [name=name]").addEventListener("input", preview);
  $("#workout-form").onsubmit = (e) => {
    e.preventDefault();
    const f = e.target.elements;
    newWorkout(
      f.name.value,
      f.group.value,
      Array.from({ length: +f.sets.value }, () => ({
        weight: +f.weight.value,
        reps: +f.reps.value,
      })),
    );
  };
  $("#copy-previous").onclick = () => {
    const f = $("#workout-form").elements,
      p = previousWorkout(state().workouts, f.name.value, selectedDate());
    if (p) newWorkout(f.name.value, f.group.value, p.sets);
  };
  $("#training-date").onchange = (e) => {
    if (e.target.value) setDate(e.target.value);
  };
  function render() {
    if (rendering) return;
    rendering = true;
    try {
      const focus = document.activeElement;
      const focusInfo = focus?.closest("[data-set-id]")
        ? {
            set: focus.closest("[data-set-id]").dataset.setId,
            workout: focus.closest("[data-workout-id]").dataset.workoutId,
            field: focus.name,
            complete: focus.matches(".set-complete"),
          }
        : null;
      $("#training-date").value = selectedDate();
      const workouts = state().workouts.filter(
        (w) => w.date === selectedDate(),
      );
      $("#session-status").textContent =
        `${workouts.length}種目 · ${workouts.flatMap((w) => w.sets).filter((s) => s.completed).length}セット完了`;
      $("#workout-list").innerHTML = workouts.length
        ? workouts
            .map(
              (w) =>
                `<article class="exercise-card" data-workout-id="${esc(w.id)}"><div class="exercise-heading"><h3>${esc(w.name)}</h3><small>${esc(w.group)} · ${w.sets.filter((s) => s.completed).length}/${w.sets.length}セット完了</small></div><details class="exercise-edit"><summary>種目名・部位・日付を編集</summary><form data-edit-workout><label>種目<input name="name" value="${esc(w.name)}" maxlength="120" required /></label><label>部位<select name="group">${groupOptions(w.group)}</select></label><label>日付<input name="date" type="date" value="${w.date}" required /></label><button>種目情報を保存</button></form></details><details class="previous-inline"><summary>前回の記録</summary>${previousPanel(w.name)}<button type="button" class="secondary" data-training-action="previous" ${previousWorkout(state().workouts, w.name, selectedDate()) ? "" : "disabled"}>前回でセットを置き換え（未完了）</button></details><div class="set-column-labels" aria-hidden="true"><span>セット</span><span>kg</span><span>回</span><span>状態</span></div>${w.sets.map((s, i) => `<form class="set-row ${s.completed ? "is-complete" : ""}" data-set-id="${esc(s.id)}"><span class="set-number">${i + 1}</span><label><span class="visually-hidden">${esc(w.name)} ${i + 1}セット目 重量kg</span><input name="weight" type="number" inputmode="decimal" min="0" max="1000" step="any" value="${s.weight}" required /></label><label><span class="visually-hidden">${esc(w.name)} ${i + 1}セット目 回数</span><input name="reps" type="number" inputmode="numeric" min="1" max="1000" step="1" value="${s.reps}" required /></label><button class="set-complete ${s.completed ? "secondary" : ""}" aria-pressed="${s.completed}">${s.completed ? "✓ 完了済み" : "完了"}</button><div class="set-tools"><span class="set-status">${s.completed ? "記録済み" : "未完了・集計外"}</span><button type="button" class="secondary" data-training-action="copy-set">コピー</button><button type="button" class="secondary" data-training-action="delete-set">削除</button></div></form>`).join("")}<div class="exercise-actions"><button type="button" class="secondary" data-training-action="add-set">＋ セット追加</button><button type="button" class="secondary" data-training-action="delete-workout">種目を削除</button></div></article>`,
            )
            .join("")
        : '<article class="empty-session"><h3>今日の最初の1セットを。</h3><p>下から種目を追加するか、いつものメニューを呼び出しましょう。自重種目は0kgで入力できます。</p></article>';
      $("#exercise-names").innerHTML = [
        ...new Set(state().workouts.map((w) => w.name)),
      ]
        .map((n) => `<option value="${esc(n)}"></option>`)
        .join("");
      $("#template-list").innerHTML =
        state()
          .templates.map(
            (t) =>
              `<div class="row"><strong>${esc(t.name)}</strong><p class="muted">${t.exercises.map((x) => esc(x.name)).join(" → ")}</p><button type="button" data-template-action="apply" data-template-id="${esc(t.id)}">今日に追加</button><button type="button" class="secondary" data-template-action="edit" data-template-id="${esc(t.id)}">編集</button><button type="button" class="secondary" data-template-action="delete" data-template-id="${esc(t.id)}">削除</button></div>`,
          )
          .join("") ||
        '<p class="muted">メニューはまだありません。新規作成や今日の種目から保存できます。</p>';
      const names = [
        ...new Map(
          state()
            .workouts.filter((w) => w.date <= selectedDate())
            .map((w) => [normalizeExercise(w.name), w.name]),
        ).values(),
      ];
      $("#history-exercise").innerHTML = names
        .map((n) => `<option>${esc(n)}</option>`)
        .join("");
      if (names.includes(historyName))
        $("#history-exercise").value = historyName;
      historyName = $("#history-exercise").value;
      renderHistory();
      preview();
      updateTimerDisplay();
      if (!$("#session-summary").hidden) renderSummary();
      if (focusInfo) {
        const el = $(
          `[data-workout-id="${CSS.escape(focusInfo.workout)}"] [data-set-id="${CSS.escape(focusInfo.set)}"] ${focusInfo.complete ? ".set-complete" : `[name="${focusInfo.field}"]`}`,
        );
        el?.focus({ preventScroll: true });
      }
    } finally {
      rendering = false;
    }
  }
  function readSet(form, old) {
    return {
      ...old,
      weight: Number(form.elements.weight.value),
      reps: Number(form.elements.reps.value),
    };
  }
  $("#workout-list").addEventListener("change", (e) => {
    const form = e.target.closest(".set-row");
    if (rendering || !form || !form.reportValidity()) return;
    const w = state().workouts.find(
        (w) => w.id === form.closest("[data-workout-id]").dataset.workoutId,
      ),
      s = w.sets.find((s) => s.id === form.dataset.setId);
    const next = readSet(form, s);
    if (validSet(next))
      updateWorkout(w.id, (w) => ({
        ...w,
        sets: w.sets.map((s) => (s.id === next.id ? next : s)),
      }));
  });
  $("#workout-list").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target,
      w = state().workouts.find(
        (w) => w.id === form.closest("[data-workout-id]").dataset.workoutId,
      );
    if (form.matches("[data-edit-workout]")) {
      const f = form.elements;
      if (
        state().workouts.some(
          (x) =>
            x.id !== w.id &&
            x.date === f.date.value &&
            normalizeExercise(x.name) === normalizeExercise(f.name.value),
        )
      ) {
        feedback("その日には同じ種目名が既にあります。");
        return;
      }
      if (
        updateWorkout(w.id, (x) => ({
          ...x,
          name: f.name.value.trim(),
          group: f.group.value,
          date: f.date.value,
        }))
      )
        feedback("種目情報を保存しました。");
      return;
    }
    if (!form.matches(".set-row")) return;
    const old = w.sets.find((s) => s.id === form.dataset.setId),
      next = { ...readSet(form, old), completed: !old.completed };
    if (!validSet(next)) return;
    if (
      updateWorkout(w.id, (x) => ({
        ...x,
        sets: x.sets.map((s) => (s.id === next.id ? next : s)),
      }))
    ) {
      feedback(
        next.completed
          ? "セット完了。いい積み重ねです。"
          : "セットを未完了に戻しました。",
      );
      if (next.completed && state().timer.autoStart) timerAction("start");
    }
  });
  $("#workout-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-training-action]");
    if (!b) return;
    const w = state().workouts.find(
        (w) => w.id === b.closest("[data-workout-id]").dataset.workoutId,
      ),
      s = w.sets.find(
        (s) => s.id === b.closest("[data-set-id]")?.dataset.setId,
      ),
      a = b.dataset.trainingAction;
    if (a === "delete-workout") {
      if (
        confirm("この種目と全セットを削除しますか？") &&
        persist({
          ...state(),
          workouts: state().workouts.filter((x) => x.id !== w.id),
        })
      )
        renderAll();
      return;
    }
    if (a === "delete-set") {
      if (w.sets.length === 1) {
        if (
          confirm("最後のセットと種目を削除しますか？") &&
          persist({
            ...state(),
            workouts: state().workouts.filter((x) => x.id !== w.id),
          })
        )
          renderAll();
        return;
      }
      if (confirm("このセットを削除しますか？"))
        updateWorkout(w.id, (x) => ({
          ...x,
          sets: x.sets.filter((z) => z.id !== s.id),
        }));
      return;
    }
    if (a === "add-set" || a === "copy-set") {
      if (w.sets.length >= 100) {
        feedback("1種目100セットまでです。");
        return;
      }
      const from = s || w.sets.at(-1);
      updateWorkout(w.id, (x) => ({
        ...x,
        sets: [...x.sets, ...draftSets([from])],
      }));
      return;
    }
    if (a === "previous") {
      const p = previousWorkout(state().workouts, w.name, selectedDate());
      if (
        p &&
        confirm(
          "現在のセットを前回の完了セットで置き換えます。コピー後はすべて未完了になります。続けますか？",
        )
      )
        updateWorkout(w.id, (x) => ({ ...x, sets: draftSets(p.sets) }));
    }
  });
  function renderHistory() {
    historyName = $("#history-exercise").value;
    const history = exerciseHistory(
      state().workouts,
      historyName,
      selectedDate(),
    );
    if (!history.length) {
      $("#history").innerHTML =
        '<p class="muted">完了したセットを記録すると、履歴と成長の目安が表示されます。</p>';
      return;
    }
    const sets = history.flatMap((h) => h.sets),
      maxWeight = Math.max(...sets.map((s) => s.weight)),
      bodyweight = sets.every((s) => s.weight === 0),
      bestAtWeight = [...new Set(sets.map((s) => s.weight))]
        .sort((a, b) => a - b)
        .map(
          (weight) =>
            `${weight}kg：最高${Math.max(...sets.filter((s) => s.weight === weight).map((s) => s.reps))}回`,
        );
    const latest = history.at(-1),
      previous = history.at(-2),
      comparable =
        previous &&
        latest.sets.length === previous.sets.length &&
        latest.sets.every((s, i) => s.weight === previous.sets[i].weight);
    const delta = previous
      ? comparable
        ? `同じ重量・同じセット数で、合計回数は前回比 ${latest.reps - previous.reps >= 0 ? "+" : ""}${latest.reps - previous.reps}回。`
        : "前回と重量またはセット数が異なるため、単純な成長判定はしません。"
      : "比較できる前回の完了記録はまだありません。";
    const values = history.map((h) => (bodyweight ? h.reps : h.maxWeight)),
      max = Math.max(1, ...values),
      unit = bodyweight ? "回" : "kg",
      chartName = bodyweight ? "自重の合計回数" : "最高重量";
    const cx = (i) =>
        52 + (history.length === 1 ? 0 : (i / (history.length - 1)) * 490),
      cy = (v) => 145 - (v / max) * 110;
    $("#history").innerHTML =
      `<p>最高重量 <strong>${maxWeight} kg</strong> · 推定1RM ${Math.max(...history.map((h) => h.estimated1RM)) ? round(Math.max(...history.map((h) => h.estimated1RM))) + " kg" : "対象なし"}</p><p>${bestAtWeight.map(esc).join(" / ")}</p><p class="muted">${delta} 記録日の比較であり、フォーム・可動域・補助などは評価しません。</p><svg class="history-chart" viewBox="0 0 600 210" role="img" aria-label="${chartName}の推移。日付・数値は下の表で確認できます。"><line x1="52" y1="30" x2="52" y2="145" stroke="#809378"/><line x1="52" y1="145" x2="560" y2="145" stroke="#809378"/><text x="4" y="36">${round(max)}${unit}</text><text x="13" y="148">0</text><text x="52" y="174">${history[0].date}</text><text x="552" y="194" text-anchor="end">${latest.date} / 記録日順・等間隔</text><polyline fill="none" stroke="#c1dcae" stroke-width="3" points="${values.map((v, i) => `${cx(i)},${cy(v)}`).join(" ")}"/>${values.map((v, i) => `<circle cx="${cx(i)}" cy="${cy(v)}" r="4" fill="#c1dcae"/>`).join("")}</svg><div class="history-table"><table><caption>${esc(historyName)} · 完了セットのみ</caption><thead><tr><th>日付</th><th>セット内容</th><th>総重量</th><th>合計回数</th></tr></thead><tbody>${history.map((h) => `<tr><td>${h.date}</td><td>${description(h.sets)}</td><td>${round(h.volume)}kg</td><td>${h.reps}回</td></tr>`).join("")}</tbody></table></div><p class="muted">推定1RMはEpley式：重量×(1+回数÷30)。重量あり・12回以下のセットのみ参考値を表示し、自重や高回数は対象外です。実際の最大挙上を保証しません。入力重量の定義は種目ごとに揃えてください。</p>`;
  }
  $("#history-exercise").onchange = renderHistory;
  function renderSummary() {
    const title = featuredTitle(state(), selectedDate());
    const rows = state().workouts.filter((w) => w.date === selectedDate()),
      done = rows.flatMap((w) => w.sets.filter((s) => s.completed)),
      pending = rows.flatMap((w) => w.sets.filter((s) => !s.completed)).length,
      volume = done.reduce((n, s) => n + s.weight * s.reps, 0),
      c = weightComparison(volume);
    $("#session-result").innerHTML =
      `<p>${esc(selectedDate())} · ${done.length}セット完了${pending ? ` / 未完了${pending}セットは集計外` : ""}</p><p class="story-title">${c ? `${c.emoji} ${c.name} 約${c.count}${c.unit}分` : "🌱 自分のペースで、一歩ずつ。"}</p><p>記録上の総重量 ${round(volume).toLocaleString("ja-JP")}kg。${c ? `${c.name}${c.kg}kgを目安にしたたとえです。` : "自重分は含みません。"}</p><p class="muted">総重量は完了した各セットの重量×回数の合計。同時に挙げた重量ではありません。</p>${title ? `<p>いまの称号：${title.emoji} ${esc(title.name)}</p>` : ""}<a href="#dashboard">称号と今日のバランスを見る →</a>`;
  }
  $("#finish-session").onclick = () => {
    $("#session-summary").hidden = false;
    renderSummary();
    $("#session-summary").scrollIntoView({
      block: "nearest",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  function readEditor() {
    if (!editor) return;
    editor.name = $("#template-name").value;
    $("#template-exercises")
      .querySelectorAll("[data-editor-exercise]")
      .forEach((el, i) => {
        const x = editor.exercises[i];
        x.name = el.querySelector("[name=name]").value;
        x.group = el.querySelector("[name=group]").value;
        el.querySelectorAll("[data-editor-set]").forEach((r, j) => {
          x.sets[j].weight = +r.querySelector("[name=weight]").value;
          x.sets[j].reps = +r.querySelector("[name=reps]").value;
        });
      });
  }
  function openEditor(template) {
    editor = structuredClone(template);
    editorDirty = false;
    $("#template-form").hidden = false;
    $("#template-name").value = editor.name;
    $("#template-editor-title").textContent = state().templates.some(
      (t) => t.id === editor.id,
    )
      ? "テンプレート編集"
      : "テンプレート作成";
    renderEditor();
  }
  function renderEditor() {
    $("#template-exercises").innerHTML = editor.exercises
      .map(
        (x, i) =>
          `<fieldset data-editor-exercise="${i}"><legend>種目 ${i + 1}</legend><label>種目名<input name="name" maxlength="120" value="${esc(x.name)}" required /></label><label>部位<select name="group">${groupOptions(x.group)}</select></label>${x.sets.map((s, j) => `<div class="template-set" data-editor-set="${j}"><label>kg<input name="weight" type="number" min="0" max="1000" step="any" value="${s.weight}" required /></label><label>回<input name="reps" type="number" min="1" max="1000" step="1" value="${s.reps}" required /></label><button type="button" class="secondary" data-editor-action="remove-set" data-set-index="${j}" ${x.sets.length === 1 ? "disabled" : ""}>削除</button></div>`).join("")}<button type="button" class="secondary" data-editor-action="add-set">セット追加</button><div><button type="button" class="secondary" data-editor-action="up" ${i === 0 ? "disabled" : ""}>↑ 上へ</button><button type="button" class="secondary" data-editor-action="down" ${i === editor.exercises.length - 1 ? "disabled" : ""}>↓ 下へ</button><button type="button" class="secondary" data-editor-action="remove">種目削除</button></div></fieldset>`,
      )
      .join("");
  }
  const blankExercise = () => ({
    id: uid(),
    name: "",
    group: "胸",
    sets: [{ id: uid(), weight: 0, reps: 10, completed: false }],
  });
  function canDiscard() {
    return (
      !editorDirty || confirm("保存していないテンプレート編集を破棄しますか？")
    );
  }
  $("#new-template").onclick = () => {
    if (canDiscard())
      openEditor({ id: uid(), name: "", exercises: [blankExercise()] });
  };
  $("#template-today").onclick = () => {
    const workouts = state().workouts.filter((w) => w.date === selectedDate());
    if (!workouts.length) {
      feedback("まず今日の種目を追加してください。");
      return;
    }
    if (canDiscard())
      openEditor({
        id: uid(),
        name: "",
        exercises: workouts.map((w) => ({
          id: uid(),
          name: w.name,
          group: w.group,
          sets: draftSets(w.sets),
        })),
      });
  };
  $("#template-form").oninput = () => {
    editorDirty = true;
  };
  $("#template-add").onclick = () => {
    readEditor();
    if (editor.exercises.length >= 50) {
      feedback("テンプレートは50種目までです。");
      return;
    }
    editor.exercises.push(blankExercise());
    editorDirty = true;
    renderEditor();
  };
  $("#template-cancel").onclick = () => {
    if (canDiscard()) {
      editor = null;
      editorDirty = false;
      $("#template-form").hidden = true;
    }
  };
  $("#template-exercises").onclick = (e) => {
    const b = e.target.closest("[data-editor-action]");
    if (!b) return;
    readEditor();
    const i = +b.closest("[data-editor-exercise]").dataset.editorExercise,
      x = editor.exercises[i],
      a = b.dataset.editorAction;
    if (a === "up" && i > 0)
      [editor.exercises[i - 1], editor.exercises[i]] = [
        x,
        editor.exercises[i - 1],
      ];
    if (a === "down" && i < editor.exercises.length - 1)
      [editor.exercises[i + 1], editor.exercises[i]] = [
        editor.exercises[i + 1],
        x,
      ];
    if (a === "remove") editor.exercises.splice(i, 1);
    if (a === "add-set" && x.sets.length < 100)
      x.sets.push(...draftSets([x.sets.at(-1)]));
    if (a === "remove-set" && x.sets.length > 1)
      x.sets.splice(+b.dataset.setIndex, 1);
    editorDirty = true;
    renderEditor();
  };
  $("#template-form").onsubmit = (e) => {
    e.preventDefault();
    readEditor();
    if (!editor.exercises.length) {
      feedback("1種目以上追加してください。");
      return;
    }
    if (
      state().templates.some(
        (t) =>
          t.id !== editor.id &&
          normalizeExercise(t.name) === normalizeExercise(editor.name),
      )
    ) {
      feedback(
        "同じ名前のテンプレートがあります。既存のメニューを編集してください。",
      );
      return;
    }
    if (
      persist({
        ...state(),
        templates: [
          ...state().templates.filter((t) => t.id !== editor.id),
          editor,
        ],
      })
    ) {
      editor = null;
      editorDirty = false;
      $("#template-form").hidden = true;
      renderAll();
      feedback("テンプレートを保存しました。");
    }
  };
  $("#template-list").onclick = (e) => {
    const b = e.target.closest("[data-template-action]");
    if (!b) return;
    const t = state().templates.find((t) => t.id === b.dataset.templateId);
    if (!t) return;
    if (b.dataset.templateAction === "edit" && canDiscard()) openEditor(t);
    if (
      b.dataset.templateAction === "delete" &&
      confirm(`「${t.name}」を削除しますか？今日の記録は削除しません。`)
    ) {
      if (
        persist({
          ...state(),
          templates: state().templates.filter((x) => x.id !== t.id),
        })
      ) {
        if (editor?.id === t.id) {
          editor = null;
          editorDirty = false;
          $("#template-form").hidden = true;
        }
        renderAll();
      }
    }
    if (b.dataset.templateAction === "apply") {
      try {
        if (persist(applyTemplate(state(), t, selectedDate()))) {
          renderAll();
          feedback("メニューを未完了の予定として追加しました。");
        }
      } catch (err) {
        feedback(err.message);
      }
    }
  };
  function updateTimerDisplay() {
    const t = state().timer,
      seconds = Math.ceil(remainingTime(t) / 1000);
    $("#timer-compact").textContent =
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    $("#timer-display").textContent =
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    if (document.activeElement !== $("#timer-duration"))
      $("#timer-duration").value = t.duration;
    $("#timer-auto").checked = t.autoStart;
    $("#timer-sound").checked = t.sound;
    $("#timer-pause").disabled = t.status !== "running";
    $("#timer-resume").disabled = t.status !== "paused";
    $("#timer-start").disabled = t.status === "running";
  }
  function primeAudio() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
    } catch {}
  }
  function beep() {
    if (!audio) return;
    try {
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
      osc.start();
      osc.stop(audio.currentTime + 0.4);
    } catch {}
  }
  function timerAction(action) {
    if (action === "start" && !$("#timer-duration").reportValidity()) return;
    if (state().timer.sound) primeAudio();
    if (persist({ ...state(), timer: changeTimer(state().timer, action) })) {
      updateTimerDisplay();
      $("#timer-message").textContent =
        action === "pause"
          ? "一時停止中"
          : action === "reset"
            ? "リセットしました"
            : action === "start" || action === "resume"
              ? "休憩中。自分のペースでどうぞ。"
              : "";
    }
  }
  for (const action of ["start", "pause", "resume", "reset"])
    $(`#timer-${action}`).onclick = () => timerAction(action);
  $("#timer-duration").onchange = (e) => {
    const n = +e.target.value;
    if (!Number.isInteger(n) || n < 1 || n > 3600) {
      e.target.reportValidity();
      return;
    }
    const t = { ...state().timer, duration: n };
    if (t.status === "idle" || t.status === "finished") t.remaining = n * 1000;
    if (persist({ ...state(), timer: t })) updateTimerDisplay();
  };
  for (const [id, key] of [
    ["timer-auto", "autoStart"],
    ["timer-sound", "sound"],
  ])
    $(`#${id}`).onchange = (e) => {
      if (key === "sound" && e.target.checked) primeAudio();
      if (
        persist({
          ...state(),
          timer: { ...state().timer, [key]: e.target.checked },
        })
      )
        updateTimerDisplay();
    };
  $("#timer-panel").addEventListener("click", (e) => {
    const b = e.target.closest("[data-seconds]");
    if (b) {
      const t = { ...state().timer, duration: +b.dataset.seconds };
      if (t.status === "idle" || t.status === "finished")
        t.remaining = t.duration * 1000;
      if (persist({ ...state(), timer: t })) updateTimerDisplay();
    }
  });
  function tick() {
    const t = state().timer,
      next = changeTimer(t, "tick");
    if (next !== t) {
      if (persist({ ...state(), timer: next })) {
        $("#timer-message").textContent =
          "休憩時間が終了しました。準備ができたら次のセットへ。";
        if (t.sound) beep();
      }
    }
    updateTimerDisplay();
  }
  setInterval(tick, 250);
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("focus", tick);
  return {
    render,
    renderHistory,
    reset() {
      editor = null;
      editorDirty = false;
      historyName = "";
      $("#template-form").hidden = true;
      $("#workout-form").reset();
      $("#session-summary").hidden = true;
    },
  };
}
