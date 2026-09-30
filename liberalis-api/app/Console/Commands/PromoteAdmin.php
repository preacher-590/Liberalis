<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Commande: Promotion d'un utilisateur en super administrateur
 *
 * Le role n'etant pas assignable en masse (securite), cette commande
 * est le seul moyen de promouvoir/retrograder un compte.
 *
 * Usage:
 *   php artisan admin:promote email@exemple.com
 *   php artisan admin:promote email@exemple.com --demote
 */
class PromoteAdmin extends Command
{
    protected $signature = 'admin:promote {email : Email du compte} {--demote : Retrograde en professionnel classique}';

    protected $description = 'Promeut (ou retrograde avec --demote) un utilisateur en super administrateur';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->first();

        if (! $user) {
            $this->error("Aucun utilisateur avec l'email {$this->argument('email')}.");

            return self::FAILURE;
        }

        $role = $this->option('demote') ? 'pro' : 'admin';
        $user->forceFill(['role' => $role])->save();

        $this->info("{$user->name} ({$user->email}) est maintenant : {$role}.");

        return self::SUCCESS;
    }
}
