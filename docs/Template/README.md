# Documentation Template System - Sojori Orchestrator

## Vue d'ensemble

Le système de **Templates** permet de diffuser des configurations par défaut à tous les listings depuis l'interface admin. C'est un système centralisé de gestion de la configuration d'orchestration.

## Objectif

Permettre à un administrateur de définir des configurations "template" qui seront automatiquement appliquées à tous les nouveaux listings, avec possibilité de synchronisation pour les listings existants.

## Accès

📍 **Interface Admin** : `/admin/settings?tab=template`

## Onglets actuels

Le système de templates comprend actuellement les onglets suivants :

| Onglet | Statut | Description |
|--------|--------|-------------|
| ~~Gestion des modèles d'email~~ | ❌ **SUPPRIMÉ** | Ancien système de gestion des templates d'emails (supprimé le 2026-05-20) |
| **Rules & Info** | ✅ Actif | Règles de la maison et informations utiles |
| **Menu WhatsApp** | ✅ Actif | Configuration du menu chatbot WhatsApp |
| **Conciergerie** | ✅ Actif | Services de conciergerie (Transport, Courses, Personnalisé) |
| **Support** | ✅ Actif | Catégories de support technique |
| **Orchestrator** | ✅ Actif | Configuration des tâches d'orchestration |
| **Ménage** | 🔨 **À AJOUTER** | Configuration du système de ménage (nouveau) |

## Structure des documents

- **[ARCHITECTURE_ACTUELLE.md](./ARCHITECTURE_ACTUELLE.md)** - Architecture technique existante
- **[NOUVELLES_FEATURES.md](./NOUVELLES_FEATURES.md)** - Spécifications des nouvelles fonctionnalités
- **[PLAN_IMPLEMENTATION.md](./PLAN_IMPLEMENTATION.md)** - Plan d'implémentation détaillé
- **[SCHEMAS.md](./SCHEMAS.md)** - Schémas de données MongoDB

## Lien avec les listings

Chaque listing peut :
1. **Hériter** de la configuration template (par défaut)
2. **Synchroniser** avec la configuration template (bouton "Synchroniser avec admin")
3. **Personnaliser** sa propre configuration (override local)

La configuration se trouve dans l'onglet **"Config orchestration"** de chaque listing :
```
/listings/{listingId} → Onglet "Config orchestration"
```

## Roadmap

### ✅ Terminé
- Suppression de l'onglet "Gestion des modèles d'email"
- Documentation de l'architecture existante

### 🔨 En cours
- Ajout de la configuration Ménage dans les templates
- Simplification du système Support (Niveau 1/2/3)
- Simplification de la Conciergerie Personnalisée

### 📋 À venir
- Migration des données existantes
- Tests de synchronisation
- Documentation utilisateur

## Contacts & Références

- **Backend API** : `srv-admin` (gestion templates) + `srv-listing` (application aux listings)
- **Base de données** : MongoDB Atlas (`srv-admin-db`, `srv-listing-db`)
- **Code source** : `/Users/gouacht/Sojori-orchestrator/src/features/setting/components/`

---

Dernière mise à jour : 2026-05-20
