// Dexie database schema and instance

import Dexie, { type EntityTable } from 'dexie';
import type { ConnectionProfile } from '../mqtt/types';

export interface StoredMessage {
  id: string;
  topic: string;
  ts: number;
  payload: Uint8Array;
  retained: boolean;
  qos: 0 | 1 | 2;
}

export class AppDB extends Dexie {
  profiles!: EntityTable<ConnectionProfile, 'id'>;
  messages!: EntityTable<StoredMessage, 'id'>;

  constructor() {
    super('mqttui');
    this.version(1).stores({
      profiles: 'id, name',
      messages: 'id, topic, ts',
    });
  }
}

export const db = new AppDB();
