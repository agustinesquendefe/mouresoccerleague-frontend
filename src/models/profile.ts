export type Profile = {
  id: string; // uuid — references auth.users
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProfileFormData = {
  full_name: string;
  role: 'admin' | 'editor' | 'viewer';
};
