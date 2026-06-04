const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function docxToText(docxPath) {
    try {
        const zip = new AdmZip(docxPath);
        const xmlContent = zip.readAsText('word/document.xml');
        
        // Tách theo thẻ </w:p> đại diện cho xuống dòng
        const paragraphs = xmlContent.split('</w:p>');
        const textLines = [];
        
        for (const p of paragraphs) {
            const tMatches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
            if (tMatches) {
                const pText = tMatches.map(t => {
                    const content = t.replace(/<w:t[^>]*>/, '').replace('</w:t>', '');
                    // Decode thực thể XML cơ bản
                    return content
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&apos;/g, "'");
                }).join('');
                if (pText.trim()) {
                    textLines.push(pText);
                }
            }
        }
        return textLines.join('\n');
    } catch (e) {
        console.error(`Error reading ${docxPath}:`, e.message);
        return null;
    }
}

function processDirectory(baseDir) {
    if (!fs.existsSync(baseDir)) {
        console.log(`Directory does not exist: ${baseDir}`);
        return;
    }

    function walk(dir) {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (file.endsWith('.docx') && !file.startsWith('~$')) {
                const txtPath = fullPath.replace(/\.docx$/, '.txt');
                console.log(`Extracting text from: ${fullPath} -> ${txtPath}`);
                const content = docxToText(fullPath);
                if (content !== null) {
                    fs.writeFileSync(txtPath, content, 'utf-8');
                    console.log(`Successfully saved text to ${txtPath}`);
                }
            }
        });
    }

    walk(baseDir);
}

const downloadsDir = `C:\\Users\\tungduong\\Downloads\\Chatbot_AI`;
console.log(`Processing directory: ${downloadsDir}`);
processDirectory(downloadsDir);
