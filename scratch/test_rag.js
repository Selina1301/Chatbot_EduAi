const ragEngine = require('../rag_engine');

// Initialize the RAG engine
ragEngine.initRAG();

const testQueries = [
    "Sơ đồ tổ chức Khoa Cơ khí",
    "Giảng viên Đào Đình Hoàng thuộc khoa nào, chức vụ gì?",
    "Giảng viên Đinh Thọ Long",
    "Khoa Công nghệ thông tin"
];

for (const query of testQueries) {
    console.log(`\n========================================`);
    console.log(`QUERY: "${query}"`);
    console.log(`========================================`);
    const results = ragEngine.retrieveRelevantChunks(query, 3, 0.05);
    results.forEach((res, index) => {
        console.log(`\n[${index + 1}] Source: ${res.source} (Score: ${res.score.toFixed(4)})`);
        console.log(`Content: ${res.content}`);
    });
}
