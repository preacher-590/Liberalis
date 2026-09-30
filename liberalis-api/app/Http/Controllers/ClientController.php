<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * ClientController — CRUD complet des clients (Feat 5)
 *
 * Chaque opération vérifie que le client appartient bien au professionnel
 * connecté (isolation multi-tenant via user_id).
 *
 * Sections logiques :
 * 1. Recherche et pagination de la clientèle (`index`)
 * 2. Inscription client et génération de référence dossier (`store`)
 * 3. Consultation détaillée avec historique RDV & factures (`show`)
 * 4. Mise à jour des informations (`update`)
 * 5. Suppression de dossier avec nettoyage en cascade (`destroy`)
 */
class ClientController extends Controller
{
    /**
     * Liste les clients du professionnel avec pagination, filtre et recherche.
     *
     * GET /api/clients
     * Query params:
     *   - status (string): 'actif' | 'inactif' | 'nouveau' | 'tous' (defaut: tous)
     *   - search (string): recherche sur prenom, nom, telephone, email
     *   - page (int): numero de page pour la pagination
     *
     * Response: Paginated { data[], total, per_page, current_page, last_page }
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->clients()
            ->withCount('appointments')         // Nombre de RDV du client
            ->withSum('invoices', 'total');      // Chiffre d'affaires total du client

        // Filtre par statut (si different de 'tous')
        if ($request->filled('status') && $request->status !== 'tous') {
            $query->where('status', $request->status);
        }

        // Recherche textuelle sur plusieurs champs (insensible a la casse)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%");
            });
        }

        $perPage = $request->integer('per_page', 20);
        $perPage = min(200, max(1, $perPage));

        return response()->json($query->latest()->paginate($perPage));
    }

    /**
     * Cree un nouveau client avec une reference dossier auto-generee.
     *
     * POST /api/clients
     * Body: { first_name, last_name, phone, email?, profession?, address?, notes? }
     * Response: Client cree (201)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'phone'      => 'required|string|max:20',
            'email'      => 'nullable|email|max:255',
            'profession' => 'nullable|string|max:255',
            'address'    => 'nullable|string',
            'notes'      => 'nullable|string',
            'status'     => 'sometimes|in:actif,inactif,nouveau,ACTIF,INACTIF,NOUVEAU',
        ]);

        if (isset($validated['status'])) {
            $validated['status'] = strtolower($validated['status']);
        }

        // Auto-generation de la reference dossier (ex: #2026-0015)
        $count = $request->user()->clients()->count() + 1;
        $validated['user_id']    = $request->user()->id;
        $validated['status']     = $validated['status'] ?? 'nouveau';
        $validated['ref_number'] = '#' . date('Y') . '-' . str_pad($count, 4, '0', STR_PAD_LEFT);

        $client = Client::create($validated);

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($client, 201);
    }

    /**
     * Retourne les details complets d'un client (avec RDV et factures).
     *
     * GET /api/clients/{id}
     * Response: Client avec relations appointments et invoices
     */
    public function show(Request $request, Client $client): JsonResponse
    {
        // Verification que le client appartient bien au professionnel connecte
        abort_if($client->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        return response()->json($client->load(['appointments.client', 'invoices.lines']));
    }

    /**
     * Met a jour les informations d'un client.
     *
     * PUT /api/clients/{id}
     * Body: champs modifiables
     * Response: Client mis a jour
     */
    public function update(Request $request, Client $client): JsonResponse
    {
        abort_if($client->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'phone'      => 'sometimes|string|max:20',
            'email'      => 'nullable|email|max:255',
            'profession' => 'nullable|string|max:255',
            'address'    => 'nullable|string',
            'notes'      => 'nullable|string',
            'status'     => 'sometimes|in:actif,inactif,nouveau,ACTIF,INACTIF,NOUVEAU',
        ]);

        if (isset($validated['status'])) {
            $validated['status'] = strtolower($validated['status']);
        }

        $client->update($validated);

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($client);
    }

    /**
     * Supprime un client et toutes ses donnees associees (cascade BDD).
     *
     * DELETE /api/clients/{id}
     * Response: { message }
     */
    public function destroy(Request $request, Client $client): JsonResponse
    {
        abort_if($client->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $client->delete(); // Les RDV et factures sont supprimes en cascade (BDD)

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json(['message' => 'Client supprime avec succes.']);
    }
}
