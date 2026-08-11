/**
 * Détecte Single / Multi dans le scope PM.
 * 1 seul type → 1 onglet ; les deux → toggle.
 */
import { useEffect, useState } from 'react';
import { listingsService } from '../../services/listingsService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { isNommosListingName, type OpsBoardMode } from './opsBoardMap';

export type OpsBoardPortfolio = {
  ready: boolean;
  hasMulti: boolean;
  hasSingle: boolean;
  showToggle: boolean;
  defaultMode: OpsBoardMode;
  availableModes: OpsBoardMode[];
};

const EMPTY: OpsBoardPortfolio = {
  ready: false,
  hasMulti: false,
  hasSingle: false,
  showToggle: false,
  defaultMode: 'single',
  availableModes: [],
};

export function useOpsBoardPortfolio(): OpsBoardPortfolio {
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [state, setState] = useState<OpsBoardPortfolio>(EMPTY);

  useEffect(() => {
    if (!scopeFetchReady) return;
    let cancelled = false;

    (async () => {
      try {
        const listRes = await listingsService.getListings({
          page: 0,
          limit: 500,
          compact: true,
          useActiveFilter: true,
          active: true,
          filterOwnerId: requestOwnerId || undefined,
        });
        if (cancelled) return;
        const items = listRes.data.items || [];

        let hasMulti = false;
        let hasSingle = false;
        for (const l of items) {
          const pu = String(l.propertyUnit || '');
          if (pu === 'Multi' || isNommosListingName(l.name)) {
            hasMulti = true;
          } else {
            hasSingle = true;
          }
        }

        const availableModes: OpsBoardMode[] = [];
        if (hasMulti) availableModes.push('multi');
        if (hasSingle) availableModes.push('single');

        // Conflit / mix → priorité Multi ; sinon le seul type dispo
        const defaultMode: OpsBoardMode = hasMulti ? 'multi' : 'single';

        setState({
          ready: true,
          hasMulti,
          hasSingle,
          showToggle: hasMulti && hasSingle,
          defaultMode,
          availableModes,
        });
      } catch {
        if (cancelled) return;
        setState({
          ready: true,
          hasMulti: false,
          hasSingle: true,
          showToggle: false,
          defaultMode: 'single',
          availableModes: ['single'],
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scopeFetchReady, requestOwnerId]);

  return state;
}
