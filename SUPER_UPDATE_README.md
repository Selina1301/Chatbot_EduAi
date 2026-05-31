# 🎯 SIÊU UPDATE - Quality Assessment + Clarification + Response Improvement

## 📌 Tổng Quan

Đây là một **SIÊU UPDATE** mà bạn yêu cầu với 3 tính năng **không thể thiếu**:

### ✨ 3 Tính Năng Chính

#### 1️⃣ **Quality Assessment** - Đánh Giá Chất Lượng Q&A
**File**: `quality_assessment.js`

**Tự động đánh giá**:
- 🎯 **Relevance** (độ liên quan): Câu trả lời có trả lời được câu hỏi không?
- 📏 **Detail Level** (mức độ chi tiết): Đủ ngắn gọn hay đủ chi tiết?
- 🚫 **Truncation Detection** (phát hiện cắt): Có bị cắt ngắn không?
- 💎 **Concrete Information** (thông tin cụ thể): Có số liệu, ví dụ, danh sách không?

**Output**: `0-1` confidence score + Khuyến nghị cải thiện

---

#### 2️⃣ **Clarification Engine** - Phát Hiện Câu Hỏi Mơ Hồ
**File**: `clarification_engine.js`

**Phát hiện tự động**:
- ❓ Câu hỏi quá ngắn (< 5 từ)
- 🔤 Đại từ mơ hồ ("cái này", "nó", "chúng nó", ...)
- 🎯 Nhiều chủ đề (AND, hoặc, hay, ...)
- 📍 Tham chiếu không rõ ("gì", "đâu", "khi nào", ...)
- 📊 Số lượng không chính xác ("khoảng", "gần", "tầm", ...)

**Action**: Gửi **clarifying questions** cho user!

**Ví dụ**:
```
User: "Cái này giá bao nhiêu?"

Bot: ❓ **Tôi cần làm rõ câu hỏi của bạn:**
1. 📝 Bạn có thể cung cấp thêm chi tiết không?
2. ❓ Bạn đang nhắc đến cái/nó nào?

💬 Vui lòng cung cấp thêm thông tin!
```

---

#### 3️⃣ **Response Improvement** - Cải Thiện Câu Trả Lời Tự Động
**File**: `response_improvement.js`

**Khi chất lượng thấp** (<0.5 confidence):
- 🔄 **COMPLETE**: Trả lời đầy đủ (khi bị cắt)
- 📝 **ELABORATE**: Thêm chi tiết (khi quá ngắn)
- 🎯 **EXEMPLIFY**: Thêm ví dụ (khi quá chung chung)
- 🗜️ **CONDENSE**: Viết ngắn gọn (khi quá dài)

**Tối đa 2 lần retry** nếu score < 0.5

**Ví dụ**:
```
Attempt 1: Gemini trả lời → Quality = 0.4 (LOW) ❌
  → Chọn strategy: ELABORATE
  → Prompt: "Vui lòng thêm chi tiết cụ thể..."
  
Attempt 2: Gemini trả lời lại → Quality = 0.7 (MEDIUM) ✅
  → Gửi cho user!
```

---

## 🔄 Quy Trình Xử Lý Chat (7 Bước - CHI TIẾT)

```
┌─────────────────────────────────────┐
│   User: "Mức học phí bao nhiêu?"    │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ STEP 0: Clarification Engine        │
│ ─────────────────────────────────── │
│ ❓ Phát hiện mơ hồ?                 │
│ ├─ Câu quá ngắn?                    │
│ ├─ Có đại từ mơ hồ?                 │
│ ├─ Có tham chiếu lạ?                │
│ └─ Nếu HỀT → Hỏi lại user!          │
└────────────┬────────────────────────┘
             │ (Nếu rõ ràng)
             ▼
┌─────────────────────────────────────┐
│ STEP 1: Knowledge Base Search       │
│ ─────────────────────────────────── │
│ 🔍 Tìm câu tương tự (>60%?)         │
│ ├─ Tìm thấy?                        │
│ │  └─ ✅ Trả lời từ KB (0 token)   │
│ └─ Không?                           │
│    └─ Tiếp tục STEP 2...            │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ STEP 2: Canned Response             │
│ ─────────────────────────────────── │
│ ✅ Tìm thấy? → Trả lời (legacy)     │
└────────────┬────────────────────────┘
             │ (Không match)
             ▼
┌─────────────────────────────────────┐
│ STEP 3: Gọi Gemini API              │
│ ─────────────────────────────────── │
│ 🤖 Gemini trả lời                   │
│ (maxTokens: 4096 - không cắt!)      │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ STEP 4: Quality Assessment          │
│ ─────────────────────────────────── │
│ ⭐ Đánh giá chất lượng (0-1)         │
│ ├─ Relevance: 90%                   │
│ ├─ DetailLevel: detailed            │
│ ├─ Truncated: No                    │
│ ├─ ConcreteInfo: Yes                │
│ └─ Confidence: 0.75 (MEDIUM)        │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ STEP 5: Improvement Check           │
│ ─────────────────────────────────── │
│ Confidence < 0.5? (Attempt < 2)     │
│ ├─ YES → Chọn strategy, Retry       │
│ └─ NO → Đủ tốt rồi, tiếp STEP 6     │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ STEP 6: Cập Nhật Chat History       │
│ ─────────────────────────────────── │
│ 📝 Lưu Q&A vào session              │
└────────────┬────────────────────────┘
             ▼
┌─────────────────────────────────────┐
│ STEP 7: Auto-Learning               │
│ ─────────────────────────────────── │
│ 🧠 Lưu vào Knowledge Base?          │
│ ├─ Đủ chi tiết? (≥30 ký tự)        │
│ ├─ Không generic?                   │
│ ├─ Không trùng?                     │
│ └─ ✅ Lưu vào KB nếu OK             │
└─────────────────────────────────────┘
```

