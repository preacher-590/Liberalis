<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modele Notification
 *
 * Stocke les notifications persistantes du professionnel.
 * Elles sont creees automatiquement par les controllers (nouveau RDV, facture...).
 * Le frontend affiche un badge rouge avec le nombre de notifications non-lues.
 */
class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',    // 'new_appointment' | 'invoice_overdue' | 'payment_received'
        'title',
        'body',
        'data',
        'is_read',
    ];

    protected $casts = [
        'data'    => 'array',   // JSON storee en BDD, deserialise automatiquement
        'is_read' => 'boolean',
    ];

    /** Appartient au professionnel */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
