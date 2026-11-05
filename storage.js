import { initial, validate } from "./core.js";
import { migrateState } from "./training-model.js";
export const storageKeys = {
  current: "kizo.v2",
  legacy: "kizo.v1",
  backup: "kizo.pre-v2",
};
export function loadState(storage) {
  const current = storage.getItem(storageKeys.current);
  if (current !== null) {
    const parsed = JSON.parse(current);
    if (parsed.version !== 2 || !validate(parsed))
      throw Error("新形式の保存データが不正です");
    return { state: parsed, migrated: false };
  }
  const raw = storage.getItem(storageKeys.legacy);
  if (raw === null) return { state: migrateState(initial()), migrated: false };
  const old = JSON.parse(raw);
  if (old.version !== 1 || !validate(old))
    throw Error("旧形式の保存データが不正です");
  const next = migrateState(old);
  if (!validate(next)) throw Error("移行結果を検証できません");
  if (storage.getItem(storageKeys.backup) === null)
    storage.setItem(storageKeys.backup, raw);
  storage.setItem(storageKeys.current, JSON.stringify(next));
  return { state: next, migrated: true };
}
