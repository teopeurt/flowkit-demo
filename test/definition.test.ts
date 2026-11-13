import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { buildInitialState, lintFlow, lintInterpreterFlow, validateRegistryRefs } from '@teopeurt/flowkit-core';
import { publishDefinition, validateFlowkit, verifyPublishedDefinition } from '@teopeurt/flowkit-temporal';
import { leaveDefinition, leaveDefinitionPath } from '@flowkit-demo/domain';
import { leaveChannels, leaveGuards, leavePolicies, leaveRules, leaveSystemSteps, leaveTemplates } from '@flowkit-demo/domain';

// Hash of the leave flow as it was written with `defineFlow({...})` before moving to YAML. A change
// here means the flow changed: bump `version` in leave.flow.yaml and update this value deliberately.
const LEAVE_DEFINITION_HASH = 'sha256:6c23295d8a9cdef748cb420f9e2a80cfa133d82cf85c149736e136f016f6b235';

describe('leave approval definition', () => {
  it('is strict, lint-clean, and has a stable immutable snapshot', () => {
    expect(lintFlow(leaveDefinition)).toEqual([]);
    expect(lintInterpreterFlow(leaveDefinition)).toEqual([]);
    expect(validateRegistryRefs(leaveDefinition, { guards: leaveGuards, policies: leavePolicies, steps: { ...leaveSystemSteps, ...leaveRules }, templates: leaveTemplates, channels: leaveChannels })).toEqual([]);
    expect(validateFlowkit({ published: publishDefinition({ definition: leaveDefinition }), registries: { guards: leaveGuards, policies: leavePolicies, rules: leaveRules, systemSteps: leaveSystemSteps, templates: leaveTemplates, channels: leaveChannels } })).toEqual([]);
    const published = publishDefinition({ definition: leaveDefinition });
    verifyPublishedDefinition(published);
    expect(Object.isFrozen(published.definitionSnapshot)).toBe(true);
    expect(buildInitialState(leaveDefinition).stage).toBe('employee_draft');
  });

  it('loads from YAML with the same hash as the original TypeScript definition', () => {
    expect(leaveDefinitionPath.endsWith('leave.flow.yaml')).toBe(true);
    expect(publishDefinition({ definition: leaveDefinition }).definitionHash).toBe(LEAVE_DEFINITION_HASH);
  });

  it('keeps the CLI registries manifest in step with the code registries', () => {
    const manifest = Bun.YAML.parse(readFileSync(leaveDefinitionPath.replace(/leave\.flow\.yaml$/, 'leave.registries.yaml'), 'utf8')) as Record<string, Record<string, unknown>>;
    const names = (section: object | undefined) => Object.keys(section ?? {}).sort();
    expect(names(manifest.policies)).toEqual(names(leavePolicies));
    expect(names(manifest.guards)).toEqual(names(leaveGuards));
    expect(names(manifest.systemSteps)).toEqual(names(leaveSystemSteps));
    expect(names(manifest.templates)).toEqual(names(leaveTemplates));
    expect(names(manifest.channels)).toEqual(names(leaveChannels));
    expect(Object.fromEntries(Object.entries(manifest.rules).map(([name, rule]) => [name, (rule as { actions: string[] }).actions])))
      .toEqual(Object.fromEntries(Object.entries(leaveRules).map(([name, rule]) => [name, rule.actions])));
  });
});
