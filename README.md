# Đinh Mùi: Tết Mệt Phết

Game web 3D về quê ăn Tết, sống sót qua những câu hỏi của họ hàng. Plan, kịch bản và research nằm trong [docs/](docs/).

## Chạy local

Yêu cầu: Node.js 20+ (đã test với Node 24) và npm.

```bash
npm install        # lần đầu
npm run dev        # mở link http://localhost:... trong log (Vite tự đổi cổng nếu cổng bận)
```

**Thử trên điện thoại** (cùng Wi-Fi với máy tính):

```bash
npm run dev -- --host
```

Mở địa chỉ `Network` trong log bằng trình duyệt điện thoại. Góc phải trên có **đồng hồ FPS** (chỉ hiện khi chạy dev, hoặc thêm `?fps` vào URL). Mục tiêu: chơi mượt, FPS ổn định quanh 30 trở lên trên điện thoại phổ thông.

**Nhảy thẳng vào một cảnh** (chỉ khi chạy dev):

```
http://localhost:5173/?scene=mc-1&persona=moi-di-lam&region=da-nang
```

- `scene`: id trong [src/content/v1.json](src/content/v1.json) (ví dụ `rb-1`, `dv-den-lang`, `bvn-2`, `mc-intro`, `mc-4`).
- `persona`: `sinh-vien`, `moi-di-lam`, `doc-than-27`.
- `region`: `ha-noi`, `da-nang`, `sai-gon`.

**Chế độ đi lại (bước 1, bản thử):** ở màn chọn vai/vùng bấm "Thử chế độ đi lại", hoặc vào thẳng (chỉ khi chạy dev):

```
http://localhost:5173/?roam=san-nha&region=ha-noi
```

- Máy tính: **WASD** hoặc phím mũi tên đi, **Shift** chạy, **kéo chuột** xoay camera, **E** tương tác.
- **Né câu hỏi:** Dì Út (đi lang thang gần cổng) bắn bong bóng "?" về chỗ bạn đang đứng. Bước vuông góc với đường bay thì né được; đứng yên hoặc chạy dọc theo đường bay thì trúng và bị kéo vào hội thoại. Né đủ 3 câu hoàn thành nhiệm vụ.
- **Nhiệm vụ:** nút "Nhiệm vụ n/4" góc trái, bấm để xem danh sách; hoàn thành thì được thưởng chỉ số.
- Lại gần Cô Hai, Bác Cả, Bà Tám (ngồi quanh bàn trà), chó Vàng hoặc bé Bin (chạy theo bạn) thì hiện nút "[E] ..."; bấm để nói chuyện hoặc vuốt ve. `?persona=` đổi câu hỏi theo vai.
- Điện thoại: joystick bên trái, kéo ở bất cứ đâu để xoay camera, nút "Tương tác" bên phải (thêm `&touch` vào URL để thấy joystick trên máy tính).

**Xem toàn bộ nhân vật:** `http://localhost:5173/gallery.html`.

| Lệnh | Việc |
|---|---|
| `npm test` | Unit test: engine, validate, và chơi thử toàn bộ nội dung với mọi persona × thành phố |
| `npm run typecheck` | Kiểm tra type |
| `npm run build` | Build production ra `dist/` |
| `npm run perf` | **Đo hiệu năng tự động**: giả lập điện thoại (màn hình, cảm ứng, CPU chậm), chơi thử từng cảnh và chế độ đi lại, in FPS, thời gian khung, draw call. Xem `node scripts/perf.mjs --help`. Kết quả ghi vào `.perf/`. Không thay được máy thật: không giả lập được GPU điện thoại |
| `npm run preview` | Xem bản build local |

## Cấu trúc

