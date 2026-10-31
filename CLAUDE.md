# CLAUDE.md — Carbu

Contexte pour toute session Claude qui travaille sur ce dépôt. À lire avant de modifier quoi que ce soit.

## Le projet

**Carbu** est une PWA (application web installable) de suivi des pleins de carburant, pensée pour iPhone et en français. On y trouve la saisie des pleins, la consommation, les dépenses, une carte des stations, la rentabilité d'une conversion E85, plusieurs véhicules, l'export Excel, et la sauvegarde et la restauration des données.

- **En ligne :** https://sudopush.github.io/carbu/ (GitHub Pages, branche `main`, racine du dépôt)
- **Propriétaire :** Joey (`SudoPush`), qui parle français : réponds et écris en français.
- **Principe fort :** 100 % local. Aucune donnée utilisateur ne quitte le téléphone. Pas de compte, pas de serveur, pas de traceur.

## Historique (important)

L'interface a été conçue dans **Claude Design**, puis exportée. L'export a ensuite été transformé à la main en application réelle : sauvegarde des données, démarrage vide, saisie manuelle à la place d'un scan simulé, suppression, sauvegarde et restauration, PWA plein écran, dates dynamiques.

➡️ **Ce dépôt est désormais la seule référence.** Ne jamais réimporter un export Claude Design par-dessus : toutes les modifications ci-dessus seraient perdues.

## Arborescence

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : gabarit des écrans et logique (voir plus bas) |
| `support.js` | Moteur de rendu « dc-runtime » issu de Claude Design (ne pas modifier sans raison) |
| `react-bundle.js` | React 19 empaqueté (expose `window.React` et `window.ReactDOM`), servi localement pour le mode hors ligne |
| `sw.js` | Service worker : la page passe par le réseau d'abord ; les fichiers de l'app et Leaflet passent par le cache d'abord, avec mise à jour en arrière-plan |
| `manifest.webmanifest` | Nom, icônes et affichage `standalone` |
| `ds/styles.css` | Variables du thème (couleurs, typo) |
| `icons/` | Icône iOS (`apple-touch-icon.png`, 180 px) et icônes PWA (192, 512, maskable) |
| `docs/` | Images du README (bannière et captures). Elles ne sont pas utilisées par l'app |
| `.nojekyll` | Empêche GitHub Pages de passer le site par Jekyll |

## Comment `index.html` est construit

L'application suit le format « dc » de Claude Design, interprété par `support.js` :

1. **Le gabarit** est le HTML entre `<x-dc>` et le `<script type="text/x-dc">`.
   - `{{ valeur }}` affiche une valeur. Les attributs `onClick="{{ fn }}"`, `onChange="{{ fn }}"`, `ref="{{ fn }}"` et `value="{{ v }}"` sont branchés sur la logique.
   - `<sc-if value="{{ condition }}">…</sc-if>` affiche un bloc sous condition.
   - `<sc-for list="{{ liste }}" as="x">…</sc-for>` répète un bloc.
   - Les styles sont écrits en ligne (attribut `style`). `style-hover` et `style-active` gèrent les états au survol et au clic.
   - `<helmet>` contient ce qui doit aller dans le `<head>` : Leaflet, `ds/styles.css` et les variables CSS du thème.
2. **La logique** se trouve dans `<script type="text/x-dc" data-dc-script>` :
   - des constantes et utilitaires en tête (`F`, `E`, `FUELC`, `UNIT`, `ISO`, `TODAY`, `MSTART`, `DEFCONV`, `saveFile`, `shrinkImg`…) ;
   - `class Component extends DCLogic` : `state` (React), les méthodes `persist`, `syncMap`, `fetchPrices` et `e85`, puis **`renderVals()`** et `extra()`, qui renvoient l'objet de toutes les valeurs et fonctions utilisées par le gabarit.
   - Pour ajouter une donnée ou une action à l'écran, il faut l'ajouter à l'objet renvoyé par `renderVals()` ou `extra()`, puis l'utiliser dans le gabarit avec `{{ nom }}`.
   - Le code est très compact (plusieurs instructions par ligne). Le garder lisible quand on le touche, sans tout reformater d'un coup.
