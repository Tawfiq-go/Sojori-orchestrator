/**
 * Hub Channel Manager — /admin/ChannelManager
 *
 * Le widget Rental United est plein cadre : pas de titre ni d'onglets internes.
 * Le contexte est déjà donné par le fil d'Ariane et par CatalogueAnnoncesTabs,
 * et le widget a besoin de toute la hauteur disponible.
 *
 * ?tab=distribution est conservé en entrée d'URL (anciens liens) mais rend
 * désormais le Channel Manager — l'onglet Distribution a été retiré.
 */
import { DashboardWrapper } from '../components/DashboardWrapper';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import { ChannelManagerTab } from '../components/channels/ChannelManagerTab';

export type ChannelManagerTabId = 'channel-manager';

export function ChannelManagerHubPage() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Channel Manager']}>
      <LegacyReduxProvider>
        <CatalogueAnnoncesTabs />
        <div style={{ padding: '0 0 16px' }}>
          <div
            style={{
              background: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: 8,
              overflow: 'hidden',
            }}
          >
            <ChannelManagerTab />
          </div>
        </div>
      </LegacyReduxProvider>
    </DashboardWrapper>
  );
}

export default ChannelManagerHubPage;
