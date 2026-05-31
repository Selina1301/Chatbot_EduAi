require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import modules cho hệ thống tự học
const knowledgeManager = require('./knowledge_manager');
const learningModule = require('./learning_module');
const qualityAssessment = require('./quality_assessment');
const clarificationEngine = require('./clarification_engine');
const responseImprovement = require('./response_improvement');

const loadKnowledgeBase = knowledgeManager.loadKnowledgeBase;
const findSimilarAnswer = knowledgeManager.findSimilarAnswer;
const getKBStats = knowledgeManager.getStats;
const getTopUsedQuestions = knowledgeManager.getTopUsedQuestions;
const autoLearnQA = learningModule.autoLearnQA;
const getLearningStats = learningModule.getLearningStats;
const generateQualityReport = qualityAssessment.generateQualityReport;
const detectAmbiguity = clarificationEngine.detectAmbiguity;
const generateClarifyingQuestions = clarificationEngine.generateClarifyingQuestions;
const createClarificationResponse = clarificationEngine.createClarificationResponse;
const shouldAskClarification = clarificationEngine.shouldAskClarification;
const selectImprovementStrategy = responseImprovement.selectImprovementStrategy;
const generateImprovementPrompt = responseImprovement.generateImprovementPrompt;
const shouldRetryImprovement = responseImprovement.shouldRetryImprovement;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// =====================================================
// LOAD UNETI KNOWLEDGE BASE AT STARTUP
// =====================================================
const DATA_DIR = path.join(__dirname, 'data');
let knowledgeBase = '';

function loadKnowledgeBaseFromFiles() {
    console.log('📚 Đang tải dữ liệu kiến thức UNETI từ tệp tin...');
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt'));
    const sections = [];

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        const label = file.replace(/_/g, ' ').replace('.txt', '').toUpperCase();
        sections.push(`=== ${label} ===\n${content}`);
    }

    knowledgeBase = sections.join('\n\n');
    console.log(`✅ Đã tải ${files.length} tài liệu (${Math.round(knowledgeBase.length / 1024)}KB kiến thức)`);
}

loadKnowledgeBaseFromFiles();

// =====================================================
// HỆ THỐNG TỰ HỌC - KNOWLEDGE BASE + SIMILARITY SEARCH
// =====================================================
console.log('\n🧠 Đang khởi tạo hệ thống tự học...');
const knowledgeBaseQA = loadKnowledgeBase();
console.log(`📊 Knowledge Base được tải: ${knowledgeBaseQA.length} câu hỏi-trả lời`);
const kbStats = getKBStats();
console.log(`   - Học phí: ${kbStats.categories['học phí'] || 0} | Đào tạo: ${kbStats.categories['đào tạo'] || 0} | Thủ tục: ${kbStats.categories['thủ tục'] || 0} | Liên hệ: ${kbStats.categories['liên hệ'] || 0}`);

