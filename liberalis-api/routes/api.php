<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CompteMobileMoneyController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RapportController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\Api\ReminderController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/*
|--------------------------------------------------------------------------
| API Routes — Libéralis
|--------------------------------------------------------------------------
|
| Toutes les routes retournent du JSON.
| Les routes protegees requirent le header : Authorization: Bearer {token}
|
*/

// ============================================================
// Routes publiques (sans token Sanctum)
// ============================================================

/** Connexion d'un professionnel existant */
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

/** Inscription d'un nouveau professionnel */
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');

// ============================================================
// Routes protegees (token Sanctum obligatoire)
// ============================================================

Route::middleware('auth:sanctum')->group(function () {

    // --- Authentification ---
    Route::get('/me', [AuthController::class, 'me']);          // Profil de l'utilisateur connecte
    Route::post('/logout', [AuthController::class, 'logout']); // Deconnexion
    Route::post('/change-password', [AuthController::class, 'changePassword']); // Changement de mot de passe

    // --- Mise a jour du profil ---
    Route::patch('/profile', function (Request $request) {
        // Met a jour les champs du profil professionnel (Feat 11 - Paramètres)
        $user = $request->user();
        $user->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'cabinet_name' => 'nullable|string|max:255',
            'cabinet_address' => 'nullable|string',
            'specialty' => 'nullable|string|max:255',
            'invoice_prefix' => 'nullable|string|max:10',
            'email_reminders' => 'nullable|boolean',
            'email_delay' => 'nullable|in:1h,2h,24h,48h,72h,both',
            'email_template' => 'nullable|string',
            'theme' => 'nullable|in:light,dark,system',
            'payment_conditions' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'legal_mentions' => 'nullable|string',
            'consultation_rates' => 'nullable|array',
            // Validation des réglages d'affichage de la facture
            'invoice_display_settings' => 'nullable|array',
        ]));
        return response()->json($user);
    });

    // --- Photo de profil ---
    Route::post('/profile/avatar', function (Request $request) {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048', // 2 Mo max
        ]);

        $user = $request->user();

        // Supprime l'ancienne photo du disque si elle existe
        if ($user->avatar_url) {
            $ancienChemin = str_replace(asset('storage') . '/', '', $user->avatar_url);
            $ancienChemin = str_replace(url('/storage') . '/', '', $ancienChemin);
            Storage::disk('public')->delete($ancienChemin);
        }

        $chemin = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_url' => asset('storage/' . $chemin)]);

        return response()->json($user);
    });

    Route::delete('/profile/avatar', function (Request $request) {
        $user = $request->user();

        if ($user->avatar_url) {
            $ancienChemin = str_replace(asset('storage') . '/', '', $user->avatar_url);
            $ancienChemin = str_replace(url('/storage') . '/', '', $ancienChemin);
            Storage::disk('public')->delete($ancienChemin);
            $user->update(['avatar_url' => null]);
        }

        return response()->json($user);
    });

    Route::delete('/profile', function (Request $request) {
        $user = $request->user();
        $user->tokens()->delete();
        $user->delete();
        return response()->json(['message' => 'Compte supprimé avec succès']);
    });

    // --- Feat 5 : CRUD Clients ---
    Route::apiResource('clients', ClientController::class);

    // --- Feat 6 : CRUD Rendez-vous ---
    Route::apiResource('appointments', AppointmentController::class)->only(['index', 'show']);
    Route::apiResource('appointments', AppointmentController::class)->except(['index', 'show'])->middleware('throttle:10,1');
    // Envoi manuel d'un rappel de rendez-vous (Email & payload WhatsApp)
    // Sécurisé par throttle:10,1 contre le spam d'emails/épuisement de quotas et whereNumber contre les injections
    Route::post('appointments/{appointment}/send-reminder', [ReminderController::class, 'sendReminder'])
        ->whereNumber('appointment')
        ->middleware('throttle:10,1');

    // --- Feat 2 : CRUD Factures ---
    Route::apiResource('invoices', InvoiceController::class);

    // Marquer une facture comme payee (declenche une notification automatique)
    Route::patch('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid']);

    // --- Feat 3 : Notifications ---
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllRead']);

    // --- Feat 4 : Recherche globale multi-entites ---
    Route::get('search', SearchController::class);

    // --- Feat 8 : Comptes Mobile Money ---
    Route::apiResource('comptes-mobile-money', CompteMobileMoneyController::class)->except(['show']);
    Route::patch('comptes-mobile-money/{id}/toggle', [CompteMobileMoneyController::class, 'toggleActif']);

    // --- Encaissements (transactions Mobile Money, cash, virements) ---
    Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'destroy']);

    // --- Rapports : series agregees pour les graphiques ---
    Route::get('rapports/summary', [RapportController::class, 'summary']);

    // --- Super Admin : dashboard plateforme + gestion des comptes ---
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('stats', [AdminController::class, 'stats']);
        Route::get('users', [AdminController::class, 'index']);
        Route::patch('users/{user}/toggle-active', [AdminController::class, 'toggleActive']);
        Route::patch('users/{user}/menus', [AdminController::class, 'updateMenus']);
    });

    // --- Feat 7 : Stats dynamiques du Dashboard ---
    Route::get('dashboard/stats', function (Request $request) {
        $user = $request->user();

        $stats = Cache::remember("dashboard_stats_user_{$user->id}", 300, function () use ($user) {
            $month = now()->month;
            $year = now()->year;

            return [
                // Nombre de RDV prevus aujourd'hui
                'rdv_today' => $user->appointments()
                    ->whereDate('starts_at', today())
                    ->count(),

                // Chiffre d'affaires du mois en cours (factures payees seulement)
                'revenue_month' => $user->invoices()
                    ->whereMonth('issued_at', $month)
                    ->whereYear('issued_at', $year)
                    ->where('status', 'payee')
                    ->sum('total'),

                // Nombre de clients actifs
                'active_clients' => $user->clients()
                    ->where('status', 'actif')
                    ->count(),

                // Nombre de factures en attente de paiement
                'pending_invoices' => $user->invoices()
                    ->where('status', 'en_attente')
                    ->count(),

                // Montant total des factures en attente (en FCFA)
                'pending_amount' => $user->invoices()
                    ->whereIn('status', ['en_attente', 'en_retard'])
                    ->sum('total'),

                // Revenus encaisses sur les 7 derniers jours (graphique dashboard)
                'revenus_7_jours' => (function () use ($user) {
                    $jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

                    $parJour = $user->payments()
                        ->where('status', 'recu')
                        ->where('paid_at', '>=', today()->subDays(6)->startOfDay())
                        ->get(['paid_at', 'amount'])
                        ->groupBy(fn ($p) => $p->paid_at->toDateString())
                        ->map(fn ($group) => (float) $group->sum('amount'));

                    // ->all() : tableau natif uniquement — les Collections se
                    // deserialisent mal depuis le cache fichier.
                    return collect(range(6, 0))->map(function ($i) use ($jours, $parJour) {
                        $date = today()->subDays($i);

                        return [
                            'name'  => $jours[$date->dayOfWeek],
                            'value' => $parJour[$date->toDateString()] ?? 0,
                        ];
                    })->values()->all();
                })(),
            ];
        });

        return response()->json($stats);
    });
});
