/**
 * SIMILARITY ENGINE - Tìm kiếm câu hỏi tương tự sử dụng TF-IDF & Cosine Similarity
 * Sử dụng trọng số TF-IDF để tăng trọng số các từ khóa quan trọng và giảm các từ phổ biến.
 * Kết quả khớp được duyệt trực tiếp trên tập dữ liệu.
 */

// Chuẩn hóa và tách từ (tokenizer) - Hỗ trợ tiếng Việt tốt hơn (cả có dấu và không dấu)
function removeDiacritics(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function normalizeAndTokenize(text) {
    if (!text) return [];
    const cleanText = text.toLowerCase();
    const noDiacritics = removeDiacritics(cleanText);
    
    // Tách từ đơn có dấu
    const tokensWithAccents = cleanText
        .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
        
    // Tách từ đơn không dấu
    const tokensNoAccents = noDiacritics
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
        
    // Tạo Bigram (từ ghép 2 từ) có dấu
    const bigramsWithAccents = [];
    for (let i = 0; i < tokensWithAccents.length - 1; i++) {
        bigramsWithAccents.push(`${tokensWithAccents[i]}_${tokensWithAccents[i+1]}`);
    }
    
    // Tạo Bigram không dấu
    const bigramsNoAccents = [];
    for (let i = 0; i < tokensNoAccents.length - 1; i++) {
        bigramsNoAccents.push(`${tokensNoAccents[i]}_${tokensNoAccents[i+1]}`);
    }
        
    // Gộp cả từ đơn và từ ghép để đảm bảo truy vấn không dấu vẫn khớp chính xác dữ liệu có dấu
    return Array.from(new Set([
        ...tokensWithAccents, 
        ...tokensNoAccents,
        ...bigramsWithAccents,
        ...bigramsNoAccents
    ]));
}

// Tạo vector tần số từ (TF - Term Frequency)
function createTFVector(tokens) {
    const tf = {};
    tokens.forEach(token => {
        tf[token] = (tf[token] || 0) + 1;
    });
    return tf;
}

// Tính toán Document Frequency (DF) cho toàn bộ từ vựng trong Knowledge Base
function calculateDF(documents) {
    const df = {};
    documents.forEach(doc => {
        const tokens = normalizeAndTokenize(doc.question);
        const uniqueTokens = new Set(tokens);
        uniqueTokens.forEach(token => {
            df[token] = (df[token] || 0) + 1;
        });
    });
    return df;
}

// Tính Cosine Similarity giữa 2 vector TF-IDF
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

// Tìm câu hỏi tương tự nhất từ knowledge base sử dụng TF-IDF
function findMostSimilarQuestion(userMessage, knowledgeBaseQA, threshold = 0.6) {
    if (!knowledgeBaseQA || knowledgeBaseQA.length === 0) return null;

    const userTokens = normalizeAndTokenize(userMessage);
    if (userTokens.length === 0) return null;

    const N = knowledgeBaseQA.length;
    const df = calculateDF(knowledgeBaseQA);

    // Helper tính IDF với công thức smooth
    const getIDF = (word) => {
        const wordDf = df[word] || 0;
        return Math.log(1 + N / (1 + wordDf));
    };

    // Tạo vector TF-IDF cho User Message
    const userTF = createTFVector(userTokens);
    const userVector = {};
    for (const word of Object.keys(userTF)) {
        userVector[word] = userTF[word] * getIDF(word);
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const qa of knowledgeBaseQA) {
        const qaTokens = normalizeAndTokenize(qa.question);
        const qaTF = createTFVector(qaTokens);
        const qaVector = {};
        
        for (const word of Object.keys(qaTF)) {
            // Đối với tài liệu, ta cũng nhân với IDF của từ đó
            qaVector[word] = qaTF[word] * getIDF(word);
        }

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
    createTFVector,
    calculateDF,
    cosineSimilarity,
    findMostSimilarQuestion
};
