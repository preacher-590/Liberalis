<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modele User (Professionnel liberal)
 *
 * Represente un professionnel utilisant la plateforme Liberalis.
 * C'est le pivot central de toutes les donnees (clients, RDV, factures).
 * L'authentification est geree par Laravel Sanctum (tokens API).
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'specialty',
        'phone',
        'cabinet_name',
        'cabinet_address',
        'avatar_url',
        'invoice_prefix',
        'email_reminders',
        'email_delay',
        'email_template',
        'theme',
        'payment_conditions',
        'currency',
        'legal_mentions',
        'consultation_rates',
        // Préférences d'affichage sur les factures (JSON)
        'invoice_display_settings',
        // Statut de compte (gere par le super admin).
        // NB: 'role' est volontairement HORS fillable pour empecher
        // toute elevation de privileges par assignation de masse.
        'is_active',
        // Menus / modules autorises pour ce compte pro (gere par le super admin)
        'allowed_menus',
    ];

    /** Liste complète des menus modulaires de l'application */
    public const AVAILABLE_MENUS = ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'email_reminders' => 'boolean',
        'consultation_rates' => 'array',
        // Cast de la colonne JSON en tableau associatif PHP
        'invoice_display_settings' => 'array',
        'is_active' => 'boolean',
        'allowed_menus' => 'array',
    ];

    /**
     * Accesseur: Retourne les menus autorisés. Si null en base, tous les menus sont accordés par défaut.
     */
    public function getAllowedMenusAttribute($value): array
    {
        if ($value === null) {
            return self::AVAILABLE_MENUS;
        }

        $decoded = is_string($value) ? json_decode($value, true) : $value;
        return is_array($decoded) ? $decoded : self::AVAILABLE_MENUS;
    }

    // =========================================================
    // RELATIONS ELOQUENT
    // =========================================================

    /** Le professionnel possede des clients */
    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    /** Le professionnel possede des rendez-vous */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /** Le professionnel possede des factures */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /** Le professionnel a des notifications */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /** Le professionnel possede des comptes Mobile Money */
    public function comptesMobileMoney(): HasMany
    {
        return $this->hasMany(CompteMobileMoney::class);
    }

    /** Le professionnel possede des encaissements */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
