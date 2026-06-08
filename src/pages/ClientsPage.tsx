import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';

/**
 * Placeholder — gestion clients (owners / PM) à brancher plus tard sur srv-user / srv-reservations.
 * Les mocks catalogueMock ont été retirés volontairement.
 */
export function ClientsPage() {
  return (
    <DashboardWrapper breadcrumb={['CRM', 'Clients']}>
      <div
        style={{
          maxWidth: 640,
          margin: '48px auto',
          padding: '32px 28px',
          background: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 8px' }}>
          Clients — bientôt disponible
        </h1>
        <p style={{ fontSize: 14, color: T.text2, lineHeight: 1.6, margin: 0 }}>
          Ce module sera connecté aux données réelles (comptes owners, historique réservations, segmentation).
          En attendant, utilisez les onglets CRM : Demandes, Leads & fiches, Rendez-vous et Onboarding.
        </p>
      </div>
    </DashboardWrapper>
  );
}
