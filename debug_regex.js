const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
let knowledgeBase = '';

function loadKnowledgeBase() {
    console.log('📚 Đang tải dữ liệu kiến thức UNETI...');
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt'));
    const sections = [];

    for (const file of files) {
        const filePath = path.join(DATA_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        const label = file.replace(/_/g, ' ').replace('.txt', '').toUpperCase();
        sections.push(`=== ${label} ===\n${content}`);
    }

    knowledgeBase = sections.join('\n\n');
    console.log(`✅ Đã tải ${files.length} tài liệu`);
    return knowledgeBase;
}

const kb = loadKnowledgeBase();

console.log('\n🔍 KIỂM TRA REGEX PATTERN:\n');

const TOPIC_MAP = {
    'học phí': kb.match(/=== HOC PHI[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'thủ tục': kb.match(/=== THU TUC HANH CHINH[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'đào tạo': kb.match(/=== KE HOACH DAO TAO[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'liên hệ': kb.match(/=== LIEN HE PHONG BAN[\s\S]*?(?=\n===|\Z)/)?.[0] || '',
    'giảng viên': kb.match(/=== GIANG VIEN INFO[\s\S]*?(?=\n===|\Z)/)?.[0] || ''
};

for (const [key, content] of Object.entries(TOPIC_MAP)) {
    if (content && content.length > 0) {
        console.log(`✅ "${key}": Found ${Math.round(content.length / 1024)}KB`);
    } else {
        console.log(`❌ "${key}": NOT FOUND (content is empty)`);
    }
}

// Find what headers actually exist
console.log('\n🔎 HEADERS THỰC TẾ TRONG KNOWLEDGE BASE:\n');
const headers = kb.match(/=== [^=]+ ===/g);
if (headers) {
    headers.forEach(h => console.log(`  ${h}`));
} else {
    console.log('  Không tìm thấy headers');
}
