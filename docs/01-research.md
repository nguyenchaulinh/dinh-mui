# Research: Game web "Về Quê Ăn Tết" (personal project)

Ngày research: 12/11/2026. Mọi con số đều kèm nguồn. Số liệu báo chí là thứ cấp: cần kiểm tra lại trước khi trích công khai.

---

## 0. Tóm tắt

- **Concept đã được chứng minh ở Trung Quốc:** game web AI 《决战拜年之巅》 (Tết 2024) cho người chơi đối đáp với "họ hàng AI" trong group chat gia đình, đạt **hơn 1 triệu người dùng sau 1 tuần**. Team là sinh viên ở Hàng Châu.
- **Việt Nam chưa có bản tương đương.** Tìm kiếm không ra game nào đúng chủ đề này. Chỉ có game Tết chung chung và các chiến dịch mẹo ứng xử của brand.
- **Nỗi đau có thật và cụ thể:** bị hỏi lương, giục cưới, hỏi ngoại hình; vé khứ hồi Sài Gòn–Hà Nội 4–6 triệu; về quê một lần tốn khoảng 20 triệu; 74% độc giả coi lì xì là áp lực tài chính.
- **Thời điểm rất gấp:** mùng 1 Tết Đinh Mùi là **thứ Bảy 6/2/2027**. Ra mắt hợp lý khoảng **10–20/1/2027**, tức còn khoảng 8–9 tuần.
- **Khác biệt so với bản Trung Quốc:** bản TQ chỉ có màn chat. Bản Việt nên làm thành **cả hành trình về quê** (săn vé, đi đường, mâm cơm, chúc Tết, lì xì, quay lại thành phố), chia theo **vùng miền**, và mỗi chặng **lồng một thông tin hữu ích thật**. Kết thúc nên ấm áp để game không thành "game cãi nhau với họ hàng".
- **Rủi ro lớn nhất:**
  1. Pháp lý: Nghị định 147/2024 viết theo chủ thể doanh nghiệp, chưa rõ cá nhân được phát hành game hay không. Cần hỏi luật sư trước khi public.
  2. Chi phí LLM khi viral: bản TQ phải giới hạn số lượt chat vì chi phí và từng bị sập.
  3. AI họ hàng nói câu phản cảm, bị chụp màn hình lan truyền.

---

## 1. Thời điểm và lịch

| Mốc | Ngày dương lịch | Ghi chú |
|---|---|---|
| Ông Công Ông Táo (23 tháng Chạp) | thứ Bảy **30/1/2027** | Tôi tự tính từ ngày mùng 1, nên kiểm tra lại |
| Giao thừa | tối thứ Sáu **5/2/2027** | Năm nay **không có 30 Tết**, tháng Chạp chỉ có 29 ngày |
| Mùng 1 Tết Đinh Mùi | thứ Bảy **6/2/2027** | |
| Nghỉ Tết công chức | 4/2 đến 10/2/2027 (7 ngày liên tục) | Theo thông báo Bộ Nội vụ. Doanh nghiệp tư chọn 1 trong 3 phương án |
| Rằm tháng Giêng | khoảng **20/2/2027** | Tôi tự tính, nên kiểm tra lại |

**Cửa sổ nội dung Tết:** chủ đề Tết bắt đầu lên sau Tết Dương lịch, đỉnh khoảng 2–3 tuần trước giao thừa, hạ nhiệt sau mùng 5. Trend kiểu này thường bùng chỉ 1–3 tuần (bản TQ, chùa online, Một Ngày Làm Chó đều vậy), nên **ra muộn coi như mất cả năm**.

---

## 2. Insight người dùng

### 2.1 Các nỗi đau

