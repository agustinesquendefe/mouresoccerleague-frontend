export type Category = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryFormData = {
  name: string;
  description: string;
};
