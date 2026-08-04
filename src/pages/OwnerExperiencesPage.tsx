import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  partnersApi,
  type Partner,
  type PartnerService,
  type PartnerServiceFormule,
  type PartnerServicePayment,
  type PartnerServiceSchedule,
  type PartnerServiceContact,
  type PartnerServiceConfirmation,
  type PartnerServiceProviderReminder,
  type PartnerServiceShareGuestContact,
  type ShareGuestContactWhen,
  type PaymentMethod,
  DEFAULT_SCHEDULE,
  DEFAULT_PAYMENT,
  DEFAULT_CONFIRMATION,
  DEFAULT_PROVIDER_REMINDER,
  DEFAULT_SHARE_GUEST_CONTACT,
} from '../services/partnersApi';
import { postFormDataAsMultipart } from '../utils/upload/postFormData';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { listingsService } from '../services/listingsService';
import CityAssociationField from '../features/listing/components/ConfigOrchestration/CityAssociationField';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import './partnersAdmin.css';

type Draft = {
  partnerId: string;
  category: string;
  title: string;
  description: string;
  whatsapp: string;
  cityIds: 'all' | string[];
  photos: string[];
  formules: PartnerServiceFormule[];
  schedule: PartnerServiceSchedule;
  payment: PartnerServicePayment;
  contact: PartnerServiceContact;
  confirmation: PartnerServiceConfirmation;
  providerReminder: PartnerServiceProviderReminder;
  shareGuestContact: PartnerServiceShareGuestContact;
  active: boolean;
  sortOrder: number;
  forSale: boolean;
};

const REMINDER_OFFSETS = [
  { v: 3, l: 'J-3' },
  { v: 2, l: 'J-2' },
  { v: 1, l: 'J-1' },
  { v: 0, l: 'J0 (jour même)' },
];

const SHARE_WHEN: { v: ShareGuestContactWhen; l: string }[] = [
  { v: 'immediate', l: 'Immédiatement (dans le message info)' },
  { v: 'J-3', l: 'J-3' },
  { v: 'J-2', l: 'J-2' },
  { v: 'J-1', l: 'J-1' },
  { v: 'J0', l: 'J0 (jour même)' },
];

const CATS = [
  { v: 'Aventure', l: 'Aventure' },
  { v: 'Quad', l: 'Quad' },
  { v: 'Excursion', l: 'Excursion' },
  { v: 'Vue d’en haut', l: 'Vue d’en haut' },
  { v: 'Culture & nature', l: 'Culture & nature' },
  { v: 'Mobilité', l: 'Mobilité' },
  { v: 'Soirée', l: 'Soirée' },
];

const PAY_METHODS: { v: PaymentMethod; l: string }[] = [
  { v: 'card', l: 'Carte' },
  { v: 'cash', l: 'Cash' },
  { v: 'transfer', l: 'Virement' },
];

const inpBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 'var(--pa-r)',
  border: '1px solid var(--pa-line)',
  background: 'var(--pa-surface)',
  fontSize: 14,
};

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '10px 17px',
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
};

function btnGold(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...btnBase,
    background: 'var(--pa-gold)',
    color: '#2C2005',
    border: '1px solid var(--pa-gold)',
    ...extra,
  };
}
function btnOutline(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...btnBase,
    background: 'var(--pa-surface)',
    color: 'var(--pa-ink)',
    border: '1px solid var(--pa-line)',
    ...extra,
  };
}
function btnDanger(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...btnBase,
    background: 'transparent',
    color: 'var(--pa-danger)',
    border: '1px solid var(--pa-line)',
    ...extra,
  };
}

function money(n: number) {
  return Number(n || 0)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ');
}

function emptyDraft(): Draft {
  return {
    partnerId: '',
    category: 'Aventure',
    title: '',
    description: '',
    whatsapp: '',
    cityIds: 'all',
    photos: [],
    formules: [{ label: '', priceMad: 0 }],
    schedule: { ...DEFAULT_SCHEDULE },
    payment: { ...DEFAULT_PAYMENT, methods: [...DEFAULT_PAYMENT.methods] },
    contact: { firstName: '', lastName: '', email: '' },
    confirmation: { ...DEFAULT_CONFIRMATION },
    providerReminder: { ...DEFAULT_PROVIDER_REMINDER },
    shareGuestContact: { ...DEFAULT_SHARE_GUEST_CONTACT },
    active: true,
    sortOrder: 0,
    forSale: false,
  };
}

function toDraft(s: PartnerService): Draft {
  const formules =
    Array.isArray(s.formules) && s.formules.length
      ? s.formules.map((f) => ({ label: f.label || '', priceMad: Number(f.priceMad) || 0 }))
      : [{ label: '', priceMad: 0 }];
  const pay = s.payment || DEFAULT_PAYMENT;
  return {
    partnerId: s.partnerId ? String(s.partnerId) : '',
    category: s.category || 'Aventure',
    title: s.title || '',
    description: s.description || '',
    whatsapp: s.whatsapp || '',
    cityIds: s.cityIds === undefined || s.cityIds === null ? 'all' : s.cityIds,
    photos: Array.isArray(s.photos) ? s.photos.slice(0, 3) : [],
    formules,
    schedule: { ...DEFAULT_SCHEDULE, ...(s.schedule || {}) },
    payment: {
      methods: Array.isArray(pay.methods) && pay.methods.length ? [...pay.methods] : ['cash'],
      collection: pay.collection === 'deposit' ? 'deposit' : 'full',
      depositPercent: pay.depositPercent ?? null,
      timing: pay.timing === 'on_confirmation' ? 'on_confirmation' : 'instant',
    },
    contact: {
      firstName: s.contact?.firstName || '',
      lastName: s.contact?.lastName || '',
      email: s.contact?.email || '',
    },
    confirmation: { ...DEFAULT_CONFIRMATION, ...(s.confirmation || {}) },
    providerReminder: { ...DEFAULT_PROVIDER_REMINDER, ...(s.providerReminder || {}) },
    shareGuestContact: { ...DEFAULT_SHARE_GUEST_CONTACT, ...(s.shareGuestContact || {}) },
    active: s.active !== false,
    sortOrder: s.sortOrder || 0,
    forSale: Boolean(s.forSale),
  };
}

