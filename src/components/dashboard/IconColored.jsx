/**
 * Icônes colorées pour le sidebar Claude Design
 * Utilise SVG avec couleurs personnalisées
 */

import React from 'react';

export function IconColored({ type, color = '#666666', size = 20 }) {
  const icons = {
    // Pilotage
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="1" fill={color} />
        <rect x="13" y="3" width="8" height="4" rx="1" fill={color} />
        <rect x="13" y="9" width="8" height="12" rx="1" fill={color} />
        <rect x="3" y="13" width="8" height="8" rx="1" fill={color} />
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="14" width="3" height="7" rx="1" fill={color} />
        <rect x="10" y="10" width="3" height="11" rx="1" fill={color} />
        <rect x="16" y="6" width="3" height="15" rx="1" fill={color} />
      </svg>
    ),
    document: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M7 3h10l4 4v14H7V3z" fill={color} opacity="0.2" />
        <path d="M7 3h10l4 4v14H7V3z" stroke={color} strokeWidth="2" fill="none" />
        <line x1="9" y1="10" x2="15" y2="10" stroke={color} strokeWidth="1.5" />
        <line x1="9" y1="14" x2="15" y2="14" stroke={color} strokeWidth="1.5" />
      </svg>
    ),

    // Opérations
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="16" rx="2" fill={color} opacity="0.2" />
        <rect x="4" y="5" width="16" height="16" rx="2" stroke={color} strokeWidth="2" fill="none" />
        <line x1="4" y1="9" x2="20" y2="9" stroke={color} strokeWidth="2" />
        <line x1="9" y1="3" x2="9" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="3" x2="15" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" fill={color} opacity="0.2" />
        <path d="M7 12l3 3 7-7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),

    // Orchestration
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill={color} />
        <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m12.728 0l-2.121-2.121M8.757 8.757L6.636 6.636"
          stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),

    // Catalogue
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" fill={color} opacity="0.2" />
        <path d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    trending: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="17 6 23 6 23 12" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    link: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),

    // Relation client
    chat: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill={color} opacity="0.2" />
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth="2" fill="none" />
      </svg>
    ),
    robot: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="5" y="8" width="14" height="13" rx="2" fill={color} opacity="0.2" />
        <rect x="5" y="8" width="14" height="13" rx="2" stroke={color} strokeWidth="2" fill="none" />
        <circle cx="9" cy="13" r="1.5" fill={color} />
        <circle cx="15" cy="13" r="1.5" fill={color} />
        <line x1="12" y1="4" x2="12" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="4" r="1" fill={color} />
        <line x1="9" y1="17" x2="15" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" fill={color} opacity="0.2" />
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="17" cy="7" r="3" stroke={color} strokeWidth="2" fill="none" />
        <path d="M21 21v-2a4 4 0 00-3-3.87" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    ),

    // Équipe
    worker: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="7" r="4" fill={color} opacity="0.2" />
        <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
        <path d="M5 21v-2a7 7 0 0114 0v2" stroke={color} strokeWidth="2" fill="none" />
        <path d="M14 12l3 3-3 3" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),

    // Monitor
    monitor: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" fill={color} opacity="0.2" />
        <rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth="2" fill="none" />
        <line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2" />
        <polyline points="6 9 10 13 14 9 18 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),

    // Admin
    building: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="18" rx="1" fill={color} opacity="0.2" />
        <rect x="4" y="4" width="16" height="18" rx="1" stroke={color} strokeWidth="2" fill="none" />
        <line x1="9" y1="9" x2="9" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="9" x2="15" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="9" y1="13" x2="9" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="15" y1="13" x2="15" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <rect x="11" y="17" width="2" height="5" fill={color} />
      </svg>
    ),
    shield: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={color} opacity="0.2" />
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="2" fill="none" />
      </svg>
    ),
  };

  return icons[type] || <div style={{ width: size, height: size, background: color, borderRadius: '50%' }} />;
}
