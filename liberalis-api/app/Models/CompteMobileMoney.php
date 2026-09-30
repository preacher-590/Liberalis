<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle CompteMobileMoney (Compte de paiement Mobile Money)
 *
 * Représente un compte bancaire/mobile (Wave Pay, Orange Money, MTN, Free Money)
 * rattaché à un professionnel. Permet la génération de liens et codes USSD
 * pour l'encaissement direct des prestations.
 */
class CompteMobileMoney extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'comptes_mobile_money';

    protected $fillable = [
        'user_id',
        'operateur',
        'numero',
        'code_ussd',
        'est_actif',
    ];

    protected $casts = [
        'est_actif' => 'boolean',
    ];

    /**
     * Appends les accessors à la sérialisation JSON.
     */
    protected $appends = ['initiales', 'couleur_avatar'];

    // ─────────────────────────────────────────────
    // Relations
    // ─────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─────────────────────────────────────────────
    // Accessors
    // ─────────────────────────────────────────────

    /**
     * Retourne les initiales de l'opérateur (2 premières lettres de chaque mot).
     * Exemples :
     *   "Orange Money"     → "OM"
     *   "Wave Pay"         → "WP"
     *   "MTN Mobile Money" → "MM"  (1re lettre du 1er mot + 1re lettre du dernier mot)
     */
    protected function initiales(): Attribute
    {
        return Attribute::make(
            get: function () {
                $mots = array_filter(explode(' ', $this->operateur));
                if (count($mots) === 0) {
                    return '??';
                }
                if (count($mots) === 1) {
                    return strtoupper(substr($mots[0], 0, 2));
                }
                // On prend la 1ère lettre du premier mot et la 1ère lettre du dernier mot
                $mots = array_values($mots);
                return strtoupper(
                    substr($mots[0], 0, 1) . substr($mots[count($mots) - 1], 0, 1)
                );
            }
        );
    }

    /**
     * Retourne la couleur hex associée à l'opérateur.
     */
    protected function couleurAvatar(): Attribute
    {
        return Attribute::make(
            get: function () {
                return match ($this->operateur) {
                    'Orange Money'     => '#F97316',
                    'Wave Pay'         => '#3B82F6',
                    'MTN Mobile Money' => '#EAB308',
                    'Free Money'       => '#8B5CF6',
                    default            => '#6B7280',
                };
            }
        );
    }
}
