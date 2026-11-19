# Journal de trading XAUUSD

Application web personnelle pour tenir un journal de trading sur l'or (XAUUSD) : saisie des trades, captures d'écran, émotions, et un dashboard de statistiques en R.

- **Vite + React + TypeScript + Tailwind**, graphiques **Recharts**
- **Aucune base de données** : les trades sont dans `data/trades.json` et les captures dans `data/screenshots/`. L'application fait elle-même des commits dans votre repo via l'API GitHub.
- **Installable sur iPhone** (PWA), responsive Mac et mobile
- Interface entièrement en français, heures affichées en heure de Paris

![Dashboard](docs/captures/desktop-dashboard.jpg)

---

## 🔒 À lire d'abord : la confidentialité

| Élément | Visible par qui ? |
|---|---|
| Le **repo** (code, `data/trades.json`, captures) | Vous seule, s'il est **privé** |
| Le **site GitHub Pages** (l'application) | **Toute personne qui a l'URL**, même si le repo est privé (sauf GitHub Enterprise Cloud) |
| Le **token** | Uniquement le navigateur où vous l'avez saisi (localStorage) |

C'est pour ça que **le site publié ne contient aucune de vos données**. Il ne contient que l'application et 20 trades fictifs de démonstration. Vos vrais trades sont lus dans le repo privé, via l'API GitHub et avec votre token. Une personne qui tomberait sur l'URL verrait seulement la démo.

> ⚠️ **GitHub Pages sur un repo privé demande un abonnement payant** (GitHub Pro à environ 4 $/mois, Team ou Enterprise). Avec un compte gratuit, il existe deux options :
> - **Option A** : un repo **public** pour le code et un **second repo privé** pour les données. Dans Réglages, vous indiquez le repo privé : le token ne donne accès qu'à celui-là.
> - **Option B** : faire tourner l'application en local (`npm run dev`) sans Pages.

---

## 1. Créer le repo

1. Sur GitHub : **+** → **New repository**.
2. Nom : `journal-xauusd` (si vous en choisissez un autre, rien à modifier : le workflow s'adapte au nom du repo).
3. Visibilité : **Private**, puis **Create repository**.
4. Envoyez le projet depuis votre Mac :

```bash
cd journal-xauusd
```

```bash
git init -b main
```

```bash
git add . && git commit -m "Journal XAUUSD"
```

```bash
git remote add origin https://github.com/VOTRE-PSEUDO/journal-xauusd.git
```

```bash
git push -u origin main
```

## 2. Activer GitHub Pages

1. Dans le repo : **Settings** → **Pages**.
2. **Build and deployment** → **Source** : choisissez **GitHub Actions**.
3. Ouvrez l'onglet **Actions** : le workflow « Build & déploiement GitHub Pages » démarre. S'il a échoué avant l'activation de Pages, cliquez sur **Re-run all jobs**.
4. Au bout d'une à deux minutes, l'application est en ligne à l'adresse
   `https://VOTRE-PSEUDO.github.io/journal-xauusd/`

Le site se redéploie automatiquement à chaque push sur `main`, après le passage des tests. **Les commits de trades faits depuis l'application ne déclenchent pas de redéploiement** : le dossier `data/` est ignoré par le workflow.

## 3. Créer le token « fine-grained »

1. GitHub → photo de profil → **Settings** → **Developer settings** (tout en bas) → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name** : `Journal XAUUSD`.
3. **Expiration** : 90 jours ou 1 an (un rappel vous préviendra de le renouveler).
4. **Repository access** : **Only select repositories**, puis choisissez **uniquement** `journal-xauusd` (ou le repo de données de l'option A).
5. **Permissions** → **Repository permissions** → **Contents** : **Read and write**. Ne touchez à rien d'autre. *Metadata : Read-only* s'ajoute tout seul, c'est normal.
6. **Generate token**, puis copiez la valeur (`github_pat_…`). Elle ne sera plus jamais affichée.

Ce token ne peut que lire et écrire des fichiers dans ce seul repo. Il ne donne accès ni à vos autres repos, ni à votre compte.

## 4. Saisir le token dans l'application

1. Ouvrez l'application → **Réglages**.
2. Remplissez :
   - **Propriétaire** : votre pseudo GitHub
   - **Repo** : `journal-xauusd`
   - **Branche** : `main`
   - **Token** : collez le `github_pat_…`
3. Cliquez sur **Tester et enregistrer**. L'application vérifie l'accès et le droit d'écriture, puis affiche « Connecté ».
4. Réglez votre **capital de départ** et votre **risque par défaut**.

À répéter **une fois par appareil** (Mac, iPhone…), car le token n'est stocké que dans le navigateur. Le bouton **Oublier le token** l'efface.

### Repartir de zéro (supprimer les trades d'exemple)

Le repo contient 20 trades fictifs dans `data/trades.json`. Pour démarrer avec un journal vide, remplacez le contenu du fichier par :

```json
{ "version": 1, "trades": [] }
```

Vous pouvez le faire directement sur github.com (icône crayon). Vous pouvez aussi supprimer les fichiers `.svg` de `data/screenshots/`.

## 5. Installer sur l'iPhone

1. Ouvrez l'URL du site dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Ouvrez l'application depuis l'icône, puis saisissez le token dans **Réglages**. L'app installée a son propre stockage, séparé de celui de Safari.

---

## Utilisation

- **Ajouter un trade** : sur mobile, le bouton doré **+** ; sur desktop, le menu **Ajouter**. Les boutons **TP touché / SL touché** remplissent le prix de sortie en un geste.
- **Captures** : prise de photo, galerie, glisser-déposer ou collage (⌘V). Les images sont compressées dans le navigateur (WebP, 1 600 px de large maximum, environ 50 à 150 Ko) avant le commit.
- **Filtres globaux** (période, sens, émotion, erreur) : ils s'appliquent aux KPI, aux graphiques et au tableau.
- **Secours** : Réglages → Exporter / Importer JSON. Dashboard → export **PDF** ou **JPG** de la vue affichée.

Chaque ajout, modification ou suppression crée un commit (`➕ Ajout du trade …`). L'historique Git sert donc aussi de sauvegarde. Si deux appareils enregistrent en même temps, l'application relit le fichier et réessaie automatiquement.

## Règles de calcul

| Grandeur | Formule |
|---|---|
| Pips | 1 $ de mouvement = **100 pips** (SL de 4,00 $ = 400 pips) |
| R | (sortie − entrée) / (entrée − SL) pour un achat. Pour une vente, la même formule avec le signe inversé. Le R peut être saisi à la main (case « R manuel »). |
| € d'un trade | capital **au moment du trade** × % de risque × R |
| Capital au moment du trade | capital de départ + € de tous les trades précédents (dans l'ordre chronologique) |
| Capital actuel | capital de départ + gains cumulés (tous les trades, sans filtre) |
| Winrate | trades à R > 0 / trades clôturés |
| Espérance | somme des R / nombre de trades |
| Profit factor | somme des R gagnants / somme des R perdants (en valeur absolue) |
| Drawdown max | plus forte baisse depuis un sommet de la courbe cumulée, en R et en % du capital |

Les euros ne sont **jamais figés** : si vous modifiez un ancien trade ou le capital de départ, tout est recalculé. Un trade sans prix de sortie est considéré comme « en cours » et exclu des statistiques.

## Format d'un trade (`data/trades.json`)

```json
{
  "id": "t_2026-11-18_0930_a1b2",
  "symbol": "XAUUSD",
  "entryAt": "2026-11-18T09:30:00+01:00",
  "exitAt": "2026-11-18T11:05:00+01:00",
  "direction": "buy",
  "entryPrice": 2652.40,
  "stopLoss": 2649.40,
  "takeProfit": 2658.40,
  "exitPrice": 2658.40,
  "outcome": "tp",
  "riskPercent": 1,
  "rMultiple": 2,
  "rManual": false,
  "screenshots": {
    "before": "data/screenshots/t_2026-11-18_0930_a1b2-avant-xxxx.webp",
    "after": "data/screenshots/t_2026-11-18_0930_a1b2-apres-xxxx.webp"
  },
  "notes": "Cassure de range asiatique…",
  "emotionBefore": "calme",
  "emotionAfter": "confiante",
  "discipline": 4,
  "errorTags": ["entrée trop tôt"],
  "createdAt": "2026-11-18T11:10:00Z",
  "updatedAt": "2026-11-18T11:10:00Z"
}
```

Émotions possibles : `calme`, `confiante`, `impatiente`, `stressée`, `frustrée`, `euphorique`, `fatiguée`.

## Développement

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm run demo` régénère les 20 trades fictifs et leurs captures SVG. **Attention : cette commande écrase `data/trades.json`.**

### Structure

```
src/
├── types/trade.ts          schéma (zod) d'un trade + réglages
├── lib/calc/               calculs purs, testés avec Vitest
│   ├── trade.ts            R, pips, € et chaîne de capital
│   ├── stats.ts            winrate, espérance, PF, séries, courbe d'equity
│   ├── drawdown.ts         drawdown en R et en %
│   ├── distribution.ts     histogramme, résultats par jour et par heure (Paris)
│   ├── filters.ts          filtres globaux
│   └── paris.ts            fuseau Europe/Paris (heure d'été comprise)
├── lib/github/             API contents : lecture, commit, gestion des conflits
├── lib/image/compress.ts   WebP, 1 600 px maximum
├── lib/export/             JSON, PDF, JPG
├── hooks/                  état global (trades, réglages, filtres), compteurs animés
├── components/             layout, ui, dashboard, trades, formulaire
└── pages/                  Dashboard, Trades, Ajouter/Modifier, Réglages
```
