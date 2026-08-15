import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';
import { ExtraCatalogTable } from './ExtraCatalogTable';
import { listExtras, type ExtraProduct } from './extrasApi';

export function TasksExtrasListPage() {
  const { ownerId } = useFinancesOwnerScope();
  const [rows, setRows] = useState<ExtraProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listExtras({}, { ownerId }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ownerId]);

  return (
    <DashboardWrapper breadcrumb={['Task', 'Extra', 'Liste extra']}>
      <ExtraCatalogTable
        ownerId={ownerId}
        rows={rows}
        loading={loading}
        onRowsChange={setRows}
      />
    </DashboardWrapper>
  );
}
