<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modele InvoiceLine (Ligne de facture)
 *
 * Represente une prestation individuelle dans une facture.
 * Le total de chaque ligne est calcule cote serveur (quantity * unit_price).
 */
class InvoiceLine extends Model
{
    protected $fillable = [
        'invoice_id',
        'description',
        'quantity',
        'unit_price',
        'total',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'total'      => 'decimal:2',
    ];

    /** Appartient a une facture parente */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
