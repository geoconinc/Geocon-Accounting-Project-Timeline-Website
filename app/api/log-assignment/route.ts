import { NextRequest, NextResponse } from "next/server";

interface Body {
  assigneeEmail: string;
  assigneeName: string;
  target: string;
}

// Logs owner-assignment events to the server console. This is a stand-in for
// real email delivery (Microsoft Graph sendMail, SendGrid, etc.) until the
// accounting team approves the email integration.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const subject = `[Geocon] You were assigned to ${body.target}`;
    const lines = [
      "================ EMAIL (mock) ================",
      `To:      ${body.assigneeName} <${body.assigneeEmail}>`,
      `Subject: ${subject}`,
      `Body:    Hi ${body.assigneeName.split(" ")[0]}, you've been added as the owner of ${body.target} in the Geocon Project Timeline. Please review your tasks at your convenience.`,
      "=============================================="
    ];
    console.log("\n" + lines.join("\n") + "\n");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "bad request" },
      { status: 400 }
    );
  }
}
