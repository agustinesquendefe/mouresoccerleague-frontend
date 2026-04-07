export type StandingRow = {
  id?: number;
  event_id: number;
  team_id: number;
  position?: number | null;
  team_name?: string | null;
  played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  goal_difference?: number | null;
  points?: number | null;
  updated_at?: string | null;
};