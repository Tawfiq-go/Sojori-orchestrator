import { createContext } from 'react';

/**
 * Identité « vue » (2026-09-03) — l'owner que l'admin regarde.
 *
 * Fourni par PmSimulationProvider quand un owner est sélectionné, lu par
 * `useAuth()` qui rend alors un utilisateur effectif de rôle Owner. Tout le
 * front qui teste le rôle (76 endroits) bascule ainsi sans être modifié :
 * c'est ce qui rend la vue owner fidèle par construction.
 *
 * Null = pas de vue : `useAuth()` rend le compte réel.
 */
export interface AdminViewIdentity {
  ownerId: string;
  ownerLabel: string;
  ownerEmail?: string;
}

export const AdminViewOverrideContext = createContext<AdminViewIdentity | null>(null);
