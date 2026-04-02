import { useLeaveBalances } from "@/hooks/TimeManagement/useLeaveBalances";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveBalanceOverviewProps {
  year: number;
}

export function LeaveBalanceOverview({ year }: LeaveBalanceOverviewProps) {
  const { data: summaries = [], isLoading } = useLeaveBalances(year);

  const totalAllocated = summaries.reduce((s, r) => s + r.total_allocated, 0);
  const totalUsed      = summaries.reduce((s, r) => s + r.total_used, 0);
  const overallPct     = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Balance Overview
            </CardTitle>
            <CardDescription>
              Organisation-wide leave usage for {year}
            </CardDescription>
          </div>
          {!isLoading && (
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{overallPct}%</p>
              <p className="text-xs text-muted-foreground">overall used</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
            <TrendingDown className="h-8 w-8 opacity-30" />
            <p className="text-sm">No balance data for {year}</p>
          </div>
        ) : (
          summaries.map((s) => {
            const pct = s.total_allocated > 0
              ? Math.round((s.total_used / s.total_allocated) * 100)
              : 0;
            const isHigh = pct >= 80;
            const isMed  = pct >= 50;

            return (
              <div key={s.leave_type_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: s.leave_type_color }}
                    />
                    <span className="font-medium">{s.leave_type_name}</span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.total_employees}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      <span className={cn(
                        "font-semibold",
                        isHigh ? "text-rose-600" : isMed ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {s.total_used}d
                      </span>
                      {" "}/{" "}
                      {s.total_allocated}d
                    </span>
                    <span className="font-medium w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={pct}
                  className="h-1.5"
                  style={{
                    // colour the filled portion
                    ["--progress-color" as any]:
                      isHigh ? "#e11d48" : isMed ? "#d97706" : s.leave_type_color,
                  }}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground/70">
                  <span>{s.avg_remaining}d avg remaining per employee</span>
                  <span>{s.total_remaining}d total remaining</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}