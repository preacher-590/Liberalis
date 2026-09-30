<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Table clients
 * Stocke les clients/dossiers de chaque professionnel.
 * Chaque client est isole par user_id (multi-tenant).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();

            // Relation avec le professionnel proprietaire (isolation multi-tenant)
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // --- Identite du client ---
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone');
            $table->string('profession')->nullable();         // Profession du client
            $table->date('date_of_birth')->nullable();
            $table->text('address')->nullable();

            // --- Gestion du dossier ---
            $table->text('notes')->nullable();               // Notes confidentielles du praticien
            $table->string('status')->default('nouveau');    // 'actif' | 'inactif' | 'nouveau'
            $table->string('ref_number')->nullable();        // Reference dossier auto-generee ex: #2026-0012

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
