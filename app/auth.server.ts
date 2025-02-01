import { getAuth } from "@clerk/remix/ssr.server";
import { redirect } from "@remix-run/node";
import type { DataFunctionArgs } from "@remix-run/node";

export async function requireAuth(args: DataFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    throw redirect("/");
  }

  return userId;
}
