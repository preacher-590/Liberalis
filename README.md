# Libéralis

**SaaS de gestion tout-en-un pour professionnels libéraux en Afrique francophone** — médecins, avocats, comptables, kinésithérapeutes, consultants.

Libéralis remplace le carnet papier, les fichiers Excel et les échanges WhatsApp dispersés par une interface unique : agenda, clients, facturation en FCFA, encaissements Mobile Money et rapports d'activité.

---

## 📚 Documentation Technique & Guides

- [ARCHITECTURE.md](ARCHITECTURE.md) : Vue détaillée de l'architecture SPA React + API Laravel 11, isolation multi-tenant et flux métier.
- [GLOSSAIRE_TECHNIQUE.md](GLOSSAIRE_TECHNIQUE.md) : Lexique vulgarisé avec analogies concrètes et cas d'usage réels (Offline-First, PWA, AES-GCM, OCC, Webhooks).
- [TESTING_OFFLINE.md](TESTING_OFFLINE.md) : Protocole de test pas-à-pas pour vérifier le fonctionnement hors-ligne (DevTools Network Offline, synchro, F5).

---

## ✨ Fonctionnalités Principales

- 🗓️ **Agenda** — Rendez-vous avec rappels automatiques par e-mail au client (délai configurable : 1h, 2h ou 24h avant) et détection anti-chevauchement.
- 👥 **Clients** — Dossiers clients/patients avec historique complet, notes confidentielles et recherche globale (`Ctrl+K`).
- 📄 **Facturation** — Numérotation automatique configurable (`F-2026-0001`), remises, prévisualisation A4, export PDF et partage WhatsApp.
- 💳 **Mobile Money** — Gestion des comptes Orange Money / Wave / MTN / Free Money, génération de demandes de paiement par code USSD + QR code, suivi des encaissements.
- 📊 **Rapports** — Revenus mensuels sur 12 mois, répartition des consultations et des moyens de paiement, top clients.
- 🌙 **Thème clair / sombre / système** — Adaptable selon les préférences utilisateur et les réglages du système d'exploitation.

---

## 🛠️ Stack Technique

| Côté | Technologies |
|---|---|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Recharts · React Hook Form + Zod |
| **Backend** | Laravel 11 · Sanctum (Auth par token API) · SQLite / MySQL · Eloquent ORM |
| **Emails** | Notifications Laravel (log local en démo, SMTP type Brevo en production) |

---

## 🚀 Démarrage Rapide

### 1. Backend API (`liberalis-api/`)

```bash
cd liberalis-api
composer install
cp .env.example .env        # Renseigner la base de données si besoin
php artisan key:generate
php artisan migrate
php artisan serve            # http://localhost:8000
```

Pour activer les rappels email planifiés en arrière-plan (exécutés toutes les 15 min) :

```bash
php artisan schedule:work
```

### 2. Frontend React (Racine du projet)

```bash
npm install
npm run dev                  # http://localhost:5173
```

---

## 🧪 Tests & Build

### Validation Backend (Laravel)
```bash
cd liberalis-api
php artisan test
```

### Build Frontend Production
```bash
npm run build
```

---

## 📁 Arborescence du Projet

```
Liberalis/
├── src/                 # Frontend React (pages, composants, contextes, hooks, services)
├── liberalis-api/       # API Backend Laravel (modèles, contrôleurs, migrations, tests)
├── ARCHITECTURE.md      # Documentation d'architecture système
├── README.md            # Notice d'installation et présentation
└── dist/                # Bundle de production compilé par Vite
```
