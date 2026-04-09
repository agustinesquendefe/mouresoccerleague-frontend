import { supabase } from '@/lib/supabaseClient';
import type { Category, CategoryFormData } from '@/models/category';

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function createCategory(payload: CategoryFormData): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: payload.name, description: payload.description || null }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function updateCategory(id: number, payload: CategoryFormData): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: payload.name, description: payload.description || null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Category;
}

export async function deleteCategory(id: number): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
