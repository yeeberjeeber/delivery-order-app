import type { Metadata } from "next"
import DriverLoginForm from "./DriverLoginForm"

export const metadata: Metadata = {
  title: "Driver Login — D.O. Tracker",
  description: "Log in to capture and submit delivery orders.",
}

export default function DriverLoginPage() {
  return <DriverLoginForm />
}
