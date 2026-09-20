import { requireOrgMember } from "@/lib/auth";
import { PropertyWizard } from "./PropertyWizard";

export default async function NewPropertyPage() {
  const member = await requireOrgMember();
  if (!member) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <PropertyWizard />
    </div>
  );
}
