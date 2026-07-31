import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  partnersApi,
  type CommissionType,
  type Partner,
  type PartnerService,
  type PartnerServiceFormule,
  type PartnerServicePayment,
  type PartnerServiceSchedule,
  type PaymentMethod,
  DEFAULT_SCHEDULE,
  DEFAULT_PAYMENT,
} from '../services/partnersApi';
import { postFormDataAsMultipart } from '../utils/upload/postFormData';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import CityAssociationField from '../features/listing/components/ConfigOrchestration/CityAssociationField';
import './partnersAdmin.css';

type MainTab = 'partners' | 'concierge';

type PartnerDraft = {
  name: string;
  email: string;
  whatsapp: string;
  cityIds: 'all' | string[];
  commissionType: CommissionType;
  commissionPercent: number;
  commissionFixedMad: number;
  notes: string;
  active: boolean;
  ownerId: string | null;
};

type ServiceDraft = {
  category: string;
  subCategory: string;
  title: string;
  description: string;
  whatsapp: string;
  cityIds: 'all' | string[];
  photos: string[];
  formules: PartnerServiceFormule[];
  schedule: PartnerServiceSchedule;
  payment: PartnerServicePayment;
  keywords: string[];
  commissionType: '' | CommissionType;
  commissionPercent: string;
  commissionFixedMad: string;
  active: boolean;
  sortOrder: number;
};

const CATS = [
  { v: 'Aventure', l: 'Aventure' },
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
  transition: 'border-color .14s, box-shadow .14s',
};

function money(n: number) {
  return Number(n || 0)
    .toLocaleString('fr-FR')
    .replace(/\u202f/g, ' ');
}

function emptyPartner(): PartnerDraft {
  return {
    name: '',
    email: '',
    whatsapp: '',
    cityIds: 'all',
    commissionType: 'percent',
    commissionPercent: 15,
    commissionFixedMad: 0,
    notes: '',
    active: true,
    ownerId: null,
  };
}

function emptyService(): ServiceDraft {
  return {
    category: 'Aventure',
    subCategory: '',
    title: '',
    description: '',
    whatsapp: '',
    cityIds: 'all',
    photos: [],
    formules: [{ label: '', priceMad: 0 }],
    schedule: { ...DEFAULT_SCHEDULE },
    payment: { ...DEFAULT_PAYMENT, methods: [...DEFAULT_PAYMENT.methods] },
    keywords: [],
    commissionType: '',
    commissionPercent: '',
    commissionFixedMad: '',
    active: true,
    sortOrder: 0,
  };
}

function partnerToDraft(p: Partner): PartnerDraft {
  return {
    name: p.name || '',
    email: p.email || '',
    whatsapp: p.whatsapp || '',
    cityIds: p.cityIds === undefined || p.cityIds === null ? 'all' : p.cityIds,
    commissionType: p.commissionType || 'percent',
    commissionPercent: Number(p.commissionPercent) || 0,
    commissionFixedMad: Number(p.commissionFixedMad) || 0,
    notes: p.notes || '',
    active: p.active !== false,
    ownerId: p.ownerId,
  };
}

function serviceToDraft(s: PartnerService): ServiceDraft {
  const formules =
    Array.isArray(s.formules) && s.formules.length
      ? s.formules.map((f) => ({ label: f.label || '', priceMad: Number(f.priceMad) || 0 }))
      : [{ label: '', priceMad: 0 }];
  const pay = s.payment || DEFAULT_PAYMENT;
  return {
    category: s.category || '',
    subCategory: s.subCategory || '',
    title: s.title || '',
    description: s.description || '',
    whatsapp: s.whatsapp || '',
    cityIds: s.cityIds === undefined || s.cityIds === null ? 'all' : s.cityIds,
    photos: Array.isArray(s.photos) ? s.photos.slice(0, 3) : [],
    formules,
    schedule: (() => {
      const base = s.schedule ? { ...DEFAULT_SCHEDULE, ...s.schedule } : { ...DEFAULT_SCHEDULE };
      const rawSlots = Array.isArray(base.slots) ? base.slots : [];
      base.slots = rawSlots.map((slot) =>
        typeof slot === 'string' ? { time: slot, label: '' } : { time: slot.time || '', label: slot.label || '' },
      );
      if (base.timeMode !== 'window' && base.timeMode !== 'slots' && base.timeMode !== 'fixed') {
        base.timeMode = 'window';
      }
      return base;
    })(),
    payment: {
      methods: Array.isArray(pay.methods) && pay.methods.length ? [...pay.methods] : ['cash'],
      collection: pay.collection === 'deposit' ? 'deposit' : 'full',
      depositPercent: pay.depositPercent ?? null,
    },
    keywords: Array.isArray(s.keywords) ? [...s.keywords] : [],
    commissionType: (s.commissionType as CommissionType) || '',
    commissionPercent: s.commissionPercent == null ? '' : String(s.commissionPercent),
    commissionFixedMad: s.commissionFixedMad == null ? '' : String(s.commissionFixedMad),
    active: s.active !== false,
    sortOrder: s.sortOrder || 0,
  };
}

/* ——— Primitives ——— */

const IP: Record<string, string> = {
  search: 'M11 4a7 7 0 105 12l4 4M11 4a7 7 0 010 14',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M4.5 12.5l5 5L20 6',
  chevD: 'M6 9.5l6 6 6-6',
  chevR: 'M9.5 6l6 6-6 6',
  mail: 'M3.5 6.5h17v11h-17zM3.5 7l8.5 6 8.5-6',
  wa: 'M12 3a9 9 0 00-7.7 13.6L3 21l4.5-1.2A9 9 0 1012 3Z',
  trash:
    'M4.5 7h15M9.5 7V5.5A1 1 0 0110.5 4.5h3a1 1 0 011 1V7M6.5 7l.8 12a1 1 0 001 1h7.4a1 1 0 001-1l.8-12M10 11v6m4-6v6',
  img: 'M4 5.5h16v13H4zM4 15l4.5-4.5 4 4 3-3L20 15M9 9.5h.01',
  up: 'M12 17V4m-5 5l5-5 5 5M4.5 19.5h15',
  tag: 'M4 11l7-7h7v7l-7 7-7-7Zm10.5-3.5h.01',
  seed: 'M12 20.5V11m0 0c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6Zm0 0c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6ZM7.5 20.5h9',
  ext: 'M14.5 4.5h5v5m0-5l-8 8M18 14v4.5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h4.5',
  users: 'M9 11.5a3 3 0 100-6 3 3 0 000 6Zm-6 8a6 6 0 0112 0M17 11.5a3 3 0 100-6M20.5 19.5a6 6 0 00-4.5-5.8',
  grid: 'M4 4.5h6.5V11H4zM13.5 4.5H20V11h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  info: 'M12 20.5a8.5 8.5 0 100-17 8.5 8.5 0 000 17Zm0-12.5h.01M11 12h1v4.5h1',
  alert:
    'M12 9.5v4m0 3.5h.01M10.6 4.6L3.2 17.8A1.8 1.8 0 004.8 20.5h14.4a1.8 1.8 0 001.6-2.7L13.4 4.6a1.6 1.6 0 00-2.8 0Z',
};

function Ic({ n, s = 18, w = 1.75, style }: { n: string; s?: number; w?: number; style?: React.CSSProperties }) {
  const d = IP[n] || '';
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {d
        .split('M')
        .filter(Boolean)
        .map((p, i) => (
          <path key={i} d={'M' + p} />
        ))}
    </svg>
  );
}

