const Database = require('better-sqlite3');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'storage', 'chatbot.db');
const db = new Database(DB_FILE);

const rows = db.prepare('SELECT * FROM knowledge_base').all();

console.log(`Total rows: ${rows.length}`);
for (const row of rows) {
    console.log(`\nID: ${row.id}`);
    console.log(`Question: "${row.question}"`);
    console.log(`Category: "${row.category}"`);
    console.log(`Source: "${row.source}"`);
    console.log(`Answer: "${row.answer}"`);
}