**Câu hỏi bị sợ nhất** (VnExpress, Vietcetera, Znews):
- "Cháu đi làm ở đâu, lương bao nhiêu?" / "Làm ngân hàng chắc lương cao lắm hả?"
- "Bạn trai/bạn gái đâu, bao giờ cưới?" / "Bao giờ tính chuyện vợ con cho ông bà vui?"
- Câu hỏi về ngoại hình (béo, gầy, đen).
- So sánh với "con nhà người ta", hỏi mua nhà chưa, thưởng Tết bao nhiêu, mang về cho mẹ bao nhiêu.
- Câu hỏi mang định kiến giới, kiểu "Sao chưa có bồ? Hay là bê đê?". Vietcetera có hẳn bài về nhóm câu này. **Game phải đặt những câu này vào vị trí "hành vi sai"**, không lấy chúng làm trò cười.
- Thời điểm bị hỏi: thường ngay lúc vừa vào nhà, "ngồi chưa nóng chỗ".
- Bối cảnh: tuổi kết hôn lần đầu trung bình gần 30 với nam, 27 với nữ, TP.HCM trên 30 (Cục Thống kê, dẫn qua VnExpress). Khoảng cách giữa kỳ vọng của gia đình và thực tế là có thật.

**Tiền:**
- Vé khứ hồi Sài Gòn–Hà Nội 4–6 triệu, "tương đương 1,5–2 tháng tiền thuê nhà" (Vietcetera 2/2026).
- Về quê một lần khoảng 20 triệu, gồm đi lại, ăn uống, quà biếu, lì xì (một nhân vật trong bài Tuổi Trẻ 1/2026).
- Có người đặt ngân sách Tết 10 triệu, chưa tính vé máy bay.
- Có người không về quê vì "không xoay xở nổi" tiền vé, lì xì, quà hai bên, và áy náy vì chưa có tích lũy.
- Lì xì: khảo sát 1.000 độc giả VnExpress (2023, mẫu tự nguyện) cho thấy 11% chi trên 30% lương tháng, 19% chi 10–30%, 70% chi dưới 10%. Một khảo sát khác cũng 1.000 độc giả: **74% coi lì xì là áp lực tài chính**.
- Các tình huống khó: lì xì sếp và con sếp (dân văn phòng nhắn nhau trong nhóm để bàn mức), con một phải lì xì cả hai bên nội ngoại, vợ chồng cãi nhau vì mức lì xì.

**Hậu cần và việc nhà** (Vietcetera "7 nỗi sợ mùa Tết"): dọn nhà, đi biếu quà, sắm Tết, chuẩn bị cỗ cúng (ít nhất khoảng 10 lễ), về quê, lì xì, chụp ảnh với ông bà. Thêm kẹt xe, tàu xe quá tải, có người về đến nơi đã chập tối 29 Tết, quà làm hành lý nặng thêm.

**Cách người trẻ đang đối phó:** trả lời nhẹ nhàng rồi chuyển sang nói về kế hoạch; hỏi ngược lại người lớn; đặt vé sớm; chia ngân sách từ trước; lì xì theo độ thân thiết; ở lại thành phố hoặc làm thêm dịp Tết; trốn trong phòng khi có đoàn khách mang theo trẻ con; dặn dò nhau qua nhóm chat gia đình.

**Nhóm chat gia đình là trung tâm:** khảo sát Kaspersky (2/2026, số liệu toàn cầu, không tách riêng Việt Nam) cho thấy 97% người dùng nền tảng số để liên lạc với người thân, 53% chia sẻ meme (58% ở nhóm 18–34 tuổi). Giao diện "nhóm chat gia đình" vì thế quen thuộc ngay với người chơi.

### 2.2 Persona đề xuất

| Persona | Nỗi đau chính | Chặng game liên quan |
|---|---|---|
| Sinh viên năm cuối, lần đầu xa nhà | Tiền, vé, "ra trường làm gì" | Săn vé, mâm cơm |
| Người mới đi làm (22–26 tuổi), làm xa quê | Lương, lì xì lần đầu, so sánh | Lì xì, mâm cơm |
| Độc thân 27–32 tuổi | Giục cưới, mai mối | Đi chúc Tết, "buổi xem mắt bất đắc dĩ" |
| Mới cưới | Tết hai bên nội ngoại, "bao giờ có cháu" | Chọn ăn Tết bên nào |

Mỗi persona là một **nhân vật chơi được**, giúp người chơi quay lại chơi nhiều lần và share theo kiểu "tag đứa bạn đúng hoàn cảnh".

---

## 3. Đối thủ và tham chiếu

