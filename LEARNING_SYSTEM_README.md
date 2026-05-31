# 🧠 UNETI AI Chatbot - Hệ Thống Tự Học (Self-Learning System)

## 📌 Giới Thiệu Big Update

Đây là một **big update** cấp độ sản xuất với 3 giải pháp **siêu quan trọng**:

### ✨ Giải Pháp 1: Knowledge Base Tập Trung (Centralized KB)
- **Vấn đề cũ**: Mỗi lần user hỏi → gọi API Gemini (tốn token)
- **Giải pháp**: Lưu 4 câu hỏi chính + các câu thường gặp vào 1 JSON file
- **Kết quả**: Nếu câu hỏi đã biết → lấy từ KB (0 token), không cần gọi API!

### ✨ Giải Pháp 2: Smart Similarity Search
- **Vấn đề cũ**: Không biết khi nào nên dùng KB vs gọi API
- **Giải pháp**: Dùng **Cosine Similarity** để tìm câu hỏi tương tự (60% match → dùng cached answer)
- **Kết quả**: User hỏi "Học phí là bao nhiêu?" → hệ thống tìm thấy câu tương tự "Mức học phí 2025-2026 là bao nhiêu?" → trả lời ngay!

### ✨ Giải Pháp 3: Auto-Learning (Tự Động Học)
- **Vấn đề cũ**: Câu hỏi ngoài KB phải gọi API, lần sau vẫn phải gọi lại
- **Giải pháp**: Mỗi câu trả lời từ Gemini → **tự động lưu vào KB**
- **Kết quả**: Hệ thống càng dùng càng thông minh! Lần sau user hỏi tương tự → lấy từ cache!

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────┐
│                    User Question                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│     STEP 1: Tìm kiếm trong Knowledge Base               │
│     (similarity_engine.js)                              │
│     - Nếu tìm thấy + similarity > 60%                   │
│     ✅ TRẢ LỜI NGAY (0 token cost)                      │
└────────────────────────┬────────────────────────────────┘
                         │ (Không tìm thấy)
                         ▼
┌─────────────────────────────────────────────────────────┐
│     STEP 2: Kiểm tra Canned Response                    │
│     (legacy support)                                    │
└────────────────────────┬────────────────────────────────┘
                         │ (Không match)
                         ▼
┌─────────────────────────────────────────────────────────┐
│     STEP 3: Gọi Gemini API                              │
│     (chi gọi khi cần + câu hỏi ngoài phạm vi)           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│     STEP 4: Auto-Learning (Tự Động Học)                │
│     (learning_module.js)                                │
│     - Kiểm tra câu trả lời có giá trị?                 │
│     - Kiểm tra đã có câu tương tự?                      │
│     ✅ NẾU CÓ → LƯU VÀO KB                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Các File Mới

| File | Mô Tả |
|------|-------|
| `knowledge_manager.js` | Quản lý KB: load, save, tìm kiếm Q&A |
| `similarity_engine.js` | Tính toán độ tương đồng giữa câu hỏi (Cosine Similarity) |
| `learning_module.js` | Tự động học: phân loại, validate, lưu Q&A mới |
| `storage/knowledge_base.json` | **File lưu Q&A** (được tạo tự động) |
| `dashboard.html` | Dashboard để xem thống kê & theo dõi hệ thống |

---

## 🚀 Cách Sử Dụng

### 1️⃣ Khởi Động Server
```bash
# Activate virtual environment
.venv\Scripts\activate

# Run server
npm start
```

Bạn sẽ thấy output:
```
🧠 Đang khởi tạo hệ thống tự học...
📊 Knowledge Base được tải: 4 câu hỏi-trả lời
   - Học phí: 1 | Đào tạo: 1 | Thủ tục: 1 | Liên hệ: 1
```

### 2️⃣ Xem Dashboard
Mở browser → `http://localhost:3000/dashboard.html`

📊 Bạn sẽ thấy:
- Tổng số câu Q&A
- Số câu tự học được từ Gemini
- Top 5 câu hỏi thường gặp nhất
- Phân bố theo danh mục (học phí, đào tạo, v.v.)

### 3️⃣ Xem Knowledge Base (JSON)
Truy cập API: `http://localhost:3000/api/knowledge-base`