3. **Les écrans** : `home`, `history`, `stats`, `map` et `e85` (champ `state.screen`). Ils s'affichent dans des volets superposés : véhicules (`vehSheet`), ajout de véhicule (`addStep`), saisie d'un plein (`scan === 'review'`, puis `'done'`), export (`exp`) et confidentialité (`priv`). Le volet de don (`don`, `ap`) est masqué avec `display:none`, car le lien PayPal n'est pas configuré.

## Données (ne jamais casser)

Tout est enregistré dans `localStorage` :

- `carbu.data.v1` contient `{ v:1, vehs, tickets, vid, conv, simConso, simPrice, lastBackup }`, avec :
  - `vehs[]` : `{ id, name, plate, version, color, hex, photo (dataURL JPEG ≤ 900 px), options[], cg[] }`
  - `tickets[vehId][]` : `{ id, date 'AAAA-MM-JJ', station, city, x, y, fuel, liters, ppl, price, km, lat, lng }`. `lat` et `lng` sont des chaînes de caractères (`''` si pas de GPS).
  - `conv[vehId]` : réglages E85 `{ on, type, kit, pose, cg, date, surconso, ref }`
- `carbu.mapStyle` et `carbu.livePrices` (cache de 6 h des prix nationaux).
- Un fichier de sauvegarde (`carbu-sauvegarde-AAAA-MM-JJ.json`) reprend les mêmes champs, plus `app:'carbu'`.

**Règles :**

- Tout changement de structure doit garder les anciennes données lisibles : prévoir une migration dans `loadData()` et monter `v` si nécessaire.
- Les anciennes sauvegardes doivent toujours pouvoir être restaurées.
- Les données des utilisateurs ne vivent que sur leur téléphone. Une erreur à cet endroit, c'est une perte de données définitive.

## Services externes (lecture seule, sans données personnelles)

- Fonds de carte : OpenStreetMap, Esri et OpenTopoMap, via Leaflet 1.9.4 (unpkg).
- Prix moyens nationaux : `data.economie.gouv.fr` (jeu de données `prix-des-carburants-en-france-flux-instantane-v2`).
- Nom de la ville d'un plein : Nominatim (OpenStreetMap), à partir de la position GPS.

## Contraintes iPhone et PWA

- Tous les chemins doivent rester **relatifs**, car le site est servi sous `/carbu/`.
- Les champs de saisie doivent faire au moins 16 px de texte, sinon iOS zoome quand on touche le champ.
- Respecter les zones de sécurité (`env(safe-area-inset-*)`) pour le haut, la barre d'onglets et les volets.
- `apple-mobile-web-app-status-bar-style` vaut `default`, ce qui donne un texte sombre dans la barre d'état.
- Tester en 393 × 852 (iPhone 14/15/16 Pro) au minimum.

## Développer

```bash
# Serveur local (n'importe lequel) depuis la racine du dépôt
python -m http.server 8000
# puis ouvrir http://localhost:8000/
```

Il n'y a aucune étape de compilation : on modifie les fichiers et on recharge la page. Pour repartir de zéro, vider `localStorage` (Outils de développement > Application > Stockage).

## Publier une modification

1. **Augmenter `VERSION` dans `sw.js`** (par exemple `carbu-v1` devient `carbu-v2`) dès qu'un fichier de l'app change, sauf `index.html`. Sans ça, les iPhone gardent l'ancienne version en cache.
2. Faire un commit avec un message clair en français, puis un `git push` sur `main`.
3. GitHub Pages republie en 1 à 2 minutes (onglet Actions, « pages-build-deployment »).
4. Vérifier https://sudopush.github.io/carbu/ dans la console : aucune erreur.

## Pistes et limites connues

- Pas de lecture automatique des tickets (OCR) : la saisie est manuelle.
- Le volet de don est masqué. Pour le réactiver, il faut une vraie URL `donUrl` (PayPal ou Buy Me a Coffee) et retirer le `display:none` des boutons `openDon` et `privToDon`.
- Les champs « Version », « Couleur », « Options » et « Carte grise » d'un véhicule ne sont remplis que pour les données de démo : il n'existe pas encore de formulaire pour les modifier.
- Le nom du véhicule et les tickets ne sont pas modifiables après coup (seulement supprimables).
- Le fichier Excel est en réalité un tableau HTML enregistré en `.xls`.
- À terme : passer à un vrai projet React découpé en fichiers (Vite par exemple) si l'app grossit.

Les corrections et idées se suivent dans les **Issues GitHub** du dépôt.
