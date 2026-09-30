<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modele Client
 *
 * Represente un client dans le dossier d'un professionnel.
 * Un client peut avoir plusieurs rendez-vous et plusieurs factures.
 * Il est isole par user_id pour garantir la confidentialite (multi-tenant).
 */
class Client extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'profession',
        'date_of_birth',
        'address',
        'notes',
        'status',
        'ref_number',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    // =========================================================
    // ACCESSEURS (Attributs calcules)
    // =========================================================

    /**
     * Retourne le nom complet du client (prenom + nom).
     * Utilise dans les notifications et les rappels email.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    // =========================================================
    // RELATIONS ELOQUENT
    // =========================================================

    /** Le client appartient a un professionnel */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Le client peut avoir plusieurs rendez-vous */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    /** Le client peut avoir plusieurs factures */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
