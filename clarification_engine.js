/**
 * CLARIFICATION ENGINE - Phát Hiện Câu Hỏi Mơ Hồ
 * Đặt ra các câu hỏi làm rõ (clarifying questions) khi user hỏi không rõ ràng
 * VD: "Bạn đang hỏi về vấn đề X phải không?" để tránh trả lời sai lạc
 */

// Phát hiện câu hỏi mơ hồ
function detectAmbiguity(question) {
    const ambiguityIndicators = [];
    const lower = question.toLowerCase();
    
    // Kiểm tra xem câu hỏi có chứa các chủ đề học vụ cốt lõi không
    const hasCoreSubject = lower.includes('học phí') || lower.includes('đăng ký') || 
                           lower.includes('học phần') || lower.includes('lịch học') || 
                           lower.includes('bảo lưu') || lower.includes('thôi học') || 
                           lower.includes('giấy xác nhận') || lower.includes('giảng viên') ||
                           lower.includes('liên hệ') || lower.includes('phòng ban') ||
                           lower.includes('thời khóa biểu') || lower.includes('lịch thi');

    // 1. Câu hỏi quá ngắn (< 3 từ) và không chứa chủ đề cốt lõi
    const wordCount = question.split(/\s+/).length;
    if (wordCount < 3 && !hasCoreSubject) {
        ambiguityIndicators.push({
            type: 'TOO_SHORT',
            confidence: 0.5,
            message: 'Câu hỏi quá ngắn, có thể thiếu bối cảnh'
        });
    }
    
    // 2. Có các đại từ mơ hồ (cái này, cái kia, nó, chúng nó, ...) mà không có ngữ cảnh cụ thể
    if (/\b(cái này|cái kia|nó|chúng nó|nó là)\b/i.test(question) && !hasCoreSubject) {
        ambiguityIndicators.push({
            type: 'AMBIGUOUS_PRONOUN',
            confidence: 0.6,
            message: 'Câu hỏi chứa đại từ mơ hồ và thiếu chủ đề xác định'
        });
    }
    
    // 3. Câu hỏi có quá nhiều chủ đề chéo nhau gây nhiễu
    const topicKeywords = ['học phí', 'lịch học', 'thủ tục', 'giảng viên', 'liên hệ'];
    const matchedTopics = topicKeywords.filter(topic => lower.includes(topic));
    if (matchedTopics.length >= 3) {
        ambiguityIndicators.push({
            type: 'MULTIPLE_TOPICS',
            confidence: 0.7,
            message: `Câu hỏi chứa quá nhiều chủ đề chéo nhau (${matchedTopics.join(', ')})`
        });
    }
    
    // 4. Câu hỏi có Wh-word nhưng hoàn toàn thiếu ngữ cảnh cụ thể
    if (/\b(cái gì|gì|ở đâu|lúc nào|như thế nào|thế nào)\b/i.test(question) && !hasCoreSubject) {
        ambiguityIndicators.push({
            type: 'VAGUE_REFERENCE',
            confidence: 0.5,
            message: 'Câu hỏi có Wh-word nhưng không chứa chủ đề học vụ xác định'
        });
    }
    
    const totalScore = ambiguityIndicators.reduce((sum, a) => sum + a.confidence, 0);
    const ambiguityScore = Math.min(totalScore, 1.0);
    const severity = ambiguityScore >= 0.8 ? 'HIGH' : (ambiguityScore >= 0.5 ? 'MEDIUM' : 'NONE');

    return {
        isAmbiguous: ambiguityIndicators.length > 0,
        ambiguityScore,
        indicators: ambiguityIndicators,
        severity
    };
}

