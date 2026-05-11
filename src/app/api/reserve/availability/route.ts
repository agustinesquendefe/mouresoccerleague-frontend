import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { FieldType, FormatSupported } from '@/models/field';

type AvailabilityRequest = {
  date?: string;
  time?: string;
  format?: FormatSupported;
  fieldType?: FieldType;
};

const FORMATS = new Set(['5v5', '7v7', '11v11']);
const FIELD_TYPES = new Set(['inside', 'outside']);

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AvailabilityRequest;
    const date = body.date?.trim();
    const time = body.time?.trim();
    const format = body.format;
    const fieldType = body.fieldType;

    if (!date || !time || !format || !fieldType) {
      return NextResponse.json(
        { error: 'Date, time, format, and field type are required.' },
        { status: 400 }
      );
    }

    if (!FORMATS.has(format) || !FIELD_TYPES.has(fieldType)) {
      return NextResponse.json({ error: 'Invalid reservation filters.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const normalizedTime = normalizeTime(time);

    const [{ data: fields, error: fieldsError }, { data: busyMatches, error: matchesError }] =
      await Promise.all([
        supabaseAdmin
          .from('fields')
          .select(`
            id,
            name,
            key,
            field_type,
            notes,
            field_formats (
              id,
              field_id,
              format_type
            )
          `)
          .eq('is_active', true)
          .eq('field_type', fieldType),
        supabaseAdmin
          .from('matches')
          .select('id, field_id, date, time, status')
          .eq('date', date)
          .eq('time', normalizedTime)
          .not('field_id', 'is', null)
          .neq('status', 'cancelled'),
      ]);

    if (fieldsError) throw new Error(fieldsError.message);
    if (matchesError) throw new Error(matchesError.message);

    const busyFieldIds = new Set((busyMatches ?? []).map((match) => Number(match.field_id)));
    const availableFields = ((fields ?? []) as any[])
      .filter((field) => {
        const formats = field.field_formats ?? [];
        return formats.some((item: any) => item.format_type === format);
      })
      .map((field) => ({
        id: Number(field.id),
        name: field.name,
        key: field.key,
        fieldType: field.field_type,
        notes: field.notes ?? null,
        available: !busyFieldIds.has(Number(field.id)),
      }))
      .sort((left, right) => {
        if (left.available !== right.available) return left.available ? -1 : 1;
        return String(left.name ?? '').localeCompare(String(right.name ?? ''));
      });

    return NextResponse.json({
      data: {
        date,
        time,
        format,
        fieldType,
        fields: availableFields,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to check field availability.' },
      { status: 500 }
    );
  }
}
