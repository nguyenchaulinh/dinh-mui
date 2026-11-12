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

**Nhảy thẳng vào một bản đồ** (chỉ khi chạy dev; bỏ qua màn chọn và thẻ chặng):

```
http://localhost:5173/?roam=san-nha&persona=moi-di-lam&region=da-nang
```

- `roam`: id bản đồ trong [src/content/v1.json](src/content/v1.json), mục `maps` (hiện có `san-nha`).
- `persona`: `sinh-vien`, `moi-di-lam`, `doc-than-27`.
- `region`: `ha-noi`, `da-nang`, `sai-gon`.

## Cách chơi

1. Chọn vai và thành phố xuất phát (chọn nhiều thành phố thì mỗi lượt chơi lấy ngẫu nhiên một thành phố), bấm "Lên đường về quê".
2. Đọc thẻ chặng rồi "Vào cảnh". Bản hiện có: chặng **Bước vào nhà** (sân nhà ở quê, giọng thoại và cảnh đổi theo miền).
3. Điều khiển:
   - Máy tính: **WASD** hoặc phím mũi tên đi, **Shift** chạy, **kéo chuột** xoay camera, **E / Space / Enter** tương tác.
   - Điện thoại: joystick bên trái, kéo ở bất cứ đâu để xoay camera, nút "Tương tác" bên phải (thêm `&touch` vào URL để thấy joystick trên máy tính).
4. Lại gần Cô Hai, Bác Cả, Bà Tám (ngồi quanh bàn trà), chó Vàng hoặc bé Bin (chạy theo bạn) thì hiện nút "[E] ..."; bấm để nói chuyện hoặc vuốt ve. Câu hỏi theo vai.
5. **Né câu hỏi:** Dì Út (đi lang thang gần cổng) bắn bong bóng "?" về chỗ bạn đang đứng. Bước vuông góc với đường bay thì né được; đứng yên hoặc chạy dọc theo đường bay thì trúng và bị kéo vào hội thoại.
6. **Nhiệm vụ:** nút "Nhiệm vụ n/4" góc trái; hoàn thành thì được thưởng chỉ số. Xong nhiệm vụ cuối ("Qua ải sân nhà") hoặc một chỉ số (Hòa khí, Sức chịu đựng, Ví) về 0 thì game kết thúc và ra **danh hiệu**. Né đủ 5 câu để mở danh hiệu "Chiến thần né câu hỏi".

**Xem toàn bộ nhân vật:** `http://localhost:5173/gallery.html`.

| Lệnh | Việc |
|---|---|
| `npm test` | Unit test: engine, validate, chuyển động/va chạm/NPC/bong bóng, và mô phỏng mọi tổ hợp câu đáp của nội dung thật với mọi persona × thành phố |
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
src/content/simulate.ts    (chỉ test) duyệt mọi tổ hợp câu đáp của một bản đồ để kiểm tra kết thúc
src/game/                  chế độ đi lại: collision (va chạm), movement (chuyển động), camera (bám góc nhìn thứ ba),
                           input + RoamControls (bàn phím/joystick), RoamView (cảnh 3D) + RoamScreen (ghép: chặng, hội thoại,
                           nhiệm vụ, kết thúc), types (hợp đồng toạ độ)
src/game/npc.ts, interact.ts   hành vi NPC (đứng, lang thang, đuổi theo) và chọn đối tượng tương tác (thuần, có test)
src/game/roamWorld.ts      dựng vật cản/vị trí NPC (thuần); roamDemo.ts: tra cứu bản đồ trong nội dung; TalkPanel: khung hội thoại
src/game/bubbles.ts        mô phỏng bong bóng câu hỏi (bắn, bay, trúng, né)
src/screens/               màn chọn vai/vùng (Setup) và màn kết thúc (EndingScreen)
src/scene3d/walk.ts        vùng đi lại và vật cản của từng bộ cảnh (khớp hình học trong sets.tsx/props.tsx)
src/scene3d/registry.ts    danh mục bộ cảnh: vị trí đứng của NPC (dữ liệu thuần)
src/scene3d/sets.tsx       dựng 3 bộ cảnh: phố Tết, sân nhà ở quê, nhà trên + mâm cỗ; biến thể theo miền (hiện chỉ sân nhà có bản đồ đi lại)
src/scene3d/props.tsx      đạo cụ Việt dựng bằng code: xe máy chở đào/mai/quất, nhà ống, mâm cỗ 3 miền, bàn thờ...
src/scene3d/Figure.tsx     nhân vật low-poly + động tác (thở, nói, vẫy, nhảy, đi, ngồi)
src/App.tsx                chuyển màn: chọn vai/vùng → các chặng (RoamScreen) → kết thúc
```

## Thêm nội dung

Sửa `src/content/v1.json`, rồi chạy `npm test`. Validate báo lỗi ngay nếu tham chiếu sai (scene, thẻ mẹo, vùng, cờ, lịch sử, set 3D, vị trí đứng, nhiệm vụ). Mỗi chặng (`stages`) trỏ tới một bản đồ (`maps`); mỗi scene hội thoại phải được một NPC trong bản đồ gọi tới (`action.sceneIds` hoặc `shoots.hitSceneIds`), nếu không validate báo "scene mồ côi".

- **Vùng:** `lineByRegion`, `textByRegion`, `replyByRegion` thay giọng theo thành phố. Scene có `regions` chỉ hiện với vùng đó.
- **Persona:** `personas` trong scene (cùng một NPC có thể hỏi mỗi vai một câu khác nhau).
- **Cờ:** lựa chọn có `setFlags`; scene, dòng thoại, lựa chọn có `if: { flags, notFlags, history, ... }`; kết thúc có `flags`. Chế độ đi lại tự sinh cờ `talked:`, `petted:`, `dodged:`, `hit:`, `quest:`.
- **Bản đồ:** `maps[]` gồm `setId` (bộ cảnh 3D có vùng đi lại trong `walk.ts`), `playerId`, `npcs` (vị trí, hành vi `stand`/`wander`/`approach`, hành động `talk`/`pet`, tuỳ chọn `shoots` để bắn câu hỏi), `quests` và `goalQuestId` (nhiệm vụ đích: xong thì hết chặng).
- **Nhân vật:** `look` quyết định tạo hình. Nhân vật nhại người thật phải có `"parody": true` và `fallbackId`; đặt `"enabled": false` để tắt ngay.
- **Thẻ mẹo:** chỉ dùng thẻ có nguồn thật. Không bịa số liệu.
- **Kết thúc:** duyệt từ trên xuống, cái đầu tiên khớp (chỉ số + cờ) thắng; cái cuối là mặc định. Cập nhật `AWAITING_CONTENT` trong `src/content/content.test.ts` khi nội dung mới làm một kết thúc tới được.

## Lưu ý trên Windows

Đừng gọi `vitest` trực tiếp từ terminal mở ở `d:\...` (chữ thường): sẽ lỗi `Cannot read properties of undefined (reading 'config')`. Dùng `npm test` (script bọc [scripts/test.mjs](scripts/test.mjs) đã xử lý).
