export type EventGroup = {
  id: number;
  event_id: number;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type EventGroupTeam = {
  event_team_id: number;
  team_id: number;
  team_name: string;
};

export type EventGroupWithTeams = EventGroup & {
  teams: EventGroupTeam[];
};
