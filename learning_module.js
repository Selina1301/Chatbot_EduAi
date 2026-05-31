/**
 * LEARNING MODULE - Tự động học từ Gemini responses
 * Mỗi câu trả lời từ Gemini được phân tích để xác định category
 * và tự động lưu vào Knowledge Base nếu có giá trị
 */

const { addQA, loadKnowledgeBase } = require('./knowledge_manager');

// Xác định category dựa trên nội dung câu hỏi
function categorizeQuestion(question) {
    const lower = question.toLowerCase();
    
    if (lower.includes('học phí') || lower.includes('nộp') || lower.includes('tài chính') || lower.includes('tiền')) {
        return 'học phí';
    }
    if (lower.includes('đào tạo') || lower.includes('học phần') || lower.includes('đăng ký') || lower.includes('lịch')) {
        return 'đào tạo';
    }
    if (lower.includes('thủ tục') || lower.includes('giấy') || lower.includes('xin') || lower.includes('đơn')) {
        return 'thủ tục';
    }
    if (lower.includes('liên hệ') || lower.includes('phòng ban') || lower.includes('địa chỉ') || lower.includes('điện thoại')) {
        return 'liên hệ';
    }
    if (lower.includes('giảng viên') || lower.includes('cán bộ')) {
        return 'giảng viên';
    }
    return 'general';
}

// Kiểm tra xem câu trả lời có giá trị học tập không
// (Tránh học những câu trả lời generic hoặc thiếu thông tin)
function isValidAnswer(answer) {
    // Loại bỏ những câu trả lời quá ngắn
    if (answer.length < 30) return false;
    
    // Loại bỏ những câu trả lời chỉ nói "liên hệ phòng ban"
    if (answer.toLowerCase().includes('xin lỗi') && 
        answer.toLowerCase().includes('chưa có') && 
        answer.length < 100) {
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
        if (isDuplicate(userMessage, knowledgeBaseQA, 0.75)) {
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
