import { Suspense } from 'react';
import Link from 'next/link';
import { getDashboards } from '@/lib/data';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

async function DashboardList() {
  const dashboards = await getDashboards();

  return (
    <div className="space-y-4">
      {dashboards.map((dashboard) => (
        <Link href={`/dashboards/${dashboard.id}`} key={dashboard.id}>
          <Card className="transition-colors hover:bg-card/60 hover:border-accent">
            <CardHeader>
              <CardTitle>{dashboard.name}</CardTitle>
              <CardDescription>{dashboard.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function DashboardListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}

export default function DashboardsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboards"
        description="Visualize your data through custom dashboards."
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Dashboard
        </Button>
      </PageHeader>
      <Suspense fallback={<DashboardListSkeleton />}>
        <DashboardList />
      </Suspense>
    </div>
  );
}
