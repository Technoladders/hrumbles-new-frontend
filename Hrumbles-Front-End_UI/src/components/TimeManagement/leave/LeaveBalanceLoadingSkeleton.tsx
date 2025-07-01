
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function LeaveBalanceLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {Array(3).fill(0).map((_, i) => (
        <Card 
          key={i} 
          className="overflow-hidden border-none shadow-md bg-gradient-to-br from-background to-muted/30"
        >
          <CardHeader className="pb-2">
            <div className="h-6 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-40 bg-muted rounded animate-pulse mt-2"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
