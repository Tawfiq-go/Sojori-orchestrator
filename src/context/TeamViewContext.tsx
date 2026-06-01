import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type TeamViewMode = 'cards' | 'list';

export type TeamStat = {
  icon: string;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
};

type TeamViewContextValue = {
  viewMode: TeamViewMode;
  setViewMode: (mode: TeamViewMode) => void;
  stats: TeamStat[];
  setTeamStats: (stats: TeamStat[]) => void;
};

const TeamViewContext = createContext<TeamViewContextValue | null>(null);

export function TeamViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<TeamViewMode>('cards');
  const [stats, setStatsState] = useState<TeamStat[]>([]);
  const setTeamStats = useCallback((next: TeamStat[]) => setStatsState(next), []);
  const value = useMemo(
    () => ({ viewMode, setViewMode, stats, setTeamStats }),
    [viewMode, stats, setTeamStats],
  );
  return <TeamViewContext.Provider value={value}>{children}</TeamViewContext.Provider>;
}

export function useTeamViewMode() {
  const ctx = useContext(TeamViewContext);
  if (!ctx) {
    return {
      viewMode: 'cards' as TeamViewMode,
      setViewMode: () => {},
      stats: [] as TeamStat[],
      setTeamStats: () => {},
    };
  }
  return ctx;
}
