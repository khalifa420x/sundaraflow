import type { Timestamp } from 'firebase/firestore';

// ── Enums / Union Types ──────────────────────────────────────────────────────

export type UserRole = 'coach' | 'client';

export type GoalType =
  | 'weight_loss'
  | 'muscle_gain'
  | 'endurance'
  | 'maintenance';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type ClientStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// ── Sub-interfaces ───────────────────────────────────────────────────────────

export interface ClientProfile {
  age?: number;
  height?: number;       // cm
  weight?: number;       // kg
  goal?: GoalType;
  activityLevel?: ActivityLevel;
}

// ── Core User model (mirrors Firestore users/{uid}) ─────────────────────────

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Timestamp;

  // Optional fields
  avatarUrl?: string;
  migrated?: boolean;   // set to true after migrateUsers.ts has run

  // Client-only fields (absent on coach docs)
  coachId?: string;
  status?: ClientStatus;
  inviteToken?: string;
  profile?: ClientProfile;
}

// ── Partial update type (uid and createdAt are immutable) ───────────────────

export type AppUserUpdate = Partial<Omit<AppUser, 'uid' | 'createdAt'>>;
