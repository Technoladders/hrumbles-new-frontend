import { Button } from "@/components/ui/button";
import { Plus, Settings2, CalendarDays, TrendingUp, Building2, Download } from "lucide-react";
import { HolidayStats } from "@/hooks/TimeManagement/useHolidays";
import { cn } from "@/lib/utils";

interface HolidayHeaderProps {
  onAddHolidayClick: () => void;
  onWeekendConfigClick: () => void;
  onImportClick: () => void;
  stats: HolidayStats;
  year: number;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconClass?: string;
  valueClass?: string;
}

function StatCard({ icon: Icon, label, value, sub, iconClass, valueClass }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-violet-100 bg-white dark:border-violet-900 dark:bg-violet-950/20 min-w-[140px]">
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
        iconClass ?? "bg-violet-100 dark:bg-violet-900"
      )}>
        <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <p className={cn("text-2xl font-bold leading-none", valueClass ?? "text-violet-700 dark:text-violet-300")}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}

export const HolidayHeader = ({
  onAddHolidayClick,
  onWeekendConfigClick,
  onImportClick,
  stats,
  year,
}: HolidayHeaderProps) => {
  const nationalCount = stats.byType["National"] ?? 0;
  const regionalCount = stats.byType["Regional"] ?? 0;
  const companyCount  = stats.byType["Company"] ?? 0;

  return (
    <div className="space-y-5 mb-8">
      {/* Title row */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-sm">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-purple-300">
              Official Holidays
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Manage company holidays for {year} — applies to timesheet, leave &amp; attendance
          </p>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950"
            onClick={onImportClick}
          >
            <Download className="h-4 w-4" />
            Import Holidays
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950"
            onClick={onWeekendConfigClick}
          >
            <Settings2 className="h-4 w-4" />
            Weekend Config
          </Button>
          <Button
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-sm"
            onClick={onAddHolidayClick}
          >
            <Plus className="h-4 w-4" />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          icon={CalendarDays}
          label={`Total in ${year}`}
          value={stats.totalThisYear}
          iconClass="bg-violet-100 dark:bg-violet-900/60"
        />
        <StatCard
          icon={TrendingUp}
          label="Upcoming this month"
          value={stats.upcomingThisMonth}
          iconClass="bg-emerald-100 dark:bg-emerald-900/40"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />

        {/* Type breakdown */}
        {nationalCount > 0 && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-violet-100 bg-white dark:border-violet-900 dark:bg-violet-950/20">
            <div className="flex gap-3">
              {[
                { label: "National", count: nationalCount, cls: "text-violet-600 dark:text-violet-400" },
                { label: "Regional", count: regionalCount, cls: "text-teal-600 dark:text-teal-400" },
                { label: "Company",  count: companyCount,  cls: "text-amber-600 dark:text-amber-400" },
              ].filter(t => t.count > 0).map(t => (
                <div key={t.label} className="text-center min-w-[48px]">
                  <p className={cn("text-xl font-bold leading-none", t.cls)}>{t.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <StatCard
          icon={Building2}
          label="Organizations"
          value="1"
          sub="current org"
          iconClass="bg-purple-100 dark:bg-purple-900/40"
          valueClass="text-purple-600 dark:text-purple-400"
        />
      </div>
    </div>
  );
};