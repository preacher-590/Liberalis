<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NotificationController — Gestion des notifications (Feat 3)
 *
 * Les notifications sont creees automatiquement par d'autres controllers
 * (nouveau RDV -> AppointmentController, paiement -> InvoiceController).
 * Ce controller permet au frontend de les lire et de les marquer comme lues.
 */
class NotificationController extends Controller
{
    /**
     * Liste les 20 dernieres notifications avec le compteur de non-lues.
     * Utilise par le panneau de notifications dans la Topbar.
     *
     * GET /api/notifications
     * Response: { data: Notification[], unread_count: number }
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->limit(20)
            ->get();

        $unreadCount = $request->user()
            ->notifications()
            ->where('is_read', false)
            ->count();

        return response()->json([
            'data'         => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Marque une notification specifique comme lue.
     * Appele quand l'utilisateur clique sur une notification dans le panneau.
     *
     * PATCH /api/notifications/{notification}/read
     * Response: Notification mise a jour
     */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        // Verification que la notification appartient bien a l'utilisateur connecte
        abort_if($notification->user_id !== $request->user()->id, 403, 'Acces non autorise.');

        $notification->update(['is_read' => true]);

        return response()->json($notification);
    }

    /**
     * Marque toutes les notifications comme lues.
     * Appele par le bouton "Tout lire" du panneau de notifications.
     *
     * POST /api/notifications/mark-all-read
     * Response: { message, count }
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $count = $request->user()
            ->notifications()
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'message' => "{$count} notification(s) marquee(s) comme lues.",
            'count'   => $count,
        ]);
    }
}
