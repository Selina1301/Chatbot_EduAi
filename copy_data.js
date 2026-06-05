const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, 'assets');
const destDir = path.resolve(__dirname, 'data');

// Tạo thư mục đích nếu chưa tồn tại
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📂 Tạo folder data tại: ${destDir}`);
}

const customMapping = {
    "Học phí & Tài chính/Thong-bao-muc-thu-hinh-thuc-thu-hoc-phi-nam-hoc-2022-2023.txt": "hoc_phi_2022_2023.txt",
    "Học phí & Tài chính/học phí.txt": "hoc_phi_2025_2026.txt",
    "Kế hoạch đào tạo/ke-hoach-dao-tao-hk2-20251211115059-e_00001 (1).txt": "ke_hoach_dao_tao_2025_2026.txt",
    "Kế hoạch đào tạo/ke-hoach-dao-tao-hk2-20251211115059-e_00001.txt": "ke_hoach_dao_tao_2025_2026.txt",
    "Phòng ban liên hệ/Liên hệ.txt": "lien_he_phong_ban.txt",
    "Thủ tục hành chính/Các-Quy-trình-giải-quyết-TTHC-bộ-phận-Một-cửa-final.txt": "cac_quy_trinh_tthc_mot_cua.txt",
    "Thủ tục hành chính/Thủ tục hành chính.txt": "thu_tuc_hanh_chinh.txt",
    "Thủ tục hành chính/MC-CTSV-02.txt": "bieu_mau_mc_ctsv_02.txt",
    "Thủ tục hành chính/ĐT-SV-15.txt": "bieu_mau_dt_sv_15.txt",
};

// Hàm chuyển đổi tên file sang snake_case không dấu
function cleanFilename(name) {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .replace(/[^a-zA-Z0-9.]/g, "_") // Thay ký tự đặc biệt/khoảng trắng bằng _
        .replace(/_+/g, "_") // Rút gọn nhiều dấu gạch dưới liên tiếp
        .replace(/_txt$/i, ".txt")
        .toLowerCase();
}

function walk(dir, files = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath, files);
        } else if (file.toLowerCase().endswith('.txt')) {
            files.push(fullPath);
        }
    });
    return files;
}

// Thêm endswith polyfill nếu chạy trên môi trường cũ
if (!String.prototype.endswith) {
    String.prototype.endswith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

console.log("🔄 Đang quét thư mục assets để đồng bộ dữ liệu vào data/...");
const txtFiles = walk(srcDir);

let copiedCount = 0;
txtFiles.forEach(srcPath => {
    const relPath = path.relative(srcDir, srcPath).replace(/\\/g, '/');
    const baseName = path.basename(srcPath);
    
    let destName = "";
    if (customMapping[relPath]) {
        destName = customMapping[relPath];
    } else {
        destName = cleanFilename(baseName);
    }
    
    const destPath = path.join(destDir, destName);
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Copy: [assets/${relPath}] -> [data/${destName}]`);
    copiedCount++;
});

console.log(`🎉 Hoàn thành! Đã đồng bộ thành công ${copiedCount} file dữ liệu.`);
