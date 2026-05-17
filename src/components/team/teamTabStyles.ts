import type { CSSProperties } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';

export const teamTableWrap: CSSProperties = {
  overflow: 'auto',
  border: `1px solid ${T.border}`,
  borderRadius: 8,
};

export const teamTh: CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: T.text3,
  borderBottom: `2px solid ${T.border}`,
  background: T.bg2,
};

export const teamTd: CSSProperties = {
  padding: '10px 12px',
  fontSize: 12,
  color: T.text,
  borderBottom: `1px solid ${T.border}`,
};

export const teamBtnPrimary: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: 0,
  background: T.primary,
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
