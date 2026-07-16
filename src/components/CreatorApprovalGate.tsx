import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCreatorByProfileId } from "@/services/creators";
import { useStore } from "@/store/store";

export default function CreatorApprovalGate({ children }: { children: ReactNode }) {
  const { user } = useStore();
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkApproval() {
      if (!user) {
        if (!cancelled) setApproved(false);
        return;
      }

      try {
        const creator = await getCreatorByProfileId(user.id);
        if (!cancelled) {
          setApproved(creator?.application_status === "approved" && creator.active);
        }
      } catch {
        if (!cancelled) setApproved(false);
      }
    }

    checkApproval();
    return () => { cancelled = true; };
  }, [user]);

  if (approved === null) {
    return <div className="min-h-screen bg-[#080808] px-5 py-20 text-center text-sm text-[#CFCFCF]">Checking creator approval...</div>;
  }

  if (!approved) {
    return <Navigate to="/creator-dashboard" replace />;
  }

  return <>{children}</>;
}
