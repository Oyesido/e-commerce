import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: { reference?: string } };

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ searchParams }: Props) {
  const session = await getAuthSession();
  if (!session?.user.id) redirect("/login");
  const order = searchParams.reference
    ? await prisma.order.findFirst({
      where: { paystackRef: searchParams.reference, userId: session.user.id },
      include: { items: { include: { product: true } } }
    })
    : null;

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-xl rounded border bg-white p-8 text-center">
        {order?.status === "PAID" ? (
          <>
            <h1 className="text-3xl font-bold text-green-700">Payment confirmed</h1>
            <p className="mt-3 text-slate-600">Your order has been received and is being processed.</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Payment submitted</h1>
            <p className="mt-3 text-slate-600">We are waiting for Paystack to verify your payment. This page does not mark the order as paid.</p>
          </>
        )}
        {order && <p className="mt-4 text-sm text-slate-500">Reference: {order.paystackRef}</p>}
        <Link href="/account/orders" className="mt-6 inline-block rounded bg-brand px-4 py-2 font-semibold text-white">View orders</Link>
      </div>
    </main>
  );
}
