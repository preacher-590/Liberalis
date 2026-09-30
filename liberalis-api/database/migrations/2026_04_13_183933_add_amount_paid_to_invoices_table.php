<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute le champ amount_paid à la table invoices.
 *
 * Ce champ représente la somme partiellement ou totalement versée par le client.
 * Il permet de calculer automatiquement le solde restant dû :
 *   solde = total - amount_paid
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Montant déjà versé par le client (0 par défaut = aucun paiement)
            $table->decimal('amount_paid', 12, 2)->default(0)->after('total');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('amount_paid');
        });
    }
};
