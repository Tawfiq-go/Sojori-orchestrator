# Plein écran (fullscreen) — pattern Sojori-orchestrator

Guide court pour généraliser le même geste ⛶ partout (calendrier, listes, planning, inbox).

**Repo propriétaire UI :** `Sojori-orchestrator` (ce dossier).  
**Pointeur backend monorepo :** `sojori-production/docs/fullscreen/README.md`

---

## API partagée (préférer ceci)

| Export | Fichier | Rôle |
|--------|---------|------|
| `usePageFullscreen()` | `src/components/page-fullscreen/usePageFullscreen.ts` | State + Escape + `body { overflow: hidden }` |
| `PageFullscreenEnterBtn` | `…/PageFullscreenEnterBtn.tsx` | Bouton carré ⛶ ~30×28 |
| `PageFullscreenLayer` | `…/PageFullscreenLayer.tsx` | Portal overlay + × |
| `pageTreeFullscreenSx` / `pageContentFullscreenSx` | `…/pageFullscreenSx.ts` | Flex shell / zone scroll |

Barrel : `import { … } from '../components/page-fullscreen'`.

```tsx
const pageFs = usePageFullscreen();

const pageTree = (
  <Box sx={{ width: '100%', ...pageTreeFullscreenSx(pageFs.fullscreen) }}>
    <Toolbar flexShrink={0}>
      {/* filtres… */}
      {!pageFs.fullscreen && (
        <PageFullscreenEnterBtn onClick={pageFs.enter} label="Liste plein écran" />
      )}
    </Toolbar>
    <Box sx={pageContentFullscreenSx(pageFs.fullscreen)}>
      {/* table / grille */}
    </Box>
  </Box>
);

return (
  <DashboardWrapper>
    {!pageFs.fullscreen && pageTree}
    <PageFullscreenLayer
      open={pageFs.fullscreen}
      onClose={pageFs.exit}
      label="… plein écran"
      /* zIndex={40} pour calendrier inventaire (popups internes bas) */
    >
      {pageTree}
    </PageFullscreenLayer>
  </DashboardWrapper>
);
```

Inbox : `useInboxFullscreen` / `InboxFullscreenLayer` restent des alias fins sur cette API (`unified-inbox/`).

---

## Quand l’utiliser

- Grille / liste dense où le chrome dashboard (sidebar + topbar) mange de la hauteur utile.
- L’utilisateur doit **continuer à filtrer / naviguer** pendant le plein écran (recherche, pills, selects, pagination, dates).
- Pas pour une simple preview image ou un modal ponctuel → préférer Dialog / Drawer.
- Pas pour login / auth, formulaires purs, placeholders.

---

## Structure (référence)

```
┌─ page (DashboardWrapper) ─────────────────────────┐
│  [arbre page unique]                               │
│   ├─ toolbar / filtres / KPIs  (flexShrink: 0)     │
│   ├─ contrôles utiles (pagination, nav dates…)     │
│   └─ zone contenu (flex: 1, overflow: auto)        │
│                                                    │
│  bouton ⛶ dans la toolbar (masqué si déjà FS)     │
└────────────────────────────────────────────────────┘

En fullscreen :
  PageFullscreenLayer → createPortal( overlay fixed inset:0 → même arbre page + × , document.body )
  Échap → exit · body overflow: hidden pendant FS
```

### Règle d’or

> **Portal = même arbre JSX que la page** (filtres + contenu), pas seulement la table / grille.

---

## Do / Don’t

