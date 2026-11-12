import { describe, expect, it } from 'vitest';
import { loadContent } from '../content';
import { choose, createGame } from '../engine/engine';
import { HIT_FLAG, withFlag } from '../engine/quests';
import { mergeChoice } from './talkMerge';

const content = loadContent();
const SCENE = 'roam-ut-dl'; // Dì Út hỏi lương (persona moi-di-lam)
const open = () => ({ ...createGame(content, 'moi-di-lam', ['ha-noi']), sceneId: SCENE });

describe('mergeChoice', () => {
  it('giữ cờ và chỉ số được cập nhật SAU lúc mở hội thoại (không ghi đè bằng ảnh chụp cũ)', () => {
    const snapshot = open();
    // Sau khi mở hội thoại: bị trúng (cờ hit:1) và né đủ mốc (dodged:3), thưởng nhiệm vụ làm tăng Sức chịu đựng.
    let latest = withFlag(withFlag(snapshot, HIT_FLAG), 'dodged:3');
    latest = { ...latest, stats: { ...latest.stats, stamina: 80 } };

    const merged = mergeChoice(content, snapshot, latest, 'b'); // thật thà: harmony -5, stamina +5
    expect(merged.flags).toContain(HIT_FLAG);
    expect(merged.flags).toContain('dodged:3');
    // Hiệu ứng áp lên state mới nhất: 80 + 5, không phải 50 + 5.
    expect(merged.stats.stamina).toBe(85);
    expect(merged.stats.harmony).toBe(latest.stats.harmony - 5);
  });

  it('cách cũ (dùng thẳng kết quả choose trên ảnh chụp) sẽ làm mất cờ: đây là lỗi đã sửa', () => {
    const snapshot = open();
    const latest = withFlag(snapshot, HIT_FLAG);
    const naive = choose(content, snapshot, 'b').state;
    expect(naive.flags).not.toContain(HIT_FLAG);
    expect(mergeChoice(content, snapshot, latest, 'b').flags).toContain(HIT_FLAG);
  });

  it('ghi nhận lịch sử và thẻ mẹo, không trùng, và không chuyển cảnh/kết thúc', () => {
    const snapshot = open();
    const merged = mergeChoice(content, snapshot, snapshot, 'a'); // lựa chọn có thẻ T03
    expect(merged.history).toContain(`${SCENE}/a`);
    expect(merged.tipsSeen).toContain('T03');
    expect(merged.sceneId).toBe(snapshot.sceneId);
    expect(merged.endingId).toBeNull();
    const again = mergeChoice(content, snapshot, merged, 'a');
    expect(again.tipsSeen.filter((t) => t === 'T03')).toHaveLength(1);
  });

  it('không đổi state đầu vào', () => {
    const snapshot = open();
    const latest = withFlag(snapshot, 'x');
    const a = structuredClone(snapshot);
    const b = structuredClone(latest);
    mergeChoice(content, snapshot, latest, 'c');
    expect(snapshot).toEqual(a);
    expect(latest).toEqual(b);
  });

  it('lựa chọn không tồn tại thì ném lỗi như engine', () => {
    const snapshot = open();
    expect(() => mergeChoice(content, snapshot, snapshot, 'khong-co')).toThrow();
  });
});
