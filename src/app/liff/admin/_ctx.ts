"use client";
import { createContext, useContext } from "react";

export type AdminIdentity = {
  mode: "password" | "line";
  lineUserId?: string;
  displayName?: string;
};

export type AdminCtxValue = {
  identity: AdminIdentity | null;
  idToken: string | null;
  /** Returns headers the client should include when calling admin APIs. */
  authHeaders: () => Record<string, string>;
};

export const AdminLiffContext = createContext<AdminCtxValue>({
  identity: null,
  idToken: null,
  authHeaders: () => ({}),
});

export const useAdminLiff = () => useContext(AdminLiffContext);
