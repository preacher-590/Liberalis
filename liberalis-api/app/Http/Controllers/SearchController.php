<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SearchController — Recherche globale multi-entites (Feat 4)
 *
 * Endpoint unique qui recherche simultanement dans les clients,
 * les factures et les rendez-vous.
 * Le frontend applique un debounce de 300ms avant d'appeler cet endpoint.
 */
class SearchController extends Controller
{
    /**
     * Recherche globale multi-entites.
     *
     * GET /api/search?q=Amadou
     * Query params: q (string, min 2 caracteres)
     *
     * Response: {
     *   clients: Client[],          // 5 max
     *   invoices: Invoice[],        // 5 max
     *   appointments: Appointment[] // 5 max
     * }
     */
    public function __invoke(Request $request): JsonResponse
    {
        // Validation de la chaine de recherche (min 2 chars pour eviter les requetes excessives)
        $q = $request->validate(['q' => 'required|string|min:2|max:100'])['q'];

        $user = $request->user();

        // Recherche dans les clients (prenom, nom, telephone)
        $clients = $user->clients()
            ->where(function ($query) use ($q) {
                $query->where('first_name', 'like', "%{$q}%")
                      ->orWhere('last_name', 'like', "%{$q}%")
                      ->orWhere('phone', 'like', "%{$q}%")
                      ->orWhere('ref_number', 'like', "%{$q}%");
            })
            ->limit(5)
            ->get(['id', 'first_name', 'last_name', 'phone', 'status', 'ref_number']);

        // Recherche dans les factures (numero de facture)
        $invoices = $user->invoices()
            ->where('invoice_number', 'like', "%{$q}%")
            ->limit(5)
            ->get(['id', 'invoice_number', 'total', 'status', 'client_id', 'issued_at']);

        // Recherche dans les RDV (via le nom du client)
        $appointments = $user->appointments()
            ->with('client')
            ->whereHas('client', function ($clientQuery) use ($q) {
                $clientQuery->where('last_name', 'like', "%{$q}%")
                            ->orWhere('first_name', 'like', "%{$q}%");
            })
            ->limit(5)
            ->get(['id', 'type', 'starts_at', 'status', 'client_id', 'amount']);

        return response()->json([
            'clients'      => $clients,
            'invoices'     => $invoices,
            'appointments' => $appointments,
        ]);
    }
}
