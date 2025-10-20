// Profile form component

import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { ConnectionProfile } from '../mqtt/types';

export interface ProfileFormProps {
  initialData?: ConnectionProfile;
  onSubmit: (profile: ConnectionProfile) => void | Promise<void>;
  onCancel?: () => void;
}

export function ProfileForm({ initialData, onSubmit, onCancel }: ProfileFormProps) {
  const [formData, setFormData] = useState<ConnectionProfile>(
    initialData || {
      id: crypto.randomUUID(),
      name: '',
      url: import.meta.env.VITE_DEFAULT_BROKER_URL || 'wss://test.mosquitto.org:8081/mqtt',
      clientId: `${import.meta.env.VITE_DEFAULT_CLIENT_ID_PREFIX || 'mqttui_'}${crypto.randomUUID().slice(0, 8)}`,
      keepalive: Number(import.meta.env.VITE_DEFAULT_KEEPALIVE) || 60,
      cleanStart: true,
      sessionExpiry: 0,
    }
  );

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Profile Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="My MQTT Broker"
        required
        fullWidth
      />

      <Input
        label="Broker URL"
        value={formData.url}
        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        placeholder="wss://broker.example.com:8083/mqtt"
        required
        fullWidth
      />

      <Input
        label="Client ID"
        value={formData.clientId || ''}
        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
        placeholder="Auto-generated if empty"
        fullWidth
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Username"
          value={formData.username || ''}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          placeholder="Optional"
          fullWidth
        />

        <Input
          label="Password"
          type="password"
          value={formData.passwordEnc || ''}
          onChange={(e) => setFormData({ ...formData, passwordEnc: btoa(e.target.value) })}
          placeholder="Optional"
          fullWidth
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Keepalive (seconds)"
          type="number"
          value={formData.keepalive || 60}
          onChange={(e) => setFormData({ ...formData, keepalive: Number(e.target.value) })}
          min={1}
          max={300}
          fullWidth
        />

        <Input
          label="Session Expiry (seconds)"
          type="number"
          value={formData.sessionExpiry || 0}
          onChange={(e) => setFormData({ ...formData, sessionExpiry: Number(e.target.value) })}
          min={0}
          fullWidth
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="cleanStart"
          checked={formData.cleanStart ?? true}
          onChange={(e) => setFormData({ ...formData, cleanStart: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="cleanStart" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
          Clean Start
        </label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading} fullWidth>
          {loading ? 'Saving...' : initialData ? 'Update Profile' : 'Create Profile'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
