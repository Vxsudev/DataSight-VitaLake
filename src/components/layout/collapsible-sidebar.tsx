"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CollapsibleSidebarProps {
  children: React.ReactNode;
  title?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSidebar({ 
  children, 
  title, 
  defaultOpen = true,
  className 
}: CollapsibleSidebarProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(defaultOpen && !isMobile);

  React.useEffect(() => {
    setIsOpen(defaultOpen && !isMobile);
  }, [isMobile, defaultOpen]);

  return (
    <div className={cn("relative", className)}>
      <Card className={cn(
        "transition-all duration-300 ease-in-out flex flex-col",
        isOpen ? "w-80" : "w-12",
        "h-full", // Use full height of parent container
        isMobile && !isOpen && "fixed left-4 top-20 z-50 shadow-lg"
      )}>
        <div className="relative flex flex-col h-full">
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-2 z-10 h-8 w-8 p-0 hover:bg-accent"
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          {/* Content */}
          <div className={cn(
            "transition-all duration-300 ease-in-out flex flex-col flex-1 min-h-0",
            isOpen ? "opacity-100 p-4 pr-12" : "opacity-0 overflow-hidden p-0 w-0"
          )}>
            {title && (
              <h3 className="mb-2 text-sm font-semibold truncate flex-shrink-0">{title}</h3>
            )}
            <div className={cn(
              "transition-all duration-300 flex-1 min-h-0",
              "max-h-96 overflow-y-scroll", // Force scrolling with max height
              isOpen ? "block" : "hidden"
            )}>
              {children}
            </div>
            {/* Subtle scroll indicator gradient */}
            {isOpen && (
              <div className="absolute bottom-0 left-4 right-12 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
          
          {/* Collapsed State Indicator */}
          {!isOpen && (
            <div className="flex h-12 w-12 items-center justify-center">
              <div 
                className="rotate-90 text-xs font-medium text-muted-foreground truncate w-8"
                title={title || "Panel"}
              >
                {(title || "Panel").slice(0, 4)}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
