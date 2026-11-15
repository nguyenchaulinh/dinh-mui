/** Chỉ cho test đọc file model nhị phân (không thêm @types/node vào dự án). */
declare module 'node:fs' {
  export function readFileSync(path: URL | string): { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
}
