import { useEffect, useRef } from 'react';
import type { SceneView } from '../engine/engine';
import type { Character, Tip } from '../engine/types';
import { STYLE_LABEL } from '../labels';
import { Nameplate, accentOf } from '../ui/ui';

/** Một cuộc nói chuyện đang diễn ra trong màn chơi. */
export type Talk =
  /** Đang chọn câu đáp (scene hội thoại của NPC, đồ vật hoặc sự kiện). */
  | { kind: 'choose'; key: string; sceneId: string; view: SceneView; /** Bị bắt khi lao tới hỏi. */ hit?: boolean }
  /**
   * Sau lựa chọn: câu bạn vừa nói (bong bóng trên đầu bạn) và phản ứng của NPC (bong bóng trên đầu họ) hiện cùng lúc,
   * bung ra hai phía ngược nhau; kèm thẻ mẹo nếu có.
   */
  | { kind: 'reply'; key: string; speaker: Character; said: string; reply: string; tip: Tip | null; feed?: boolean }
  /** Một câu thoại đơn (vuốt ve chó, lời chào lại, đồ chưa dùng được). */
  | { kind: 'line'; key: string; speaker: Character | null; title?: string; text: string }
  /** Cuộc gọi video đến (sự kiện): bấm Nghe thì vào hội thoại. */
  | { kind: 'call'; key: string; caller: Character; sceneIds: readonly string[] };

/** Phím tắt chọn đáp án: chữ A, B, C... (feed tối đa 6 bài) hoặc số 1, 2, 3... */
export const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Lựa chọn thứ mấy ứng với phím vừa bấm (theo `event.code`), hoặc -1. */
export function choiceIndexOf(code: string, count: number): number {
  const m = /^(?:Key([A-F])|Digit([1-6])|Numpad([1-6]))$/.exec(code);
  if (!m) return -1;
  const i = m[1] ? m[1].charCodeAt(0) - 65 : Number(m[2] ?? m[3]) - 1;
  return i < count ? i : -1;
}

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
 * Phần hội thoại ở đáy màn hình (docs/07). Người nói đang đứng trong cảnh thì lời của họ là bong bóng trên đầu
 * (RoamView) và dock chỉ còn lựa chọn / nút Tiếp; người nói không có trong cảnh (Bé Dê, Mẹ qua điện thoại, máy tính)
 * thì lời nằm trong dock. Câu bạn vừa chọn là bong bóng trên đầu bạn, hiện cùng lúc với lời NPC đáp.
 */
export function TalkDock({
  talk,
  speakerOnMap,
  onChoose,
  onClose,
  onAnswer,
}: Readonly<{
  talk: Talk;
  /** Lời nói đã nằm trong bong bóng trên đầu ai đó trong cảnh (dock không nhắc lại). */
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

  if (talk.kind === 'choose') return <ChooseDock talk={talk} speakerOnMap={speakerOnMap} onChoose={onChoose} />;

  const speaker = talk.speaker;
  const text = talk.kind === 'reply' ? talk.reply : talk.text;
  const showText = !speakerOnMap || speaker === null;
  const tip = talk.kind === 'reply' ? talk.tip : null;
  // Lời nói đã nằm hết trong bong bóng và không có thẻ mẹo: chỉ còn nút Tiếp nổi gọn, không khung.
  if (!showText && !tip) {
    return (
      <div className="next-float">
        <NextButton label="Tiếp ▸" onClick={onClose} />
      </div>
    );
  }
  return (
    <section className="dock dock-slim" aria-live="polite">
      {showText && (
        <p className="dock-say">
          {speaker ? <Nameplate ch={speaker} name={speaker.name} /> : talk.kind === 'line' && talk.title && <Nameplate name={talk.title} />}
          <span>{text}</span>
        </p>
      )}
      {tip && (
        <aside className="tip">
          <strong>Mẹo thật</strong> {tip.text}
          <small>Nguồn: {tip.source}</small>
        </aside>
      )}
      <div className="dock-actions">
        <NextButton label="Tiếp ▸" onClick={onClose} />
      </div>
    </section>
  );
}

/** Chọn câu đáp / bài đăng; phím A, B, C... hoặc 1, 2, 3... chọn nhanh không cần chuột. */
function ChooseDock({
  talk,
  speakerOnMap,
  onChoose,
}: Readonly<{ talk: Extract<Talk, { kind: 'choose' }>; speakerOnMap: boolean; onChoose: (choiceId: string) => void }>) {
  const { view } = talk;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const ch = view.choices[choiceIndexOf(e.code, view.choices.length)];
      if (!ch) return;
      e.preventDefault();
      onChoose(ch.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, onChoose]);

  if (view.scene.ui === 'feed') {
    return (
      <section className="phone" aria-live="polite" aria-label="Điện thoại">
        <p className="phone-head">{view.line}</p>
        <div className="phone-feed" role="list">
          {view.choices.map((ch, i) => (
            <button key={ch.id} role="listitem" className="post" onClick={() => onChoose(ch.id)} aria-keyshortcuts={CHOICE_KEYS[i]}>
              <span className="post-author">
                <kbd className="key">{CHOICE_KEYS[i]}</kbd> {ch.author}
              </span>
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
        <p className="dock-say">
          <Nameplate ch={view.speaker} name={view.speaker.name} />
          <span>{view.line}</span>
        </p>
      )}
      {view.lines.map((l, i) => (
        <p key={`${l.character.id}-${i}`} className="dock-aside">
          <strong>{l.character.name}:</strong> {l.text}
        </p>
      ))}
      <div className="opts">
        {view.choices.map((ch, i) => (
          <button key={ch.id} className={`opt opt-${ch.style}`} onClick={() => onChoose(ch.id)} aria-keyshortcuts={CHOICE_KEYS[i]}>
            <kbd className="key">{CHOICE_KEYS[i]}</kbd>
            <span className="opt-style">{STYLE_LABEL[ch.style]}</span>
            <span className="opt-text">{ch.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
