import "@testing-library/jest-dom/vitest";

// Synthetic env placeholders so modules that read process.env at import time
// don't blow up under vitest. Tests can override per-suite via vi.stubEnv.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.ROOT_DOMAIN ??= "test.local";
process.env.SUPER_ADMIN_SESSION_SECRET ??= "test-super-secret";
