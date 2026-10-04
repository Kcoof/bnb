import { redirect } from "next/navigation";

// The v2 one-question wizard owns all property creation (plan limits enforced
// in wizardStartAction) — the old form wizard is retired.
export default function NewPropertyRedirect() {
  redirect("/onboarding");
}
