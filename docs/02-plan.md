# ĐINH MÙI: Về Quê Sống Sót. Master plan (LEAN)

**Phiên bản 0.4**, ngày 12/11/2026. Personal project, phi lợi nhuận, **phát hành như portfolio** (giống cách Golden Sea làm Một Ngày Làm Chó).

| Tài liệu | Vai trò |
|---|---|
| [01-research.md](01-research.md) | Tham khảo insight, đối thủ, lịch Tết |
| **02-plan.md** | **Plan đang chạy** (file này) |
| [03-cameo.md](03-cameo.md) | Tham khảo hồ sơ nhân vật nhại |
| [04-script.md](04-script.md) | Kịch bản full hành trình (bản nháp 1) |
| [05-gameplay.md](05-gameplay.md) | **Lối chơi điều khiển nhân vật góc nhìn thứ ba**, lộ trình làm lần lượt |

**Đã đổi hướng (12/11):** game là **3D 100%**: người chơi điều khiển nhân vật góc nhìn thứ ba và tương tác với nhân vật trong cảnh. **Luồng "xem cảnh + hộp thoại" ban đầu đã bị gỡ khỏi code** (xem [06-bao-cao-tong-quan.md](06-bao-cao-tong-quan.md)). Mỗi chặng là một bản đồ đi lại; engine hội thoại giữ lại làm lớp hội thoại khi nói chuyện với NPC. Lộ trình và lựa chọn lịch ra mắt ở [05-gameplay.md](05-gameplay.md); mục 5 (lịch) bên dưới chờ bạn chọn phương án.

**Thay đổi so với v0.3 (12/11):**
- **Chuyển sang 3D:** mỗi chặng là một cảnh 3D low-poly, camera dẫn theo kịch bản (Three.js qua React Three Fiber). Không làm thế giới mở, không nhiều người chơi.
- **Full hành trình** từ thành phố về quê rồi quay lại: 9 chặng, kịch bản ở 04-script.
- **3 thành phố** (Hà Nội, Đà Nẵng, Sài Gòn), người chơi chọn 1 hoặc cả 3. **3 persona**: thêm *sinh viên năm cuối* vì có cảnh trường học.
- **Ra mắt v1 dời sang khoảng 15/12/2026** (thay vì 29/11).
- Tỉnh quê cụ thể: để sau.

**Thay đổi so với v0.2:**
- Bỏ toàn bộ bước luật sư, xin phép, sổ theo dõi xin phép, khóa pháp lý.
- **Ra mắt bản đầu khoảng 29/11/2026**, thay vì 10/1/2027.
- Cắt mạnh phạm vi MVP, chưa dùng LLM ở bản đầu.
- Thêm phần "build in public" và trang case study cho portfolio.

---

## 0. Mục tiêu

1. **Ship nhanh một bản chơi được, đẹp, mượt trên điện thoại.** Đó là portfolio.
2. **Cập nhật liên tục** đến Tết, để có changelog và câu chuyện "build in public" giống Một Ngày Làm Chó (7 bản cập nhật trong 3 tuần).
3. **Đỉnh lượng người chơi** vẫn rơi vào giữa tháng 1 đến Ông Công Ông Táo (30/1). Ra sớm để có thời gian sửa lỗi và gom khán giả.

---

## 1. Phạm vi theo bản phát hành

### v1: ra mắt khoảng 15/12

| Có | Không (để sau) |
|---|---|
| **Full 9 chặng 3D:** Săn vé → Tất niên ở phố → Ra bến → Đường về → Bước vào nhà → Mâm cơm tất niên → Giao thừa → Mùng 1 → Quay lại phố (04-script) | Thế giới mở, nhiều người chơi |
| 3 persona: *sinh viên năm cuối*, *mới đi làm*, *độc thân 27+* | Persona *mới cưới* |
| 3 thành phố: Hà Nội, Đà Nẵng, Sài Gòn (chọn 1 hoặc cả 3); quê chung theo vùng | Tỉnh quê cụ thể |
| **Kịch bản có sẵn 100%** | Chat tự do bằng LLM |
| 3 thanh chỉ số + 9 kết thúc + **thẻ danh hiệu share được** | Clip 9:16 |
| Mini-game lướt feed vé, chia lì xì | Quiz, bi-a |
| Bé Dê; **Duy Đèn Cầy**, **Dương Gió Mùa**, **Thái Gara 99**, **MC Mít Ướt** (twist); các nhân vật gốc | MC Chớp Nhoáng, Tân Một Tô, Hoàng Sao Hỏa, Tuấn Tê-Cơ, Bà Năm Siêu To |
| Thẻ "mẹo thật" có nguồn (T01–T09 ở 04-script) | Thẻ chưa có nguồn |

