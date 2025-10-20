// Hook for managing profiles

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllProfiles, createProfile, updateProfile, deleteProfile, createDefaultProfile } from './repo';
import type { ConnectionProfile } from '../mqtt/types';

export function useProfiles() {
  const profiles = useLiveQuery(() => getAllProfiles(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create default profile if none exist
  useEffect(() => {
    if (profiles && profiles.length === 0) {
      createDefaultProfile().catch(console.error);
    }
  }, [profiles]);

  const create = async (profile: ConnectionProfile) => {
    setLoading(true);
    setError(null);
    try {
      await createProfile(profile);
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string, updates: Partial<ConnectionProfile>) => {
    setLoading(true);
    setError(null);
    try {
      await updateProfile(id, updates);
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteProfile(id);
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return {
    profiles: profiles || [],
    loading,
    error,
    create,
    update,
    remove,
  };
}
