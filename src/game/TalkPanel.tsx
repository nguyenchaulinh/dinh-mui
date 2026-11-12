import { useEffect, useRef } from 'react';
import type { Character, GameState, Tip } from '../engine/types';
import type { SceneView } from '../engine/engine';
import { STYLE_LABEL } from '../labels';

/** Một cuộc nói chuyện đang diễn ra trong chế độ đi lại. */
export type Talk =
  /** Đang chọn câu đáp (scene hội thoại dùng lại từ engine). */
  | { kind: 'choose'; key: string; state: GameState; view: SceneView; /** Bị bong bóng câu hỏi trúng (không phải chủ động nói chuyện). */ hit?: boolean }
  /** Nhân vật phản ứng sau lựa chọn, có thể kèm thẻ mẹo. */
  | { kind: 'reply'; key: string; speaker: Character; reply: string; tip: Tip | null }
  /** Một câu thoại đơn (vuốt ve chó, hoặc lời chào lại khi đã nói chuyện xong). */
  | { kind: 'line'; key: string; speaker: Character; text: string };

export function TalkPanel({
  talk,
  onChoose,
  onClose,
}: Readonly<{ talk: Talk; onChoose: (choiceId: string) => void; onClose: () => void }>) {
  if (talk.kind === 'choose') {
    const { view } = talk;
    return (
      <section className="panel" aria-live="polite">
        <p className="speaker">
          {view.speaker.name} <small>· {view.speaker.role}</small>
        </p>
        <p className="line">{view.line}</p>
        {view.lines.map((l, i) => (
          <p key={`${l.character.id}-${i}`} className="aside">
            <strong>{l.character.name}:</strong> {l.text}
          </p>
        ))}
        {view.choices.map((ch) => (
          <button key={ch.id} className="choice" onClick={() => onChoose(ch.id)}>
            <small>{STYLE_LABEL[ch.style]}</small>
            <br />
            {ch.text}
          </button>
        ))}
      </section>
    );
  }

  return <ClosePanel talk={talk} onClose={onClose} />;
}

/** Khung một câu (phản ứng hoặc câu thoại đơn) với nút Tiếp. */
function ClosePanel({ talk, onClose }: Readonly<{ talk: Exclude<Talk, { kind: 'choose' }>; onClose: () => void }>) {
  const text = talk.kind === 'reply' ? talk.reply : talk.text;
  const btn = useRef<HTMLButtonElement>(null);
  // Đưa focus vào nút Tiếp (để Enter/Space đóng được) nhưng không cuộn khung xuống đáy làm mất dòng thoại.
  useEffect(() => btn.current?.focus({ preventScroll: true }), []);
  return (
    <section className="panel" aria-live="polite">
      <p className="speaker">
        {talk.speaker.name} <small>· {talk.speaker.role}</small>
      </p>
      <p className="line">{text}</p>
      {talk.kind === 'reply' && talk.tip && (
        <aside className="tip">
          <strong>Mẹo thật:</strong> {talk.tip.text}
          <br />
          <small>Nguồn: {talk.tip.source}</small>
        </aside>
      )}
      <button
        ref={btn}
        className="choice start"
        onClick={onClose}
        // Giữ Enter/Space lúc hội thoại vừa mở sẽ bắn keydown lặp vào nút này và đóng ngay: bỏ qua phím lặp.
        onKeyDown={(e) => {
          if (e.repeat) e.preventDefault();
        }}
      >
        Tiếp
      </button>
    </section>
  );
}