// Tạo các câu hỏi làm rõ
function generateClarifyingQuestions(question, detectedAmbiguities) {
    const clarifyingQuestions = [];
    
    for (const ambiguity of detectedAmbiguities.indicators) {
        switch (ambiguity.type) {
            case 'TOO_SHORT':
                clarifyingQuestions.push({
                    type: 'CONTEXT',
                    text: '📝 Bạn có thể cung cấp thêm chi tiết không? Ví dụ: bạn đang hỏi về vấn đề gì cụ thể?',
                    followUp: 'Để tôi có thể trả lời chính xác hơn'
                });
                break;
                
            case 'AMBIGUOUS_PRONOUN':
                clarifyingQuestions.push({
                    type: 'CLARIFICATION',
                    text: '❓ Bạn đang nhắc đến cái/nó nào? Có thể thay bằng tên cụ thể không?',
                    followUp: 'Ví dụ: "học phí", "thủ tục", "kế hoạch đào tạo"...'
                });
                break;
                
            case 'MULTIPLE_TOPICS':
                clarifyingQuestions.push({
                    type: 'FOCUS',
                    text: '🎯 Bạn muốn hỏi về vấn đề chính là cái nào? Hay bạn muốn hỏi cả hai?',
                    followUp: 'Nếu là cơ bản, tôi sẽ trả lời từng vấn đề một cách rõ ràng'
                });
                break;
                
            case 'VAGUE_REFERENCE':
                clarifyingQuestions.push({
                    type: 'SPECIFICITY',
                    text: '🔍 Bạn có thể cụ thể hóa hơn không? Hay bạn đang hỏi về một trường hợp riêng?',
                    followUp: 'Điều này giúp tôi trả lời chính xác hơn'
                });
                break;
                
            case 'VAGUE_QUANTITY':
                clarifyingQuestions.push({
                    type: 'QUANTITY',
                    text: '📊 Bạn muốn biết con số chính xác hay phạm vi?',
                    followUp: 'Ví dụ: "bao nhiêu đúng?" hay "khoảng bao nhiêu?"'
                });
                break;
                
            case 'PURPOSE_AMBIGUITY':
                clarifyingQuestions.push({
                    type: 'PURPOSE',
                    text: '💡 Bạn hỏi để làm gì? Là để hiểu thêm hay để thực hiện gì?',
                    followUp: 'Mục đích sẽ giúp tôi đưa ra lời khuyên phù hợp'
                });
                break;
        }
    }
    
    return clarifyingQuestions;
}

// Đánh giá liệu câu hỏi có cần làm rõ không
function shouldAskClarification(ambiguityScore, severity) {
    // Kích hoạt khi độ mơ hồ cao (từ 0.8 trở lên) để tránh spam câu hỏi thông thường
    return severity === 'HIGH' || ambiguityScore >= 0.8;
}

// Tạo response làm rõ (gửi cho user)
function createClarificationResponse(question, clarifyingQuestions) {
    if (clarifyingQuestions.length === 0) {
        return null;
    }
    
    let response = `❓ **Tôi cần làm rõ câu hỏi của bạn trước khi trả lời:**\n\n`;
    
    clarifyingQuestions.forEach((cq, index) => {
        response += `${index + 1}. ${cq.text}\n`;
        if (cq.followUp) {
            response += `   _${cq.followUp}_\n\n`;
        }
    });
    
    response += `\n💬 Vui lòng cung cấp thêm thông tin, tôi sẽ trả lời chính xác hơn!`;
    
    return response;
}

// Kiểm tra xem user đã trả lời clarification chưa
function parseUserClarification(userMessage, originalQuestion) {
    // Nếu user gửi tin nhắn mới > 10 từ, coi như họ đã làm rõ
    const wordCount = userMessage.split(/\s+/).length;
    return {
        isClarified: wordCount > 10 || userMessage.length > 50,
        confidence: Math.min(wordCount / 20, 1.0),
        clarifiedQuestion: userMessage // Dùng message mới làm câu hỏi chính
    };
}

module.exports = {
    detectAmbiguity,
    generateClarifyingQuestions,
    shouldAskClarification,
    createClarificationResponse,
    parseUserClarification
};