### 3.1 《决战拜年之巅》 / "过年亲戚模拟器" (Trung Quốc, Tết 2024): tham chiếu trực tiếp

- **Gameplay:**
  - Bối cảnh là group WeChat gia đình giả lập tên "相亲相爱一家人", khoảng 10 họ hàng NPC (七大姑, 八大姨, 二大爷, bố, mẹ...).
  - Người chơi gõ câu trả lời tự do, AI đóng vai họ hàng đáp lại.
  - Mỗi NPC có **chỉ số cảm xúc**. Nếu chán, họ "rời nhóm".
  - Phải nói chuyện xong với tất cả mới qua màn.
  - Mỗi NPC tối đa 8 lượt, riêng bố mẹ 12 lượt, **giới hạn vì chi phí tính toán**.
  - Có hệ thống thành tựu.
  - Dòng kết: "再怎么刀子嘴，也要回家", đại ý "dù miệng cứng đến đâu cũng phải về nhà".
- **Kết quả:** hơn 1 triệu người dùng sau 1 tuần (Quang Minh Nhật Báo, Báo Bắc Kinh, 2/2024). Lan qua WeChat Moments. Theo một bài khác, điểm khởi đầu là một status trên QQ Zone được chia sẻ 16.000 lần. Game từng bị sập. Sau đó có nhiều bản clone xuất hiện nhanh.
- **Team:** công ty nhỏ ở Hàng Châu, thành viên chủ yếu là sinh viên. Không công bố đã dùng LLM nào.
- **Người chơi phản hồi:**
  - Thích vì câu hỏi "giống thật", có thể thử nhiều phong cách trả lời (nổi loạn, kể chuyện, ấm áp, "lấy độc trị độc"), và có người thấy "được chữa lành" vì hiểu thêm người thân.
  - Có người thì "tăng xông" vì không cãi lại được AI, phải nói dối là đã có chồng con, lương cao mới qua màn.
- **Bình luận của báo chí:** game cho người chơi giá trị cảm xúc: vừa tập dượt, vừa xả stress. Các bình luận viên kêu gọi người lớn giữ "ranh giới", người trẻ kiên nhẫn hơn.
- **Bài học cho bản Việt:**
  1. Concept này được kiểm chứng ở một văn hóa Tết rất gần Việt Nam.
  2. Chi phí LLM là nút thắt thật.
  3. Chat tự do dễ làm người chơi bực và bế tắc, nên cần thêm lựa chọn có sẵn.
  4. Kết thúc ấm áp giúp game được báo chí nhìn thiện cảm.
  5. Bị clone nhanh, nên tốc độ ra mắt là lợi thế.

### 3.2 Tham chiếu trong nước

| Sản phẩm | Điểm học được |
|---|---|
| **Webgame "Nón lá"** chữa ngọng L/N (Tuổi Trẻ 11/11/2026) | Một người làm bằng AI trong 1 ngày. Bài trên **Threads** đạt 1,5 triệu view và gần 70.000 like sau khoảng 1 ngày; khoảng 50.000 người chơi, 300.000–400.000 lượt chơi (số do tác giả tự nêu). **Threads đang là kênh ra mắt tốt cho web toy ở Việt Nam.** Cái hài đến từ chính kỹ năng của người chơi. |
| **Một Ngày Làm Chó** (Golden Sea, 10/2026) | Hài phố Việt rất cụ thể. Buzz lớn nhưng chỉ khoảng 23.000 hồ sơ người chơi. Đừng nhầm lượt share với lượng người dùng thật. |
| **Chùa online** (10–11/2026) | Bùng rất nhanh, nhưng kéo theo cảnh báo về dữ liệu và lừa đảo ngay sau đó. |
| Game Tết H5 chung chung (gameh5...), mini game Tết của các brand | Không đánh vào nỗi đau thật nên không viral. |
| Tinder với "bí kíp hỏi xoáy đáp xoay ngày Tết" | Brand đã chơi ở lãnh địa này. Sau này có thể là nhà tài trợ, nhưng **tránh dùng tên "hỏi xoáy đáp xoay"**. |

### 3.3 Khoảng trống thị trường

