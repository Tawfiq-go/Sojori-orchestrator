import { Navigate, Route, Routes } from 'react-router-dom';
import { AmenitiesOtaCatalogPanel } from './AmenitiesOtaCatalogPanel';

/** Amenities mapping — Catalogue OTA uniquement (plus de sous-onglets legacy). */
export function AmenitiesConfigPage() {
  return (
    <Routes>
      <Route index element={<AmenitiesOtaCatalogPanel />} />
      <Route path="ota-catalog" element={<AmenitiesOtaCatalogPanel />} />
      <Route path="catalog" element={<Navigate to="/listings/mapping/amenities" replace />} />
      <Route path="mapping" element={<Navigate to="/listings/mapping/amenities" replace />} />
      <Route path="categories" element={<Navigate to="/listings/mapping/amenities" replace />} />
      <Route path="*" element={<Navigate to="/listings/mapping/amenities" replace />} />
    </Routes>
  );
}

export default AmenitiesConfigPage;
