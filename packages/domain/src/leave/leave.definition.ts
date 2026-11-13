import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FlowDefinition } from '@teopeurt/flowkit-core';
import { parseFlowYaml } from '@teopeurt/flowkit-definitions';

/**
 * The leave flow is authored as YAML (`leave.flow.yaml`). It is parsed once at module load, outside
 * the Temporal workflow sandbox: the workflow bundle (`../workflow.ts`) never imports this module and
 * receives the pinned snapshot instead. The parsed definition hashes identically to the equivalent
 * `defineFlow({...})` object.
 */
export const leaveDefinitionPath = fileURLToPath(new URL('./leave.flow.yaml', import.meta.url));

export const leaveDefinition: FlowDefinition = parseFlowYaml(readFileSync(leaveDefinitionPath, 'utf8'), {
  sourceName: 'leave.flow.yaml',
});
