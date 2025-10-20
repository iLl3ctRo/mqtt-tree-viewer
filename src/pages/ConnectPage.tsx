// Connection page with profile management

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileSwitcher } from '../modules/profiles/ProfileSwitcher';
import { ProfileForm } from '../modules/profiles/ProfileForm';
import { Button } from '../modules/ui/Button';
import { Input } from '../modules/ui/Input';
import { useProfiles } from '../modules/profiles/useProfiles';
import { useMqttClientContext } from '../app/App';
import { useConnectionStore } from '../modules/mqtt/useConnectionStore';
import { useToast } from '../modules/ui/Toast';
import type { ConnectionProfile, SubscriptionSpec } from '../modules/mqtt/types';

export function ConnectPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { profiles, create, update, remove } = useProfiles();
  const { connect } = useMqttClientContext();
  const setActiveProfile = useConnectionStore((s) => s.setActiveProfile);

  const [selectedProfile, setSelectedProfile] = useState<ConnectionProfile | null>(
    profiles.length > 0 ? profiles[0] : null
  );
  const [subscriptionFilter, setSubscriptionFilter] = useState('#');
  const [subscriptionQos, setSubscriptionQos] = useState<0 | 1 | 2>(0);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ConnectionProfile | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!selectedProfile) {
      toast.error('Please select a connection profile');
      return;
    }

    const subscriptions: SubscriptionSpec[] = [
      {
        filter: subscriptionFilter,
        qos: subscriptionQos,
      },
    ];

    setConnecting(true);
    try {
      await connect(selectedProfile, subscriptions);
      setActiveProfile(selectedProfile);
      toast.success('Connected to broker');
      navigate('/explorer');
    } catch (error) {
      toast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveProfile = async (profile: ConnectionProfile) => {
    try {
      if (editingProfile) {
        await update(profile.id, profile);
        toast.success('Profile updated');
      } else {
        await create(profile);
        toast.success('Profile created');
      }
      setShowProfileForm(false);
      setEditingProfile(null);
      setSelectedProfile(profile);
    } catch (error) {
      toast.error(`Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length === 1) {
      toast.warning('Cannot delete the last profile');
      return;
    }

    try {
      await remove(profileId);
      toast.success('Profile deleted');
      setSelectedProfile(profiles.find((p) => p.id !== profileId) || null);
    } catch (error) {
      toast.error(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (showProfileForm || (profiles.length === 0 && !selectedProfile)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            {editingProfile ? 'Edit Profile' : 'Create Profile'}
          </h1>
          <ProfileForm
            initialData={editingProfile || undefined}
            onSubmit={handleSaveProfile}
            onCancel={() => {
              setShowProfileForm(false);
              setEditingProfile(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">MQTT Tree Viewer</h1>

        <div className="space-y-6">
          <ProfileSwitcher
            selectedProfileId={selectedProfile?.id}
            onSelect={setSelectedProfile}
            onNew={() => setShowProfileForm(true)}
            onEdit={(profile) => {
              setEditingProfile(profile);
              setShowProfileForm(true);
            }}
            onDelete={handleDeleteProfile}
          />

          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Subscription</h2>
            <div className="space-y-3">
              <Input
                label="Topic Filter"
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                placeholder="# (subscribe to all topics)"
                fullWidth
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QoS Level</label>
                <div className="flex gap-3">
                  {([0, 1, 2] as const).map((qos) => (
                    <label key={qos} className="flex items-center">
                      <input
                        type="radio"
                        name="qos"
                        value={qos}
                        checked={subscriptionQos === qos}
                        onChange={() => setSubscriptionQos(qos)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">QoS {qos}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={handleConnect} disabled={connecting || !selectedProfile}>
            {connecting ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
      </div>
    </div>
  );
}
