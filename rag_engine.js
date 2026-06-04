/**
 * RAG ENGINE - Bộ máy Tìm kiếm Tài liệu tham khảo cục bộ
 * Cắt nhỏ tài liệu từ folder 'data/' và tìm kiếm đoạn văn bản (chunks) tương đồng nhất 
 * để tối ưu hóa kích thước prompt truyền vào LLM (RAG).
 */

const fs = require('fs');
const path = require('path');
const { normalizeAndTokenize, createTFVector, cosineSimilarity } = require('./similarity_engine');

const DATA_DIR = path.join(__dirname, 'data');
let chunksCache = [];
let idfCache = {};
let defaultIDF = 0;

// Khởi tạo RAG và lập chỉ mục các chunks
function initRAG() {
    console.log('🔍 Khởi tạo RAG Engine - Đang cắt nhỏ tài liệu...');
    if (!fs.existsSync(DATA_DIR)) {
        console.warn(`⚠️ Folder data không tồn tại tại: ${DATA_DIR}`);
        return;
    }

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt'));
    const allChunks = [];
    let chunkId = 1;

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const fileLabel = file.replace(/_/g, ' ').replace('.txt', '').toUpperCase();
        
        // Chia tài liệu theo 2 ký tự xuống dòng liên tiếp (paragraphs)
        const rawParagraphs = content.split(/\r?\n\s*\r?\n/);
        
        for (const para of rawParagraphs) {
            const trimmed = para.trim();
            // Bỏ qua các dòng trống hoặc quá ngắn (dưới 40 ký tự) không chứa đủ thông tin
            if (trimmed.length < 40) continue;
            
            allChunks.push({
                id: chunkId++,
                source: fileLabel,
                content: trimmed,
                tokens: normalizeAndTokenize(trimmed)
            });
        }
    }
    
    // 1. Tính toán Document Frequency (DF) một lần duy nhất lúc khởi động
    const df = {};
    allChunks.forEach(chunk => {
        const uniqueTokens = new Set(chunk.tokens);
        uniqueTokens.forEach(token => {
            df[token] = (df[token] || 0) + 1;
        });
    });

    // 2. Tính toán và cache IDF cho toàn bộ từ vựng trong RAM
    const N = allChunks.length;
    const idf = {};
    for (const [token, wordDf] of Object.entries(df)) {
        idf[token] = Math.log(1 + N / (1 + wordDf));
    }

    chunksCache = allChunks;
    idfCache = idf;
    defaultIDF = Math.log(1 + N / 1); // default IDF cho từ mới không có trong tài liệu
    
    console.log(`✅ RAG Engine: Đã lập chỉ mục ${chunksCache.length} đoạn tài liệu từ ${files.length} file.`);
}

/**
 * Truy vấn các đoạn văn bản (chunks) liên quan nhất dựa trên Cosine Similarity & TF-IDF (sử dụng IDF cache)
 */
function retrieveRelevantChunks(userMessage, limit = 3, threshold = 0.05) {
    if (chunksCache.length === 0) {
        initRAG();
    }
    
    const userTokens = normalizeAndTokenize(userMessage);
    if (userTokens.length === 0) return [];
    
    const N = chunksCache.length;
    if (N === 0) return [];

    // Helper lấy IDF nhanh từ RAM cache
    const getIDF = (word) => {
        return idfCache[word] || defaultIDF;
    };
    
    // Tạo vector TF-IDF cho User Message
    const userTF = createTFVector(userTokens);
    const userVector = {};
    for (const word of Object.keys(userTF)) {
        userVector[word] = userTF[word] * getIDF(word);
    }
    
    // Tính toán độ tương đồng với tất cả các chunks
    const scoredChunks = chunksCache.map(chunk => {
        const chunkTF = createTFVector(chunk.tokens);
        const chunkVector = {};
        for (const word of Object.keys(chunkTF)) {
            chunkVector[word] = chunkTF[word] * getIDF(word);
        }
        
        const score = cosineSimilarity(userVector, chunkVector);
        return { 
            source: chunk.source,
            content: chunk.content,
            score 
        };
    });
    
    // Lọc theo ngưỡng và sắp xếp lấy các chunk hàng đầu
    return scoredChunks
        .filter(chunk => chunk.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

module.exports = {
    initRAG,
    retrieveRelevantChunks
};
