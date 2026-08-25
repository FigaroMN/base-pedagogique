FIGAROMN V24.44 — VERROUILLAGE ANTI-TRICHE DES ÉVALUATIONS

Patch ciblé : aucune modification de NautiPlan, de l'accueil public, des outils ou des contenus pédagogiques.

Fonctionnement :
- Dès qu'une évaluation est ouverte, elle passe en mode surveillé.
- Si l'élève change d'onglet, réduit/masque la page, actualise, ferme la page, navigue vers une autre rubrique ou quitte l'évaluation avant la fin, la tentative est bloquée.
- Aucune note de la tentative interrompue n'est enregistrée.
- La carte de l'évaluation affiche : « Bloquée · sortie détectée ».
- Pour recommencer LA MÊME évaluation, l'élève doit utiliser « Recommencer avec le code enseignant » puis le code déjà existant de nouvelle tentative : evaluation.
- Il peut choisir UNE AUTRE évaluation : elle reste accessible avec son code habituel.
- À la dernière question, le verrou est désactivé avant l'enregistrement du résultat.

Fichiers du patch :
- cap.html
- seconde.html
- premiere.html
- terminale.html
- figaromn-bacpro-auto-v161.js

Installation GitHub :
1. Ne supprimez aucun autre fichier.
2. Remplacez uniquement les 5 fichiers ci-dessus à la racine de base-pedagogique.
3. Commit changes.
4. Attendez la coche verte GitHub Pages.
5. Faites Ctrl + F5.

Test conseillé :
1. Connectez un élève test.
2. Ouvrez une évaluation avec son code normal.
3. Répondez à une question.
4. Changez d'onglet du navigateur puis revenez.
5. L'écran doit afficher « Évaluation bloquée ».
6. Retournez aux évaluations : la même évaluation doit afficher « Bloquée · sortie détectée ».
7. Cliquez « Recommencer avec le code enseignant » et saisissez : evaluation.
8. L'évaluation repart de la question 1.

Aucun SQL Supabase nécessaire.
