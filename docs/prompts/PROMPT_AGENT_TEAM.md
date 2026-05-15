# 🤖 PROMPT AGENT-TEAM (AGENT-9)

**Nom de l'agent** : `Agent-Team`
**Mission** : Créer le système de gestion d'équipe, rôles et permissions
**Durée estimée** : 3-4h

---

## 🎯 TA MISSION

Tu es **Agent-Team**, spécialisé dans la gestion de l'équipe et des rôles.

**Objectif** : Créer les pages pour gérer :
- Liste des membres de l'équipe (Property managers, Staff, Admins)
- Rôles et permissions
- Invitations de nouveaux membres
- Groupes/équipes

**Référence existante** : `https://dashboard.sojori.com/admin/User/owner?tab=list`

---

## 📋 CONTEXTE

**Backend** :
- Service : `srv-user` (port 4003)
- Path : `/Users/gouacht/sojori-production/apps/srv-user`
- URL local : `http://localhost:4003`

**Frontend** :
- Path : `/Users/gouacht/Sojori-orchestrator`
- Design : Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)
- Stack : Vite 8 + React 18 + TypeScript + MUI v9

**Sidebar existante** :
- ✅ "Équipe" existe déjà dans groupe "Tâches" (`tasks/team`)
- Tu vas créer/modifier cette page

---

## 🔒 ÉTAPE 0 : SÉCURITÉ OBLIGATOIRE

**Avant toute modification, lire :**

`/Users/gouacht/sojori-production/SECURITY_RULES.md`

**Règles critiques** :
- Routes admin-only : ajouter `roleAllow([Roles.SuperAdmin, Roles.Admin])`
- Ne jamais exposer les mots de passe
- Valider tous les inputs (email, rôles, permissions)
- Logger les changements de rôles/permissions

---

## 🔍 ÉTAPE 1 : EXPLORER LE BACKEND

### 1.1 Identifier les routes API

```bash
# Explorer les routes user
find /Users/gouacht/sojori-production/apps/srv-user/src/routes -name "*.ts" -exec grep -l "router\\.get\\|router\\.post" {} \;

# Lire les routes auth
cat /Users/gouacht/sojori-production/apps/srv-user/src/routes/auth/*.ts

# Chercher inviteWorker
cat /Users/gouacht/sojori-production/apps/srv-user/src/routes/auth/inviteWoker.ts
```

### 1.2 Routes attendues

Tu dois identifier et documenter :
- `GET /api/v1/users` ou `/api/v1/team` - Liste team members
- `GET /api/v1/users/:id` - Détail user
- `POST /api/v1/users/invite` - Inviter nouveau membre
- `PUT /api/v1/users/:id` - Modifier user (rôle, permissions)
- `DELETE /api/v1/users/:id` - Supprimer user
- `GET /api/v1/roles` - Liste rôles disponibles
- `GET /api/v1/permissions` - Liste permissions

**IMPORTANT** : Si les routes n'existent pas exactement, documente ce qui existe et adapte.

### 1.3 Format des données

Documente le format exact (exemple) :
```typescript
interface TeamMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SuperAdmin' | 'Admin' | 'PropertyManager' | 'Staff' | 'Guest';
  permissions: string[];
  avatar?: string;
  phone?: string;
  status: 'active' | 'invited' | 'inactive';
  properties?: string[]; // IDs propriétés assignées
  createdAt: string;
  lastLogin?: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}
```

---

## 🔧 ÉTAPE 2 : CRÉER LE SERVICE API

### 2.1 Créer le fichier service

**Fichier** : `src/services/teamService.ts`

