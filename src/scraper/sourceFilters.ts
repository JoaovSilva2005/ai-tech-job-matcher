import { classifyRole, isLikelyTechJobTitle } from '../matcher/classifyRole';
import type { ScrapeOptions } from './types';

export function matchesRequestedRole(
  role: ScrapeOptions['role'],
  title: string,
  description: string
): boolean {
  if (!role || role === 'unknown' || role === 'internship') return true;
  if (role === 'all') return isLikelyTechJobTitle(title);
  return classifyRole(title, description) === role;
}
