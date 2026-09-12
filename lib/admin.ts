import { getAuthSession } from "@/lib/auth";

export async function getAdminSession() {
  const session = await getAuthSession();
  return session?.user.role === "ADMIN" ? session : null;
}
