import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type CommsHubChromeCtx = {
  /** Remplace Guest · meta (ex. filtres WA, barre Demandes). */
  leading: ReactNode | null;
  setLeading: (node: ReactNode | null) => void;
  /** Petite rangée sous le hub (ex. chips filtres Demandes). */
  subBar: ReactNode | null;
  setSubBar: (node: ReactNode | null) => void;
};

const Ctx = createContext<CommsHubChromeCtx | null>(null);

export function CommsHubChromeProvider({ children }: { children: ReactNode }) {
  const [leading, setLeadingState] = useState<ReactNode | null>(null);
  const [subBar, setSubBarState] = useState<ReactNode | null>(null);
  const setLeading = useCallback((node: ReactNode | null) => {
    setLeadingState(node);
  }, []);
  const setSubBar = useCallback((node: ReactNode | null) => {
    setSubBarState(node);
  }, []);
  const value = useMemo(
    () => ({ leading, setLeading, subBar, setSubBar }),
    [leading, setLeading, subBar, setSubBar],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommsHubChrome(): CommsHubChromeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      leading: null,
      setLeading: () => undefined,
      subBar: null,
      setSubBar: () => undefined,
    };
  }
  return ctx;
}