| Do ✅ | Don’t ❌ |
|------|---------|
| Un seul `pageTree` rendu soit en page, soit dans le portal | Dupliquer filtres dans le portal et les laisser morts sous l’overlay |
| Garder recherche, selects, pills, KPIs, pagination / nav dates | Overlay « bare list » sans toolbar |
| `PageFullscreenEnterBtn` (~30×28 ⛶) | Icône MUI Maximize différente sans raison |
| Exit : × (layer) + **Échap** (hook) | Oublier Escape ou bloquer le scroll body sans cleanup |
| z-index **sous** MUI Dialog/Popover (défaut **1200** ; calendrier inventaire **40**) | z-index ≥ 1300 → modals derrière le fullscreen |
| Masquer ⛶ quand déjà en fullscreen | Laisser un 2ᵉ bouton enter dans le portal |
| Planning StayView : **ne pas** `gridOnly` en FS (garder nav dates) | Masquer le chrome StayView en plein écran |

### Erreurs fréquentes (à éviter)

1. **Portal = contenu seul** — filtres / toolbar restent dans `DashboardWrapper` sous l’overlay → utilisateur ne peut plus filtrer. Toujours portaler **le même** `pageTree`.
2. **Inbox hub chrome** — recherche / chips WA·OTA·Leads vivent dans `CommsHubChrome` (`InboxHubTabs`). Le plein écran doit les remonter via `InboxFullscreenLayer` (auto) ou `chrome={…}` (Avis). Ne pas portaler uniquement la grille 3 colonnes.
3. **Bouton ⛶ ad-hoc** — préférer `PageFullscreenEnterBtn` (StayView, ThreadsList, pages).
4. **Pills / filtres hors de `pageTree`** — ex. Avis : les chips « Tous / À répondre » doivent être dans le portal (`chrome` ou arbre unique).

---

## Écrans couverts

| Zone | Route(s) | Notes |
|------|----------|--------|
| Calendrier multi/simple | `/calendar` | `CalendarInventoryPage.jsx` — `zIndex={40}` |
| Réservations liste | `/reservations` | `ReservationsPage.tsx` |
| Réservation détail | `/reservations/:id` | tabs + contenu |
| Planning résas / tasks | `/reservations/planning`, `/tasks/planning` | StayView + toolbar |
| Planning ops | `/planning` | `ResasTabV2` |
| Tâches liste | `/tasks` | filtres + table (plus table seule) |
| Kanban | `/tasks/kanban` | |
| Équipe / staff | `/tasks/team` | |
| Plans séjour | `/orchestration/plans` | |
| Inbox guest/staff | `/communications?…` | via `InboxFullscreenLayer` |
| WhatsApp guests | onglet WA | migré sur layer partagée |
| Listings | `/listings` | |
| Paiements | `/paiements` | |
| Whitelist | `/chatbot/whitelist` | |
| Analytics | `/analytics` | |
| Monitor owners | `/admin/owner-monitor` | |
| Finances propriétaires | `/finances/landlords` | |

### Intentionnellement non couverts

| Écran | Pourquoi |
|-------|----------|
| Login / register / reset / invite | Auth |
| Clients (`/clients`) | Placeholder « bientôt » |
| Fiches listing create/edit, profil PM, provider, direct-booking config/preview | Formulaires, pas grille dense |
| Finances branding, settings hubs | Config / forms |
| CRM hub tabs seuls | Conteneurs ; listes denses à traiter au fil des onglets si besoin |
| Dynamic pricing portefeuille | Shell imbriqué ; à brancher quand on y touche |

---

## Checklist — nouvelle page

1. [ ] `usePageFullscreen()` (pas de useEffect Escape maison).
2. [ ] Extraire **un** arbre JSX `pageTree` = toolbar/filtres + contenu.
3. [ ] `!fullscreen && <PageFullscreenEnterBtn … />` dans la toolbar.
4. [ ] `{!fullscreen && pageTree}` + `<PageFullscreenLayer>{pageTree}</PageFullscreenLayer>`.
5. [ ] Vérifier Dialog / Select / DatePicker au-dessus (z-index).
6. [ ] Soft-check Vite `:3001` : enter, filtrer, Escape, ×.

---

## EN — one-liner

**Fullscreen must portal the same page tree that includes filters/toolbar, not a list-only overlay.** Shared API: `src/components/page-fullscreen/`.
