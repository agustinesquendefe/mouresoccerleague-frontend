import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CsvRow = {
  Entry?: string;
  'F-'?: string;
  'DOB - MDA'?: string;
  'WE HAVE ID'?: string;
  'Paid Soccer ID'?: string;
  FIRMA?: string;
  '2026'?: string;
};

function normalizeDocumentId(value: string | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(9, '0');
}

function splitName(fullName: string | undefined) {
  const clean = String(fullName ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) return { first_name: '', last_name: '' };

  const parts = clean.split(' ');
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' ') ?? '',
  };
}

function parseBoolean(value: string | undefined) {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1' || v === 'x';
}

function parsePaidMembership(value: string | undefined) {
  const raw = String(value ?? '').trim().replace(/\$/g, '').replace(/,/g, '');
  if (!raw) return 0;

  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function parseBirthDate(value: string | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const [m, d, y] = raw.split('/');
  if (!m || !d || !y) return null;

  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseRegisteredAt(value: string | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const clean = raw.replace(/^F-/, '');
  const [m, d, y] = clean.split('/');
  if (!m || !d || !y) return null;

  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function main() {
  const filePath = path.resolve(process.cwd(), 'Registro de credenciales-Actualizado.csv');

  console.log('Working directory:', process.cwd());
  console.log('CSV path:', filePath);

  const rows: CsvRow[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve())
      .on('error', reject);
  });

  console.log('Rows loaded:', rows.length);
  console.log('First row:', rows[0]);
  console.log('Second row:', rows[1]);

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const document_id = normalizeDocumentId(row['Entry']);
    const full_name = row['F-'];
    const birth_date = parseBirthDate(row['DOB - MDA']);
    const we_have_id = parseBoolean(row['WE HAVE ID']);
    const paid_membership = parsePaidMembership(row['Paid Soccer ID']);
    const registered_at = parseRegisteredAt(row['FIRMA']);

    if (!document_id || !full_name?.trim()) {
      skippedCount++;
      continue;
    }

    const { first_name, last_name } = splitName(full_name);

    const payload = {
      document_id,
      first_name,
      last_name,
      birth_date,
      we_have_id,
      paid_membership,
      registered_at,
    };

    if (insertedCount + skippedCount + errorCount < 5) {
      console.log('Payload preview:', payload);
    }

    const { error } = await supabase
      .from('players')
      .upsert(payload, { onConflict: 'document_id' });

    if (error) {
      errorCount++;
      console.error(`Failed for ${document_id}:`, error.message);
    } else {
      insertedCount++;
      console.log(`Imported ${document_id} - ${full_name}`);
    }
  }

  console.log('Inserted:', insertedCount);
  console.log('Skipped:', skippedCount);
  console.log('Errors:', errorCount);
  console.log('Import completed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});