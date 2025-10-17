import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <div className=" bg-white/50 backdrop-blur-sm rounded-t-lg p-2 sticky top-[73px] z-10">
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "-mb-px flex space-x-6 ",
        className
      )}
      role="tablist"
      aria-label="Tabs"
      {...props}
    />
  </div>
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
      "data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 ",
      "data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500",
      "data-[state=inactive]:hover:text-gray-700 data-[state=inactive]:hover:border-gray-300 ",
      className
    )}
    role="tab"
    aria-current={props["data-state"] === "active" ? "page" : undefined}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName


const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }