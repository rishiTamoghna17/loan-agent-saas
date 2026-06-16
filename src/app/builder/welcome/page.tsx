import { redirect } from "next/navigation";

export default function BuilderWelcomePage() {
  redirect("/dashboard/website?welcome=true");
}