```
src/engine/types.ts        schema nội dung + state (cờ, điều kiện, biến thể vùng, cắt cảnh, chỉ đạo cảnh 3D)
src/engine/engine.ts       engine thuần: getView, choose, advance, kết thúc, kill-switch
src/engine/validate.ts     kiểm tra toàn vẹn nội dung (kể cả set 3D, vị trí đứng, góc máy)
src/game/                  chế độ đi lại: collision (va chạm), movement (chuyển động), camera (bám góc nhìn thứ ba),
                           input + RoamControls (bàn phím/joystick), RoamView + RoamScreen (ghép), types (hợp đồng toạ độ)
src/game/npc.ts, interact.ts   hành vi NPC (đứng, lang thang, đuổi theo) và chọn đối tượng tương tác (thuần, có test)
src/game/roamWorld.ts      dựng vật cản/vị trí NPC (thuần); roamDemo.ts: tra cứu bản đồ trong nội dung; TalkPanel: khung hội thoại
src/game/bubbles.ts        mô phỏng bong bóng câu hỏi (bắn, bay, trúng, né), talkMerge.ts: áp lựa chọn lên state mới nhất
src/engine/quests.ts       nhiệm vụ dựa trên cờ; bản đồ/NPC/nhiệm vụ nằm trong v1.json mục "maps"
src/scene3d/walk.ts        vùng đi lại và vật cản của từng cảnh (khớp hình học trong sets.tsx/props.tsx)
src/content/v1.json        nội dung thật (đang có chặng Ra bến, Đường về (đến làng), Bước vào nhà, Mâm cơm)
src/scene3d/registry.ts    danh mục bộ cảnh: vị trí đứng, góc máy (dữ liệu thuần)
src/scene3d/sets.tsx       dựng 3 bộ cảnh: phố Tết, sân nhà ở quê, nhà trên + mâm cỗ; biến thể theo miền
src/scene3d/props.tsx      đạo cụ Việt dựng bằng code: xe máy chở đào/mai/quất, nhà ống, mâm cỗ 3 miền, bàn thờ...
src/scene3d/Figure.tsx     nhân vật low-poly + động tác (thở, nói, vẫy, nhảy, đi, ngồi)
src/scene3d/Stage3DView.tsx khung cảnh 3D: ánh sáng theo vùng, camera bám người nói, FPS
src/App.tsx                UI: chọn vai/vùng, thẻ chặng, khung thoại, cắt cảnh, kết thúc
```

## Thêm nội dung

Sửa `src/content/v1.json`, rồi chạy `npm test`. Validate báo lỗi ngay nếu tham chiếu sai (scene, thẻ mẹo, vùng, cờ, lịch sử, set 3D, vị trí đứng, góc máy).

- **Vùng:** `lineByRegion`, `textByRegion`, `replyByRegion` thay giọng theo thành phố. Scene có `regions` chỉ hiện với vùng đó.
- **Persona:** `personas` trong scene.
- **Cờ:** lựa chọn có `setFlags`; scene, dòng thoại, lựa chọn có `if: { flags, notFlags, history, ... }`; kết thúc có `flags`.
- **Cắt cảnh:** `"kind": "cutscene"`, không có lựa chọn, thoại trong `lines` (người chơi bấm Tiếp từng câu).
- **Cảnh 3D:** `stage3d: { set, camera?, actors: [{ characterId, spot, anim? }] }`. Không ghi `camera` thì máy quay tự bám người đang nói.
- **Nhân vật:** `look` quyết định tạo hình. Nhân vật nhại người thật phải có `"parody": true` và `fallbackId`; đặt `"enabled": false` để tắt ngay.
- **Thẻ mẹo:** chỉ dùng thẻ có nguồn thật. Không bịa số liệu.

## Lưu ý trên Windows

Đừng gọi `vitest` trực tiếp từ terminal mở ở `d:\...` (chữ thường): sẽ lỗi `Cannot read properties of undefined (reading 'config')`. Dùng `npm test` (script bọc [scripts/test.mjs](scripts/test.mjs) đã xử lý).