- Chưa có game Việt nào về "về quê, đối đáp họ hàng" (theo phạm vi tìm kiếm của tôi, chưa phải khẳng định tuyệt đối).
- **Chưa có công cụ tra cứu xưng hô họ hàng tử tế:** chỉ có sơ đồ tĩnh, và các trang hỏi đáp còn trả lời mâu thuẫn nhau, ví dụ cho câu "em gái của vợ gọi là gì". Đây là tính năng hữu ích thật, dùng được quanh năm và có thể kéo traffic tìm kiếm.

---

## 4. Thiết kế đề xuất

### 4.1 Định vị

> "Tập dượt Tết trước khi Tết tập dượt bạn". Một hành trình về quê 10 phút, cười vào những nỗi sợ quen thuộc, và mang về vài mẹo thật.

Tên tham khảo: **"Về Quê Sống Sót"**, "Tết Này Về Không?", "Đại Chiến Mâm Cơm", "Gia Đình Là Số 1 (nhóm chat)". Cần kiểm tra trùng tên và tên miền.

### 4.2 Cấu trúc: hành trình 6 chặng

| Chặng | Gameplay | Lớp thông tin thật |
|---|---|---|
| 1. **Săn vé** | Lướt "feed" tìm vé, chọn mua. Có bẫy: fanpage giả, "vé pass rẻ hơn 20%", "suất nội bộ", "vé giờ chót", đòi cọc 30–100% | Thủ đoạn lừa vé Tết thật theo cảnh báo của công an; mua qua kênh chính thức; dấu hiệu nhận biết |
| 2. **Đường về** | Mini-game trên xe khách hoặc tàu: kẹt xe, quà bị đè bẹp, say xe | Nhắc "đã uống rượu bia thì không lái xe" cùng mức phạt theo Nghị định 168/2024 (đối chiếu văn bản gốc trước khi đưa vào); mẹo đi đường dài |
| 3. **Bước vào nhà** | Vừa ngồi xuống đã bị hỏi dồn dập: chọn đáp án hoặc gõ tự do | Kỹ năng đáp khéo: trả lời nhẹ, chuyển sang kế hoạch, hỏi lại, đặt ranh giới lịch sự |
| 4. **Mâm cơm tất niên** | Boss fight nhiều họ hàng cùng lúc, mỗi người một tính cách | Phong tục mâm cỗ theo vùng miền |
| 5. **Mùng 1: chúc Tết và lì xì** | Quản lý ví: chia lì xì cho trẻ con, con sếp, ông bà | **Máy tính ngân sách Tết**, đối chiếu "người khác chi bao nhiêu % lương"; ý nghĩa của mừng tuổi; các chiêu lừa "hỗ trợ Tết" giả |
| 6. **Quay lại thành phố** | Tổng kết | "Sao kê Tết" dạng hóa đơn hài; danh hiệu Tết |

**Tính năng phụ (dùng quanh năm):** **"Máy tính xưng hô"**: chọn quan hệ, chọn vùng miền, ra cách gọi đúng. Nội dung phải dựa trên tài liệu ngôn ngữ học đáng tin, có ghi chú khác biệt vùng miền.

### 4.3 Cơ chế

- **Ba thanh chỉ số kéo co nhau:** **Hòa khí gia đình**, **Sức chịu đựng** và **Ví tiền**. Nói thật thì mất hòa khí, nói dối thì mất sức chịu đựng, chiều lòng tất cả thì mất ví. Tạo ra lựa chọn khó, khác với bản TQ chỉ có một thanh cảm xúc.
- **Hội thoại kết hợp, để kiểm soát chi phí và nội dung:**
  - Phần chính là kịch bản có sẵn với 3–4 lựa chọn mỗi câu, mỗi lựa chọn mang một phong cách: Khéo, Thật thà, Lầy lội, Phản đòn.
  - **Chế độ "Đối đáp tự do"** dùng LLM, giới hạn số lượt. Đây là phần tạo khoảnh khắc đáng chụp màn hình.
