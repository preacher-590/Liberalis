<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Table notifications
 * Stocke les notifications en base pour le panneau de notification du frontend.
 * Les notifications sont creees automatiquement lors de certaines actions
 * (nouveau RDV, facture en retard, paiement recu, etc.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // --- Type de notification (pour choisir l'icone dans le frontend) ---
            // 'new_appointment' | 'invoice_overdue' | 'payment_received' | 'sms_reminder'
            $table->string('type');

            $table->string('title');                        // Titre court affiché en gras
            $table->text('body');                           // Description complete

            $table->json('data')->nullable();               // Donnees supplementaires (ex: client_id, invoice_id)

            $table->boolean('is_read')->default(false);     // Lue ou non-lue (badge rouge)

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
