import { describe, expect, it } from 'bun:test';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dir, '..');
const guides = [
  'README.md',
  'docs/customizing.md',
  'docs/architecture.md',
  'docs/deployment.md',
  'docs/local-package-overrides.md',
] as const;

async function guide(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8');
}

describe('starter documentation contract', () => {
  it('gives an authorized user a safe local quickstart', async () => {
    const readme = await guide('README.md');

    expect(readme).toContain('bun run dev');
    expect(readme).toContain('bun install --frozen-lockfile');
    expect(readme).toContain('http://localhost:5173/');
    expect(readme).toContain('http://localhost:3011/health/ready');
    expect(readme).toContain('http://localhost:8025/');
    expect(readme).toContain('Acme Demo');
    expect(readme).toContain('Globex Demo');
    expect(readme).toContain('FLOWKIT_DEMO_MIGRATION_APPROVED');
    expect(readme).toMatch(/never.*remote|remote.*never/i);
  });

  it('describes the public npm release and tokenless install, without stale pre-release claims', async () => {
    const readme = await guide('README.md');
    const overrides = await guide('docs/local-package-overrides.md');
    const customizing = await guide('docs/customizing.md');
    const text = `${readme}\n${overrides}\n${customizing}`;

    expect(readme).toContain('@teopeurt/flowkit-*');
    expect(readme).toContain('1.2.0');
    expect(readme).toContain('npmjs.org');
    expect(readme).toContain('bun install --frozen-lockfile');
    expect(readme).toMatch(/no token|without a token|does not require a token/i);
    expect(readme).toMatch(/GitHub Packages/);
    expect(readme).toMatch(/not required|optional|mirror/i);
    expect(text).not.toContain('read:packages');
    expect(text).not.toContain('NODE_AUTH_TOKEN');
    expect(text).not.toContain('npm.pkg.github.com');
    expect(text).not.toMatch(/not published|isn't published|not yet published|private GitHub Packages/i);
    expect(text).not.toMatch(/cannot (currently )?complete|deferred until|clean-clone gate is deferred/i);
    expect(text).not.toMatch(/0\.2\.0/);
    expect(text).not.toMatch(/1\.1\.0/);
    expect(text).not.toMatch(/pre-publication/i);
    await expect(lstat(resolve(root, '.npmrc.example'))).rejects.toBeDefined();
  });

  it('keeps all guides neutral and points only to repository-owned paths', async () => {
    const contents = await Promise.all(guides.map(async (path) => [path, await guide(path)] as const));
    const text = contents.map(([, source]) => source).join('\n');
    const requiredPaths = [
      'apps/api/src/flow.controller.ts',
      'apps/web/src/features/requests/RequestForm.tsx',
      'apps/worker/src/workflows.ts',
      'apps/notify-worker/src/delivery.worker.ts',
      'packages/domain/src/leave/leave.definition.ts',
      'packages/domain/src/leave/leave.flow.yaml',
      'packages/domain/src/leave/leave.registries.ts',
      'packages/domain/src/notifications/templates.ts',
      'packages/database/src/schema.ts',
      'packages/database/migrations',
      'packages/database/scripts/seed.ts',
      'packages/ui/src/tokens.css',
      'test/package-boundary.test.ts',
      'test/package-contracts.preflight.test.ts',
      'test/browser-flow.playwright.ts',
      'deploy/compose/docker-compose.yml',
      'deploy/tilt/k3s.Tiltfile',
    ];

    for (const path of requiredPaths) {
      expect(text).toContain(path);
      await expect(lstat(resolve(root, path))).resolves.toBeDefined();
    }
    expect(text).not.toMatch(/faan|avsec|packages\/flowkit-demo/i);
  });

  it('type-checks every TypeScript example embedded in the guides', async () => {
    const sources = (await Promise.all(guides.map(guide))).flatMap((text) =>
      Array.from(text.matchAll(/```ts\n([\s\S]*?)```/g), (match) => match[1]),
    );
    expect(sources.length).toBeGreaterThan(0);

    const directory = await mkdtemp(join(tmpdir(), 'flowkit-demo-docs-'));
    try {
      const paths = await Promise.all(sources.map(async (source, index) => {
        const path = join(directory, `example-${index}.ts`);
        await writeFile(path, source);
        return path;
      }));
      const program = ts.createProgram(paths, {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
        types: [],
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))).toEqual([]);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});
