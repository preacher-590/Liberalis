<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * AppointmentController — CRUD des rendez-vous (Feat 6)
 *
 * Gère la création, modification et suppression des RDV.
 * - La création d'un RDV génère automatiquement une notification (Feat 3).
 * - Les RDV peuvent être filtrés par semaine pour la vue agenda.
 * - Détection automatique du chevauchement de créneaux (overlap).
 *
 * Sections logiques :
 * 1. Consultation et filtrage par semaine/client (`index`)
 * 2. Création avec validation anti-chevauchement et notification (`store`)
 * 3. Modification et mise à jour de créneau (`update`)
 * 4. Annulation / Suppression (`destroy`)
 */
class AppointmentController extends Controller
{
    /**
     * Liste les RDV de la semaine pour la vue agenda.
     *
     * GET /api/appointments
     * Query params:
     *   - week (date): une date dans la semaine cible (ex: 2026-04-14)
     *                  Par defaut: semaine courante
     *
     * Response: Appointment[] avec relation client
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
            ->appointments()
            ->with('client')
            ->orderBy('starts_at', 'desc');

        // Filtre par client (pour l'historique dans la fiche client)
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        // Si all=1, retourne tous les RDV sans filtre de semaine
        if (!$request->boolean('all') && !$request->filled('client_id')) {
            $start = $request->filled('week')
                ? now()->parse($request->week)->startOfWeek()
                : now()->startOfWeek();
            $end = $start->copy()->endOfWeek();
            $query->whereBetween('starts_at', [$start, $end]);
        }

        return response()->json($query->get());
    }


    /**
     * Cree un nouveau rendez-vous et genere une notification automatique.
     *
     * POST /api/appointments
     * Body: { client_id, type, starts_at, duration_minutes, amount?, notes? }
     * Response: Appointment cree avec relation client (201)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id'         => 'required|integer|exists:clients,id',
            'type'              => 'required|string|max:255',
            'starts_at'         => 'required|date',
            'duration_minutes'  => 'required|integer|in:15,30,45,60,90,120',
            'amount'            => 'nullable|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        $start = \Illuminate\Support\Carbon::parse($data['starts_at']);
        $end = (clone $start)->addMinutes($data['duration_minutes']);

        if ($start->isBefore(now()->subMinutes(5))) {
            return response()->json([
                'message' => 'Impossible de planifier un rendez-vous dans le passé.',
                'errors' => ['starts_at' => ['La date du rendez-vous est déjà passée.']]
            ], 422);
        }

        $dayAppointments = $request->user()->appointments()
            ->whereDate('starts_at', $start->toDateString())
            ->get();

        foreach ($dayAppointments as $apt) {
            $aptStart = \Illuminate\Support\Carbon::parse($apt->starts_at);
            $aptEnd = (clone $aptStart)->addMinutes($apt->duration_minutes);

            if ($aptStart->lt($end) && $aptEnd->gt($start)) {
                return response()->json([
                    'message' => 'Ce créneau horaire chevauche un rendez-vous existant.',
                    'errors' => ['starts_at' => ['Un rendez-vous est déjà planifié sur ce créneau.']]
                ], 422);
            }
        }

        $data['user_id'] = $request->user()->id;
        $data['status']  = 'nouveau';   // Statut initial = bleu dans l'agenda

        $appointment = Appointment::create($data);
        $appointment->load('client');   // Charge le nom du client pour la notification

        // Cree une notification visible dans le panneau (Feat 3)
        Notification::create([
            'user_id' => $request->user()->id,
            'type'    => 'new_appointment',
            'title'   => 'Nouveau rendez-vous cree',
            'body'    => "RDV avec {$appointment->client->full_name} le " .
                         $appointment->starts_at->format('d/m/Y') . ' a ' .
                         $appointment->starts_at->format('H:i'),
            'data'    => [
                'appointment_id' => $appointment->id,
                'client_id'      => $appointment->client_id,
            ],
        ]);

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($appointment, 201);
    }

    /**
     * Met a jour le statut ou les informations d'un rendez-vous.
     * Utilise pour confirmer, annuler ou modifier un RDV depuis le panneau lateral.
     *
     * PUT /api/appointments/{id}
     * Body: { status?, notes?, amount? }
     * Response: Appointment mis a jour
     */
    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        abort_if($appointment->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $validated = $request->validate([
            'status'            => 'sometimes|in:confirme,en_attente,nouveau,annule',
            'notes'             => 'nullable|string',
            'amount'            => 'nullable|numeric|min:0',
            'type'              => 'sometimes|string|max:255',
            'starts_at'         => 'sometimes|date',
            'duration_minutes'  => 'sometimes|integer|in:15,30,45,60,90,120',
        ]);

        if (isset($validated['starts_at']) || isset($validated['duration_minutes'])) {
            $startsAt = $validated['starts_at'] ?? $appointment->starts_at;
            $duration = $validated['duration_minutes'] ?? $appointment->duration_minutes;

            $start = \Illuminate\Support\Carbon::parse($startsAt);
            $end = (clone $start)->addMinutes($duration);

            if ($start->isBefore(now()->subMinutes(5))) {
                return response()->json([
                    'message' => 'Impossible de planifier un rendez-vous dans le passé.',
                    'errors' => ['starts_at' => ['La date du rendez-vous est déjà passée.']]
                ], 422);
            }

            $dayAppointments = $request->user()->appointments()
                ->where('id', '!=', $appointment->id)
                ->whereDate('starts_at', $start->toDateString())
                ->get();

            foreach ($dayAppointments as $apt) {
                $aptStart = \Illuminate\Support\Carbon::parse($apt->starts_at);
                $aptEnd = (clone $aptStart)->addMinutes($apt->duration_minutes);

                if ($aptStart->lt($end) && $aptEnd->gt($start)) {
                    return response()->json([
                        'message' => 'Ce créneau horaire chevauche un rendez-vous existant.',
                        'errors' => ['starts_at' => ['Un rendez-vous est déjà planifié sur ce créneau.']]
                    ], 422);
                }
            }
        }

        $appointment->update($validated);

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json($appointment->load('client'));
    }

    /**
     * Annule (supprime) un rendez-vous.
     *
     * DELETE /api/appointments/{id}
     * Response: { message }
     */
    public function destroy(Request $request, Appointment $appointment): JsonResponse
    {
        abort_if($appointment->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $appointment->delete();

        Cache::forget('dashboard_stats_user_' . $request->user()->id);

        return response()->json(['message' => 'Rendez-vous annule avec succes.']);
    }
}
