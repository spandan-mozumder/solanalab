import { NextResponse } from "next/server";
import axios from "axios";
async function POST(request) {
  try {
    const metadata = await request.json();
    const headers = { "Content-Type": "application/json" };
    if (process.env.PINATA_JWT) {
      headers["Authorization"] = `Bearer ${process.env.PINATA_JWT}`;
    } else if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
      headers["pinata_api_key"] = process.env.PINATA_API_KEY;
      headers["pinata_secret_api_key"] = process.env.PINATA_SECRET_API_KEY;
    }
    const body = {
      pinataContent: metadata,
      pinataMetadata: {
        name: `${metadata.name}_metadata.json`
      }
    };
    const resp = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      body,
      { headers }
    );
    return NextResponse.json(resp.data);
  } catch (error) {
    console.error("Pinata metadata upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload metadata" },
      { status: 500 }
    );
  }
}
export {
  POST
};
