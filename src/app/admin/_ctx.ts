"use client";
import { createContext, useContext } from "react";

export const AdminContext = createContext<{ pw: string }>({ pw: "" });
export const useAdmin = () => useContext(AdminContext);
