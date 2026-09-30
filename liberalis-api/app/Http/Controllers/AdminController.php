<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * AdminController — Gestion des comptes utilisateurs (super admin)
 *
 * Version minimale : liste des professionnels inscrits et
 * activation/desactivation de compte. L'admin ne voit PAS les
 * donnees metier des professionnels (clients, factures, RDV) —
 * uniquement des compteurs agreges, pour respecter la
 * confidentialite des dossiers.
 */
class AdminController extends Controller
{
    /** Abreviations francaises des mois (index 1-12) */
    private const MOIS = [
        1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr', 5 => 'Mai', 6 => 'Jun',
        7 => 'Jul', 8 => 'Aoû', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc',
    ];

    /**
     * Statistiques globales de la plateforme pour le dashboard admin.
     *
     * Uniquement des agregats (volumes, tendances) — jamais le contenu
     * des dossiers des professionnels.
     *
     * GET /api/admin/stats  (cache 5 min)
     */
    public function stats(): JsonResponse
    {
        $stats = Cache::remember('admin_platform_stats', 300, function () {
            // --- Inscriptions par mois sur 12 mois glissants ---
            // Groupement en PHP pour rester portable MySQL/SQLite (tests).
            $depuis = now()->startOfMonth()->subMonths(11);

            $parMois = User::where('created_at', '>=', $depuis)
                ->get(['created_at'])
                ->groupBy(fn ($u) => $u->created_at->format('Y-m'))
                ->map->count();

            // ->all() : ne stocker que des tableaux natifs dans le cache —
            // les objets Collection/Model se deserialisent mal (file driver).
            $inscriptionsMensuelles = collect(range(11, 0))->map(function ($i) use ($parMois) {
                $mois = now()->startOfMonth()->subMonths($i);

                return [
                    'month' => self::MOIS[$mois->month],
                    'value' => $parMois[$mois->format('Y-m')] ?? 0,
                ];
            })->values()->all();

            // --- Repartition des professionnels par specialite ---
            // Groupement SQL sur la colonne brute (compatible ONLY_FULL_GROUP_BY
            // de MySQL et SQLite), normalisation des vides en PHP.
            $specialites = User::select('specialty')
                ->selectRaw('COUNT(*) as value')
                ->groupBy('specialty')
                ->get()
                ->groupBy(fn ($row) => $row->specialty ?: 'Non renseignée')
                ->map(fn ($groupe, $nom) => ['name' => $nom, 'value' => (int) $groupe->sum('value')])
                ->sortByDesc('value')
                ->values()
                ->all();

            // --- Derniers inscrits (5) — infos de compte uniquement ---
            $derniersInscrits = User::orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'name', 'email', 'specialty', 'avatar_url', 'is_active', 'created_at'])
                ->toArray();

            return [
                // Comptes
                'users_total'        => User::count(),
                'users_active'       => User::where('is_active', true)->count(),
                'users_new_month'    => User::where('created_at', '>=', now()->startOfMonth())->count(),

                // Volumes d'activite de la plateforme (agregats)
                'clients_total'      => Client::count(),
                'appointments_total' => Appointment::count(),
                'invoices_total'     => Invoice::count(),
                'volume_encaisse'    => (float) Payment::where('status', 'recu')->sum('amount'),
                'rappels_envoyes'    => Appointment::where('email_sent', true)->count(),

                // Series pour les graphiques
                'inscriptions_mensuelles' => $inscriptionsMensuelles,
                'specialites'             => $specialites,
                'derniers_inscrits'       => $derniersInscrits,
            ];
        });

        return response()->json($stats);
    }

    /**
     * Liste tous les comptes utilisateurs avec compteurs agreges.
     *
     * GET /api/admin/users
     * Query params:
     *   - search (string): filtre nom/email/cabinet
     *   - per_page (int): pagination (defaut 20)
     */
    public function index(Request $request): JsonResponse
    {
        // Le select explicite DOIT preceder withCount, sinon withCount
        // pose un select('*') et la liste de colonnes serait ignoree.
        $query = User::query()
            ->select([
                'id', 'name', 'email', 'specialty', 'cabinet_name', 'phone',
                'avatar_url', 'role', 'is_active', 'allowed_menus', 'created_at',
            ])
            ->withCount(['clients', 'invoices', 'appointments'])
            ->withSum(['payments as volume_encaisse' => function ($q) {
                $q->where('status', 'recu');
            }], 'amount')
            ->withSum('invoices as volume_facture', 'total')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('cabinet_name', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        return response()->json($query->paginate($perPage));
    }

    /**
     * Met à jour les menus et fonctionnalités autorisés pour un compte professionnel.
     *
     * Permet au Super Admin d'activer ou désactiver des menus spécifiques (agenda, factures, etc.).
     *
     * PATCH /api/admin/users/{user}/menus
     * Body: { allowed_menus: string[] }
     */
    public function updateMenus(Request $request, User $user): JsonResponse
    {
        // Securite : Les comptes Super Administrateur conservent l'acces a tous les modules
        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Les droits d’accès d’un compte Administrateur ne peuvent pas être modifiés.',
            ], 422);
        }

        $validated = $request->validate([
            'allowed_menus' => 'required|array',
            'allowed_menus.*' => 'string|in:' . implode(',', User::AVAILABLE_MENUS),
        ]);

        $menus = array_values(array_unique($validated['allowed_menus']));
        $user->update(['allowed_menus' => $menus]);

        return response()->json([
            'id'            => $user->id,
            'name'          => $user->name,
            'allowed_menus' => $user->allowed_menus,
            'message'       => "Les accès aux menus de {$user->name} ont été mis à jour avec succès.",
        ]);
    }

    /**
     * Active ou desactive un compte utilisateur.
     *
     * La desactivation revoque tous les tokens (sessions coupees
     * immediatement) et bloque toute reconnexion.
     *
     * PATCH /api/admin/users/{user}/toggle-active
     */
    public function toggleActive(Request $request, User $user): JsonResponse
    {
        // L'admin ne peut pas se desactiver lui-meme
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte.',
            ], 422);
        }

        $user->update(['is_active' => ! $user->is_active]);

        // Compte desactive : revocation immediate de toutes les sessions
        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        // Les compteurs actifs/desactives du dashboard admin changent
        Cache::forget('admin_platform_stats');

        return response()->json([
            'id'        => $user->id,
            'is_active' => $user->is_active,
            'message'   => $user->is_active
                ? "Le compte de {$user->name} a été réactivé."
                : "Le compte de {$user->name} a été désactivé.",
        ]);
    }
}