**Vì sao chưa dùng LLM ở v1:** không tốn chi phí, không cần backend, không lo AI nói bậy. LLM là bản cập nhật lớn sau.

### v1.1: khoảng 29/12
- Quiz tất niên với **MC Chớp Nhoáng**.
- **"Sao kê Tết"** do Bé Dê đọc, trên màn hình riêng, tách khỏi MC Mít Ướt.
- **"Đối đáp tự do"** ở mâm cơm, dùng LLM có giới hạn lượt và trần ngân sách (nếu còn thời gian).

### v1.2: khoảng 10/1
- Mini-game **Bi-a mâm cỗ** (Hoàng Sao Hỏa vs Tuấn Tê-Cơ).
- **Tân Một Tô**.
- Trend deck bắt đầu cập nhật 2 lần mỗi tuần.

### Mùa Tết: 4/1 đến 20/2
- Mỗi tuần một bản cập nhật nhỏ: MC Chớp Nhoáng đố vui, Bà Năm Siêu To, thêm persona và vùng miền, xuất clip 9:16.
- Sự kiện Ông Công Ông Táo (30/1), nội dung Mùng 1 (6/2), Sao kê Tết sau Tết.

---

## 2. Lối chơi (giữ từ v0.2, rút gọn)

- **Vòng lặp:** họ hàng hỏi → chọn cách đáp (Khéo / Thật thà / Lầy / Phản đòn) → 3 thanh **Hòa khí / Sức chịu đựng / Ví** thay đổi → sang chặng tiếp → kết thúc ra danh hiệu → share.
- **Thông tin thật:** sau một số lựa chọn, hiện một thẻ "mẹo thật" 1–2 câu (lì xì, cách đáp khéo, phong tục, lừa đảo). Ghi nguồn ngắn ở cuối thẻ.
- **Kết thúc ấm áp:** dù chọn kiểu nào, câu kết vẫn là "dù sao vẫn phải về nhà".
- Chi tiết đầy đủ 6 chặng ở 02-plan v0.2, giữ làm định hướng cho v1.1 trở đi.

---

## 3. Lớp an toàn tối thiểu (khoảng 1–2 giờ, không cần luật sư)

Phần này không phải thủ tục pháp lý mà là những việc rẻ, giúp **project không bị gỡ, không bị tẩy chay, không cháy ví**:

1. **Danh sách không đụng:** Huấn Hoa Hồng, Trường Con, Cậu Tuấn Cửa Ông, mọi người đang dính vụ án; trẻ em; chuyện đời tư, bi kịch gia đình (ví dụ chuyện mất con của Dương Gió Tai); nhân vật phim có bản quyền.
2. **Nhân vật nhại:** tự vẽ hoặc tự tạo, **không dùng ảnh thật hay AI tạo hình từ ảnh thật, không clone giọng**. Tên đã đổi (Duy Đèn Cầy, Dương Gió Mùa...). Khi đăng quảng bá, **không tag hay dùng hashtag tên thật**.
3. **Một dòng disclaimer** ở màn credit (giống Một Ngày Làm Chó): *"Mọi nhân vật và tình huống là hư cấu, chỉ để giải trí; không nhằm mô tả bất kỳ cá nhân nào."* Kèm **một email liên hệ**.
4. **Gỡ nhanh khi có người phàn nàn:** web tĩnh thì redeploy là xong trong vài phút. Mỗi nhân vật nhại có cờ `enabled` trong file content để tắt ngay.
5. **Không thu dữ liệu:** không đăng nhập, không lưu gì của người chơi. Analytics chỉ đếm lượt.
6. **Nội dung:** không có mini-game đánh bài hay cá cược; rượu bia chỉ xuất hiện trong ngữ cảnh châm biếm hoặc cảnh báo; không có ma túy, không 18+.
7. **Nhạc:** chỉ dùng nhạc tự làm hoặc CC0, để host không gỡ site vì khiếu nại bản quyền.
8. **Từ v1.1 khi có LLM:** API key để ở server; rate limit; **trần ngân sách theo ngày** (bảo vệ ví của bạn); nhân vật nhại **không** chat tự do; ghi một dòng "Họ hàng do AI đóng vai".

