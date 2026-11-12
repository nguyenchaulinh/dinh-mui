import type { Content } from '../engine/types';
import { Footer } from './Footer';

export interface Selection {
  personaId: string | null;
  regionIds: string[];
}

/** Màn chọn vai và nơi xuất phát; chọn nhiều thành phố thì mỗi lượt chơi lấy ngẫu nhiên một thành phố. */
export function Setup({
  content,
  selection,
  onSelect,
  onStart,
}: Readonly<{
  content: Content;
  /** Lựa chọn nằm ở App để không mất khi vào/ra màn chơi. */
  selection: Selection;
  onSelect: (s: Selection) => void;
  onStart: (personaId: string, regionIds: string[]) => void;
}>) {
  const { personaId, regionIds } = selection;
  const allIds = content.regions.map((r) => r.id);
  const allSelected = regionIds.length === allIds.length;
  const toggle = (id: string) =>
    onSelect({ personaId, regionIds: regionIds.includes(id) ? regionIds.filter((x) => x !== id) : [...regionIds, id] });

  return (
    <main className="setup">
      <h1>Đinh Mùi: Tết Mệt Phết</h1>
      <p>Bạn là ai?</p>
      {content.personas.map((p) => (
        <button
          key={p.id}
          className="choice"
          aria-pressed={personaId === p.id}
          onClick={() => onSelect({ personaId: p.id, regionIds })}
        >
          <strong>{p.name}</strong>
          <br />
          <small>{p.description}</small>
        </button>
      ))}
      <p>Xuất phát từ đâu? (chọn 1 hoặc nhiều)</p>
      {content.regions.map((r) => (
        <button key={r.id} className="choice" aria-pressed={regionIds.includes(r.id)} onClick={() => toggle(r.id)}>
          <strong>{r.city}</strong>
          <br />
          <small>{r.tagline}</small>
        </button>
      ))}
      <button
        className="choice"
        aria-pressed={allSelected}
        onClick={() => onSelect({ personaId, regionIds: allSelected ? [] : allIds })}
      >
        <strong>Cả {allIds.length} thành phố</strong>
      </button>
      <button
        className="choice start"
        disabled={!personaId || regionIds.length === 0}
        onClick={() => personaId && onStart(personaId, regionIds)}
      >
        Lên đường về quê
      </button>
      <Footer />
    </main>
  );
}
