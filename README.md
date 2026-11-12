# Đinh Mùi: Tết Mệt Phết

Game web 3D về quê ăn Tết, sống sót qua những câu hỏi của họ hàng. Người chơi điều khiển nhân vật ở **góc nhìn thứ ba**, đi lại trong cảnh 3D, nói chuyện với họ hàng, né câu hỏi và làm nhiệm vụ. Plan, kịch bản và research nằm trong [docs/](docs/).

## Chạy local

Yêu cầu: Node.js 22.12+ (xem `.nvmrc`; đã test với Node 22 và 24) và npm.

```bash
npm install        # lần đầu
npm run dev        # mở link http://localhost:... trong log (Vite tự đổi cổng nếu cổng bận)
```

**Thử trên điện thoại** (cùng Wi-Fi với máy tính):

```bash
npm run dev -- --host
```

Mở địa chỉ `Network` trong log bằng trình duyệt điện thoại. Góc phải trên có **đồng hồ FPS** (chỉ hiện khi chạy dev, hoặc thêm `?fps` vào URL). Mục tiêu: chơi mượt, FPS ổn định quanh 30 trở lên trên điện thoại phổ thông.

**Nhảy thẳng vào một bản đồ** (chỉ khi chạy dev; bỏ qua thẻ mở đầu và thẻ chặng):

```
http://localhost:5173/?roam=cuoi-nam&persona=sinh-vien&region=da-nang
```

- `roam`: id bản đồ trong [src/content/v1.json](src/content/v1.json), mục `maps`: `cuoi-nam` (văn phòng / lớp học), `san-nha` (sân nhà ở quê).
- `persona`: `sinh-vien`, `moi-di-lam`, `doc-than-27`.
- `region`: `ha-noi`, `da-nang`, `sai-gon`.

## Cách chơi

Thiết kế: [docs/07-thiet-ke-ui-ux.md](docs/07-thiet-ke-ui-ux.md) (giao diện), [docs/08-thiet-ke-choi-truoc-que.md](docs/08-thiet-ke-choi-truoc-que.md) (lối chơi).

1. **Mở game:** cảnh chặng 1 làm nền, thẻ giữa màn hình bốc ngẫu nhiên bối cảnh (vai: sinh viên năm cuối / mới đi làm / độc thân 27+; thành phố: Hà Nội / Đà Nẵng / Sài Gòn). Bạn chỉ nhập tên rồi "Lên đường".
2. **Chặng 1 · Cuối năm ở phố** (văn phòng nếu đi làm, lớp học nếu là sinh viên): dùng máy tính **săn vé** trên feed (4/6 bài là lừa đảo), **nhặt** sạc, hộp bánh, áo ấm, nói chuyện với đồng nghiệp/bạn, Sếp/Cô và chị Thu/Lớp trưởng, **bấm NÉ đúng lúc** khi Sếp/Lớp trưởng lao tới giao việc. Săn vé xong Bé Dê hỏi về bằng gì, rồi **mẹ gọi video**. Đủ việc thì **cửa ra** mới mở.
3. **Chặng 2 · Bước vào nhà** (sân nhà, giọng thoại và cảnh đổi theo miền): nói chuyện với Cô Hai, Bác Cả, Bà Tám, vuốt chó Vàng, chơi với bé Bin, **bấm NÉ đúng lúc** khi Dì Út lao tới hỏi (băng rôn báo trước, vòng thời gian thu nhỏ; bấm khi chạm vạch vàng).
4. **Kết thúc:** xong chặng cuối, hoặc một chỉ số (Hòa khí, Sức chịu đựng, Ví) về 0, hoặc nói với mẹ "năm nay con ở lại" rồi xác nhận, thì ra **danh hiệu Tết**. Né tổng cộng 8 câu để mở "Chiến thần né câu hỏi".

