"use client";

import { ToastContainer } from "react-toastify";

export function ToastProvider() {
  return <ToastContainer position="top-right" autoClose={3500} closeOnClick pauseOnHover theme="light" />;
}
