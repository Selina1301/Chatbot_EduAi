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

// Import SQLite và RAG Engine mới
const dbManager = require('./database');
const ragEngine = require('./rag_engine');

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

// Middleware log mọi request để dễ debug
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// =====================================================
// KHỞI TẠO RAG ENGINE (Lập chỉ mục cục bộ)
// =====================================================
ragEngine.initRAG();

// Khởi chạy load Knowledge Base từ SQLite vào RAM cache để chuẩn bị
loadKnowledgeBase();

// =====================================================
// SYSTEM PROMPT TEMPLATE - UNETI SPECIALIZED CHATBOT
// =====================================================
const SYSTEM_PROMPT_TEMPLATE = `Bạn là TRỢ LÝ THÔNG MINH UNETI - một chatbot AI chuyên biệt phục vụ sinh viên và cán bộ Trường Đại học Kinh tế - Kỹ thuật Công nghiệp (UNETI).

NHIỆM VỤ CỦA BẠN:
- Trả lời các câu hỏi về học phí, thủ tục hành chính, kế hoạch đào tạo, thông tin giảng viên và liên hệ phòng ban
- Hướng dẫn sinh viên thực hiện các thủ tục đăng ký, xin giấy tờ
- Cung cấp thông tin chính xác, rõ ràng dựa trên tài liệu chính thức của nhà trường
- Gợi ý sinh viên liên hệ phòng ban phù hợp khi cần

QUY TẮC TRẢ LỜI:
1. Ưu tiên sử dụng thông tin từ tài liệu tham khảo được cung cấp bên dưới câu hỏi.
2. Trả lời bằng tiếng Việt, ngắn gọn, súc tích và thân thiện.
3. Nếu không tìm thấy thông tin phù hợp trong tài liệu tham khảo, hãy nói rõ là tài liệu hiện tại không đề cập, sau đó gợi ý sinh viên liên hệ phòng ban tương ứng thay vì tự bịa ra thông tin.
4. Tuyệt đối không bịa đặt thông tin (như số điện thoại, phòng học, mức học phí) không có trong tài liệu tham khảo.
5. Trích dẫn tài liệu tham khảo khi cần (ví dụ: "Theo thông báo học phí...").
6. Chỉ tập trung hỗ trợ các chủ đề liên quan đến UNETI, từ chối lịch sự nếu câu hỏi nằm ngoài phạm vi nhà trường.

5 CHỦ ĐỀ CHÍNH BẠN HỖ TRỢ:
📚 HỌC VỤ - Lịch học, đăng ký học phần, tốt nghiệp
💰 HỌC PHÍ & TÀI CHÍNH - Mức học phí, hình thức nộp, miễn giảm
📋 THỦ TỤC HÀNH CHÍNH - Xin giấy tờ, bảo lưu, thôi học, chuyển trường
👨‍🏫 THÔNG TIN GIẢNG VIÊN - Danh sách giảng viên, chức danh, trình độ đào tạo
📞 LIÊN HỆ PHÒNG BAN - Địa chỉ, email, điện thoại các phòng ban`;

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
            max_tokens: 4096,
            stream: false
        })
    });

    const text = await response.text();
    
    if (!response.ok) {
        let message = 'Unknown AI API error';
        try {
            const errData = JSON.parse(text);
            message = errData.error?.message || errData.message || response.statusText;
        } catch (e) {
            message = text.substring(0, 100);
        }
        throw new Error(`AI API error ${response.status}: ${message}`);
    }

    let reply = '';
    try {
        const data = JSON.parse(text);
        reply = data.choices?.[0]?.message?.content;
    } catch (e) {
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
                const dataStr = line.replace('data: ', '').trim();
                if (dataStr === '[DONE]') continue;
                try {
                    const chunk = JSON.parse(dataStr);
                    const chunkContent = chunk.choices?.[0]?.delta?.content || '';
                    reply += chunkContent;
                } catch (err) {}
            }
        }
    }

    if (!reply) {
        console.error("Lỗi parse API response:", text.substring(0, 500));
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

        const sid = sessionId || 'default';
        console.log(`\n💬 [User]: ${message} (Session: ${sid})`);

        // ✅ STEP 0: Phát hiện câu hỏi mơ hồ (Clarification)
        console.log('🤔 Đang kiểm tra câu hỏi...');
        const ambiguityAnalysis = detectAmbiguity(message);
        
        if (ambiguityAnalysis.isAmbiguous && shouldAskClarification(ambiguityAnalysis.ambiguityScore, ambiguityAnalysis.severity)) {
            console.log(`⚠️ Phát hiện câu hỏi mơ hồ (severity: ${ambiguityAnalysis.severity})`);
            const clarifyingQuestions = generateClarifyingQuestions(message, ambiguityAnalysis);
            const clarificationResponse = createClarificationResponse(message, clarifyingQuestions);
            
            return res.json({
                reply: clarificationResponse,
                sessionId: sid,
                source: 'clarification',
                needsClarification: true,
                clarifyingQuestions: clarifyingQuestions
            });
        }

        // ✅ STEP 1: Kiểm tra Knowledge Base (Similarity Search)
        console.log('🔍 Đang tìm kiếm trong Knowledge Base...');
        const similarQA = findSimilarAnswer(message, 0.8);
        
        if (similarQA) {
            console.log(`✅ Tìm thấy câu tương tự (độ trùng: ${(similarQA.similarity * 100).toFixed(1)}%)`);
            
            // Lưu vào SQLite
            dbManager.addSessionMessage(sid, 'user', message);
            dbManager.addSessionMessage(sid, 'assistant', similarQA.answer);
            
            const qualityReport = generateQualityReport(message, similarQA.answer);
            
            return res.json({ 
                reply: similarQA.answer, 
                sessionId: sid,
                source: 'knowledge_base',
                similarity: (similarQA.similarity * 100).toFixed(1),
                quality: qualityReport
            });
        }

        // ✅ STEP 2: Truy vấn RAG cục bộ để lấy ngữ cảnh tối ưu
        console.log('🔍 Đang tìm tài liệu tham khảo phù hợp (RAG)...');
        const relevantChunks = ragEngine.retrieveRelevantChunks(message, 8);
        const context = relevantChunks.map(c => `[Nguồn: ${c.source}]\n${c.content}`).join('\n\n');
        
        const dynamicSystemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nTÀI LIỆU THAM KHẢO TỪ NHÀ TRƯỜNG:\n${context || 'Không tìm thấy tài liệu tham khảo nào liên quan trực tiếp.'}`;

        // ✅ STEP 3: Lấy lịch sử chat từ SQLite
        const history = dbManager.getSessionMessages(sid, 10);
        const formattedHistory = history.map(h => ({ role: h.role, content: h.content }));

        const messages = [
            { role: 'system', content: dynamicSystemPrompt },
            ...formattedHistory,
            { role: 'user', content: message }
        ];

        console.log(`🚀 Gọi AI API (${AI_MODEL})...`);
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
            
            reply = await callAIChat([
                { role: 'system', content: dynamicSystemPrompt },
                ...formattedHistory,
                { role: 'user', content: message },
                { role: 'assistant', content: reply },
                { role: 'user', content: improvementPrompt }
            ]);
            
            qualityReport = generateQualityReport(message, reply);
            console.log(`   Kết quả: ${qualityReport.summary}`);
        }

        // Lưu vào SQLite
        dbManager.addSessionMessage(sid, 'user', message);
        dbManager.addSessionMessage(sid, 'assistant', reply);

        // ✅ STEP 6: Tự động học (Auto-Learning)
        console.log(`🧠 Đang xử lý tự động học...`);
        const learned = autoLearnQA(message, reply);
        if (learned) {
            console.log(`✅ Đã lưu câu hỏi mới vào SQLite`);
        }

        console.log(`✅ [Bot]: Trả lời thành công (${reply.length} ký tự)`);

        return res.json({ 
            reply, 
            sessionId: sid,
            source: 'ai_api',
            learned: !!learned,
            quality: qualityReport,
            improvementAttempts: attemptCount
        });

    } catch (error) {
        console.error('❌ Lỗi xử lý:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra trên máy chủ. Vui lòng thử lại.' });
    }
});

// Clear session
app.post('/api/reset', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) {
        dbManager.clearSession(sessionId);
    }
    res.json({ message: 'Đã xóa lịch sử hội thoại' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        database: 'SQLite (chatbot.db)'
    });
});

// =====================================================
// 📊 THỐNG KÊ HỆ THỐNG TỰ HỌC
// =====================================================
app.get('/api/stats', (req, res) => {
    const kbStats = getKBStats();
    const learningStats = getLearningStats();
    const topQuestions = getTopUsedQuestions(5);
    
    // Đếm sessions từ SQLite
    const activeSessions = dbManager.db.prepare('SELECT COUNT(DISTINCT session_id) as total FROM chat_messages').get().total;
    
    res.json({
        knowledgeBase: kbStats,
        learning: learningStats,
        topQuestions: topQuestions,
        activeSessions: activeSessions
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
        ]
    });
});

// =====================================================
// 🔄 IMPROVEMENT ENDPOINTS
// =====================================================
app.get('/api/improvement-info', (req, res) => {
    res.json({
        description: 'Hệ thống cải thiện câu trả lời tự động',
        strategies: [
            { type: 'COMPLETE', description: 'Trả lời đầy đủ (khi bị cắt)' },
            { type: 'ELABORATE', description: 'Thêm chi tiết (khi quá ngắn)' },
            { type: 'EXEMPLIFY', description: 'Thêm ví dụ (khi quá chung chung)' },
            { type: 'CONDENSE', description: 'Viết ngắn gọn (khi quá dài)' }
        ]
    });
});

function startServer(startPort) {
    const server = app.listen(startPort);

    server.on('listening', () => {
        console.log(`\n🎓 UNETI AI Chatbot đang chạy thành công tại: http://localhost:${startPort}`);
        console.log(`🔑 Đảm bảo AI_BASE_URL, AI_API_KEY và AI_MODEL đã được cấu hình trong file .env`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
            console.log(`⚠️ Port ${startPort} đang bị bận hoặc Windows chặn (EACCES). Đang thử port ${startPort + 1}...`);
            startServer(startPort + 1);
        } else {
            console.error('\n❌ Lỗi nghiêm trọng khi khởi động server:', err);
        }
    });

    process.on('SIGINT', () => {
        console.log('\n🛑 Nhận tín hiệu SIGINT (Ctrl+C). Đang đóng server...');
        server.close(() => {
            console.log('✅ Server đã được đóng hoàn toàn. Tạm biệt!');
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Nhận tín hiệu SIGTERM. Đang đóng server...');
        server.close(() => {
            console.log('✅ Server đã được đóng hoàn toàn. Tạm biệt!');
            process.exit(0);
        });
    });
}

startServer(Number(port));
