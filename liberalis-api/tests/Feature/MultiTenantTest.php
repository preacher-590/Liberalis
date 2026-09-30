<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests d'isolation multi-tenant : un professionnel ne doit JAMAIS
 * pouvoir voir ou modifier les donnees d'un autre professionnel.
 */
class MultiTenantTest extends TestCase
{
    use RefreshDatabase;

    private User $userA;
    private User $userB;
    private Client $clientB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->userA = User::factory()->create();
        $this->userB = User::factory()->create();

        $this->clientB = Client::create([
            'user_id'    => $this->userB->id,
            'first_name' => 'Awa',
            'last_name'  => 'Diop',
            'phone'      => '+221770000000',
        ]);
    }

    public function test_un_utilisateur_ne_peut_pas_voir_le_client_d_un_autre(): void
    {
        Sanctum::actingAs($this->userA);

        $this->getJson("/api/clients/{$this->clientB->id}")->assertForbidden();
    }

    public function test_la_liste_des_clients_ne_contient_que_ses_propres_clients(): void
    {
        Client::create([
            'user_id'    => $this->userA->id,
            'first_name' => 'Moussa',
            'last_name'  => 'Traore',
            'phone'      => '+221780000000',
        ]);

        Sanctum::actingAs($this->userA);

        $response = $this->getJson('/api/clients')->assertOk();
        $names = collect($response->json('data') ?? $response->json())->pluck('first_name');

        $this->assertTrue($names->contains('Moussa'));
        $this->assertFalse($names->contains('Awa'));
    }

    public function test_un_utilisateur_ne_peut_pas_marquer_payee_la_facture_d_un_autre(): void
    {
        $invoiceB = Invoice::create([
            'user_id'        => $this->userB->id,
            'client_id'      => $this->clientB->id,
            'invoice_number' => 'F-2026-0001',
            'issued_at'      => now()->toDateString(),
            'due_at'         => now()->addDays(30)->toDateString(),
            'subtotal'       => 50000,
            'discount'       => 0,
            'total'          => 50000,
            'status'         => 'en_attente',
        ]);

        Sanctum::actingAs($this->userA);

        $this->patchJson("/api/invoices/{$invoiceB->id}/mark-paid")->assertForbidden();
        $this->assertSame('en_attente', $invoiceB->fresh()->status);
    }

    public function test_un_utilisateur_ne_peut_pas_creer_un_paiement_pour_le_client_d_un_autre(): void
    {
        Sanctum::actingAs($this->userA);

        $this->postJson('/api/payments', [
            'amount'    => 10000,
            'method'    => 'Orange Money',
            'client_id' => $this->clientB->id,
        ])->assertUnprocessable()->assertJsonValidationErrors(['client_id']);
    }
}
