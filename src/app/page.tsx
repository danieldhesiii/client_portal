import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/access";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
