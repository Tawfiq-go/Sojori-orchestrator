// Configuration orchestration — parité legacy (Modèles | Messages, admin/owner, modales édition)
import { LegacyReduxProvider } from '../LegacyReduxBridge';
import OrchestratorConfigContent from './OrchestratorConfigContent';

const ConfigurationView = () => (
  <LegacyReduxProvider>
    <OrchestratorConfigContent />
  </LegacyReduxProvider>
);

export default ConfigurationView;
