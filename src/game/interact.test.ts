import { describe, expect, it } from 'vitest';
import { INTERACT_ANY_ANGLE_DIST, INTERACT_DIST, findInteractable, type Target } from './interact';

const at = (key: string, x: number, z: number): Target => ({ key, x, z });
const origin = { x: 0, z: 0 };

describe('findInteractable', () => {
  it('không có đối tượng thì null', () => {
    expect(findInteractable(origin, 0, [])).toBeNull();
  });

  it('đối tượng phía trước trong tầm thì chọn; quá xa thì không', () => {
    // heading 0 = nhìn về +z
    expect(findInteractable(origin, 0, [at('a', 0, 1.5)])).toBe('a');
    expect(findInteractable(origin, 0, [at('a', 0, INTERACT_DIST + 0.1)])).toBeNull();
  });

  it('đối tượng sau lưng và không quá sát thì không chọn', () => {
    expect(findInteractable(origin, 0, [at('a', 0, -1.6)])).toBeNull();
  });

  it('quay mặt về phía đối tượng thì chọn được', () => {
    // Đối tượng ở -z; heading π nhìn về -z.
    expect(findInteractable(origin, Math.PI, [at('a', 0, -1.6)])).toBe('a');
  });

  it('rất sát thì chọn bất kể hướng mặt', () => {
    expect(findInteractable(origin, 0, [at('a', 0, -(INTERACT_ANY_ANGLE_DIST - 0.1))])).toBe('a');
  });

  it('nhiều đối tượng thì chọn cái gần và đúng hướng mặt nhất', () => {
    const ts = [at('xa', 0, 2), at('gan', 0.3, 1.2), at('sauLung', 0, -0.5)];
    // Sau lưng tuy rất sát nhưng không quay mặt về, nên cái ở phía trước thắng.
    expect(findInteractable(origin, 0, ts)).toBe('gan');
    expect(findInteractable(origin, 0, [ts[2]!])).toBe('sauLung'); // chỉ còn mình nó thì vẫn tương tác được
  });

  it('quay mặt về ai thì chọn người đó dù có người khác đứng gần hơn (chó đi theo sát)', () => {
    const cho = at('cho', 0.8, 0.2); // rất gần, lệch sang phải
    const bin = at('bin', -1.4, 1.2); // xa hơn, lệch sang trái
    // Quay mặt về +z: chó ở phía phải (góc ~75°), Bin ở trái (góc ~-49°) và xa hơn một chút.
    const faceBin = Math.atan2(-1.4, 1.2);
    expect(findInteractable(origin, faceBin, [cho, bin])).toBe('bin');
    const faceCho = Math.atan2(0.8, 0.2);
    expect(findInteractable(origin, faceCho, [cho, bin])).toBe('cho');
  });

  it('góc rìa nón: trong thì chọn, ngoài thì không', () => {
    const edge = (deg: number) => {
      const a = (deg * Math.PI) / 180;
      return at('a', Math.sin(a) * 1.8, Math.cos(a) * 1.8);
    };
    expect(findInteractable(origin, 0, [edge(70)])).toBe('a');
    expect(findInteractable(origin, 0, [edge(95)])).toBeNull();
  });

  it('xử lý quanh ranh ±π (heading gần π, đối tượng ở -z hơi lệch)', () => {
    expect(findInteractable(origin, 3.0, [at('a', -0.2, -1.6)])).toBe('a');
    expect(findInteractable(origin, -3.0, [at('a', 0.2, -1.6)])).toBe('a');
  });

  it('đầu vào hỏng thì null/bỏ qua, không ném lỗi', () => {
    expect(findInteractable({ x: NaN, z: 0 }, 0, [at('a', 0, 1)])).toBeNull();
    expect(findInteractable(origin, Infinity, [at('a', 0, 1)])).toBeNull();
    expect(findInteractable(origin, 0, [at('bad', NaN, 1), at('ok', 0, 1)])).toBe('ok');
  });

  it('theo dõi vị trí thay đổi tại chỗ của đối tượng (NPC đang đi)', () => {
    const t = at('a', 0, 5);
    expect(findInteractable(origin, 0, [t])).toBeNull();
    t.z = 1.5;
    expect(findInteractable(origin, 0, [t])).toBe('a');
  });
});

describe('findInteractable: tầm riêng và độ nới (hysteresis)', () => {
  it('đối tượng có reach ngắn chỉ tương tác được khi lại gần hơn reach', () => {
    const cho = { key: 'cho', x: 0, z: 1.8, reach: 1.5 };
    expect(findInteractable(origin, 0, [cho])).toBeNull();
    cho.z = 1.4;
    expect(findInteractable(origin, 0, [cho])).toBe('cho');
  });

  it('slack nới tầm và nón để giữ mục tiêu cũ', () => {
    const cho = { key: 'cho', x: 0, z: 1.8, reach: 1.5 };
    expect(findInteractable(origin, 0, [cho])).toBeNull();
    expect(findInteractable(origin, 0, [cho], 0.5, 0.5)).toBe('cho');
    // Ngoài cả tầm đã nới thì thôi.
    cho.z = 2.3;
    expect(findInteractable(origin, 0, [cho], 0.5, 0.5)).toBeNull();
  });
});
