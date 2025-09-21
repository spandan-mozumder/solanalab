import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

async function POST(request: NextRequest) {
  try {
    const metadata = await request.json();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_SECRET_API_KEY;

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

    const body = {
      pinataContent: metadata,
      pinataMetadata: {
        name: `${metadata.name}_metadata.json`,
      },
    };

    const resp = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      body,
      { headers },
    );

    return NextResponse.json(resp.data);
  } catch (error: any) {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.error || error?.response?.data || error?.message || "Failed to upload metadata";
    console.error("Pinata metadata upload error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}

export { POST };
