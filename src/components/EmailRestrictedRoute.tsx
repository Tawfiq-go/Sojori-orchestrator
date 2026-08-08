import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CRM_ALLOWED_EMAILS } from '../config/navConfig';

/**
 * Garde de route NOMINATIF — l'accès est réservé à une liste d'emails précis,
 * indépendamment du rôle (un autre SuperAdmin reste bloqué).
 *
 * ⚠️ Masquer l'entrée de sidebar ne protège rien : sans ce garde, l'URL tapée
 * à la main donnerait accès à l'écran. Ce garde reste une protection UI —
 * la barrière qui compte est celle de l'API côté serveur.
 */
export const EmailRestrictedRoute: React.FC<{ allowed?: string[] }> = ({
  allowed = CRM_ALLOWED_EMAILS,
}) => {
  const { loading, user } = useAuth();

  if (loading) return null;

  const email = String(user?.email ?? '').trim().toLowerCase();
  const ok = email && allowed.some((a) => a.trim().toLowerCase() === email);

  if (!ok) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};
