"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { DayPicker } from "react-day-picker";

import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  date?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  // Handle date selection to prevent timezone issues
  const handleSelect = React.useCallback(
    (day: Date | undefined) => {
      if (!day) {
        if (onSelect) onSelect(undefined);
        return;
      }

      // Set the time to noon to avoid timezone issues
      const normalizedDate = new Date(day);
      normalizedDate.setHours(12, 0, 0, 0);

      if (onSelect) onSelect(normalizedDate);
    },
    [onSelect],
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white border rounded-lg shadow-md", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
        month: "space-y-6",
        caption: "flex justify-center pt-2 pb-3 relative items-center",
        caption_label: "text-base font-semibold text-foreground",
        nav: "space-x-2 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-9 w-9 bg-background p-0 opacity-80 hover:opacity-100 hover:bg-muted transition-opacity",
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse space-y-2",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-10 font-medium text-[0.9rem] py-1",
        row: "flex w-full mt-2",
        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-muted/50 transition-colors",
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-medium",
        day_today: "bg-accent text-accent-foreground ring-1 ring-primary/20",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeftIcon className="h-6 w-6" />,
        IconRight: () => <ChevronRightIcon className="h-6 w-6" />,
      }}
      selected={selected}
      onSelect={handleSelect}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
