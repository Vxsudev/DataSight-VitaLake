"use client";

import React, { useState } from 'react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Breadcrumbs } from './breadcrumbs';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '../ui/button';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keyboard shortcut for master refresh (Ctrl/Cmd + Shift + R)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        handleMasterRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMasterRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Show user feedback
      console.log('🔄 Master refresh initiated...');
      
      // Clear any cached data in localStorage/sessionStorage
      const keysToKeep = ['sql-studio-history']; // Keep query history
      const localStorageKeys = Object.keys(localStorage);
      localStorageKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage except for chart data
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (!key.startsWith('chart-data-')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear any browser caches for API calls
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Add a small delay for better user experience
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Cache cleared, reloading page...');
      
      // Trigger a hard refresh of the current page
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error during master refresh:', error);
      setIsRefreshing(false);
      
      // Even if there's an error, try to reload the page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 flex-shrink-0">
            <SidebarTrigger className="h-8 w-8" title="Toggle navigation" />
            <Breadcrumbs />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMasterRefresh}
                disabled={isRefreshing}
                className="gap-2"
                title="Refresh all data and UI (Ctrl+Shift+R / ⌘+Shift+R)"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6 min-h-0 w-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
