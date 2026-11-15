/** Số giả ngẫu nhiên ổn định theo chỉ số (để cảnh không đổi mỗi lần render). */
export const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
