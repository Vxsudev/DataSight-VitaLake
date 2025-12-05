"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, LayoutDashboard, SquareCode, Settings } from 'lucide-react';
import { SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

const navItems = [
  { href: '/dbs', icon: Database, label: 'Databases' },
  { href: '/sql-studio', icon: SquareCode, label: 'SQL Studio' },
  { href: '/dashboards', icon: LayoutDashboard, label: 'Dashboards' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/dbs" className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div 
              className="h-2.5 w-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
              style={{ animation: 'pulse 3s ease-in-out infinite' }}
            ></div>
            <div 
              className="absolute inset-0 h-2.5 w-2.5 bg-green-400 rounded-full opacity-75"
              style={{ animation: 'ping 4s cubic-bezier(0, 0, 0.2, 1) infinite' }}
            ></div>
          </div>
          <span className="text-lg font-semibold tracking-tight">DataSight for VitaLake</span>
        </Link>
      </SidebarHeader>
      <SidebarMenu>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild>
              <Link href={item.href} className="flex items-center gap-3 w-full">
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );
}
