'use client';

import { useMemo, useState } from 'react';
import { CalendarCheck, Mail, Phone } from 'lucide-react';
import type { FieldType, FormatSupported } from '@/models/field';
import { getLocalDateString } from '@/utils/dateOnly';

type AvailableField = {
  id: number;
  name: string;
  key: string;
  fieldType: FieldType;
  notes: string | null;
  available: boolean;
};

type AvailabilityResponse = {
  date: string;
  time: string;
  format: FormatSupported;
  fieldType: FieldType;
  fields: AvailableField[];
};

type Props = {
  contactEmail: string;
  contactPhone: string;
};

const today = getLocalDateString();

export default function ReserveAvailabilityForm({ contactEmail, contactPhone }: Props) {
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [format, setFormat] = useState<FormatSupported>('7v7');
  const [fieldType, setFieldType] = useState<FieldType>('outside');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);

  const availableFields = useMemo(
    () => availability?.fields.filter((field) => field.available) ?? [],
    [availability]
  );

  const reservationSubject = encodeURIComponent('Field reservation request');
  const reservationBody = encodeURIComponent(
    `Reservation request\nDate: ${date}\nTime: ${time}\nFormat: ${format}\nField type: ${fieldType}\n\nPlease confirm availability and reservation details.`
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);
      setErrorMessage(null);
      setAvailability(null);

      const response = await fetch('/api/reserve/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          time,
          format,
          fieldType,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to check field availability.');
      }

      setAvailability(payload.data as AvailabilityResponse);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to check field availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-lg p-6 shadow-sm bg-white">
      <div className="flex items-start gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-blue, #023467)' }}
        >
          <CalendarCheck size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-filson-black" style={{ color: 'var(--color-blue, #023467)' }}>
            Check field availability
          </h2>
          <p className="text-sm text-gray-500 font-filson-regular">
            Search by date, time, format, and indoor/outdoor preference.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
            Day
          </span>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
            Time
          </span>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
            Format
          </span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as FormatSupported)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="5v5">5v5</option>
            <option value="7v7">7v7</option>
            <option value="11v11">11v11</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-filson-bold text-gray-700 mb-1 uppercase tracking-wide">
            Field type
          </span>
          <select
            value={fieldType}
            onChange={(event) => setFieldType(event.target.value as FieldType)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-filson-regular bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="outside">Outside</option>
            <option value="inside">Inside</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 rounded bg-red-500 px-6 py-3 text-sm font-filson-black uppercase tracking-widest text-white hover:bg-red-600 transition disabled:opacity-60"
        >
          {loading ? 'Checking...' : 'Check Availability'}
        </button>
      </form>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {availability ? (
        <div className="mt-6 space-y-3">
          <div>
            <h3 className="font-filson-black text-lg">Results</h3>
            <p className="text-sm text-gray-500">
              {availableFields.length} available field{availableFields.length === 1 ? '' : 's'} found.
            </p>
          </div>

          {availability.fields.length === 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              No fields match this format and field type. Contact the company to review alternatives.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availability.fields.map((field) => (
                <div
                  key={field.id}
                  className={`rounded-lg border p-4 ${
                    field.available
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-filson-black">{field.name}</h4>
                    <span
                      className={`text-xs font-filson-bold uppercase ${
                        field.available ? 'text-green-700' : 'text-gray-500'
                      }`}
                    >
                      {field.available ? 'Available' : 'Busy'}
                    </span>
                  </div>
                  {field.notes ? <p className="mt-1 text-sm text-gray-600">{field.notes}</p> : null}
                </div>
              ))}
            </div>
          )}

          {availableFields.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`tel:${contactPhone}`}
                className="inline-flex items-center justify-center gap-2 rounded px-5 py-3 text-sm font-filson-black uppercase tracking-widest text-white hover:opacity-90 transition"
                style={{ background: 'var(--color-blue, #023467)' }}
              >
                <Phone size={18} />
                Call to Reserve
              </a>
              <a
                href={`mailto:${contactEmail}?subject=${reservationSubject}&body=${reservationBody}`}
                className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 px-5 py-3 text-sm font-filson-black uppercase tracking-widest hover:bg-gray-50 transition"
              >
                <Mail size={18} />
                Email Request
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
