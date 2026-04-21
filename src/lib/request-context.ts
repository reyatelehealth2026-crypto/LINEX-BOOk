// Request-scoped shop context for webhook / cron / background handlers where
// middleware can't inject `x-shop-slug` (LINE webhook is single-URL, tenant
// resolved from the event's `destination` field; cron iterates all shops).
//
// Server components & API routes hit via subdomain already have tenant
// context via `next/headers` — this is only for handlers that process
// multiple shops per invocation or resolve tenant from request body.

import { AsyncLocalStorage } from "node:async_hooks";
import type { Shop } from "@/lib/supabase";

type Ctx = {
  shop: Shop;
  accessToken?: string;
  channelSecret?: string;
  liffId?: string | null;
};

const storage = new AsyncLocalStorage<Ctx>();

export function runWithShopContext<T>(ctx: Ctx, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function currentShopContext(): Ctx | undefined {
  return storage.getStore();
}

export function currentShopId(): number | undefined {
  return storage.getStore()?.shop.id;
}

export function currentAccessToken(): string | undefined {
  return storage.getStore()?.accessToken;
}

export function currentChannelSecret(): string | undefined {
  return storage.getStore()?.channelSecret;
}
