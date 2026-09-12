import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  if (!(await getAuthSession())) redirect("/login");
  return <CheckoutClient />;
}
