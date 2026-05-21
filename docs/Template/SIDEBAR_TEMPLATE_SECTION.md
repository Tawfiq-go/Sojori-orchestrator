# 📋 Section "Paramètres" de la Sidebar - Pour Claude Desktop

## Localisation

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/components/dashboard/DashboardV2.components.jsx`

**Ligne** : ~271-275

---

## Configuration actuelle

```javascript
{ group: 'Paramètres', items: [
  { id: 'admin/settings/template', label: 'Templates', icon: '📧' },
  { id: 'admin/settings/host-profile', label: 'Profil hôte', icon: '🏠' },
  { id: 'admin/settings/admin-config', label: 'Pays & Villes', icon: '🌍' },
  { id: 'admin/setting/currency', label: 'Devises', icon: '💱' },
]}
```

---

## Mapping des icônes (Material-UI)

**Ligne** : ~330-333

```javascript
'admin/settings/template': DescriptionOutlined,
'admin/settings/host-profile': BusinessOutlined,
'admin/settings/admin-config': PublicOutlined,
'admin/setting/currency': ShowChartOutlined,
```

---

## Routing

### Mapping des routes

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/components/DashboardWrapper.tsx`

**Ligne** : ~104-107

```javascript
// Paramètres
'admin/settings/host-profile': '/admin/settings?tab=host-profile',
'admin/settings/admin-config': '/admin/settings?tab=admin-config',
'admin/setting/currency': '/admin/setting/currency',
```

**Note** : ❌ La ligne `'admin/settings/template': '/admin/settings?tab=template'` a été **supprimée** car l'onglet interne "Mail Template Management" n'existe plus.

### Breadcrumb mapping

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/components/DashboardWrapper.tsx`

**Ligne** : ~140-147

```javascript
if (path.startsWith('/admin/settings') || path.startsWith('/admin/Settings')) {
  const tab = new URLSearchParams(location.search).get('tab') || 'host-profile';
  const map: Record<string, string> = {
    'host-profile': 'admin/settings/host-profile',
    'admin-config': 'admin/settings/admin-config',
  };
  return map[tab] || 'admin/settings/host-profile';
}
```

**Note** : Le mapping `template: 'admin/settings/template'` a été **supprimé**.

---

## Structure de la page Settings

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/SettingsHubPage.tsx`

### Onglets disponibles

**Ligne** : ~16-21

```typescript
const HUB_SECTIONS: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: 'template', label: 'Templates', icon: '📧' },
  { id: 'host-profile', label: 'Profil hôte', icon: '🏠' },
  { id: 'admin-config', label: 'Pays & Villes', icon: '🌍' },
  { id: 'currency', label: 'Devises', icon: '💱' },
];
```

### Contenu de l'onglet Template

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/pages/SettingsHubPage.tsx`

**Ligne** : ~108

```typescript
{section === 'template' && <TemplateTab />}
```

**Composant TemplateTab** : `/Users/gouacht/Sojori-orchestrator/src/components/settings/TemplateTab.tsx`

```typescript
import MailTemplates from '../../features/setting/components/MailTemplates';

export function TemplateTab() {
  return <MailTemplates />;
}
```

---

## Sous-onglets dans Template

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/features/setting/components/MailTemplates.jsx`

