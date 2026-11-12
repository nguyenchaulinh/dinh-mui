import { validateContent } from '../engine/validate';
import type { Content } from '../engine/types';
import { SETS } from '../scene3d/registry';
import { ROAM_SETS } from '../scene3d/walk';
import v1 from './v1.json';

/**
 * Nạp và kiểm tra nội dung lúc khởi động. Nội dung hỏng thì fail fast
 * (lỗi rõ ràng) thay vì chạy sai.
 */
export function loadContent(raw: unknown = v1): Content {
  const content = raw as Content;
  const errors = validateContent(content, { sets: SETS, roamSets: ROAM_SETS });
  if (errors.length > 0) {
    throw new Error(`Nội dung không hợp lệ:\n- ${errors.join('\n- ')}`);
  }
  return content;
}
