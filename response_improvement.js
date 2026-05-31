/**
 * RESPONSE IMPROVEMENT MODULE - Cải Thiện Câu Trả Lời
 * Khi câu trả lời chất lượng thấp, tự động yêu cầu Gemini cải thiện
 */

// Tạo system prompt để cải thiện câu trả lời
function createImprovementPrompt(originalQuestion, poorAnswer, issues) {
    let prompt = `Câu trả lời trước của bạn không đủ tốt. Vui lòng cải thiện nó:\n\n`;
    
    prompt += `**Câu hỏi gốc:** ${originalQuestion}\n\n`;
    prompt += `**Câu trả lời cũ:** ${poorAnswer}\n\n`;
    
    prompt += `**Vấn đề cần sửa:**\n`;
    issues.forEach((issue, index) => {
        prompt += `${index + 1}. ${issue}\n`;
    });
    
    prompt += `\n**Yêu cầu cải thiện:**\n`;
    prompt += `✅ Trả lời đầy đủ, không bị cắt ngắn\n`;
    prompt += `✅ Cung cấp thông tin cụ thể (con số, ví dụ, danh sách,...)\n`;
    prompt += `✅ Giải thích rõ ràng từng bước\n`;
    prompt += `✅ Đảm bảo câu trả lời trực tiếp trả lời câu hỏi\n`;
    prompt += `✅ Thêm ví dụ hoặc hướng dẫn thực tế nếu cần\n\n`;
    
    prompt += `Vui lòng trả lời lại một cách chi tiết và hoàn chỉnh hơn.`;
    
    return prompt;
}

// Tạo system prompt để thêm ví dụ cụ thể
function createExampleEnhancementPrompt(originalQuestion, answer) {
    return `Câu trả lời của bạn quá chung chung. Vui lòng thêm các ví dụ cụ thể.\n\n` +
           `**Câu hỏi:** ${originalQuestion}\n\n` +
           `**Câu trả lời hiện tại:** ${answer}\n\n` +
           `**Yêu cầu:**\n` +
           `- Thêm các ví dụ cụ thể từ trường UNETI\n` +
           `- Liệt kê theo dạng danh sách\n` +
           `- Nêu rõ con số, thời gian, quy trình\n` +
           `- Giúp reader dễ hiểu và áp dụng\n\n` +
           `Vui lòng viết lại với các ví dụ cụ thể.`;
}

// Tạo system prompt để viết ngắn gọn hơn
function createCondensationPrompt(originalQuestion, verboseAnswer) {
    return `Câu trả lời của bạn quá dài và lặp lại. Vui lòng viết ngắn gọn hơn.\n\n` +
           `**Câu hỏi:** ${originalQuestion}\n\n` +
           `**Câu trả lời hiện tại (${verboseAnswer.length} ký tự):**\n${verboseAnswer}\n\n` +
           `**Yêu cầu:**\n` +
           `- Giữ thông tin quan trọng\n` +
           `- Loại bỏ phần lặp lại\n` +
           `- Viết ngắn gọn, súc tích\n` +
           `- Vẫn đầy đủ và rõ ràng\n\n` +
           `Vui lòng viết lại phiên bản ngắn gọn hơn.`;
}

// Chọn strategy cải thiện phù hợp
function selectImprovementStrategy(qualityAssessment) {
    const strategies = [];
    const recs = qualityAssessment.recommendation || [];
    
    // Nếu bị cắt, yêu cầu trả lời đầy đủ
    if (qualityAssessment.details.isTruncated) {
        strategies.push({
            type: 'COMPLETE',
            priority: 1,
            message: '⚠️ Câu trả lời bị cắt ngắn - yêu cầu Gemini trả lời đầy đủ'
        });
    }
    
    // Nếu quá ngắn, yêu cầu thêm chi tiết
    if (qualityAssessment.details.detailLevel === 'brief') {
        strategies.push({
            type: 'ELABORATE',
            priority: 2,
            message: '📝 Câu trả lời quá ngắn - yêu cầu Gemini thêm chi tiết'
        });
    }
    
    // Nếu không có thông tin cụ thể, thêm ví dụ
    if (!qualityAssessment.details.hasConcreteInfo) {
        strategies.push({
            type: 'EXEMPLIFY',
            priority: 2,
            message: '🎯 Câu trả lời quá chung chung - yêu cầu Gemini thêm ví dụ'
        });
    }
    
    // Nếu quá dài, viết ngắn gọn
    if (qualityAssessment.details.detailLevel === 'excessive') {
        strategies.push({
            type: 'CONDENSE',
            priority: 3,
            message: '🗜️ Câu trả lời quá dài - yêu cầu Gemini viết ngắn gọn'
        });
    }
    
    // Sắp xếp theo độ ưu tiên
    return strategies.sort((a, b) => a.priority - b.priority);
}

// Tạo prompt improve dựa trên strategy
function generateImprovementPrompt(strategy, originalQuestion, currentAnswer) {
    switch (strategy.type) {
        case 'COMPLETE':
            return createImprovementPrompt(originalQuestion, currentAnswer, [
                'Câu trả lời bị cắt ngắn hoặc không hoàn chỉnh',
                'Cần trả lời đầy đủ từ đầu đến cuối'
            ]);
            
        case 'ELABORATE':
            return createImprovementPrompt(originalQuestion, currentAnswer, [
                'Câu trả lời quá ngắn, thiếu chi tiết',
                'Cần giải thích chi tiết hơn',
                'Cần thêm bối cảnh và thông tin bổ sung'
            ]);
            
        case 'EXEMPLIFY':
            return createExampleEnhancementPrompt(originalQuestion, currentAnswer);
            
        case 'CONDENSE':
            return createCondensationPrompt(originalQuestion, currentAnswer);
            
        default:
            return null;
    }
}

// Kiểm tra xem có nên retry không
function shouldRetryImprovement(attemptCount, qualityScore) {
    // Retry tối đa 2 lần, nếu score vẫn < 0.5 thì dừng
    return attemptCount < 2 && qualityScore < 0.5;
}

module.exports = {
    createImprovementPrompt,
    createExampleEnhancementPrompt,
    createCondensationPrompt,
    selectImprovementStrategy,
    generateImprovementPrompt,
    shouldRetryImprovement
};
