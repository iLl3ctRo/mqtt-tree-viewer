// Profile switcher component

import { useTranslation } from 'react-i18next';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useProfiles } from './useProfiles';
import type { ConnectionProfile } from '../mqtt/types';

export interface ProfileSwitcherProps {
  selectedProfileId?: string;
  onSelect: (profile: ConnectionProfile) => void;
  onNew?: () => void;
  onEdit?: (profile: ConnectionProfile) => void;
  onDelete?: (profileId: string) => void;
}

export function ProfileSwitcher({ selectedProfileId, onSelect, onNew, onEdit, onDelete }: ProfileSwitcherProps) {
  const { t } = useTranslation();
  const { profiles } = useProfiles();

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select
          label={t('profile.name')}
          value={selectedProfileId || ''}
          onChange={(e) => {
            const profile = profiles.find((p) => p.id === e.target.value);
            if (profile) onSelect(profile);
          }}
          options={profiles.map((p) => ({ value: p.id, label: p.name }))}
          fullWidth
        />
        {onNew && (
          <Button variant="secondary" size="md" onClick={onNew} className="mt-6">
            {t('profile.new')}
          </Button>
        )}
      </div>

      {selectedProfile && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm space-y-1">
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">URL:</span> {selectedProfile.url}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">{t('profile.clientId')}:</span> {selectedProfile.clientId || t('profile.clientIdPlaceholder')}
              </p>
              {selectedProfile.username && (
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{t('profile.username')}:</span> {selectedProfile.username}
                </p>
              )}
            </div>
            <div className="flex gap-2 ml-3">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(selectedProfile)}>
                  {t('profile.edit')}
                </Button>
              )}
              {onDelete && profiles.length > 1 && (
                <Button variant="danger" size="sm" onClick={() => onDelete(selectedProfile.id)}>
                  {t('profile.delete')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
