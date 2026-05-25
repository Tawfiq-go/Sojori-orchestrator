import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StaffPageView from '../features/taskHub/staff-design/StaffPageView';
import type { Staff } from '../features/taskHub/staff-design/types';
import * as fulltaskApi from '../services/fulltaskApi';
import fulltaskTasksService from '../services/fulltaskTasksService';
import { apiStaffToDesign, designStaffToApi } from '../utils/fulltaskMappers';
import { useAuth } from '../hooks/useAuth';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';

export default function TasksStaffFulltaskPage() {
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const ownerId = scope.canAccessAllOwners ? undefined : scope.ownerId;

  const [staff, setStaff] = useState<Staff[]>([]);
  const [listings, setListings] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, listingRows] = await Promise.all([
        fulltaskApi.listStaff(),
        fulltaskTasksService.getListings(),
      ]);
      let rows = staffRes?.data || [];
      if (ownerId) {
        rows = rows.filter(
          (s: Record<string, unknown>) => !s.ownerId || String(s.ownerId) === String(ownerId),
        );
      }
      setStaff(rows.map((r: Record<string, unknown>) => apiStaffToDesign(r) as Staff));
      setListings(
        listingRows.map((l) => ({
          id: String(l.id),
          name: String(l.name),
        })),
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur chargement staff');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardWrapper breadcrumb={['taskNew', 'Équipe Staff']}>
      <StaffPageView
        staff={staff}
        listings={listings}
        loading={loading}
        useMockFallback
        onSave={async (form, editingId) => {
          try {
            const body = designStaffToApi(form as Record<string, unknown>);
            if (editingId) await fulltaskApi.updateStaff(editingId, body);
            else await fulltaskApi.createStaff(body);
            toast.success('Staff enregistré');
            await load();
          } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } }; message?: string };
            toast.error(err.response?.data?.error || err.message || 'Erreur');
            throw e;
          }
        }}
      />
    </DashboardWrapper>
  );
}
