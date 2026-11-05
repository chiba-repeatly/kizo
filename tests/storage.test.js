import { test } from "node:test";
import assert from "node:assert/strict";
import { loadState, storageKeys } from "../storage.js";
import { initial } from "../core.js";
import { migrateState } from "../training-model.js";
function memory(seed = {}, failKey) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem(k, v) {
      if (k === failKey) throw Error("quota");
      values.set(k, v);
    },
  };
}
test("migration protects exact original before writing v2 and is repeatable", () => {
  const raw = JSON.stringify({ ...initial(), exportCount: 3 });
  const storage = memory({ [storageKeys.legacy]: raw });
  const first = loadState(storage);
  assert.equal(first.migrated, true);
  assert.equal(storage.getItem(storageKeys.backup), raw);
  assert.equal(storage.getItem(storageKeys.legacy), raw);
  assert.equal(loadState(storage).migrated, false);
  assert.deepEqual(loadState(storage).state, first.state);
});
test("backup/storage failure never changes legacy; invalid v2 never silently falls back", () => {
  const raw = JSON.stringify(initial());
  for (const fail of [storageKeys.backup, storageKeys.current]) {
    const s = memory({ [storageKeys.legacy]: raw }, fail);
    assert.throws(() => loadState(s));
    assert.equal(s.getItem(storageKeys.legacy), raw);
    assert.equal(s.getItem(storageKeys.current), null);
  }
  const s = memory({ [storageKeys.current]: "bad", [storageKeys.legacy]: raw });
  assert.throws(() => loadState(s));
  assert.equal(s.getItem(storageKeys.current), "bad");
});
test("malformed legacy is not migrated and existing recovery snapshot is never overwritten", () => {
  const s = memory({ [storageKeys.legacy]: "bad" });
  assert.throws(() => loadState(s));
  assert.equal(s.getItem(storageKeys.current), null);
  const old = JSON.stringify(initial()),
    storage = memory({
      [storageKeys.legacy]: old,
      [storageKeys.backup]: "existing",
    });
  loadState(storage);
  assert.equal(storage.getItem(storageKeys.backup), "existing");
  assert.deepEqual(loadState(memory()).state, migrateState(initial()));
});
