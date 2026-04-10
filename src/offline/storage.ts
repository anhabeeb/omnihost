import { openDB } from "idb";

import type { GuesthouseSnapshot, QueueMutation } from "../../shared/domain";

const DB_NAME = "omnihost-offline";
const STORE_NAME = "state";

async function getDatabase() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    }
  });
}

async function readValue<T>(key: string): Promise<T | null> {
  const database = await getDatabase();
  return (await database.get(STORE_NAME, key)) ?? null;
}

async function writeValue<T>(key: string, value: T) {
  const database = await getDatabase();
  await database.put(STORE_NAME, value, key);
}

export function readSnapshot() {
  return readValue<GuesthouseSnapshot>("snapshot");
}

export function writeSnapshot(snapshot: GuesthouseSnapshot | null) {
  return writeValue("snapshot", snapshot);
}

export function readQueue() {
  return readValue<QueueMutation[]>("queue").then((value) => value ?? []);
}

export function writeQueue(queue: QueueMutation[]) {
  return writeValue("queue", queue);
}

