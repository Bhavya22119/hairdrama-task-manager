# Loom Video Explanation Notes

Use this as a guide while recording the walkthrough.

## 1. Project Overview

This is a task management app for creating and assigning tasks. Users log in with Google, create tasks, assign them to another email address, and both task assignment and completion trigger Gmail notifications.

## 2. Authentication

Google login is handled through Supabase Auth. The frontend calls `supabase.auth.signInWithOAuth({ provider: "google" })`. After login, `supabase.auth.getUser()` gives the current user, and that email is saved as `created_by` when a task is created.

## 3. Database

The `tasks` table is created from `migrations/001_create_tasks.sql`. It stores:

- `title`
- `description`
- `assigned_to`
- `created_by`
- `status`
- `created_at`

The status is limited to `pending` or `completed`.

## 4. Frontend Flow

The main UI is in `frontend/app/page.tsx`.

- `fetchTasks()` reads tasks from Supabase where `assigned_to` matches the logged-in user's email.
- `createTask()` inserts a new row into Supabase and then calls the email API.
- `completeTask()` updates the task status and then calls the completion email API.
- Loading states show `Creating...` and `Completing...` so the user knows the click worked.

## 5. Email Flow

The browser does not call Flask directly. It calls the Next.js API route:

`frontend/app/api/send-email/route.ts`

That route forwards the request to the Flask backend. The Flask backend has two endpoints:

- `/send-task-created-email`
- `/send-task-completed-email`

Flask-Mail sends the email through Gmail SMTP using `GMAIL_USER` and `GMAIL_APP_PASSWORD`.

## 6. Deployment

The frontend can be deployed on Vercel. The Flask backend can be deployed on Render or Railway. Supabase stays as the hosted database and auth provider.

Important production environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

## 7. Possible Interview Questions

Q: Why did you use Supabase?
A: It gives a hosted Postgres database and Google OAuth support, so I could handle auth and database in one service.

Q: Why is there a Next.js API route if Flask also exists?
A: The frontend sends email requests to a local server-side route first. That keeps the email backend URL handling cleaner and avoids calling email endpoints directly from UI code.

Q: Why do you need a Gmail app password?
A: Gmail SMTP does not allow normal account passwords for apps. An app password is safer and required for SMTP login.

Q: What happens when a task is completed?
A: The frontend updates the task status in Supabase, then sends a request to the backend email endpoint so the assigned user gets a completion notification.