function Btn({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconR,
  onClick,
  disabled,
  style,
  title,
  type = 'button',
}: {
  children?: React.ReactNode;
  variant?: 'primary' | 'gold' | 'outline' | 'subtle' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconR?: string;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const pad = size === 'lg' ? '13px 22px' : size === 'sm' ? '7px 13px' : '10px 17px';
  const fs = size === 'lg' ? 15 : size === 'sm' ? 12.5 : 13.5;
  const V: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--pa-ink)', color: '#FBFAF6', border: '1px solid var(--pa-ink)' },
    gold: {
      background: 'var(--pa-gold)',
      color: '#2C2005',
      border: '1px solid var(--pa-gold)',
      boxShadow: '0 2px 10px rgba(230,176,34,.30)',
    },
    outline: { background: 'var(--pa-surface)', color: 'var(--pa-ink)', border: '1px solid var(--pa-line)' },
    subtle: { background: 'var(--pa-sunk)', color: 'var(--pa-ink2)', border: '1px solid transparent' },
    ghost: { background: 'transparent', color: 'var(--pa-ink2)', border: '1px solid transparent' },
    danger: { background: 'transparent', color: 'var(--pa-danger)', border: '1px solid var(--pa-line)' },
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        letterSpacing: '-.01em',
        whiteSpace: 'nowrap',
        transition: 'all .14s ease',
        opacity: disabled ? 0.42 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...V[variant],
        ...style,
      }}
    >
      {icon ? <Ic n={icon} s={size === 'lg' ? 18 : 16} /> : null}
      {children}
      {iconR ? <Ic n={iconR} s={size === 'lg' ? 18 : 16} /> : null}
    </button>
  );
}

function IconBtn({
  icon,
  onClick,
  title,
  tone,
  size = 32,
  disabled,
}: {
  icon: string;
  onClick?: () => void;
  title?: string;
  tone?: 'danger';
  size?: number;
  disabled?: boolean;
}) {
  const [h, setH] = useState(false);
  const dg = tone === 'danger';
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        border: '1px solid ' + (h ? (dg ? 'var(--pa-danger)' : 'var(--pa-line)') : 'transparent'),
        background: h ? (dg ? 'var(--pa-danger-wash)' : 'var(--pa-sunk)') : 'transparent',
        color: dg ? (h ? 'var(--pa-danger)' : 'var(--pa-ink3)') : 'var(--pa-ink2)',
        transition: 'all .13s ease',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ic n={icon} s={16} />
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  ph,
  hint,
  icon,
  prefix,
  type = 'text',
  mono,
  area,
  rows = 3,
  style,
  onKeyDown,
}: {
  label?: string;
  value: string | number;
  onChange?: (v: string) => void;
  ph?: string;
  hint?: string;
  icon?: string;
  prefix?: string;
  type?: string;
  mono?: boolean;
  area?: boolean;
  rows?: number;
  style?: React.CSSProperties;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <label style={{ display: 'block', ...style }}>
      {label ? <div className="pa-lbl" style={{ marginBottom: 7 }}>{label}</div> : null}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
        {icon ? (
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--pa-ink3)',
              pointerEvents: 'none',
            }}
          >
            <Ic n={icon} s={16} />
          </span>
        ) : null}
        {prefix ? (
          <span
            className="pa-mono"
            style={{
              display: 'grid',
              placeItems: 'center',
              padding: '0 11px',
              fontSize: 12.5,
              color: 'var(--pa-ink3)',
              background: 'var(--pa-sunk)',
              border: '1px solid var(--pa-line)',
              borderRight: 'none',
              borderRadius: 'var(--pa-r) 0 0 var(--pa-r)',
            }}
          >
            {prefix}
          </span>
        ) : null}
        {area ? (
          <textarea
            className="pa-in pa-scr"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={ph}
            rows={rows}
            style={{ ...inpBase, resize: 'vertical', lineHeight: 1.55, fontSize: 13.5 }}
          />
        ) : (
          <input
            className="pa-in"
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ph}
            style={{
              ...inpBase,
              paddingLeft: icon ? 36 : 13,
              fontFamily: mono ? 'var(--pa-mono)' : 'inherit',
              borderRadius: prefix ? '0 var(--pa-r) var(--pa-r) 0' : 'var(--pa-r)',
            }}
          />
        )}
      </div>
      {hint ? (
        <div style={{ fontSize: 11.5, color: 'var(--pa-ink3)', marginTop: 6, lineHeight: 1.45 }}>{hint}</div>
      ) : null}
    </label>
  );
}

function Toggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={() => onChange(!on)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          border: 'none',
          flexShrink: 0,
          background: on ? 'var(--pa-gold)' : 'var(--pa-line)',
          position: 'relative',
          transition: 'background .18s ease',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'left .18s cubic-bezier(.3,1.3,.5,1)',
          }}
        />
      </button>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
        {hint ? <div style={{ fontSize: 11.5, color: 'var(--pa-ink3)', marginTop: 1 }}>{hint}</div> : null}
      </div>
    </div>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: 'var(--pa-sunk)',
        borderRadius: 999,
        gap: 2,
      }}
    >
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            style={{
              padding: '7px 15px',
              borderRadius: 999,
              border: 'none',
              fontSize: 12.5,
              fontWeight: on ? 700 : 500,
              letterSpacing: '-.01em',
              transition: 'all .14s ease',
              background: on ? 'var(--pa-surface)' : 'transparent',
              color: on ? 'var(--pa-ink)' : 'var(--pa-ink2)',
              boxShadow: on ? '0 1px 3px rgba(23,20,16,.10)' : 'none',
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function Pill({
  children,
  tone = 'neutral',
  icon,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'gold' | 'ok' | 'off';
  icon?: string | null;
}) {
  const T = {
    neutral: { c: 'var(--pa-ink2)', b: 'var(--pa-sunk)', bd: 'transparent' },
    gold: { c: 'var(--pa-gold-deep)', b: 'var(--pa-gold-wash)', bd: 'var(--pa-gold-line)' },
    ok: { c: 'var(--pa-ok)', b: 'var(--pa-ok-wash)', bd: 'transparent' },
    off: { c: 'var(--pa-ink3)', b: 'transparent', bd: 'var(--pa-line)' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 6,
        fontFamily: 'var(--pa-mono)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: T.c,
        background: T.b,
        border: '1px solid ' + T.bd,
        whiteSpace: 'nowrap',
      }}
    >
      {icon ? <Ic n={icon} s={11} w={2} /> : null}
      {children}
    </span>
  );
}

function Constraint({
  children,
  icon = 'info',
  tone = 'gold',
}: {
  children: React.ReactNode;
  icon?: string;
  tone?: 'gold' | 'neutral';
}) {
  const g = tone === 'gold';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '10px 13px',
        borderRadius: 'var(--pa-r)',
        background: g ? 'var(--pa-gold-wash)' : 'var(--pa-sunk)',
        border: '1px solid ' + (g ? 'var(--pa-gold-line)' : 'var(--pa-line)'),
      }}
    >
      <span style={{ color: g ? 'var(--pa-gold-deep)' : 'var(--pa-ink3)', marginTop: 1 }}>
        <Ic n={icon} s={15} />
      </span>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--pa-ink2)' }}>{children}</div>
    </div>
  );
}

