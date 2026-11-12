import { useEffect, useRef } from 'react';
import type { SceneView } from '../engine/engine';
import type { Character, Tip } from '../engine/types';
import { STYLE_LABEL } from '../labels';
import { Nameplate, accentOf } from '../ui/ui';

/** Một cuộc nói chuyện đang diễn ra trong màn chơi. */
export type Talk =
  /** Đang chọn câu đáp (scene hội thoại của NPC, đồ vật hoặc sự kiện). */
  | { kind: 'choose'; key: string; sceneId: string; view: SceneView; /** Bị bong bóng câu hỏi trúng. */ hit?: boolean }
  /** Nhân vật phản ứng sau lựa chọn: hiện câu bạn vừa nói, phản ứng, và có thể kèm thẻ mẹo. */
  | { kind: 'reply'; key: string; speaker: Character; said: string; reply: string; tip: Tip | null; feed?: boolean }
  /** Một câu thoại đơn (vuốt ve chó, lời chào lại khi đã nói chuyện xong, đồ chưa dùng được). */
  | { kind: 'line'; key: string; speaker: Character | null; title?: string; text: string }
  /** Cuộc gọi video đến (sự kiện): bấm Nghe thì vào hội thoại. */
  | { kind: 'call'; key: string; caller: Character; sceneIds: readonly string[] };

/** Tiếp / Nghe: nút chính của khung, bỏ qua phím lặp lúc vừa mở (giữ Enter không được đóng ngay). */
function MainButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus({ preventScroll: true }), []);
  return (
    <button
      ref={btn}
      className="btn btn-block"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.repeat) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}

export function TalkPanel({
  talk,
  playerName,
  onChoose,
  onClose,
  onAnswer,
}: Readonly<{
  talk: Talk;
  playerName: string;
  onChoose: (choiceId: string) => void;
  onClose: () => void;
  onAnswer: () => void;
}>) {
  if (talk.kind === 'call') {
    return (
      <section className="sheet sheet-call" aria-live="assertive">
        <div className="call">
          <span className="call-avatar" style={{ background: accentOf(talk.caller) }} aria-hidden="true">
            {talk.caller.name.slice(0, 1)}
          </span>
          <div>
            <p className="call-name">{talk.caller.name}</p>
            <p className="call-status">đang gọi video cho bạn...</p>
          </div>
        </div>
        <MainButton label="Nghe máy" onClick={onAnswer} />
      </section>
    );
  }

  if (talk.kind === 'choose') {
    const { view } = talk;
    const feed = view.scene.ui === 'feed';
    return (
      <section className={feed ? 'sheet sheet-feed' : 'sheet'} aria-live="polite">
        <Nameplate ch={view.speaker} name={view.speaker.name} role={view.speaker.role} />
        <p className="line">{view.line}</p>
        {view.lines.map((l, i) => (
          <p key={`${l.character.id}-${i}`} className="aside">
            <strong>{l.character.name}:</strong> {l.text}
          </p>
        ))}
        {feed ? (
          <div className="phone" role="list" aria-label="Bài đăng">
            {view.choices.map((ch) => (
              <button key={ch.id} role="listitem" className="post" onClick={() => onChoose(ch.id)}>
                <span className="post-author">{ch.author}</span>
                <span className="post-text">{ch.text}</span>
                <span className="post-cta">Chọn</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="options">
            {view.choices.map((ch) => (
              <button key={ch.id} className={`option option-${ch.style}`} onClick={() => onChoose(ch.id)}>
                <span className="option-style">{STYLE_LABEL[ch.style]}</span>
                <span className="option-text">{ch.text}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (talk.kind === 'reply') {
    return (
      <section className="sheet" aria-live="polite">
        {talk.said && (
          <p className="said">
            <span className="said-name">{talk.feed ? 'Bạn chọn' : playerName || 'Bạn'}</span>
            {talk.said}
          </p>
        )}
        <Nameplate ch={talk.speaker} name={talk.speaker.name} />
        <p className="line">{talk.reply}</p>
        {talk.tip && (
          <aside className="tip">
            <strong>Mẹo thật</strong>
            <span>{talk.tip.text}</span>
            <small>Nguồn: {talk.tip.source}</small>
          </aside>
        )}
        <MainButton label="Tiếp" onClick={onClose} />
      </section>
    );
  }

  return (
    <section className="sheet" aria-live="polite">
      {talk.speaker ? (
        <Nameplate ch={talk.speaker} name={talk.speaker.name} role={talk.speaker.role} />
      ) : (
        talk.title && <Nameplate name={talk.title} />
      )}
      <p className="line">{talk.text}</p>
      <MainButton label="Tiếp" onClick={onClose} />
    </section>
  );
}
