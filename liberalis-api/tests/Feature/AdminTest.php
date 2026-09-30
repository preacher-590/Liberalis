<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests du super administrateur : acces reserve, liste des comptes,
 * activation/desactivation avec revocation des sessions.
 */
class AdminTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $pro;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->forceFill(['role' => 'admin'])->save();

        $this->pro = User::factory()->create(['password' => 'motdepasse123']);
    }

    public function test_un_professionnel_ne_peut_pas_acceder_aux_routes_admin(): void
    {
        Sanctum::actingAs($this->pro);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/admin/stats')->assertForbidden();
        $this->patchJson("/api/admin/users/{$this->admin->id}/toggle-active")->assertForbidden();
    }

    public function test_le_dashboard_admin_retourne_les_stats_plateforme(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/stats')->assertOk()
            ->assertJsonStructure([
                'users_total', 'users_active', 'users_new_month',
                'clients_total', 'appointments_total', 'invoices_total',
                'volume_encaisse', 'rappels_envoyes',
                'inscriptions_mensuelles', 'specialites', 'derniers_inscrits',
            ]);

        // 2 comptes crees dans setUp, tous actifs et inscrits ce mois
        $this->assertSame(2, $response->json('users_total'));
        $this->assertSame(2, $response->json('users_active'));
        $this->assertSame(2, $response->json('users_new_month'));

        // 12 mois glissants, le mois courant contient les 2 inscriptions
        $mois = $response->json('inscriptions_mensuelles');
        $this->assertCount(12, $mois);
        $this->assertSame(2, end($mois)['value']);

        // Les derniers inscrits n'exposent que des infos de compte (pas de donnees metier)
        $inscrit = $response->json('derniers_inscrits.0');
        $this->assertArrayHasKey('email', $inscrit);
        $this->assertArrayNotHasKey('password', $inscrit);
    }

    public function test_l_admin_voit_la_liste_des_comptes_avec_compteurs(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/users')->assertOk();
        $emails = collect($response->json('data'))->pluck('email');

        $this->assertTrue($emails->contains($this->pro->email));
        $this->assertArrayHasKey('clients_count', $response->json('data.0'));
    }

    public function test_desactiver_un_compte_revoque_ses_sessions_et_bloque_le_login(): void
    {
        // Le professionnel a une session active
        $this->pro->createToken('session-active');
        $this->assertSame(1, $this->pro->tokens()->count());

        Sanctum::actingAs($this->admin);
        $this->patchJson("/api/admin/users/{$this->pro->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('is_active', false);

        // Sessions coupees immediatement
        $this->assertSame(0, $this->pro->tokens()->count());

        // Reconnexion refusee
        $this->postJson('/api/login', [
            'email'    => $this->pro->email,
            'password' => 'motdepasse123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email']);

        // Reactivation : le login refonctionne
        $this->patchJson("/api/admin/users/{$this->pro->id}/toggle-active")
            ->assertOk()
            ->assertJsonPath('is_active', true);

        $this->postJson('/api/login', [
            'email'    => $this->pro->email,
            'password' => 'motdepasse123',
        ])->assertOk();
    }

    public function test_l_admin_ne_peut_pas_se_desactiver_lui_meme(): void
    {
        Sanctum::actingAs($this->admin);

        $this->patchJson("/api/admin/users/{$this->admin->id}/toggle-active")
            ->assertUnprocessable();

        $this->assertTrue($this->admin->fresh()->is_active);
    }

    public function test_le_role_ne_peut_pas_etre_modifie_via_le_profil(): void
    {
        Sanctum::actingAs($this->pro);

        $this->patchJson('/api/profile', ['name' => 'Nouveau Nom', 'role' => 'admin'])
            ->assertOk();

        // Le nom change mais le role reste 'pro' (pas d'elevation de privileges)
        $this->assertSame('pro', $this->pro->fresh()->role);
    }

    public function test_l_admin_peut_modifier_les_permissions_de_menu_d_un_pro(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->patchJson("/api/admin/users/{$this->pro->id}/menus", [
            'allowed_menus' => ['agenda', 'clients'],
        ])->assertOk();

        $this->assertSame(['agenda', 'clients'], $response->json('allowed_menus'));
        $this->assertSame(['agenda', 'clients'], $this->pro->fresh()->allowed_menus);
    }

    public function test_un_professionnel_ne_peut_pas_modifier_ses_propres_menus(): void
    {
        Sanctum::actingAs($this->pro);

        $this->patchJson("/api/admin/users/{$this->pro->id}/menus", [
            'allowed_menus' => ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'],
        ])->assertForbidden();
    }

    public function test_les_menus_d_un_administrateur_ne_peuvent_pas_etre_restreints(): void
    {
        Sanctum::actingAs($this->admin);

        // Tentative de restreindre les menus du Super Admin
        $this->patchJson("/api/admin/users/{$this->admin->id}/menus", [
            'allowed_menus' => ['agenda'],
        ])->assertUnprocessable();

        // Les menus restent complets par défaut
        $this->assertSame(
            ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'],
            $this->admin->fresh()->allowed_menus
        );
    }
}

