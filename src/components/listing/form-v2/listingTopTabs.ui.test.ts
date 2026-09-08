import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shell = fs.readFileSync(path.join(here, 'ListingFormShell.jsx'), 'utf8');

describe('Listing form — tabs on top', () => {
  it('replaces the left rail by a top strip, content on full width', () => {
    assert.match(shell, /data-testid="listing-top-tabs"/);
    assert.match(shell, /gridTemplateColumns: '1fr',\n\s+gridTemplateRows: isOrchV3 \? '1fr' : 'auto 1fr'/);
    assert.doesNotMatch(shell, /tabsRailWidth\}px 1fr/);
  });
  it('keeps the groups visibly separated (eyebrow + divider) and marks the active tab', () => {
    assert.match(shell, /borderLeft: gi \? `1px solid \$\{T\.border\}` : 'none'/);
    assert.match(shell, /textTransform: 'uppercase',\n\s+px: 0\.5,\n\s+\}\}>\{g\.group\}/);
    assert.match(shell, /aria-current=\{active \? 'page' : undefined\}/);
  });
});
