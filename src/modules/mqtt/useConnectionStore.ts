// Zustand store for MQTT connection state

import { create } from 'zustand';
import type { ConnectionProfile, SubscriptionSpec, ConnectionStatus, MqttError } from './types';

type ConnectionState = {
  status: ConnectionStatus;
  activeProfile: ConnectionProfile | null;
  subscriptions: SubscriptionSpec[];
  error: MqttError | null;
  messagesReceived: number;
  messageRate: number; // messages per second
  lastMessageTime: number;

  setStatus: (status: ConnectionStatus) => void;
  setActiveProfile: (profile: ConnectionProfile | null) => void;
  setSubscriptions: (subscriptions: SubscriptionSpec[]) => void;
  addSubscription: (subscription: SubscriptionSpec) => void;
  setError: (error: MqttError | null) => void;
  incrementMessagesReceived: () => void;
  resetStats: () => void;
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  activeProfile: null,
  subscriptions: [],
  error: null,
  messagesReceived: 0,
  messageRate: 0,
  lastMessageTime: 0,

  setStatus: (status) => set({ status }),

  setActiveProfile: (profile) => set({ activeProfile: profile }),

  setSubscriptions: (subscriptions) => set({ subscriptions }),

  addSubscription: (subscription) =>
    set((state) => ({
      subscriptions: [...state.subscriptions, subscription],
    })),

  setError: (error) => set({ error }),

  incrementMessagesReceived: () =>
    set((state) => {
      const now = Date.now();
      const timeDiff = (now - state.lastMessageTime) / 1000;
      const newCount = state.messagesReceived + 1;

      // Update message rate (simple moving average)
      const newRate = timeDiff > 0 ? 1 / timeDiff : state.messageRate;

      return {
        messagesReceived: newCount,
        messageRate: newRate,
        lastMessageTime: now,
      };
    }),

  resetStats: () =>
    set({
      messagesReceived: 0,
      messageRate: 0,
      lastMessageTime: 0,
    }),
}));
