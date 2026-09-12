# E-Commerce Store

Next.js 14 App Router project with TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

The project currently includes credentials authentication and the Phase 3 product catalog:
server-rendered product listing/detail pages, admin product/category management, Prisma-backed APIs, and signed Cloudinary image uploads.
It also includes guest and database-backed carts with login-time quantity merging.
Checkout creates pending orders, initializes Paystack server-side, and only marks orders
paid after a valid Paystack signature and server-side transaction verification in the webhook.
Customers can view only their own orders at `/account/orders`; admins can review all orders
and advance fulfillment statuses from `/admin/orders`.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Set `DATABASE_URL` in `.env` before running Prisma commands. The migration command creates the initial migration in `prisma/migrations/`.

For admin image uploads, also configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`, and optionally `CLOUDINARY_UPLOAD_PRESET`.
For order confirmations, configure `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`.

After adding checkout shipping fields, apply the Prisma schema change with:

```bash
npx prisma migrate dev --name add_order_shipping
```

## Production deployment

Configure the variables in `.env.example` in Vercel Project Settings for the
Production environment. Use the production Postgres connection string and set:

```text
NEXTAUTH_URL=https://your-production-domain
```

Set the Paystack webhook URL to:

```text
https://your-production-domain/api/webhooks/paystack
```

Deploy with the Vercel project connected to this repository, then run the
production migration from an authorized environment:

```bash
npx prisma migrate deploy
```

The Vercel build runs `prisma generate` through the `postinstall` script.
Do not commit `.env.local` or production secrets.
