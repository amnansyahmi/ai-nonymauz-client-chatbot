'use client';

import { useCallback, useMemo } from 'react';
import { defaultPlannerProfile, storageKeys } from '../data';
import type { AppLanguage, PlannerProfile } from '../types';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import { parsePlannerSetup } from '../utils';

const PROFILE_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
];

export type UsePlannerProfileResult = {
  profile: PlannerProfile;
  hydrated: boolean;
  update: (patch: Partial<PlannerProfile>) => void;
  applyFromText: (text: string) => boolean;
  reset: () => void;
  coupleDisplayName: string;
  coupleInitials: string;
  coupleMeta: string;
  sidebarDateLabel: string;
  daysLeft: number | null;
  profileStates: string[];
};

export function usePlannerProfile(language: AppLanguage): UsePlannerProfileResult {
  const [stored, setStored, hydrated] = useLocalStorage<PlannerProfile>(storageKeys.plannerProfile, defaultPlannerProfile);

  const profile = useMemo<PlannerProfile>(
    () => ({
      ...defaultPlannerProfile,
      ...stored,
      weddingStyle: stored.weddingStyle || '',
      keyContact: stored.keyContact || ''
    }),
    [stored]
  );

  const update = useCallback(
    (patch: Partial<PlannerProfile>) => {
      setStored((current) => ({ ...current, ...patch }));
    },
    [setStored]
  );

  const applyFromText = useCallback(
    (text: string) => {
      const setupPatch = parsePlannerSetup(text, PROFILE_STATES);
      if (Object.keys(setupPatch).length === 0) return false;
      setStored((current) => {
        const nextProfile = { ...current, ...setupPatch };
        const derivedCoupleName =
          nextProfile.coupleName.trim() ||
          [nextProfile.groomName.trim(), nextProfile.brideName.trim()].filter(Boolean).join(' & ');
        return {
          ...nextProfile,
          coupleName: derivedCoupleName,
          completed: Boolean(derivedCoupleName || nextProfile.majlisDate || nextProfile.totalBudget || nextProfile.guestTarget)
        };
      });
      return true;
    },
    [setStored]
  );

  const reset = useCallback(() => {
    setStored(defaultPlannerProfile);
  }, [setStored]);

  const coupleDisplayName = useMemo(
    () =>
      profile.coupleName.trim() ||
      [profile.groomName.trim(), profile.brideName.trim()].filter(Boolean).join(' & ') ||
      (language === 'ms' ? 'Profil pasangan' : 'Couple profile'),
    [profile, language]
  );

  const coupleInitials = useMemo(() => {
    return (
      coupleDisplayName
        .split(/\s+|&/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'MM'
    );
  }, [coupleDisplayName]);

  const coupleMeta = useMemo(
    () =>
      profile.majlisDate ||
      (profile.negeri ? `${profile.negeri} - ${profile.guestTarget} pax` : `${profile.guestTarget} pax`),
    [profile]
  );

  const sidebarDateLabel = useMemo(() => {
    if (!profile.majlisDate) return language === 'ms' ? 'Belum ditetapkan' : 'Not set yet';
    return new Date(`${profile.majlisDate}T00:00:00`).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [profile.majlisDate, language]);

  const daysLeft = useMemo(() => {
    if (!profile.majlisDate) return null;
    const target = new Date(`${profile.majlisDate}T00:00:00`).getTime();
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Math.ceil((target - start) / 86400000);
  }, [profile.majlisDate]);

  return {
    profile,
    hydrated,
    update,
    applyFromText,
    reset,
    coupleDisplayName,
    coupleInitials,
    coupleMeta,
    sidebarDateLabel,
    daysLeft,
    profileStates: PROFILE_STATES
  };
}