- **Vùng miền Bắc / Trung / Nam:** xưng hô, mâm cỗ, bánh chưng hay bánh tét, cách nói của họ hàng khác nhau. Người chơi có lý do chơi lại, và có niềm tự hào vùng miền khi share ("bản miền Tây hài xỉu").
- **Plot twist cuối game:** người chơi được xem **góc nhìn của mẹ hoặc bác**: "hỏi lương vì lo", "giục cưới vì sợ con cô đơn". Kết thúc ấm kiểu "dù sao vẫn phải về nhà" để tránh bị chê là game cổ xúy cãi nhau với gia đình. Đây cũng là điểm khiến báo chí và brand dễ ủng hộ.
- **Khoảng 8 kết thúc, mỗi cái kèm danh hiệu để share:** "Cháu ngoan quốc dân", "Chiến thần né câu hỏi", "Ví rỗng tim đầy", "Bị gả trong 3 ngày", "Trốn Tết thành công", "Bị cả họ unfollow"...

### 4.4 Thứ để share (động cơ viral)

1. **Thẻ danh hiệu Tết**: ảnh dọc, tối ưu cho story Threads, FB, TikTok.
2. **"Sao kê Tết"**: hóa đơn hài liệt kê các khoản đã chi. Meme "sao kê" rất Việt.
3. **"Biên bản họp gia đình"**: trích những câu đối đáp hay nhất người chơi đã gõ.
4. **Thách bạn bè**: link dẫn bạn vào chơi cùng một kịch bản, so kết quả.
5. **Tính năng UGC "Câu bạn sợ nhất"**: người chơi gửi câu mình hay bị hỏi (ẩn danh). Câu hay được đưa vào game. Vừa làm nội dung vừa tạo cộng đồng từ trước khi ra mắt.

### 4.5 Phiên chơi

- 8–12 phút mỗi lượt, chơi trên điện thoại, không đăng nhập, mở link là vào.
- Mục tiêu: hơn 60% người chơi đi đến kết thúc, mỗi người share trung bình hơn 0,3 lần.

---

## 5. Kỹ thuật và chi phí

- **Frontend:** web tĩnh mobile-first (Vite + React, hoặc vanilla; chỉ cần Phaser nếu có mini-game hành động). Mục tiêu dưới 5MB, chạy được trên Android giá rẻ. Host trên một CDN tĩnh.
- **LLM:** đi qua một **serverless proxy** để giữ API key ở server, không bao giờ để ở client. Proxy cần:
  - Rate limit theo IP và theo phiên.
  - **Trần ngân sách theo ngày**. Khi chạm trần, game tự chuyển sang 100% kịch bản có sẵn chứ không sập.
  - Persona prompt ngắn và cache được; giới hạn độ dài output; bộ lọc nội dung cả đầu vào lẫn đầu ra.
- **Ước tính chi phí:** số người chơi × số lượt chat tự do × chi phí mỗi lượt. Ví dụ 50.000 người chơi (cỡ webgame Nón lá) × 10 lượt tự do là **500.000 lượt gọi LLM**. Lấy đơn giá model nhỏ hiện hành nhân vào. **Đừng mở chat tự do không giới hạn**: bản TQ đã phải cắt lượt và vẫn sập.
- **Analytics:** dùng công cụ không thu dữ liệu cá nhân, chỉ đếm sự kiện (bắt đầu chơi, qua từng chặng, kết thúc, share).
- **Bảo mật:** app làm nhanh bằng AI cần được rà soát bảo mật trước khi public (bài học từ cảnh báo chùa online). Những điểm cần chú ý: lộ API key, endpoint proxy bị lạm dụng, người chơi prompt injection để "bẻ" họ hàng AI nói bậy.

---

## 6. Pháp lý và rủi ro

> Đây là thông tin tham khảo tôi tổng hợp từ nguồn thứ cấp, **không phải tư vấn pháp lý**. Nên hỏi luật sư trước khi public.

### 6.1 Game online: Nghị định 147/2024/NĐ-CP (hiệu lực 25/12/2024)

