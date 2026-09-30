<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Modele Payment (Encaissement)
 *
 * Represente un paiement recu par le professionnel, quel que soit
 * le canal (Mobile Money, cash, virement...). Peut etre rattache a
 * une facture et/ou un client, ou saisi librement.
 */
class Payment extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'invoice_id',
        'amount',
        'method',
        'reference',
        'status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    // =========================================================
    // METHODES STATIQUES
    // =========================================================

    /** Genere une reference de transaction unique ex: TXN-4F9A2C1B */
    public static function generateReference(): string
    {
        return 'TXN-' . strtoupper(Str::random(8));
    }

    // =========================================================
    // RELATIONS ELOQUENT
    // =========================================================

    /** Le paiement appartient au professionnel */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Le paiement peut etre rattache a un client */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** Le paiement peut etre rattache a une facture */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
