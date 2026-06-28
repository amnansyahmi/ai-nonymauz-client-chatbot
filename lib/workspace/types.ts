import type {
  ActivityItem,
  Appointment,
  BudgetItem,
  ChecklistItem,
  Guest,
  PlannerProfile
} from '@/components/planner/types';

/**
 * The full planner workspace as exchanged between the client and the DB.
 * Each field maps 1:1 to a JSONB column on `user_workspace` and to the
 * localStorage blobs the client already keeps. All optional so a partial
 * save (or a fresh owner) is valid.
 */
export type WorkspaceData = {
  profile?: PlannerProfile;
  checklist?: {
    title?: string;
    items?: ChecklistItem[];
  };
  budget?: {
    items?: BudgetItem[];
  };
  appointments?: Appointment[];
  guests?: Guest[];
  vendors?: {
    saved?: string[];
    rsvpFormUrl?: string;
  };
  activity?: ActivityItem[];
  settings?: {
    language?: 'ms' | 'en';
  };
};

export const WORKSPACE_DOMAINS = [
  'profile',
  'checklist',
  'budget',
  'appointments',
  'guests',
  'vendors',
  'activity',
  'settings'
] as const;
