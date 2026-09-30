<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * AuthController — Gestion de l'authentification (Feat 9)
 *
 * Utilise Laravel Sanctum pour les tokens API.
 * Le frontend stocke le token dans localStorage et l'envoie
 * dans le header 'Authorization: Bearer {token}' sur chaque requete.
 */
class AuthController extends Controller
{
    /**
     * Connexion d'un professionnel.
     *
     * Verifie les identifiants, supprime les anciens tokens (1 session active),
     * cree un nouveau token Sanctum et le retourne avec les infos utilisateur.
     *
     * POST /api/login
     * Body: { email, password }
     * Response: { token, user }
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        // Verification du mot de passe avec Hash::check (bcrypt)
        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        // Compte desactive par l'administrateur : connexion refusee
        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte a été désactivé. Veuillez contacter le support.'],
            ]);
        }

        // Revoque les anciens tokens pour garantir une session unique
        $user->tokens()->delete();

        // Cree un nouveau token Sanctum nomme
        $token = $user->createToken('liberalis-spa-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'specialty' => $user->specialty,
                'cabinet_name' => $user->cabinet_name,
                // Ajouté pour permettre l'affichage dynamique de l'adresse du cabinet sur la facture
                'cabinet_address' => $user->cabinet_address,
                // Ajouté pour afficher dynamiquement le téléphone professionnel sur la facture
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'email_reminders' => $user->email_reminders,
                'email_delay' => $user->email_delay,
                'email_template' => $user->email_template,
                'theme' => $user->theme,
                'invoice_prefix' => $user->invoice_prefix,
                'payment_conditions' => $user->payment_conditions,
                'currency' => $user->currency,
                'legal_mentions' => $user->legal_mentions,
                'consultation_rates' => $user->consultation_rates,
                // Ajouté pour synchroniser les préférences d'affichage de la facture
                'invoice_display_settings' => $user->invoice_display_settings,
                'role' => $user->role,
                'allowed_menus' => $user->allowed_menus,
            ],
        ]);
    }

    /**
     * Inscription d'un nouveau professionnel.
     *
     * Cree le compte, genere un token Sanctum et retourne les donnees.
     * L'essai gratuit de 30 jours commence a partir de cette date.
     *
     * POST /api/register
     * Body: { name, email, password, password_confirmation, specialty?, phone? }
     * Response: { token, user }
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'specialty' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'specialty' => $request->specialty,
            'phone' => $request->phone,
        ]);

        $token = $user->createToken('liberalis-spa-token')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user], 201);
    }

    /**
     * Retourne le profil de l'utilisateur actuellement authentifie.
     *
     * Utilise par le frontend au demarrage pour valider que le token est toujours valide
     * et recuperer les infos a jour du professionnel.
     *
     * GET /api/me
     * Response: { user }
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    /**
     * Deconnexion — Revoque le token API courant.
     *
     * Le frontend doit ensuite supprimer le token de son localStorage.
     *
     * POST /api/logout
     * Response: { message }
     */
    public function logout(Request $request): JsonResponse
    {
        // Revoque uniquement le token utilise pour cette requete
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    /**
     * Changement de mot de passe.
     *
     * POST /api/change-password
     * Body: { current_password, password, password_confirmation }
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Mot de passe mis à jour avec succès.']);
    }
}
