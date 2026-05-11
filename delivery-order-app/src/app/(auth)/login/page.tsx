import type { Metadata } from "next"
import StaffLoginForm from "./StaffLoginForm"

export const metadata: Metadata = {
  title: "Staff Login — D.O. Tracker",
  description: "Sign in for supervisors, finance, and admin.",
}

export default function StaffLoginPage() {
  return <StaffLoginForm />
}
