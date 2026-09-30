<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    | Autorise le frontend React (localhost:5173) a appeler l'API Laravel
    | sans etre bloque par la politique Same-Origin du navigateur.
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Autorise uniquement le frontend React en developpement
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Necessaire pour que Sanctum puisse envoyer/recevoir les cookies de session
    'supports_credentials' => true,
];
