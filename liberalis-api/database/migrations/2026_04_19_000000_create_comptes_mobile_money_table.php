<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('comptes_mobile_money', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('operateur', 50);
            $table->string('numero', 20);
            $table->boolean('est_actif')->default(true);
            $table->softDeletes();
            $table->timestamps();

            // Un utilisateur ne peut pas avoir deux comptes du même opérateur
            $table->unique(['user_id', 'operateur']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comptes_mobile_money');
    }
};