```typescript
import axios from 'axios';
import type { TeamMember, TeamMemberInput, Role, InviteInput } from '../types/team.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4003';

export const teamService = {
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const response = await axios.get(`${API_URL}/api/v1/users`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  },

  async getTeamMember(id: string): Promise<TeamMember> {
    const response = await axios.get(`${API_URL}/api/v1/users/${id}`);
    return response.data;
  },

  async inviteMember(data: InviteInput): Promise<TeamMember> {
    const response = await axios.post(`${API_URL}/api/v1/users/invite`, data);
    return response.data;
  },

  async updateMember(id: string, data: Partial<TeamMemberInput>): Promise<TeamMember> {
    const response = await axios.put(`${API_URL}/api/v1/users/${id}`, data);
    return response.data;
  },

  async deleteMember(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/v1/users/${id}`);
  },

  async getRoles(): Promise<Role[]> {
    const response = await axios.get(`${API_URL}/api/v1/roles`);
    return response.data;
  },

  async resendInvite(id: string): Promise<void> {
    await axios.post(`${API_URL}/api/v1/users/${id}/resend-invite`);
  },
};
```

---

## 📝 ÉTAPE 3 : CRÉER LES TYPES TYPESCRIPT

### 3.1 Créer le fichier types

**Fichier** : `src/types/team.types.ts`

```typescript
export type UserRole = 'SuperAdmin' | 'Admin' | 'PropertyManager' | 'Staff' | 'Guest';
export type UserStatus = 'active' | 'invited' | 'inactive';

export interface TeamMember {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  phone?: string;
  status: UserStatus;
  properties?: string[]; // IDs propriétés assignées
  groups?: string[]; // IDs groupes
  createdAt: string;
  lastLogin?: string;
  invitedBy?: string;
}

export interface TeamMemberInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  phone?: string;
  properties?: string[];
  groups?: string[];
}

