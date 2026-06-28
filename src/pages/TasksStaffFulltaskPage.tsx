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
import listingsService from '../services/listingsService';
import { apiStaffToDesign, designStaffToApi, normalizeOwnerId } from '../utils/fulltaskMappers';
import { useAuth } from '../hooks/useAuth';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import TeamOwnerScopeBar from '../features/taskHub/staff-design/TeamOwnerScopeBar';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import { ownerDisplayNameFromId } from '../utils/ownerDisplay.utils';
import { filterStaffSelectableCities } from '../features/taskHub/staff-design/staffActiveCities';
import { ONBOARDING_LEGACY_TAB } from '../utils/teamUrlUtils';
import { PM_ONBOARDING_WIZARD_PATH } from '../features/onboarding/wizardNavigation';
import './tasksTeamPage.css';

type HubTab = 'equipe' | 'admin';

type ListingWithOwner = { id: string; name: string; ownerId?: string; ownerName?: string; cityId?: string };
type CityOption = { id: string; name: string };

function resolveStaffOwnerIdForSave(
  sessionOwnerId: string | undefined,
  adminFilterOwnerId: string | null | undefined,
  form: Staff,
  listings: ListingWithOwner[],
): string | undefined {
  const session = normalizeOwnerId(sessionOwnerId);
  if (session) return session;

  const fromForm = normalizeOwnerId(form.ownerId);
  if (fromForm) return fromForm;

  const fromFilter = normalizeOwnerId(adminFilterOwnerId);
  if (fromFilter) return fromFilter;

  const ownerIds = new Set<string>();
  for (const lid of form.allowedListingIds || []) {
    const listing = listings.find((l) => String(l.id) === String(lid));
    const oid = normalizeOwnerId(listing?.ownerId);
    if (oid) ownerIds.add(oid);
  }
  if (ownerIds.size === 1) return [...ownerIds][0];

  const allOwners = new Set(
    listings.map((l) => normalizeOwnerId(l.ownerId)).filter(Boolean) as string[],
  );
  if (allOwners.size === 1) return [...allOwners][0];

  return undefined;
}

