# 🤖 PROMPT AGENT-ORCHESTRATION

**Nom de l'agent** : `Agent-Orchestration`
**Mission** : Créer la page Orchestration (workflow automation)
**Durée estimée** : 2-3h

---

## 🎯 TA MISSION

Tu es **Agent-Orchestration**, spécialisé dans l'intégration de l'API workflow automation.

**Objectif** : Créer une page complète Orchestration qui permet de :
- Lister tous les workflows automatisés
- Créer/Modifier/Supprimer des workflows
- Exécuter des workflows manuellement
- Voir l'historique des exécutions

---

## 📋 CONTEXTE

**Backend** :
- Service : `srv-orchestrator` (port 4008)
- Path backend : `/Users/gouacht/sojori-production/apps/srv-orchestrator`
- URL local : `http://localhost:4008`

**Frontend** :
- Path : `/Users/gouacht/Sojori-orchestrator`
- Design : Aurora Soft Light (#e6b022 gold, #8b5cf6 purple)
- Stack : Vite 8 + React 18 + TypeScript + MUI v9

**Référence** : AUCUNE (créer from scratch)

---

## 🔒 ÉTAPE 0 : SÉCURITÉ OBLIGATOIRE

**Avant toute modification de route, d'API ou de service backend, lire en entier :**

`/Users/gouacht/sojori-production/SECURITY_RULES.md`

Règles non négociables à appliquer :
- ne jamais ajouter de route publique sauf webhook externe explicitement requis
- considérer les routes `srv-admin` comme protégées par défaut par middleware global
- ajouter une restriction explicite `roleAllow([Roles.SuperAdmin, Roles.Admin])` pour les routes admin-only sensibles
- toujours valider les inputs côté serveur
- ne jamais hardcoder de secret

---

## 🔍 ÉTAPE 1 : EXPLORER LE BACKEND

### 1.1 Identifier les routes API

```bash
# Lire les routes backend
cat /Users/gouacht/sojori-production/apps/srv-orchestrator/src/routes/*.ts
```

### 1.2 Routes attendues

Tu dois trouver et documenter :
- `GET /api/v1/workflows` - Liste workflows
- `GET /api/v1/workflows/:id` - Détail workflow
- `POST /api/v1/workflows` - Créer workflow
- `PUT /api/v1/workflows/:id` - Modifier workflow
- `DELETE /api/v1/workflows/:id` - Supprimer workflow
- `POST /api/v1/workflows/:id/execute` - Exécuter workflow
- `GET /api/v1/executions` - Historique exécutions

### 1.3 Format des données

Documente les types de réponse (exemple) :
```typescript
interface Workflow {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  steps: WorkflowStep[];
  lastExecution?: {
    date: string;
    status: 'success' | 'error';
    duration: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔧 ÉTAPE 2 : CRÉER LE SERVICE API

### 2.1 Créer le fichier service

**Fichier** : `src/services/orchestrationService.ts`

```typescript
import axios from 'axios';
import type { Workflow, WorkflowInput, WorkflowExecution } from '../types/orchestration.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4008';

export const orchestrationService = {
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const response = await axios.get(`${API_URL}/api/v1/workflows`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await axios.get(`${API_URL}/api/v1/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(data: WorkflowInput): Promise<Workflow> {
    const response = await axios.post(`${API_URL}/api/v1/workflows`, data);
    return response.data;
  },

  async updateWorkflow(id: string, data: Partial<WorkflowInput>): Promise<Workflow> {
    const response = await axios.put(`${API_URL}/api/v1/workflows/${id}`, data);
    return response.data;
  },

  async deleteWorkflow(id: string): Promise<void> {
    await axios.delete(`${API_URL}/api/v1/workflows/${id}`);
  },

  async executeWorkflow(id: string): Promise<WorkflowExecution> {
    const response = await axios.post(`${API_URL}/api/v1/workflows/${id}/execute`);
    return response.data;
  },

  async getExecutions(): Promise<WorkflowExecution[]> {
    const response = await axios.get(`${API_URL}/api/v1/executions`);
    return response.data;
  },
};
```

---

## 📝 ÉTAPE 3 : CRÉER LES TYPES TYPESCRIPT

### 3.1 Créer le fichier types

**Fichier** : `src/types/orchestration.types.ts`

```typescript
export interface Workflow {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  steps: WorkflowStep[];
  lastExecution?: {
    date: string;
    status: 'success' | 'error';
    duration: number;
    logs?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  type: 'action' | 'condition' | 'delay' | 'notification';
  name: string;
  config: Record<string, any>;
  order: number;
}

export interface WorkflowInput {
  name: string;
  description: string;
  status?: 'active' | 'inactive';
  steps: WorkflowStep[];
}

export interface WorkflowExecution {
  _id: string;
  workflowId: string;
  workflowName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  stepId?: string;
}
```

**IMPORTANT** : Adapter ces types selon ce que tu trouves dans le backend !

---

## 🎨 ÉTAPE 4 : CRÉER LA PAGE REACT

### 4.1 Structure de la page

**Fichier** : `src/pages/OrchestrationPage.tsx`

**Sections à créer** :
1. Header avec bouton "Nouveau workflow"
2. Stats rapides (total workflows, actifs, dernière exécution)
3. Liste workflows avec actions
4. Modal création/édition workflow
5. Historique exécutions (optionnel)

### 4.2 Code de base

```typescript
import React, { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, Panel, Badge, btnPrimarySx, btnGhostSx, tokens as t } from '../components/dashboard/DashboardV2.components';
import { orchestrationService } from '../services/orchestrationService';
import type { Workflow, WorkflowInput } from '../types/orchestration.types';

export function OrchestrationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await orchestrationService.getWorkflows();
      setWorkflows(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des workflows');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await orchestrationService.executeWorkflow(id);
      alert('Workflow exécuté avec succès');
      loadWorkflows(); // Reload pour voir lastExecution
    } catch (err) {
      alert('Erreur lors de l\'exécution');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce workflow ?')) return;
    try {
      await orchestrationService.deleteWorkflow(id);
      loadWorkflows();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleOpenModal = (workflow?: Workflow) => {
    setEditingWorkflow(workflow || null);
    setModalOpen(true);
  };

  const handleSave = async (data: WorkflowInput) => {
    try {
      if (editingWorkflow) {
        await orchestrationService.updateWorkflow(editingWorkflow._id, data);
      } else {
        await orchestrationService.createWorkflow(data);
      }
      setModalOpen(false);
      loadWorkflows();
    } catch (err) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Stats
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === 'active').length,
    lastExecution: workflows
      .filter(w => w.lastExecution)
      .sort((a, b) => new Date(b.lastExecution!.date).getTime() - new Date(a.lastExecution!.date).getTime())[0]
      ?.lastExecution,
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration']}>
      <PageHeader
        title="Orchestration"
        desc="Automatisez vos workflows et processus"
        actions={
          <Button sx={btnPrimarySx} onClick={() => handleOpenModal()}>
            ➕ Nouveau workflow
          </Button>
        }
      />

      {/* Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Panel title="Total workflows" desc={String(stats.total)} sx={{ flex: 1 }} />
        <Panel title="Actifs" desc={String(stats.active)} sx={{ flex: 1 }} />
        <Panel
          title="Dernière exécution"
          desc={stats.lastExecution ? new Date(stats.lastExecution.date).toLocaleString() : 'Aucune'}
          sx={{ flex: 1 }}
        />
      </Stack>

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

      {/* Workflows list */}
      {!loading && !error && (
        <Panel title="Workflows" desc={`${workflows.length} workflows configurés`}>
          {workflows.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: t.text3 }}>
              Aucun workflow configuré. Créez-en un pour commencer.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {workflows.map(w => (
                <Box
                  key={w._id}
                  sx={{
                    p: 2,
                    border: `1px solid ${t.border}`,
                    borderRadius: '12px',
                    transition: 'all 0.15s',
                    '&:hover': {
                      boxShadow: `0 0 0 1px ${t.primary}`,
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography sx={{ fontWeight: 700, flex: 1, fontSize: 14 }}>
                      {w.name}
                    </Typography>
                    <Badge
                      variant={
                        w.status === 'active' ? 'success' :
                        w.status === 'error' ? 'error' : 'default'
                      }
                    >
                      {w.status}
                    </Badge>
                    <Button size="small" sx={btnGhostSx} onClick={() => handleExecute(w._id)}>
                      ▶️ Exécuter
                    </Button>
                    <Button size="small" sx={btnGhostSx} onClick={() => handleOpenModal(w)}>
                      ✏️ Modifier
                    </Button>
                    <Button size="small" sx={{ ...btnGhostSx, color: t.error }} onClick={() => handleDelete(w._id)}>
                      🗑️
                    </Button>
                  </Stack>

                  <Typography sx={{ fontSize: 13, color: t.text3, mt: 0.5 }}>
                    {w.description}
                  </Typography>

                  <Typography sx={{ fontSize: 11, color: t.text3, mt: 1, fontFamily: 'Geist Mono' }}>
                    {w.steps.length} étapes
                  </Typography>

                  {w.lastExecution && (
                    <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${t.border}` }}>
                      <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono' }}>
                        Dernière exécution : {new Date(w.lastExecution.date).toLocaleString()}
                      </Typography>
                      <Badge
                        variant={w.lastExecution.status === 'success' ? 'success' : 'error'}
                        size="small"
                      >
                        {w.lastExecution.status}
                      </Badge>
                      <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono' }}>
                        {w.lastExecution.duration}ms
                      </Typography>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Panel>
      )}

      {/* Modal création/édition - À IMPLÉMENTER */}
      <WorkflowModal
        open={modalOpen}
        workflow={editingWorkflow}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </DashboardWrapper>
  );
}

