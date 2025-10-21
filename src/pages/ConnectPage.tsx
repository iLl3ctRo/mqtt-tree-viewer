// Connection page with profile management

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProfileSwitcher } from '../modules/profiles/ProfileSwitcher';
import { ProfileForm } from '../modules/profiles/ProfileForm';
import { Button } from '../modules/ui/Button';
import { Input } from '../modules/ui/Input';
import { LanguageSwitcher } from '../modules/ui/LanguageSwitcher';
import { useProfiles } from '../modules/profiles/useProfiles';
import { useMqttClientContext } from '../app/App';
import { useConnectionStore } from '../modules/mqtt/useConnectionStore';
import { useToast } from '../modules/ui/Toast';
import type { ConnectionProfile, SubscriptionSpec } from '../modules/mqtt/types';

export function ConnectPage() {
  const { t } = useTranslation();
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
      toast.error(t('connect.selectProfile'));
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
      toast.success(t('status.connectionSuccess'));
      navigate('/explorer');
    } catch (error) {
      toast.error(`${t('status.connectionFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveProfile = async (profile: ConnectionProfile) => {
    try {
      if (editingProfile) {
        await update(profile.id, profile);
        toast.success(t('profile.updated'));
      } else {
        await create(profile);
        toast.success(t('profile.created'));
      }
      setShowProfileForm(false);
      setEditingProfile(null);
      setSelectedProfile(profile);
    } catch (error) {
      toast.error(`${t('profile.saveFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length === 1) {
      toast.warning(t('profile.cannotDeleteLast'));
      return;
    }

    try {
      await remove(profileId);
      toast.success(t('profile.deleted'));
      setSelectedProfile(profiles.find((p) => p.id !== profileId) || null);
    } catch (error) {
      toast.error(`${t('profile.deleteFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (showProfileForm || (profiles.length === 0 && !selectedProfile)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {editingProfile ? t('profile.edit') : t('profile.create')}
            </h1>
            <LanguageSwitcher />
          </div>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('connect.title')}</h1>
          <LanguageSwitcher />
        </div>

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
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{t('connect.subscription')}</h2>
            <div className="space-y-3">
              <Input
                label={t('connect.topicFilter')}
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                placeholder={t('connect.topicFilterPlaceholder')}
                fullWidth
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('connect.qosLevel')}</label>
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('connect.qos')} {qos}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={handleConnect} disabled={connecting || !selectedProfile}>
            {connecting ? t('connect.connecting') : t('connect.connect')}
          </Button>
        </div>
      </div>
    </div>
  );
}
