import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

type SectionCardProps = {
  children: ReactNode;
  className?: string;
};

export default function SectionCard({ children, className }: SectionCardProps) {
  return <div className={cn('section-card', className)}>{children}</div>;
}
