<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests d'authentification (login, credentials invalides, routes protegees).
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_avec_identifiants_valides_retourne_un_token(): void
    {
        $user = User::factory()->create([
            'email'    => 'pro@liberalis.test',
            'password' => 'motdepasse123',
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'pro@liberalis.test',
            'password' => 'motdepasse123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']])
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_login_avec_mauvais_mot_de_passe_echoue(): void
    {
        User::factory()->create([
            'email'    => 'pro@liberalis.test',
            'password' => 'motdepasse123',
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'pro@liberalis.test',
            'password' => 'mauvais-mdp',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['email']);
    }

    public function test_route_protegee_sans_token_retourne_401(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->getJson('/api/dashboard/stats')->assertUnauthorized();
        $this->getJson('/api/payments')->assertUnauthorized();
    }
}
