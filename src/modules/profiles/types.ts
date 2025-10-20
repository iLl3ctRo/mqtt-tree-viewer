// Profile management types

export type { ConnectionProfile } from '../mqtt/types';

export type ProfileFormData = {
  name: string;
  url: string;
  clientId: string;
  username: string;
  password: string;
  keepalive: number;
  cleanStart: boolean;
  sessionExpiry: number;
};
