const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'giang_vien_info.txt');
let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace(/\f/g, ''); // Remove Form Feed characters

const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

const majors = new Set();
let i = 0;

// Skip until B. Công khai thông tin
while (i < lines.length && !lines[i].includes('B. Công khai thông tin')) {
    i++;
}

while (i < lines.length) {
    const line = lines[i];
    const matchRecordStart = line.match(/^(\d+)(?:\s+(.+))?$/);
    
    if (matchRecordStart) {
        const stt = matchRecordStart[1];
        const nameInStart = matchRecordStart[2];
        
        if (nameInStart) {
            // 6-line record
            const subject = lines[i + 5] || '';
            if (subject) majors.add(subject.trim());
            i += 6;
            continue;
        } else {
            // 7-line record
            const subject = lines[i + 6] || '';
            if (subject) majors.add(subject.trim());
            i += 7;
            continue;
        }
    }
    i++;
}

console.log("Found Majors:");
console.log(Array.from(majors).sort());
