<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Client;
use App\Models\User;
use App\Notifications\AppointmentReminderEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Tests de la commande appointments:send-reminders :
 * envoi dans la fenetre, exclusion des annules et hors-fenetre,
 * pas de double envoi, respect du toggle email_reminders.
 */
class AppointmentReminderTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email_reminders' => true,
            'email_delay'     => '24h',
        ]);

        $this->client = Client::create([
            'user_id'    => $this->user->id,
            'first_name' => 'Awa',
            'last_name'  => 'Diop',
            'email'      => 'awa.diop@example.com',
            'phone'      => '+221770000000',
        ]);
    }

    private function makeAppointment(array $overrides = []): Appointment
    {
        return Appointment::create(array_merge([
            'user_id'          => $this->user->id,
            'client_id'        => $this->client->id,
            'type'             => 'Consultation',
            'starts_at'        => now()->addHours(2),
            'duration_minutes' => 30,
            'amount'           => 15000,
            'status'           => 'confirme',
            'email_sent'       => false,
        ], $overrides));
    }

    public function test_envoie_le_rappel_pour_un_rdv_dans_la_fenetre(): void
    {
        Notification::fake();

        $rdv = $this->makeAppointment();

        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertSentOnDemand(AppointmentReminderEmail::class);
        $this->assertTrue($rdv->fresh()->email_sent);
    }

    public function test_ignore_les_rdv_annules_et_hors_fenetre(): void
    {
        Notification::fake();

        $annule = $this->makeAppointment(['status' => 'annule']);
        $lointain = $this->makeAppointment(['starts_at' => now()->addHours(30)]);

        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertFalse($annule->fresh()->email_sent);
        $this->assertFalse($lointain->fresh()->email_sent);
    }

    public function test_ne_renvoie_pas_deux_fois_le_meme_rappel(): void
    {
        Notification::fake();

        $this->makeAppointment();

        $this->artisan('appointments:send-reminders')->assertSuccessful();
        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertSentOnDemandTimes(AppointmentReminderEmail::class, 1);
    }

    public function test_respecte_la_desactivation_des_rappels(): void
    {
        Notification::fake();

        $this->user->update(['email_reminders' => false]);
        $rdv = $this->makeAppointment();

        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertFalse($rdv->fresh()->email_sent);
    }

    public function test_ignore_les_clients_sans_email(): void
    {
        Notification::fake();

        $this->client->update(['email' => null]);
        $rdv = $this->makeAppointment();

        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertFalse($rdv->fresh()->email_sent);
    }
}
