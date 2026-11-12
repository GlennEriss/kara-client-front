"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { FloatingTableScrollbar } from './floating-table-scrollbar';

function Table({
  className,
  topScroll = false,
  floatingScroll = false,
  id,
  ...props
}: React.ComponentProps<"table"> & { topScroll?: boolean; floatingScroll?: boolean }) {
  const generatedId = React.useId();
  const tableId = id || `table-${generatedId}`;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = React.useState(0);

  React.useEffect(() => {
    if (!topScroll) return;
    const container = containerRef.current;
    const table = container?.querySelector("table");
    if (!container || !table) return;

    const measure = () => {
      setScrollWidth(container.scrollWidth > container.clientWidth ? container.scrollWidth : 0);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(container);
    observer?.observe(table);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [topScroll]);

  React.useEffect(() => {
    if (topScrollRef.current && containerRef.current) {
      topScrollRef.current.scrollLeft = containerRef.current.scrollLeft;
    }
  }, [scrollWidth]);

  const container = (
    <div
      ref={containerRef}
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-2xl border border-gray-100 bg-white"
      onScroll={() => {
        if (topScrollRef.current && containerRef.current && topScrollRef.current.scrollLeft !== containerRef.current.scrollLeft) {
          topScrollRef.current.scrollLeft = containerRef.current.scrollLeft;
        }
      }}
    >
      <table
        id={tableId}
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );

  if (!topScroll) return <>{container}{floatingScroll && <FloatingTableScrollbar containerRef={containerRef} tableId={tableId} />}</>;

  return (
    <div className="min-w-0 w-full">
      {scrollWidth > 0 && (
        <div
          ref={topScrollRef}
          role="region"
          aria-label="Défilement horizontal du tableau"
          tabIndex={0}
          className="h-4 w-full overflow-x-auto overflow-y-hidden border-x border-transparent"
          onScroll={() => {
            if (containerRef.current && topScrollRef.current && containerRef.current.scrollLeft !== topScrollRef.current.scrollLeft) {
              containerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
            }
          }}
        >
          <div aria-hidden="true" className="h-px" style={{ width: scrollWidth }} />
        </div>
      )}
      {container}
      {floatingScroll && <FloatingTableScrollbar containerRef={containerRef} tableId={tableId} />}
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-gray-50 [&_tr]:border-b [&_tr]:border-gray-100",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-gray-50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-gray-100 transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-50",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-gray-500 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3 align-middle whitespace-nowrap text-gray-700 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-gray-500", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
