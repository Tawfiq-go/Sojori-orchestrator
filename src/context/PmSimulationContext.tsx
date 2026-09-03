import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useRealAuth } from '../hooks/useAuth';
import { AdminViewOverrideContext, type AdminViewIdentity } from '../contexts/AdminViewOverrideContext';
import { hasAdminAccess } from '../utils/rbac.utils';
import { getOwnersAllPages } from '../services/teamDashboardApi';
import { postPmSimulationAudit } from '../services/pmSimulationApi';
import {
  clearPmSimulationSnapshot,
  createSimulationSessionId,
  getPmSimulationSnapshot,
  persistAdminSidebarMode,
  readAdminSidebarMode,
  setPmSimulationSnapshot,
  type AdminSidebarMode,
  type PmSimulationSnapshot,
} from '../utils/pmSimulationSession';
import { clearDashboardSnapshotCacheForOwner } from '../utils/dashboardSnapshotCache';
import { getToken } from '../utils/authUtils';
import { AUTH_CONFIG } from '../config/authConfig';

export type PmSimulationOwnerOption = {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
};

export type PmSimulationContextValue = {
  canSimulate: boolean;
  isActive: boolean;
  snapshot: PmSimulationSnapshot | null;
  owners: PmSimulationOwnerOption[];
  ownersLoading: boolean;
  startSimulation: (ownerId: string, details?: { label?: string; email?: string }) => void;
  stopSimulation: () => void;
  simulatedOwnerId: string | null;
  /** Incrémenté au start/stop simulation — force refetch dashboard (évite cache vide). */
  dashboardDataRevision: number;
  /**
   * Sidebar affichée (2026-09-03) : owner seule, admin seule, ou les deux.
   * Défaut : « owner » dès qu'un owner est sélectionné, « both » sur la plateforme.
   * Un choix explicite tient jusqu'au prochain changement d'owner / retour plateforme.
   */
  sidebarMode: AdminSidebarMode;
  setSidebarMode: (mode: AdminSidebarMode) => void;
};

const PmSimulationContext = createContext<PmSimulationContextValue | null>(null);

