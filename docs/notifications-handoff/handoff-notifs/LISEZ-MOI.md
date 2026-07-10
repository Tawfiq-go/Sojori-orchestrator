# Sojori — Centre de notifications · Pack de passation (handoff)

Ce dossier accompagne l'implémentation du **centre de notifications dashboard**
(Owner / PM) dans le repo `Sojori-orchestrator`.

Il contient :

```
handoff-notifs/
├── LISEZ-MOI.md                 ← ce fichier
├── PROMPT-CURSOR.md             ← 📋 à coller dans Cursor / Claude Code (le plus important)
├── MAPPING-REACT.md             ← correspondance prototype → composants React/MUI
└── prototype/
    ├── Sojori Notifications.html ← ouvrir dans un navigateur (double-clic)
    └── notifs/
        ├── data.js              ← miroir du contrat API réel
        └── app.js               ← toute la logique (bell, panel, prefs, socket, toast)
```

---

## À quoi sert ce prototype

Le fichier HTML est une **maquette interactive haute-fidélité** de l'UX cible.
Il n'est **pas** le code de production — c'est la **référence visuelle et comportementale**
que Cursor doit reproduire en React + MUI + React Query, branchée sur l'API réelle.

Tout y est fonctionnel (sans backend) :

- 🔔 Cloche persistante en TopBar, badge = `actionRequired`
- 📋 Panneau : onglets **Action requise / Tout**, chips facettes + compteurs, lignes
- 🖱 Clic ligne → marque lu + deep link vers la route
- ✅ Terminer / Ignorer / Tout marquer lu
- ⚡ Socket `NEW_NOTIFICATION` simulé (boutons de démo) → badge +1, ring, prepend
- 🍞 Toast sur `critical` / `high`
- ⚙️ Préférences événement × canal (critiques verrouillées)

## Comment l'essayer

1. Ouvrir `prototype/Sojori Notifications.html` dans Chrome.
2. Cliquer **⚡ Simuler une notification (socket)** → le badge s'incrémente, la cloche sonne.
3. Ouvrir la cloche → onglets, chips, cliquer une ligne → deep link.
4. Aller dans **Préférences notifs** (sidebar) → grille événement × canal.

## Prochaine étape

👉 Ouvre **PROMPT-CURSOR.md**, copie tout, colle-le dans Cursor avec ce dossier
et le repo ouvert. Le prompt référence les fichiers réels du repo et le contrat API.

*Sojori · juillet 2026*
