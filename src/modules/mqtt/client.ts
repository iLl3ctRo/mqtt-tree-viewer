// MQTT client factory with Tauri support

import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import type { ConnectionProfile } from './types';
import { TauriMqttClient } from './tauriClient';

// Simple encryption for password (dev-only, not secure)
function simpleDecrypt(encrypted: string): string {
  // In production, use proper encryption
  // For now, just base64 decode if it looks encrypted
  try {
    return atob(encrypted);
  } catch {
    return encrypted;
  }
}

// Check if running in Tauri
export function isTauri(): boolean {
  const hasTauriGlobal = typeof window !== 'undefined' && '__TAURI__' in window;
  const hasTauriInternals = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  console.log('[client.ts] Tauri detection:', {
    hasTauriGlobal,
    hasTauriInternals,
    windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('TAURI')) : []
  });

  return hasTauriGlobal || hasTauriInternals;
}

export function createMqttClient(profile: ConnectionProfile): MqttClient | TauriMqttClient {
  const inTauri = isTauri();
  const isMqttUrl = profile.url.startsWith('mqtt://') || profile.url.startsWith('mqtts://');

  console.log('[client.ts] createMqttClient:', {
    inTauri,
    isMqttUrl,
    url: profile.url
  });

  // If running in Tauri and URL is mqtt:// (TCP), use native Tauri client
  if (inTauri && isMqttUrl) {
    console.log('Using Tauri native MQTT client (TCP/TLS)');
    return new TauriMqttClient() as any;
  }

  // Otherwise, use browser WebSocket client (mqtt.js)
  console.log('Using browser WebSocket MQTT client');

  const opts: IClientOptions = {
    protocolVersion: 5,
    clean: profile.cleanStart ?? true,
    clientId:
      profile.clientId ??
      `${import.meta.env.VITE_DEFAULT_CLIENT_ID_PREFIX || 'mqttui_'}${crypto.randomUUID().slice(0, 8)}`,
    username: profile.username,
    password: profile.passwordEnc ? simpleDecrypt(profile.passwordEnc) : undefined,
    keepalive: profile.keepalive ?? 60,
    reconnectPeriod: Number(import.meta.env.VITE_DEFAULT_RECONNECT_MS) || 2000,
    properties: {
      sessionExpiryInterval: profile.sessionExpiry ?? 0,
    },
  };

  const client = mqtt.connect(profile.url, opts);
  return client;
}
