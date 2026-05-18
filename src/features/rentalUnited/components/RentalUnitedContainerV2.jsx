import OwnerSelectorV2 from './OwnerSelectorV2';
import RentalUnitedIframe from './RentalUnitedIframe';
import { CmSpinner } from './ChannelManagerUi';
import { tokens as T } from '../../../components/dashboard/DashboardV2.components';

const RentalUnitedContainerV2 = ({
  isAdmin,
  owners,
  selectedOwnerId,
  onOwnerChange,
  showOwnerSelector = true,
  scriptUrl,
}) => {
  return (
    <div style={{ width: '100%' }}>
      {isAdmin && owners.length > 0 && showOwnerSelector && (
        <div style={{ marginBottom: 16 }}>
          <OwnerSelectorV2
            owners={owners}
            selectedOwnerId={selectedOwnerId}
            onOwnerChange={onOwnerChange}
            title="Compte property manager"
            subtitle="Changez de compte sans quitter la page"
          />
        </div>
      )}

      <div
        style={{
          background: T.bg0,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          minHeight: 520,
        }}
      >
        {scriptUrl ? (
          <RentalUnitedIframe scriptUrl={scriptUrl} isAdmin={isAdmin} />
        ) : (
          <CmSpinner label="Initialisation du Channel Manager Rental United…" />
        )}
      </div>
    </div>
  );
};

export default RentalUnitedContainerV2;
