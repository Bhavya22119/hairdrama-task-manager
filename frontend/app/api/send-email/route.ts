import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const backendUrl =
      process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend URL not found" },
        { status: 500 }
      );
    }

    if (!body.endpoint || !body.endpoint.startsWith("/")) {
      return NextResponse.json(
        { error: "Valid email endpoint is required" },
        { status: 400 }
      );
    }

    const normalizedBackendUrl = backendUrl.replace(/\/$/, "");

    const response = await fetch(`${normalizedBackendUrl}${body.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.payload),
    });

    const responseText = await response.text();
    let result: { error?: string; message?: string };

    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        error:
          "Backend returned an invalid response. Check NEXT_PUBLIC_BACKEND_URL in Vercel and make sure Render backend is live.",
      };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Backend email failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
