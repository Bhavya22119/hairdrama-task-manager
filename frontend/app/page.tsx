"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  status: string;
};

type EmailPayload = {
  assigned_to: string;
  title: string;
  description?: string;
  created_by?: string;
  completed_by?: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const fetchTasks = async (email: string) => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .or(`created_by.eq.${email},assigned_to.eq.${email}`)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Fetch error: " + error.message);
      return;
    }

    setTasks(data || []);
  };

  const sendEmailRequest = async (endpoint: string, payload: EmailPayload) => {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
        payload,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Email request failed");
    }

    return result;
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setUser(data.user);
        await fetchTasks(data.user.email || "");
      }
    };

    loadUser();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoggingIn(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      alert("Login error: " + error.message);
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  const createTask = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    if (!title || !assignedTo) {
      alert("Title and Assigned Email are required");
      return;
    }

    setIsCreating(true);

    const { error } = await supabase.from("tasks").insert([
      {
        title,
        description,
        assigned_to: assignedTo,
        created_by: user.email,
        status: "pending",
      },
    ]);

    if (error) {
      alert("Create task error: " + error.message);
      setIsCreating(false);
      return;
    }

    try {
      await sendEmailRequest("/send-task-created-email", {
        assigned_to: assignedTo,
        title,
        description,
        created_by: user.email,
      });
    } catch (err: unknown) {
      alert(
        "Email error: " + (err instanceof Error ? err.message : "Unknown error")
      );
      setIsCreating(false);
      return;
    }

    alert("Task Created Successfully and Email Sent");

    setTitle("");
    setDescription("");
    setAssignedTo("");

    await fetchTasks(user.email || "");
    setIsCreating(false);
  };

  const completeTask = async (
    id: string,
    assignedToEmail: string,
    taskTitle: string
  ) => {
    if (!user) {
      alert("Please login first");
      return;
    }

    setCompletingTaskId(id);

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "completed",
      })
      .eq("id", id);

    if (error) {
      alert("Complete task error: " + error.message);
      setCompletingTaskId(null);
      return;
    }

    try {
      await sendEmailRequest("/send-task-completed-email", {
        assigned_to: assignedToEmail,
        title: taskTitle,
        completed_by: user.email,
      });
    } catch (err: unknown) {
      alert(
        "Email error: " + (err instanceof Error ? err.message : "Unknown error")
      );
      setCompletingTaskId(null);
      return;
    }

    alert("Task Marked Completed and Email Sent");

    await fetchTasks(user.email || "");
    setCompletingTaskId(null);
  };

  const buttonBase =
    "cursor-pointer rounded font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm";

  const displayName = user?.email?.split("@")[0] || "User";

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5">
        <h1 className="text-3xl font-bold">Hairdrama Task Manager</h1>

        <button
          onClick={loginWithGoogle}
          disabled={isLoggingIn}
          className={`${buttonBase} bg-black px-5 py-3 text-white hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-300`}
        >
          {isLoggingIn ? "Opening Google..." : "Login with Google"}
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Welcome {displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create, assign, and track team tasks in one place.
            </p>
          </div>

          <button
            onClick={logout}
            className={`${buttonBase} bg-rose-500 px-4 py-2 text-white hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-200`}
          >
            Logout
          </button>
        </section>

        <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_auto]">
            <input
              type="text"
              placeholder="Task Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-emerald-200 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <textarea
              placeholder="Task Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-12 rounded border border-emerald-200 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 lg:min-h-0"
            />

            <input
              type="email"
              placeholder="Assign To Email"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="rounded border border-emerald-200 bg-white p-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            <button
              onClick={createTask}
              disabled={isCreating}
              className={`${buttonBase} bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200`}
            >
              {isCreating ? "Creating..." : "Create Task"}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-950">Tasks</h2>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              {tasks.length} total
            </span>
          </div>

          {tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
              No Tasks Found
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className="flex min-h-56 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-lg font-bold text-slate-950">
                      {task.title}
                    </h3>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        task.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm text-slate-600">
                    {task.description || "No description"}
                  </p>

                  <div className="space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <p className="truncate">
                      <b className="text-slate-800">Assigned:</b>{" "}
                      {task.assigned_to}
                    </p>

                    <p className="truncate">
                      <b className="text-slate-800">Created:</b>{" "}
                      {task.created_by}
                    </p>
                  </div>

                  {task.status !== "completed" && (
                    <button
                      onClick={() =>
                        completeTask(task.id, task.assigned_to, task.title)
                      }
                      disabled={completingTaskId === task.id}
                      className={`${buttonBase} mt-auto w-fit bg-sky-500 px-3 py-2 text-white hover:bg-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-200`}
                    >
                      {completingTaskId === task.id
                        ? "Completing..."
                        : "Mark Complete"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
