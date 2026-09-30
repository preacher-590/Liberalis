<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\User;
use App\Notifications\AppointmentReminderEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests d'intégration et de sécurité pour la fonctionnalité de rappel de rendez-vous :
 * 1. Déclenchement réussi pour son propre rendez-vous (Email + payload WhatsApp).
 * 2. Isolation multi-tenant : interdiction formelle et 404 lors d'une tentative d'accès au RDV d'un confrère.
 * 3. Validation de l'indicateur email_sent selon la présence d'email client et les réglages utilisateur.
 */
class ReminderFeatureTest extends TestCase
{
    use RefreshDatabase;

    private User $userA;
    private User $userB;
    private Client $clientA;
    private Client $clientB;

    protected function setUp(): void
    {
        parent::setUp();

        // Praticien A avec cabinet et rappels actifs
        $this->userA = User::factory()->create([
            'name'            => 'Dr. Moussa Touré',
            'cabinet_name'    => 'Cabinet Médical Touré',
            'cabinet_address' => 'Plateau, Abidjan',
            'email_reminders' => true,
        ]);

        // Praticien B (confrère distinct pour le test d'étanchéité multi-tenant)
        $this->userB = User::factory()->create([
            'name'            => 'Me. Fatou Ndiaye',
            'cabinet_name'    => 'Cabinet Juridique Ndiaye',
            'email_reminders' => true,
        ]);

        // Client appartenant au praticien A
        $this->clientA = Client::create([
            'user_id'    => $this->userA->id,
            'first_name' => 'Awa',
            'last_name'  => 'Diop',
            'email'      => 'awa.diop@example.com',
            'phone'      => '+2250701020304',
        ]);

        // Client appartenant au praticien B
        $this->clientB = Client::create([
            'user_id'    => $this->userB->id,
            'first_name' => 'Ibrahim',
            'last_name'  => 'Diallo',
            'email'      => 'ibrahim.diallo@example.com',
            'phone'      => '+221770000000',
        ]);
    }

    /**
     * Teste qu'un praticien peut déclencher avec succès le rappel pour son propre RDV.
     * Vérifie que l'email est expédié, que l'attribut email_sent passe à true et que
     * le payload WhatsApp complet et formaté est renvoyé dans la réponse JSON.
     */
    public function test_user_can_trigger_reminder_for_own_appointment_with_email(): void
    {
        Notification::fake();

        $appointment = Appointment::create([
            'user_id'          => $this->userA->id,
            'client_id'        => $this->clientA->id,
            'type'             => 'Consultation Générale',
            'starts_at'        => now()->addDay()->setHour(14)->setMinute(30),
            'duration_minutes' => 45,
            'amount'           => 25000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        Sanctum::actingAs($this->userA);

        $response = $this->postJson("/api/appointments/{$appointment->id}/send-reminder");

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'email_sent',
                'whatsapp_data' => [
                    'phone',
                    'client_name',
                    'date_formatted',
                    'time_formatted',
                    'location',
                    'raw_message',
                ],
            ])
            ->assertJson([
                'success'    => true,
                'email_sent' => true,
                'whatsapp_data' => [
                    'phone'       => '+2250701020304',
                    'client_name' => 'Awa Diop',
                    'location'    => 'Cabinet Médical Touré',
                ],
            ]);

        // Vérification de l'envoi effectif de l'email via la façade Notification
        Notification::assertSentOnDemand(AppointmentReminderEmail::class);

        // Vérification de la persistance en base de données
        $this->assertTrue($appointment->fresh()->email_sent);

        // Vérification que le message WhatsApp brut contient bien les informations essentielles
        $rawMessage = $response->json('whatsapp_data.raw_message');
        $this->assertStringContainsString('Awa', $rawMessage);
        $this->assertStringContainsString('Cabinet Médical Touré', $rawMessage);
    }

