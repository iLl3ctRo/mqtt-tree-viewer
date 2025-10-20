// MQTT connection and subscription types

export type ConnectionProfile = {
  id: string; // uuid
  name: string;
  url: string; // wss://...
  clientId?: string;
  username?: string;
  passwordEnc?: string; // optional: simple crypto, or plaintext for dev
  keepalive?: number; // seconds
  cleanStart?: boolean; // default true for phase 1
  sessionExpiry?: number; // seconds
  caCertPem?: string; // browser: typically unused
};

export type SubscriptionSpec = {
  filter: string; // e.g. "#", "sensors/#"
  qos: 0 | 1 | 2;
  noLocal?: boolean; // v5
  retainAsPublished?: boolean; // v5
  retainHandling?: 0 | 1 | 2; // v5
};

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type MqttError = {
  code: string;
  message: string;
  timestamp: number;
};
