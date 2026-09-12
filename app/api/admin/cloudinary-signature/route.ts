import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";

export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const params = new URLSearchParams({ timestamp: String(timestamp) });
  if (uploadPreset) params.set("upload_preset", uploadPreset);
  const signature = createHash("sha1")
    .update(`${params.toString()}${apiSecret}`)
    .digest("hex");

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    uploadPreset
  });
}
