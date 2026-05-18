/**
 * Wrapper générique pour sections utilisant le pattern route principale?tab=sous-menu.
 * Rendu du bon composant selon le paramètre ?tab=.
 */
import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function TabSectionPage({ tabComponents, defaultTab }) {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || defaultTab;
  const Component = tabComponents[tab];

  if (!Component) {
    const firstTab = Object.keys(tabComponents)[0];
    const Fallback = tabComponents[firstTab];
    return Fallback ? <Fallback /> : null;
  }

  return <Component />;
}