function Section({
  label,
  title,
  aside,
  children,
  first,
}: {
  label?: string;
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      style={{
        padding: first ? '0 0 26px' : '26px 0',
        borderTop: first ? 'none' : '1px solid var(--pa-line2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <div>
          {label ? <div className="pa-lbl" style={{ marginBottom: 5 }}>{label}</div> : null}
          {title ? <h3 className="pa-d" style={{ fontSize: 21, margin: 0 }}>{title}</h3> : null}
        </div>
        {aside ? <div style={{ marginLeft: 'auto' }}>{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="pa-fade"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '56px 32px',
        height: '100%',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          display: 'grid',
          placeItems: 'center',
          marginBottom: 18,
          background: 'var(--pa-gold-wash)',
          border: '1px solid var(--pa-gold-line)',
          color: 'var(--pa-gold-deep)',
        }}
      >
        <Ic n={icon} s={25} />
      </div>
      <h3 className="pa-d" style={{ fontSize: 24, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--pa-ink2)', lineHeight: 1.6, maxWidth: 330, marginBottom: action ? 22 : 0 }}>
        {body}
      </p>
      {action}
    </div>
  );
}

function Panes({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '304px 1fr', height: '100%', minHeight: 0 }}>
      <div
        className="pa-scr"
        style={{
          borderRight: '1px solid var(--pa-line)',
          background: 'var(--pa-surface)',
          overflow: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {rail}
      </div>
      <div className="pa-scr" style={{ overflow: 'auto', minHeight: 0, background: 'var(--pa-paper)' }}>
        {children}
      </div>
    </div>
  );
}

/* ——— Page ——— */

export function PartnersAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: MainTab = searchParams.get('tab') === 'concierge' ? 'concierge' : 'partners';

  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [partnerDraft, setPartnerDraft] = useState<PartnerDraft>(emptyPartner());
  const [services, setServices] = useState<PartnerService[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyService());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [kwInput, setKwInput] = useState('');
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => partners.find((p) => p.id === selectedId) || null,
    [partners, selectedId],
  );

  const filteredPartners = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.whatsapp || '').includes(q),
    );
  }, [partners, query]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.keywords || []).some((k) => k.includes(q)),
    );
  }, [services, query]);

  const setTab = (next: MainTab) => {
    const sp = new URLSearchParams(searchParams);
    if (next === 'partners') sp.delete('tab');
    else sp.set('tab', next);
    setSearchParams(sp, { replace: true });
    setQuery('');
  };

  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await partnersApi.list();
      setPartners(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement partenaires échoué');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServices = useCallback(async (partnerId: string) => {
    try {
      const rows = await partnersApi.listServices(partnerId);
      setServices(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement services échoué');
      setServices([]);
    }
  }, []);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (!selectedId) {
      setServices([]);
      setServiceId(null);
      return;
    }
    void loadServices(selectedId);
  }, [selectedId, loadServices]);

  useEffect(() => {
    if (tab !== 'concierge' || selectedId || !partners.length) return;
    setSelectedId(partners[0].id);
    setPartnerDraft(partnerToDraft(partners[0]));
  }, [tab, selectedId, partners]);

  const selectPartner = (p: Partner | null) => {
    if (!p) {
      setSelectedId(null);
      setPartnerDraft(emptyPartner());
      setServiceId(null);
      setServiceDraft(emptyService());
      setCreatingPartner(true);
      setCreatingService(false);
      return;
    }
    setCreatingPartner(false);
    setCreatingService(false);
    setSelectedId(p.id);
    setPartnerDraft(partnerToDraft(p));
    setServiceId(null);
    setServiceDraft(emptyService());
  };

  const startCreatePartner = () => {
    setSelectedId(null);
    setPartnerDraft(emptyPartner());
    setServices([]);
    setServiceId(null);
    setServiceDraft(emptyService());
    setCreatingPartner(true);
    setCreatingService(false);
    setTab('partners');
  };

  const savePartner = async () => {
    if (!partnerDraft.name.trim()) {
      toast.error('Nom partenaire requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: partnerDraft.name.trim(),
        email: partnerDraft.email.trim(),
        whatsapp: partnerDraft.whatsapp.trim(),
        cityIds: partnerDraft.cityIds,
        commissionType: partnerDraft.commissionType,
        commissionPercent: partnerDraft.commissionPercent,
        commissionFixedMad: partnerDraft.commissionFixedMad,
        notes: partnerDraft.notes,
        active: partnerDraft.active,
        ownerId: partnerDraft.ownerId,
      };
      if (selectedId) {
        const updated = await partnersApi.update(selectedId, body);
        toast.success('Partenaire mis à jour');
        await loadPartners();
        selectPartner(updated);
      } else {
        const created = await partnersApi.create({ ...body, ownerId: null });
        toast.success('Partenaire créé');
        await loadPartners();
        selectPartner(created);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sauvegarde échouée');
    } finally {
      setSaving(false);
    }
  };

  const deletePartner = async () => {
    if (!selectedId) return;
    if (!window.confirm('Supprimer ce partenaire et tous ses services ?')) return;
    setSaving(true);
    try {
      await partnersApi.remove(selectedId);
      toast.success('Partenaire supprimé');
      startCreatePartner();
      await loadPartners();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression échouée');
    } finally {
      setSaving(false);
    }
  };

  const selectService = (s: PartnerService | null) => {
    if (!s) {
      setServiceId(null);
      setServiceDraft(emptyService());
      setCreatingService(true);
      return;
    }
    setCreatingService(false);
    setServiceId(s.id);
    setServiceDraft(serviceToDraft(s));
  };

  const saveService = async () => {
    if (!selectedId) {
      toast.error('Choisis un partenaire');
      return;
    }
    if (!serviceDraft.title.trim() || !serviceDraft.category.trim()) {
      toast.error('Titre et catégorie requis');
      return;
    }
    const formules = serviceDraft.formules
      .map((f) => ({ label: f.label.trim(), priceMad: Number(f.priceMad) || 0 }))
      .filter((f) => f.label);
    if (!formules.length) {
      toast.error('Ajoute au moins une formule (libellé + prix MAD)');
      return;
    }
    setSaving(true);
    try {
      const body = {
        category: serviceDraft.category.trim(),
        subCategory: serviceDraft.subCategory.trim(),
        title: serviceDraft.title.trim(),
        description: serviceDraft.description,
        whatsapp: serviceDraft.whatsapp.trim(),
        cityIds: serviceDraft.cityIds,
        photos: serviceDraft.photos.slice(0, 3),
        formules,
        schedule: serviceDraft.schedule,
        payment: (() => {
          const methods = serviceDraft.payment.methods.length
            ? serviceDraft.payment.methods
            : (['cash'] as PaymentMethod[]);
          const needsRemote = methods.some((m) => m === 'card' || m === 'transfer');
          return {
            methods,
            collection: needsRemote && serviceDraft.payment.collection === 'deposit' ? 'deposit' : 'full',
            depositPercent:
              needsRemote && serviceDraft.payment.collection === 'deposit'
                ? Number(serviceDraft.payment.depositPercent) || 30
                : null,
          } satisfies PartnerServicePayment;
        })(),
        keywords: serviceDraft.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
        commissionType: serviceDraft.commissionType || null,
        commissionPercent:
          serviceDraft.commissionPercent === '' ? null : Number(serviceDraft.commissionPercent),
        commissionFixedMad:
          serviceDraft.commissionFixedMad === '' ? null : Number(serviceDraft.commissionFixedMad),
        active: serviceDraft.active,
        sortOrder: serviceDraft.sortOrder,
      };
      if (serviceId) {
        const updated = await partnersApi.updateService(selectedId, serviceId, body);
        toast.success('Service mis à jour');
        await loadServices(selectedId);
        selectService(updated);
      } else {
        const created = await partnersApi.createService(selectedId, body);
        toast.success('Service créé');
        await loadServices(selectedId);
        selectService(created);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sauvegarde service échouée');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async () => {
    if (!selectedId || !serviceId) return;
    if (!window.confirm('Supprimer ce service ?')) return;
    setSaving(true);
    try {
      await partnersApi.removeService(selectedId, serviceId);
      toast.success('Service supprimé');
      setServiceId(null);
      setServiceDraft(emptyService());
      await loadServices(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression échouée');
    } finally {
      setSaving(false);
    }
  };

  const onUploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const slots = 3 - serviceDraft.photos.length;
    if (slots <= 0) {
      toast.info('Maximum 3 photos');
      return;
    }
    const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const allowedExt = /\.(jpe?g|png|webp)$/i;
    const maxBytes = 1 * 1024 * 1024;
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
    setUploading(true);
    try {
      const formData = new FormData();
      valid.forEach((file) => formData.append('media', file));
      formData.append('type', 'partner-services');
      formData.append('name', `partner-${Date.now()}`);
      const { data } = await postFormDataAsMultipart(
        MICROSERVICE_BASE_URL.UPLOAD_IMAGE_MULTIPLE,
        formData,
      );
      const urls = (Array.isArray(data?.files) ? data.files : [])
        .map((f: { url?: string }) => f?.url)
        .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
      if (!urls.length) throw new Error('Aucune URL renvoyée');
      setServiceDraft((d) => ({ ...d, photos: [...d.photos, ...urls].slice(0, 3) }));
      toast.success(`${urls.length} photo(s) uploadée(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload échoué');
    } finally {
      setUploading(false);
    }
  };

  const addKeyword = () => {
    const k = kwInput.trim().toLowerCase();
    if (!k) return;
    setServiceDraft((d) =>
      d.keywords.includes(k) ? d : { ...d, keywords: [...d.keywords, k] },
    );
    setKwInput('');
  };

  const isNewService = !serviceId;
  const photos = serviceDraft.photos;
  const showPartnerEmpty = !partners.length && !creatingPartner;
  const showServiceEmpty =
    Boolean(selectedId) && !services.length && !creatingService && isNewService;

  const partnerRail = (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'var(--pa-surface)',
          borderBottom: '1px solid var(--pa-line)',
          padding: '16px 16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
          <h2 className="pa-d" style={{ fontSize: 19, margin: 0 }}>Fiches</h2>
          {partners.length ? (
            <span className="pa-mono" style={{ fontSize: 11, color: 'var(--pa-ink3)' }}>
              {partners.length}
            </span>
          ) : null}
          <div style={{ marginLeft: 'auto' }}>
            <IconBtn icon="plus" title="Nouveau partenaire" onClick={startCreatePartner} />
          </div>
        </div>
        <Field icon="search" ph="Rechercher…" value={query} onChange={setQuery} />
      </div>
      <div style={{ flex: 1 }}>
        {filteredPartners.length === 0 ? (
          <div style={{ padding: '34px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--pa-ink3)', lineHeight: 1.55 }}>
              Aucun partenaire.
              <br />
              Créez le premier via le bouton +.
            </p>
          </div>
        ) : (
          filteredPartners.map((p) => {
            const on = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                className="pa-rowhov"
                onClick={() => selectPartner(p)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  border: 'none',
                  borderLeft: '2px solid ' + (on ? 'var(--pa-gold)' : 'transparent'),
                  background: on ? 'var(--pa-gold-wash)' : 'transparent',
                  transition: 'background .13s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: on ? 700 : 600,
                      letterSpacing: '-.01em',
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.name}
                  </span>
                  {!p.active ? <Pill tone="off">Inactif</Pill> : null}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 5,
                    fontSize: 11.5,
                    color: 'var(--pa-ink3)',
                  }}
                >
                  <span className="pa-mono">
                    {p.commissionType === 'fixed'
                      ? `${money(p.commissionFixedMad || 0)} MAD`
                      : `${p.commissionPercent || 0} %`}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--pa-line2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Btn variant="gold" size="sm" icon="plus" style={{ width: '100%' }} onClick={startCreatePartner}>
          Nouveau partenaire
        </Btn>
      </div>
    </>
  );

  const serviceRail = (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'var(--pa-surface)',
          borderBottom: '1px solid var(--pa-line)',
          padding: '16px 16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
          <h2 className="pa-d" style={{ fontSize: 19, margin: 0 }}>Services</h2>
          {services.length ? (
            <span className="pa-mono" style={{ fontSize: 11, color: 'var(--pa-ink3)' }}>
              {services.length}
            </span>
          ) : null}
          <div style={{ marginLeft: 'auto' }}>
            <IconBtn
              icon="plus"
              title="Nouveau service"
              disabled={!selectedId}
              onClick={() => selectService(null)}
            />
          </div>
        </div>
        <Field icon="search" ph="Rechercher…" value={query} onChange={setQuery} />
      </div>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--pa-line2)',
          background: 'var(--pa-sunk)',
        }}
      >
        <div className="pa-lbl" style={{ marginBottom: 7 }}>Partenaire</div>
        <div style={{ position: 'relative' }}>
          <select
            className="pa-in"
            value={selectedId || ''}
            onChange={(e) => {
              const p = partners.find((x) => x.id === e.target.value);
              selectPartner(p || null);
            }}
            style={{
              ...inpBase,
              appearance: 'none',
              paddingRight: 34,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {!partners.length ? <option value="">Aucun partenaire</option> : null}
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.active ? '' : ' — inactif'}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--pa-ink3)',
              pointerEvents: 'none',
            }}
          >
            <Ic n="chevD" s={15} />
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--pa-ink3)', marginTop: 8, lineHeight: 1.45 }}>
          Vue admin. En accès partenaire, ce sélecteur disparaît : chacun ne voit que ses propres services.
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {!selectedId ? (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--pa-ink3)' }}>Crée d’abord un partenaire.</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--pa-ink3)', lineHeight: 1.55 }}>
              Aucun service pour ce partenaire.
            </p>
          </div>
        ) : (
          filteredServices.map((s) => {
            const on = !isNewService && s.id === serviceId;
            const prices = (s.formules || []).map((f) => Number(f.priceMad) || 0);
            const minP = prices.length ? Math.min(...prices) : 0;
            return (
              <button
                key={s.id}
                type="button"
                className="pa-rowhov"
                onClick={() => selectService(s)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 16px',
                  border: 'none',
                  borderLeft: '2px solid ' + (on ? 'var(--pa-gold)' : 'transparent'),
                  background: on ? 'var(--pa-gold-wash)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="pa-lbl" style={{ fontSize: 9, color: 'var(--pa-gold-deep)' }}>
                    {s.category || '—'}
                  </span>
                  {!s.active ? <Pill tone="off">Masqué</Pill> : null}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: on ? 700 : 600,
                    letterSpacing: '-.01em',
                    lineHeight: 1.3,
                    marginBottom: 5,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    fontSize: 11,
                    color: 'var(--pa-ink3)',
                  }}
                >
                  <span className="pa-mono">{money(minP)} MAD</span>
                  <span style={{ width: 3, height: 3, borderRadius: 3, background: 'var(--pa-ink4)' }} />
                  <span>
                    {(s.formules || []).length} formule{(s.formules || []).length === 1 ? '' : 's'}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: !(s.photos || []).length ? 'var(--pa-danger)' : 'var(--pa-ink3)',
                    }}
                  >
                    <Ic n="img" s={12} />
                    {(s.photos || []).length}/3
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--pa-line2)' }}>
        <Btn
          variant="outline"
          size="sm"
          icon="plus"
          style={{ width: '100%' }}
          disabled={!selectedId}
          onClick={() => selectService(null)}
        >
          Nouveau service
        </Btn>
      </div>
    </>
  );

  return (
    <div className="pa-root">
      <header style={{ flexShrink: 0, background: 'var(--pa-surface)', borderBottom: '1px solid var(--pa-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 22px 0' }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.03em' }}>Expériences</span>
          <div style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 2, padding: '10px 22px 0' }}>
          {(
            [
              ['partners', 'Fiches'],
              ['concierge', 'Catalogue'],
            ] as const
          ).map(([k, l]) => {
            const on = tab === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                style={{
                  position: 'relative',
                  padding: '9px 15px 13px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13.5,
                  fontWeight: on ? 700 : 500,
                  letterSpacing: '-.01em',
                  color: on ? 'var(--pa-ink)' : 'var(--pa-ink2)',
                }}
              >
                {l}
                <span
                  style={{
                    position: 'absolute',
                    left: 11,
                    right: 11,
                    bottom: 0,
                    height: 2,
                    borderRadius: 2,
                    background: on ? 'var(--pa-gold)' : 'transparent',
                  }}
                />
              </button>
            );
          })}
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--pa-ink3)' }}>
            Chargement…
          </div>
        ) : tab === 'partners' ? (
          <Panes rail={partnerRail}>
            {showPartnerEmpty ? (
              <Empty
                icon="users"
                title="Aucun partenaire"
                body="Le catalogue est stocké en base Mongo. Créez votre premier partenaire — fiches et services restent persistants."
                action={
                  <Btn variant="gold" icon="plus" onClick={startCreatePartner}>
                    Nouveau partenaire
                  </Btn>
                }
              />
            ) : (
              <div className="pa-fade" style={{ maxWidth: 780, padding: '26px 32px 60px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    paddingBottom: 22,
                    borderBottom: '1px solid var(--pa-line)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                      <Pill tone={partnerDraft.active ? 'ok' : 'off'} icon={partnerDraft.active ? 'check' : null}>
                        {partnerDraft.active ? 'Actif' : 'Inactif'}
                      </Pill>
                      {!selectedId ? <Pill tone="neutral">Brouillon</Pill> : null}
                    </div>
                    <h1 className="pa-d" style={{ fontSize: 34, margin: '0 0 9px' }}>
                      {partnerDraft.name || 'Nouveau partenaire'}
                    </h1>
                    {selectedId ? (
                      <button
                        type="button"
                        onClick={() => setTab('concierge')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--pa-gold-deep)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        Voir ses {services.length} service{services.length === 1 ? '' : 's'}
                        <Ic n="chevR" s={15} />
                      </button>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 9, flexShrink: 0 }}>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        selected
                          ? setPartnerDraft(partnerToDraft(selected))
                          : setPartnerDraft(emptyPartner())
                      }
                    >
                      Annuler
                    </Btn>
                    <Btn variant="gold" size="sm" icon="check" disabled={saving} onClick={() => void savePartner()}>
                      Enregistrer
                    </Btn>
                  </div>
                </div>

                <Section label="Identité" title="Coordonnées" first>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field
                      label="Nom du partenaire"
                      value={partnerDraft.name}
                      onChange={(v) => setPartnerDraft((d) => ({ ...d, name: v }))}
                      ph="Ex. Agence désert Marrakech"
                      style={{ gridColumn: '1 / -1' }}
                    />
                    <Field
                      label="Email"
                      value={partnerDraft.email}
                      onChange={(v) => setPartnerDraft((d) => ({ ...d, email: v }))}
                      icon="mail"
                      ph="reservations@exemple.ma"
                    />
                    <Field
                      label="WhatsApp"
                      value={partnerDraft.whatsapp}
                      onChange={(v) => setPartnerDraft((d) => ({ ...d, whatsapp: v }))}
                      icon="wa"
                      mono
                      ph="+212661234567"
                      hint="Format E.164 — indicatif pays, sans espace ni zéro initial."
                    />
                  </div>
                </Section>

                <Section label="Couverture" title="Villes (partenaire)">
                  <div style={{ maxWidth: 480 }}>
                    <CityAssociationField
                      value={partnerDraft.cityIds}
                      onChange={(next) => setPartnerDraft((d) => ({ ...d, cityIds: next }))}
                    />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Constraint>
                      Un partenaire peut être <b>global</b> (« Toutes les villes »). Le filtre listing se
                      fait surtout sur <b>chaque activité</b> (ville de l’offre).
                    </Constraint>
                  </div>
                </Section>

                <Section
                  label="Rémunération"
                  title="Commission"
                  aside={
                    <Seg
                      value={partnerDraft.commissionType === 'fixed' ? 'fixed' : 'pct'}
                      onChange={(v) =>
                        setPartnerDraft((d) => ({
                          ...d,
                          commissionType: v === 'fixed' ? 'fixed' : 'percent',
                        }))
                      }
                      options={[
                        { v: 'pct', l: 'Pourcentage' },
                        { v: 'fixed', l: 'Montant fixe' },
                      ]}
                    />
                  }
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18, alignItems: 'start' }}>
                    {partnerDraft.commissionType === 'percent' ? (
                      <Field
                        label="Taux"
                        value={partnerDraft.commissionPercent}
                        onChange={(v) =>
                          setPartnerDraft((d) => ({ ...d, commissionPercent: Number(v) || 0 }))
                        }
                        mono
                        prefix="%"
                        ph="15"
                      />
                    ) : (
                      <Field
                        label="Montant par réservation"
                        value={partnerDraft.commissionFixedMad}
                        onChange={(v) =>
                          setPartnerDraft((d) => ({ ...d, commissionFixedMad: Number(v) || 0 }))
                        }
                        mono
                        prefix="MAD"
                        ph="150"
                      />
                    )}
                    <Constraint>
                      {partnerDraft.commissionType === 'percent'
                        ? 'Appliqué à chaque réservation, sauf si un service définit son propre taux. Une commission par service prime toujours sur celle du partenaire.'
                        : 'Montant fixe prélevé par réservation, quel que soit le prix de la formule. Un service peut définir son propre montant.'}
                    </Constraint>
                  </div>
                </Section>

                <Section label="Interne" title="Notes">
                  <Field
                    value={partnerDraft.notes}
                    onChange={(v) => setPartnerDraft((d) => ({ ...d, notes: v }))}
                    area
                    rows={4}
                    ph="Conditions particulières, contacts, minimum de participants…"
                    hint="Visible par l’équipe Sojori uniquement — jamais par le partenaire ni par le client."
                  />
                </Section>

                <Section label="Statut">
                  <Toggle
                    on={partnerDraft.active}
                    onChange={(v) => setPartnerDraft((d) => ({ ...d, active: v }))}
                    label="Partenaire actif"
                    hint="Un partenaire inactif reste enregistré, mais ses services ne sont plus proposés."
                  />
                </Section>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingTop: 22,
                    borderTop: '1px solid var(--pa-line)',
                  }}
                >
                  <Btn variant="gold" icon="check" disabled={saving} onClick={() => void savePartner()}>
                    Enregistrer
                  </Btn>
                  {selectedId ? (
                    <Btn variant="outline" onClick={() => setTab('concierge')} iconR="chevR">
                      Voir ses services
                    </Btn>
                  ) : null}
                  {selectedId ? (
                    <div style={{ marginLeft: 'auto' }}>
                      <Btn variant="danger" size="sm" icon="trash" disabled={saving} onClick={() => void deletePartner()}>
                        Supprimer
                      </Btn>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </Panes>
        ) : (
          <Panes rail={serviceRail}>
            {!selectedId ? (
              <Empty
                icon="users"
                title="Choisis un partenaire"
                body="Créez d’abord un partenaire dans l’onglet Partenaires."
                action={
                  <Btn variant="gold" onClick={() => setTab('partners')}>
                    Aller aux partenaires
                  </Btn>
                }
              />
            ) : showServiceEmpty ? (
              <Empty
                icon="grid"
                title="Aucun service"
                body={`${selected?.name || 'Ce partenaire'} n’a pas encore de service. Créez la première offre — elle sera sauvegardée en base.`}
                action={
                  <Btn variant="gold" icon="plus" onClick={() => selectService(null)}>
                    Créer un service
                  </Btn>
                }
              />
            ) : (
              <div className="pa-fade" style={{ maxWidth: 820, padding: '26px 32px 60px' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  hidden
                  onChange={(e) => {
                    void onUploadPhotos(e.target.files);
                    e.target.value = '';
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    paddingBottom: 22,
                    borderBottom: '1px solid var(--pa-line)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
                      <Pill tone="gold" icon="tag">{serviceDraft.category || 'Sans catégorie'}</Pill>
                      {isNewService ? (
                        <Pill tone="neutral">Brouillon</Pill>
                      ) : (
                        <Pill tone={serviceDraft.active ? 'ok' : 'off'} icon={serviceDraft.active ? 'check' : null}>
                          {serviceDraft.active ? 'Publié' : 'Masqué'}
                        </Pill>
                      )}
                      <button
                        type="button"
                        onClick={() => setTab('partners')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: 12,
                          color: 'var(--pa-ink3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {selected?.name}
                        <Ic n="ext" s={12} />
                      </button>
                    </div>
                    <h1 className="pa-d" style={{ fontSize: 32, lineHeight: 1.05, margin: 0 }}>
                      {serviceDraft.title || 'Nouveau service'}
                    </h1>
                  </div>
                  <div style={{ display: 'flex', gap: 9, flexShrink: 0 }}>
                    {isNewService ? (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (services[0]) selectService(services[0]);
                          else {
                            setCreatingService(false);
                            setServiceDraft(emptyService());
                          }
                        }}
                      >
                        Annuler
                      </Btn>
                    ) : null}
                    <Btn
                      variant="gold"
                      size="sm"
                      icon="check"
                      disabled={saving}
                      onClick={() => void saveService()}
                    >
                      {isNewService ? 'Créer le service' : 'Enregistrer'}
                    </Btn>
                  </div>
                </div>

                <Section label="L’offre" title="Présentation" first>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 16, marginBottom: 16 }}>
                    <Field
                      label="Titre du service"
                      value={serviceDraft.title}
                      onChange={(v) => setServiceDraft((d) => ({ ...d, title: v }))}
                      ph="Quad dans le désert d’Agafay"
                      hint="Ce que le client lit en premier sur WhatsApp. Court et concret."
                    />
                    <label style={{ display: 'block' }}>
                      <div className="pa-lbl" style={{ marginBottom: 7 }}>Catégorie</div>
                      <div style={{ position: 'relative' }}>
                        <select
                          className="pa-in"
                          value={serviceDraft.category}
                          onChange={(e) => setServiceDraft((d) => ({ ...d, category: e.target.value }))}
                          style={{
                            ...inpBase,
                            appearance: 'none',
                            paddingRight: 34,
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Choisir…</option>
                          {CATS.map((c) => (
                            <option key={c.v} value={c.v}>
                              {c.l}
                            </option>
                          ))}
                          {serviceDraft.category && !CATS.some((c) => c.v === serviceDraft.category) ? (
                            <option value={serviceDraft.category}>{serviceDraft.category}</option>
                          ) : null}
                        </select>
                        <span
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--pa-ink3)',
                            pointerEvents: 'none',
                          }}
                        >
                          <Ic n="chevD" s={15} />
                        </span>
                      </div>
                    </label>
                  </div>
                  <Field
                    label="Description"
                    value={serviceDraft.description}
                    onChange={(v) => setServiceDraft((d) => ({ ...d, description: v }))}
                    area
                    rows={3}
                    ph="Ce que vit le client, ce qui est inclus, le point de départ…"
                    hint="Deux à trois phrases. Mentionnez ce qui est inclus — transport, matériel, repas."
                  />
                  <div style={{ marginTop: 16 }}>
                    <Field
                      label="WhatsApp de l’activité"
                      value={serviceDraft.whatsapp}
                      onChange={(v) => setServiceDraft((d) => ({ ...d, whatsapp: v }))}
                      icon="wa"
                      mono
                      ph={selected?.whatsapp || '+2126…'}
                      hint={
                        selected?.whatsapp
                          ? `Vide = WhatsApp du partenaire (${selected.whatsapp}). Sinon numéro dédié à cette activité.`
                          : 'Format E.164. Si vide, le WhatsApp du partenaire sera utilisé.'
                      }
                    />
                  </div>
                </Section>

                <Section label="Couverture" title="Ville de l’activité">
                  <div style={{ maxWidth: 480 }}>
                    <CityAssociationField
                      value={serviceDraft.cityIds}
                      onChange={(next) => setServiceDraft((d) => ({ ...d, cityIds: next }))}
                    />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Constraint>
                      Obligatoire pour le matching listing : une annonce Marrakech ne voit que les
                      activités taguées Marrakech (ou « Toutes les villes »).
                    </Constraint>
                  </div>
                </Section>

                <Section label="Planning" title="Date & horaires">
                  <div style={{ marginBottom: 16 }}>
                    <div className="pa-lbl" style={{ marginBottom: 8 }}>Politique de date</div>
                    <Seg
                      value={serviceDraft.schedule.dateMode}
                      onChange={(v) =>
                        setServiceDraft((d) => ({
                          ...d,
                          schedule: { ...d.schedule, dateMode: v as 'from' | 'sure' },
                        }))
                      }
                      options={[
                        { v: 'from', l: 'À partir de (guest choisit)' },
                        { v: 'sure', l: 'Date sure (à confirmer)' },
                      ]}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <Field
                      label="Délai mini (jours)"
                      value={serviceDraft.schedule.minLeadDays ?? 1}
                      onChange={(v) =>
                        setServiceDraft((d) => ({
                          ...d,
                          schedule: { ...d.schedule, minLeadDays: Number(v) || 0 },
                        }))
                      }
                      mono
                      ph="1"
                      hint="Ex. 1 = pas aujourd’hui, dès demain."
                    />
                    <Field
                      label="À partir du (optionnel)"
                      value={serviceDraft.schedule.availableFrom || ''}
                      onChange={(v) =>
                        setServiceDraft((d) => ({
                          ...d,
                          schedule: { ...d.schedule, availableFrom: v },
                        }))
                      }
                      mono
                      ph="2026-08-01"
                      hint="YYYY-MM-DD — laisse vide pour « dès aujourd’hui + délai »."
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div className="pa-lbl" style={{ marginBottom: 8 }}>Jours de la semaine</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(
                        [
                          [1, 'Lun'],
                          [2, 'Mar'],
                          [3, 'Mer'],
                          [4, 'Jeu'],
                          [5, 'Ven'],
                          [6, 'Sam'],
                          [7, 'Dim'],
                        ] as const
                      ).map(([n, label]) => {
                        const all = !serviceDraft.schedule.weekdays?.length;
                        const on = all || serviceDraft.schedule.weekdays.includes(n);
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setServiceDraft((d) => {
                                const cur = d.schedule.weekdays || [];
                                let next: number[];
                                if (!cur.length) {
                                  next = [1, 2, 3, 4, 5, 6, 7].filter((x) => x !== n);
                                } else if (cur.includes(n)) {
                                  next = cur.filter((x) => x !== n);
                                } else {
                                  next = [...cur, n].sort();
                                }
                                if (next.length === 7) next = [];
                                return { ...d, schedule: { ...d.schedule, weekdays: next } };
                              });
                            }}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: '1px solid ' + (on ? 'var(--pa-gold-line)' : 'var(--pa-line)'),
                              background: on ? 'var(--pa-gold-wash)' : 'var(--pa-surface)',
                              fontSize: 12.5,
                              fontWeight: on ? 700 : 500,
                              color: on ? 'var(--pa-gold-deep)' : 'var(--pa-ink2)',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--pa-ink3)', marginTop: 8 }}>
                      Aucun jour sélectionné = tous les jours. Sinon seulement les jours cochés.
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div className="pa-lbl" style={{ marginBottom: 8 }}>Type d’horaire (flow WhatsApp)</div>
                    <Seg
                      value={serviceDraft.schedule.timeMode}
                      onChange={(v) =>
                        setServiceDraft((d) => ({
                          ...d,
                          schedule: {
                            ...d.schedule,
                            timeMode: v as 'window' | 'slots' | 'fixed',
                          },
                        }))
                      }
                      options={[
                        { v: 'window', l: 'A · Plage libre' },
                        { v: 'slots', l: 'B · Créneaux' },
                        { v: 'fixed', l: 'C · Heure imposée' },
                      ]}
                    />
                  </div>

                  {serviceDraft.schedule.timeMode === 'window' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Constraint>
                        Guest choisit une <b>date</b> + une <b>heure libre</b> entre les bornes (ex. Quad Agafay
                        9 h–18 h).
                      </Constraint>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <Field
                          label="Ouvert de"
                          value={serviceDraft.schedule.windowStart || '09:00'}
                          onChange={(v) =>
                            setServiceDraft((d) => ({
                              ...d,
                              schedule: { ...d.schedule, windowStart: v },
                            }))
                          }
                          mono
                          ph="09:00"
                        />
                        <Field
                          label="À"
                          value={serviceDraft.schedule.windowEnd || '18:00'}
                          onChange={(v) =>
                            setServiceDraft((d) => ({
                              ...d,
                              schedule: { ...d.schedule, windowEnd: v },
                            }))
                          }
                          mono
                          ph="18:00"
                        />
                        <Field
                          label="Dernier départ"
                          value={serviceDraft.schedule.lastDeparture || ''}
                          onChange={(v) =>
                            setServiceDraft((d) => ({
                              ...d,
                              schedule: { ...d.schedule, lastDeparture: v },
                            }))
                          }
                          mono
                          ph="16:00"
                          hint="Optionnel — ex. formule 2 h."
                        />
                      </div>
                    </div>
                  ) : null}

                  {serviceDraft.schedule.timeMode === 'slots' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <Constraint>
                        Guest choisit une <b>date</b> + un <b>créneau radio</b> (heure + libellé parcours).
                      </Constraint>
                      {(serviceDraft.schedule.slots || []).map((slot, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '110px 1fr 34px',
                            gap: 9,
                            alignItems: 'center',
                          }}
                        >
                          <input
                            className="pa-in"
                            value={slot.time}
                            onChange={(e) =>
                              setServiceDraft((d) => ({
                                ...d,
                                schedule: {
                                  ...d.schedule,
                                  slots: (d.schedule.slots || []).map((s, j) =>
                                    j === i ? { ...s, time: e.target.value } : s,
                                  ),
                                },
                              }))
                            }
                            placeholder="15:00"
                            style={{ ...inpBase, fontFamily: 'var(--pa-mono)', fontSize: 13.5 }}
                          />
                          <input
                            className="pa-in"
                            value={slot.label || ''}
                            onChange={(e) =>
                              setServiceDraft((d) => ({
                                ...d,
                                schedule: {
                                  ...d.schedule,
                                  slots: (d.schedule.slots || []).map((s, j) =>
                                    j === i ? { ...s, label: e.target.value } : s,
                                  ),
                                },
                              }))
                            }
                            placeholder="Quad, puis chameau au coucher du soleil"
                            style={{ ...inpBase, fontSize: 13.5 }}
                          />
                          <IconBtn
                            icon="trash"
                            tone="danger"
                            title="Supprimer le créneau"
                            onClick={() =>
                              setServiceDraft((d) => ({
                                ...d,
                                schedule: {
                                  ...d.schedule,
                                  slots: (d.schedule.slots || []).filter((_, j) => j !== i),
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                      <Btn
                        variant="outline"
                        size="sm"
                        icon="plus"
                        onClick={() =>
                          setServiceDraft((d) => ({
                            ...d,
                            schedule: {
                              ...d.schedule,
                              slots: [...(d.schedule.slots || []), { time: '', label: '' }],
                            },
                          }))
                        }
                      >
                        Ajouter un créneau
                      </Btn>
                    </div>
                  ) : null}

                  {serviceDraft.schedule.timeMode === 'fixed' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <Constraint>
                        Guest choisit seulement la <b>date</b>. L’heure est imposée (ex. montgolfière 05:30) —
                        affichée, non éditable dans le flow.
                      </Constraint>
                      <Field
                        label="Heure de départ imposée"
                        value={serviceDraft.schedule.fixedTime || '05:30'}
                        onChange={(v) =>
                          setServiceDraft((d) => ({
                            ...d,
                            schedule: { ...d.schedule, fixedTime: v },
                          }))
                        }
                        mono
                        ph="05:30"
                        style={{ maxWidth: 220 }}
                      />
                    </div>
                  ) : null}

                  <div style={{ marginTop: 16 }}>
                    <Field
                      label="Note guest (prise en charge, retour, météo…)"
                      value={serviceDraft.schedule.note || ''}
                      onChange={(v) =>
                        setServiceDraft((d) => ({
                          ...d,
                          schedule: { ...d.schedule, note: v },
                        }))
                      }
                      area
                      rows={2}
                      ph="Ex. Prise en charge vers 04 h 45 · Vol confirmé la veille selon météo · Retour vers 22 h 30"
                    />
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <Constraint>
                      Ces réglages pilotent les écrans A/B/C du flow WhatsApp (date + heure smart).
                    </Constraint>
                  </div>
                </Section>

                <Section
                  label="Tarifs"
                  title="Formules"
                  aside={
                    <span className="pa-mono" style={{ fontSize: 11, color: 'var(--pa-ink3)' }}>
                      {serviceDraft.formules.length} formule{serviceDraft.formules.length === 1 ? '' : 's'}
                    </span>
                  }
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 168px 34px',
                      gap: 9,
                      marginBottom: 9,
                    }}
                  >
                    <div className="pa-lbl">Libellé</div>
                    <div className="pa-lbl" style={{ textAlign: 'right' }}>Prix</div>
                    <div />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {serviceDraft.formules.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 168px 34px',
                          gap: 9,
                          alignItems: 'center',
                        }}
                      >
                        <input
                          className="pa-in"
                          value={f.label}
                          onChange={(e) =>
                            setServiceDraft((d) => ({
                              ...d,
                              formules: d.formules.map((x, j) =>
                                j === i ? { ...x, label: e.target.value } : x,
                              ),
                            }))
                          }
                          placeholder="Libellé de la formule"
                          style={{ ...inpBase, fontSize: 13.5 }}
                        />
                        <div style={{ display: 'flex' }}>
                          <input
                            className="pa-in"
                            value={f.priceMad || ''}
                            onChange={(e) =>
                              setServiceDraft((d) => ({
                                ...d,
                                formules: d.formules.map((x, j) =>
                                  j === i ? { ...x, priceMad: Number(e.target.value) || 0 } : x,
                                ),
                              }))
                            }
                            placeholder="0"
                            style={{
                              ...inpBase,
                              fontFamily: 'var(--pa-mono)',
                              fontSize: 13.5,
                              textAlign: 'right',
                              borderRadius: 'var(--pa-r) 0 0 var(--pa-r)',
                            }}
                          />
                          <span
                            className="pa-mono"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              padding: '0 10px',
                              fontSize: 11.5,
                              color: 'var(--pa-ink3)',
                              background: 'var(--pa-sunk)',
                              border: '1px solid var(--pa-line)',
                              borderLeft: 'none',
                              borderRadius: '0 var(--pa-r) var(--pa-r) 0',
                            }}
                          >
                            MAD
                          </span>
                        </div>
                        <IconBtn
                          icon="trash"
                          tone="danger"
                          title={
                            serviceDraft.formules.length > 1
                              ? 'Supprimer la formule'
                              : 'Au moins une formule est requise'
                          }
                          disabled={serviceDraft.formules.length <= 1}
                          onClick={() =>
                            setServiceDraft((d) => ({
                              ...d,
                              formules: d.formules.filter((_, j) => j !== i),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
                    <Btn
                      variant="outline"
                      size="sm"
                      icon="plus"
                      onClick={() =>
                        setServiceDraft((d) => ({
                          ...d,
                          formules: [...d.formules, { label: '', priceMad: 0 }],
                        }))
                      }
                    >
                      Ajouter une formule
                    </Btn>
                    <span style={{ fontSize: 11.5, color: 'var(--pa-ink3)' }}>
                      Une ligne par durée ou par variante — c’est ce que le client voit comme choix.
                    </span>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Constraint>
                      Prix en <b>MAD</b>, TTC. Tarifs indicatifs soumis à disponibilité — la formule choisie est
                      confirmée à la réservation.
                    </Constraint>
                  </div>
                </Section>

                <Section label="Règlement" title="Paiement">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {PAY_METHODS.map((m) => {
                      const on = serviceDraft.payment.methods.includes(m.v);
                      return (
                        <Btn
                          key={m.v}
                          variant={on ? 'gold' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setServiceDraft((d) => {
                              const has = d.payment.methods.includes(m.v);
                              const methods = has
                                ? d.payment.methods.filter((x) => x !== m.v)
                                : [...d.payment.methods, m.v];
                              return {
                                ...d,
                                payment: {
                                  ...d.payment,
                                  methods: methods.length ? methods : ['cash'],
                                },
                              };
                            })
                          }
                        >
                          {m.l}
                        </Btn>
                      );
                    })}
                  </div>
                  {serviceDraft.payment.methods.some((m) => m === 'card' || m === 'transfer') ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 160px',
                        gap: 12,
                        maxWidth: 420,
                        alignItems: 'end',
                      }}
                    >
                      <label>
                        <div className="pa-lbl" style={{ marginBottom: 7 }}>
                          Carte / virement
                        </div>
                        <select
                          className="pa-in"
                          style={inpBase}
                          value={serviceDraft.payment.collection}
                          onChange={(e) =>
                            setServiceDraft((d) => ({
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
                      </label>
                      {serviceDraft.payment.collection === 'deposit' ? (
                        <Field
                          label="% acompte"
                          value={String(serviceDraft.payment.depositPercent ?? 30)}
                          onChange={(v) =>
                            setServiceDraft((d) => ({
                              ...d,
                              payment: {
                                ...d.payment,
                                depositPercent: Number(v) || 30,
                              },
                            }))
                          }
                          mono
                          prefix="%"
                          ph="30"
                        />
                      ) : (
                        <div />
                      )}
                    </div>
                  ) : (
                    <Constraint>Cash seul → règlement sur place (pas d’acompte en ligne).</Constraint>
                  )}
                </Section>

                <Section
                  label="Visuels"
                  title="Photos"
                  aside={
                    photos.length ? (
                      <Btn
                        variant="ghost"
                        size="sm"
                        icon="trash"
                        onClick={() => setServiceDraft((d) => ({ ...d, photos: [] }))}
                      >
                        Tout supprimer
                      </Btn>
                    ) : null
                  }
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    {photos.map((url, i) => (
                      <div
                        key={url + i}
                        style={{
                          position: 'relative',
                          aspectRatio: '4/3',
                          borderRadius: 'var(--pa-r)',
                          overflow: 'hidden',
                          border: '1px solid var(--pa-line)',
                          background: 'var(--pa-sunk)',
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          title="Supprimer cette photo"
                          onClick={() =>
                            setServiceDraft((d) => ({
                              ...d,
                              photos: d.photos.filter((_, j) => j !== i),
                            }))
                          }
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            borderRadius: 7,
                            border: 'none',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'rgba(23,20,16,.7)',
                            color: '#fff',
                          }}
                        >
                          <Ic n="x" s={13} w={2.4} />
                        </button>
                      </div>
                    ))}
                    {photos.length < 3 ? (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        style={{
                          aspectRatio: '4/3',
                          borderRadius: 'var(--pa-r)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          border: '1.5px dashed var(--pa-line)',
                          background: 'var(--pa-surface)',
                          color: 'var(--pa-ink3)',
                        }}
                      >
                        <Ic n="up" s={20} />
                        <span style={{ fontSize: 11.5, fontWeight: 600 }}>
                          {uploading ? 'Upload…' : `Photo ${photos.length + 1}`}
                        </span>
                      </button>
                    ) : null}
                    {Array.from({ length: Math.max(0, 2 - photos.length) }).map((_, i) => (
                      <div
                        key={'g' + i}
                        style={{
                          aspectRatio: '4/3',
                          borderRadius: 'var(--pa-r)',
                          border: '1px dashed var(--pa-line2)',
                          background: 'var(--pa-sunk)',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--pa-ink4)',
                        }}
                      >
                        <Ic n="img" s={18} />
                      </div>
                    ))}
                  </div>
                  <Constraint icon={photos.length === 0 ? 'alert' : 'info'} tone={photos.length === 0 ? 'neutral' : 'gold'}>
                    {photos.length === 0 ? (
                      <>
                        <b>Aucune photo</b> — le service peut être enregistré, mais il sera envoyé sans visuel.
                        Idéal WhatsApp : <b>1200×628</b> JPEG, &lt; 1 Mo.
                      </>
                    ) : (
                      <>
                        <b>Trois photos maximum</b>, paysage <b>1200×628</b> (ou 4:3), &lt; 1 Mo chacune. Elles
                        partent telles quelles dans WhatsApp — la première sert de couverture.
                      </>
                    )}
                  </Constraint>
                </Section>

                <Section label="Recherche" title="Mots-clés">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
                    {serviceDraft.keywords.map((k, i) => (
                      <span
                        key={k + i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 7,
                          fontSize: 12.5,
                          background: 'var(--pa-surface)',
                          border: '1px solid var(--pa-line)',
                        }}
                      >
                        {k}
                        <button
                          type="button"
                          onClick={() =>
                            setServiceDraft((d) => ({
                              ...d,
                              keywords: d.keywords.filter((_, j) => j !== i),
                            }))
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            display: 'grid',
                            color: 'var(--pa-ink4)',
                          }}
                        >
                          <Ic n="x" s={12} w={2.4} />
                        </button>
                      </span>
                    ))}
                    {!serviceDraft.keywords.length ? (
                      <span style={{ fontSize: 12.5, color: 'var(--pa-ink3)' }}>Aucun mot-clé.</span>
                    ) : null}
                  </div>
                  <Field
                    value={kwInput}
                    onChange={setKwInput}
                    ph="Ajouter un mot-clé puis Entrée…"
                    hint="Ce sur quoi l’assistant retrouve le service. Pensez aux mots du client."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                </Section>

                <Section label="Exception" title="Commission de ce service">
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18, alignItems: 'start' }}>
                    <Field
                      label="Taux spécifique"
                      value={serviceDraft.commissionPercent}
                      onChange={(v) =>
                        setServiceDraft((d) => ({
                          ...d,
                          commissionPercent: v,
                          commissionType: v === '' ? '' : 'percent',
                        }))
                      }
                      mono
                      prefix="%"
                      ph={String(selected?.commissionPercent ?? 15)}
                    />
                    <Constraint>
                      Laissez vide pour appliquer la commission du partenaire
                      {selected
                        ? ` — ${
                            selected.commissionType === 'fixed'
                              ? `${money(selected.commissionFixedMad || 0)} MAD`
                              : `${selected.commissionPercent || 0} %`
                          } pour ${selected.name}`
                        : ''}
                      . Une valeur ici ne concerne que ce service.
                    </Constraint>
                  </div>
                </Section>

                <Section label="Publication">
                  <Toggle
                    on={serviceDraft.active}
                    onChange={(v) => setServiceDraft((d) => ({ ...d, active: v }))}
                    label="Service visible par les clients"
                    hint="Un service masqué reste enregistré mais n’est jamais proposé par l’assistant."
                  />
                </Section>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingTop: 22,
                    borderTop: '1px solid var(--pa-line)',
                  }}
                >
                  <Btn variant="gold" icon="check" disabled={saving} onClick={() => void saveService()}>
                    {isNewService ? 'Créer le service' : 'Enregistrer'}
                  </Btn>
                  {!isNewService ? (
                    <div style={{ marginLeft: 'auto' }}>
                      <Btn variant="danger" size="sm" icon="trash" disabled={saving} onClick={() => void deleteService()}>
                        Supprimer
                      </Btn>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </Panes>
        )}
      </main>
    </div>
  );
}

export default PartnersAdminPage;
