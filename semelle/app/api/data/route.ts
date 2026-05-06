import { NextRequest } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        // get auth headers
        const auth = req.headers.get("Authorization");
        if (!auth?.startsWith("Bearer ")) {
            return Response.json({ error: "Missing or malformed token" }, { status: 401 });
        }

        // get the token
        const token = auth.slice(7);

        // check if the token is valid
        if (!token) {
            return Response.json({ error: "Token missing or malformed token" });
        }

        if (token != process.env.SECRET) {
            return Response.json({ error: "Wrong token" });
        }

        // the token is valid
        // extract the json data from the post request
        const data = await req.json();

        // save the data to the database
        await query("");
    } catch (error) {
        return Response.json({ error: error, status: 500 });
    }
}