// =====================================================
// CANNED RESPONSES FOR MAIN TOPICS (Legacy support)
// =====================================================
const TOPIC_MAP = {
    'học phí': knowledgeBase.match(/=== HOC PHI[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'thủ tục': knowledgeBase.match(/=== THU TUC HANH CHINH[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'đào tạo': knowledgeBase.match(/=== KE HOACH DAO TAO[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'liên hệ': knowledgeBase.match(/=== LIEN HE PHONG BAN[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'giảng viên': knowledgeBase.match(/=== GIANG VIEN INFO[\s\S]*?(?=\n===|\Z)/)?.[0] || ''
};

function getCannedResponse(message) {
    const lower = message.toLowerCase();
    for (const [key, content] of Object.entries(TOPIC_MAP)) {
        if (lower.includes(key)) {
            const excerpt = content.replace(/===.*?===/g, '').trim();
            return excerpt.length > 500 ? excerpt.slice(0, 500) + '...' : excerpt;
        }
    }
    return null;
}

// =====================================================
// SYSTEM PROMPT - UNETI SPECIALIZED CHATBOT
// =====================================================
const SYSTEM_PROMPT = `Bạn là TRỢ LÝ THÔNG MINH UNETI - một chatbot AI chuyên biệt phục vụ sinh viên và cán bộ Trường Đại học Kinh tế - Kỹ thuật Công nghiệp (UNETI).

NHIỆM VỤ CỦA BẠN:
- Trả lời các câu hỏi về học phí, thủ tục hành chính, kế hoạch đào tạo, thông tin giảng viên và liên hệ phòng ban
- Hướng dẫn sinh viên thực hiện các thủ tục đăng ký, xin giấy tờ
- Cung cấp thông tin chính xác, rõ ràng dựa trên tài liệu chính thức của nhà trường
- Gợi ý sinh viên liên hệ phòng ban phù hợp khi cần

QUY TẮC TRẢ LỜI:
1. Ưu tiên sử dụng thông tin từ tài liệu được cung cấp
2. Trả lời bằng tiếng Việt, ngắn gọn, súc tích và thân thiện
3. Nếu không tìm thấy thông tin trong tài liệu, hãy nói rõ và gợi ý liên hệ trực tiếp
4. Không bịa đặt thông tin không có trong tài liệu
5. Trích dẫn nguồn cụ thể khi cần (ví dụ: "Theo thông báo học phí năm học 2025-2026...")
6. Chỉ tập trung vào chủ đề liên quan đến UNETI, từ chối trả lời các câu hỏi ngoài phạm vi

5 CHỦ ĐỀ CHÍNH BẠN CÓ THỂ HỖ TRỢ:
📚 HỌC VỤ - Lịch học, đăng ký học phần, tốt nghiệp
💰 HỌC PHÍ & TÀI CHÍNH - Mức học phí, hình thức nộp, miễn giảm
📋 THỦ TỤC HÀNH CHÍNH - Xin giấy tờ, bảo lưu, thôi học, chuyển trường
👨‍🏫 THÔNG TIN GIẢNG VIÊN - Danh sách giảng viên, chức danh, trình độ đào tạo
📞 LIÊN HỆ PHÒNG BAN - Địa chỉ, email, điện thoại các phòng ban

TÀI LIỆU THAM KHẢO CỦA TRƯỜNG UNETI:
${knowledgeBase}`;

// =====================================================
// CHAT HISTORY (per session, in-memory)
// =====================================================
const chatSessions = new Map();

// =====================================================
// API ENDPOINT
// =====================================================
const AI_BASE_URL = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || '').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'ag/gemini-3-flash';

async function callAIChat(messages) {
    if (!AI_BASE_URL) {
        throw new Error('AI_BASE_URL chua duoc cau hinh trong file .env');
    }

    if (!AI_API_KEY) {
        throw new Error('AI_API_KEY chua duoc cau hinh trong file .env');
    }

    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: AI_MODEL,
            messages,
            temperature: 0.3,
            max_tokens: 4096
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data.error?.message || data.message || response.statusText || 'Unknown AI API error';
        throw new Error(`AI API error ${response.status}: ${message}`);
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
        throw new Error('AI API khong tra ve noi dung phan hoi hop le');
    }

    return reply;
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Tin nhắn không hợp lệ' });
        }

        console.log(`\n💬 [User]: ${message}`);

        // ✅ STEP 0: Phát hiện câu hỏi mơ hồ (Clarification)
        console.log('🤔 Đang kiểm tra câu hỏi...');
        const ambiguityAnalysis = detectAmbiguity(message);
        
        if (ambiguityAnalysis.isAmbiguous && shouldAskClarification(ambiguityAnalysis.ambiguityScore, ambiguityAnalysis.severity)) {
            console.log(`⚠️ Phát hiện câu hỏi mơ hồ (severity: ${ambiguityAnalysis.severity})`);
            const clarifyingQuestions = generateClarifyingQuestions(message, ambiguityAnalysis);
            const clarificationResponse = createClarificationResponse(message, clarifyingQuestions);
            
            return res.json({
                reply: clarificationResponse,
                sessionId: sessionId || 'default',
                source: 'clarification',
                needsClarification: true,
                clarifyingQuestions: clarifyingQuestions
            });
        }

        // ✅ STEP 1: Kiểm tra Knowledge Base (TIẾT KIỆM TOKEN)
        console.log('🔍 Đang tìm kiếm trong Knowledge Base...');
        const similarQA = findSimilarAnswer(message, 0.6);
        
        if (similarQA) {
            const sid = sessionId || 'default';
            console.log(`✅ Tìm thấy câu tương tự (độ trùng: ${(similarQA.similarity * 100).toFixed(1)}%)`);
            
            // Cập nhật chat history
            if (!chatSessions.has(sid)) {
                chatSessions.set(sid, []);
            }
            const history = chatSessions.get(sid);
            history.push({ role: 'user', content: message });
            history.push({ role: 'assistant', content: similarQA.answer });
            
            if (history.length > 40) {
                history.splice(0, 2);
            }

            // Đánh giá chất lượng
            const qualityReport = generateQualityReport(message, similarQA.answer);
            console.log(`📊 ${qualityReport.summary}`);

            return res.json({ 
                reply: similarQA.answer, 
                sessionId: sid,
                source: 'knowledge_base',
                similarity: (similarQA.similarity * 100).toFixed(1),
                quality: qualityReport
            });
        }

        // ✅ STEP 2: Kiểm tra canned response (legacy)
        const canned = getCannedResponse(message);
        if (canned) {
            console.log(`✅ Tìm thấy canned response`);
            return res.json({ 
                reply: canned, 
                sessionId: sessionId || 'default', 
                source: 'canned',
                quality: generateQualityReport(message, canned)
            });
        }

        // ✅ STEP 3: Gọi AI API
        const sid = sessionId || 'default';
        console.log(`🚀 Gọi AI API (${AI_MODEL})...`);

        if (!chatSessions.has(sid)) {
            chatSessions.set(sid, []);
        }
        const history = chatSessions.get(sid);

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: message }
        ];
        let reply = await callAIChat(messages);

        // ✅ STEP 4: Đánh giá chất lượng câu trả lời
        console.log(`⭐ Đang đánh giá chất lượng câu trả lời...`);
        let qualityReport = generateQualityReport(message, reply);
        console.log(`📊 ${qualityReport.summary}`);
        
        let attemptCount = 0;
        
        // ✅ STEP 5: Cải thiện câu trả lời nếu chất lượng thấp
        while (shouldRetryImprovement(attemptCount, qualityReport.confidence)) {
            attemptCount++;
            console.log(`\n🔄 Attempt ${attemptCount}: Đang cải thiện câu trả lời...`);
            
            const improvements = selectImprovementStrategy(qualityReport);
            if (improvements.length === 0) break;
            
            const strategy = improvements[0];
            console.log(`   Strategy: ${strategy.message}`);
            
            const improvementPrompt = generateImprovementPrompt(strategy, message, reply);
            if (!improvementPrompt) break;
            
            // Gọi AI lại để cải thiện
            reply = await callAIChat([
                { role: 'system', content: SYSTEM_PROMPT },
                ...history,
                { role: 'user', content: message },
                { role: 'assistant', content: reply },
                { role: 'user', content: improvementPrompt }
            ]);
            
            // Đánh giá lại
            qualityReport = generateQualityReport(message, reply);
            console.log(`   Kết quả: ${qualityReport.summary}`);
        }

        // ✅ STEP 6: Cập nhật chat history
        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: reply });

        if (history.length > 40) {
            history.splice(0, 2);
        }

        // ✅ STEP 7: Tự động học (Auto-Learning)
        console.log(`🧠 Đang xử lý tự động học...`);
        const learned = autoLearnQA(message, reply);
        if (learned) {
            console.log(`✅ Đã lưu câu hỏi mới vào Knowledge Base`);
        }

        console.log(`✅ [Bot]: Trả lời thành công (${reply.length} ký tự)`);
        res.json({ 
            reply, 
            sessionId: sid,
            source: 'ai_api',
            learned: learned ? true : false,
            quality: qualityReport,
            improvementAttempts: attemptCount
        });

    } catch (error) {
        console.error('❌ Lỗi AI API:', error);
        if (error.message && error.message.includes('429')) {
            res.status(429).json({ error: 'Hệ thống đang đạt giới hạn sử dụng AI API. Vui lòng thử lại sau ít phút.' });
        } else {
            res.status(500).json({ error: 'Có lỗi xảy ra trên máy chủ AI. Vui lòng thử lại.' });
        }
    }
});

