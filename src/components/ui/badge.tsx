import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#234D65] text-white [a&]:hover:bg-[#1A3D4F]",
        secondary:
          "border-transparent bg-gray-100 text-gray-800 [a&]:hover:bg-gray-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 [a&]:hover:bg-emerald-200",
        warning:
          "border-transparent bg-amber-100 text-amber-800 [a&]:hover:bg-amber-200",
        info: "border-transparent bg-sky-100 text-sky-800 [a&]:hover:bg-sky-200",
        destructive:
          "border-transparent bg-red-100 text-red-800 [a&]:hover:bg-red-200",
        outline: "border-gray-300 text-gray-700 [a&]:hover:bg-gray-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