// Modal workflow (formulaire simplifié)
function WorkflowModal({
  open,
  workflow,
  onClose,
  onSave,
}: {
  open: boolean;
  workflow: Workflow | null;
  onClose: () => void;
  onSave: (data: WorkflowInput) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description);
      setStatus(workflow.status === 'error' ? 'inactive' : workflow.status);
    } else {
      setName('');
      setDescription('');
      setStatus('active');
    }
  }, [workflow, open]);

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Le nom est requis');
      return;
    }

    onSave({
      name,
      description,
      status,
      steps: workflow?.steps || [], // Simplification : garder les steps existants
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {workflow ? 'Modifier le workflow' : 'Nouveau workflow'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Nom du workflow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            fullWidth
          >
            <MenuItem value="active">Actif</MenuItem>
            <MenuItem value="inactive">Inactif</MenuItem>
          </Select>

          <Typography sx={{ fontSize: 12, color: t.text3, fontStyle: 'italic' }}>
            Note : L'édition des étapes sera implémentée dans une version future
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={btnGhostSx}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} sx={btnPrimarySx}>
          {workflow ? 'Mettre à jour' : 'Créer'}
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
<Route path="/orchestration" element={<div>Orchestration</div>} />
```

Par :
```tsx
<Route path="/orchestration" element={<OrchestrationPage />} />
```

Et ajouter l'import :
```tsx
import { OrchestrationPage } from './pages/OrchestrationPage';
```

---

## ✅ ÉTAPE 6 : TESTER

### 6.1 Démarrer le backend

```bash
cd /Users/gouacht/sojori-production
docker-compose -f docker-compose-v2.yml up -d srv-orchestrator
```

### 6.2 Vérifier que le backend répond

```bash
curl http://localhost:4008/health
curl http://localhost:4008/api/v1/workflows
```

### 6.3 Tester le frontend

```bash
cd /Users/gouacht/Sojori-orchestrator
pnpm dev --port 4174

# Ouvrir http://localhost:4174/orchestration
```

### 6.4 Checklist tests

- [ ] Page charge sans erreur
- [ ] Loading state s'affiche
- [ ] Workflows s'affichent (ou message "Aucun workflow")
- [ ] Bouton "Nouveau workflow" ouvre le modal
- [ ] Formulaire création fonctionne
- [ ] Bouton "Exécuter" fonctionne
- [ ] Bouton "Modifier" ouvre le modal avec données pré-remplies
- [ ] Bouton "Supprimer" fonctionne (avec confirmation)
- [ ] Design Aurora Soft Light respecté

---

## 🎯 RÉSULTAT ATTENDU

**Après ton travail** :
- ✅ Page `/orchestration` fonctionnelle
- ✅ Liste workflows depuis API
- ✅ Création/Modification/Suppression workflows
- ✅ Exécution workflows
- ✅ Stats affichées
- ✅ Design Aurora Soft Light
- ✅ Loading + Error states
- ✅ Tous les tests passent

---

## 🚨 RÈGLES CRITIQUES

1. **Design** :
   - ✅ TOUJOURS utiliser tokens Aurora Soft Light (`t.primary`, `t.text`, etc.)
   - ✅ TOUJOURS utiliser composants DashboardV2 (Panel, Badge, btnPrimarySx, etc.)
   - ❌ NE JAMAIS créer de nouveaux styles custom

2. **API** :
   - ✅ TOUJOURS gérer loading state
   - ✅ TOUJOURS gérer error state
   - ✅ TOUJOURS utiliser try/catch
   - ✅ TOUJOURS consulter le backend avant de coder

3. **TypeScript** :
   - ✅ TOUJOURS typer toutes les variables
   - ❌ NE JAMAIS utiliser `any`

---

## 📝 CHECKLIST FINALE

- [ ] Backend exploré (routes identifiées)
- [ ] Service créé (`orchestrationService.ts`)
- [ ] Types créés (`orchestration.types.ts`)
- [ ] Page créée (`OrchestrationPage.tsx`)
- [ ] Route ajoutée dans App.tsx
- [ ] Tests passés (backend + frontend)
- [ ] Design Aurora Soft Light respecté
- [ ] Code commit + push

---

**GO ! Commence par explorer le backend 🚀**
