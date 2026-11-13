/**
 * Post-conversion check for YAML flow definitions.
 *
 * For every `packages/domain/src/**\/*.flow.yaml`:
 *   1. runs `flowkit definitions validate` against the sibling `<name>.registries.yaml` manifest
 *      (a missing manifest is an error: without it, declared-ref checks are silently skipped);
 *   2. confirms the definition the application exports with the same `id` hashes identically to the
 *      YAML file, so the app really runs what the file says.
 *
 * Usage: bun run definitions:check
 */
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { FlowDefinition } from '@teopeurt/flowkit-core';
import { publishDefinition } from '@teopeurt/flowkit-temporal';
import * as domain from '@flowkit-demo/domain';

const root = resolve(import.meta.dir, '..');
const cli = resolve(root, 'node_modules/.bin/flowkit');

type CliFile = { path: string; kind: string; hash: string | null; issues: Array<{ path: string; line: number | null; column: number | null; code: string; message: string }>; message?: string };
type CliResult = { valid: boolean; skippedChecks: string[]; files: CliFile[]; error?: { message: string } };

const isDefinition = (value: unknown): value is FlowDefinition =>
  typeof value === 'object' && value !== null && 'id' in value && 'version' in value && 'stages' in value;
const exported = new Map(
  Object.values(domain).filter(isDefinition).map((definition) => [definition.id, definition] as const),
);

const files = [...new Bun.Glob('packages/domain/src/**/*.flow.yaml').scanSync({ cwd: root })].sort();
if (files.length === 0) {
  console.error('No *.flow.yaml definitions found under packages/domain/src.');
  process.exit(1);
}

let failures = 0;
const fail = (file: string, message: string) => {
  failures += 1;
  console.error(`  ✗ ${message}`);
};

for (const file of files) {
  console.log(`# ${file}`);
  const manifest = file.replace(/\.flow\.yaml$/, '.registries.yaml');
  if (!existsSync(resolve(root, manifest))) {
    fail(file, `missing registries manifest ${manifest}; declared-ref validation would be skipped`);
    continue;
  }

  const run = Bun.spawnSync([cli, 'definitions', 'validate', file, '--registries', manifest, '--json'], { cwd: root });
  let result: CliResult;
  try {
    result = JSON.parse(run.stdout.toString());
  } catch {
    fail(file, `flowkit CLI exited ${run.exitCode} without JSON output: ${run.stderr.toString().trim()}`);
    continue;
  }
  if (result.error) {
    fail(file, result.error.message);
    continue;
  }

  const [entry] = result.files;
  if (!entry || entry.kind !== 'valid') {
    if (entry?.message) fail(file, entry.message);
    for (const issue of entry?.issues ?? []) {
      fail(file, `${issue.path}:${issue.line ?? '-'}:${issue.column ?? '-'} ${issue.code} ${issue.message}`);
    }
    if (!entry) fail(file, 'flowkit CLI reported no result');
    continue;
  }
  console.log(`  ✓ valid against ${relative(root, resolve(root, manifest))}`);
  console.log(`  ✓ ${entry.hash}`);

  const id = (await Bun.file(resolve(root, file)).text()).match(/^id:\s*(\S+)\s*$/m)?.[1];
  const definition = id ? exported.get(id) : undefined;
  if (!definition) {
    fail(file, `no definition with id "${id}" is exported from @flowkit-demo/domain`);
    continue;
  }
  const appHash = publishDefinition({ definition }).definitionHash;
  if (appHash !== entry.hash) {
    fail(file, `exported "${id}" hashes to ${appHash}, not the YAML file's ${entry.hash}`);
    continue;
  }
  console.log(`  ✓ matches the "${id}" definition exported by @flowkit-demo/domain`);
}

console.log(failures === 0 ? `\n${files.length} definition file(s) checked.` : `\n${failures} problem(s) found.`);
process.exit(failures === 0 ? 0 : 1);
