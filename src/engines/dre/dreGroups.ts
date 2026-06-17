import type { DREGroup } from '../../domain/enums';
import { DRE_CATEGORY_MAP } from '../../domain/enums';

export function getGroupForCategory(categoria: string): DREGroup | null {
  const group = DRE_CATEGORY_MAP[categoria];
  if (!group) {
    return null;
  }
  return group;
}

export { DRE_CATEGORY_MAP };
