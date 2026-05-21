// ════════════════════════════════════════════════════════════════════
// Sojori Dynamic Pricing — barrel export
// ════════════════════════════════════════════════════════════════════
export { default as DynamicPricingShell } from './DynamicPricingShell';
export { default as DynamicPricingAirroiModal } from './DynamicPricingAirroiModal';
export { DataSourceBadge, DataSourceLegend, SectionSourceBar, formatSnapshotLabel } from './DataSourceBadges';
export type { DataSourceKind, DataSourceItem } from './DataSourceBadges';
export { default as PortfolioView } from './PortfolioView';
export type { MarketCityKpis, PortfolioZoneStats, BulkAction } from './PortfolioView';
export type { BienDetailPerformance } from './_tokens';
export { default as MarketCityBand } from './MarketCityBand';
export { default as PortfolioMap } from './PortfolioMap';
export type { PortfolioMapPin } from './PortfolioMap';
export { default as BienView } from './BienView';
export { default as BienAirroiView } from './BienAirroiView';
export { default as JustificationModalG7 } from './JustificationModalG7';

// Sous-composants Bien
export { default as StatsCards } from './bien/StatsCards';
export { default as PricingControls } from './bien/PricingControls';
export { default as YearlyCalendar } from './bien/YearlyCalendar';
export { default as MarketCharts } from './bien/MarketCharts';
export { default as MarrakechMap } from './bien/MarrakechMap';
export { default as CompsTable } from './bien/CompsTable';

// Tokens + types
export * from './_tokens';

/* ═══════ Exemple d'intégration · routes ═══════
import { Route, Routes } from 'react-router-dom';
import { DynamicPricingShell } from '@/components/pricing';

<Routes>
  <Route path="/pricing"               element={<DynamicPricingShell mode="portfolio" />} />
  <Route path="/pricing/:listingId"    element={<DynamicPricingShell mode="bien" />} />
</Routes>
*/
