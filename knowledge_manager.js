/**
 * KNOWLEDGE MANAGER - Quản lý Knowledge Base
 * Lưu/tải các Q&A pairs từ JSON file
 * Cung cấp các method để thêm, tìm, cập nhật QA
 */

const fs = require('fs');
const path = require('path');
const { findMostSimilarQuestion } = require('./similarity_engine');

// Đường dẫn file lưu Knowledge Base
const KNOWLEDGE_BASE_FILE = path.join(__dirname, 'storage', 'knowledge_base.json');
const STORAGE_DIR = path.join(__dirname, 'storage');

// Tạo folder storage nếu chưa tồn tại
function ensureStorageDir() {
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
        console.log('📂 Tạo folder storage');
    }
}

// Khởi tạo Knowledge Base với 4 câu hỏi chính
const DEFAULT_QA = [
    {
        id: 1,
        question: "Học phí năm học 2025-2026 là bao nhiêu? Cách nộp học phí như thế nào?",
        answer: "Mức học phí năm học 2025-2026 được công bố trên trang chính thức của trường UNETI. Sinh viên có thể nộp học phí qua các hình thức: chuyển khoản, nộp trực tiếp tại phòng Tài chính hoặc qua hệ thống thanh toán online. Để biết chi tiết mức học phí cụ thể, vui lòng kiểm tra thông báo học phí từ nhà trường.",
        category: "học phí",
        frequency: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
        source: "initial_training"
    },
    {
        id: 2,
        question: "Kế hoạch đào tạo và lịch đăng ký học phần kỳ II năm 2025-2026 như thế nào?",
        answer: "Kế hoạch đào tạo chi tiết, lịch đăng ký học phần và các thông tin về môn học được công bố bởi Phòng Đào tạo. Sinh viên cần đăng ký học phần trong thời gian quy định trên hệ thống quản lý học vụ của trường. Vui lòng theo dõi thông báo từ Phòng Đào tạo hoặc liên hệ trực tiếp để cập nhật lịch học mới nhất.",
        category: "đào tạo",
        frequency: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
        source: "initial_training"
    },
    {
        id: 3,
        question: "Hướng dẫn thủ tục xin giấy tờ (xác nhận sinh viên, miễn giảm học phí, bảo lưu)?",
        answer: "Trường UNETI cung cấp nhiều loại giấy tờ cho sinh viên như: xác nhận sinh viên đang học, miễn giảm học phí, bảo lưu, chuyên cần. Để xin giấy tờ, sinh viên cần: 1) Điền đơn theo mẫu; 2) Nộp lệ phí (nếu có); 3) Chờ thời gian xử lý (thường 3-5 ngày làm việc). Chi tiết thủ tục xin giấy tờ cụ thể vui lòng liên hệ Phòng Công tác Sinh viên hoặc Phòng Đào tạo.",
        category: "thủ tục",
        frequency: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
        source: "initial_training"
    },
    {
        id: 4,
        question: "Liên hệ các phòng ban của trường UNETI? Địa chỉ, email, số điện thoại?",
        answer: "Trường UNETI có các phòng ban chính như: Phòng Đào tạo (học vụ), Phòng Tài chính (học phí), Phòng Công tác Sinh viên, Phòng Hành chính Nhân sự. Các phòng ban đều có địa chỉ, email và số điện thoại liên lạc được công bố trên trang web chính thức uneti.edu.vn. Vui lòng truy cập website hoặc liên hệ số điện thoại tổng đài để được kết nối với phòng ban phù hợp.",
        category: "liên hệ",
        frequency: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
        source: "initial_training"
    }
];

// Tải Knowledge Base từ file (hoặc khởi tạo nếu chưa tồn tại)
function loadKnowledgeBase() {
    ensureStorageDir();
    
    try {
        if (fs.existsSync(KNOWLEDGE_BASE_FILE)) {
            const data = fs.readFileSync(KNOWLEDGE_BASE_FILE, 'utf-8');
            const kb = JSON.parse(data);
            console.log(`✅ Đã tải Knowledge Base: ${kb.length} câu hỏi`);
            return kb;
        } else {
            // Khởi tạo với 4 câu hỏi mặc định
            saveKnowledgeBase(DEFAULT_QA);
            console.log(`✅ Đã khởi tạo Knowledge Base với 4 câu hỏi chính`);
            return DEFAULT_QA;
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải Knowledge Base:', error.message);
        return DEFAULT_QA;
    }
}

// Lưu Knowledge Base vào file
function saveKnowledgeBase(knowledgeBaseQA) {
    try {
        ensureStorageDir();
        fs.writeFileSync(KNOWLEDGE_BASE_FILE, JSON.stringify(knowledgeBaseQA, null, 2), 'utf-8');
        console.log(`💾 Đã lưu Knowledge Base (${knowledgeBaseQA.length} câu hỏi)`);
        return true;
    } catch (error) {
        console.error('❌ Lỗi khi lưu Knowledge Base:', error.message);
        return false;
    }
}

// Thêm Q&A mới vào Knowledge Base (auto-learning)
function addQA(question, answer, category = 'general', source = 'auto_learned') {
    let knowledgeBaseQA = loadKnowledgeBase();
    
    const newId = Math.max(...knowledgeBaseQA.map(qa => qa.id || 0), 0) + 1;
    
    const newQA = {
        id: newId,
        question: question.trim(),
        answer: answer.trim(),
        category: category,
        frequency: 1,
        lastUsed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: source
    };
    
    knowledgeBaseQA.push(newQA);
    saveKnowledgeBase(knowledgeBaseQA);
    console.log(`📚 Đã thêm Q&A mới (ID: ${newId}) từ ${source}`);
    return newQA;
}

// Tìm câu trả lời tương tự nhất (dùng similarity search)
function findSimilarAnswer(userMessage, threshold = 0.6) {
    const knowledgeBaseQA = loadKnowledgeBase();
    const match = findMostSimilarQuestion(userMessage, knowledgeBaseQA, threshold);
    
    if (match) {
        // Cập nhật frequency và lastUsed
        updateQAUsage(match.id);
        console.log(`🎯 Tìm thấy câu tương tự: "${match.question.substring(0, 50)}..." (similarity: ${(match.similarity * 100).toFixed(1)}%)`);
    }
    
    return match;
}

// Cập nhật lần sử dụng và tần suất
function updateQAUsage(qaId) {
    let knowledgeBaseQA = loadKnowledgeBase();
    const qa = knowledgeBaseQA.find(q => q.id === qaId);
    
    if (qa) {
        qa.frequency = (qa.frequency || 0) + 1;
        qa.lastUsed = new Date().toISOString();
        saveKnowledgeBase(knowledgeBaseQA);
    }
}

// Lấy thống kê Knowledge Base
function getStats() {
    const knowledgeBaseQA = loadKnowledgeBase();
    const categories = {};
    let totalFrequency = 0;

    knowledgeBaseQA.forEach(qa => {
        categories[qa.category] = (categories[qa.category] || 0) + 1;
        totalFrequency += qa.frequency || 0;
    });

    return {
        totalQA: knowledgeBaseQA.length,
        categories: categories,
        totalUsage: totalFrequency,
        lastUpdated: knowledgeBaseQA[knowledgeBaseQA.length - 1]?.createdAt || null
    };
}

// Lấy top N câu hỏi được dùng nhiều nhất
function getTopUsedQuestions(limit = 10) {
    const knowledgeBaseQA = loadKnowledgeBase();
    return knowledgeBaseQA
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
    getTopUsedQuestions,
    KNOWLEDGE_BASE_FILE
};