**Rủi ro bạn chấp nhận** (quyết định của bạn, ghi lại để biết):
- Chưa làm rõ Nghị định 147 về chuyện cá nhân phát hành game. Đang đi theo cách Một Ngày Làm Chó: miễn phí, không thu tiền, chơi một người, không tài khoản.
- Nhân vật nhại chưa xin phép. Có thể bị yêu cầu gỡ; khi đó tắt nhân vật ngay theo mục 4.
- *Tùy chọn:* nhắn tin cho các creator được nhại khi ra mắt ("mình làm game indie có nhân vật lấy cảm hứng từ anh"). **Không bắt buộc**, nhưng đây là cách marketing miễn phí: nhiều creator sẽ share lại.

---

## 4. Kỹ thuật (tối giản)

- **v1: web tĩnh 100%.** Vite + React + TypeScript; content trong file JSON (kịch bản, nhân vật, thẻ mẹo). Host miễn phí trên một dịch vụ static hosting có CDN. Không backend.
- **3D:** Three.js qua React Three Fiber + drei. Mỗi chặng là một bản đồ low-poly đi lại được (bản đồ, NPC, nhiệm vụ khai báo trong JSON); engine hội thoại hiện có giữ làm lớp hội thoại khi nói chuyện với NPC.
- **Thẻ share:** Canvas tạo ảnh PNG, kèm nút lưu hoặc share (Web Share API trên điện thoại).
- **Art 3D:** Claude dựng đồ đặc trưng Việt bằng code (xe máy chở đào/mai, xe khách, mâm cỗ, bàn thờ, gánh xôi...). Nhà phố, xe chung, người có xương + animation lấy từ kho CC0 (Kenney, Quaternius; kiểm tra license từng pack). Nhân vật nhại nhận diện qua trang phục và đạo cụ. Không dùng AI tạo hình từ ảnh người thật.
- **Hiệu năng:** mục tiêu tải ban đầu dưới 5MB; nén model (meshoptimizer/Draco), tải cảnh khi cần, hạ độ phân giải trên máy yếu. Đo trên điện thoại thật từ bản thử đầu tiên.
- **Âm thanh:** vài SFX CC0. Nhạc nền tạm thời có thể bỏ ở v1.
- **v1.1 thêm:** một serverless function `/chat` làm proxy LLM (key, rate limit, trần ngân sách, bộ lọc).
- **Analytics:** công cụ đếm lượt không cookie: lượt bắt đầu, lượt chơi xong, lượt share.

---

## 5. Lịch làm việc đến v1 (khoảng 5 tuần)

| Ngày | Việc |
|---|---|
| **12–14/11** | Duyệt kịch bản 04-script; mở rộng engine (cờ, biến thể thành phố, cắt cảnh, chỉ đạo cảnh 3D trong JSON); cài React Three Fiber |
| **15–17/11** | **Bản thử 3D:** cảnh mâm cơm tất niên + một cảnh đường phố, chạy với engine. **Đo độ mượt trên điện thoại của bạn. Điểm quyết định:** mượt thì đi tiếp, không thì hạ xuống 2.5D |
| **18–24/11** | Cảnh ở phố: văn phòng/KTX, tiệc tất niên, đường phố, bến xe, xe khách, quốc lộ, trạm dừng; nhân vật CC0 + phụ kiện cameo |
| **25/11–1/12** | Cảnh ở quê: cổng làng, sân, nhà trên, mâm cỗ 3 miền, giao thừa, mùng 1, twist; mini-game lướt feed và chia lì xì |
| **2–8/12** | Chuyển toàn bộ kịch bản vào JSON (3 thành phố × 3 persona); 9 kết thúc; thẻ share; thẻ mẹo có nguồn |
| **9–12/12** | Tối ưu mobile, âm thanh CC0, analytics, disclaimer; playtest với 5–10 người (có người Trung và Nam để duyệt giọng) |
| **13–14/12** | Sửa lỗi |
| **~15/12** | 🚀 **Ra mắt v1** + bài đăng Threads |

**Build in public** (vừa làm portfolio vừa marketing): mỗi 2–3 ngày đăng một bài devlog ngắn lên Threads (ảnh nhân vật, clip gameplay, "hôm nay dạy Duy Đèn Cầy review bánh chưng"). Từ ngày 13/11, đăng kèm câu hỏi "Tết bạn sợ bị hỏi câu gì nhất?" để gom nội dung.

