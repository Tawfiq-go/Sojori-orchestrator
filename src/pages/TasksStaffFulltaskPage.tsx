import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StaffPageView from '../features/taskHub/staff-design/StaffPageView';
import WhatsappAdminPageView from '../features/taskHub/staff-design/WhatsappAdminPageView';
import type { Staff } from '../features/taskHub/staff-design/types';
import {
  apiWhatsappAdminToDesign,
  designWhatsappAdminToApi,
  type WhatsappAdminDesign,
} from '../features/taskHub/staff-design/whatsappAdminTypes';
import * as fulltaskApi from '../services/fulltaskApi';
import { getListingsTa } from '../features/tasks/services/serverApi.task';
import fulltaskTasksService from '../services/fulltaskTasksService';
import { apiStaffToDesign, designStaffToApi } from '../utils/fulltaskMappers';
import { useAuth } from '../hooks/useAuth';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import './tasksTeamPage.css';

type HubTab = 'equipe' | 'admin';

function resolveStaffOwnerIdForSave(
  sessionOwnerId: string | undefined,
  form: Staff,
  listings: { id: string; name: string; ownerId?: string }[],
): string | undefined {
  if (sessionOwnerId) return sessionOwnerId;
  if (form.ownerId) return form.ownerId;
  const allowed = form.allowedListingIds || [];
  for (const lid of allowed) {
    const listing = listings.find((l) => l.id === lid);
    if (listing?.ownerId) return listing.ownerId;
  }
  const owners = [
    ...new Set(listings.map((l) => l.ownerId).filter(Boolean) as string[]),
  ];
  if (owners.length === 1) return owners[0];
  return undefined;
}

export default function TasksStaffFulltaskPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const ownerId = scope.canAccessAllOwners ? undefined : scope.ownerId;

  const [hubTab, setHubTab] = useState<HubTab>(
    searchParams.get('tab') === 'admin' ? 'admin' : 'equipe',
  );
  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<WhatsappAdminDesign[]>([]);
  const [listings, setListings] = useState<{ id: string; name: string }[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const loadListings = useCallback(async () => {
    try {
      const rows = (await getListingsTa(false)) as Array<{
        id?: string;
        _id?: string;
        name?: string;
        ownerId?: string;
      }>;
      let mapped = (rows || [])
        .map((l) => ({
          id: String(l.id ?? l._id ?? ''),
          name: String(l.name || 'Sans nom'),
          ownerId: l.ownerId ? String(l.ownerId) : undefined,
        }))
        .filter((l) => l.id && l.id !== 'undefined');
      if (ownerId) {
        mapped = mapped.filter((l) => !l.ownerId || l.ownerId === String(ownerId));
      }
      setListings(mapped);
    } catch {
      try {
        const listingRows = await fulltaskTasksService.getListings();
        let mapped = listingRows
          .map((l) => ({
            id: String(l.id ?? l._id ?? ''),
            name: String(l.name || 'Sans nom'),
            ownerId: (l as { ownerId?: string }).ownerId,
          }))
          .filter((l) => l.id && l.id !== 'undefined');
        if (ownerId) {
          mapped = mapped.filter((l) => !l.ownerId || l.ownerId === String(ownerId));
        }
        setListings(mapped);
      } catch (e: unknown) {
        const err = e as { message?: string };
        toast.error(err.message || 'Erreur chargement annonces');
        setListings([]);
      }
    }
  }, [ownerId]);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const params: Record<string, unknown> = {};
      if (ownerId) params.owner_id = ownerId;
      const staffRes = await fulltaskApi.listStaff(params);
      const rows = staffRes?.data || [];
      setStaff(rows.map((r: Record<string, unknown>) => apiStaffToDesign(r) as Staff));
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur chargement équipe');
    } finally {
      setLoadingStaff(false);
    }
  }, [ownerId]);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const params: Record<string, unknown> = { paged: false };
      if (ownerId) params.owner_id = ownerId;
      const res = await fulltaskApi.listWhatsappAdmins(params);
      const rows = (res?.data || []) as Record<string, unknown>[];
      setAdmins(rows.map(apiWhatsappAdminToDesign));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur chargement admins');
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void loadListings();
    void loadStaff();
  }, [loadListings, loadStaff]);

  useEffect(() => {
    if (hubTab === 'admin') void loadAdmins();
  }, [hubTab, loadAdmins]);

  const selectTab = (tab: HubTab) => {
    setHubTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'admin') next.set('tab', 'admin');
    else next.delete('tab');
    const qs = next.toString();
    navigate(qs ? `/tasks/team?${qs}` : '/tasks/team', { replace: true });
  };

  return (
    <DashboardWrapper breadcrumb={['taskNew', 'Équipe & Admin WA']}>
      <div className="tasks-team-hub">
        <div className="tasks-team-tabs">
          <button
            type="button"
            className={`tasks-team-tab${hubTab === 'equipe' ? ' on' : ''}`}
            onClick={() => selectTab('equipe')}
          >
            1 · Équipe
          </button>
          <button
            type="button"
            className={`tasks-team-tab${hubTab === 'admin' ? ' on' : ''}`}
            onClick={() => selectTab('admin')}
          >
            2 · Admin
          </button>
        </div>

        {hubTab === 'equipe' ? (
          <StaffPageView
            staff={staff}
            listings={listings}
            loading={loadingStaff}
            useMockFallback={false}
            onSave={async (form, editingId) => {
              try {
                const resolvedOwnerId = resolveStaffOwnerIdForSave(ownerId, form, listings);
                const body = designStaffToApi(form as Record<string, unknown>, {
                  isCreate: !editingId,
                  ownerId: resolvedOwnerId,
                });
                if (editingId) await fulltaskApi.updateStaff(editingId, body);
                else await fulltaskApi.createStaff(body);
                toast.success('Staff enregistré');
                await loadStaff();
              } catch (e: unknown) {
                const err = e as { response?: { data?: { error?: string } }; message?: string };
                toast.error(err.response?.data?.error || err.message || 'Erreur');
                throw e;
              }
            }}
            onDelete={async (id) => {
              try {
                await fulltaskApi.deleteStaff(id);
                toast.success('Staff supprimé');
                await loadStaff();
              } catch (e: unknown) {
                const err = e as { response?: { data?: { error?: string } }; message?: string };
                toast.error(err.response?.data?.error || err.message || 'Erreur suppression');
              }
            }}
          />
        ) : (
          <WhatsappAdminPageView
            admins={admins}
            listings={listings}
            loading={loadingAdmins}
            onSave={async (form, editingId) => {
              try {
                const body = designWhatsappAdminToApi(form, ownerId);
                if (editingId) await fulltaskApi.updateWhatsappAdmin(editingId, body);
                else await fulltaskApi.createWhatsappAdmin(body);
                toast.success('Admin enregistré');
                await loadAdmins();
              } catch (e: unknown) {
                const err = e as { response?: { data?: { error?: string } }; message?: string };
                toast.error(err.response?.data?.error || err.message || 'Erreur');
                throw e;
              }
            }}
            onDelete={async (id) => {
              try {
                await fulltaskApi.deleteWhatsappAdmin(id);
                toast.success('Admin supprimé');
                await loadAdmins();
              } catch (e: unknown) {
                const err = e as { response?: { data?: { error?: string } }; message?: string };
                toast.error(err.response?.data?.error || err.message || 'Erreur suppression');
              }
            }}
          />
        )}
      </div>
    </DashboardWrapper>
  );
}
