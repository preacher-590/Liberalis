<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware: Acces reserve au super administrateur
 *
 * Protege les routes /api/admin/*. Tout utilisateur dont le role
 * n'est pas 'admin' recoit un 403, meme authentifie.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->role !== 'admin') {
            abort(403, 'Acces reserve a l\'administrateur.');
        }

        return $next($request);
    }
}
