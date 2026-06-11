# Frontend

This is the Next.js frontend for the Hairdrama Task Manager.

## Run Locally

```powershell
npm install
npm run dev
```

The app runs at `http://127.0.0.1:3000`.

Main files:

- `app/page.tsx`: login, task form, task list, and task completion UI
- `app/api/send-email/route.ts`: forwards email requests to the Flask backend
- `src/lib/supabase.ts`: Supabase client setup
