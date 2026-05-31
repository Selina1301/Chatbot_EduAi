/**
 * SIMILARITY ENGINE - Tìm kiếm câu hỏi tương tự
 * Sử dụng Cosine Similarity để so sánh văn bản chuẩn hóa
 * Nếu độ tương đồng > threshold (0.6) → dùng cached answer
 */

// Chuẩn hóa và tokenize văn bản
function normalizeAndTokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Loại bỏ dấu câu
        .split(/\s+/)
        .filter(word => word.length > 2); // Bỏ các từ quá ngắn
}

// Tạo vector tần số từ (TF - Term Frequency)
function createVector(tokens) {
    const vector = {};
    tokens.forEach(token => {
        vector[token] = (vector[token] || 0) + 1;
    });
    return vector;
}

// Tính Cosine Similarity giữa 2 vector
function cosineSimilarity(vec1, vec2) {
    const allKeys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const key of allKeys) {
        const val1 = vec1[key] || 0;
        const val2 = vec2[key] || 0;
        dotProduct += val1 * val2;
        magnitude1 += val1 * val1;
        magnitude2 += val2 * val2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
}

// Tìm câu hỏi tương tự nhất từ knowledge base
function findMostSimilarQuestion(userMessage, knowledgeBaseQA, threshold = 0.6) {
    const userTokens = normalizeAndTokenize(userMessage);
    const userVector = createVector(userTokens);

    let bestMatch = null;
    let bestScore = 0;

    for (const qa of knowledgeBaseQA) {
        const qaTokens = normalizeAndTokenize(qa.question);
        const qaVector = createVector(qaTokens);
        const similarity = cosineSimilarity(userVector, qaVector);

        if (similarity > bestScore) {
            bestScore = similarity;
            bestMatch = { ...qa, similarity: similarity };
        }
    }

    // Nếu độ tương đồng vượt ngưỡng, trả về kết quả
    if (bestScore >= threshold) {
        return bestMatch;
    }

    return null;
}

module.exports = {
    normalizeAndTokenize,
    createVector,
    cosineSimilarity,
    findMostSimilarQuestion
};
