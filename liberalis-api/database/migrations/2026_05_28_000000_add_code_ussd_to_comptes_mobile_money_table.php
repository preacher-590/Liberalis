<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('comptes_mobile_money', function (Blueprint $table) {
            // Code USSD personnalisé (ex: *144*1*{montant}#{numero}#)
            // {montant} sera remplacé dynamiquement par le montant saisi
            $table->string('code_ussd', 100)->nullable()->after('numero');
        });
    }

    public function down(): void
    {
        Schema::table('comptes_mobile_money', function (Blueprint $table) {
            $table->dropColumn('code_ussd');
        });
    }
};
