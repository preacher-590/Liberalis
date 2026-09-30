<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Table payments (Encaissements)
 *
 * Trace chaque paiement recu par le professionnel (cash, Mobile Money,
 * virement...). Alimente les transactions de la page Mobile Money,
 * le graphique "Revenus 7 jours" du dashboard et les rapports.
 *
 * Backfill : les factures deja payees generent retroactivement un
 * paiement pour que les graphiques ne partent pas de zero.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();

            $table->decimal('amount', 12, 2);                // Montant en FCFA
            $table->string('method')->default('Autre');      // Ex: 'Orange Money', 'Wave', 'Cash', 'Virement'
            $table->string('reference')->nullable();         // Reference de transaction ex: TXN-A1B2C3
            $table->string('status')->default('recu');       // 'recu' | 'en_attente' | 'echoue'
            $table->timestamp('paid_at');                    // Date effective de l'encaissement
            $table->text('notes')->nullable();

            $table->timestamps();
        });

        // --- Backfill depuis les factures deja payees ---
        DB::table('invoices')->where('status', 'payee')->orderBy('id')
            ->each(function ($invoice) {
                $methods = json_decode($invoice->payment_methods ?? '[]', true) ?: [];

                DB::table('payments')->insert([
                    'user_id'    => $invoice->user_id,
                    'client_id'  => $invoice->client_id,
                    'invoice_id' => $invoice->id,
                    'amount'     => $invoice->total,
                    'method'     => $methods[0] ?? 'Autre',
                    'reference'  => 'TXN-' . strtoupper(substr(md5('backfill-' . $invoice->id), 0, 8)),
                    'status'     => 'recu',
                    'paid_at'    => $invoice->updated_at ?? $invoice->created_at ?? now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
