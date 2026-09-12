type OrderEmail = {
  id: string;
  total: number;
  shippingName: string;
  shippingEmail: string;
  items: { quantity: number; price: number; product: { name: string } }[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[character] ?? character));
}

export async function sendOrderConfirmationEmail(order: OrderEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("Order confirmation email was not sent: Resend is not configured.");
    return;
  }

  const items = order.items.map((item) =>
    `<li>${escapeHtml(item.product.name)} × ${item.quantity} — ₦${((item.price * item.quantity) / 100).toFixed(2)}</li>`
  ).join("");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [order.shippingEmail],
      subject: `Order confirmation ${order.id}`,
      html: `<h1>Thanks for your order, ${escapeHtml(order.shippingName)}!</h1>
        <p>Your payment was confirmed.</p>
        <ul>${items}</ul>
        <p><strong>Total: ₦${(order.total / 100).toFixed(2)}</strong></p>
        <p>Order reference: ${escapeHtml(order.id)}</p>`
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend returned ${response.status}: ${body}`);
  }
}
