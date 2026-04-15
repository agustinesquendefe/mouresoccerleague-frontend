export type MatchFormatRecord = {
  id: number;
  key: string;
  name: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
  created_at: string;
  updated_at: string;
};

export type MatchFormatFormData = {
  key: string;
  name: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
};
