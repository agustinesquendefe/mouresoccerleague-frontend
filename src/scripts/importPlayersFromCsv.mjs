import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_FILE = 'Registro de credenciales-Actualizado.csv';
const INSERT_CHUNK_SIZE = 500;

function getArgValue(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];

  return null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeDocumentId(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.padStart(9, '0');
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function splitName(fullName) {
  const clean = normalizeText(fullName);
  if (!clean) return { first_name: '', last_name: '' };

  const parts = clean.split(' ');
  return {
    first_name: parts[0] ?? '',
    last_name: parts.slice(1).join(' ') ?? '',
  };
}

function parseBoolean(value) {
  const v = normalizeText(value).toLowerCase();
  return v === 'yes' || v === 'true' || v === '1' || v === 'x' || v === 'si' || v === 'sí';
}

function parsePaidMembership(value) {
  const raw = normalizeText(value).replace(/\$/g, '').replace(/,/g, '');
  if (!raw) return 0;

  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function parseUsDate(value) {
  const raw = normalizeText(value).replace(/^F-/, '');
  if (!raw) return null;

  const [m, d, y] = raw.split('/');
  if (!m || !d || !y) return null;

  const year = y.length === 2 ? `20${y}` : y;
  const month = m.padStart(2, '0');
  const day = d.padStart(2, '0');
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function mapCsvRow(row, rowNumber) {
  const document_id = normalizeDocumentId(row.Entry);
  const full_name = normalizeText(row['F-']);
  const birth_date = parseUsDate(row['DOB - MDA']);
  const registered_at = parseUsDate(row.FIRMA);

  if (!document_id || !full_name) {
    return {
      skipped: true,
      rowNumber,
      reason: 'Missing document id or player name.',
    };
  }

  const { first_name, last_name } = splitName(full_name);

  return {
    skipped: false,
    rowNumber,
    player: {
      document_id,
      first_name,
      last_name,
      birth_date,
      we_have_id: parseBoolean(row['WE HAVE ID']),
      paid_membership: parsePaidMembership(row['Paid Soccer ID']),
      registered_at,
      is_active: true,
    },
  };
}

async function readCsv(filePath) {
  const rows = [];
  const contents = fs.readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith('Entry,F-'));

  if (headerIndex < 0) {
    throw new Error('CSV header row not found. Expected a row starting with "Entry,F-".');
  }

  await new Promise((resolve, reject) => {
    Readable.from(lines.slice(headerIndex).join('\n'))
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  return rows;
}

function validateRows(csvRows) {
  const mapped = csvRows.map((row, index) => mapCsvRow(row, index + 2));
  const skipped = mapped.filter((row) => row.skipped);
  const players = mapped.filter((row) => !row.skipped).map((row) => row.player);
  const duplicates = new Map();

  for (const player of players) {
    const rows = duplicates.get(player.document_id) ?? [];
    rows.push(player);
    duplicates.set(player.document_id, rows);
  }

  const duplicateDocumentIds = Array.from(duplicates.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([documentId]) => documentId);

  return {
    players,
    skipped,
    duplicateDocumentIds,
  };
}

function removeDuplicateDocumentIds(players, duplicateDocumentIds) {
  const duplicateSet = new Set(duplicateDocumentIds);
  return players.filter((player) => !duplicateSet.has(player.document_id));
}

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function deleteExistingPlayers(supabase) {
  const { count: beforeCount, error: countError } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true });

  if (countError) throw new Error(countError.message);

  const { error } = await supabase
    .from('players')
    .delete()
    .not('id', 'is', null);

  if (error) throw new Error(error.message);

  return beforeCount ?? 0;
}

async function insertPlayers(supabase, players) {
  let insertedCount = 0;

  for (let index = 0; index < players.length; index += INSERT_CHUNK_SIZE) {
    const chunk = players.slice(index, index + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from('players').insert(chunk);

    if (error) throw new Error(error.message);
    insertedCount += chunk.length;
  }

  return insertedCount;
}

async function main() {
  const fileArg = getArgValue('--file');
  const filePath = path.resolve(process.cwd(), fileArg || DEFAULT_FILE);
  const reset = hasFlag('--reset');

  if (reset && !fileArg) {
    throw new Error('The destructive --reset import requires an explicit --file path.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvRows = await readCsv(filePath);
  const skipDuplicateDocumentIds = hasFlag('--skip-duplicate-document-ids');
  const { players, skipped, duplicateDocumentIds } = validateRows(csvRows);
  const playersToImport = skipDuplicateDocumentIds
    ? removeDuplicateDocumentIds(players, duplicateDocumentIds)
    : players;

  console.log('CSV file:', filePath);
  console.log('Rows read:', csvRows.length);
  console.log('Valid players:', players.length);
  console.log('Skipped rows:', skipped.length);

  if (skipped.length) {
    console.log('Skipped preview:', skipped.slice(0, 10));
  }

  if (duplicateDocumentIds.length) {
    console.error('Duplicate document ids:', duplicateDocumentIds.join(', '));
    if (!skipDuplicateDocumentIds) {
      throw new Error('Fix duplicated document ids in the CSV or add --skip-duplicate-document-ids before importing.');
    }
    console.log('Players omitted because of duplicated document ids:', players.length - playersToImport.length);
  }

  console.log('Players to import:', playersToImport.length);
  console.log('Player preview:', playersToImport.slice(0, 5));

  if (!reset) {
    console.log('Validation completed. Add --reset to delete existing players and import this CSV.');
    return;
  }

  const supabase = createSupabaseClient();
  const deletedCount = await deleteExistingPlayers(supabase);
  const insertedCount = await insertPlayers(supabase, playersToImport);

  console.log('Deleted existing players:', deletedCount);
  console.log('Inserted players:', insertedCount);
  console.log('Import completed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
