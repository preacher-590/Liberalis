<?php

namespace App\Http\Controllers;

use App\Models\CompteMobileMoney;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * CompteMobileMoneyController — Gestion des comptes de paiement Mobile Money
 *
 * Permet aux professionnels d'enregistrer leurs numéros Orange Money, Wave Pay,
 * MTN et Free Money pour générer des liens et codes USSD d'encaissement direct.
 *
 * Sections logiques :
 * 1. Consultation des comptes utilisateur (`index`)
 * 2. Ajout de compte avec contrôle d'unicité par opérateur (`store`)
 * 3. Edition de compte (`update`)
 * 4. Basculement de statut actif/inactif (`toggleActif`)
 * 5. Suppression de compte (`destroy`)
 */
class CompteMobileMoneyController extends Controller
{
    /**
     * Liste de tous les comptes Mobile Money de l'utilisateur connecté.
     *
     * GET /api/comptes-mobile-money
     */
    public function index(): JsonResponse
    {
        $comptes = Auth::user()
            ->comptesMobileMoney()
            ->orderBy('operateur')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $comptes,
            'message' => 'Comptes Mobile Money récupérés avec succès.',
        ]);
    }

    /**
     * Crée un nouveau compte Mobile Money.
     *
     * POST /api/comptes-mobile-money
     */
    public function store(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $validated = $request->validate([
            'operateur' => [
                'required',
                'string',
                'max:50',
                // Unicité par utilisateur uniquement parmi les comptes non supprimés
                Rule::unique('comptes_mobile_money')
                    ->where('user_id', $userId)
                    ->whereNull('deleted_at'),
            ],
            'numero' => ['required', 'string', 'regex:/^\+?[0-9\s]{8,15}$/'],
            'code_ussd' => ['nullable', 'string', 'max:100'],
            'est_actif' => ['sometimes', 'boolean'],
        ], [
            'operateur.in'     => 'L\'opérateur sélectionné n\'est pas valide.',
            'operateur.unique' => 'Vous avez déjà un compte pour cet opérateur.',
            'numero.regex'     => 'Le numéro de téléphone doit comporter entre 8 et 15 chiffres.',
        ]);

        // Si le compte a été précédemment supprimé en soft-delete, on le restaure
        $compteExistant = Auth::user()
            ->comptesMobileMoney()
            ->onlyTrashed()
            ->where('operateur', $validated['operateur'])
            ->first();

        if ($compteExistant) {
            $compteExistant->restore();
            $compteExistant->update($validated);
            $compte = $compteExistant->fresh();
        } else {
            $compte = Auth::user()->comptesMobileMoney()->create($validated);
        }

        return response()->json([
            'success' => true,
            'data'    => $compte,
            'message' => 'Compte Mobile Money créé avec succès.',
        ], 201);
    }

    /**
     * Modifie un compte Mobile Money existant.
     *
     * PUT /api/comptes-mobile-money/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $compte = $this->findOrFail($id);
        $userId = Auth::id();

        $validated = $request->validate([
            'operateur' => [
                'required',
                'string',
                'max:50',
                // Unicité par utilisateur en ignorant le compte courant et les comptes supprimés
                Rule::unique('comptes_mobile_money')
                    ->where('user_id', $userId)
                    ->whereNull('deleted_at')
                    ->ignore($compte->id),
            ],
            'numero' => ['required', 'string', 'regex:/^\+?[0-9\s]{8,15}$/'],
            'code_ussd' => ['nullable', 'string', 'max:100'],
            'est_actif' => ['sometimes', 'boolean'],
        ], [
            'operateur.in'     => 'L\'opérateur sélectionné n\'est pas valide.',
            'operateur.unique' => 'Vous avez déjà un compte pour cet opérateur.',
            'numero.regex'     => 'Le numéro de téléphone doit comporter entre 8 et 15 chiffres.',
        ]);

        $compte->update($validated);

        return response()->json([
            'success' => true,
            'data'    => $compte->fresh(),
            'message' => 'Compte Mobile Money mis à jour avec succès.',
        ]);
    }

    /**
     * Bascule l'état actif/inactif d'un compte Mobile Money.
     *
     * PATCH /api/comptes-mobile-money/{id}/toggle
     */
    public function toggleActif(int $id): JsonResponse
    {
        $compte = $this->findOrFail($id);
        $compte->update(['est_actif' => ! $compte->est_actif]);

        $etat = $compte->est_actif ? 'activé' : 'désactivé';

        return response()->json([
            'success' => true,
            'data'    => $compte->fresh(),
            'message' => "Compte Mobile Money {$etat} avec succès.",
        ]);
    }

    /**
     * Supprime un compte Mobile Money.
     *
     * DELETE /api/comptes-mobile-money/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $compte = $this->findOrFail($id);
        $compte->delete();

        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => 'Compte Mobile Money supprimé avec succès.',
        ]);
    }

    // ─────────────────────────────────────────────
    // Helpers privés
    // ─────────────────────────────────────────────

    /**
     * Récupère le compte appartenant à l'utilisateur connecté ou lève une 403/404.
     */
    private function findOrFail(int $id): CompteMobileMoney
    {
        $compte = CompteMobileMoney::find($id);

        if (! $compte) {
            abort(404, 'Compte Mobile Money introuvable.');
        }

        if ($compte->user_id !== Auth::id()) {
            abort(403, 'Action non autorisée.');
        }

        return $compte;
    }
}
