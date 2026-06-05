const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'assets');
const destDir = path.resolve(__dirname, '..', 'data');

console.log("=== Checking Files in assets vs data ===");

function walk(dir, files = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath, files);
        } else {
            files.push(fullPath);
        }
    });
    return files;
}

const allAssetFiles = walk(srcDir);
const textAssetFiles = allAssetFiles.filter(f => f.endsWith('.txt') || f.endsWith('.docx') || f.endsWith('.doc') || f.endsWith('.pdf'));

console.log(`Total asset files (txt/docx/doc/pdf): ${textAssetFiles.length}`);

// Read copy_data.js files mapping
const copyDataPath = path.join(__dirname, '..', 'copy_data.js');
const copyDataContent = fs.readFileSync(copyDataPath, 'utf-8');

console.log("\n--- Files in assets and their status ---");
textAssetFiles.forEach(file => {
    const relPath = path.relative(srcDir, file);
    const baseName = path.basename(file);
    
    // Check if mentioned in copy_data.js
    const isMapped = copyDataContent.includes(baseName) || copyDataContent.includes(relPath);
    
    // Check if a similar named txt file exists in data/
    const cleanName = baseName.replace(/\.(txt|docx|doc|pdf)$/i, '');
    const dataFiles = fs.readdirSync(destDir);
    const matchedInData = dataFiles.some(df => df.toLowerCase().includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(df.replace('.txt','').toLowerCase()));
    
    console.log(`- [${isMapped ? "MAPPED" : "UNMAPPED"}] [${matchedInData ? "IN DATA" : "NOT IN DATA"}] ${relPath} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
});