- Phân loại: **G1** có nhiều người chơi tương tác đồng thời qua máy chủ; **G2** người chơi chỉ tương tác với máy chủ; **G3** nhiều người chơi nhưng không qua máy chủ; **G4** tải về, không tương tác.
- G1 cần giấy phép và quyết định phát hành; theo bài của Luật Việt An, điều kiện đầu tiên là phải là doanh nghiệp (Điều 39 khoản 1). G2–G4 cần giấy chứng nhận và thông báo phát hành.
- **Chưa rõ:** cá nhân có được cung cấp G2–G4 không. Các nguồn tôi đọc đều viết theo chủ thể doanh nghiệp. Tôi chưa đọc được văn bản gốc vì trang bị chặn. Game miễn phí cũng không thấy được miễn trừ, vì phân loại dựa trên cách tương tác chứ không dựa trên doanh thu.
- **Ý nghĩa với project:**
  - Game một người chơi, gọi LLM qua server của mình, nhiều khả năng rơi vào vùng G2. Thêm multiplayer real-time sẽ thành G1, nên **bỏ multiplayer real-time khỏi MVP**.
  - Các lựa chọn: (a) hỏi luật sư hoặc hỏi cơ quan quản lý bằng văn bản; (b) nếu bắt buộc phải là doanh nghiệp thì cân nhắc lập hộ kinh doanh hoặc công ty, hoặc hợp tác với một đơn vị phát hành có giấy phép.
  - Nhiều web toy khác (Nón lá, chùa online...) đang hoạt động mà không rõ tình trạng pháp lý. **Đó không phải lý do để bỏ qua bước này.**
- Nội dung bị cấm theo nghị định (danh sách do Luật Việt An trích) có cả rượu bia, cờ bạc, bạo lực, dung tục. Vì vậy: **cảnh nhậu chỉ nên mang tính cảnh báo**, không cổ xúy. **Không có mini-game đánh bài Tết**, vì nghị định cấm game mô phỏng casino và dùng hình ảnh lá bài.

### 6.2 Dữ liệu cá nhân: Luật BVDLCN 91/2025

- Thiết kế theo nguyên tắc thu tối thiểu: không tài khoản, không số điện thoại, không email. Nếu có leaderboard thì chỉ dùng nickname.
- Nội dung chat tự do: không lưu, hoặc nếu lưu để cải thiện game thì ẩn danh và phải ghi rõ trong chính sách.
- Tính năng UGC "câu bạn sợ nhất": cần bộ lọc thông tin cá nhân trước khi hiển thị.
- Có trang chính sách quyền riêng tư ngắn gọn.

### 6.3 Nội dung do AI tạo: Luật AI 134/2025

- Ghi rõ "họ hàng do AI đóng vai". Yêu cầu cụ thể về nhãn và minh bạch cần đối chiếu văn bản luật.

### 6.4 Rủi ro nội dung và thương hiệu

- **AI nói câu phản cảm bị chụp màn hình lan truyền** (phân biệt giới, LGBT, body shaming, vùng miền) là rủi ro số 1. Cách giảm:
  - Persona prompt có ranh giới rõ, cộng bộ lọc output.
  - Chủ đề nhạy cảm chỉ đi bằng kịch bản viết sẵn.
  - Game luôn đặt câu hỏi kém duyên vào vị trí "sai".
- **Người chơi dưới 18 tuổi:** giữ nội dung phù hợp mọi lứa tuổi, không có nội dung 18+.
- **Sở hữu trí tuệ:** không dùng UI hay logo Zalo/Messenger, giọng người nổi tiếng, hay nhạc có bản quyền.
- **Bị clone:** concept TQ đã công khai, đối thủ có thể ra trước. Bảo vệ bằng tốc độ, chất lượng nội dung Việt và cộng đồng UGC.

---

## 7. Lộ trình (12/11/2026 đến 20/2/2027)

