import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FlowDefinition } from '@teopeurt/flowkit-core';
import { parseFlowYaml } from '@teopeurt/flowkit-definitions';

/**
 * On-demand ride hail, authored as YAML (`ride.flow.yaml`, which also carries the design notes).
 * It is parsed once at module load, outside the Temporal workflow sandbox: the workflow bundle
 * (`../workflow.ts`) never imports this module and receives the pinned snapshot instead. The parsed
 * definition hashes identically to the equivalent `defineFlow({...})` object.
 */
export const rideDefinitionPath = fileURLToPath(new URL('./ride.flow.yaml', import.meta.url));

export const rideDefinition: FlowDefinition = parseFlowYaml(readFileSync(rideDefinitionPath, 'utf8'), {
  sourceName: 'ride.flow.yaml',
});