export interface InviteInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  message?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  properties?: string[]; // Property IDs
  createdAt: string;
}
```

---

## 🎨 ÉTAPE 4 : CRÉER LES PAGES

### 4.1 Page principale : TeamPage.tsx

**Fichier** : `src/pages/TeamPage.tsx`

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Stack, Typography, Button, TextField, Select, MenuItem, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tabs, Tab,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, Badge, btnPrimarySx, btnGhostSx, tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { teamService } from '../services/teamService';
import type { TeamMember, InviteInput, UserRole } from '../types/team.types';

type TabValue = 'members' | 'roles' | 'groups';

export function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabValue>('members');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeamMembers();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement de l\'équipe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (data: InviteInput) => {
    try {
      await teamService.inviteMember(data);
      setInviteModalOpen(false);
      loadMembers();
    } catch (err) {
      alert('Erreur lors de l\'invitation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce membre ?')) return;
    try {
      await teamService.deleteMember(id);
      loadMembers();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await teamService.resendInvite(id);
      alert('Invitation renvoyée');
    } catch (err) {
      alert('Erreur lors du renvoi');
    }
  };

  // Filtrer membres
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (searchTerm && !`${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [members, roleFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      invited: members.filter(m => m.status === 'invited').length,
      admins: members.filter(m => m.role === 'Admin' || m.role === 'SuperAdmin').length,
      staff: members.filter(m => m.role === 'Staff' || m.role === 'PropertyManager').length,
    };
  }, [members]);

  return (
    <DashboardWrapper breadcrumb={['Équipe & Rôles']}>
      <PageHeader
        title="Équipe & Rôles"
        desc="Gérez votre équipe et les permissions"
        actions={
          <Button sx={btnPrimarySx} onClick={() => setInviteModalOpen(true)}>
            ➕ Inviter un membre
          </Button>
        }
      />

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Panel title="Total" desc={String(stats.total)} sx={{ flex: 1 }} />
        <Panel title="Actifs" desc={String(stats.active)} sx={{ flex: 1 }} />
        <Panel title="Invités" desc={String(stats.invited)} sx={{ flex: 1 }} />
        <Panel title="Admins" desc={String(stats.admins)} sx={{ flex: 1 }} />
        <Panel title="Staff" desc={String(stats.staff)} sx={{ flex: 1 }} />
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as TabValue)}
        sx={{ mb: 2, borderBottom: `1px solid ${t.border}` }}
      >
        <Tab value="members" label="👥 Membres" />
        <Tab value="roles" label="🔐 Rôles & Permissions" />
        <Tab value="groups" label="📦 Groupes" />
      </Tabs>

      {/* Tab: Members */}
      {tab === 'members' && (
        <>
          {/* Filtres */}
          <Panel sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="all">Tous les rôles</MenuItem>
                <MenuItem value="SuperAdmin">Super Admin</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="PropertyManager">Property Manager</MenuItem>
                <MenuItem value="Staff">Staff</MenuItem>
              </Select>
            </Stack>
          </Panel>

          {/* Loading */}
          {loading && (
            <Panel>
              <Typography sx={{ textAlign: 'center', py: 4, color: t.text3 }}>
                Chargement...
              </Typography>
            </Panel>
          )}

          {/* Error */}
          {error && (
            <Panel>
              <Typography sx={{ textAlign: 'center', py: 4, color: t.error }}>
                {error}
              </Typography>
            </Panel>
          )}

          {/* Table */}
          {!loading && !error && (
            <Panel>
              <TableContainer component={Paper} elevation={0} sx={{ border: 'none' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: t.bg2 }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>MEMBRE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>RÔLE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>STATUT</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>PERMISSIONS</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>DERNIÈRE CONNEXION</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11.5, color: t.text3 }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: t.text3 }}>
                          Aucun membre trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map(m => (
                        <TableRow key={m._id} sx={{ '&:hover': { bgcolor: t.bg2 } }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ width: 36, height: 36, bgcolor: t.primary, fontSize: 14 }}>
                                {m.firstName[0]}{m.lastName[0]}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                                  {m.firstName} {m.lastName}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                                  {m.email}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                m.role === 'SuperAdmin' || m.role === 'Admin' ? 'error' :
                                m.role === 'PropertyManager' ? 'warning' : 'default'
                              }
                              size="small"
                            >
                              {m.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                m.status === 'active' ? 'success' :
                                m.status === 'invited' ? 'warning' : 'default'
                              }
                              size="small"
                            >
                              {m.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: 11, color: t.text3 }}>
                              {m.permissions.length} permissions
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, fontFamily: 'Geist Mono', color: t.text3 }}>
                            {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" sx={{ ...btnGhostSx, fontSize: 11 }}>
                                ✏️
                              </Button>
                              {m.status === 'invited' && (
                                <Button
                                  size="small"
                                  sx={{ ...btnGhostSx, fontSize: 11 }}
                                  onClick={() => handleResendInvite(m._id)}
                                >
                                  📧
                                </Button>
                              )}
                              <Button
                                size="small"
                                sx={{ ...btnGhostSx, fontSize: 11, color: t.error }}
                                onClick={() => handleDelete(m._id)}
                              >
                                🗑️
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Panel>
          )}
        </>
      )}

      {/* Tab: Roles */}
      {tab === 'roles' && (
        <Panel sx={{ p: 3 }}>
          <Typography sx={{ color: t.text3, textAlign: 'center', py: 4 }}>
            Section Rôles & Permissions - À implémenter
          </Typography>
        </Panel>
      )}

      {/* Tab: Groups */}
      {tab === 'groups' && (
        <Panel sx={{ p: 3 }}>
          <Typography sx={{ color: t.text3, textAlign: 'center', py: 4 }}>
            Section Groupes - À implémenter
          </Typography>
        </Panel>
      )}

      {/* Invite Modal */}
      <InviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInvite}
      />
    </DashboardWrapper>
  );
}

