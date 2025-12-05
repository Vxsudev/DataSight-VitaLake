import { Suspense } from 'react';
import { getDashboard } from '@/lib/data';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { DashboardGrid } from '@/components/dashboards/dashboard-grid';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardPageProps = {
  params: {
    dashboardId: string;
  };
};

function DashboardGridSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Skeleton className="h-[380px] w-full" />
            <Skeleton className="h-[380px] w-full" />
        </div>
    )
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const dashboard = await getDashboard(params.dashboardId);

  if (!dashboard) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={dashboard.name} description={dashboard.description} />
      <Suspense fallback={<DashboardGridSkeleton />}>
        <DashboardGrid dashboard={dashboard} />
      </Suspense>
    </div>
  );
}
