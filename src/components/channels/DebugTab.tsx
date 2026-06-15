/** Onglet Debug — navigation type gérée par ChannelsTopNav */
import { DebugApiTab } from './DebugApiTab';
import { ChannelsHttpAccessSection } from './ChannelsHttpAccessSection';
import { useSearchParams } from 'react-router-dom';

export function DebugTab() {
  const [searchParams] = useSearchParams();
  const debugType = (searchParams.get('type') || 'pull').toLowerCase();
  if (debugType === 'http') {
    return <ChannelsHttpAccessSection />;
  }
  return <DebugApiTab hideTypeNav />;
}

export default DebugTab;
