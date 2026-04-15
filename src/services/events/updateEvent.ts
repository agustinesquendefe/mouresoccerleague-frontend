import { supabase } from '@/lib/supabaseClient';
import type { Event, EventFormData } from '@/models/event';

export async function updateEvent(
  id: number,
  payload: EventFormData
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({
      key: payload.key,
      name: payload.name,
      league_id: 1,
      season_id: payload.season_id,
      category_id: payload.category_id ?? null,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      auto: payload.auto,
      status: payload.status,
      format_type: payload.format_type,
      round_robin_cycles: payload.round_robin_cycles,
      match_day_of_week: payload.match_day_of_week,
      match_format: payload.match_format,
      venue_type: payload.venue_type,
      field_count: payload.field_count,
      match_duration_minutes: payload.match_duration_minutes,
      simultaneous_matches: payload.simultaneous_matches,

      has_playoffs: payload.has_playoffs,
      playoff_teams_count: payload.playoff_teams_count,
      playoff_home_away: payload.playoff_home_away,
      group_count: payload.format_type === 'groups' ? payload.group_count : null,
      points_win: payload.points_win ?? null,
      points_draw: payload.points_draw ?? null,
      points_loss: payload.points_loss ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as Event;
}