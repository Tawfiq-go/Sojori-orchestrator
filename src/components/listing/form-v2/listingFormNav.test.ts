import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isDocumentsDetailNav,
  listingFormNavToSearchParams,
  resolveListingFormNavFromSearch,
} from './listingFormNav';

describe('listingFormNav URL sync', () => {
  it('starts on orchestration-v3 then Documents link resolves to detail/documents', () => {
    const orch = resolveListingFormNavFromSearch(
      new URLSearchParams('level=orchestration-v3'),
    );
    assert.equal(orch.level, 'orchestration-v3');
    assert.equal(orch.tab, undefined);

    const afterClick = listingFormNavToSearchParams(
      new URLSearchParams('level=orchestration-v3'),
      { level: 'detail', tab: 'documents' },
    );
    const docs = resolveListingFormNavFromSearch(afterClick);
    assert.equal(docs.level, 'detail');
    assert.equal(docs.tab, 'documents');
    assert.equal(isDocumentsDetailNav(docs), true);
  });

  it('Single and Multi share the same documents deep-link contract', () => {
    for (const unit of ['Single', 'Multi']) {
      const nav = resolveListingFormNavFromSearch(
        new URLSearchParams('level=detail&tab=documents'),
      );
      assert.equal(nav.level, 'detail', unit);
      assert.equal(nav.tab, 'documents', unit);
      assert.equal(isDocumentsDetailNav(nav), true, unit);
    }
  });

  it('browser back from documents to orchestration restores level without tab', () => {
    const docsParams = listingFormNavToSearchParams(new URLSearchParams(), {
      level: 'detail',
      tab: 'documents',
    });
    const back = listingFormNavToSearchParams(docsParams, { level: 'orchestration-v3' });
    const nav = resolveListingFormNavFromSearch(back);
    assert.equal(nav.level, 'orchestration-v3');
    assert.equal(nav.tab, undefined);
    assert.equal(back.get('tab'), null);
  });

  it('stale detail/documents URL still maps to Documents tab (shell re-applies via navEpoch)', () => {
    const stale = resolveListingFormNavFromSearch(
      new URLSearchParams('level=detail&tab=documents'),
    );
    assert.equal(isDocumentsDetailNav(stale), true);
  });
});