---

## 📊 API Response Format (Mở Rộng)

### Chat API Response
```json
{
  "reply": "Mức học phí năm học 2025-2026...",
  "sessionId": "default",
  "source": "gemini_api|knowledge_base|canned|clarification",
  
  // Khi từ KB
  "similarity": "85.5",
  
  // Khi từ Gemini
  "learned": true,
  "improvementAttempts": 0,
  
  // ⭐ QUALITY ASSESSMENT
  "quality": {
    "confidence": 0.75,
    "level": "MEDIUM",
    "details": {
      "relevance": "90.0%",
      "detailLevel": "detailed",
      "isTruncated": false,
      "hasConcreteInfo": true
    },
    "recommendations": [
      "✅ Câu trả lời có chất lượng tốt"
    ],
    "summary": "🎯 Chất lượng: MEDIUM (75.0%)"
  },
  
  // ❓ CLARIFICATION
  "needsClarification": true,
  "clarifyingQuestions": [
    {
      "type": "CONTEXT",
      "text": "📝 Bạn có thể cung cấp thêm chi tiết không?",
      "followUp": "Để tôi có thể trả lời chính xác hơn"
    }
  ]
}
```

---

## 🎯 Quality Assessment - Chi Tiết

### Confidence Scores
| Level | Range | Ý Nghĩa |
|-------|-------|---------|
| HIGH | > 0.8 | Chất lượng tốt - gửi ngay |
| MEDIUM | 0.6-0.8 | Chất lượng trung bình - có thể gửi |
| LOW | < 0.6 | Cần cải thiện - retry |

### Detail Level
| Level | Tỷ lệ Answer/Question |
|-------|----------------------|
| brief | < 2x |
| moderate | 2-5x |
| detailed | 5-15x |
| excessive | > 15x |

### Khuyến Nghị Tự Động
- Nếu bị cắt → "⚠️ Câu trả lời bị cắt - cần yêu cầu Gemini trả lời đầy đủ"
- Nếu quá ngắn → "📝 Cần thêm chi tiết"
- Nếu quá chung chung → "🎯 Cần thêm ví dụ cụ thể"
- Nếu confidence < 0.6 → "🔄 Cần cải thiện hoặc trả lời lại"

---

## ❓ Clarification Engine - Chi Tiết

### Ambiguity Detection
```javascript
detectAmbiguity(question)
```

**Returns**:
```json
{
  "isAmbiguous": true,
  "ambiguityScore": 0.75,
  "severity": "HIGH|MEDIUM|NONE",
  "indicators": [
    {
      "type": "TOO_SHORT",
      "confidence": 0.7,
      "message": "Câu hỏi quá ngắn, có thể thiếu bối cảnh"
    }
  ]
}
```

### Ambiguity Types
| Type | Condition | Message |
|------|-----------|---------|
| TOO_SHORT | < 5 từ | "Câu hỏi quá ngắn" |
| AMBIGUOUS_PRONOUN | "cái này", "nó" | "Đại từ mơ hồ" |
| MULTIPLE_TOPICS | AND, hoặc, hay | "Nhiều chủ đề" |
| VAGUE_REFERENCE | Tham chiếu lạ | "Tham chiếu mơ hồ" |
| VAGUE_QUANTITY | "khoảng", "tầm" | "Số lượng không xác định" |
| PURPOSE_AMBIGUITY | Mục đích mơ hồ | "Mục đích không rõ" |

### Clarifying Questions
Hệ thống **tự động sinh** 1-2 câu hỏi làm rõ:
```
❓ 1. 📝 Bạn có thể cung cấp thêm chi tiết không?
❓ 2. 🎯 Bạn muốn hỏi về vấn đề chính là cái nào?
```

---

## 🔄 Response Improvement - Chi Tiết

### Improvement Strategies
| Strategy | Priority | Khi Nào | Prompt |
|----------|----------|---------|--------|
| COMPLETE | 1 | Bị cắt | "Trả lời đầy đủ" |
| ELABORATE | 2 | Quá ngắn | "Thêm chi tiết" |
| EXEMPLIFY | 2 | Quá chung | "Thêm ví dụ" |
| CONDENSE | 3 | Quá dài | "Viết ngắn gọn" |

