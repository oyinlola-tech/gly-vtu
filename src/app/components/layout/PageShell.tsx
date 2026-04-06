import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export default function PageShell({ children, className }: PageShellProps) {
  return <div className={cn('page-shell', className)}>{children}</div>;
}