| Giai đoạn | Thời gian | Việc chính | Đầu ra |
|---|---|---|---|
| **Kiểm chứng** | 12/11 đến 26/11 | Đăng concept hoặc mockup lên Threads; mở thu thập "câu bạn sợ nhất Tết"; phỏng vấn nhanh 20–30 người trẻ | Ngân hàng câu hỏi thật; tín hiệu quan tâm (lượt tương tác, đăng ký nhận link) |
| **Pháp lý** | song song, xong trước 31/12 | Hỏi luật sư về Nghị định 147 và trường hợp cá nhân | Quyết định: phát hành cá nhân, lập hộ kinh doanh hay hợp tác |
| **MVP** | 27/11 đến 24/12 | 1 vùng miền, 6 chặng, khoảng 6 kết thúc, thẻ share, proxy LLM có trần ngân sách | Bản chơi được |
| **Playtest và hoàn thiện** | 25/12 đến 8/1 | 20–30 người test; lọc nội dung; load test; rà soát bảo mật; thêm vùng miền thứ 2 nếu kịp | Bản ra mắt |
| **Soft launch** | khoảng 10–12/1/2027 | Chia cho nhóm nhỏ, theo dõi chi phí và lỗi | Số liệu thật đầu tiên |
| **Đẩy mạnh** | 15/1 đến 30/1 (Ông Công Ông Táo) | Threads, TikTok, các group sinh viên; gửi cho page meme và gaming (đừng trả tiền booking vội) | Đỉnh traffic |
| **Cập nhật trong Tết** | 5/2 đến 10/2 | Nội dung "Mùng 1 chúc Tết", đổi thẻ share | Kéo dài chu kỳ |
| **Sau Tết** | 11/2 đến 20/2 | "Sao kê Tết" và chặng quay lại thành phố; giữ lại máy tính xưng hô dùng quanh năm | Cơ sở cho bản Tết 2028 |

---

## 8. KPI và cách đo

- **Thành công:** tỷ lệ chơi hết, share trên mỗi người chơi, tỷ lệ chơi lại (đổi persona hoặc vùng miền), và một câu quiz cuối game ("bạn rút được mẹo nào?").
- **Cảnh báo:** chi phí LLM mỗi người chơi, số ca nội dung bị lọc, phản hồi tiêu cực về nội dung.
- **Mốc tham chiếu:** webgame Nón lá khoảng 50.000 người chơi trong khoảng 1 ngày; bản TQ hơn 1 triệu sau 1 tuần (thị trường lớn hơn nhiều). Mục tiêu thực tế cho lần đầu: **10.000–50.000 người chơi**.

---

## 9. Câu hỏi còn mở (cần bạn quyết)

1. Ngân sách tối đa cho LLM và hosting trong mùa Tết?
2. Làm một mình hay rủ thêm người (art, viết kịch bản)? Bạn tự code hay cần mình hỗ trợ code?
3. Có muốn kiếm tiền không (donate, tài trợ từ brand sau khi viral)? Lựa chọn này ảnh hưởng đến câu hỏi pháp lý.
4. Vùng miền nào làm trước? Nên chọn vùng bạn hiểu rõ nhất.

---

## Nguồn

**Lịch Tết 2027**
- Bộ Nội vụ thông báo lịch nghỉ Tết Đinh Mùi 2027 (CafeF): https://cafef.vn/bo-noi-vu-thong-bao-lich-nghi-tet-nguyen-dan-dinh-mui-2027-188261010092338947.chn
- Lịch nghỉ Tết 2027 (FPT Shop): https://fptshop.com.vn/tin-tuc/for-gamers/lich-nghi-tet-2027-210548

**Đối thủ và tham chiếu**
- 《决战拜年之巅》 (Quang Minh Nhật Báo): https://m.gmw.cn/2024-02/09/content_1303657225.htm
- AI奇点网: https://m.aieva.cn/news/1804.html
- Báo Bắc Kinh, 锐评: https://xinwen.bjd.com.cn/content/s65c0a05ae4b07f5c39289c63.html
- Sohu (chưa đọc được, 403): https://www.sohu.com/a/757068215_204824 , https://www.sohu.com/a/756888428_220034
- Webgame Nón lá (Tuổi Trẻ): https://tuoitre.vn/webgame-non-la-viral-nho-chua-ngong-100261111133244088.htm
- Một Ngày Làm Chó: https://goldenseastudios.com/portfolio/mot-ngay-lam-cho
- Game Tết H5: https://gameh5.io/tag/game-tet/
- Tinder, "hỏi xoáy đáp xoay": https://www.brandsvietnam.com/congdong/topic/345722-tinder-bat-mi-bi-kip-ung-pho-voi-nhung-cau-hoi-xoay-dap-xoay-ngay-tet