### Automatic Retry Logic
```javascript
while (attemptCount < 2 && qualityScore < 0.5) {
  // Lựa chọn strategy
  // Tạo improvement prompt
  // Gọi Gemini lại
  // Đánh giá chất lượng
  attemptCount++
}
```

### Ví Dụ Retry Flow
```
User: "Học phí là bao nhiêu?"
  ↓
Gemini Attempt 1: "Khoảng vài triệu..."
  Quality: 0.3 (LOW) ❌
  Strategy: EXEMPLIFY
  ↓
Gemini Attempt 2: "Năm 2025-2026, học phí khoảng X triệu cho..."
  Quality: 0.7 (MEDIUM) ✅
  → Gửi cho user!
```

---

## 🚀 Sử Dụng Hệ Thống

### 1. Kiểm Tra Quality Assessment
```bash
curl http://localhost:3000/api/quality-info
```

### 2. Kiểm Tra Clarification
```bash
curl http://localhost:3000/api/clarification-info
```

### 3. Kiểm Tra Improvement
```bash
curl http://localhost:3000/api/improvement-info
```

### 4. Chat với Quality Reports
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Học phí bao nhiêu?", "sessionId": "user123"}'
```

**Response sẽ có**:
- `reply`: Câu trả lời
- `quality`: Chi tiết chất lượng
- `clarifyingQuestions`: Nếu mơ hồ
- `improvementAttempts`: Số lần retry

---

## 💡 Các Trường Hợp Sử Dụng

### Case 1: Câu Hỏi Rõ Ràng → Trả Lời Tốt
```
User: "Hãy cho tôi biết mức học phí năm học 2025-2026 của UNETI là bao nhiêu?"

Bot: [Tìm KB] → Tìm thấy 85% match
     [Quality] → Confidence: 0.88 (HIGH)
     → ✅ Trả lời ngay!
```

### Case 2: Câu Hỏi Mơ Hồ
```
User: "Cái này bao nhiêu?"

Bot: [Clarification Engine] → Phát hiện mơ hồ
     → ❓ "Bạn đang hỏi về cái nào? Học phí, thủ tục, hay liên hệ?"
```

### Case 3: Câu Trả Lời Chất Lượng Thấp
```
User: "Thủ tục xin giấy tờ như thế nào?"

Attempt 1:
  Gemini: "Bạn cần xin giấy tờ."
  Quality: 0.35 (LOW) ❌
  
Attempt 2 (ELABORATE):
  Gemini: "Để xin giấy tờ, bạn cần: 1) Điền đơn, 2) Nộp phí, 3) Chờ 3-5 ngày..."
  Quality: 0.76 (MEDIUM) ✅
  → Gửi!
```

### Case 4: Cắt Ngắn Detection
```
User: "Chi tiết về kế hoạch đào tạo?"

Gemini (maxTokens: 2048 trước):
  "Kế hoạch đào tạo bao gồm... [CẮT]"
  Quality: 0.4 (LOW) - Detected truncation!
  
Gemini (maxTokens: 4096 sau):
  "Kế hoạch đào tạo bao gồm... [ĐẦY ĐỦ]"
  Quality: 0.8 (HIGH) ✅
```

---

## 📈 Metrics & Monitoring

### Dashboard mở rộng sẽ hiển thị:
- ✅ Quality Score trung bình
- ✅ Clarification Rate (% câu mơ hồ)
- ✅ Improvement Success Rate (% lần retry thành công)
- ✅ Truncation Detection Rate
- ✅ Confidence Distribution

---

## 🎉 Tóm Tắt

| Tính Năng | Lợi Ích | Status |
|-----------|---------|--------|
| **Quality Assessment** | Đảm bảo câu trả lời tốt | ✅ Active |
| **Clarification** | Tránh trả lời sai lạc | ✅ Active |
| **Auto-Improvement** | Câu trả lời "self-healing" | ✅ Active |
| **Max Token 4096** | Không cắt ngắn | ✅ Fixed |
| **Retry Logic** | Smart retry với strategy | ✅ Active |

---

## 🔧 Configuration

### Thay đổi Thresholds
**File**: `server.js`

```javascript
// Quality Assessment threshold
const QUALITY_THRESHOLD = 0.6; // Hạ xuống để dễ retry

// Improvement max attempts
const MAX_IMPROVEMENT_ATTEMPTS = 3; // Tăng lên để aggressive hơn

// Clarification severity
const CLARIFICATION_THRESHOLD = 0.6; // Hạ xuống để hỏi lại nhiều hơn
```

---

## ✅ Status: Production Ready

**Tất cả 3 tính năng đã được**:
- ✅ Implement hoàn chỉnh
- ✅ Syntax validate
- ✅ Test chạy server
- ✅ API endpoints hoạt động
- ✅ Documentation chi tiết

**Server output**:
```
✅ Knowledge Base + Similarity Search
✅ Auto-Learning từ Gemini
✅ Quality Assessment (đánh giá chất lượng)
✅ Clarification Engine (phát hiện mơ hồ)
✅ Response Improvement (cải thiện đáp án)
✅ Automatic Retry (thử lại nếu chất lượng thấp)
```

---

**Hãy mở browser vào `http://localhost:3000` để chat thử! 🚀**
