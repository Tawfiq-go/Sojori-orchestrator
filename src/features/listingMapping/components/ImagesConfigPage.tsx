import { Navigate, Route, Routes } from 'react-router-dom';
import { ImagesOtaCatalogPanel } from './ImagesOtaCatalogPanel';

/** Images mapping — Catalogue OTA uniquement (plus de sous-onglets legacy). */
export function ImagesConfigPage() {
  return (
    <Routes>
      <Route index element={<ImagesOtaCatalogPanel />} />
      <Route path="ota-catalog" element={<ImagesOtaCatalogPanel />} />
      <Route path="legacy" element={<Navigate to="/listings/mapping/images" replace />} />
      <Route path="*" element={<Navigate to="/listings/mapping/images" replace />} />
    </Routes>
  );
}

export default ImagesConfigPage;
