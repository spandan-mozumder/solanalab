import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const metadata = await request.json();

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}_metadata.json`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to upload metadata to Pinata");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Pinata metadata upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload metadata" },
      { status: 500 }
    );
  }
}
