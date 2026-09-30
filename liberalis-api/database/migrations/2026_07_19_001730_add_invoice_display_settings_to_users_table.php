<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Ajoute les préférences d'affichage de la facture
 * pour permettre de masquer/afficher les informations utilisateur.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Paramètres d'affichage personnalisés (JSON) pour les factures
            $table->json('invoice_display_settings')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('invoice_display_settings');
        });
    }
};
