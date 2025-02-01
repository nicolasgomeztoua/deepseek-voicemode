import type { LoaderFunction } from "@remix-run/node";
import { requireAuth } from "~/auth.server";
import MainInterface from "~/components/MainInterface"; // We'll create this next

export const loader: LoaderFunction = async (args) => {
  await requireAuth(args);
  return null;
};

export default function AppRoute() {
  return <MainInterface />;
}
