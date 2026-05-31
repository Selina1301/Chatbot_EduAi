/**
 * CLARIFICATION ENGINE - Phát Hiện Câu Hỏi Mơ Hồ
 * Đặt ra các câu hỏi làm rõ (clarifying questions) khi user hỏi không rõ ràng
 * VD: "Bạn đang hỏi về vấn đề X phải không?" để tránh trả lời sai lạc
 */

// Phát hiện câu hỏi mơ hồ
function detectAmbiguity(question) {
    const ambiguityIndicators = [];
    
    // 1. Câu hỏi quá ngắn (< 3 từ)
    const wordCount = question.split(/\s+/).length;
    if (wordCount < 3) {
        ambiguityIndicators.push({
            type: 'TOO_SHORT',
            confidence: 0.5,
            message: 'Câu hỏi quá ngắn, có thể thiếu bối cảnh'
        });
    }
    
    // 2. Có các đại từ mơ hồ (cái này, cái kia, nó, chúng nó, ...)
    if (/\b(cái này|cái kia|nó|chúng nó|nó là|cái gì|gì|cái)\b/i.test(question)) {
        ambiguityIndicators.push({
            type: 'AMBIGUOUS_PRONOUN',
            confidence: 0.5,
            message: 'Câu hỏi chứa đại từ mơ hồ'
        });
    }
    
    // 3. Câu hỏi có nhiều chủ đề (AND, hoặc, hay)
    const multiTopicMatches = question.match(/\s+(và|hoặc|hay|cũng như)\s+/g) || [];
    if (multiTopicMatches.length > 1) {
        ambiguityIndicators.push({
            type: 'MULTIPLE_TOPICS',
            confidence: 0.6,
            message: `Câu hỏi có ${multiTopicMatches.length + 1} chủ đề khác nhau`
        });
    }
    
    // 4. Câu hỏi chứa các từ không xác định (cái gì, ai, where, when)
    if (/\b(ai|cái gì|gì|đâu|khi nào|lúc nào|sao|tại sao|như thế nào|thế nào)\b/i.test(question)) {
        // Đây không phải mơ hồ nếu đó là câu hỏi Wh-word chính
        if (!/^\s*(ai|gì|đâu|khi nào|lúc nào|sao|tại sao|như thế nào|thế nào)/i.test(question)) {
            ambiguityIndicators.push({
                type: 'VAGUE_REFERENCE',
                confidence: 0.6,
                message: 'Câu hỏi có tham chiếu không rõ ràng'
            });
        }
    }
    
    // 5. Câu hỏi chứa từ chỉ mức độ không xác định (khoảng, gần, chừng, tầm, ...)
    if (/\b(khoảng|gần|chừng|tầm|xấp xỉ|khoảng chừng|mấy|bao nhiêu|đến)\b/i.test(question)) {
        // Nếu đó là số lượng, thì không phải mơ hồ
        if (!/\bđến\s+\d+|khoảng\s+\d+|tầm\s+\d+/i.test(question)) {
            ambiguityIndicators.push({
                type: 'VAGUE_QUANTITY',
                confidence: 0.5,
                message: 'Câu hỏi sử dụng chỉ số không chính xác'
            });
        }
    }
    
    // 6. Câu hỏi có từ "để" (có thể là nguyên nhân hoặc mục đích)
    if (/\bđể\b/i.test(question) && question.length > 30) {
        ambiguityIndicators.push({
            type: 'PURPOSE_AMBIGUITY',
            confidence: 0.5,
            message: 'Câu hỏi có thể có nhiều mục đích khác nhau'
        });
    }
    
    return {
        isAmbiguous: ambiguityIndicators.length > 0,
        ambiguityScore: Math.min(ambiguityIndicators.reduce((sum, a) => sum + a.confidence, 0) / Math.max(ambiguityIndicators.length, 1), 1.0),
        indicators: ambiguityIndicators,
        severity: ambiguityIndicators.length > 0 
            ? (ambiguityIndicators.reduce((sum, a) => sum + a.confidence, 0) / ambiguityIndicators.length > 0.7 ? 'HIGH' : 'MEDIUM')
            : 'NONE'
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
    // Nếu ambiguity score > 0.8, mới nên hỏi để tránh spam
    return ambiguityScore > 0.8;
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
