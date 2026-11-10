"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
const GroupTutorialDialog = dynamic(() => import("./GroupTutorialDialog"), {
  ssr: false,
  loading: () => (
    <span role="status" className="text-xs text-slate-500">
      Chargement de la démonstration…
    </span>
  ),
});
export function GroupTutorialButton({
  size = "default",
}: {
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <MousePointer2 className="size-4 shrink-0" />
        Voir une démonstration
      </Button>
      {open && <GroupTutorialDialog onClose={() => setOpen(false)} />}
    </>
  );
}
