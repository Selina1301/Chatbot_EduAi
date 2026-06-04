/**
 * DATABASE MANAGER - Quản lý cơ sở dữ liệu SQLite
 * Sử dụng better-sqlite3 để lưu trữ Q&A và lịch sử hội thoại ổn định và đồng bộ
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const STORAGE_DIR = path.join(__dirname, 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'chatbot.db');

// Đảm bảo thư mục storage tồn tại
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Khởi tạo kết nối CSDL
const db = new Database(DB_FILE, { verbose: console.log });

// Cấu hình WAL mode để ghi đồng thời nhanh và an toàn hơn
db.pragma('journal_mode = WAL');

// Khởi tạo schema cơ sở dữ liệu
function initDatabase() {
    console.log('🔌 Đang khởi tạo cơ sở dữ liệu SQLite...');

    // 1. Tạo bảng knowledge_base
    db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT UNIQUE NOT NULL,
            answer TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            frequency INTEGER DEFAULT 0,
            last_used TEXT,
            created_at TEXT NOT NULL,
            source TEXT DEFAULT 'auto_learned'
        )
    `);

    // 2. Tạo bảng chat_messages (lịch sử hội thoại)
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL, -- 'user' hoặc 'assistant'
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )
    `);

    // 3. Tạo index cho hiệu suất truy vấn
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
    `);

    // 4. Seed dữ liệu mặc định (4 câu hỏi chính) nếu bảng rỗng
    const count = db.prepare('SELECT COUNT(*) as total FROM knowledge_base').get().total;
    if (count === 0) {
        console.log('🌱 Bảng knowledge_base rỗng. Đang nạp dữ liệu huấn luyện mặc định...');
        
        const DEFAULT_QA = [
            {
                question: "Học phí năm học 2025-2026 là bao nhiêu? Cách nộp học phí như thế nào?",
                answer: "Mức học phí năm học 2025-2026 được công bố trên trang chính thức của trường UNETI. Sinh viên có thể nộp học phí qua các hình thức: chuyển khoản, nộp trực tiếp tại phòng Tài chính hoặc qua hệ thống thanh toán online. Để biết chi tiết mức học phí cụ thể, vui lòng kiểm tra thông báo học phí từ nhà trường.",
                category: "học phí",
                source: "initial_training"
            },
            {
                question: "Kế hoạch đào tạo và lịch đăng ký học phần kỳ II năm 2025-2026 như thế nào?",
                answer: "Kế hoạch đào tạo chi tiết, lịch đăng ký học phần và các thông tin về môn học được công bố bởi Phòng Đào tạo. Sinh viên cần đăng ký học phần trong thời gian quy định trên hệ thống quản lý học vụ của trường. Vui lòng theo dõi thông báo từ Phòng Đào tạo hoặc liên hệ trực tiếp để cập nhật lịch học mới nhất.",
                category: "đào tạo",
                source: "initial_training"
            },
            {
                question: "Hướng dẫn thủ tục xin giấy tờ (xác nhận sinh viên, miễn giảm học phí, bảo lưu)?",
                answer: "Trường UNETI cung cấp nhiều loại giấy tờ cho sinh viên như: xác nhận sinh viên đang học, miễn giảm học phí, bảo lưu, chuyên cần. Để xin giấy tờ, sinh viên cần: 1) Điền đơn theo mẫu; 2) Nộp lệ phí (nếu có); 3) Chờ thời gian xử lý (thường 3-5 ngày làm việc). Chi tiết thủ tục xin giấy tờ cụ thể vui lòng liên hệ Phòng Công tác Sinh viên hoặc Phòng Đào tạo.",
                category: "thủ tục",
                source: "initial_training"
            },
            {
                question: "Liên hệ các phòng ban của trường UNETI? Địa chỉ, email, số điện thoại?",
                answer: "Trường UNETI có các phòng ban chính như: Phòng Đào tạo (học vụ), Phòng Tài chính (học phí), Phòng Công tác Sinh viên, Phòng Hành chính Nhân sự. Các phòng ban đều có địa chỉ, email và số điện thoại liên lạc được công bố trên trang web chính thức uneti.edu.vn. Vui lòng truy cập website hoặc liên hệ số điện thoại tổng đài để được kết nối với phòng ban phù hợp.",
                category: "liên hệ",
                source: "initial_training"
            }
        ];

        const insert = db.prepare(`
            INSERT INTO knowledge_base (question, answer, category, created_at, source)
            VALUES (@question, @answer, @category, @created_at, @source)
        `);

        // Dùng transaction để ghi dữ liệu nhanh và an toàn
        const insertMany = db.transaction((qas) => {
            const now = new Date().toISOString();
            for (const qa of qas) {
                insert.run({
                    question: qa.question,
                    answer: qa.answer,
                    category: qa.category,
                    created_at: now,
                    source: qa.source
                });
            }
        });

        insertMany(DEFAULT_QA);
        console.log('✅ Đã nạp thành công 4 câu hỏi mặc định!');
    }
}

// Gọi hàm khởi tạo khi require module
initDatabase();

// ===================================================
// CÁC HÀM TRUY VẤN & XỬ LÝ DỮ LIỆU
// ===================================================

/**
 * Lấy toàn bộ danh sách Q&A trong CSDL
 */
