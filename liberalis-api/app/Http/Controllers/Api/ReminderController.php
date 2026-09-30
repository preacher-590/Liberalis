<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Notifications\AppointmentReminderEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * ReminderController — Déclenchement et synchronisation des rappels de rendez-vous
 *
 * Fonctionnalités clés et garanties de sécurité :
 * 1. Isolation multi-tenant hermétique : recherche exclusive parmi les RDV de l'utilisateur authentifié
 *    via $request->user()->appointments()->findOrFail($id). Tout accès non autorisé renvoie un 404 uniforme
 *    afin d'empêcher l'énumération d'identifiants (anti-IDOR) et la fuite de données médicales/clients.
 * 2. Tolérance aux pannes (Fault-tolerance) : l'envoi d'email est encapsulé dans un bloc try/catch (\Throwable).
 *    Si le serveur SMTP (ex: Brevo) est défaillant ou inaccessible, l'incident est consigné dans les logs
 *    sans crasher la requête (pas d'erreur 500), garantissant ainsi au praticien l'accès ininterrompu au
 *    payload WhatsApp pour finaliser son rappel pendant sa consultation.
 * 3. Données WhatsApp assainies et sécurisées : génération d'un message contextuel conforme et
 *    protection contre les interruptions de service.
 */
class ReminderController extends Controller
{
    /**
     * Déclenche l'envoi du rappel (Email avec repli gracieux + préparation du message WhatsApp).
     *
     * POST /api/appointments/{appointment}/send-reminder
     *
     * @param Request $request
     * @param int|string $id ID du rendez-vous
     * @return JsonResponse
     */
    public function sendReminder(Request $request, $id): JsonResponse
    {
        // 1. Isolation multi-tenant stricte : recherche exclusive parmi les RDV de l'utilisateur authentifié.
        // findOrFail garantit qu'un ID inexistant ou appartenant à un autre confrère retourne un 404 uniforme,
        // éliminant tout risque d'IDOR ou d'énumération par oracle d'erreur.
        $appointment = $request->user()
            ->appointments()
            ->with(['client', 'user'])
            ->findOrFail($id);

        $user = $request->user();
        $client = $appointment->client;
        $emailSent = false;
        $emailError = null;

        // 2. Traitement résilient du canal Email :
        // L'envoi via SMTP / Brevo est protégé par un try/catch pour éviter qu'une panne réseau ou SMTP externe
        // ne bloque la consultation du praticien.
        if ($user->email_reminders && $client && !empty($client->email)) {
            try {
                Notification::route('mail', $client->email)
                    ->notify(new AppointmentReminderEmail($appointment));

                // Persistance de l'état d'envoi réussi
                $appointment->update(['email_sent' => true]);
                $emailSent = true;
            } catch (\Throwable $e) {
                // Consigne l'erreur dans les logs pour audit système sans interrompre l'expérience utilisateur
                Log::error("Échec d'envoi du rappel email pour le RDV #{$appointment->id} : " . $e->getMessage(), [
                    'appointment_id' => $appointment->id,
                    'user_id'        => $user->id,
                    'client_email'   => $client->email,
                    'exception'      => $e->getMessage(),
                ]);

                $emailSent = false;
                $emailError = "Le serveur de messagerie est temporairement indisponible. Le rappel WhatsApp reste opérationnel.";
            }
        }

        // 3. Préparation des données formatées pour l'action WhatsApp (Afrique francophone)
        $dateFormatted = $appointment->starts_at->format('d/m/Y');
        $timeFormatted = $appointment->starts_at->format('H:i');
        $location = $user->cabinet_name ?: ($user->cabinet_address ?: 'Cabinet Libéralis');
        $clientFirstName = $client ? $client->first_name : 'Client';
        $practitioner = $user->name ? " avec *{$user->name}*" : '';

        // Message pré-formaté avec les marqueurs de mise en forme WhatsApp (*gras*, _italique_)
        $rawMessage = "Bonjour *{$clientFirstName}*,\n\n"
            . "Petit rappel pour votre rendez-vous{$practitioner} prévu le *{$dateFormatted}* à *{$timeFormatted}*.\n"
            . "📍 Lieu : *{$location}*\n\n"
            . "En cas d'empêchement, merci de nous prévenir au plus tôt afin de libérer ce créneau.\n\n"
            . "À très bientôt !\n"
            . "_{$location}_";

        // 4. Réponse JSON structurée et résiliente
        return response()->json([
            'success'       => true,
            'email_sent'    => $emailSent,
            'email_error'   => $emailError,
            'whatsapp_data' => [
                'phone'          => $client->phone ?? '',
                'client_name'    => $client ? $client->full_name : '',
                'date_formatted' => $dateFormatted,
                'time_formatted' => $timeFormatted,
                'location'       => $location,
                'raw_message'    => $rawMessage,
            ],
        ]);
    }
}