// Clear session
app.post('/api/reset', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && chatSessions.has(sessionId)) {
        chatSessions.delete(sessionId);
    }
    res.json({ message: 'Đã xóa lịch sử hội thoại' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        knowledgeBase: `${Math.round(knowledgeBase.length / 1024)}KB`,
        sessions: chatSessions.size
    });
});

// =====================================================
// 📊 THỐNG KÊ HỆ THỐNG TỰ HỌC
// =====================================================
app.get('/api/stats', (req, res) => {
    const kbStats = getKBStats();
    const learningStats = getLearningStats();
    const topQuestions = getTopUsedQuestions(5);
    
    res.json({
        knowledgeBase: kbStats,
        learning: learningStats,
        topQuestions: topQuestions,
        activeSessions: chatSessions.size
    });
});

// Xem toàn bộ Knowledge Base
app.get('/api/knowledge-base', (req, res) => {
    const qa = loadKnowledgeBase();
    res.json({
        total: qa.length,
        data: qa
    });
});

// Xem Knowledge Base được tổ chức theo category
app.get('/api/knowledge-base/by-category', (req, res) => {
    const qa = loadKnowledgeBase();
    const byCategory = {};
    
    qa.forEach(item => {
        const cat = item.category || 'general';
        if (!byCategory[cat]) {
            byCategory[cat] = [];
        }
        byCategory[cat].push({
            id: item.id,
            question: item.question,
            frequency: item.frequency,
            lastUsed: item.lastUsed
        });
    });
    
    res.json(byCategory);
});

