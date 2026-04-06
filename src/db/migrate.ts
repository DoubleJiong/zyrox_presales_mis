import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { config as loadDotenv } from 'dotenv';
import { Client } from 'pg';

import { getEnv } from '@/shared/config/env';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'src/db/migrations');
const MIGRATION_TABLE = 'app_sql_migration_history';
const SQL_MIGRATION_PATTERN = /^\d+_.+\.sql$/;

loadDotenv({ path: path.resolve(process.cwd(), '.env') });
loadDotenv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

type CliOptions = {
  file?: string;
  baselineThrough?: string;
  list: boolean;
  all: boolean;
  allowDestructive: boolean;
  help: boolean;
};

type MigrationRecord = {
  fileName: string;
  checksum: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    list: false,
    all: false,
    allowDestructive: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--list') {
      options.list = true;
      continue;
    }

    if (arg === '--all') {
      options.all = true;
      continue;
    }

    if (arg === '--allow-destructive') {
      options.allowDestructive = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--file') {
      const fileName = argv[index + 1];
      if (!fileName) {
        throw new Error('Missing value for --file');
      }
      options.file = fileName;
      index += 1;
      continue;
    }

    if (arg === '--baseline-through') {
      const fileName = argv[index + 1];
      if (!fileName) {
        throw new Error('Missing value for --baseline-through');
      }
      options.baselineThrough = fileName;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const selectedActions = [
    options.list,
    options.all,
    Boolean(options.file),
    Boolean(options.baselineThrough),
  ].filter(Boolean).length;

  if (selectedActions > 1) {
    throw new Error('Use only one of --list, --all, --file <name>, or --baseline-through <name>.');
  }

  return options;
}

function printUsage(): void {
  console.log([
    'Usage: pnpm db:migrate [--file <name> | --baseline-through <name> | --all] [--allow-destructive] [--list]',
    '',
    'Options:',
    '  --file <name>           Run a single numbered SQL migration file',
    '  --baseline-through <name>  Record numbered SQL migrations up to <name> as already applied',
    '  --all                   Run all pending numbered SQL migrations',
    '  --allow-destructive     Allow migrations containing DROP TABLE',
    '  --list                  List numbered SQL migrations and applied status',
    '  -h, --help              Show this help message',
    '',
    'Safety rules:',
    '  1. If migration history is empty, the runner refuses implicit replay.',
    '  2. Use --file for targeted production changes on existing databases.',
    '  3. Use --baseline-through only after confirming the target database already contains those schema changes.',
    '  4. Use --all only for fresh or explicitly bootstrapped environments.',
  ].join('\n'));
}

async function getSqlMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SQL_MIGRATION_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function isDestructiveSql(content: string): boolean {
  return /\bDROP\s+TABLE\b/i.test(content);
}

async function getMigrationChecksum(fileName: string): Promise<string> {
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const sqlContent = await readFile(filePath, 'utf8');
  return sha256(sqlContent);
}

async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      file_name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client: Client): Promise<Map<string, MigrationRecord>> {
  const result = await client.query<MigrationRecord>(`
    SELECT file_name AS "fileName", checksum
    FROM ${MIGRATION_TABLE}
    ORDER BY file_name
  `);

  return new Map(result.rows.map((row) => [row.fileName, row]));
}

async function printMigrationList(client: Client, fileNames: string[]): Promise<void> {
  const applied = await getAppliedMigrations(client);
  for (const fileName of fileNames) {
    const status = applied.has(fileName) ? 'applied' : 'pending';
    console.log(`${status.padEnd(7)} ${fileName}`);
  }
}

async function baselineMigrationFiles(client: Client, fileNames: string[]): Promise<void> {
  const applied = await getAppliedMigrations(client);

  await client.query('BEGIN');
  try {
    for (const fileName of fileNames) {
      const checksum = await getMigrationChecksum(fileName);
      const existing = applied.get(fileName);

      if (existing) {
        if (existing.checksum !== checksum) {
          throw new Error(`Migration checksum mismatch for ${fileName}. Refusing to continue.`);
        }
        console.log(`skip ${fileName} (already applied)`);
        continue;
      }

      await client.query(
        `INSERT INTO ${MIGRATION_TABLE} (file_name, checksum) VALUES ($1, $2)`,
        [fileName, checksum],
      );
      console.log(`baseline ${fileName}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function runMigrationFile(client: Client, fileName: string, allowDestructive: boolean): Promise<void> {
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  const sqlContent = await readFile(filePath, 'utf8');
  const checksum = sha256(sqlContent);

  const applied = await getAppliedMigrations(client);
  const existing = applied.get(fileName);

  if (existing) {
    if (existing.checksum !== checksum) {
      throw new Error(`Migration checksum mismatch for ${fileName}. Refusing to continue.`);
    }
    console.log(`skip ${fileName} (already applied)`);
    return;
  }

  if (isDestructiveSql(sqlContent) && !allowDestructive) {
    throw new Error(`Migration ${fileName} contains DROP TABLE. Re-run with --allow-destructive after backup confirmation.`);
  }

  console.log(`apply ${fileName}`);

  await client.query('BEGIN');
  try {
    await client.query(sqlContent);
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (file_name, checksum) VALUES ($1, $2)`,
      [fileName, checksum],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const fileNames = await getSqlMigrationFiles();
  if (fileNames.length === 0) {
    throw new Error('No numbered SQL migrations found.');
  }

  const client = new Client({
    connectionString: getEnv().DATABASE_URL,
  });

  await client.connect();

  try {
    await ensureMigrationTable(client);

    if (options.list) {
      await printMigrationList(client, fileNames);
      return;
    }

    const applied = await getAppliedMigrations(client);
    const pendingFiles = fileNames.filter((fileName) => !applied.has(fileName));

    if (options.file) {
      if (!fileNames.includes(options.file)) {
        throw new Error(`Migration file not found: ${options.file}`);
      }
      await runMigrationFile(client, options.file, options.allowDestructive);
      return;
    }

    if (options.baselineThrough) {
      if (!fileNames.includes(options.baselineThrough)) {
        throw new Error(`Migration file not found: ${options.baselineThrough}`);
      }

      const baselineFiles = fileNames.filter((fileName) => fileName <= options.baselineThrough!);
      await baselineMigrationFiles(client, baselineFiles);
      return;
    }

    if (!options.all) {
      if (applied.size === 0) {
        throw new Error(
          'Migration history is empty. Refusing implicit replay on an existing database. Use --file <name> for targeted execution or --all for a fresh environment.',
        );
      }

      if (pendingFiles.length === 0) {
        console.log('No pending SQL migrations.');
        return;
      }

      throw new Error(`Found ${pendingFiles.length} pending SQL migrations. Re-run with --all or --file <name>.`);
    }

    if (pendingFiles.length === 0) {
      console.log('No pending SQL migrations.');
      return;
    }

    for (const fileName of pendingFiles) {
      await runMigrationFile(client, fileName, options.allowDestructive);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});