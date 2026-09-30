<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder principal — Donnees de demonstration Liberalis
 *
 * Cree un compte professionnel de test avec des clients, des RDV,
 * des factures et des notifications realistes pour l'Afrique francophone.
 *
 * Connexion demo : a.sow@cabinet.sn / password
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ===========================================================
        // 1. Professionnel principal (Maitre Amadou Sow)
        // ===========================================================
        $user = User::create([
            'name' => 'Maitre Amadou Sow',
            'email' => 'a.sow@cabinet.sn',
            'password' => Hash::make('password'),
            'specialty' => 'Consultant en Droit des Affaires',
            'phone' => '+221 77 123 45 67',
            'cabinet_name' => 'Cabinet Sow & Associes',
            'cabinet_address' => 'Immeuble Horizon, 4eme etage, Dakar Plateau, Senegal',
            'invoice_prefix' => 'F-',
            'email_reminders' => true,
            'theme' => 'light',
            'payment_conditions' => 'Paiement accepte par délai de 30 jours.',
        ]);

        // ===========================================================
        // 2. Clients representatifs (Afrique francophone)
        // ===========================================================
        $clientsData = [
            [
                'first_name' => 'Amadou',
                'last_name' => 'Diallo',
                'email' => 'a.diallo@gmail.com',
                'phone' => '+221 77 555 01 02',
                'profession' => 'Entrepreneur',
                'status' => 'actif',
            ],
            [
                'first_name' => 'Fatou',
                'last_name' => 'Toure',
                'email' => 'fatou.toure@outlook.fr',
                'phone' => '+221 33 800 00 00',
                'profession' => 'Commercante',
                'status' => 'nouveau',
            ],
            [
                'first_name' => 'Aline',
                'last_name' => 'Kouassi',
                'email' => 'a.kouassi@corp.ci',
                'phone' => '+225 07 44 33 22',
                'profession' => 'Directrice Financiere',
                'status' => 'actif',
            ],
            [
                'first_name' => 'Ibrahim',
                'last_name' => 'Sylla',
                'email' => 'ibrahim.sylla@legal.sn',
                'phone' => '+225 05 99 88 77',
                'profession' => 'Juriste',
                'status' => 'inactif',
            ],
            [
                'first_name' => 'Issa',
                'last_name' => 'Traore',
                'email' => 'issa.traore@gmail.com',
                'phone' => '+226 61 22 33 44',
                'profession' => 'Ingenieur',
                'status' => 'actif',
            ],
        ];

        $consultationTypes = [
            'Consultation Civile',
            'Divorce / Litige',
            'Successions',
            'Immobilier',
            'Redaction Contrat',
        ];

        $appointmentStatuses = ['confirme', 'en_attente', 'nouveau', 'confirme', 'en_attente'];
        $invoiceStatuses = ['payee', 'en_attente', 'en_retard', 'payee', 'en_attente'];

        foreach ($clientsData as $i => $data) {
            // Creer le client avec reference dossier auto-generee
            $client = Client::create(array_merge($data, [
                'user_id' => $user->id,
                'ref_number' => '#' . date('Y') . '-' . str_pad($i + 100, 4, '0', STR_PAD_LEFT),
                'notes' => 'Client reference depuis ' . date('Y') . '. Dossier en cours.',
            ]));

            // ===========================================================
            // Rendez-vous associe au client
            // ===========================================================
            Appointment::create([
                'user_id' => $user->id,
                'client_id' => $client->id,
                'type' => $consultationTypes[$i],
                'starts_at' => now()->addDays($i)->setTime(9 + $i, 0, 0),
                'duration_minutes' => 60,
                'amount' => 50000 * ($i + 1),
                'status' => $appointmentStatuses[$i],
                'notes' => 'Consultation initiale sur le dossier ' . $client->ref_number,
            ]);

            // ===========================================================
            // Facture associee au client
            // ===========================================================
            $amount = 75000 * ($i + 1);
            $invoice = Invoice::create([
                'user_id' => $user->id,
                'client_id' => $client->id,
                'invoice_number' => Invoice::generateNumber($user->id),
                'issued_at' => now()->subDays($i * 3),
                'due_at' => now()->addDays(30 - $i * 5),
                'subtotal' => $amount,
                'discount' => 0,
                'total' => $amount,
                'status' => $invoiceStatuses[$i],
                'payment_methods' => ['cash', 'orange_money'],
                'notes' => 'Paiement accepte par Mobile Money ou virement.',
            ]);

            // Ligne de prestation de la facture
            InvoiceLine::create([
                'invoice_id' => $invoice->id,
                'description' => 'Honoraires de ' . $consultationTypes[$i],
                'quantity' => 1,
                'unit_price' => $amount,
                'total' => $amount,
            ]);
        }

        // ===========================================================
        // 3. Notifications de demonstration
        // ===========================================================
        $notifications = [
            [
                'type' => 'invoice_overdue',
                'title' => 'Facture en retard',
                'body' => 'La facture F-' . date('Y') . '-0103 d\'Aline Kouassi est en retard de paiement.',
                'is_read' => false,
            ],
            [
                'type' => 'new_appointment',
                'title' => 'Nouveau rendez-vous',
                'body' => 'Amadou Diallo a pris rendez-vous pour demain a 09:00.',
                'is_read' => false,
            ],
            [
                'type' => 'payment_received',
                'title' => 'Paiement recu',
                'body' => '50 000 FCFA recus via Orange Money de Fatou Toure.',
                'is_read' => true,
            ],
        ];

        foreach ($notifications as $notif) {
            Notification::create(array_merge($notif, ['user_id' => $user->id]));
        }

        $this->command->info('✅ Seeder termine ! Connexion : a.sow@cabinet.sn / password');
    }
}
