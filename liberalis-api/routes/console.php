<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Rappels de rendez-vous par email — toutes les 15 minutes.
// En production, necessite soit un cron `php artisan schedule:run` chaque minute,
// soit un process `php artisan schedule:work` qui tourne en continu.
Schedule::command('appointments:send-reminders')->everyFifteenMinutes();
