<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification par email de rappel de rendez-vous
 *
 * Construit l'email personnalisé en remplaçant les variables dynamiques ({nom_client},
 * {nom_docteur}, {date_rdv}, {heure_rdv}) dans le modèle configuré par le praticien.
 */
class AppointmentReminderEmail extends Notification implements ShouldQueue
{
    use Queueable;

    public $appointment;

    /**
     * Create a new notification instance.
     */
    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $user = $this->appointment->user;
        $client = $this->appointment->client;
        
        $template = $user->email_template ?? "Bonjour {nom_client},\n\nNous vous rappelons votre rendez-vous avec {nom_docteur} le {date_rdv} à {heure_rdv}.\n\nMerci de nous contacter si vous souhaitez annuler ou reporter.\n\nCordialement.";
        
        $date_rdv = $this->appointment->starts_at->format('d/m/Y');
        $heure_rdv = $this->appointment->starts_at->format('H:i');

        $content = str_replace(
            ['{nom_client}', '{nom_docteur}', '{date_rdv}', '{heure_rdv}'],
            [$client->first_name . ' ' . $client->last_name, $user->name, $date_rdv, $heure_rdv],
            $template
        );

        return (new MailMessage)
                    ->subject('Rappel de votre rendez-vous avec ' . $user->name)
                    ->greeting('Bonjour ' . $client->first_name . ',')
                    ->line($content)
                    ->action('Gérer mon rendez-vous', url('/'))
                    ->salutation('Cordialement, le cabinet de ' . $user->name);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'appointment_id' => $this->appointment->id,
            'client_id' => $this->appointment->client_id,
        ];
    }
}
