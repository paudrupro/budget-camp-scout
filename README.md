# Budget camp scout

Application web mobile-first pour suivre le budget d’un camp scout avec Next.js, TypeScript, Tailwind CSS et Supabase.

## Démarrage

```bash
npm install
npm run dev
```

## Configuration Supabase

Renseigner les variables d’environnement suivantes pour activer la synchronisation REST Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
```

Tables attendues : `camps`, `budget_categories` et `expenses`, avec des colonnes alignées sur les champs de l’interface. Sans variables Supabase, l’application reste utilisable en stockage local du navigateur.
