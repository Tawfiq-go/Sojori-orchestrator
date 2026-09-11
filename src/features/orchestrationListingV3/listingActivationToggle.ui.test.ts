import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const overview = fs.readFileSync(path.join(here, 'OrchestrationOverviewPanel.tsx'), 'utf8');

describe('Listing ON/OFF deactivation (all capabilities)', () => {
  it('uses resolveListingTogglePatch so stuck ON rows can force override OFF', () => {
    assert.match(overview, /resolveListingTogglePatch/);
    assert.match(overview, /currentlyOn/);
    assert.doesNotMatch(overview, /overridePatchForToggle\(/);
  });

  it('clears managed and orchestrated on OFF as well as ON', () => {
    assert.match(overview, /managed: value/);
    assert.match(overview, /orchestrated: value/);
    assert.match(overview, /clientEnabled: false/);
  });
});
