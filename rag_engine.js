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

// Load department structure to map lecturers to departments
let khoaStructure = [];
const structurePath = path.join(__dirname, 'assets', 'inF Giảng Viên', 'khoa_structure.json');
if (fs.existsSync(structurePath)) {
    try {
        khoaStructure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
        console.log(`📂 RAG Engine: Đã tải sơ đồ cấu trúc khoa từ khoa_structure.json (${khoaStructure.length} khoa)`);
    } catch (e) {
        console.error('Lỗi đọc file khoa_structure.json:', e.message);
    }
}

function getDepartmentByMajor(majorName) {
    if (!majorName) return '';
    const cleanMajor = majorName.replace(/^Ngành\s+/i, '').trim().toLowerCase();
    
    // 1. Try to find in structure mapping
    for (const dept of khoaStructure) {
        for (const major of dept.majors) {
            const cleanDeptMajor = major.replace(/^Ngành\s+/i, '').trim().toLowerCase();
            if (cleanMajor === cleanDeptMajor || cleanMajor.includes(cleanDeptMajor) || cleanDeptMajor.includes(cleanMajor)) {
                return dept.name;
            }
        }
    }
    
    // 2. Fallbacks
    if (cleanMajor.includes('kế toán') || cleanMajor.includes('kiểm toán')) return 'Khoa Kế toán Kiểm toán';
    if (cleanMajor.includes('quản trị') || cleanMajor.includes('marketing')) return 'Khoa Quản trị & Marketing';
    if (cleanMajor.includes('tài chính') || cleanMajor.includes('ngân hàng') || cleanMajor.includes('bảo hiểm')) return 'Khoa Tài chính - Ngân hàng và Bảo hiểm';
    if (cleanMajor.includes('thương mại') || cleanMajor.includes('logistics') || cleanMajor.includes('logistic')) return 'Khoa Thương mại';
    if (cleanMajor.includes('cơ khí') || cleanMajor.includes('ô tô') || cleanMajor.includes('cơ điện tử')) return 'Khoa Cơ khí';
    if (cleanMajor.includes('điện tử') || cleanMajor.includes('viễn thông') || cleanMajor.includes('kỹ thuật mt') || cleanMajor.includes('máy tính')) {
        if (cleanMajor.includes('mạng máy tính')) return 'Khoa Công nghệ thông tin';
        return 'Khoa Điện tử và Kỹ thuật máy tính';
    }
    if (cleanMajor.includes('điện') || cleanMajor.includes('tự động')) return 'Khoa Điện - Tự động hóa';
    if (cleanMajor.includes('dệt') || cleanMajor.includes('may') || cleanMajor.includes('sợi')) return 'Khoa Dệt may và Thời trang';
    if (cleanMajor.includes('thực phẩm')) return 'Khoa Công nghệ thực phẩm';
    if (cleanMajor.includes('thông tin') || cleanMajor.includes('dữ liệu')) return 'Khoa Công nghệ thông tin';
    if (cleanMajor.includes('du lịch') || cleanMajor.includes('lữ hành') || cleanMajor.includes('khách sạn')) return 'Khoa Du lịch và Khách sạn';
    if (cleanMajor.includes('ngoại ngữ') || cleanMajor.includes('tiếng anh') || cleanMajor.includes('ngôn ngữ anh')) return 'Khoa Ngoại ngữ';
    
    return '';
}

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
        let content = fs.readFileSync(filePath, 'utf-8');
        const fileLabel = file.replace(/_/g, ' ').replace('.txt', '').toUpperCase();
        
        if (file === 'giang_vien_info.txt') {
            // Xử lý riêng cho file danh sách giảng viên để tránh lỗi chia nhỏ dòng ngắn bị bỏ sót
            content = content.replace(/\f/g, ''); // Loại bỏ các ký tự phân trang Form Feed
            const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            
            let i = 0;
            // 1. Duyệt qua Phần A (thông tin chung)
            while (i < lines.length && !lines[i].includes('B. Công khai thông tin')) {
                if (lines[i].length >= 40) {
                    allChunks.push({
                        id: chunkId++,
                        source: fileLabel,
                        content: lines[i],
                        tokens: normalizeAndTokenize(lines[i])
                    });
                }
                i++;
            }
            
            // 2. Duyệt qua Phần B (danh sách giảng viên chi tiết)
            while (i < lines.length) {
                const line = lines[i];
                if (line.includes('=>')) {
                    const parts = line.split('=>').map(p => p.trim());
                    if (parts.length >= 6) {
                        const name = parts[1];
                        const birthYear = parts[2];
                        const gender = parts[3];
                        const title = parts[4];
                        const degree = parts[5];
                        const subject = parts[6] || parts[0];
                        
                        const deptName = getDepartmentByMajor(subject);
                        const deptInfo = deptName ? ` thuộc ${deptName}` : '';
                        const lecturerText = `Giảng viên ${name}${deptInfo}, sinh năm ${birthYear}, giới tính ${gender}, chức danh ${title}, trình độ đào tạo ${degree}, chuyên ngành giảng dạy ${subject}.`;
                        allChunks.push({
                            id: chunkId++,
                            source: fileLabel,
                            content: lecturerText,
                            tokens: normalizeAndTokenize(lecturerText)
                        });
                    }
                } else if (line.length >= 40) {
                    // Nếu là tiêu đề khối ngành hoặc mô tả chung dài thì giữ lại
                    allChunks.push({
                        id: chunkId++,
                        source: fileLabel,
                        content: line,
                        tokens: normalizeAndTokenize(line)
                    });
                }
                i++;
            }
        } else {
            // Chia tài liệu mặc định cho các file khác theo 2 ký tự xuống dòng liên tiếp (paragraphs)
            const rawParagraphs = content.split(/\r?\n\s*\r?\n/);
            
            for (const para of rawParagraphs) {
                const trimmed = para.trim();
                if (trimmed.length < 40) continue;
                
                allChunks.push({
                    id: chunkId++,
                    source: fileLabel,
                    content: trimmed,
                    tokens: normalizeAndTokenize(trimmed)
                });
            }
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
    
    // 3. Tính toán trước vector TF-IDF cho từng chunk
    for (const chunk of chunksCache) {
        const chunkTF = createTFVector(chunk.tokens);
        const chunkVector = {};
        for (const word of Object.keys(chunkTF)) {
            chunkVector[word] = chunkTF[word] * (idfCache[word] || defaultIDF);
        }
        chunk.vector = chunkVector;
    }
    
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
    
    // Tính toán độ tương đồng với tất cả các chunks (sử dụng vector đã tính sẵn trong cache)
    const scoredChunks = chunksCache.map(chunk => {
        let score = cosineSimilarity(userVector, chunk.vector);
        
        // Tăng trọng số (boost) cho tài liệu thông tin khoa nếu câu hỏi có các từ khóa liên quan đến khoa/ngành/sơ đồ
        if (chunk.source === 'DEPARTMENTS INFO') {
            const lowerMsg = userMessage.toLowerCase();
            if (lowerMsg.includes('khoa') || lowerMsg.includes('ngành') || lowerMsg.includes('nganh') || lowerMsg.includes('sơ đồ') || lowerMsg.includes('so do') || lowerMsg.includes('tổ chức') || lowerMsg.includes('to chuc')) {
                score *= 1.8; // Tăng đáng kể để thông tin Khoa nổi lên trước danh sách giảng viên
            }
        }
        
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
