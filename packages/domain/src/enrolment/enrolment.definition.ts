import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FlowDefinition } from '@teopeurt/flowkit-core';
import { parseFlowYaml } from '@teopeurt/flowkit-definitions';

/**
 * Worker enrolment and standing, authored as YAML (`enrolment.flow.yaml`, which also carries the
 * design notes). It is parsed once at module load, outside the Temporal workflow sandbox: the
 * workflow bundle (`../workflow.ts`) imports only the registries and receives the pinned snapshot.
 * The parsed definition hashes identically to the equivalent `defineFlow({...})` object.
 */
export const enrolmentDefinitionPath = fileURLToPath(new URL('./enrolment.flow.yaml', import.meta.url));

export const enrolmentDefinition: FlowDefinition = parseFlowYaml(readFileSync(enrolmentDefinitionPath, 'utf8'), {
  sourceName: 'enrolment.flow.yaml',
});
