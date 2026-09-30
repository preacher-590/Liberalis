<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Permissions d'accès aux menus pour les profils professionnels
 *
 * Ajoute la colonne 'allowed_menus' (JSON nullable) sur la table 'users'.
 * Si null, l'utilisateur a accès à tous les modules par défaut.
 * Permet au Super Admin d'activer ou désactiver des fonctionnalités spécifiques (Agenda, Factures, etc.).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('allowed_menus')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('allowed_menus');
        });
    }
};
