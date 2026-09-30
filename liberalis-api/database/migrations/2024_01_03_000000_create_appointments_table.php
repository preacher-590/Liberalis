<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Table appointments (Rendez-vous)
 * Chaque RDV est lie a un client et appartient a un professionnel.
 * Le statut colore les blocs dans la vue agenda du frontend.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');

            // --- Details du rendez-vous ---
            $table->string('type');                          // Ex: "Consultation Civile", "Divorce / Litige"
            $table->timestamp('starts_at');                  // Date et heure de debut
            $table->integer('duration_minutes');             // Duree en minutes (15, 30, 45, 60, 90, 120)
            $table->decimal('amount', 10, 2)->default(0);   // Tarif estime en FCFA

            // --- Statut ---
            // 'nouveau' = bleu, 'confirme' = vert, 'en_attente' = ambre, 'annule' = rouge
            $table->string('status')->default('nouveau');

            $table->text('notes')->nullable();               // Motif / notes internes
            $table->boolean('sms_sent')->default(false);     // Rappel SMS envoye au client ?

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
