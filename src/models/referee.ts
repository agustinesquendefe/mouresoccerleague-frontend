export type Referee = {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function getRefereeFullName(
  referee: Pick<Referee, 'first_name' | 'last_name'>
) {
  return `${referee.first_name} ${referee.last_name}`.trim();
}