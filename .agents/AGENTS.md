# RÈGLES PROJET LIBERALIS & PRATIQUES D'ASSISTANCE

## LISIBILITÉ DU CODE PAR LA DOCUMENTATION ET LA CARTOGRAPHIE

Lorsqu'il est demandé de "rendre le code lisible ou compréhensible par un humain" (sur une page, un module ou tout le projet) :

1. **RÈGLE ABSOLUE DE DOCUMENTATION EXCLUSIVE** :
   - Ne modifie AUCUNE logique métier, nom de variable/fonction, structure de fichier ou schéma de données sauf demande explicite de refactoring.
   - Ne corrige pas les bugs à la volée de manière silencieuse : liste-les à part dans un rapport dédié.

2. **COMMENTAIRES EXPLICATIFS & NON REDONDANTS** :
   - **En-tête de fichier** : Ajoute un commentaire d'en-tête (ou JSDoc/DocBlock) expliquant le RÔLE du fichier (à quoi il sert, interactions principales, sections logiques).
   - **Informer sans paraphraser** : Ne commente JAMAIS ce qu'un nom de fonction ou de variable dit déjà. Commente uniquement ce qui n'est pas évident (choix techniques surprenants, règles métiers cachées, contournements de bugs).

3. **CARTOGRAPHIE ET TESTS DE NON-RÉGRESSION** :
   - Génère un document d'architecture (`ARCHITECTURE.md`) expliquant le flux global, la communication Frontend/Backend, et le modèle de données principal lorsque le projet entier est visé.
   - Toujours exécuter et vérifier la réussite des tests (`php artisan test`, `npm run build`) avant de valider.
