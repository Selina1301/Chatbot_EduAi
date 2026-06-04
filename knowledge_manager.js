/**
 * KNOWLEDGE MANAGER - Quản lý Knowledge Base
 * Lưu/tải các Q&A pairs sử dụng cơ chế In-Memory Cache (RAM) được đồng bộ với SQLite
 */

const dbManager = require('./database');
const { findMostSimilarQuestion } = require('./similarity_engine');

// Biến lưu trữ in-memory cache cho tìm kiếm tương đồng siêu nhanh
let memoryKB = null;

// Tải Knowledge Base từ SQLite vào bộ nhớ RAM
function loadKnowledgeBase() {
    if (memoryKB !== null) {
        return memoryKB;
    }
    
    try {
        const rows = dbManager.getAllQA();
        // Ánh xạ các cột SQLite sang format đối tượng JS cũ để đảm bảo khả năng tương thích
        memoryKB = rows.map(row => ({
            id: row.id,
            question: row.question,
            answer: row.answer,
            category: row.category,
            frequency: row.frequency,
            lastUsed: row.last_used,
            createdAt: row.created_at,
            source: row.source
        }));
        console.log(`✅ Đã tải Knowledge Base vào RAM cache từ SQLite: ${memoryKB.length} câu hỏi`);
        return memoryKB;
    } catch (error) {
        console.error('❌ Lỗi khi tải Knowledge Base từ SQLite:', error.message);
        return [];
    }
}

// Lưu Knowledge Base (giữ để tương thích ngược, thực chất việc ghi đã qua SQLite)
function saveKnowledgeBase(knowledgeBaseQA) {
    memoryKB = knowledgeBaseQA;
    return true;
}

// Thêm Q&A mới vào SQLite & đồng bộ RAM cache
function addQA(question, answer, category = 'general', source = 'auto_learned') {
    // 1. Ghi vào SQLite
    const newQA = dbManager.addQA(question, answer, category, source);
    if (!newQA) return null; // Trùng lặp hoặc lỗi
    
    // 2. Chạy LRU clean trong DB
    dbManager.cleanLRU(100);
    
    // 3. Reset RAM cache để tải lại dữ liệu mới nhất
    memoryKB = null;
    loadKnowledgeBase();
    
    return newQA;
}

// Tìm câu trả lời tương tự nhất (dùng similarity search trên RAM cache)
function findSimilarAnswer(userMessage, threshold = 0.6) {
    const knowledgeBaseQA = loadKnowledgeBase();
    const match = findMostSimilarQuestion(userMessage, knowledgeBaseQA, threshold);
    
    if (match) {
        // Cập nhật usage trong SQLite
        updateQAUsage(match.id);
        console.log(`🎯 Tìm thấy câu tương tự: "${match.question.substring(0, 50)}..." (similarity: ${(match.similarity * 100).toFixed(1)}%)`);
    }
    
    return match;
}

// Cập nhật lần sử dụng và tần suất
function updateQAUsage(qaId) {
    // 1. Cập nhật SQLite
    dbManager.updateQAUsage(qaId);
    
    // 2. Cập nhật RAM cache trực tiếp để tránh tải lại toàn bộ DB
    if (memoryKB !== null) {
        const qa = memoryKB.find(q => q.id === qaId);
        if (qa) {
            qa.frequency = (qa.frequency || 0) + 1;
            qa.lastUsed = new Date().toISOString();
        }
    }
}

// Lấy thống kê từ SQLite
function getStats() {
    const qaList = loadKnowledgeBase();
    const categories = {};
    let totalFrequency = 0;

    qaList.forEach(qa => {
        categories[qa.category] = (categories[qa.category] || 0) + 1;
        totalFrequency += qa.frequency || 0;
    });

    return {
        totalQA: qaList.length,
        categories: categories,
        totalUsage: totalFrequency,
        lastUpdated: qaList[qaList.length - 1]?.createdAt || null
    };
}

// Lấy top N câu hỏi được dùng nhiều nhất từ SQLite
function getTopUsedQuestions(limit = 10) {
    const qaList = loadKnowledgeBase();
    return qaList
        .slice()
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        .slice(0, limit)
        .map(qa => ({
            question: qa.question,
            frequency: qa.frequency,
            category: qa.category
        }));
}

module.exports = {
    loadKnowledgeBase,
    saveKnowledgeBase,
    addQA,
    findSimilarAnswer,
    updateQAUsage,
    getStats,
    getTopUsedQuestions
};
