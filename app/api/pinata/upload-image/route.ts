import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const pinataFormData = new FormData();
    pinataFormData.append("file", file);
    
    const metadata = JSON.stringify({
      name: file.name,
    });
    pinataFormData.append("pinataMetadata", metadata);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload to Pinata");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Pinata upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
