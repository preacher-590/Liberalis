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
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['sms_reminders', 'sms_delay', 'sms_template']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('sms_sent');
            $table->boolean('email_sent')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('email_sent');
            $table->boolean('sms_sent')->default(false);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('sms_reminders')->default(true);
            $table->string('sms_delay')->default('24h');
            $table->text('sms_template')->nullable();
        });
    }
};