---

## 6. Gói portfolio

- **Trang case study** (giống trang của Golden Sea): concept, insight (lấy từ 01-research), quy trình làm với AI, tech stack, số liệu (lượt chơi, lượt share), changelog.
- **Trang changelog** công khai, mỗi bản cập nhật một dòng.
- **Clip demo 30–60 giây** cho LinkedIn, Threads, TikTok.
- **Số liệu cần theo dõi từ ngày đầu:** người chơi, tỷ lệ chơi hết, lượt share, kết thúc phổ biến nhất (bản thân số liệu này cũng là nội dung để đăng).

---

## 7. Rủi ro còn lại (bản lean)

| Rủi ro | Cách xử lý |
|---|---|
| Creator được nhại phàn nàn | Tắt nhân vật, redeploy trong vài phút; xin lỗi nhẹ nhàng; mời họ góp ý hoặc lồng tiếng |
| Người được nhại dính scandal | Tắt nhân vật ngay |
| Ra sớm quá, hype Tết chưa tới | Bản đầu dùng để sửa lỗi và gom follower; đẩy mạnh truyền thông vào tháng 1 |
| Chi phí LLM (từ v1.1) | Trần ngân sách theo ngày; chạm trần thì về chế độ kịch bản |
| Trễ lịch v1 | Cắt theo thứ tự: biến thể thành phố chỉ còn đổi đạo cụ và giọng; gộp chặng 2 với 3, chặng 7 vào 6; bỏ nhánh sinh viên ở chặng 2 |
| 3D không mượt trên điện thoại phổ thông | Phát hiện ở bản thử 15–17/11; hạ chi tiết, hoặc chuyển sang 2.5D (nền 3D tĩnh + nhân vật động) |

---

## 8. Cần bạn chốt ngay

1. ~~**Vùng miền** cho v1~~ **Đã chốt 12/11:** người chơi chọn 1 trong 3 hoặc cả 3. Đại diện **Hà Nội (Bắc), Đà Nẵng (Trung), Sài Gòn (Nam)**; từ các thành phố lớn này đổ về các tỉnh quê ăn Tết. Engine đã hỗ trợ (`regions`).
2. ~~**Bạn tự code hay muốn mình dựng khung project luôn?**~~ **Đã chốt:** Claude dựng khung, làm cùng nhau.
3. ~~**Style art**~~ **Đã chốt 12/11:** 3D low-poly, camera dẫn, Claude dựng (xem mục 4). Bản avatar SVG 2D trước đó đã bỏ hướng.
4. ~~**Duyệt kịch bản** [04-script.md](04-script.md)~~ **Đã duyệt 12/11.** Số hiệu ứng trong script là bản nháp, nguồn thật là `src/content/v1.json`.

**Hệ quả của việc chọn cả 3 vùng:** nội dung nhân 3. Kịch bản dùng chung một bộ cảnh và lời thoại, chỉ đổi đạo cụ, hoa, món ăn và giọng theo thành phố (04-script mục 1).

---

## Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| Research, plan, cameo | ✅ |
| Khung project + schema + engine + chọn vùng (321 test, CI chạy test/typecheck/build) | ✅ 12/11 |
| Kịch bản full hành trình, bản nháp 1 ([04-script.md](04-script.md)) | ✅ 12/11, đã duyệt |
| Mở rộng engine (cờ, điều kiện, biến thể vùng, bản đồ, NPC, nhiệm vụ; cắt cảnh và chỉ đạo cảnh 3D đã gỡ khi chuyển 3D 100%) | ✅ 12/11 |
| Dựng 3D: phố Tết, sân nhà, nhà trên + mâm cỗ (3 miền), 13 nhân vật. **Chơi được: chặng 5 (sân nhà, đi lại, nói chuyện, né câu hỏi, nhiệm vụ, kết thúc)**. Nội dung hội thoại chặng 3, 4, 6 đã gỡ khỏi runtime (chưa có bản đồ), còn trong lịch sử git (commit `442c7d9`) và 04-script | ✅ 12/11 (chặng 5) |
| **Đo FPS trên điện thoại của bạn** (điểm quyết định 3D hay 2.5D) | ⏳ chờ bạn |
| Cảnh ở phố còn lại (văn phòng/KTX, tiệc tất niên, bến xe, xe khách, quốc lộ, trạm dừng) | ⏳ 18–24/11 |
| v1 ra mắt | 🎯 khoảng 15/12 |