**Insight người trẻ và Tết**
- Hỏi lương, giục cưới (VnExpress): https://vnexpress.net/hoi-luong-giuc-cuoi-4996645.html
- Tết này về hay ở (Tuổi Trẻ): https://tuoitre.vn/tet-nay-ve-hay-o-ap-luc-tai-chinh-tam-ly-niu-chan-20260112181610908.htm
- Áp lực lì xì (VnExpress): https://vnexpress.net/ap-luc-li-xi-4554071.html
- 7 nỗi sợ mùa Tết (Vietcetera): https://vietcetera.com/vn/7-noi-so-mua-tet-ban-se-boc-trung-tui-mu-nao
- Vì sao Tết là nỗi sợ của người mới đi làm (Vietcetera): https://vietcetera.com/amp/vn/vi-sao-mua-tet-lai-la-noi-so-cua-nguoi-moi-di-lam
- 5 câu hỏi phân biệt giới (Vietcetera): https://vietcetera.com/amp/vn/5-cau-hoi-phan-biet-gioi-tranh-hoi-dip-le-tet
- Người trẻ sợ Tết (VnExpress): https://vnexpress.net/nguoi-tre-so-tet-4560006.html
- Gia đình kết nối online dịp Tết, khảo sát Kaspersky (Tuổi Trẻ News): https://news.tuoitre.vn/vietnamese-families-increasingly-connect-online-even-during-tet-survey-103260220143901083.htm
- Tết 2026, khảo sát Home Credit (Tuổi Trẻ): https://tuoitre.vn/tet-2026-nguoi-viet-tu-tin-sam-tet-hon-nhung-tien-van-la-noi-lo-20260105092023165.htm

**Thông tin hữu ích**
- Lừa vé tàu Tết (Báo Văn hóa): https://baovanhoa.vn/phap-luat/ve-tau-tet-gia-re-tran-lan-tren-mang-cong-an-canh-bao-bay-mat-tien-coc-198345.html
- "Vé giờ chót", "suất nội bộ" (VnEconomy): https://vneconomy.vn/canh-giac-truoc-chieu-lua-ve-gio-chot-ve-huy-suat-noi-bo.htm
- Lừa đảo trực tuyến dịp Tết (Báo Lào Cai): https://baolaocai.vn/bo-cong-an-canh-bao-chieu-lua-dao-truc-tuyen-dip-tet-va-mua-le-hoi-post892557.html
- Mạo danh BHXH "hỗ trợ Tết" (LSVN): https://lsvn.vn/bhxh-viet-nam-canh-bao-thu-doan-lua-dao-ho-tro-tet-a168060.html
- Mức phạt nồng độ cồn 2026 (Thư viện Pháp luật): https://thuvienphapluat.vn/hoi-dap-phap-luat/muc-phat-nong-do-con-2026-138076174.html
- Mức phạt nồng độ cồn (LuatVietnam): https://luatvietnam.vn/giao-thong/muc-phat-nong-do-con-2025-doi-voi-nguoi-lai-o-to-xe-may-moi-nhat-863-100533-article.html
- Sơ đồ xưng hô họ hàng (VOH): https://voh.com.vn/thuong-thuc/so-do-cach-xung-ho-trong-ho-hang-575769.html

**Pháp lý**
- Nghị định 147/2024 (Thư viện Pháp luật, chưa đọc được văn bản gốc): https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Nghi-dinh-147-2024-ND-CP-quan-ly-cung-cap-su-dung-dich-vu-Internet-thong-tin-tren-mang-480755.aspx
- Phân loại G1–G4 (LTV Law): https://ltvlaw.com/tin-tuc/phan-loai-game-g1-g2-g3-g4
- Giấy phép G1 (Luật Việt An): https://luatvietan.vn/giay-phep-game-online-g1.html
- Cấm game đánh bài giải trí (Thư viện Pháp luật): https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/chinh-sach-moi/75526/chinh-thuc-khong-duoc-phat-hanh-game-danh-bai-giai-tri-tai-viet-nam-tu-25-12-2024