// Modal invitation
function InviteModal({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (data: InviteInput) => void;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      alert('Tous les champs sont requis');
      return;
    }

    onInvite({
      email,
      firstName,
      lastName,
      role,
      message: message || undefined,
    });

    // Reset
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('Staff');
    setMessage('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Inviter un membre</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              required
            />
          </Stack>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            fullWidth
          >
            <MenuItem value="Staff">Staff</MenuItem>
            <MenuItem value="PropertyManager">Property Manager</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
          </Select>
          <TextField
            label="Message personnalisé (optionnel)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={btnGhostSx}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} sx={btnPrimarySx}>
          Envoyer l'invitation
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## 🔗 ÉTAPE 5 : AJOUTER LA ROUTE

### 5.1 Modifier App.tsx

**Fichier** : `src/App.tsx`

Remplacer :
```tsx
<Route path="/tasks/team" element={<div>Team</div>} />
```

Par :
```tsx
<Route path="/tasks/team" element={<TeamPage />} />
```

Et ajouter l'import :
```tsx
import { TeamPage } from './pages/TeamPage';
```

---

## ✅ ÉTAPE 6 : TESTER

### 6.1 Démarrer le backend

```bash
cd /Users/gouacht/sojori-production
docker-compose -f docker-compose-v2.yml up -d srv-user
```

### 6.2 Vérifier que le backend répond

```bash
curl http://localhost:4003/health
curl http://localhost:4003/api/v1/users
```

### 6.3 Tester le frontend

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4174

# Ouvrir http://localhost:4174/tasks/team
```

### 6.4 Checklist tests

- [ ] Backend répond sur port 4003
- [ ] Page team charge sans erreur
- [ ] Liste membres s'affiche
- [ ] Filtres fonctionnent (search, role)
- [ ] Stats s'affichent
- [ ] Modal invite s'ouvre
- [ ] Tabs fonctionnent (Members, Roles, Groups)
- [ ] Design Aurora Soft Light respecté

---

## 🎯 AMÉLIORATIONS OPTIONNELLES

### 6.5 Tab Rôles & Permissions

Si le temps le permet, créer la section Rôles :
- Liste des rôles disponibles (cards)
- Permissions par rôle (checkboxes)
- Créer nouveau rôle custom

### 6.6 Tab Groupes

Si le temps le permet, créer la section Groupes :
- Liste groupes (ex: "Équipe Paris", "Staff Marrakech")
- Membres par groupe
- Propriétés assignées au groupe

---

## 🎯 RÉSULTAT ATTENDU

**Après ton travail** :
- ✅ Page `/tasks/team` fonctionnelle
- ✅ Liste membres avec filtres
- ✅ Invitation nouveaux membres
- ✅ Stats affichées
- ✅ Tabs Members/Roles/Groups
- ✅ Actions (modifier, supprimer, renvoyer invite)
- ✅ Design Aurora Soft Light
- ✅ Loading + Error states
- ✅ Tous les tests passent

---

## 🚨 RÈGLES CRITIQUES

1. **Sécurité** :
   - ✅ Lire SECURITY_RULES.md avant de modifier le backend
   - ✅ Ne jamais exposer les mots de passe
   - ✅ Valider tous les emails
   - ✅ Protéger les routes admin-only

2. **Design** :
   - ✅ TOUJOURS utiliser tokens Aurora
   - ✅ TOUJOURS utiliser composants DashboardV2
   - ❌ NE JAMAIS créer de styles custom

3. **API** :
   - ✅ TOUJOURS gérer loading/error states
   - ✅ TOUJOURS adapter les types selon le backend réel
   - ✅ TOUJOURS tester avec vraies données

4. **TypeScript** :
   - ✅ TOUJOURS typer strictement
   - ❌ NE JAMAIS utiliser `any`

---

## 📝 CHECKLIST FINALE

- [ ] Backend exploré (routes identifiées)
- [ ] Service créé (`teamService.ts`)
- [ ] Types créés (`team.types.ts`)
- [ ] TeamPage créée
- [ ] Route ajoutée
- [ ] Tests passés
- [ ] Design Aurora respecté
- [ ] Code commit

---

**GO ! Commence par explorer le backend srv-user 🚀**
