import type { Coach } from './coach';
import type { Team } from './team';

export type TeamCoach = {
  id: number;
  team_id: number;
  coach_id: number;
  role?: string | null;
  created_at?: string | null;
};

export type TeamCoachWithCoach = TeamCoach & {
  coach?: Coach | null;
};

export type TeamCoachWithTeam = TeamCoach & {
  team?: Team | null;
};