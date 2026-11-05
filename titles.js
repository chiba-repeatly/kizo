// Titles celebrate recorded habits, never diagnose strength or health.
export const titleCategories = [
  "継続",
  "部位",
  "種目探検",
  "自重",
  "食事",
  "両立",
  "おかえり",
  "バックアップ",
];
export function collectTitles(state, date) {
  const workouts = state.workouts.filter((w) => w.date <= date),
    meals = state.meals.filter((m) => m.date <= date);
  const days = [...new Set(workouts.map((w) => w.date))].sort();
  const foodDays = new Set(meals.map((m) => m.date));
  const titles = [];
  function series(key, category, emoji, thresholds, names, value, condition) {
    thresholds.forEach((target, i) =>
      titles.push({
        id: `${key}-${target}`,
        category,
        emoji: Array.isArray(emoji) ? emoji[i] : emoji,
        name: names[i],
        target,
        value,
        condition: condition(target),
        unlocked: value >= target,
      }),
    );
  }
  series(
    "days",
    "継続",
    ["👟","🤝","🔥","⭐","⚔️","🚀","🦸","🪄","💚","🗿","🏆","🧳","🍂","💯","🛡️","🧙","🧭","🐾","🌍","🌟","📚","🔮","🌌","👑"],
    [
      1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 75, 90, 100, 120, 150, 180, 200,
      250, 300, 365, 500, 730, 1000,
    ],
    [
      "はじめの一歩",
      "また会えたね",
      "エンジン始動",
      "五つ星の芽",
      "コツコツ戦士",
      "十日坊主を超えて",
      "パワーヒーロー",
      "習慣の魔法使い",
      "ハルク級",
      "静かなる巨人",
      "継続のレジェンド",
      "鉄の旅人",
      "季節を越える者",
      "百戦の冒険者",
      "緑の守護者",
      "積み重ねの達人",
      "半周の航海士",
      "二百の足あと",
      "大地のチャンピオン",
      "三百の星を集めし者",
      "一年分の物語",
      "五百日の大賢者",
      "二年分の冒険譚",
      "千日物語の主人公",
    ],
    days.length,
    (n) => `トレーニングを記録した日が${n}日（連続でなくてOK）`,
  );
  const groupNames = {
    胸: [
      "胸トレデビュー",
      "プッシュの見習い",
      "胸の日の常連",
      "胸板の設計士",
      "プッシュの騎士",
      "胸トレの守護者",
      "胸の日の仙人",
      "プッシュ王国の伝説",
    ],
    背中: [
      "背中と初対面",
      "プルの見習い",
      "背中の日の常連",
      "背中の地図職人",
      "プルの騎士",
      "広背の守護者",
      "背中の日の仙人",
      "プル王国の伝説",
    ],
    脚: [
      "脚トレデビュー",
      "大地の見習い",
      "脚の日の常連",
      "土台の建築士",
      "大地の騎士",
      "脚トレの守護者",
      "脚の日の仙人",
      "大地を支える伝説",
    ],
    肩: [
      "肩トレデビュー",
      "ショルダーの見習い",
      "肩の日の常連",
      "肩まわりの設計士",
      "ショルダーの騎士",
      "肩トレの守護者",
      "肩の日の仙人",
      "肩トレ王国の伝説",
    ],
    腕: [
      "腕トレデビュー",
      "アームの見習い",
      "腕の日の常連",
      "アームの職人",
      "アームの騎士",
      "腕トレの守護者",
      "腕の日の仙人",
      "腕トレ王国の伝説",
    ],
    体幹: [
      "体幹デビュー",
      "コアの見習い",
      "体幹の日の常連",
      "中心の建築士",
      "コアの騎士",
      "体幹の守護者",
      "コアの日の仙人",
      "中心を守る伝説",
    ],
  };
  for (const [group, names] of Object.entries(groupNames))
    series(
      `group-${group}`,
      "部位",
      { 胸: "🛡️", 背中: "🦅", 脚: "🌳", 肩: "🗻", 腕: "💪", 体幹: "🧘" }[group],
      [1, 3, 7, 14, 30, 60, 100, 200],
      names,
      new Set(workouts.filter((w) => w.group === group).map((w) => w.date))
        .size,
      (n) => `${group}の記録がある日が${n}日`,
    );
  series(
    "variety",
    "種目探検",
    "🧭",
    [2, 3, 4, 5, 6, 8, 10, 15, 20, 30],
    [
      "種目の寄り道",
      "三つの扉を開く者",
      "メニューの探検家",
      "五つ道具の冒険者",
      "六つの引き出し",
      "種目の地図職人",
      "十種の旅人",
      "メニューの錬金術師",
      "種目図鑑の編集長",
      "三十の技を記す者",
    ],
    new Set(
      workouts.map((w) =>
        w.name.normalize("NFKC").trim().toLocaleLowerCase("ja-JP"),
      ),
    ).size,
    (n) => `異なる名前の種目を${n}種類記録（名前の表記で判定）`,
  );
  series(
    "bodyweight",
    "自重",
    "🪶",
    [1, 3, 5, 7, 14, 30, 60, 100],
    [
      "自分が相棒",
      "身ひとつの冒険者",
      "マットの常連",
      "自重の旅人",
      "ボディウェイトの騎士",
      "重力と友だち",
      "自重の仙人",
      "身ひとつのレジェンド",
    ],
    new Set(workouts.filter((w) => w.weight === 0).map((w) => w.date)).size,
    (n) => `重量0kgのトレーニングを記録した日が${n}日`,
  );
  series(
    "meals",
    "食事",
    "🍽️",
    [1, 3, 5, 7, 14, 21, 30, 60, 100, 200],
    [
      "いただきますの記録",
      "食卓の見習い",
      "ごはん日記の芽",
      "食卓の観察者",
      "栄養ログの旅人",
      "食事日記の編集者",
      "食卓のアーカイビスト",
      "ごはん日記の達人",
      "百日の食卓物語",
      "食卓のレジェンド",
    ],
    foodDays.size,
    (n) =>
      `食事を1件以上記録した日が${n}日（栄養バランスの評価ではありません）`,
  );
  series(
    "both",
    "両立",
    "🤝",
    [1, 3, 7, 14, 30, 60, 100, 200],
    [
      "食べて動く第一歩",
      "ふたつの日記",
      "食卓とジムの旅人",
      "二刀流の見習い",
      "記録の二刀流",
      "暮らしの記録職人",
      "二つの習慣の守護者",
      "ライフログの伝説",
    ],
    days.filter((d) => foodDays.has(d)).length,
    (n) => `同じ日に運動と食事を両方記録した日が${n}日`,
  );
  const returns = days.filter(
    (d, i) =>
      i > 0 &&
      (new Date(`${d}T12:00:00Z`) - new Date(`${days[i - 1]}T12:00:00Z`)) /
        86400000 >=
        7,
  ).length;
  series(
    "returns",
    "おかえり",
    "🌈",
    [1, 3, 7, 14],
    [
      "おかえりヒーロー",
      "何度でもスタート",
      "再出発の魔法使い",
      "戻ってこられる勇者",
    ],
    returns,
    (n) =>
      `前のトレーニング記録から7日以上空いた後の記録日が${n}回（実際の休養日数は判定しません）`,
  );
  series(
    "export",
    "バックアップ",
    "💾",
    [1, 3, 10],
    ["思い出の保管係", "記録の司書", "バックアップの守護者"],
    state.exportCount || 0,
    (n) =>
      `JSON書き出し操作を${n}回（全期間。端末への保存完了は確認できません）`,
  );
  return titles;
}
export function featuredTitle(state, date) {
  const unlocked = collectTitles(state, date).filter((t) => t.unlocked);
  return (
    unlocked.find((t) => t.id === state.selectedTitle) ||
    unlocked.filter((t) => t.category === "継続").at(-1) ||
    unlocked[0] ||
    null
  );
}
