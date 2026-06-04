const XLSX = require('xlsx');
const path = require('path');

// Đường dẫn tệp Excel giảng viên
const excelPath = path.join(__dirname, 'assets', 'Giảng viên', 'danh_sach_giang_vien_day_du_704_dong.xlsx');

try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    console.log(`📊 Sheet name: ${sheetName}`);
    
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log(`📈 Total rows: ${range.e.r + 1}`);
    console.log(`📋 Total columns: ${range.e.c + 1}`);
    console.log();
    
    console.log('🔍 Column headers:');
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
        const cell = sheet[cellAddress];
        console.log(`  Col ${col + 1}: ${cell ? cell.v : 'N/A'}`);
    }
    
    console.log();
    console.log('📝 First 3 rows of data:');
    for (let r = range.s.r + 1; r <= Math.min(range.s.r + 3, range.e.r); r++) {
        const rowData = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: r, c: col });
            const cell = sheet[cellAddress];
            const cellVal = cell ? cell.v : 'N/A';
            rowData.push(String(cellVal).substring(0, 25));
        }
        console.log(`  Row ${r + 1}: ${rowData.join(' | ')}`);
    }
} catch (e) {
    console.error(`Error reading ${excelPath}:`, e.message);
}
