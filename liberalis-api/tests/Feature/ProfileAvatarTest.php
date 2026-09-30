<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests de la photo de profil : upload, remplacement, suppression,
 * rejet des fichiers invalides.
 */
class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->user = User::factory()->create();
        Sanctum::actingAs($this->user);
    }

    public function test_upload_d_une_photo_met_a_jour_avatar_url(): void
    {
        $response = $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('photo.jpg', 400, 400),
        ]);

        $response->assertOk();
        $avatarUrl = $response->json('avatar_url');

        $this->assertNotEmpty($avatarUrl);
        $this->assertStringContainsString('/storage/avatars/', $avatarUrl);

        // Le fichier est bien present sur le disque public
        $chemin = str_replace(url('/storage') . '/', '', $avatarUrl);
        Storage::disk('public')->assertExists($chemin);
    }

    public function test_remplacer_la_photo_supprime_l_ancienne_du_disque(): void
    {
        $premiere = $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('premiere.jpg'),
        ])->json('avatar_url');
        $ancienChemin = str_replace(url('/storage') . '/', '', $premiere);

        $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('seconde.png'),
        ])->assertOk();

        Storage::disk('public')->assertMissing($ancienChemin);
    }

    public function test_supprimer_la_photo_vide_avatar_url_et_le_disque(): void
    {
        $avatarUrl = $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('photo.jpg'),
        ])->json('avatar_url');
        $chemin = str_replace(url('/storage') . '/', '', $avatarUrl);

        $this->deleteJson('/api/profile/avatar')
            ->assertOk()
            ->assertJsonPath('avatar_url', null);

        Storage::disk('public')->assertMissing($chemin);
    }

    public function test_rejette_un_fichier_non_image_ou_trop_lourd(): void
    {
        $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors(['avatar']);

        $this->postJson('/api/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('grosse.jpg')->size(3000), // 3 Mo
        ])->assertUnprocessable()->assertJsonValidationErrors(['avatar']);
    }
}
