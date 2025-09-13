import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";
async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fd = new FormData();
    fd.append("file", buffer, { filename: file.name });
    fd.append("pinataMetadata", JSON.stringify({ name: file.name }));
    const headers = fd.getHeaders();
    if (process.env.PINATA_JWT) {
      headers["Authorization"] = `Bearer ${process.env.PINATA_JWT}`;
    } else if (
      process.env.PINATA_API_KEY &&
      process.env.PINATA_SECRET_API_KEY
    ) {
      headers["pinata_api_key"] = process.env.PINATA_API_KEY;
      headers["pinata_secret_api_key"] = process.env.PINATA_SECRET_API_KEY;
    }
    const resp = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      fd,
      { headers },
    );
    return NextResponse.json(resp.data);
  } catch (error) {
    console.error("Pinata upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
export { POST };
