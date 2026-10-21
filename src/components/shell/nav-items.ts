import { House, Users, type LucideIcon } from 'lucide-react';
import type { Route } from 'next';

export type NavItem = { href: Route; label: string; icon: LucideIcon };

// Sections are added here as each vertical slice lands (assessments, results).
export const NAV_ITEMS: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/cursos', label: 'Cursos', icon: Users },
];
