<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Notifications\AppointmentReminderEmail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Commande: Envoi des rappels de rendez-vous par email
 *
 * Parcourt les RDV a venir dont le rappel n'a pas encore ete envoye
 * et notifie le client par email selon le delai configure par le
 * professionnel (email_delay: 1h, 2h, 24h ou both).
 *
 * Planifiee toutes les 15 minutes dans routes/console.php.
 */
class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Envoie les rappels email pour les rendez-vous a venir';

    public function handle(): int
    {
        $now = now();
        $sent = 0;
        $skipped = 0;

        // Fenetre large : tous les RDV des prochaines 24h (delai max possible),
        // non annules, dont le rappel n'a pas encore ete envoye.
        $appointments = Appointment::with(['user', 'client'])
            ->where('email_sent', false)
            ->where('status', '!=', 'annule')
            ->whereBetween('starts_at', [$now, $now->copy()->addHours(24)])
            ->get();

        foreach ($appointments as $appointment) {
            $user = $appointment->user;
            $client = $appointment->client;

            // Le professionnel a desactive les rappels, ou le client n'a pas d'email
            if (! $user || ! $user->email_reminders || ! $client || empty($client->email)) {
                $skipped++;
                continue;
            }

            // 'both' (24h + 2h) : un seul flag email_sent en base, donc le rappel
            // part au premier jalon atteint, soit 24h avant le RDV.
            $delayMinutes = match ($user->email_delay) {
                '1h'  => 60,
                '2h'  => 120,
                default => 1440, // '24h' et 'both'
            };

            // Pas encore dans la fenetre de rappel choisie par le professionnel
            if ($appointment->starts_at->gt($now->copy()->addMinutes($delayMinutes))) {
                continue;
            }

            Notification::route('mail', $client->email)
                ->notify(new AppointmentReminderEmail($appointment));

            $appointment->update(['email_sent' => true]);
            $sent++;
        }

        $this->info("Rappels envoyes : {$sent} | Ignores (sans email ou rappels desactives) : {$skipped}");

        return self::SUCCESS;
    }
}
