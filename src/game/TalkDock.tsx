import { useEffect, useRef } from 'react';
import type { SceneView } from '../engine/engine';
import type { Character, Tip } from '../engine/types';
import { STYLE_LABEL } from '../labels';
import { Nameplate, accentOf } from '../ui/ui';

/** Một cuộc nói chuyện đang diễn ra trong màn chơi. */
export type Talk =
  /** Đang chọn câu đáp (scene hội thoại của NPC, đồ vật hoặc sự kiện). */
  | { kind: 'choose'; key: string; sceneId: string; view: SceneView; /** Bị bắt khi lao tới hỏi. */ hit?: boolean }
  /** Nhân vật phản ứng sau lựa chọn: câu bạn vừa nói, phản ứng, có thể kèm thẻ mẹo. */
  | { kind: 'reply'; key: string; speaker: Character; said: string; reply: string; tip: Tip | null; feed?: boolean }
  /** Một câu thoại đơn (vuốt ve chó, lời chào lại, đồ chưa dùng được). */
  | { kind: 'line'; key: string; speaker: Character | null; title?: string; text: string }
  /** Cuộc gọi video đến (sự kiện): bấm Nghe thì vào hội thoại. */
  | { kind: 'call'; key: string; caller: Character; sceneIds: readonly string[] };

/** Nút Tiếp / Nghe: tự nhận focus, bỏ qua phím lặp lúc vừa mở (giữ Enter không đóng ngay). */
function NextButton({ label, onClick, tone = 'primary' }: Readonly<{ label: string; onClick: () => void; tone?: 'primary' | 'call' }>) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus({ preventScroll: true }), []);
  return (
    <button
      ref={btn}
      className={tone === 'call' ? 'btn btn-call' : 'btn btn-small'}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.repeat) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

/**
 * Phần hội thoại ở đáy màn hình (docs/07). Lời của NPC đang đứng trong cảnh hiện thành bong bóng trên đầu họ
 * (RoamView), nên dock chỉ còn lựa chọn và nút Tiếp. Người nói không có trong cảnh (Bé Dê, Mẹ qua điện thoại,
 * máy tính) thì lời nói hiện ngay trong dock.
 */
export function TalkDock({
  talk,
  speakerOnMap,
  onChoose,
  onClose,
  onAnswer,
}: Readonly<{
  talk: Talk;
  /** Người nói đang đứng trong cảnh (lời nói đã có bong bóng). */
  speakerOnMap: boolean;
  onChoose: (choiceId: string) => void;
  onClose: () => void;
  onAnswer: () => void;
}>) {
  if (talk.kind === 'call') {
    return (
      <section className="callcard" aria-live="assertive">
        <span className="call-avatar" style={{ background: accentOf(talk.caller) }} aria-hidden="true">
          {talk.caller.name.slice(0, 1)}
        </span>
        <div className="call-info">
          <strong>{talk.caller.name}</strong>
          <span>đang gọi video...</span>
        </div>
        <NextButton label="Nghe" tone="call" onClick={onAnswer} />
      </section>
    );
  }

  if (talk.kind === 'choose') {
    const { view } = talk;
    if (view.scene.ui === 'feed') {
      return (
        <section className="phone" aria-live="polite" aria-label="Điện thoại">
          <p className="phone-head">{view.line}</p>
          <div className="phone-feed" role="list">
            {view.choices.map((ch) => (
              <button key={ch.id} role="listitem" className="post" onClick={() => onChoose(ch.id)}>
                <span className="post-author">{ch.author}</span>
                <span className="post-text">{ch.text}</span>
              </button>
            ))}
          </div>
        </section>
      );
    }
    return (
      <section className="dock" aria-live="polite">
        {!speakerOnMap && (
          <div className="dock-say">
            <Nameplate ch={view.speaker} name={view.speaker.name} />
            <p>{view.line}</p>
          </div>
        )}
        {view.lines.map((l, i) => (
          <p key={`${l.character.id}-${i}`} className="dock-aside">
            <strong>{l.character.name}:</strong> {l.text}
          </p>
        ))}
        <div className="opts">
          {view.choices.map((ch) => (
            <button key={ch.id} className={`opt opt-${ch.style}`} onClick={() => onChoose(ch.id)}>
              <span className="opt-style">{STYLE_LABEL[ch.style]}</span>
              <span className="opt-text">{ch.text}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const text = talk.kind === 'reply' ? talk.reply : talk.text;
  const speaker = talk.kind === 'reply' ? talk.speaker : talk.speaker;
  const showText = !speakerOnMap || speaker === null;
  return (
    <section className="dock dock-slim" aria-live="polite">
      {showText && (
        <div className="dock-say">
          {speaker ? <Nameplate ch={speaker} name={speaker.name} /> : talk.kind === 'line' && talk.title && <Nameplate name={talk.title} />}
          <p>{text}</p>
        </div>
      )}
      {talk.kind === 'reply' && talk.tip && (
        <aside className="tip">
          <strong>Mẹo thật</strong> {talk.tip.text}
          <small>Nguồn: {talk.tip.source}</small>
        </aside>
      )}
      <div className="dock-actions">
        <NextButton label="Tiếp ▸" onClick={onClose} />
      </div>
    </section>
  );
}