Điều khiển:
- Máy tính: **WASD** hoặc phím mũi tên đi, **Shift** chạy, **kéo chuột** xoay camera, **E / Space / Enter** tương tác.
- Điện thoại: joystick bên trái, kéo ở bất cứ đâu để xoay camera, nút "Tương tác" bên phải (thêm `&touch` vào URL để thấy joystick trên máy tính).
- Góc trên phải: "Nhiệm vụ" (danh sách việc) và nút tạm dừng.

**Xem toàn bộ nhân vật:** `http://localhost:5173/gallery.html`.

| Lệnh | Việc |
|---|---|
| `npm test` | Unit test: engine, validate, chuyển động/va chạm/NPC/bấm NÉ, model nhân vật, và mô phỏng mọi tổ hợp câu đáp của nội dung thật với mọi persona × thành phố |
| `npm run typecheck` | Kiểm tra type |
| `npm run build` | Build production ra `dist/` |
| `npm run perf` | **Đo hiệu năng tự động**: giả lập điện thoại (màn hình, cảm ứng, CPU chậm), chơi thử các bản đồ, in FPS, thời gian khung, draw call. Xem `node scripts/perf.mjs --help`. Kết quả ghi vào `.perf/`. Không thay được máy thật: không giả lập được GPU điện thoại |
| `npm run preview` | Xem bản build local |

## Cấu trúc

```
src/engine/types.ts        schema nội dung + state (chặng, bản đồ, NPC, nhiệm vụ, scene hội thoại, cờ, điều kiện, biến thể vùng)
src/engine/engine.ts       engine thuần: getView, pickScene, choose, kết thúc, sang chặng, kill-switch nhân vật
src/engine/quests.ts       nhiệm vụ dựa trên cờ (talked:/petted:/dodged:/hit:/quest:), thưởng chỉ số
src/engine/validate.ts     kiểm tra toàn vẹn nội dung (tham chiếu, cờ, bản đồ, NPC, nhiệm vụ, scene mồ côi, set 3D, vị trí đứng)
src/content/v1.json        nội dung thật: vai, vùng, chặng, nhân vật, scene hội thoại, thẻ mẹo, kết thúc, bản đồ (mục "maps")
src/content/simulate.ts    (chỉ test) mô phỏng cả hành trình: duyệt hết hoặc lấy mẫu có hạt giống, để kiểm tra kết thúc
src/game/                  chế độ đi lại: collision (va chạm), movement (chuyển động), camera (bám góc nhìn thứ ba),
                           input + RoamControls (bàn phím/joystick), RoamView (cảnh 3D) + RoamScreen (ghép: chặng, hội thoại,
                           nhiệm vụ, kết thúc), types (hợp đồng toạ độ)
src/game/npc.ts, interact.ts   hành vi NPC (đứng, lang thang, đuổi theo) và chọn đối tượng tương tác (thuần, có test)
src/game/roamWorld.ts      dựng vật cản/vị trí NPC (thuần); roamDemo.ts: tra cứu bản đồ trong nội dung; TalkDock: lựa chọn/feed/cuộc gọi ở đáy
src/game/ambush.ts         luật "bấm NÉ đúng lúc" (báo trước, vòng thời gian, né / bị bắt); DodgeQte vẽ vòng + nút NÉ
src/scene3d/Rigged.tsx     nhân vật có xương (model CC0 trong public/models): đổi màu, chuẩn chiều cao, hoạt ảnh; rigging.ts: luật thuần
src/screens/Cards.tsx      thẻ nổi: mở đầu + nhập tên, thẻ chặng, tạm dừng, kết thúc
src/ui/ui.tsx              thành phần giao diện dùng chung: thẻ nổi, thanh chỉ số, bảng tên, biểu tượng
src/styles.css             token + thành phần của hệ thống giao diện (docs/07)
src/scene3d/walk.ts        vùng đi lại và vật cản của từng bộ cảnh (khớp hình học trong sets.tsx/props.tsx)
src/scene3d/registry.ts    danh mục bộ cảnh: vị trí đứng của NPC (dữ liệu thuần)
src/scene3d/sets.tsx       dựng bộ cảnh: văn phòng / lớp học, phố Tết, sân nhà ở quê, nhà trên + mâm cỗ; biến thể theo miền và theo vai
src/scene3d/props.tsx      đạo cụ Việt dựng bằng code: xe máy chở đào/mai/quất, nhà ống, mâm cỗ 3 miền, bàn thờ...
src/scene3d/Figure.tsx     nhân vật low-poly + động tác (thở, nói, vẫy, nhảy, đi, ngồi)
src/App.tsx                luồng màn: cảnh 3D luôn làm nền, thẻ nổi mở đầu → chặng 1 → chặng 2 → kết thúc
```

