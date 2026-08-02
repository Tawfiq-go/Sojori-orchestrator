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
  /**
   * True quand un onglet inbox est en plein écran : le hub ne monte plus
   * leading/subBar (ils sont re-montés dans InboxFullscreenLayer).
   */
  fullscreenActive: boolean;
  setFullscreenActive: (active: boolean) => void;
};

const Ctx = createContext<CommsHubChromeCtx | null>(null);

export function CommsHubChromeProvider({ children }: { children: ReactNode }) {
  const [leading, setLeadingState] = useState<ReactNode | null>(null);
  const [subBar, setSubBarState] = useState<ReactNode | null>(null);
  const [fullscreenActive, setFullscreenActiveState] = useState(false);
  const setLeading = useCallback((node: ReactNode | null) => {
    setLeadingState(node);
  }, []);
  const setSubBar = useCallback((node: ReactNode | null) => {
    setSubBarState(node);
  }, []);
  const setFullscreenActive = useCallback((active: boolean) => {
    setFullscreenActiveState(active);
  }, []);
  const value = useMemo(
    () => ({
      leading,
      setLeading,
      subBar,
      setSubBar,
      fullscreenActive,
      setFullscreenActive,
    }),
    [leading, setLeading, subBar, setSubBar, fullscreenActive, setFullscreenActive],
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
      fullscreenActive: false,
      setFullscreenActive: () => undefined,
    };
  }
  return ctx;
}
