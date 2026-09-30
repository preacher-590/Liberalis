<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Tables invoices + invoice_lines
 * Une facture est composee de plusieurs lignes de prestation.
 * Le sous-total et total sont calcules automatiquement dans le controlleur.
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- Table principale des factures ---
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->constrained()->onDelete('cascade');

            // --- Identification ---
            $table->string('invoice_number')->unique();     // Auto-genere ex: F-2026-0091
            $table->date('issued_at');                      // Date d'emission
            $table->date('due_at');                         // Date d'echeance

            // --- Calculs financiers en FCFA ---
            $table->decimal('subtotal', 12, 2);             // Somme des lignes avant remise
            $table->decimal('discount', 12, 2)->default(0); // Remise en FCFA
            $table->decimal('total', 12, 2);                // subtotal - discount

            // --- Statut ---
            // 'brouillon' | 'emise' | 'payee' | 'en_retard'
            $table->string('status')->default('brouillon');

            $table->text('notes')->nullable();              // Mentions legales, conditions
            $table->json('payment_methods')->nullable();    // ['cash', 'orange_money', 'wave', 'mtn']

            $table->timestamps();
        });

        // --- Lignes de prestation de chaque facture ---
        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->id();

            $table->foreignId('invoice_id')->constrained()->onDelete('cascade');

            $table->string('description');                  // Ex: "Honoraires de consultation"
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);           // Prix unitaire FCFA
            $table->decimal('total', 10, 2);                // quantity * unit_price, calcule cote serveur

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_lines');
        Schema::dropIfExists('invoices');
    }
};