function TasksStaffFulltaskPageInner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requestOwnerId, owners, showOwnerFilter } = useAdminOwnerFilter();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const filterOwnerId = useMemo(
    () =>
      scope.canAccessAllOwners
        ? normalizeOwnerId(requestOwnerId) || undefined
        : normalizeOwnerId(scope.ownerId),
    [scope.canAccessAllOwners, scope.ownerId, requestOwnerId],
  );

  const [hubTab, setHubTab] = useState<HubTab>(() =>
    searchParams.get('tab') === 'admin' ? 'admin' : 'equipe',
  );
  const [staff, setStaff] = useState<Staff[]>([]);
  const [admins, setAdmins] = useState<WhatsappAdminDesign[]>([]);
  const [listings, setListings] = useState<ListingWithOwner[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === ONBOARDING_LEGACY_TAB || tab === 'setup') {
      navigate(PM_ONBOARDING_WIZARD_PATH, { replace: true });
    }
  }, [searchParams, navigate]);

  const loadListings = useCallback(async () => {
    try {
      const response = await listingsService.getListings({
        useActiveFilter: true,
        active: true,
        limit: 200,
        page: 0,
        forListingsOverview: true,
        compact: false,
      });
      let mapped = (response.data?.items || [])
        .map((l) => ({
          id: String(l.id),
          name: String(l.name || 'Sans nom'),
          ownerId: normalizeOwnerId(l.ownerId),
          ownerName: l.ownerName,
          cityId: l.cityId ? String(l.cityId) : undefined,
        }))
        .filter((l) => l.id && l.id !== 'undefined');
      setListings(mapped);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur chargement annonces');
      setListings([]);
    }
  }, []);

  const loadCities = useCallback(async () => {
    try {
      const rows = await listingsService.getCities({ allCities: false, limit: 200 });
      setCities(
        filterStaffSelectableCities(rows)
          .map((c) => ({ id: String(c._id), name: String(c.name || c._id) }))
          .filter((c) => c.id && c.id !== 'undefined'),
      );
    } catch {
      setCities([]);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const params: Record<string, unknown> = {};
      if (filterOwnerId) {
        params.owner_id = filterOwnerId;
        params.ownerId = filterOwnerId;
      }
      const staffRes = await fulltaskApi.listStaff(params);
      let rows = (staffRes?.data || []) as Record<string, unknown>[];
      if (filterOwnerId) {
        rows = rows.filter((r) => {
          const oid = normalizeOwnerId(r.ownerId);
          return !oid || oid === filterOwnerId;
        });
      }
      setStaff(rows.map((r) => apiStaffToDesign(r) as Staff));
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'Erreur chargement équipe');
    } finally {
      setLoadingStaff(false);
    }
  }, [filterOwnerId]);

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const params: Record<string, unknown> = { paged: false };
      if (filterOwnerId) params.owner_id = filterOwnerId;
      const res = await fulltaskApi.listWhatsappAdmins(params);
      const rows = (res.data || []) as Record<string, unknown>[];
      setAdmins(rows.map(apiWhatsappAdminToDesign));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur chargement admins');
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, [filterOwnerId]);

  useEffect(() => {
    void loadListings();
    void loadCities();
  }, [loadListings, loadCities]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (hubTab === 'admin') void loadAdmins();
  }, [hubTab, loadAdmins]);

  const ownerOptions = useMemo(
    () =>
      (owners || [])
        .map((o) => ({
          id: String(o._id ?? o.id ?? ''),
          label: ownerDisplayNameFromId(String(o._id ?? o.id ?? ''), owners || []),
        }))
        .filter((o) => o.id && o.id !== 'undefined'),
    [owners],
  );

  const scopedOwnerLabel = useMemo(() => {
    if (filterOwnerId) {
      return ownerDisplayNameFromId(filterOwnerId, owners || []);
    }
    if (showOwnerFilter) return '';
    const legacyName =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.email || '';
    return legacyName;
  }, [filterOwnerId, owners, showOwnerFilter, user]);

  const selectTab = (tab: HubTab) => {
    setHubTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'admin') next.set('tab', 'admin');
    else next.delete('tab');
    const qs = next.toString();
    navigate(qs ? `/tasks/team?${qs}` : '/tasks/team', { replace: true });
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'admin') setHubTab('admin');
    else if (tab !== ONBOARDING_LEGACY_TAB && tab !== 'setup') setHubTab('equipe');
  }, [searchParams]);

  return (
    <DashboardWrapper breadcrumb={['Task', 'Équipe']}>
      <div className="tasks-team-hub">
        <TeamOwnerScopeBar />
        <div className="tasks-team-tabs">
          <button
            type="button"
            className={`tasks-team-tab${hubTab === 'equipe' ? ' on' : ''}`}
            onClick={() => selectTab('equipe')}
          >
            Équipe terrain
          </button>
          <button
            type="button"
            className={`tasks-team-tab${hubTab === 'admin' ? ' on' : ''}`}
            onClick={() => selectTab('admin')}
          >
            Admin WhatsApp
          </button>
        </div>

        {hubTab === 'equipe' ? (
          <StaffPageView
            staff={staff}
            listings={listings}
            cities={cities}
            loading={loadingStaff}
            useMockFallback={false}
            showOwnerPicker={showOwnerFilter}
            ownerOptions={ownerOptions}
            sessionOwnerId={scope.canAccessAllOwners ? undefined : scope.ownerId}
            filterOwnerId={filterOwnerId}
            scopedOwnerLabel={scopedOwnerLabel}
            onSave={async (form, editingId) => {
              try {
                const resolvedOwnerId = resolveStaffOwnerIdForSave(
                  scope.canAccessAllOwners ? undefined : scope.ownerId,
                  requestOwnerId,
                  form,
                  listings,
                );
                if (!resolvedOwnerId && !editingId && scope.canAccessAllOwners) {
                  const selectedOwners = new Set(
                    (form.allowedListingIds || [])
                      .map((lid) => {
                        const listing = listings.find((l) => String(l.id) === String(lid));
                        return normalizeOwnerId(listing?.ownerId);
                      })
                      .filter(Boolean) as string[],
                  );
                  const msg =
                    selectedOwners.size > 1
                      ? 'Les annonces sélectionnées appartiennent à plusieurs propriétaires. Choisissez un seul PM.'
                      : 'Choisissez le propriétaire (PM) dans le formulaire avant d\'enregistrer.';
                  toast.error(msg);
                  throw new Error(msg);
                }
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
                const adminOwnerId = resolveStaffOwnerIdForSave(
                  scope.canAccessAllOwners ? undefined : scope.ownerId,
                  requestOwnerId,
                  { allowedListingIds: form.listingIds, ownerId: form.ownerId } as Staff,
                  listings,
                );
                if (!adminOwnerId && !editingId && scope.canAccessAllOwners) {
                  const msg =
                    "Sélectionnez un propriétaire (filtre en tête de page) ou rattachez l'admin à une annonce.";
                  toast.error(msg);
                  throw new Error(msg);
                }
                const body = designWhatsappAdminToApi(form, adminOwnerId);
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

/** Provider requis pour le filtre propriétaire (admins cross-tenant). */
export default function TasksStaffFulltaskPage() {
  return (
    <AdminOwnerScopeLayout showTopBar={false}>
      <TasksStaffFulltaskPageInner />
    </AdminOwnerScopeLayout>
  );
}
