<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

/**
 * PaymentController — Encaissements (transactions)
 *
 * Liste et enregistre les paiements recus par le professionnel.
 * Alimente les transactions Mobile Money et les graphiques de revenus.
 */
class PaymentController extends Controller
{
    /**
     * Liste les paiements du professionnel, du plus recent au plus ancien.
     *
     * GET /api/payments
     * Query params:
     *   - method (string): filtre par moyen de paiement
     *   - per_page (int): pagination (defaut 20, max 200)
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->payments()->with('client');

        if ($request->filled('method')) {
            $query->where('method', $request->method);
        }

        $perPage = min(200, max(1, $request->integer('per_page', 20)));

        return response()->json($query->orderByDesc('paid_at')->paginate($perPage));
    }

    /**
     * Enregistre un paiement manuellement.
     *
     * POST /api/payments
     * Body: { amount, method, client_id?, invoice_id?, reference?, status?, paid_at?, notes? }
     */
    public function store(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $data = $request->validate([
            'amount'     => 'required|numeric|min:1',
            'method'     => 'required|string|max:100',
            'client_id'  => [
                'nullable', 'integer',
                Rule::exists('clients', 'id')->where('user_id', $userId),
            ],
            'invoice_id' => [
                'nullable', 'integer',
                Rule::exists('invoices', 'id')->where('user_id', $userId),
            ],
            'reference'  => 'nullable|string|max:100',
            'status'     => 'nullable|in:recu,en_attente,echoue',
            'paid_at'    => 'nullable|date',
            'notes'      => 'nullable|string',
        ]);

        $payment = Payment::create([
            'user_id'    => $userId,
            'client_id'  => $data['client_id'] ?? null,
            'invoice_id' => $data['invoice_id'] ?? null,
            'amount'     => $data['amount'],
            'method'     => $data['method'],
            'reference'  => $data['reference'] ?? Payment::generateReference(),
            'status'     => $data['status'] ?? 'recu',
            'paid_at'    => $data['paid_at'] ?? now(),
            'notes'      => $data['notes'] ?? null,
        ]);

        Cache::forget("dashboard_stats_user_{$userId}");

        return response()->json($payment->load('client'), 201);
    }

    /**
     * Supprime un paiement (saisie erronee).
     *
     * DELETE /api/payments/{id}
     */
    public function destroy(Request $request, Payment $payment): JsonResponse
    {
        abort_if($payment->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $payment->delete();

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json(['message' => 'Paiement supprime avec succes.']);
    }
}