## Thêm nội dung

Sửa `src/content/v1.json`, rồi chạy `npm test`. Validate báo lỗi ngay nếu tham chiếu sai (scene, thẻ mẹo, vùng, cờ, lịch sử, set 3D, vị trí đứng, nhiệm vụ). Mỗi chặng (`stages`) trỏ tới một bản đồ (`maps`); mỗi scene hội thoại phải được một NPC trong bản đồ gọi tới (`action.sceneIds` hoặc `shoots.hitSceneIds`), nếu không validate báo "scene mồ côi".

- **Vùng:** `lineByRegion`, `textByRegion`, `replyByRegion` thay giọng theo thành phố. Scene có `regions` chỉ hiện với vùng đó.
- **Persona:** `personas` trong scene (cùng một NPC có thể hỏi mỗi vai một câu khác nhau).
- **Cờ:** lựa chọn có `setFlags`; scene, dòng thoại, lựa chọn có `if: { flags, notFlags, history, ... }`; kết thúc có `flags`. Chế độ đi lại tự sinh cờ `talked:`, `petted:`, `dodged:`, `hit:`, `quest:`.
- **Bản đồ:** `maps[]` gồm `setId` (bộ cảnh 3D có vùng đi lại trong `walk.ts`), `playerId`, `npcs` (vị trí, hành vi `stand`/`wander`/`approach`, hành động `talk`/`pet`, tuỳ chọn `ambush` để lao tới hỏi (bấm NÉ đúng lúc), `personas` nếu chỉ có với một số vai), `objects` (đồ vật: `talk` mở hội thoại/feed, `pickup` nhặt, `exit` ra cửa; `requires` để khoá), `events` (tự bật khi đủ cờ; `kind: "call"` là cuộc gọi đến), `variantByPersona` (trang trí theo vai), `quests` (mục tiêu có thể giới hạn `personas`) và `goalQuestId` (nhiệm vụ đích: xong thì hết chặng).
- **Tên người chơi:** viết `{ten}` trong câu thoại/lựa chọn/phản ứng để chèn tên người chơi.
- **Feed:** scene có `"ui": "feed"` hiện như điện thoại; mỗi lựa chọn là một bài đăng, cần `author`.
- **Nhân vật:** `look.model` chọn model có xương trong `public/models` (danh sách ở `src/scene3d/rigging.ts`, nguồn và giấy phép ở `public/models/CREDITS.md`); `outfit`, `pants`, `hair`, `skin` đổi màu. Không có `model` thì dựng bằng code (Bé Dê). Nhân vật nhại người thật phải có `"parody": true` và `fallbackId`; đặt `"enabled": false` để tắt ngay.
- **Thẻ mẹo:** chỉ dùng thẻ có nguồn thật. Không bịa số liệu.
- **Kết thúc:** duyệt từ trên xuống, cái đầu tiên khớp (chỉ số + cờ) thắng; cái cuối là mặc định. Cập nhật `AWAITING_CONTENT` trong `src/content/content.test.ts` khi nội dung mới làm một kết thúc tới được.

## Lưu ý trên Windows

Đừng gọi `vitest` trực tiếp từ terminal mở ở `d:\...` (chữ thường): sẽ lỗi `Cannot read properties of undefined (reading 'config')`. Dùng `npm test` (script bọc [scripts/test.mjs](scripts/test.mjs) đã xử lý).