Output JSON:
```json
{
  "total": 4,
  "data": [
    {
      "id": 1,
      "question": "Học phí năm học 2025-2026 là bao nhiêu?",
      "answer": "...",
      "category": "học phí",
      "frequency": 5,
      "lastUsed": "2026-05-31T10:30:00.000Z",
      "source": "initial_training"
    }
  ]
}
```

### 4️⃣ Chat Bình Thường
```
User: "Mức học phí 2025-2026 bao nhiêu?"
↓
Hệ thống: "🔍 Đang tìm kiếm trong Knowledge Base..."
↓
Bot: "Mức học phí năm học 2025-2026 được công bố trên trang chính thức..."
↓
Console: "✅ Tìm thấy câu tương tự (độ trùng: 85%)"
```

---

## 🎯 Quy Trình Tự Học Chi Tiết

### Khi nào hệ thống KHÔNG học?
- ❌ Câu trả lời quá ngắn (< 30 ký tự)
- ❌ Câu trả lời chỉ nói "liên hệ phòng ban" (generic)
- ❌ Câu hỏi đã tương tự > 75% với câu có sẵn
- ❌ Câu hỏi được trả lời từ canned response

### Khi nào hệ thống HỌC?
- ✅ Câu hỏi mới + ngoài phạm vi KB
- ✅ Gọi Gemini để trả lời
- ✅ Câu trả lời đủ chi tiết (≥ 30 ký tự)
- ✅ Không trùng với câu hỏi cũ

---

## 📊 Thống Kê & API

### API Endpoints

#### `GET /api/stats` - Xem toàn bộ thống kê
```json
{
  "knowledgeBase": {
    "totalQA": 8,
    "categories": {
      "học phí": 2,
      "đào tạo": 2,
      "thủ tục": 2,
      "liên hệ": 2
    }
  },
  "learning": {
    "totalQA": 8,
    "autoLearned": 4,
    "initialTraining": 4,
    "totalUsage": 45,
    "averageUsage": "5.62"
  },
  "topQuestions": [...]
}
```

#### `GET /api/knowledge-base` - Toàn bộ KB (JSON)
Lấy tất cả Q&A với chi tiết: ID, category, frequency, source, ...

#### `GET /api/knowledge-base/by-category` - KB theo danh mục
```json
{
  "học phí": [
    { "id": 1, "question": "...", "frequency": 5 }
  ],
  "đào tạo": [...]
}
```

#### `POST /api/chat` - Chat (response bây giờ có thêm info)
```json
{
  "reply": "Trả lời...",
  "sessionId": "default",
  "source": "knowledge_base",    // or "gemini_api" or "canned"
  "similarity": "85.5",           // Nếu từ KB
  "learned": true                 // Nếu auto-learned
}
```

---

## 💡 Ví Dụ Thực Tế

### Scenario 1: User hỏi câu đã có
```
User: "Cách nộp học phí năm 2025-2026 như thế nào?"
Console: "✅ Tìm thấy câu tương tự (độ trùng: 78%)"
Bot: [Trả lời từ KB ngay - 0 token]
```

### Scenario 2: User hỏi câu mới
```
User: "Tôi có thể hoãn nộp học phí không?"
Console: "🔍 Không tìm thấy trong KB"
Console: "🚀 Gọi Gemini API..."
Bot: [Gemini trả lời]
Console: "🧠 Đã học câu hỏi mới vào KB"
```

### Scenario 3: Lần sau user hỏi tương tự
```
User: "Có thể delay nộp học phí được không?"
Console: "✅ Tìm thấy câu tương tự (độ trùng: 72%)"
Bot: [Trả lời từ KB - không cần gọi API lần thứ 2!]
```

---

## 🔧 Cấu Hình Nâng Cao

### Thay đổi Similarity Threshold
File: `server.js` → line ~120
```javascript
const similarQA = findSimilarAnswer(message, 0.6); // 0.6 = 60%
// Tăng lên 0.7 để strict hơn, giảm xuống 0.5 để flexible hơn
```

### Thêm Câu Hỏi Khởi Tạo
File: `knowledge_manager.js` → `DEFAULT_QA` array
```javascript
const DEFAULT_QA = [
    {
        id: 1,
        question: "Câu hỏi mới...",
        answer: "Câu trả lời...",
        category: "học phí",  // hoặc đào tạo, thủ tục, liên hệ
        ...
    }
];
```

