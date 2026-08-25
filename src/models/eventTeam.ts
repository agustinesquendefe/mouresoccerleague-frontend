export type EventTeamStatus = 'active' | 'disqualified';

export type EventTeamParticipation = {
  id: number;
  event_id: number;
  team_id: number;
  display_name: string | null;
  order_index: number;
  status: EventTeamStatus;
};
