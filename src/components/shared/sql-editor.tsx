import React from 'react';
import { Textarea, TextareaProps } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export const SqlEditor = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(
          'min-h-[200px] flex-1 font-code text-base leading-relaxed tracking-wider bg-card border-2 border-input focus:border-primary',
          className
        )}
        placeholder="SELECT * FROM your_table;"
        {...props}
      />
    );
  }
);
SqlEditor.displayName = 'SqlEditor';
