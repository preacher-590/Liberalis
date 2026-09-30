<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modele Appointment (Rendez-vous)
 *
 * Chaque RDV est associe a un client et appartient a un professionnel.
 * Le statut determine la couleur du bloc dans la grille agenda du frontend.
 */
class Appointment extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'type',
        'starts_at',
        'duration_minutes',
        'amount',
        'status',
        'notes',
        'email_sent',
    ];

    protected $casts = [
        'starts_at'        => 'datetime',
        'amount'           => 'decimal:2',
        'email_sent'       => 'boolean',
    ];

    // =========================================================
    // ACCESSEURS (Attributs calcules)
    // =========================================================

    /**
     * Calcule l'heure de fin du RDV a partir de l'heure de debut et de la duree.
     * Utilise pour positionner le bloc correctement dans la grille horaire.
     */
    public function getEndsAtAttribute()
    {
        return $this->starts_at->addMinutes($this->duration_minutes);
    }

    // =========================================================
    // RELATIONS ELOQUENT
    // =========================================================

    /** Le RDV appartient au professionnel */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Le RDV est associe a un client */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
