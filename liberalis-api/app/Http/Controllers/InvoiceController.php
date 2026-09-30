<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Notification;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * InvoiceController — CRUD des factures (Feat 2)
 *
 * Gère la création de factures avec calcul automatique du total,
 * le suivi du statut de paiement et le marquage comme payée.
 *
 * Règle métier importante : Une facture avec le statut 'payee' est
 * strictement verrouillée en édition (tentatives rejetées avec 422).
 *
 * Sections logiques :
 * 1. Consultation et filtrage des factures (`index`)
 * 2. Création avec calcul automatique du sous-total/total (`store`)
 * 3. Consultation détaillée (`show`)
 * 4. Modification sous condition de statut non payé (`update`)
 * 5. Validation de règlement et création d'encaissement (`markPaid`)
 * 6. Suppression (`destroy`)
 */
class InvoiceController extends Controller
{
    /**
     * Liste les factures du professionnel avec filtre par statut.
     *
     * GET /api/invoices
     * Query params:
     *   - status (string): 'brouillon' | 'emise' | 'payee' | 'en_retard'
     *   - page (int): pagination
     *
     * Response: Paginated { data[], total, ... }
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->invoices()->with(['client', 'lines']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = $request->integer('per_page', 20);
        $perPage = min(200, max(1, $perPage));

        return response()->json($query->latest()->paginate($perPage));
    }

    /**
     * Cree une nouvelle facture avec ses lignes de prestation.
     *
     * Le sous-total est calcule automatiquement a partir des lignes.
     * Le numero de facture est auto-genere (ex: F-2026-0012).
     *
     * POST /api/invoices
     * Body: {
     *   client_id, issued_at, due_at, discount?, notes?, payment_methods?,
     *   lines: [{ description, quantity, unit_price }]
     * }
     * Response: Facture avec lignes et client (201)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id'              => 'required|integer|exists:clients,id',
            'issued_at'              => 'nullable|date',
            'due_at'                 => 'required|date',
            'status'                 => 'nullable|in:brouillon,emise,payee,en_retard,en_attente',
            'discount'               => 'nullable|numeric|min:0',
            'amount_paid'            => 'nullable|numeric|min:0',
            'notes'                  => 'nullable|string',
            'payment_methods'        => 'nullable|array',
            'payment_methods.*'      => 'string',
            'lines'                  => 'required|array|min:1',
            'lines.*.description'    => 'required|string|max:255',
            'lines.*.quantity'       => 'required|integer|min:1',
            'lines.*.unit_price'     => 'required|numeric|min:0',
        ]);

        $subtotal = collect($data['lines'])->sum(
            fn($line) => $line['quantity'] * $line['unit_price']
        );
        $total = max(0, $subtotal - ($data['discount'] ?? 0));

        // Controle du montant paye
        if (($data['amount_paid'] ?? 0) > $total) {
            return response()->json([
                'message' => 'Le montant payé ne peut pas être supérieur au total de la facture (' . number_format($total, 0, ',', ' ') . ' FCFA).',
                'errors' => ['amount_paid' => ['Le montant payé dépasse le total.']]
            ], 422);
        }

        $invoice = Invoice::create([
            'user_id'         => $request->user()->id,
            'client_id'       => $data['client_id'],
            'invoice_number'  => Invoice::generateNumber($request->user()->id),
            'issued_at'       => $data['issued_at'] ?? now()->toDateString(),
            'due_at'          => $data['due_at'],
            'subtotal'        => $subtotal,
            'discount'        => $data['discount'] ?? 0,
            'total'           => $total,
            'amount_paid'     => $data['amount_paid'] ?? 0,
            'status'          => $data['status'] ?? 'en_attente',
            'notes'           => $data['notes'] ?? null,
            'payment_methods' => $data['payment_methods'] ?? [],
        ]);

        foreach ($data['lines'] as $line) {
            $invoice->lines()->create([
                'description' => $line['description'],
                'quantity'    => $line['quantity'],
                'unit_price'  => $line['unit_price'],
                'total'       => $line['quantity'] * $line['unit_price'],
            ]);
        }

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($invoice->load(['client', 'lines']), 201);
    }


    /**
     * Retourne les details d'une facture avec ses lignes et le client.
     *
     * GET /api/invoices/{id}
     * Response: Invoice avec relations client et lines
     */
    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        return response()->json($invoice->load(['client', 'lines']));
    }

    /**
     * Met a jour une facture (statut, lignes, client, dates, remise, notes).
     *
     * PUT /api/invoices/{id}
     * Body: { client_id, issued_at, due_at, status, discount?, notes?, lines? }
     * Response: Invoice mise a jour avec client et lines
     */
    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        // Une facture payee est verrouillée — aucune modification autorisée
        if ($invoice->status === 'payee') {
            return response()->json([
                'message' => 'Cette facture a déjà été payée et ne peut plus être modifiée.',
            ], 422);
        }

        $data = $request->validate([
            'client_id'           => 'sometimes|integer|exists:clients,id',
            'issued_at'           => 'sometimes|date',
            'due_at'              => 'sometimes|date',
            'status'              => 'sometimes|in:brouillon,emise,payee,en_retard,en_attente',
            'discount'            => 'nullable|numeric|min:0',
            'amount_paid'         => 'nullable|numeric|min:0',
            'notes'               => 'nullable|string',
            'payment_methods'     => 'nullable|array',
            'payment_methods.*'   => 'string',
            'lines'               => 'sometimes|array|min:1',
            'lines.*.description' => 'required_with:lines|string|max:255',
            'lines.*.quantity'    => 'required_with:lines|integer|min:1',
            'lines.*.unit_price'  => 'required_with:lines|numeric|min:0',
        ]);

        // Recalcul des totaux si des lignes sont fournies
        if (!empty($data['lines'])) {
            $subtotal = collect($data['lines'])->sum(
                fn($line) => $line['quantity'] * $line['unit_price']
            );
            $data['subtotal'] = $subtotal;
            $data['total']    = max(0, $subtotal - ($data['discount'] ?? $invoice->discount));

            // Resynchronisation des lignes : suppression + recreation
            $invoice->lines()->delete();
            foreach ($data['lines'] as $line) {
                $invoice->lines()->create([
                    'description' => $line['description'],
                    'quantity'    => $line['quantity'],
                    'unit_price'  => $line['unit_price'],
                    'total'       => $line['quantity'] * $line['unit_price'],
                ]);
            }
            unset($data['lines']);
        } elseif (isset($data['discount'])) {
            // Recalcul du total si la remise change sans modification des lignes
            $data['total'] = max(0, $invoice->subtotal - $data['discount']);
        }

        // Controle du montant paye sur mise a jour
        $currentTotal = $data['total'] ?? $invoice->total;
        $newAmountPaid = $data['amount_paid'] ?? $invoice->amount_paid;

        if ($newAmountPaid > $currentTotal) {
            return response()->json([
                'message' => 'Le montant payé ne peut pas être supérieur au total de la facture.',
                'errors' => ['amount_paid' => ['Le montant payé dépasse le total.']]
            ], 422);
        }

        $invoice->update($data);

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($invoice->load(['client', 'lines']));
    }


    /**
     * Marque une facture comme payee et cree une notification de confirmation.
     *
     * PATCH /api/invoices/{id}/mark-paid
     * Response: Invoice avec statut 'payee'
     */
    public function markPaid(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        // Deja payee : ne pas dupliquer le paiement ni la notification
        if ($invoice->status === 'payee') {
            return response()->json($invoice->load(['client', 'lines']));
        }

        $invoice->update(['status' => 'payee']);
        $invoice->load('client');

        // Trace l'encaissement (alimente Mobile Money, dashboard et rapports)
        Payment::create([
            'user_id'    => $request->user()->id,
            'client_id'  => $invoice->client_id,
            'invoice_id' => $invoice->id,
            'amount'     => $invoice->total,
            'method'     => $invoice->payment_methods[0] ?? 'Autre',
            'reference'  => Payment::generateReference(),
            'status'     => 'recu',
            'paid_at'    => now(),
        ]);

        // Notification de confirmation de paiement (Feat 3)
        Notification::create([
            'user_id' => $request->user()->id,
            'type'    => 'payment_received',
            'title'   => 'Paiement confirme',
            'body'    => number_format($invoice->total, 0, ',', ' ') . ' FCFA recus de ' .
                         $invoice->client->full_name . ' pour la facture ' . $invoice->invoice_number,
            'data'    => ['invoice_id' => $invoice->id, 'client_id' => $invoice->client_id],
        ]);

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($invoice->load(['client', 'lines']));
    }

    /**
     * Supprime une facture.
     *
     * DELETE /api/invoices/{id}
     */
    public function destroy(Request $request, Invoice $invoice): JsonResponse
    {
        abort_if($invoice->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $invoice->delete();

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json(['message' => 'Facture supprimee avec succes.']);
    }
}
