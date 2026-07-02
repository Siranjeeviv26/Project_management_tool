import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { Profile, TeamMember } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret",
    ) as { userId: string; email: string };

    const profile = await Profile.findOne({ user_id: decoded.userId });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get user's role from any team they're a member of
    const teamMember = await TeamMember.findOne({ user_id: decoded.userId });
    const role = teamMember?.role || "member";

    return NextResponse.json({
      user: {
        _id: decoded.userId,
        id: decoded.userId,
        email: profile.email,
        role,
      },
      profile: profile,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
