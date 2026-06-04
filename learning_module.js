/**
 * LEARNING MODULE - Tự động học từ Gemini responses
 * Mỗi câu trả lời từ Gemini được phân tích để xác định category
 * và tự động lưu vào Knowledge Base nếu có giá trị
 */

const { addQA, loadKnowledgeBase } = require('./knowledge_manager');

// Xác định category dựa trên nội dung câu hỏi (sử dụng hệ thống chấm điểm theo trọng số)
function categorizeQuestion(question) {
    const lower = question.toLowerCase();
    
    const categories = {
        'học phí': {
            keywords: ['học phí', 'nộp học phí', 'tiền học', 'tài chính', 'miễn giảm học phí', 'đóng học phí', 'biên lai', 'mức thu', 'nộp tiền'],
            score: 0
        },
        'đào tạo': {
            keywords: ['đào tạo', 'học phần', 'đăng ký', 'lịch học', 'thời khóa biểu', 'tín chỉ', 'hủy học phần', 'kế hoạch học', 'tốt nghiệp', 'lịch thi'],
            score: 0
        },
        'thủ tục': {
            keywords: ['thủ tục', 'giấy tờ', 'xin giấy', 'bảo lưu', 'thôi học', 'chuyển trường', 'rút hồ sơ', 'đơn xin', 'xác nhận sinh viên', 'bhyt', 'thẻ sinh viên', 'miễn giảm'],
            score: 0
        },
        'liên hệ': {
            keywords: ['liên hệ', 'phòng ban', 'địa chỉ', 'điện thoại', 'email', 'số điện thoại', 'cơ sở', 'văn phòng', 'hotline', 'gặp ai', 'ở đâu'],
            score: 0
        },
        'giảng viên': {
            keywords: ['giảng viên', 'cán bộ', 'thầy', 'cô', 'danh sách giảng viên', 'trình độ', 'chuyên ngành', 'dạy môn', 'khoa'],
            score: 0
        }
    };
    
    let maxScore = 0;
    let bestCategory = 'general';
    
    for (const [catName, catData] of Object.entries(categories)) {
        let score = 0;
        for (const keyword of catData.keywords) {
            // Escape special regex characters
            const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedKeyword, 'gi');
            const matches = lower.match(regex);
            if (matches) {
                score += matches.length * 3; // Trọng số từ khóa chính xác
            }
        }
        
        // Thêm điểm nếu có từ đơn lẻ tương ứng trong các từ phân tách
        const words = lower.split(/\s+/);
        catData.keywords.forEach(kw => {
            if (!kw.includes(' ')) { // Chỉ xét từ đơn
                if (words.includes(kw)) {
                    score += 1;
                }
            }
        });
        
        if (score > maxScore) {
            maxScore = score;
            bestCategory = catName;
        }
    }
    
    return bestCategory;
}

// Kiểm tra xem câu trả lời có giá trị học tập không
// (Tránh học những câu trả lời generic hoặc thiếu thông tin)
function isValidAnswer(answer) {
    // Loại bỏ những câu trả lời quá ngắn
    if (answer.length < 30) return false;
    
    const lower = answer.toLowerCase();
    
    // Loại bỏ những câu trả lời chỉ nói "liên hệ phòng ban"
    if (lower.includes('xin lỗi') && lower.includes('chưa có') && answer.length < 100) {
        return false;
    }
    
    // Loại bỏ câu trả lời tiêu cực, thiếu tài liệu, không có thông tin
    const negativeKeywords = [
        'không có thông tin',
        'không đề cập',
        'thiếu tài liệu',
        'thiếu thông tin',
        'không tìm thấy',
        'hiện tại không hỗ trợ',
        'không tự bịa',
        'tài liệu hiện tại không',
        'tài liệu không có'
    ];
    
    if (negativeKeywords.some(kw => lower.includes(kw))) {
        return false;
    }
    
    return true;
}

// Kiểm tra xem câu hỏi có tương tự với những câu đã có không
function isDuplicate(question, knowledgeBaseQA, similarityThreshold = 0.5) {
    const { findMostSimilarQuestion } = require('./similarity_engine');
    const match = findMostSimilarQuestion(question, knowledgeBaseQA, similarityThreshold);
    return match !== null;
}

// Tự động học: lưu Q&A mới từ Gemini
function autoLearnQA(userMessage, geminiResponse) {
    try {
        // Kiểm tra xem câu trả lời có giá trị không
        if (!isValidAnswer(geminiResponse)) {
            console.log('⏭️  Câu trả lời quá generic, bỏ qua learning');
            return false;
        }

        // Kiểm tra xem đã có câu tương tự chưa
        const knowledgeBaseQA = loadKnowledgeBase();
        if (isDuplicate(userMessage, knowledgeBaseQA, 0.65)) {
            console.log('⏭️  Câu hỏi tương tự đã tồn tại, bỏ qua learning');
            return false;
        }

        // Xác định category
        const category = categorizeQuestion(userMessage);

        // Thêm vào Knowledge Base
        const result = addQA(userMessage, geminiResponse, category, 'auto_learned_from_gemini');
        
        console.log(`🧠 Đã học câu hỏi mới: "${userMessage.substring(0, 40)}..."`);
        return result;

    } catch (error) {
        console.error('❌ Lỗi trong quá trình auto-learning:', error.message);
        return false;
    }
}

// Tính toán token save (ước tính số token được tiết kiệm)
function calculateTokenSaved(question, answer) {
    // Ước tính: 1 token ≈ 4 ký tự
    const questionTokens = Math.ceil(question.length / 4);
    const answerTokens = Math.ceil(answer.length / 4);
    
    // Gemini cần tính cả system prompt và chat history
    // Ước tính tiết kiệm ≈ 50% của answer tokens (vì còn phải gửi question)
    return Math.ceil(answerTokens * 0.5);
}

// Lấy thống kê learning
function getLearningStats() {
    const knowledgeBaseQA = require('./knowledge_manager').loadKnowledgeBase();
    
    const stats = {
        totalQA: knowledgeBaseQA.length,
        autoLearned: knowledgeBaseQA.filter(qa => qa.source === 'auto_learned_from_gemini').length,
        initialTraining: knowledgeBaseQA.filter(qa => qa.source === 'initial_training').length,
        totalUsage: knowledgeBaseQA.reduce((sum, qa) => sum + (qa.frequency || 0), 0),
        averageUsage: 0
    };
    
    if (stats.totalQA > 0) {
        stats.averageUsage = (stats.totalUsage / stats.totalQA).toFixed(2);
    }
    
    return stats;
}

module.exports = {
    categorizeQuestion,
    isValidAnswer,
    isDuplicate,
    autoLearnQA,
    calculateTokenSaved,
    getLearningStats
};
