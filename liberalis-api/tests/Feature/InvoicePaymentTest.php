<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests du cycle facturation → paiement :
 * calcul des totaux, mark-paid, creation d'encaissement, rapports.
 */
class InvoicePaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->client = Client::create([
            'user_id'    => $this->user->id,
            'first_name' => 'Fatou',
            'last_name'  => 'Toure',
            'phone'      => '+221770000001',
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_creation_facture_calcule_les_totaux_avec_remise(): void
    {
        $response = $this->postJson('/api/invoices', [
            'client_id' => $this->client->id,
            'due_at'    => now()->addDays(30)->toDateString(),
            'discount'  => 5000,
            'lines'     => [
                ['description' => 'Consultation', 'quantity' => 2, 'unit_price' => 25000],
                ['description' => 'Redaction acte', 'quantity' => 1, 'unit_price' => 15000],
            ],
        ]);

        // Sous-total = 2×25000 + 15000 = 65000 ; total = 65000 - 5000 = 60000
        $response->assertCreated()
            ->assertJsonPath('subtotal', '65000.00')
            ->assertJsonPath('total', '60000.00');
    }

    public function test_mark_paid_cree_un_encaissement_sans_doublon(): void
    {
        $invoice = $this->postJson('/api/invoices', [
            'client_id'       => $this->client->id,
            'due_at'          => now()->addDays(30)->toDateString(),
            'payment_methods' => ['Orange Money'],
            'lines'           => [['description' => 'Consultation', 'quantity' => 1, 'unit_price' => 42000]],
        ])->json();

        // Premier mark-paid : statut payee + encaissement cree
        $this->patchJson("/api/invoices/{$invoice['id']}/mark-paid")
            ->assertOk()
            ->assertJsonPath('status', 'payee');

        // Second mark-paid : pas de doublon
        $this->patchJson("/api/invoices/{$invoice['id']}/mark-paid")->assertOk();

        $payments = Payment::where('invoice_id', $invoice['id'])->get();
        $this->assertCount(1, $payments);
        $this->assertSame('Orange Money', $payments->first()->method);
        $this->assertSame('recu', $payments->first()->status);
        $this->assertEquals(42000, (float) $payments->first()->amount);
    }

    public function test_rapport_summary_agrege_les_encaissements(): void
    {
        Payment::create([
            'user_id' => $this->user->id,
            'amount'  => 30000,
            'method'  => 'Wave',
            'status'  => 'recu',
            'paid_at' => now(),
        ]);
        Payment::create([
            'user_id' => $this->user->id,
            'amount'  => 20000,
            'method'  => 'Wave',
            'status'  => 'recu',
            'paid_at' => now(),
        ]);
        // Paiement echoue : ne doit PAS compter dans les revenus
        Payment::create([
            'user_id' => $this->user->id,
            'amount'  => 99000,
            'method'  => 'Wave',
            'status'  => 'echoue',
            'paid_at' => now(),
        ]);

        $response = $this->getJson('/api/rapports/summary')->assertOk()
            ->assertJsonStructure(['revenus_mensuels', 'consultations', 'paiements']);

        $paiements = collect($response->json('paiements'));
        $this->assertEquals(50000, $paiements->firstWhere('name', 'Wave')['value']);

        // Le mois courant doit refleter les 50 000 FCFA recus
        $moisCourant = collect($response->json('revenus_mensuels'))->last();
        $this->assertEquals(50000, $moisCourant['revenue']);
    }

    public function test_dashboard_stats_inclut_les_revenus_7_jours(): void
    {
        Payment::create([
            'user_id' => $this->user->id,
            'amount'  => 15000,
            'method'  => 'Cash',
            'status'  => 'recu',
            'paid_at' => now(),
        ]);

        $response = $this->getJson('/api/dashboard/stats')->assertOk();

        $jours = $response->json('revenus_7_jours');
        $this->assertCount(7, $jours);
        $this->assertEquals(15000, end($jours)['value']); // aujourd'hui = dernier element
    }
}
