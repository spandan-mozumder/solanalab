import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fd = new FormData();
    fd.append("file", buffer, { filename: file.name });
    fd.append("pinataMetadata", JSON.stringify({ name: file.name }));

    const headers = fd.getHeaders();
    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

    if (jwt) {
      headers["Authorization"] = `Bearer ${jwt}`;
    } else if (apiKey && apiSecret) {
      headers["pinata_api_key"] = apiKey;
      headers["pinata_secret_api_key"] = apiSecret;
    } else {
      return NextResponse.json(
        {
          error:
            "Pinata credentials missing. Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY.",
        },
        { status: 500 },
      );
    }

    const resp = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      fd,
      { headers },
    );

    return NextResponse.json(resp.data);
  } catch (error: any) {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.error || error?.response?.data || error?.message || "Failed to upload file";
    console.error("Pinata upload error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}

export { POST };