### Xóa Knowledge Base & Reset
```bash
# Xóa file storage/knowledge_base.json
# Server sẽ tự động tạo lại với 4 câu hỏi khởi tạo

del Basic_Chatbot\storage\knowledge_base.json
npm start
```

---

## 📈 Hiệu Suất & Token Savings

### Ước Tính Tiết Kiệm Token

**Trước Big Update:**
- Mỗi câu hỏi → gọi Gemini → ~500 token
- 1000 câu/tháng = 500,000 tokens/tháng

**Sau Big Update:**
- 60% câu hỏi → KB (0 token)
- 40% câu hỏi → Gemini (500 token)
- 1000 câu/tháng = 200,000 tokens/tháng
- **💰 Tiết kiệm 60% = ~300,000 tokens/tháng!**

### Ví Dụ Số Liệu
```
Ngày 1: 100 câu hỏi
  - 70 câu từ KB (0 token)
  - 30 câu từ Gemini (15,000 token)
  - Tổng: 15,000 token

Ngày 2: 100 câu hỏi tương tự
  - 85 câu từ KB (0 token) [vì hôm qua tự học được!]
  - 15 câu từ Gemini (7,500 token)
  - Tổng: 7,500 token

Tiết kiệm: 7,500 token (50%) sau chỉ 1 ngày!
```

---

## 🐛 Troubleshooting

### Q: Dashboard không load được?
**A:** Kiểm tra server đang chạy `npm start`

### Q: Knowledge Base không được tải?
**A:** Kiểm tra folder `storage/` có tồn tại không? Nếu không, tạo thủ công:
```bash
mkdir Basic_Chatbot\storage
```

### Q: Câu hỏi không được tự động học?
**A:** Kiểm tra trong console:
- Nếu thấy "⏭️ Câu trả lời quá generic" → Gemini trả lời không đủ chi tiết
- Nếu thấy "⏭️ Câu hỏi tương tự đã tồn tại" → Câu hỏi đã có trong KB

### Q: Cách xem log chi tiết?
**A:** Mở browser console (F12) hoặc xem server logs trên terminal

---

## 📚 Các Module & Hàm Chính

### knowledge_manager.js
- `loadKnowledgeBase()` - Tải KB từ file
- `findSimilarAnswer(message, threshold)` - Tìm câu tương tự
- `addQA(question, answer, category, source)` - Thêm Q&A mới
- `getStats()` - Lấy thống kê KB

### similarity_engine.js
- `normalizeAndTokenize(text)` - Chuẩn hóa và tách từ
- `cosineSimilarity(vec1, vec2)` - Tính độ tương đồng
- `findMostSimilarQuestion(message, kbQA, threshold)` - Tìm câu tương tự nhất

### learning_module.js
- `autoLearnQA(userMessage, geminiResponse)` - Tự động học
- `categorizeQuestion(question)` - Phân loại câu hỏi
- `isValidAnswer(answer)` - Kiểm tra câu trả lời có giá trị?

---

## ✅ Checklist Tính Năng

- [x] Knowledge Base tập trung (JSON file)
- [x] Similarity Search (Cosine Similarity)
- [x] Auto-Learning từ Gemini
- [x] Dashboard thống kê real-time
- [x] API endpoints cho xem KB
- [x] Phân loại Q&A theo category
- [x] Tracking frequency & lastUsed
- [x] Token cost optimization
- [x] Support cho tiếng Việt
- [x] Legacy canned response support

---

## 🎉 Kết Luận

Hệ thống tự học này giúp bạn:
1. **Tiết kiệm 60% token** bằng cách tái sử dụng câu trả lời
2. **Tự động học** mỗi lần user hỏi → hệ thống ngày càng thông minh
3. **Hiệu suất cao** với Cosine Similarity matching
4. **Dashboard trực quan** để theo dõi hiệu suất

**Điểm quan trọng nhất**: Hệ thống này HOÀN TOÀN khả thi và có thể mở rộng thêm:
- Thêm vector embeddings (OpenAI, sentence-transformers)
- Thêm database (SQLite, MongoDB) thay vì JSON
- Thêm UI quản lý KB (add/edit/delete Q&A)
- Thêm feedback system (user rate answer quality)

Hãy bắt đầu sử dụng ngay hôm nay! 🚀
