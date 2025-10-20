// Profile repository - CRUD operations for connection profiles

import { db } from './db';
import type { ConnectionProfile } from '../mqtt/types';

export async function getAllProfiles(): Promise<ConnectionProfile[]> {
  return await db.profiles.toArray();
}

export async function getProfile(id: string): Promise<ConnectionProfile | undefined> {
  return await db.profiles.get(id);
}

export async function createProfile(profile: ConnectionProfile): Promise<string> {
  return await db.profiles.add(profile);
}

export async function updateProfile(
  id: string,
  updates: Partial<ConnectionProfile>
): Promise<void> {
  await db.profiles.update(id, updates);
}

export async function deleteProfile(id: string): Promise<void> {
  await db.profiles.delete(id);
}

export async function createDefaultProfile(): Promise<ConnectionProfile> {
  const defaultProfile: ConnectionProfile = {
    id: crypto.randomUUID(),
    name: 'Default',
    url: import.meta.env.VITE_DEFAULT_BROKER_URL || 'wss://test.mosquitto.org:8081/mqtt',
    clientId: `${import.meta.env.VITE_DEFAULT_CLIENT_ID_PREFIX || 'mqttui_'}${crypto.randomUUID().slice(0, 8)}`,
    keepalive: Number(import.meta.env.VITE_DEFAULT_KEEPALIVE) || 60,
    cleanStart: true,
  };

  await createProfile(defaultProfile);
  return defaultProfile;
}
