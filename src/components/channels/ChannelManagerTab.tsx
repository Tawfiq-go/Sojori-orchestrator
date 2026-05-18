/** Onglet Channel Manager — iframe RU white-label (legacy /admin/ChannelManager?tab=channel-manager) */
import { useTranslation } from 'react-i18next';
import RentalUnitedWhiteLabelV2 from '../../features/rentalUnited/components/RentalUnitedWhiteLabelV2';

export function ChannelManagerTab() {
  const { i18n } = useTranslation();
  return <RentalUnitedWhiteLabelV2 key={i18n.language} />;
}
