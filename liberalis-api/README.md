# Liberalis API

API Laravel de **Libéralis**, SaaS de gestion pour professionnels libéraux en Afrique francophone. Voir le [README principal](../README.md) pour la présentation complète du projet.

## Endpoints principaux

Toutes les routes sont préfixées `/api/` et protégées par Sanctum (`Authorization: Bearer {token}`), sauf `/login` et `/register`.

| Ressource | Routes |
|---|---|
| Auth | `POST /login`, `POST /register`, `GET /me`, `POST /logout`, `POST /change-password`, `PATCH /profile` |
| Clients | `apiResource /clients` |
| Rendez-vous | `apiResource /appointments` |
| Factures | `apiResource /invoices`, `PATCH /invoices/{id}/mark-paid` |
| Encaissements | `GET/POST /payments`, `DELETE /payments/{id}` |
| Mobile Money | `apiResource /comptes-mobile-money`, `PATCH .../{id}/toggle` |
| Notifications | `GET /notifications`, `PATCH .../{id}/read`, `POST .../mark-all-read` |
| Recherche | `GET /search?q=` |
| Dashboard | `GET /dashboard/stats` (KPIs + revenus 7 jours, cache 5 min) |
| Rapports | `GET /rapports/summary` (revenus 12 mois, consultations, paiements) |

## Rappels email

La commande `appointments:send-reminders` (planifiée toutes les 15 min dans `routes/console.php`) envoie un email au client avant chaque rendez-vous, selon le délai configuré par le professionnel (`email_delay` : 1h, 2h, 24h). Le template est personnalisable avec les variables `{nom_client}`, `{nom_docteur}`, `{date_rdv}`, `{heure_rdv}`.

- En local : `MAIL_MAILER=log` → les emails sont écrits dans `storage/logs/laravel.log`
- En production : configurer le bloc SMTP du `.env` (voir `.env.example`) et lancer `php artisan schedule:work`

## Tests

```bash
php artisan test
```

Suite sur SQLite en mémoire (aucun impact sur la base de développement) : authentification, isolation multi-tenant, facturation/encaissements, rappels email.
