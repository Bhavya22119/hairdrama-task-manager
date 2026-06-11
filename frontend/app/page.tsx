"use client";

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const [tasks, setTasks] = useState<any[]>([]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Fetch error: " + error.message);
      return;
    }

    setTasks(data || []);
  };

  const sendEmailRequest = async (endpoint: string, payload: any) => {
    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(payload),
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
        await fetchTasks();
      }
    };

    loadUser();
  }, []);

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  const createTask = async () => {
    if (!title || !assignedTo) {
      alert("Title and Assigned Email are required");
      return;
    }

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
      return;
    }

    try {
      await sendEmailRequest("/send-task-created-email", {
        assigned_to: assignedTo,
        title,
        description,
        created_by: user.email,
      });
    } catch (err: any) {
      alert("Email error: " + err.message);
    }

    alert("Task Created Successfully");

    setTitle("");
    setDescription("");
    setAssignedTo("");

    await fetchTasks();
  };

  const completeTask = async (
    id: string,
    assignedToEmail: string,
    taskTitle: string
  ) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        status: "completed",
      })
      .eq("id", id);

    if (error) {
      alert("Complete task error: " + error.message);
      return;
    }

    try {
      await sendEmailRequest("/send-task-completed-email", {
        assigned_to: assignedToEmail,
        title: taskTitle,
        completed_by: user.email,
      });
    } catch (err: any) {
      alert("Email error: " + err.message);
    }

    alert("Task Marked Completed");

    await fetchTasks();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5">
        <h1 className="text-3xl font-bold">Hairdrama Task Manager</h1>

        <button
          onClick={loginWithGoogle}
          className="bg-black text-white px-5 py-3 rounded-lg"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-10 flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Welcome {user.email}</h1>

      <p>Backend URL: {backendUrl || "NOT FOUND"}</p>

      <input
        type="text"
        placeholder="Task Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 rounded"
      />

      <textarea
        placeholder="Task Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 rounded"
      />

      <input
        type="email"
        placeholder="Assign To Email"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
        className="border p-2 rounded"
      />

      <button
        onClick={createTask}
        className="bg-green-600 text-white p-2 rounded"
      >
        Create Task
      </button>

      <button
        onClick={logout}
        className="bg-red-500 text-white p-2 rounded"
      >
        Logout
      </button>

      <hr />

      <h2 className="text-2xl font-bold">Tasks</h2>

      {tasks.length === 0 ? (
        <p>No Tasks Found</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className="border p-4 rounded flex flex-col gap-2"
          >
            <h3 className="font-bold text-lg">{task.title}</h3>

            <p>{task.description}</p>

            <p>
              <b>Assigned To:</b> {task.assigned_to}
            </p>

            <p>
              <b>Created By:</b> {task.created_by}
            </p>

            <p>
              <b>Status:</b> {task.status}
            </p>

            {task.status !== "completed" && (
              <button
                onClick={() =>
                  completeTask(task.id, task.assigned_to, task.title)
                }
                className="bg-blue-500 text-white px-3 py-2 rounded w-fit"
              >
                Mark Complete
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}