/** Clé provider : fiche Partner (Dreams / NOMMOS…) plutôt que owner:… générique. */
function experienceProviderKey(
  s: PartnerService,
  partnersByOwnerId?: Map<string, { id: string; name: string }>,
): string {
  if (s.providerId) return String(s.providerId);
  if (s.partnerId) return String(s.partnerId);
  if (s.ownerId) {
    const fiche = partnersByOwnerId?.get(String(s.ownerId));
    if (fiche?.id) return fiche.id;
    return `owner:${String(s.ownerId)}`;
  }
  return 'owner';
}

function experienceProviderLabel(
  s: PartnerService,
  partnersById: Map<string, string>,
  partnersByOwnerId: Map<string, { id: string; name: string }>,
): string {
  if (s.providerName) return String(s.providerName);
  if (s.partnerId) return partnersById.get(String(s.partnerId)) || 'Sojori';
  if (s.providerId) return partnersById.get(String(s.providerId)) || String(s.providerId);
  if (s.ownerId) {
    return partnersByOwnerId.get(String(s.ownerId))?.name || 'Mes expériences';
  }
  return 'Mes expériences';
}

/**
 * Own = catalogue PM CRUD (`/experiences` → partnerId null, providerKind owner).
 * Sojori = catalogue partenaires plateforme (`partnerId` set / providerKind partner).
 * Ne pas utiliser le libellé fiche owner (« Dreams ») comme proxy d’ownership :
 * ce nom wrappe seulement le provider label, pas le bulk des services liés.
 */
function isOwnExperience(s: PartnerService): boolean {
  // load() marque Mes = providerKind owner, Marché = partner
  return s.providerKind !== 'partner';
}

type CatalogTab = 'own' | 'sojori';

