import { getChart } from "@/lib/data";
import type { Dashboard } from "@/lib/types";
import { ChartCard } from "./chart-card";

interface DashboardGridProps {
  dashboard: Dashboard;
}

async function ChartLoader({ chartId }: { chartId: string }) {
  const chart = await getChart(chartId);
  if (!chart) return <div className="rounded-lg border border-dashed p-4 text-center">Chart not found</div>;
  return <ChartCard chart={chart} />;
}

export function DashboardGrid({ dashboard }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {dashboard.items.map(item => (
        <div key={item.id} style={{ gridColumn: `span ${item.position.w}`, gridRow: `span ${item.position.h}`}}>
          <ChartLoader chartId={item.chartId} />
        </div>
      ))}
    </div>
  );
}
