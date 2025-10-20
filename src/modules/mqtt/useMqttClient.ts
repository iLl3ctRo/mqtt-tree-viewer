// MQTT client lifecycle hook

import { useEffect, useRef, useCallback } from 'react';
import type { MqttClient, ISubscriptionGrant } from 'mqtt';
import { createMqttClient } from './client';
import { useConnectionStore } from './useConnectionStore';
import { useTopicStore } from '../tree/useTopicStore';
import { useUiStore } from '../ui/useUiStore';
import type { ConnectionProfile, SubscriptionSpec } from './types';
import type { MessageRecord } from '../tree/types';
import { decodePreview } from '../payload/decode';
import { MessageBatcher } from '../tree/messageBatcher';

const BATCH_INTERVAL_MS = 120; // ~60 Hz update rate

export function useMqttClient() {
  const clientRef = useRef<MqttClient | null>(null);
  const batcherRef = useRef<MessageBatcher | null>(null);
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setError = useConnectionStore((s) => s.setError);
  const setSubscriptions = useConnectionStore((s) => s.setSubscriptions);
  const incrementMessagesReceived = useConnectionStore((s) => s.incrementMessagesReceived);
  const batchUpsertMessages = useTopicStore((s) => s.batchUpsertMessages);
  const isPaused = useUiStore((s) => s.isPaused);

  const connect = useCallback(
    async (profile: ConnectionProfile, subscriptions: SubscriptionSpec[] = [{ filter: '#', qos: 0 }]) => {
      // Disconnect existing client
      if (clientRef.current) {
        clientRef.current.end(true);
      }

      // Clear existing batcher
      if (batcherRef.current) {
        batcherRef.current.clear();
      }

      // Create new batcher
      batcherRef.current = new MessageBatcher(BATCH_INTERVAL_MS, (messages) => {
        batchUpsertMessages(messages);
      });

      setStatus('connecting');
      setError(null);

      const client = createMqttClient(profile);
      clientRef.current = client;

      // Event: connected
      // IMPORTANT: Register event listeners BEFORE calling connect() to avoid race condition
      client.on('connect', () => {
        console.log('MQTT connected');
        setStatus('connected');

        // For browser clients (mqtt.js), subscribe to filters
        // Tauri clients handle subscriptions during connect
        if (!('connect' in client && typeof (client as any).connect === 'function')) {
          subscriptions.forEach((sub) => {
            client.subscribe(
              sub.filter,
              {
                qos: sub.qos,
                nl: sub.noLocal,
                rap: sub.retainAsPublished,
                rh: sub.retainHandling,
              },
              (err: Error | null, granted?: ISubscriptionGrant[]) => {
                if (err) {
                  console.error('Subscription error:', err);
                  setError({
                    code: 'SUBSCRIPTION_ERROR',
                    message: err.message,
                    timestamp: Date.now(),
                  });
                } else {
                  console.log('Subscribed:', granted);
                  setSubscriptions(subscriptions);
                }
              }
            );
          });
        } else {
          // For Tauri, subscriptions were already done during connect
          setSubscriptions(subscriptions);
        }
      });

      // Event: reconnect
      client.on('reconnect', () => {
        console.log('MQTT reconnecting...');
        setStatus('reconnecting');
      });

      // Event: close
      client.on('close', () => {
        console.log('[useMqttClient] MQTT connection closed event received');
        console.trace('[useMqttClient] Close event stack trace');
        setStatus('disconnected');
      });

      // Event: error
      client.on('error', (error) => {
        console.error('MQTT error:', error);
        setStatus('error');
        setError({
          code: 'CONNECTION_ERROR',
          message: error.message,
          timestamp: Date.now(),
        });
      });

      // Event: message
      client.on('message', (topic, payloadBuf, packet) => {
        // Skip if paused
        if (isPaused) return;

        incrementMessagesReceived();

        const bytes = new Uint8Array(payloadBuf);
        const { text, json } = decodePreview(bytes, packet?.properties?.contentType as string | undefined);

        const msg: MessageRecord = {
          id: crypto.randomUUID(),
          topic,
          ts: Date.now(),
          payload: bytes,
          payloadText: text,
          payloadJson: json,
          contentType: packet?.properties?.contentType as string | undefined,
          properties: packet?.properties as Record<string, unknown> | undefined,
          retained: !!packet?.retain,
          qos: packet?.qos ?? 0,
          dup: !!packet?.dup,
        };

        // Add to batcher for throttled updates
        if (batcherRef.current) {
          batcherRef.current.add(msg);
        }
      });

      // Now that all event listeners are registered, call connect for Tauri clients
      // (browser mqtt.js clients connect automatically in createMqttClient)
      const isTauriClient = 'connect' in client && typeof (client as any).connect === 'function';
      console.log('[useMqttClient] Is Tauri client?', isTauriClient);

      if (isTauriClient) {
        // Tauri client - call connect with profile and subscriptions
        console.log('[useMqttClient] Calling Tauri client.connect()...');
        try {
          await (client as any).connect(profile, subscriptions);
          console.log('[useMqttClient] Tauri client.connect() completed');
        } catch (error) {
          console.error('[useMqttClient] Tauri MQTT connection error:', error);
          setError({
            code: 'CONNECTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          });
          setStatus('error');
          return;
        }
      } else {
        console.log('[useMqttClient] Using browser mqtt.js client (auto-connects)');
      }
    },
    [setStatus, setError, setSubscriptions, incrementMessagesReceived, batchUpsertMessages, isPaused]
  );

  const disconnect = useCallback(() => {
    console.log('[useMqttClient] disconnect() called');
    console.trace('[useMqttClient] Disconnect stack trace');
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
      setStatus('disconnected');
    }
    // Flush any pending messages
    if (batcherRef.current) {
      batcherRef.current.flush();
      batcherRef.current.clear();
      batcherRef.current = null;
    }
  }, [setStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
      if (batcherRef.current) {
        batcherRef.current.flush();
        batcherRef.current.clear();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    client: clientRef.current,
  };
}