    /**
     * Teste l'étanchéité multi-tenant : un praticien ne peut en AUCUN cas
     * déclencher un rappel pour le rendez-vous d'un confrère (doit retourner 404).
     */
    public function test_user_cannot_trigger_reminder_for_another_users_appointment(): void
    {
        Notification::fake();

        // RDV appartenant à l'utilisateur B
        $appointmentB = Appointment::create([
            'user_id'          => $this->userB->id,
            'client_id'        => $this->clientB->id,
            'type'             => 'Audit Fiscal',
            'starts_at'        => now()->addDays(2)->setHour(10)->setMinute(0),
            'duration_minutes' => 60,
            'amount'           => 100000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        // L'utilisateur A tente de déclencher le rappel pour le RDV de l'utilisateur B
        Sanctum::actingAs($this->userA);

        $response = $this->postJson("/api/appointments/{$appointmentB->id}/send-reminder");

        // Isolation multi-tenant stricte : doit renvoyer 404 (non trouvé dans le scope de userA)
        $response->assertNotFound();

        // Aucun email ne doit être émis et le statut ne doit pas être altéré
        Notification::assertNothingSent();
        $this->assertFalse($appointmentB->fresh()->email_sent);
    }

    /**
     * Teste que si le client n'a pas d'email, aucun email n'est expédié,
     * email_sent reste false, mais le payload WhatsApp est toujours correctement généré.
     */
    public function test_reminder_generates_whatsapp_data_without_sending_email_if_client_has_no_email(): void
    {
        Notification::fake();

        // Client sans email renseigné
        $clientNoEmail = Client::create([
            'user_id'    => $this->userA->id,
            'first_name' => 'Kouassi',
            'last_name'  => 'Yao',
            'email'      => null,
            'phone'      => '0709998877',
        ]);

        $appointment = Appointment::create([
            'user_id'          => $this->userA->id,
            'client_id'        => $clientNoEmail->id,
            'type'             => 'Séance de Contrôle',
            'starts_at'        => now()->addDay()->setHour(9)->setMinute(0),
            'duration_minutes' => 30,
            'amount'           => 15000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        Sanctum::actingAs($this->userA);

        $response = $this->postJson("/api/appointments/{$appointment->id}/send-reminder");

        $response->assertOk()
            ->assertJson([
                'success'    => true,
                'email_sent' => false,
            ]);

        Notification::assertNothingSent();
        $this->assertFalse($appointment->fresh()->email_sent);

        // Les données WhatsApp doivent être présentes malgré l'absence d'email
        $this->assertSame('0709998877', $response->json('whatsapp_data.phone'));
        $this->assertStringContainsString('Kouassi', $response->json('whatsapp_data.raw_message'));
    }

    /**
     * Teste que si le praticien a désactivé les rappels email dans ses préférences,
     * aucun email n'est expédié même si le client a un email.
     */
    public function test_reminder_respects_user_disabled_email_reminders(): void
    {
        Notification::fake();

        // Désactivation des rappels email pour le praticien
        $this->userA->update(['email_reminders' => false]);

        $appointment = Appointment::create([
            'user_id'          => $this->userA->id,
            'client_id'        => $this->clientA->id,
            'type'             => 'Consultation',
            'starts_at'        => now()->addDay()->setHour(11)->setMinute(0),
            'duration_minutes' => 30,
            'amount'           => 20000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        Sanctum::actingAs($this->userA);

        $response = $this->postJson("/api/appointments/{$appointment->id}/send-reminder");

        $response->assertOk()
            ->assertJson([
                'success'    => true,
                'email_sent' => false,
            ]);

        Notification::assertNothingSent();
        $this->assertFalse($appointment->fresh()->email_sent);
    }

    /**
     * Teste la résistance aux pannes (Fault Tolerance) :
     * Si le serveur SMTP (ex: Brevo) coupe la connexion ou lève une exception,
     * le contrôleur intercepte l'erreur, consigne l'incident dans les logs sans crasher (pas de 500),
     * positionne email_sent à false et renvoie les données formatées WhatsApp pour ne pas bloquer le praticien.
     */
    public function test_smtp_failure_is_handled_gracefully_and_returns_whatsapp_data(): void
    {
        // Simulation d'une panne réseau / SMTP lors de l'envoi de la notification
        $dispatcherMock = \Mockery::mock(\Illuminate\Contracts\Notifications\Dispatcher::class);
        $dispatcherMock->shouldReceive('send')
            ->once()
            ->andThrow(new \RuntimeException('SMTP server connection timed out: Connection refused'));

        $this->app->instance(\Illuminate\Contracts\Notifications\Dispatcher::class, $dispatcherMock);

        $appointment = Appointment::create([
            'user_id'          => $this->userA->id,
            'client_id'        => $this->clientA->id,
            'type'             => 'Consultation Urgente',
            'starts_at'        => now()->addDay()->setHour(15)->setMinute(0),
            'duration_minutes' => 30,
            'amount'           => 30000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        Sanctum::actingAs($this->userA);

        $response = $this->postJson("/api/appointments/{$appointment->id}/send-reminder");

        // L'API ne doit PAS retourner de code 500
        $response->assertOk()
            ->assertJson([
                'success'    => true,
                'email_sent' => false,
            ])
            ->assertJsonStructure([
                'success',
                'email_sent',
                'email_error',
                'whatsapp_data' => [
                    'phone',
                    'client_name',
                    'date_formatted',
                    'time_formatted',
                    'location',
                    'raw_message',
                ],
            ]);

        // L'erreur explicative doit être présente
        $this->assertNotNull($response->json('email_error'));

        // Les données WhatsApp doivent être intactes malgré la panne SMTP
        $this->assertSame('+2250701020304', $response->json('whatsapp_data.phone'));
        $this->assertStringContainsString('Awa', $response->json('whatsapp_data.raw_message'));

        // L'indicateur email_sent en base de données doit rester à false
        $this->assertFalse($appointment->fresh()->email_sent);
    }

    /**
     * Teste la résistance aux fuites d'informations (anti-oracle et anti-IDOR) :
     * Qu'un ID appartienne à un confrère ou qu'il soit totalement inexistant,
     * la réponse HTTP et son format sont strictement identiques (404 Not Found),
     * ne laissant filtrer aucune métadonnée médicale ou personnelle.
     */
    public function test_idor_probe_returns_identical_404_response_without_metadata(): void
    {
        Notification::fake();

        // RDV d'un confrère contenant des données sensibles
        $appointmentB = Appointment::create([
            'user_id'          => $this->userB->id,
            'client_id'        => $this->clientB->id,
            'type'             => 'Secret Médical Confidentiel',
            'starts_at'        => now()->addDay()->setHour(16)->setMinute(0),
            'duration_minutes' => 60,
            'amount'           => 50000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        Sanctum::actingAs($this->userA);

        // Tentative d'accès au RDV du confrère
        $responseOther = $this->postJson("/api/appointments/{$appointmentB->id}/send-reminder");
        $responseOther->assertNotFound();

        // Vérification formelle de non-fuite d'informations
        $this->assertNull($responseOther->json('whatsapp_data'));
        $this->assertStringNotContainsString('Secret Médical', $responseOther->getContent());
        $this->assertStringNotContainsString('Diallo', $responseOther->getContent());

        // Tentative d'accès à un ID totalement inexistant
        $responseNonExistent = $this->postJson('/api/appointments/999999/send-reminder');
        $responseNonExistent->assertNotFound();
        $this->assertSame($responseOther->status(), $responseNonExistent->status());
    }

    /**
     * Teste que la route est protégée par un rate limiter (throttle:10,1)
     * empêchant les attaques par force brute ou l'épuisement de quotas d'emails.
     */
    public function test_send_reminder_route_is_rate_limited(): void
    {
        Notification::fake();

        $appointment = Appointment::create([
            'user_id'          => $this->userA->id,
            'client_id'        => $this->clientA->id,
            'type'             => 'Consultation',
            'starts_at'        => now()->addDay()->setHour(14)->setMinute(0),
            'duration_minutes' => 30,
            'amount'           => 15000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ]);

        Sanctum::actingAs($this->userA);

        // 10 requêtes dans la même minute sont autorisées
        for ($i = 0; $i < 10; $i++) {
            $res = $this->postJson("/api/appointments/{$appointment->id}/send-reminder");
            $res->assertOk();
        }

        // La 11ème requête doit être rejetée avec 429 Too Many Requests
        $blockedResponse = $this->postJson("/api/appointments/{$appointment->id}/send-reminder");
        $blockedResponse->assertStatus(429);
    }

    /**
     * Teste qu'un identifiant de rendez-vous non numérique est immédiatement rejeté en 404
     * sans exécuter de requête Eloquent superflue.
     */
    public function test_non_numeric_appointment_id_returns_not_found(): void
    {
        Sanctum::actingAs($this->userA);

        $response = $this->postJson('/api/appointments/injection-string/send-reminder');
        $response->assertNotFound();
    }
}
