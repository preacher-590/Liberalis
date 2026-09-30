<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modele Invoice (Facture)
 *
 * Une facture est composee de plusieurs lignes de prestation (InvoiceLine).
 * Le numero de facture est auto-genere selon le prefixe configure par le professionnel.
 */
class Invoice extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'invoice_number',
        'issued_at',
        'due_at',
        'subtotal',
        'discount',
        'total',
        'status',
        'notes',
        'payment_methods',
        'amount_paid',
    ];

    protected $casts = [
        'issued_at'       => 'date',
        'due_at'          => 'date',
        'payment_methods' => 'array',   // Deserialise automatiquement le champ JSON
        'subtotal'        => 'decimal:2',
        'discount'        => 'decimal:2',
        'total'           => 'decimal:2',
        'amount_paid'     => 'decimal:2',
    ];

    // =========================================================
    // METHODES STATIQUES
    // =========================================================

    /**
     * Genere le prochain numero de facture pour un professionnel.
     *
     * Utilise le prefixe configure dans le profil (ex: "F-")
     * suivi de l'annee en cours et d'un compteur sur 4 chiffres.
     * Exemple de resultat : F-2026-0012
     *
     * @param int $userId  L'ID du professionnel connecte
     * @return string      Le numero de facture genere
     */
    public static function generateNumber(int $userId): string
    {
        $user   = User::find($userId);
        $prefix = $user->invoice_prefix ?? 'F-';
        $year   = date('Y');

        // Compte le nombre de factures existantes pour cette annee
        $count  = self::where('user_id', $userId)
                      ->whereYear('created_at', $year)
                      ->count() + 1;

        return "{$prefix}{$year}-" . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    // =========================================================
    // RELATIONS ELOQUENT
    // =========================================================

    /** La facture a plusieurs lignes de prestation */
    public function lines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class);
    }

    /** La facture appartient a un client */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** La facture appartient au professionnel */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
