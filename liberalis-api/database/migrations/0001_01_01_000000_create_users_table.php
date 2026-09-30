<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Table users
 * Etend la table users par defaut de Laravel avec les champs
 * specifiques au professionnel liberal (cabinet, SMS, theme, etc.)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // --- Profil professionnel ---
            $table->string('specialty')->nullable();         // Ex: "Consultant en Droit des Affaires"
            $table->string('phone')->nullable();             // Telephone professionnel
            $table->string('cabinet_name')->nullable();      // Nom du cabinet
            $table->text('cabinet_address')->nullable();     // Adresse complete du cabinet
            $table->string('avatar_url')->nullable();        // URL de la photo de profil
            $table->string('payment_conditions')->nullable(); // Conditions de paiement par defaut
            // --- Facturation ---
            $table->string('invoice_prefix')->default('F-'); // Prefixe numero de facture

            // --- Rappels SMS ---
            $table->boolean('sms_reminders')->default(true);
            $table->string('sms_delay')->default('24h');     // '24h' | '2h' | 'both'
            $table->text('sms_template')->nullable();        // Template personnalise

            // --- Interface ---
            $table->string('theme')->default('light');       // 'light' | 'dark' | 'system'

            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
