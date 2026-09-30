<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RapportController — Donnees agregees pour la page Rapports
 *
 * Retourne en un seul appel les series des trois graphiques :
 * revenus mensuels (12 mois glissants), repartition des types de
 * consultation et repartition des moyens de paiement.
 */
class RapportController extends Controller
{
    /** Abreviations francaises des mois (index 1-12) */
    private const MOIS = [
        1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr', 5 => 'Mai', 6 => 'Jun',
        7 => 'Jul', 8 => 'Aoû', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc',
    ];

    /**
     * GET /api/rapports/summary
     *
     * Response: {
     *   revenus_mensuels: [{ month: 'Jan', revenue: 320000 }, ...],   // 12 mois glissants
     *   consultations:    [{ name: 'Consultation Civile', value: 12 }, ...],
     *   paiements:        [{ name: 'Orange Money', value: 340000 }, ...]
     * }
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        // --- Revenus mensuels sur 12 mois glissants (encaissements recus) ---
        // Groupement fait en PHP pour rester portable MySQL/SQLite (tests).
        $start = now()->startOfMonth()->subMonths(11);

        $parMois = $user->payments()
            ->where('status', 'recu')
            ->where('paid_at', '>=', $start)
            ->get(['paid_at', 'amount'])
            ->groupBy(fn ($p) => $p->paid_at->format('Y-m'))
            ->map(fn ($group) => (float) $group->sum('amount'));

        $revenusMensuels = collect(range(11, 0))->map(function ($i) use ($parMois) {
            $mois = now()->startOfMonth()->subMonths($i);

            return [
                'month'   => self::MOIS[$mois->month],
                'revenue' => $parMois[$mois->format('Y-m')] ?? 0,
            ];
        })->values();

        // --- Repartition des types de consultation (RDV non annules) ---
        $consultations = $user->appointments()
            ->where('status', '!=', 'annule')
            ->selectRaw('type as name, COUNT(*) as value')
            ->groupBy('type')
            ->orderByDesc('value')
            ->get();

        // --- Repartition des moyens de paiement (encaissements recus) ---
        $paiements = $user->payments()
            ->where('status', 'recu')
            ->selectRaw('method as name, SUM(amount) as value')
            ->groupBy('method')
            ->orderByDesc('value')
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'value' => (float) $row->value]);

        return response()->json([
            'revenus_mensuels' => $revenusMensuels,
            'consultations'    => $consultations,
            'paiements'        => $paiements,
        ]);
    }
}
