// Tauri-based MQTT client using native Rust rumqttc

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ConnectionProfile, SubscriptionSpec } from './types';

export interface TauriMqttMessage {
  topic: string;
  payload: number[]; // Uint8Array is sent as number array from Rust
  qos: number;
  retained: boolean;
  dup: boolean;
}

export class TauriMqttClient {
  private messageListener: UnlistenFn | null = null;
  private connectedListener: UnlistenFn | null = null;
  private errorListener: UnlistenFn | null = null;
  private onMessageCallback: ((topic: string, payload: Uint8Array, packet: any) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor() {
    // Initialize event listeners
    this.setupListeners();
  }

  private async setupListeners() {
    console.log('[TauriClient] Setting up event listeners...');

    // Listen for incoming messages
    this.messageListener = await listen<TauriMqttMessage>('mqtt://message', (event) => {
      console.log('[TauriClient] Received mqtt://message event:', event.payload.topic);
      if (this.onMessageCallback) {
        const { topic, payload, qos, retained, dup } = event.payload;
        // Convert number array back to Uint8Array
        const payloadBytes = new Uint8Array(payload);
        const packet = {
          qos,
          retain: retained,
          dup,
        };
        this.onMessageCallback(topic, payloadBytes, packet);
      }
    });

    // Listen for connection events
    this.connectedListener = await listen('mqtt://connected', () => {
      console.log('[TauriClient] Received mqtt://connected event');
      if (this.onConnectCallback) {
        console.log('[TauriClient] Calling onConnectCallback');
        this.onConnectCallback();
      } else {
        console.warn('[TauriClient] No onConnectCallback registered!');
      }
    });

    // Listen for error events
    this.errorListener = await listen<string>('mqtt://error', (event) => {
      console.error('[TauriClient] Received mqtt://error event:', event.payload);
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(event.payload));
      }
    });

    console.log('[TauriClient] Event listeners set up successfully');
  }

  async connect(profile: ConnectionProfile, subscriptions: SubscriptionSpec[]): Promise<void> {
    console.log('[TauriClient] Calling mqtt_connect with profile:', {
      url: profile.url,
      clientId: profile.clientId,
      subscriptions
    });

    try {
      await invoke('mqtt_connect', {
        profile: {
          id: profile.id,
          name: profile.name,
          url: profile.url,
          clientId: profile.clientId,
          username: profile.username,
          password: profile.passwordEnc ? atob(profile.passwordEnc) : undefined, // Decrypt password
          keepalive: profile.keepalive,
          cleanStart: profile.cleanStart,
        },
        subscriptions: subscriptions.map((sub) => ({
          filter: sub.filter,
          qos: sub.qos,
        })),
      });
      console.log('[TauriClient] mqtt_connect invoke completed successfully');
    } catch (error) {
      console.error('[TauriClient] mqtt_connect failed:', error);
      throw new Error(`Failed to connect: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    console.log('[TauriClient] disconnect() called');
    console.trace('[TauriClient] Disconnect stack trace');
    try {
      await invoke('mqtt_disconnect');
      if (this.onCloseCallback) {
        console.log('[TauriClient] Calling onCloseCallback');
        this.onCloseCallback();
      }
    } catch (error) {
      console.error('[TauriClient] disconnect failed:', error);
      throw new Error(`Failed to disconnect: ${error}`);
    }
  }

  on(event: string, callback: (...args: any[]) => void): this {
    switch (event) {
      case 'connect':
        this.onConnectCallback = callback;
        break;
      case 'message':
        this.onMessageCallback = callback;
        break;
      case 'error':
        this.onErrorCallback = callback;
        break;
      case 'close':
        this.onCloseCallback = callback;
        break;
      case 'reconnect':
        // Native client handles reconnection automatically
        break;
    }
    return this;
  }

  async end(force?: boolean): Promise<void> {
    console.log('[TauriClient] end() called with force=', force);
    console.trace('[TauriClient] end() stack trace');
    await this.disconnect();
    // Clean up listeners
    if (this.messageListener) {
      this.messageListener();
      this.messageListener = null;
    }
    if (this.connectedListener) {
      this.connectedListener();
      this.connectedListener = null;
    }
    if (this.errorListener) {
      this.errorListener();
      this.errorListener = null;
    }
  }

  // Mock properties to match mqtt.js interface
  connected = false;
  reconnecting = false;
}