// =====================================================
// 📋 QUALITY ASSESSMENT ENDPOINTS
// =====================================================
app.get('/api/quality-info', (req, res) => {
    res.json({
        description: 'Hệ thống đánh giá chất lượng Q&A tự động',
        features: [
            '✅ Đánh giá độ liên quan (Relevance)',
            '✅ Phát hiện cắt ngắn (Truncation detection)',
            '✅ Đánh giá mức độ chi tiết (Detail level)',
            '✅ Kiểm tra thông tin cụ thể (Concrete info)',
            '✅ Tính confidence score (0-1)',
            '✅ Đưa ra khuyến nghị cải thiện'
        ],
        confidenceLevels: {
            HIGH: '> 0.8 (Chất lượng tốt)',
            MEDIUM: '0.6-0.8 (Chất lượng trung bình)',
            LOW: '< 0.6 (Cần cải thiện)'
        },
        responseFormat: {
            quality: {
                confidence: 'Điểm tin cậy (0-1)',
                level: 'Mức độ (HIGH/MEDIUM/LOW)',
                details: {
                    relevance: '% liên quan',
                    detailLevel: 'Mức độ chi tiết (brief/moderate/detailed/excessive)',
                    isTruncated: 'Có bị cắt không',
                    hasConcreteInfo: 'Có thông tin cụ thể không'
                },
                recommendations: ['Array khuyến nghị']
            }
        }
    });
});

// =====================================================
// ❓ CLARIFICATION ENDPOINTS
// =====================================================
app.get('/api/clarification-info', (req, res) => {
    res.json({
        description: 'Hệ thống phát hiện câu hỏi mơ hồ',
        features: [
            '✅ Phát hiện câu hỏi quá ngắn',
            '✅ Phát hiện đại từ mơ hồ (cái này, nó, ...)',
            '✅ Phát hiện nhiều chủ đề',
            '✅ Phát hiện tham chiếu không rõ',
            '✅ Phát hiện số lượng không chính xác',
            '✅ Sinh ra clarifying questions'
        ],
        ambiguityTypes: {
            TOO_SHORT: 'Câu hỏi quá ngắn',
            AMBIGUOUS_PRONOUN: 'Đại từ mơ hồ',
            MULTIPLE_TOPICS: 'Nhiều chủ đề',
            VAGUE_REFERENCE: 'Tham chiếu mơ hồ',
            VAGUE_QUANTITY: 'Số lượng không chính xác',
            PURPOSE_AMBIGUITY: 'Mục đích không rõ'
        },
        severity: ['NONE', 'MEDIUM', 'HIGH']
    });
});

// =====================================================
// 🔄 IMPROVEMENT ENDPOINTS
// =====================================================
app.get('/api/improvement-info', (req, res) => {
    res.json({
        description: 'Hệ thống cải thiện câu trả lời tự động',
        strategies: [
            {
                type: 'COMPLETE',
                description: 'Trả lời đầy đủ (khi bị cắt)',
                priority: 1
            },
            {
                type: 'ELABORATE',
                description: 'Thêm chi tiết (khi quá ngắn)',
                priority: 2
            },
            {
                type: 'EXEMPLIFY',
                description: 'Thêm ví dụ (khi quá chung chung)',
                priority: 2
            },
            {
                type: 'CONDENSE',
                description: 'Viết ngắn gọn (khi quá dài)',
                priority: 3
            }
        ],
        maxAttempts: 2,
        minimumQualityScore: 0.5
    });
});

app.listen(port, () => {
    console.log(`\n🎓 UNETI AI Chatbot đang chạy tại: http://localhost:${port}`);
    console.log(`🔑 Đảm bảo AI_BASE_URL, AI_API_KEY và AI_MODEL đã được cấu hình trong file .env`);
    console.log(`
========================================
📊 HỆ THỐNG TỰ HỌC VÀ CẢI THIỆN
========================================
✅ Knowledge Base + Similarity Search
✅ Auto-Learning từ Gemini
✅ Quality Assessment (đánh giá chất lượng)
✅ Clarification Engine (phát hiện mơ hồ)
✅ Response Improvement (cải thiện đáp án)
✅ Automatic Retry (thử lại nếu chất lượng thấp)
========================================

📖 Các địa chỉ hữu ích:
📊 Dashboard: http://localhost:${port}/dashboard.html
📈 API Stats: http://localhost:${port}/api/stats
📚 Knowledge Base: http://localhost:${port}/api/knowledge-base
⭐ Quality Info: http://localhost:${port}/api/quality-info
❓ Clarification Info: http://localhost:${port}/api/clarification-info
🔄 Improvement Info: http://localhost:${port}/api/improvement-info
    `);
});
