
import { Skeleton } from "@/components/ui/skeleton";

export function TimelineLoadingSkeleton() {
  return (
    <div>
      <h3 className="font-medium text-lg mb-5">Recent Activity</h3>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative">
            <div className="ml-8 bg-white rounded-lg border p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
