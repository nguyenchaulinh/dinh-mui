import { CONTACT_EMAIL } from '../contact';
import { DISCLAIMER } from '../labels';

/** Chân trang chung: tuyên bố hư cấu và (nếu đã cấu hình) email liên hệ. */
export function Footer() {
  return (
    <footer>
      {DISCLAIMER}
      {CONTACT_EMAIL && (
        <>
          {' '}
          Liên hệ: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </>
      )}
    </footer>
  );
}