**État actuel** (après suppression de l'onglet "message") :

```javascript
const [activeTab, setActiveTab] = useState('rules'); // Par défaut: rules
```

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/features/setting/components/MailTemplateButtons.jsx`

**Ligne** : ~39-79

```javascript
const buttons = [
  // ❌ SUPPRIMÉ: { tab: 'message', label: t('message'), icon: <EmailIcon /> }

  ...(SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB
    ? [{ tab: 'description', label: t('description'), icon: <DescriptionIcon /> }]
    : []),

  { tab: 'rules', label: t('rules_and_infos'), icon: <RuleIcon /> },
  { tab: 'chatbot', label: t('menu_whatsapp'), icon: <ChatIcon /> },
  { tab: 'concierge', label: t('concierge_services'), icon: <RoomServiceIcon /> },
  { tab: 'support', label: t('support_categories'), icon: <SupportAgentIcon /> },
  { tab: 'tasks', label: 'Orchestrator', icon: <AssignmentIcon /> },
];
```

---

## Composants des sous-onglets

| Sous-onglet | Composant | Fichier |
|-------------|-----------|---------|
| ~~message~~ | ❌ SUPPRIMÉ | N/A |
| description | `<Description />` | `/features/setting/components/Description.jsx` |
| **rules** | `<RulesAndInfos />` | `/features/setting/components/RulesAndInfos.jsx` |
| **chatbot** | `<ChatbotMenuTemplate />` | `/features/setting/components/ChatbotMenuTemplate.jsx` |
| **concierge** | `<ConciergeServicesTemplate />` | `/features/setting/components/ConciergeServicesTemplate.jsx` |
| **support** | `<SupportCategoriesTemplate />` | `/features/setting/components/SupportCategoriesTemplate.jsx` |
| **tasks** | `<TaskTemplateConfig />` | `/features/setting/components/TaskTemplateConfig.jsx` |

---

## 🆕 Nouveau sous-onglet à ajouter : Ménage

### Étape 1 : Créer le composant

**Fichier à créer** : `/Users/gouacht/Sojori-orchestrator/src/features/setting/components/CleaningTemplateConfig.jsx`

**Inspiration** : Suivre la structure de `SupportCategoriesTemplate.jsx` et `ConciergeServicesTemplate.jsx`

### Étape 2 : Ajouter le bouton dans MailTemplateButtons.jsx

```javascript
const buttons = [
  // ... autres boutons

  {
    tab: 'cleaning',
    label: t('cleaning_config', { defaultValue: 'Ménage' }),
    icon: <CleaningServicesIcon sx={{ fontSize: '1rem', mr: 1 }} />
  },

  // ... suite
];
```

**Import à ajouter** :
```javascript
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
```

### Étape 3 : Ajouter le case dans MailTemplates.jsx

```javascript
switch (activeTab) {
  // ... autres cases

  case 'cleaning':
    return (
      <CleaningTemplateConfig
        key={`cleaning-${settingsTargetOwnerId}-${settingsRefetchNonce}`}
        isAdmin={isAdmin}
        ownerId={isAdmin ? settingsTargetOwnerId : undefined}
        blockLoad={settingsNeedOwnerPick}
        t={t}
      />
    );

  // ... suite
}
```

**Import à ajouter** :
```javascript
import CleaningTemplateConfig from './CleaningTemplateConfig';
```

---

## API Backend nécessaire

### srv-admin

**Routes à créer** :

```
GET    /api/v1/admin/cleaning-template/:ownerId?
PUT    /api/v1/admin/cleaning-template/:ownerId?
POST   /api/v1/admin/cleaning-template/reset/:ownerId?
```

**Fichiers à créer** :

```
/apps/srv-admin/src/routes/adminConfig/
├── getCleaningTemplate.ts
├── updateCleaningTemplate.ts
└── resetCleaningTemplate.ts
```

**Modèle MongoDB** :

```
/apps/srv-admin/src/db/models/CleaningTemplate.ts
```

---

## Services API Frontend

**Fichier** : `/Users/gouacht/Sojori-orchestrator/src/features/setting/services/serverApi.adminConfig.js`

**Fonctions à ajouter** :

```javascript
export const getOwnerCleaningTemplate = async (token, ownerId) => {
  const params = ownerId ? `?ownerId=${ownerId}` : '';
  const response = await axios.get(
    `${ADMIN_API_URL}/api/v1/admin/cleaning-template${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const updateOwnerCleaningTemplate = async (token, data, ownerId) => {
  const params = ownerId ? `?ownerId=${ownerId}` : '';
  const response = await axios.put(
    `${ADMIN_API_URL}/api/v1/admin/cleaning-template${params}`,
    data,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const resetOwnerCleaningTemplate = async (token, ownerId) => {
  const params = ownerId ? `?ownerId=${ownerId}` : '';
  const response = await axios.post(
    `${ADMIN_API_URL}/api/v1/admin/cleaning-template/reset${params}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
```

---

## Checklist pour Claude Desktop

### ✅ Fait (par Claude Code)
- [x] Documentation complète de la section Paramètres
- [x] Identification des fichiers clés
- [x] Structure des composants existants

### 🔨 À faire (par Claude Desktop)

**1. Lecture préalable**
- [ ] Lire `docs/Template/README.md`
- [ ] Lire `docs/Template/NOUVELLES_FEATURES.md`
- [ ] Lire `docs/Template/DEBRIEF_CLAUDE_DESKTOP.md`
- [ ] Lire ce document (SIDEBAR_TEMPLATE_SECTION.md)

**2. Backend (srv-admin)**
- [ ] Créer le schéma MongoDB `CleaningTemplate`
- [ ] Créer les routes API (GET/PUT/POST)
- [ ] Implémenter la logique CRUD
- [ ] Tester avec Postman/Insomnia

**3. Frontend (Sojori-orchestrator)**
- [ ] Créer `CleaningTemplateConfig.jsx`
- [ ] Ajouter le bouton dans `MailTemplateButtons.jsx`
- [ ] Ajouter le case dans `MailTemplates.jsx`
- [ ] Ajouter les services API dans `serverApi.adminConfig.js`
- [ ] Tester l'interface

**4. Synchronisation listing**
- [ ] Endpoint dans srv-listing pour synchronisation
- [ ] Bouton "Synchroniser" dans le listing

---

## Références rapides

| Élément | Chemin complet |
|---------|----------------|
| Sidebar config | `/Users/gouacht/Sojori-orchestrator/src/components/dashboard/DashboardV2.components.jsx` |
| Settings page | `/Users/gouacht/Sojori-orchestrator/src/pages/SettingsHubPage.tsx` |
| MailTemplates | `/Users/gouacht/Sojori-orchestrator/src/features/setting/components/MailTemplates.jsx` |
| Buttons | `/Users/gouacht/Sojori-orchestrator/src/features/setting/components/MailTemplateButtons.jsx` |
| API services | `/Users/gouacht/Sojori-orchestrator/src/features/setting/services/serverApi.adminConfig.js` |
| Backend admin | `/Users/gouacht/sojori-production/apps/srv-admin/` |

---

**Document créé le** : 2026-05-20
**Pour** : Claude Desktop
**Par** : Claude Code

---

🚀 **Prêt pour l'implémentation !**
