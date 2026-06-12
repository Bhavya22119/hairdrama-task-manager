import { NextResponse } from "next/server";
import tls from "node:tls";

export const runtime = "nodejs";

type EmailPayload = {
  assigned_to: string;
  title: string;
  description?: string;
  created_by?: string;
  completed_by?: string;
};

const readSmtpResponse = (socket: tls.TLSSocket) =>
  new Promise<string>((resolve, reject) => {
    let data = "";

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP response timed out"));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      data += chunk.toString("utf8");
      const lines = data.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1];

      if (lastLine && /^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(data);
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });

const sendSmtpCommand = async (
  socket: tls.TLSSocket,
  command: string,
  expectedCodes: string[]
) => {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);

  if (!expectedCodes.some((code) => response.startsWith(code))) {
    throw new Error(response.trim());
  }
};

const sendEmail = async (to: string, subject: string, body: string) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in Vercel");
  }

  const socket = tls.connect({
    host: "smtp.gmail.com",
    port: 465,
    servername: "smtp.gmail.com",
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("SMTP connection timed out"));
    }, 15000);

    socket.once("secureConnect", () => {
      clearTimeout(timer);
      resolve();
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  try {
    await readSmtpResponse(socket);
    await sendSmtpCommand(socket, "EHLO hairdrama-task-manager", ["250"]);
    await sendSmtpCommand(socket, "AUTH LOGIN", ["334"]);
    await sendSmtpCommand(
      socket,
      Buffer.from(gmailUser).toString("base64"),
      ["334"]
    );
    await sendSmtpCommand(
      socket,
      Buffer.from(gmailPassword).toString("base64"),
      ["235"]
    );
    await sendSmtpCommand(socket, `MAIL FROM:<${gmailUser}>`, ["250"]);
    await sendSmtpCommand(socket, `RCPT TO:<${to}>`, ["250", "251"]);
    await sendSmtpCommand(socket, "DATA", ["354"]);

    const message = [
      `From: ${gmailUser}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      body.replace(/\r?\n\./g, "\n.."),
      ".",
    ].join("\r\n");

    socket.write(`${message}\r\n`);
    const dataResponse = await readSmtpResponse(socket);

    if (!dataResponse.startsWith("250")) {
      throw new Error(dataResponse.trim());
    }

    socket.write("QUIT\r\n");
  } finally {
    socket.end();
  }
};

const buildEmail = (endpoint: string, payload: EmailPayload) => {
  if (endpoint.includes("created")) {
    return {
      subject: "New Task Assigned",
      body: `Hello,

A new task has been assigned to you.

Title: ${payload.title}
Description: ${payload.description || "No description"}
Created By: ${payload.created_by}

Regards,
Hairdrama Task Manager`,
    };
  }

  return {
    subject: "Task Completed",
    body: `Hello,

Your task has been marked as completed.

Title: ${payload.title}
Completed By: ${payload.completed_by}

Regards,
Hairdrama Task Manager`,
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = body.payload as EmailPayload | undefined;

    if (!body.endpoint || !body.endpoint.startsWith("/")) {
      return NextResponse.json(
        { error: "Valid email endpoint is required" },
        { status: 400 }
      );
    }

    if (!payload?.assigned_to || !payload.title) {
      return NextResponse.json(
        { error: "assigned_to and title are required" },
        { status: 400 }
      );
    }

    const email = buildEmail(body.endpoint, payload);
    await sendEmail(payload.assigned_to, email.subject, email.body);

    return NextResponse.json({ message: "Email sent" });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
