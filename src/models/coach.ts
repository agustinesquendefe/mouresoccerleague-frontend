import type { Team } from './team';

export type Coach = {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CoachWithTeams = Coach & {
  teams?: Team[];
};

export function getCoachFullName(coach: Pick<Coach, 'first_name' | 'last_name'>) {
  return `${coach.first_name} ${coach.last_name}`.trim();
}