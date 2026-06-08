import { NextResponse } from "next/server";

type IndiaPostOffice = {
  Name?: string;
  District?: string;
  State?: string;
  Pincode?: string;
};

type IndiaPostResponse = {
  Status?: string;
  PostOffice?: IndiaPostOffice[] | null;
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  const pincode = new URL(request.url).searchParams.get("pincode")?.trim() ?? "";

  if (!/^[0-9]{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6 digit pincode." }, { status: 400 });
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    headers: {
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Address lookup failed. Please enter the address manually." }, { status: 502 });
  }

  const data = (await response.json()) as IndiaPostResponse[];
  const result = data[0];
  const postOffices = result?.PostOffice ?? [];

  if (result?.Status !== "Success" || !postOffices.length) {
    return NextResponse.json({ error: "No address found for this pincode." }, { status: 404 });
  }

  return NextResponse.json({
    addresses: postOffices.map((office) => ({
      name: office.Name ?? "",
      district: office.District ?? "",
      state: office.State ?? "",
      pincode: office.Pincode ?? pincode
    }))
  });
}
