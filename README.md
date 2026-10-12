# Courses

Ma liste de courses, façon cases à cocher Google Keep, et mes cartes de fidélité.

## Courses

- **Ajout rapide** : tapez un article, Entrée. Le champ se vide après « Ajouter » ou « Créer » et reste actif pour enchaîner.
- **Autocomplétion** : recherche « commence par » dans la base (sans tenir compte des majuscules ni des accents).
- **Cocher** : l'article se barre puis se masque. Les articles cochés restent consultables, un toucher les remet dans la liste.
- **Modifier** : le crayon à côté de la croix renomme l'article (Entrée pour enregistrer, Échap pour annuler).
- **Supprimer** : la croix supprime l'article, avec un bouton « Annuler » pendant quelques secondes.
- **Glisser-déposer** : déplacez les articles avec la poignée à gauche (souris, doigt ou clavier).

## Cartes

Onglet « Cartes » (lien direct : `#cartes`).

- **Recherche** par nom, de type « contient » (sans tenir compte des majuscules ni des accents).
- **Ajouter** avec le bouton « + », **modifier** en touchant une carte, **supprimer** depuis la fiche (avec « Annuler »).

Tout est enregistré dans Supabase : la liste et les cartes sont les mêmes sur tous vos appareils.

## Stack

React + TypeScript (Vite), `@dnd-kit` pour le glisser-déposer, Supabase (Postgres) pour les données, Vercel pour l'hébergement.

## Lancer en local

```bash
cp .env.example .env      # puis renseigner l'URL et la clé publique Supabase
npm install
npm run dev
```

## Base de données

Les schémas sont dans `supabase/migrations/` (à appliquer dans l'ordre).

- `items` sert à la fois de liste et de catalogue : `checked = false` pour un article dans la liste, `checked = true` pour un article déjà pris. Un trigger calcule la colonne `search` (minuscules, sans accents) utilisée par l'index de recherche « commence par ».
- `loyalty_cards` contient le nom et le numéro de chaque carte.

## Sécurité

L'application n'a pas de connexion : toute personne qui connaît l'adresse du site peut lire et modifier la liste **et les numéros de cartes**.
Gardez la protection d'accès de Vercel (Vercel Authentication) activée, ou ajoutez Supabase Auth et remplacez les politiques RLS de `items` et `loyalty_cards`.