export function OwnerExperiencesPage() {
  const { requestOwnerId, showOwnerFilter, ownerScopeUnset } = useAdminOwnerFilter();
  const [rows, setRows] = useState<PartnerService[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [cities, setCities] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [formTab, setFormTab] = useState<'config' | 'contact'>('config');
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('own');
  const [q, setQ] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupBy, setGroupBy] = useState<'city' | 'category'>('category');
  /** Ids marché Activés pour mes listings */
  const [marketAdopted, setMarketAdopted] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (showOwnerFilter && ownerScopeUnset) {
      setRows([]);
      setPartners([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ownerParams = requestOwnerId ? { ownerId: String(requestOwnerId) } : undefined;
      const [ownList, marketList, partnersList, citiesRes, adoptedIds] = await Promise.all([
        partnersApi.listExperiences(ownerParams),
        partnersApi
          .listExperienceCatalog({
            scope: 'sojori',
            marketMode: 'browse',
            ownerId: requestOwnerId ? String(requestOwnerId) : undefined,
          })
          .catch(() => [] as PartnerService[]),
        partnersApi
          .list({ includePlatform: false, ownerId: requestOwnerId ? String(requestOwnerId) : undefined })
          .catch(() => [] as Partner[]),
        listingsService.getCities({ limit: 200 }).catch(() => null),
        partnersApi.listMarketAdoptions(ownerParams).catch(() => [] as string[]),
      ]);
      setMarketAdopted(new Set((adoptedIds || []).map(String)));
      const partnersArr = Array.isArray(partnersList) ? partnersList : [];
      setPartners(partnersArr);

      const byId = new Map<string, PartnerService>();
      for (const s of ownList || []) {
        byId.set(s.id, {
          ...s,
          providerKind: 'owner',
          providerName:
            s.providerName ||
            (s.partnerId
              ? partnersArr.find((p) => p.id === s.partnerId)?.name
              : undefined) ||
            undefined,
        });
      }
      for (const s of marketList || []) {
        if (byId.has(s.id)) continue;
        byId.set(s.id, { ...s, providerKind: 'partner' });
      }

      setRows(Array.from(byId.values()));

      const cityList = (citiesRes?.data?.cities ?? citiesRes?.data ?? citiesRes ?? []) as Array<{
        _id: string;
        name: string;
      }>;
      setCities(Array.isArray(cityList) ? cityList.filter((c) => c._id && c.name) : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement expériences impossible');
    } finally {
      setLoading(false);
    }
  }, [requestOwnerId, showOwnerFilter, ownerScopeUnset]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'market' || params.get('tab') === 'market') {
      setCatalogTab('sojori');
    }
  }, []);

  const partnersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of partners) {
      if (p.id && p.name) map.set(String(p.id), p.name);
    }
    return map;
  }, [partners]);

  const partnersByOwnerId = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of partners) {
      if (!p.ownerId || !p.name || !p.id) continue;
      const oid = String(p.ownerId);
      if (!map.has(oid) || p.active !== false) {
        map.set(oid, { id: String(p.id), name: p.name });
      }
    }
    return map;
  }, [partners]);

  const ownRows = useMemo(() => rows.filter(isOwnExperience), [rows]);
  const sojoriRows = useMemo(() => rows.filter((r) => !isOwnExperience(r)), [rows]);
  const scopedRows = catalogTab === 'own' ? ownRows : sojoriRows;
  const canEditCatalog = catalogTab === 'own';

  /** Filtre provider sur Mes (fiches) et Marché. */
  const providers = useMemo(() => {
    const map = new Map<string, string>();
    if (catalogTab === 'own') {
      for (const p of partners) {
        if (p.id && p.name) map.set(String(p.id), p.name);
      }
    } else {
      for (const r of sojoriRows) {
        const id = experienceProviderKey(r, partnersByOwnerId);
        const name = experienceProviderLabel(r, partnersById, partnersByOwnerId);
        if (!map.has(id)) map.set(id, name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [catalogTab, partners, sojoriRows, partnersById, partnersByOwnerId]);

  useEffect(() => {
    if (providerFilter === 'all') return;
    if (providers.some((p) => p.id === providerFilter)) return;
    setProviderFilter('all');
  }, [providers, providerFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of CATS) set.add(c.v);
    for (const r of scopedRows) {
      if (r.category) set.add(String(r.category));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [scopedRows]);

  useEffect(() => {
    if (categoryFilter === 'all') return;
    if (categories.includes(categoryFilter)) return;
    setCategoryFilter('all');
  }, [categories, categoryFilter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scopedRows.filter((r) => {
      if (providerFilter !== 'all') {
        const pid =
          catalogTab === 'own'
            ? String(r.partnerId || '')
            : experienceProviderKey(r, partnersByOwnerId);
        if (pid !== providerFilter) return false;
      }
      if (categoryFilter !== 'all' && String(r.category || '') !== categoryFilter) return false;
      if (!needle) return true;
      const provider = experienceProviderLabel(r, partnersById, partnersByOwnerId);
      return (
        r.title.toLowerCase().includes(needle) ||
        r.category.toLowerCase().includes(needle) ||
        (r.description || '').toLowerCase().includes(needle) ||
        provider.toLowerCase().includes(needle)
      );
    });
  }, [
    scopedRows,
    q,
    providerFilter,
    categoryFilter,
    partnersById,
    partnersByOwnerId,
    catalogTab,
  ]);

  const cityName = useCallback(
    (id: string) => cities.find((c) => c._id === id)?.name || id,
    [cities],
  );

  /** Groupement : catégorie (défaut) ou ville. */
  const groupedRows = useMemo(() => {
    const buckets = new Map<string, PartnerService[]>();
    for (const s of filtered) {
      if (groupBy === 'category') {
        const key = String(s.category || 'Autre');
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(s);
        continue;
      }
      const ids =
        s.cityIds === 'all' || s.cityIds === undefined || s.cityIds === null
          ? ['all']
          : Array.isArray(s.cityIds) && s.cityIds.length
            ? s.cityIds.map(String)
            : ['all'];
      for (const cid of ids) {
        const list = buckets.get(cid) || [];
        list.push(s);
        buckets.set(cid, list);
      }
    }
    const keys = Array.from(buckets.keys()).sort((a, b) => {
      if (groupBy === 'city') {
        if (a === 'all') return -1;
        if (b === 'all') return 1;
        return cityName(a).localeCompare(cityName(b), 'fr');
      }
      return a.localeCompare(b, 'fr');
    });
    return keys.map((key) => ({
      key,
      label:
        groupBy === 'category'
          ? key
          : key === 'all'
            ? 'Toutes les villes'
            : cityName(key),
      items: buckets.get(key) || [],
    }));
  }, [filtered, cityName, groupBy]);

  const openNew = () => {
    if (!canEditCatalog) return;
    if (!partners.length) {
      toast.error('Déclarez d’abord une fiche provider (Expériences → Ma fiche)');
      return;
    }
    setIsNew(true);
    setSelectedId(null);
    const draft0 = emptyDraft();
    const preferred =
      partners.find((p) => p.active !== false)?.id || partners[0]?.id || '';
    draft0.partnerId = preferred;
    setDraft(draft0);
    setFormTab('config');
  };

  const openEdit = (s: PartnerService) => {
    setIsNew(false);
    setSelectedId(s.id);
    setDraft(toDraft(s));
    setFormTab('config');
  };

  const closeEditor = () => {
    setIsNew(false);
    setSelectedId(null);
    setDraft(emptyDraft());
    setFormTab('config');
  };

  const switchCatalogTab = (next: CatalogTab) => {
    if (next === catalogTab) return;
    setCatalogTab(next);
    setProviderFilter('all');
    setCategoryFilter('all');
    setQ('');
    closeEditor();
  };

  const save = async () => {
    if (!canEditCatalog) {
      toast.error('Les expériences du marché sont en lecture seule');
      return;
    }
    if (!draft.partnerId) {
      toast.error('Choisissez une fiche provider pour cette activité');
      return;
    }
    if (!draft.title.trim() || !draft.category.trim()) {
      toast.error('Titre et catégorie requis');
      return;
    }
    const formules = draft.formules
      .map((f) => ({ label: f.label.trim(), priceMad: Number(f.priceMad) || 0 }))
      .filter((f) => f.label);
    if (!formules.length) {
      toast.error('Au moins une formule');
      return;
    }
    if (!draft.payment.methods.length) {
      toast.error('Choisissez au moins un mode de paiement');
      return;
    }
    const wa = draft.whatsapp.trim().replace(/[\s.-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(wa)) {
      toast.error('WhatsApp provider obligatoire (format E.164, ex. +2126…)');
      return;
    }
    const needsRemote = draft.payment.methods.some((m) => m === 'card' || m === 'transfer');
    const payment: PartnerServicePayment = {
      methods: draft.payment.methods,
      collection: needsRemote && draft.payment.collection === 'deposit' ? 'deposit' : 'full',
      depositPercent:
        needsRemote && draft.payment.collection === 'deposit'
          ? Number(draft.payment.depositPercent) || 30
          : null,
      timing: draft.payment.timing === 'on_confirmation' ? 'on_confirmation' : 'instant',
    };
    const body = {
      partnerId: draft.partnerId,
      category: draft.category.trim(),
      title: draft.title.trim(),
      description: draft.description,
      whatsapp: wa,
      cityIds: draft.cityIds,
      photos: draft.photos.slice(0, 3),
      formules,
      schedule: draft.schedule,
      payment,
      contact: {
        firstName: (draft.contact.firstName || '').trim(),
        lastName: (draft.contact.lastName || '').trim(),
        email: (draft.contact.email || '').trim(),
      },
      confirmation: {
        slaHours: Number(draft.confirmation.slaHours) || 12,
        remindBeforeHours: Number(draft.confirmation.remindBeforeHours) || 0,
        remindAfterHours: Number(draft.confirmation.remindAfterHours) || 0,
      },
      providerReminder: {
        offsetDays: Number(draft.providerReminder.offsetDays) || 0,
        time: draft.providerReminder.time || '18:00',
      },
      shareGuestContact: {
        enabled: Boolean(draft.shareGuestContact.enabled),
        when: draft.shareGuestContact.when,
        time: draft.shareGuestContact.time || '',
      },
      active: draft.active,
      sortOrder: draft.sortOrder,
      forSale: draft.forSale,
      ...(requestOwnerId ? { ownerId: String(requestOwnerId) } : {}),
    };
    setSaving(true);
    try {
      const existing = !isNew && selectedId ? rows.find((r) => r.id === selectedId) : null;
      if (existing && !isOwnExperience(existing)) {
        toast.error('Les expériences du marché sont en lecture seule');
        return;
      }
      if (isNew) {
        const created = await partnersApi.createExperience(body);
        toast.success('Expérience créée');
        await load();
        openEdit(created);
      } else if (selectedId) {
        await partnersApi.updateExperience(selectedId, body);
        toast.success('Enregistré');
        await load();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveQuick = async (s: PartnerService, nextActive: boolean) => {
    if (!canEditCatalog || !isOwnExperience(s)) return;
    setSaving(true);
    try {
      await partnersApi.updateExperience(s.id, { active: nextActive });
      setRows((prev) =>
        prev.map((r) => (r.id === s.id ? { ...r, active: nextActive } : r)),
      );
      if (selectedId === s.id) {
        setDraft((d) => ({ ...d, active: nextActive }));
      }
      toast.success(
        nextActive
          ? 'Activée → dispo pour vos listings'
          : 'Désactivée → hors picker listings',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const toggleForSaleQuick = async (s: PartnerService, nextForSale: boolean) => {
    if (!canEditCatalog || !isOwnExperience(s)) return;
    setSaving(true);
    try {
      await partnersApi.updateExperience(s.id, { forSale: nextForSale });
      setRows((prev) =>
        prev.map((r) => (r.id === s.id ? { ...r, forSale: nextForSale } : r)),
      );
      if (selectedId === s.id) {
        setDraft((d) => ({ ...d, forSale: nextForSale }));
      }
      toast.success(
        nextForSale ? 'For sale → visible aux autres owners' : 'Retirée du marché',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const toggleMarketAdopt = async (s: PartnerService, nextAdopted: boolean) => {
    if (canEditCatalog) return;
    setSaving(true);
    try {
      const ids = await partnersApi.setMarketAdoption({
        experienceId: s.id,
        adopted: nextAdopted,
        ...(requestOwnerId ? { ownerId: String(requestOwnerId) } : {}),
      });
      setMarketAdopted(new Set(ids.map(String)));
      toast.success(
        nextAdopted
          ? 'Activée → dispo pour vos listings'
          : 'Désactivée → hors picker listings',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  /** Activer / désactiver l’ensemble visible (Mes = active, Marché = adoption). */
  const activateAllVisible = async (nextOn: boolean) => {
    if (!filtered.length) return;
    setSaving(true);
    try {
      if (catalogTab === 'own') {
        await Promise.all(
          filtered.map((s) => partnersApi.updateExperience(s.id, { active: nextOn })),
        );
        const ids = new Set(filtered.map((s) => s.id));
        setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, active: nextOn } : r)));
      } else {
        const ids = await partnersApi.setMarketAdoption({
          experienceIds: filtered.map((s) => s.id),
          adopted: nextOn,
          ...(requestOwnerId ? { ownerId: String(requestOwnerId) } : {}),
        });
        setMarketAdopted(new Set(ids.map(String)));
      }
      toast.success(
        nextOn
          ? `${filtered.length} activée(s) → vos listings`
          : `${filtered.length} désactivée(s)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!canEditCatalog || !selectedId || isNew) return;
    if (!window.confirm('Supprimer cette expérience ?')) return;
    setSaving(true);
    try {
      const existing = rows.find((r) => r.id === selectedId);
      if (!existing || !isOwnExperience(existing)) {
        toast.error('Les expériences Sojori sont en lecture seule');
        return;
      }
      await partnersApi.removeExperience(selectedId);
      toast.success('Supprimée');
      closeEditor();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const slots = 3 - draft.photos.length;
    if (slots <= 0) {
      toast.info('Maximum 3 photos');
      return;
    }
    const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const allowedExt = /\.(jpe?g|png|webp)$/i;
    const maxBytes = 1 * 1024 * 1024; // 1 Mo — idéal WhatsApp flow
    const picked = Array.from(files).slice(0, slots);
    const valid: File[] = [];
    for (const file of picked) {
      const mimeOk = allowedMime.has(file.type) || (!file.type && allowedExt.test(file.name));
      const extOk = allowedExt.test(file.name) || allowedMime.has(file.type);
      if (!mimeOk || !extOk) {
        toast.error(`${file.name} : formats acceptés JPEG, PNG ou WebP`);
        continue;
      }
      if (file.size > maxBytes) {
        toast.error(`${file.name} : max 1 Mo`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;
    try {
      const formData = new FormData();
      valid.forEach((file) => formData.append('media', file));
      formData.append('type', 'partner-services');
      formData.append('name', `experience-${Date.now()}`);
      const { data } = await postFormDataAsMultipart(
        MICROSERVICE_BASE_URL.UPLOAD_IMAGE_MULTIPLE,
        formData,
      );
      const urls = (Array.isArray(data?.files) ? data.files : [])
        .map((f: { url?: string }) => f?.url)
        .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
      if (!urls.length) throw new Error('Aucune URL renvoyée');
      setDraft((d) => ({ ...d, photos: [...d.photos, ...urls].slice(0, 3) }));
      toast.success(`${urls.length} photo(s) uploadée(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload impossible');
    }
  };

  const toggleMethod = (m: PaymentMethod) => {
    setDraft((d) => {
      const has = d.payment.methods.includes(m);
      const methods = has ? d.payment.methods.filter((x) => x !== m) : [...d.payment.methods, m];
      return { ...d, payment: { ...d.payment, methods: methods.length ? methods : ['cash'] } };
    });
  };

  const showEditor = isNew || !!selectedId;
  useEffect(() => {
    if (!showEditor) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditor();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- closeEditor is stable enough for escape
  }, [showEditor]);

  const needsRemotePay = draft.payment.methods.some((m) => m === 'card' || m === 'transfer');

  return (
    <div className="pa-root" style={{ height: 'auto', minHeight: 'calc(100vh - 56px)', padding: '20px 24px 48px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div className="pa-lbl">Catalogue global</div>
          <h1 className="pa-d" style={{ margin: '6px 0 8px', fontSize: 32 }}>
            Expériences
          </h1>
          <p style={{ margin: 0, color: 'var(--pa-ink3)', fontSize: 14, maxWidth: 640 }}>
            {catalogTab === 'own'
              ? 'Activer → dispo pour vos listings. For sale = raccourci carte (déjà géré). Ensuite chaque listing coche.'
              : 'Même chose : Activer → pousse l’activité marché vers vos listings. Puis chaque listing coche.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {filtered.length > 0 ? (
            <>
              <button
                type="button"
                style={btnOutline({ padding: '8px 12px', fontSize: 13 })}
                disabled={saving}
                onClick={() => void activateAllVisible(true)}
              >
                Tout activer ({filtered.length})
              </button>
              <button
                type="button"
                style={btnOutline({ padding: '8px 12px', fontSize: 13 })}
                disabled={saving}
                onClick={() => void activateAllVisible(false)}
              >
                Tout désactiver
              </button>
            </>
          ) : null}
          {canEditCatalog ? (
            <button type="button" style={btnGold()} onClick={openNew}>
              + Nouvelle expérience
            </button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
          borderBottom: '1px solid var(--pa-line)',
        }}
      >
        {(
          [
            { v: 'own' as const, l: 'Mes expériences', count: ownRows.length },
            { v: 'sojori' as const, l: 'Marché', count: sojoriRows.length },
          ] as const
        ).map((tb) => (
          <button
            key={tb.v}
            type="button"
            onClick={() => switchCatalogTab(tb.v)}
            style={{
              border: 'none',
              background: 'none',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: catalogTab === tb.v ? 700 : 500,
              color: catalogTab === tb.v ? 'var(--pa-ink)' : 'var(--pa-ink3)',
              borderBottom: catalogTab === tb.v ? '2px solid var(--pa-gold, #b8851a)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tb.l}
            <span style={{ marginLeft: 8, color: 'var(--pa-ink4)', fontWeight: 500, fontSize: 12 }}>
              {tb.count}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div>
          {groupedRows.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 12,
                alignItems: 'center',
              }}
            >
              <select
                className="pa-in"
                style={{ ...inpBase, width: 'auto', minWidth: 140 }}
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'city' | 'category')}
                aria-label="Grouper par"
              >
                <option value="category">Grouper · catégorie</option>
                <option value="city">Grouper · ville</option>
              </select>
              {groupedRows.map((group) => (
                <button
                  key={`chip-${group.key}`}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`exp-group-${group.key}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    ...btnOutline({ padding: '6px 12px', fontSize: 12 }),
                  }}
                >
                  {group.label}
                  <span style={{ color: 'var(--pa-ink4)', marginLeft: 6 }}>{group.items.length}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                providers.length > 0 || categories.length > 0
                  ? 'repeat(auto-fit, minmax(160px, 1fr))'
                  : '1fr',
              gap: 10,
              marginBottom: 12,
            }}
          >
            {providers.length > 0 ? (
              <select
                className="pa-in"
                style={inpBase}
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                aria-label="Filtrer par provider / fiche"
              >
                <option value="all">Toutes les fiches</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : null}
            {categories.length > 0 ? (
              <select
                className="pa-in"
                style={inpBase}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filtrer par catégorie"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              className="pa-in"
              style={inpBase}
              placeholder="Rechercher… (titre, catégorie, provider)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {loading ? (
            <div style={{ color: 'var(--pa-ink3)', padding: 12 }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 'var(--pa-r-lg)',
                border: '1px dashed var(--pa-line)',
                color: 'var(--pa-ink3)',
                background: 'var(--pa-surface)',
              }}
            >
              {scopedRows.length === 0
                ? catalogTab === 'own'
                  ? 'Aucune expérience. Créez la première.'
                  : 'Aucune expérience Sojori pour le moment.'
                : 'Aucun résultat pour ces filtres.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {catalogTab === 'sojori' && (providerFilter !== 'all' || q.trim()) ? (
                <div style={{ fontSize: 12, color: 'var(--pa-ink3)', marginTop: -4 }}>
                  {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                  {scopedRows.length !== filtered.length ? ` · sur ${scopedRows.length}` : ''}
                </div>
              ) : q.trim() ? (
                <div style={{ fontSize: 12, color: 'var(--pa-ink3)', marginTop: -4 }}>
                  {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                  {scopedRows.length !== filtered.length ? ` · sur ${scopedRows.length}` : ''}
                </div>
              ) : null}
              {groupedRows.map((group) => (
                <div key={group.key} id={`exp-group-${group.key}`}>
                  <div
                    className="pa-lbl"
                    style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>{group.label}</span>
                    <span style={{ color: 'var(--pa-ink4)' }}>{group.items.length}</span>
                  </div>
                  <div className="exp-card-grid">
                    {group.items.map((s) => {
                      const prices = (s.formules || []).map((f) => Number(f.priceMad) || 0);
                      const min = prices.length ? Math.min(...prices) : 0;
                      const selected = selectedId === s.id && !isNew;
                      const provider =
                        experienceProviderLabel(s, partnersById, partnersByOwnerId) || null;
                      const photo = Array.isArray(s.photos) ? s.photos.find(Boolean) : undefined;
                      const isOn = s.active !== false;
                      return (
                        <div
                          key={`${group.key}-${s.id}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 'var(--pa-r-lg)',
                            border: `1px solid ${selected ? 'var(--pa-gold)' : 'var(--pa-line)'}`,
                            background: selected
                              ? 'var(--pa-gold-wash)'
                              : isOn
                                ? 'var(--pa-surface)'
                                : 'rgba(0,0,0,0.02)',
                            overflow: 'hidden',
                            minHeight: 196,
                            opacity: isOn || catalogTab !== 'own' ? 1 : 0.72,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            {photo ? (
                              <img
                                src={photo}
                                alt=""
                                style={{
                                  width: '100%',
                                  height: 110,
                                  objectFit: 'cover',
                                  display: 'block',
                                  background: 'var(--pa-line)',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: 72,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(0,0,0,0.04)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--pa-ink4)',
                                }}
                              >
                                {s.category || 'Expérience'}
                              </div>
                            )}
                            <div style={{ padding: '12px 14px 8px', flex: 1 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {s.title}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--pa-ink3)', marginTop: 6 }}>
                                {provider ? (
                                  <span style={{ fontWeight: 700, color: 'var(--pa-ink2)' }}>
                                    {provider}
                                    {' · '}
                                  </span>
                                ) : null}
                                {s.category}
                                {min > 0 ? ` · dès ${money(min)} MAD` : ''}
                              </div>
                            </div>
                          </button>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              padding: '8px 12px 10px',
                              borderTop: '1px solid var(--pa-line)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                cursor: saving ? 'wait' : 'pointer',
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: (canEditCatalog ? isOn : marketAdopted.has(s.id))
                                    ? '#1b6b3a'
                                    : 'var(--pa-ink3)',
                                }}
                              >
                                Activer
                              </span>
                              <input
                                type="checkbox"
                                checked={canEditCatalog ? isOn : marketAdopted.has(s.id)}
                                disabled={saving}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (canEditCatalog) {
                                    void toggleActiveQuick(s, e.target.checked);
                                  } else {
                                    void toggleMarketAdopt(s, e.target.checked);
                                  }
                                }}
                                style={{ width: 18, height: 18 }}
                              />
                            </label>
                            {canEditCatalog ? (
                              <label
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  cursor: saving ? 'wait' : 'pointer',
                                  fontSize: 12,
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: s.forSale
                                      ? 'var(--pa-gold-deep, #b0841c)'
                                      : 'var(--pa-ink3)',
                                  }}
                                >
                                  For sale
                                </span>
                                <input
                                  type="checkbox"
                                  checked={Boolean(s.forSale)}
                                  disabled={saving}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    void toggleForSaleQuick(s, e.target.checked);
                                  }}
                                  style={{ width: 18, height: 18 }}
                                />
                              </label>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showEditor ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isNew ? 'Nouvelle expérience' : draft.title || 'Détail activité'}
            onClick={closeEditor}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1400,
              background: 'rgba(20, 16, 10, 0.45)',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 100%)',
              height: '100%',
              padding: 22,
              borderLeft: '1px solid var(--pa-line)',
              background: 'var(--pa-surface)',
              overflow: 'auto',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="pa-lbl">
                  {isNew ? 'Création' : canEditCatalog ? 'Édition' : 'Détail (lecture seule)'}
                </div>
                <h2 className="pa-d" style={{ margin: '4px 0 0', fontSize: 26 }}>
                  {isNew ? 'Nouvelle expérience' : draft.title || 'Sans titre'}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={btnOutline()} onClick={closeEditor}>
                  Fermer
                </button>
                {canEditCatalog ? (
                  <button type="button" style={btnGold()} disabled={saving} onClick={() => void save()}>
                    {isNew ? 'Créer' : 'Enregistrer'}
                  </button>
                ) : null}
              </div>
            </div>

            <fieldset
              disabled={!canEditCatalog}
              style={{ border: 'none', margin: 0, padding: 0, minInlineSize: 0 }}
            >
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--pa-line)' }}>
              {([
                { v: 'config', l: '⚙️ Configuration' },
                { v: 'contact', l: '📞 Contact & paiement' },
              ] as const).map((tb) => (
                <button
                  key={tb.v}
                  type="button"
                  onClick={() => setFormTab(tb.v)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: formTab === tb.v ? 700 : 500,
                    color: formTab === tb.v ? 'var(--pa-ink)' : 'var(--pa-ink3)',
                    borderBottom: formTab === tb.v ? '2px solid var(--pa-gold, #b8851a)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tb.l}
                </button>
              ))}
            </div>

            {formTab === 'config' && (
            <>
            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Provider (fiche)</div>
              <select
                className="pa-in"
                style={{ ...inpBase, marginTop: 8 }}
                value={draft.partnerId}
                onChange={(e) => setDraft((d) => ({ ...d, partnerId: e.target.value }))}
              >
                <option value="">— Choisir une fiche —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.active === false ? ' (inactif)' : ''}
                  </option>
                ))}
              </select>
              {!partners.length ? (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--pa-ink3)' }}>
                  Aucune fiche — créez-en une dans Expériences → Ma fiche.
                </div>
              ) : null}
            </section>
            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Présentation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, marginTop: 8 }}>
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="Titre"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                >
                  {CATS.map((c) => (
                    <option key={c.v} value={c.v}>
                      {c.l}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="pa-in"
                style={{ ...inpBase, marginTop: 12, minHeight: 88 }}
                placeholder="Description"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Villes</div>
              <div style={{ maxWidth: 480, marginTop: 8 }}>
                <CityAssociationField
                  value={draft.cityIds}
                  onChange={(next) => setDraft((d) => ({ ...d, cityIds: next }))}
                />
              </div>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Photos (max 3)</div>
              <p style={{ margin: '6px 0 8px', fontSize: 12, color: 'var(--pa-ink3)' }}>
                JPEG, PNG ou WebP · max 1 Mo · idéal 1200×628
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                {draft.photos.map((url) => (
                  <div key={url} style={{ position: 'relative' }}>
                    <img
                      src={url}
                      alt=""
                      style={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <button
                      type="button"
                      style={btnOutline({
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        padding: '2px 6px',
                        fontSize: 11,
                      })}
                      onClick={() => setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p !== url) }))}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {draft.photos.length < 3 ? (
                  <label style={{ ...btnOutline(), cursor: 'pointer' }}>
                    + Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      multiple
                      hidden
                      onChange={(e) => {
                        void uploadPhotos(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Formules</div>
              {draft.formules.map((f, i) => (
                <div
                  key={i}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: 8, marginTop: 8 }}
                >
                  <input
                    className="pa-in"
                    style={inpBase}
                    placeholder="Label"
                    value={f.label}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        formules: d.formules.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      }))
                    }
                  />
                  <input
                    className="pa-in"
                    style={inpBase}
                    type="number"
                    placeholder="MAD"
                    value={f.priceMad}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        formules: d.formules.map((x, j) =>
                          j === i ? { ...x, priceMad: Number(e.target.value) || 0 } : x,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    style={btnOutline({ padding: '8px' })}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        formules: d.formules.length > 1 ? d.formules.filter((_, j) => j !== i) : d.formules,
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                style={btnOutline({ marginTop: 10 })}
                onClick={() => setDraft((d) => ({ ...d, formules: [...d.formules, { label: '', priceMad: 0 }] }))}
              >
                + Formule
              </button>
            </section>
            </>
            )}

            {formTab === 'contact' && (
            <>
            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Contact provider</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="Prénom du contact"
                  value={draft.contact.firstName || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, firstName: e.target.value } }))}
                />
                <input
                  className="pa-in"
                  style={inpBase}
                  placeholder="Nom du contact"
                  value={draft.contact.lastName || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, lastName: e.target.value } }))}
                />
              </div>
              <input
                className="pa-in"
                style={{ ...inpBase, marginTop: 12 }}
                type="email"
                placeholder="Email du contact"
                value={draft.contact.email || ''}
                onChange={(e) => setDraft((d) => ({ ...d, contact: { ...d.contact, email: e.target.value } }))}
              />
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pa-ink2)', marginBottom: 6 }}>
                  WhatsApp provider <span style={{ color: '#b45309' }}>*</span>
                </div>
                <input
                  className="pa-in"
                  style={inpBase}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+2126… (E.164)"
                  value={draft.whatsapp}
                  onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))}
                />
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--pa-ink3)' }}>
                  Obligatoire — numéro qui reçoit les notifications de commande (Accepter / Refuser).
                </p>
              </div>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Paiement</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {PAY_METHODS.map((m) => {
                  const on = draft.payment.methods.includes(m.v);
                  return (
                    <button
                      key={m.v}
                      type="button"
                      style={on ? btnGold({ padding: '7px 13px', fontSize: 12.5 }) : btnOutline({ padding: '7px 13px', fontSize: 12.5 })}
                      onClick={() => toggleMethod(m.v)}
                    >
                      {m.l}
                    </button>
                  );
                })}
              </div>
              {needsRemotePay ? (
                <div
                  style={{
                    marginTop: 14,
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px',
                    gap: 12,
                    maxWidth: 420,
                  }}
                >
                  <select
                    className="pa-in"
                    style={inpBase}
                    value={draft.payment.collection}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        payment: {
                          ...d.payment,
                          collection: e.target.value === 'deposit' ? 'deposit' : 'full',
                        },
                      }))
                    }
                  >
                    <option value="full">Total</option>
                    <option value="deposit">Acompte %</option>
                  </select>
                  {draft.payment.collection === 'deposit' ? (
                    <input
                      className="pa-in"
                      style={inpBase}
                      type="number"
                      min={1}
                      max={100}
                      placeholder="% acompte"
                      value={draft.payment.depositPercent ?? 30}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          payment: { ...d.payment, depositPercent: Number(e.target.value) || 30 },
                        }))
                      }
                    />
                  ) : (
                    <div />
                  )}
                </div>
              ) : (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--pa-ink3)' }}>
                  Cash seul → règlement sur place (pas d’acompte).
                </p>
              )}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pa-ink2)', marginBottom: 6 }}>
                  Quand encaisser ?
                </div>
                <select
                  className="pa-in"
                  style={{ ...inpBase, maxWidth: 340 }}
                  value={draft.payment.timing || 'instant'}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      payment: { ...d.payment, timing: e.target.value as 'instant' | 'on_confirmation' },
                    }))
                  }
                >
                  <option value="instant">Instantané — accepté d’office, lien envoyé direct</option>
                  <option value="on_confirmation">Après confirmation du provider</option>
                </select>
              </div>
            </section>

            {draft.payment.timing === 'on_confirmation' ? (
              <section style={{ marginBottom: 22 }}>
                <div className="pa-lbl">Confirmation provider</div>
                <p style={{ margin: '6px 0 8px', fontSize: 12, color: 'var(--pa-ink3)' }}>
                  Le provider doit confirmer la dispo sous ce délai — relances automatiques, puis
                  escalade vers vous si silence.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 8 }}>
                  <label style={{ fontSize: 12, color: 'var(--pa-ink3)' }}>
                    Répondre sous (heures)
                    <input
                      className="pa-in"
                      style={{ ...inpBase, marginTop: 4 }}
                      type="number"
                      min={1}
                      max={168}
                      value={draft.confirmation.slaHours}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          confirmation: { ...d.confirmation, slaHours: Number(e.target.value) || 12 },
                        }))
                      }
                    />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--pa-ink3)' }}>
                    Relance avant échéance (h)
                    <input
                      className="pa-in"
                      style={{ ...inpBase, marginTop: 4 }}
                      type="number"
                      min={0}
                      max={48}
                      value={draft.confirmation.remindBeforeHours}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          confirmation: { ...d.confirmation, remindBeforeHours: Number(e.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--pa-ink3)' }}>
                    Relance après échéance (h)
                    <input
                      className="pa-in"
                      style={{ ...inpBase, marginTop: 4 }}
                      type="number"
                      min={0}
                      max={48}
                      value={draft.confirmation.remindAfterHours}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          confirmation: { ...d.confirmation, remindAfterHours: Number(e.target.value) || 0 },
                        }))
                      }
                    />
                  </label>
                </div>
              </section>
            ) : null}

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Rappel provider (prestation)</div>
              <p style={{ margin: '6px 0 8px', fontSize: 12, color: 'var(--pa-ink3)' }}>
                Un seul rappel WhatsApp avant la prestation (coût maîtrisé).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginTop: 8, maxWidth: 480 }}>
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.providerReminder.offsetDays}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerReminder: { ...d.providerReminder, offsetDays: Number(e.target.value) },
                    }))
                  }
                >
                  {REMINDER_OFFSETS.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
                <input
                  className="pa-in"
                  style={inpBase}
                  type="time"
                  value={draft.providerReminder.time}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      providerReminder: { ...d.providerReminder, time: e.target.value || '18:00' },
                    }))
                  }
                />
              </div>
            </section>

            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Transmettre les coordonnées client</div>
              <p style={{ margin: '6px 0 8px', fontSize: 12, color: 'var(--pa-ink3)' }}>
                Nom + prénom + numéro du client envoyés au provider — greffés au message info ou au
                rappel (jamais de message en plus).
              </p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                <button
                  type="button"
                  style={
                    draft.shareGuestContact.enabled
                      ? btnGold({ padding: '7px 13px', fontSize: 12.5 })
                      : btnOutline({ padding: '7px 13px', fontSize: 12.5 })
                  }
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      shareGuestContact: { ...d.shareGuestContact, enabled: !d.shareGuestContact.enabled },
                    }))
                  }
                >
                  {draft.shareGuestContact.enabled ? 'Oui — transmettre' : 'Non'}
                </button>
                {draft.shareGuestContact.enabled ? (
                  <>
                    <select
                      className="pa-in"
                      style={{ ...inpBase, maxWidth: 320 }}
                      value={draft.shareGuestContact.when}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          shareGuestContact: {
                            ...d.shareGuestContact,
                            when: e.target.value as ShareGuestContactWhen,
                          },
                        }))
                      }
                    >
                      {SHARE_WHEN.map((w) => (
                        <option key={w.v} value={w.v}>
                          {w.l}
                        </option>
                      ))}
                    </select>
                    {draft.shareGuestContact.when !== 'immediate' ? (
                      <input
                        className="pa-in"
                        style={{ ...inpBase, maxWidth: 140 }}
                        type="time"
                        value={draft.shareGuestContact.time || ''}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            shareGuestContact: { ...d.shareGuestContact, time: e.target.value },
                          }))
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </section>
            </>
            )}

            {formTab === 'config' && (
            <section style={{ marginBottom: 22 }}>
              <div className="pa-lbl">Planning</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.schedule.dateMode}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      schedule: { ...d.schedule, dateMode: e.target.value as 'from' | 'sure' },
                    }))
                  }
                >
                  <option value="from">Date à partir de</option>
                  <option value="sure">Date sure</option>
                </select>
                <select
                  className="pa-in"
                  style={inpBase}
                  value={draft.schedule.timeMode}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      schedule: {
                        ...d.schedule,
                        timeMode: e.target.value as 'window' | 'slots' | 'fixed',
                      },
                    }))
                  }
                >
                  <option value="window">Plage horaire</option>
                  <option value="slots">Créneaux</option>
                  <option value="fixed">Heure fixe</option>
                </select>
                <input
                  className="pa-in"
                  style={inpBase}
                  type="time"
                  value={draft.schedule.windowStart || '09:00'}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, schedule: { ...d.schedule, windowStart: e.target.value } }))
                  }
                />
                <input
                  className="pa-in"
                  style={inpBase}
                  type="time"
                  value={draft.schedule.windowEnd || '18:00'}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, schedule: { ...d.schedule, windowEnd: e.target.value } }))
                  }
                />
              </div>
              <textarea
                className="pa-in"
                style={{ ...inpBase, marginTop: 12, minHeight: 56 }}
                placeholder="Note planning (optionnel)"
                value={draft.schedule.note || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, schedule: { ...d.schedule, note: e.target.value } }))
                }
              />
            </section>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              <span>Activer — dispo pour le picker des listings</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <input
                type="checkbox"
                checked={draft.forSale}
                onChange={(e) => setDraft((d) => ({ ...d, forSale: e.target.checked }))}
              />
              <span>For sale — visible aux autres owners (marché)</span>
            </label>
            </fieldset>

            {canEditCatalog ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" style={btnGold()} disabled={saving} onClick={() => void save()}>
                  {isNew ? 'Créer' : 'Enregistrer'}
                </button>
                {!isNew && selectedId ? (
                  <button type="button" style={btnDanger()} disabled={saving} onClick={() => void remove()}>
                    Supprimer
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OwnerExperiencesPage;