function getAllQA() {
    return db.prepare('SELECT * FROM knowledge_base').all();
}

/**
 * Thêm một Q&A mới (hoặc bỏ qua nếu đã tồn tại câu hỏi)
 */
function addQA(question, answer, category = 'general', source = 'auto_learned') {
    const now = new Date().toISOString();
    try {
        const stmt = db.prepare(`
            INSERT INTO knowledge_base (question, answer, category, created_at, source)
            VALUES (?, ?, ?, ?, ?)
        `);
        const info = stmt.run(question.trim(), answer.trim(), category, now, source);
        
        return {
            id: info.lastInsertRowid,
            question,
            answer,
            category,
            createdAt: now,
            source
        };
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            console.log(`⏭️ Câu hỏi đã tồn tại trong DB, không thêm trùng: "${question.substring(0, 30)}..."`);
            return null;
        }
        throw err;
    }
}

/**
 * Cập nhật tần suất và ngày sử dụng câu hỏi tương tự
 */
function updateQAUsage(id) {
    const now = new Date().toISOString();
    db.prepare(`
        UPDATE knowledge_base
        SET frequency = frequency + 1, last_used = ?
        WHERE id = ?
    `).run(now, id);
}

/**
 * Lấy lịch sử chat của một Session (lấy tối đa 20 tin nhắn gần nhất)
 */
function getSessionMessages(sessionId, limit = 20) {
    return db.prepare(`
        SELECT role, content FROM (
            SELECT role, content, id FROM chat_messages
            WHERE session_id = ?
            ORDER BY id DESC
            LIMIT ?
        )
        ORDER BY id ASC
    `).all(sessionId, limit);
}

/**
 * Thêm tin nhắn mới vào lịch sử chat
 */
function addSessionMessage(sessionId, role, content) {
    db.prepare(`
        INSERT INTO chat_messages (session_id, role, content)
        VALUES (?, ?, ?)
    `).run(sessionId, role, content);
}

/**
 * Xóa lịch sử chat của một Session
 */
function clearSession(sessionId) {
    db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
}

/**
 * Thực thi dọn dẹp LRU Cache (giữ tối đa 100 câu hỏi tự học)
 */
function cleanLRU(maxAutoLearned = 100) {
    // Tìm các câu hỏi tự học
    const autoLearned = db.prepare(`
        SELECT id FROM knowledge_base
        WHERE source != 'initial_training'
        ORDER BY frequency ASC, last_used ASC
    `).all();

    if (autoLearned.length > maxAutoLearned) {
        const excessCount = autoLearned.length - maxAutoLearned;
        const toDeleteIds = autoLearned.slice(0, excessCount).map(row => row.id);
        
        const deleteStmt = db.prepare('DELETE FROM knowledge_base WHERE id = ?');
        const deleteTx = db.transaction((ids) => {
            for (const id of ids) {
                deleteStmt.run(id);
            }
        });
        
        deleteTx(toDeleteIds);
        console.log(`🧹 SQLite cleanLRU: Đã xóa ${excessCount} câu tự học ít sử dụng nhất.`);
        return excessCount;
    }
    return 0;
}

module.exports = {
    db,
    getAllQA,
    addQA,
    updateQAUsage,
    getSessionMessages,
    addSessionMessage,
    clearSession,
    cleanLRU
};