function ownerLabel(o: PmSimulationOwnerOption): string {
  const company = (o.companyName || '').trim();
  if (company) return company;
  const name = [o.firstName, o.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return (o.email || '').trim() || o._id;
}

export function PmSimulationProvider({ children }: { children: ReactNode }) {
  // Compte RÉEL : c'est ce provider qui fabrique la vue, il ne doit pas la subir.
  const { user } = useRealAuth();
  const location = useLocation();
  const canSimulate = hasAdminAccess(user?.role);
  const adminUserId = String(user?._id ?? user?.id ?? '').trim();
  const [snapshot, setSnapshot] = useState<PmSimulationSnapshot | null>(() => {
    if (!canSimulate) return null;
    const snap = getPmSimulationSnapshot();
    if (!snap) return null;
    if (snap.startedByUserId && adminUserId && snap.startedByUserId !== adminUserId) {
      clearPmSimulationSnapshot();
      return null;
    }
    if (!snap.startedByUserId && adminUserId) {
      clearPmSimulationSnapshot();
      return null;
    }
    return snap;
  });
  const [owners, setOwners] = useState<PmSimulationOwnerOption[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [dashboardDataRevision, setDashboardDataRevision] = useState(0);
  const [sidebarMode, setSidebarModeState] = useState<AdminSidebarMode>(() => {
    const saved = readAdminSidebarMode();
    if (saved) return saved;
    return getPmSimulationSnapshot()?.ownerId ? 'owner' : 'both';
  });
  const setSidebarMode = useCallback((mode: AdminSidebarMode) => {
    setSidebarModeState(mode);
    persistAdminSidebarMode(mode);
  }, []);
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    if (!canSimulate) {
      clearPmSimulationSnapshot();
      setSnapshot(null);
      return;
    }
    const snap = getPmSimulationSnapshot();
    if (!snap) {
      setSnapshot(null);
      return;
    }
    if (!adminUserId || !snap.startedByUserId || snap.startedByUserId !== adminUserId) {
      clearPmSimulationSnapshot();
      setSnapshot(null);
    }
  }, [canSimulate, adminUserId]);

  useEffect(() => {
    if (!canSimulate) return;
    let cancelled = false;
    setOwnersLoading(true);
    getOwnersAllPages({ search_text: '' })
      .then((rows) => {
        if (cancelled) return;
        setOwners(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOwners([]);
      })
      .finally(() => {
        if (!cancelled) setOwnersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canSimulate]);

  const persist = useCallback((next: PmSimulationSnapshot | null) => {
    setPmSimulationSnapshot(next);
    setSnapshot(next);
  }, []);

  const startSimulation = useCallback(
    (ownerId: string, details?: { label?: string; email?: string }) => {
      if (!canSimulate || !adminUserId) return;
      const id = String(ownerId).trim();
      if (!id) return;
      const row = owners.find((o) => String(o._id ?? o.id) === id);
      const next: PmSimulationSnapshot = {
        ownerId: id,
        ownerLabel: details?.label?.trim() || (row ? ownerLabel(row) : id),
        ownerEmail: details?.email?.trim() || row?.email,
        startedAt: new Date().toISOString(),
        sessionId: createSimulationSessionId(),
        startedByUserId: adminUserId,
      };
      const previous = getPmSimulationSnapshot();
      if (previous?.ownerId && previous.ownerId !== id) {
        // Changement d'owner sans passer par « Plateforme » : on clôt la séance
        // précédente pour que le journal reste lisible (une séance = un owner).
        void postPmSimulationAudit({
          event: 'stop',
          sessionId: previous.sessionId,
          simulatedOwnerId: previous.ownerId,
          simulatedOwnerLabel: previous.ownerLabel,
          simulatedOwnerEmail: previous.ownerEmail,
          path: location.pathname,
          meta: { reason: 'switch_owner' },
        });
      }
      persist(next);
      clearDashboardSnapshotCacheForOwner(id);
      setDashboardDataRevision((n) => n + 1);
      // Vue owner fidèle par défaut : sidebar owner. Un choix « admin » ou
      // « both » fait avant reste respecté tant qu'on ne repasse pas par la plateforme.
      if (!previous?.ownerId) setSidebarMode('owner');
      void postPmSimulationAudit({
        event: 'start',
        sessionId: next.sessionId,
        simulatedOwnerId: next.ownerId,
        simulatedOwnerLabel: next.ownerLabel,
        simulatedOwnerEmail: next.ownerEmail,
        path: location.pathname,
      });
      // On reste sur la page courante : les données se rechargent, c'est tout.
    },
    [canSimulate, adminUserId, owners, persist, location.pathname, setSidebarMode],
  );

  const stopSimulation = useCallback(() => {
    const current = getPmSimulationSnapshot();
    if (current) {
      void postPmSimulationAudit({
        event: 'stop',
        sessionId: current.sessionId,
        simulatedOwnerId: current.ownerId,
        simulatedOwnerLabel: current.ownerLabel,
        simulatedOwnerEmail: current.ownerEmail,
        path: location.pathname,
      });
    }
    clearPmSimulationSnapshot();
    setSnapshot(null);
    if (current?.ownerId) {
      clearDashboardSnapshotCacheForOwner(current.ownerId);
    }
    setDashboardDataRevision((n) => n + 1);
    // Retour plateforme : la sidebar owner seule n'a plus de sens.
    if (readAdminSidebarMode() === 'owner') setSidebarMode('both');
  }, [location.pathname, setSidebarMode]);

  useEffect(() => {
    if (!snapshot?.sessionId || !canSimulate) return;
    const path = `${location.pathname}${location.search}`;
    if (path === lastPathRef.current) return;
    lastPathRef.current = path;
    void postPmSimulationAudit({
      event: 'page_view',
      sessionId: snapshot.sessionId,
      simulatedOwnerId: snapshot.ownerId,
      simulatedOwnerLabel: snapshot.ownerLabel,
      simulatedOwnerEmail: snapshot.ownerEmail,
      path,
    });
  }, [location.pathname, location.search, snapshot, canSimulate]);

  useEffect(() => {
    if (!snapshot?.sessionId || !canSimulate) return;
    const interval = window.setInterval(() => {
      void postPmSimulationAudit({
        event: 'heartbeat',
        sessionId: snapshot.sessionId,
        simulatedOwnerId: snapshot.ownerId,
        simulatedOwnerLabel: snapshot.ownerLabel,
        simulatedOwnerEmail: snapshot.ownerEmail,
        path: location.pathname,
      });
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [snapshot, canSimulate, location.pathname]);

  useEffect(() => {
    const onUnload = () => {
      const current = getPmSimulationSnapshot();
      if (!current) return;
      const body = JSON.stringify({
        event: 'stop',
        sessionId: current.sessionId,
        simulatedOwnerId: current.ownerId,
        simulatedOwnerLabel: current.ownerLabel,
        simulatedOwnerEmail: current.ownerEmail,
        path: window.location.pathname,
        meta: { reason: 'tab_close' },
      });
      const url = `${AUTH_CONFIG.API_URL}/pm-simulation-audit`;
      const token = getToken();
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  useEffect(() => {
    if (!canSimulate) {
      document.body.classList.remove('sojori-pm-simulation');
      return;
    }
    const active = Boolean(snapshot?.ownerId);
    document.body.classList.toggle('sojori-pm-simulation', active);
    return () => document.body.classList.remove('sojori-pm-simulation');
  }, [canSimulate, snapshot?.ownerId]);

  const value = useMemo<PmSimulationContextValue>(
    () => ({
      canSimulate,
      isActive: canSimulate && Boolean(snapshot?.ownerId),
      snapshot: canSimulate ? snapshot : null,
      owners,
      ownersLoading,
      startSimulation,
      stopSimulation,
      simulatedOwnerId: canSimulate && snapshot?.ownerId ? snapshot.ownerId : null,
      dashboardDataRevision,
      sidebarMode: canSimulate ? sidebarMode : 'both',
      setSidebarMode,
    }),
    [
      canSimulate,
      snapshot,
      owners,
      ownersLoading,
      startSimulation,
      stopSimulation,
      dashboardDataRevision,
      sidebarMode,
      setSidebarMode,
    ],
  );

  const viewIdentity = useMemo<AdminViewIdentity | null>(() => {
    if (!canSimulate || !snapshot?.ownerId) return null;
    return { ownerId: snapshot.ownerId, ownerLabel: snapshot.ownerLabel, ownerEmail: snapshot.ownerEmail };
  }, [canSimulate, snapshot]);

  return (
    <PmSimulationContext.Provider value={value}>
      <AdminViewOverrideContext.Provider value={viewIdentity}>{children}</AdminViewOverrideContext.Provider>
    </PmSimulationContext.Provider>
  );
}

export function usePmSimulation(): PmSimulationContextValue {
  const ctx = useContext(PmSimulationContext);
  if (!ctx) {
    return {
      canSimulate: false,
      isActive: false,
      snapshot: null,
      owners: [],
      ownersLoading: false,
      startSimulation: () => {},
      stopSimulation: () => {},
      simulatedOwnerId: null,
      dashboardDataRevision: 0,
      sidebarMode: 'both',
      setSidebarMode: () => {},
    };
  }
  return ctx;
}

