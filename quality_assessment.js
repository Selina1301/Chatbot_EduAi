/**
 * QUALITY ASSESSMENT MODULE - Đánh Giá Chất Lượng Q&A
 * Kiểm tra:
 * 1. Tính toàn vẹn của câu trả lời (có bị cắt không?)
 * 2. Mức độ phù hợp (relevance score)
 * 3. Độ chính xác ước tính (confidence score)
 * 4. Độ rõ ràng & chuyên sâu của câu trả lời
 */

// Đánh giá mức độ liên quan giữa câu hỏi và câu trả lời
function assessRelevance(question, answer) {
    const questionTokens = question.toLowerCase().split(/\s+/);
    const answerTokens = answer.toLowerCase().split(/\s+/);
    
    // Đếm số từ chính của câu hỏi xuất hiện trong câu trả lời
    const importantKeywords = questionTokens.filter(w => w.length > 3);
    const matchedKeywords = importantKeywords.filter(kw => 
        answerTokens.some(aw => aw.includes(kw) || kw.includes(aw))
    );
    
    const relevanceScore = importantKeywords.length > 0 
        ? matchedKeywords.length / importantKeywords.length 
        : 0;
    
    return Math.min(relevanceScore, 1.0); // 0-1 scale
}

// Kiểm tra câu trả lời có bị cắt ngắn không
function detectTruncation(answer) {
    const lastChar = answer.trim().slice(-1);
    const isEndingAbruptly = lastChar === '.' && answer.slice(-4) === '...';
    const seemsIncomplete = answer.length > 1000 && (
        !answer.match(/[.!?]\s*$/) || // Không kết thúc bằng câu hoàn chỉnh
        answer.match(/\.\.\.$/) // Kết thúc bằng dấu 3 chấm
    );
    
    return {
        isTruncated: isEndingAbruptly || seemsIncomplete,
        confidence: isEndingAbruptly ? 0.9 : (seemsIncomplete ? 0.6 : 0.0)
    };
}

// Đánh giá độ chi tiết của câu trả lời
function assessDetailLevel(question, answer) {
    const questionLength = question.split(/\s+/).length;
    const answerLength = answer.split(/\s+/).length;
    
    // Điểm ideal: đáp án nên có 5-10x từ so với câu hỏi
    const detailRatio = answerLength / questionLength;
    
    if (detailRatio < 2) {
        return { level: 'brief', score: 0.4, message: 'Câu trả lời quá ngắn' };
    } else if (detailRatio < 5) {
        return { level: 'moderate', score: 0.7, message: 'Câu trả lời vừa phải' };
    } else if (detailRatio < 15) {
        return { level: 'detailed', score: 0.9, message: 'Câu trả lời chi tiết' };
    } else {
        return { level: 'excessive', score: 0.7, message: 'Câu trả lời quá dài' };
    }
}

// Kiểm tra câu trả lời có chứa thông tin thực tế không
function hasConcreteInformation(answer) {
    const hasNumbers = /\d+/.test(answer); // Có số liệu
    const hasNamedEntities = /[A-Z][a-z]+\s+[A-Z][a-z]+|\(.*?\)/.test(answer); // Có tên riêng hoặc chi tiết
    const hasListItems = /[\d\-•]\s+/.test(answer); // Có danh sách
    const hasSteps = /(bước|step|1\)|thứ nhất|đầu tiên)/i.test(answer); // Có hướng dẫn step-by-step
    
    const concreteCount = [hasNumbers, hasNamedEntities, hasListItems, hasSteps].filter(x => x).length;
    
    return {
        isConcreteEnough: concreteCount >= 1,
        concreteElements: concreteCount,
        score: Math.min(concreteCount * 0.25, 1.0)
    };
}

// Đánh giá độ tin cậy tổng thể của câu trả lời
function assessConfidenceScore(question, answer) {
    const relevance = assessRelevance(question, answer);
    const truncation = detectTruncation(answer);
    const detailLevel = assessDetailLevel(question, answer);
    const concrete = hasConcreteInformation(answer);
    
    // Tính điểm tổng hợp
    let confidenceScore = (
        relevance * 0.3 +           // 30% liên quan
        detailLevel.score * 0.2 +   // 20% chi tiết
        concrete.score * 0.25 +     // 25% thông tin cụ thể
        (1 - truncation.confidence) * 0.25  // 25% không bị cắt
    );
    
    // Điều chỉnh nếu bị cắt ngắn
    if (truncation.isTruncated) {
        confidenceScore *= 0.6; // Giảm 40% nếu câu trả lời bị cắt
    }
    
    return {
        score: Math.max(0, Math.min(confidenceScore, 1.0)), // 0-1 scale
        details: {
            relevance: (relevance * 100).toFixed(1) + '%',
            detailLevel: detailLevel.level,
            isTruncated: truncation.isTruncated,
            hasConcreteInfo: concrete.isConcreteEnough
        },
        level: confidenceScore > 0.8 ? 'HIGH' : 
               confidenceScore > 0.6 ? 'MEDIUM' : 'LOW',
        recommendation: getRecommendation(confidenceScore, truncation.isTruncated, detailLevel, concrete)
    };
}

// Đưa ra khuyến nghị dựa trên đánh giá
function getRecommendation(score, isTruncated, detailLevel, concrete) {
    const recommendations = [];
    
    if (isTruncated) {
        recommendations.push('⚠️ Câu trả lời có vẻ bị cắt ngắn - cần yêu cầu Gemini trả lời lại đầy đủ');
    }
    
    if (detailLevel.score < 0.5) {
        recommendations.push('📝 Câu trả lời quá ngắn - yêu cầu Gemini cung cấp thêm chi tiết');
    }
    
    if (!concrete.isConcreteEnough) {
        recommendations.push('🎯 Câu trả lời quá chung chung - yêu cầu Gemini thêm ví dụ cụ thể');
    }
    
    if (score < 0.6) {
        recommendations.push('🔄 Chất lượng thấp - nên yêu cầu Gemini cải thiện hoặc trả lời lại');
    }
    
    return recommendations.length > 0 
        ? recommendations 
        : ['✅ Câu trả lời có chất lượng tốt'];
}

// Tổng hợp đánh giá (dùng cho logging & display)
function generateQualityReport(question, answer) {
    const assessment = assessConfidenceScore(question, answer);
    
    return {
        confidence: assessment.score,
        level: assessment.level,
        details: assessment.details,
        recommendations: assessment.recommendation,
        summary: `🎯 Chất lượng: ${assessment.level} (${(assessment.score * 100).toFixed(1)}%)`
    };
}

module.exports = {
    assessRelevance,
    detectTruncation,
    assessDetailLevel,
    hasConcreteInformation,
    assessConfidenceScore,
    generateQualityReport
};
