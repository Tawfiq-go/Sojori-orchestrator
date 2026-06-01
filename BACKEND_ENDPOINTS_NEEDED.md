# Endpoints Backend à implémenter pour Copy Admin Config

## 📍 Service concerné : `srv-fulltask`

Tous les endpoints doivent être ajoutés dans le service `srv-fulltask` sous le routeur `/api/v1/admin/fulltask`.

---

## 🔴 Endpoints nécessaires

### 1. Copier Task Config vers un Owner

```
POST /api/v1/admin/fulltask/config/task-config/copy
```

**Body:**
```json
{
  "sourceOwnerId": "67f5416ff145a6002e46c2f3",
  "targetOwnerId": "5f8d0d55b54764065c3d1e7a"
}
```

**Logique:**
1. Charger toutes les `TaskTypeConfig` où `ownerId = sourceOwnerId`
2. Supprimer toutes les `TaskTypeConfig` où `ownerId = targetOwnerId`
3. Pour chaque config du source, créer une nouvelle avec `ownerId = targetOwnerId`

**Response:**
```json
{
  "success": true,
  "copiedConfigs": 12
}
```

---

### 2. Copier Task Config vers TOUS les Owners

```
POST /api/v1/admin/fulltask/config/task-config/copy-to-all
```

**Body:**
```json
{
  "sourceOwnerId": "67f5416ff145a6002e46c2f3"
}
```

**Logique:**
1. Charger tous les users où `role = 'Owner'` ET `_id != sourceOwnerId`
2. Pour chaque Owner, appeler la logique de l'endpoint #1

**Response:**
```json
{
  "success": true,
  "appliedToOwners": 25,
  "copiedConfigsPerOwner": 12
}
```

---

### 3. Copier Orchestration Config vers un Owner

```
POST /api/v1/admin/fulltask/orchestration/copy
```

**Body:**
```json
{
  "sourceOwnerId": "67f5416ff145a6002e46c2f3",
  "targetOwnerId": "5f8d0d55b54764065c3d1e7a"
}
```

**Logique:**
1. Charger le document `OrchestrationConfig` où `ownerId = sourceOwnerId`
2. Supprimer le document `OrchestrationConfig` où `ownerId = targetOwnerId`
3. Créer un nouveau document avec le contenu du source, mais `ownerId = targetOwnerId`
4. Copier :
   - `workflows[]`
   - `messageCatalog[]`
   - `scheduledMessages[]`
   - `listOrder[]`

**Response:**
```json
{
  "success": true,
  "workflows": 12,
  "messageCatalog": 15,
  "scheduledMessages": 8
}
```

---

### 4. Copier Orchestration Config vers TOUS les Owners

```
POST /api/v1/admin/fulltask/orchestration/copy-to-all
```

**Body:**
```json
{
  "sourceOwnerId": "67f5416ff145a6002e46c2f3"
}
```

**Logique:**
1. Charger tous les users où `role = 'Owner'` ET `_id != sourceOwnerId`
2. Pour chaque Owner, appeler la logique de l'endpoint #3

**Response:**
```json
{
  "success": true,
  "appliedToOwners": 25,
  "workflows": 12,
  "messageCatalog": 15,
  "scheduledMessages": 8
}
```

---

## 🔐 Sécurité

**Tous ces endpoints doivent :**
1. ✅ Vérifier que l'utilisateur est **Admin** ou **SuperAdmin**
2. ✅ Utiliser le middleware `authenticateJWT` et `roleAllow([Roles.SuperAdmin, Roles.Admin])`
3. ❌ **Ne PAS permettre aux Owners** d'appeler ces endpoints (risque de vol de config)

**Exemple middleware:**
```typescript
router.post(
  '/config/task-config/copy',
  authenticateJWT,
  roleAllow([Roles.SuperAdmin, Roles.Admin]),
  copyTaskConfigHandler
);
```

---

## 📦 Modèles MongoDB concernés

### TaskTypeConfig
```typescript
{
  _id: ObjectId,
  ownerId: string,  // ID du Owner (ou ORCHESTRATION_ADMIN_OWNER_ID pour admin)
  type: string,     // 'CLEANING_BEFORE_ARRIVAL', 'TRANSPORT', etc.
  requiresClientAction: boolean,
  orchestration: {
    createTaskBefore: { value: number, unit: string },
    assignmentStrategy: string,
    // ...
  }
}
```

### OrchestrationConfig
```typescript
{
  _id: ObjectId,
  ownerId: string,  // ID du Owner (ou ORCHESTRATION_ADMIN_OWNER_ID pour admin)
  workflows: [
    {
      _id: string,
      taskType: string,
      enabled: boolean,
      staffReminders: [...],
      // ...
    }
  ],
  messageCatalog: [
    {
      _id: string,
      name: string,
      content: {...},
      // ...
    }
  ],
  scheduledMessages: [
    {
      _id: string,
      messageId: string,
      timing: {...},
      // ...
    }
  ],
  listOrder: string[]
}
```

---

## ✅ Testing

**Scénario de test :**

1. **Créer config Admin** (ownerId = `67f5416ff145a6002e46c2f3`)
   - Ajouter 3 TaskTypeConfig
   - Ajouter 1 OrchestrationConfig avec 5 workflows

2. **Créer 2 Owners de test**
   - Owner A (ownerId = `test-owner-a`)
   - Owner B (ownerId = `test-owner-b`)

3. **Test Copy to One Owner**
   ```bash
   POST /api/v1/admin/fulltask/config/task-config/copy
   { "sourceOwnerId": "67f5416ff145a6002e46c2f3", "targetOwnerId": "test-owner-a" }
   ```
   ✅ Owner A doit avoir 3 TaskTypeConfig

4. **Test Copy to All Owners**
   ```bash
   POST /api/v1/admin/fulltask/orchestration/copy-to-all
   { "sourceOwnerId": "67f5416ff145a6002e46c2f3" }
   ```
   ✅ Owner A et Owner B doivent avoir l'OrchestrationConfig avec 5 workflows

5. **Test sécurité**
   - Appeler avec un token Owner → doit retourner `403 Forbidden`
   - Appeler sans token → doit retourner `401 Unauthorized`

---

## 📝 Priorité d'implémentation

1. ✅ **Endpoint #1** : Copy Task Config to One Owner (le plus simple)
2. ✅ **Endpoint #3** : Copy Orchestration Config to One Owner
3. ✅ **Endpoint #2** : Copy Task Config to All Owners (boucle sur #1)
4. ✅ **Endpoint #4** : Copy Orchestration Config to All Owners (boucle sur #3)

---

## 🚀 Prêt à implémenter ?

Le frontend est **100% prêt** et attend ces endpoints. Une fois implémentés, le flow sera :

1. Admin ouvre `/tasks/config` → Voit "Config Admin globale"
2. Admin modifie la config
3. Admin clique "Appliquer aux Owners"
4. Dialog : Choisir "Owner sélectionné" ou "Tous les Owners"
5. Appel API → Backend copie la config
6. ✅ Tous les Owners ont la même config !
