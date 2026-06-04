const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, 'assets');
const destDir = path.resolve(__dirname, 'data');

// Tạo thư mục đích nếu chưa tồn tại
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📂 Tạo folder data tại: ${destDir}`);
}

const filesMapping = {
    [path.join("Học phí & Tài chính", "Thong-bao-muc-thu-hinh-thuc-thu-hoc-phi-nam-hoc-2022-2023.txt")]: "hoc_phi_2022_2023.txt",
    [path.join("Học phí & Tài chính", "học phí.txt")]: "hoc_phi_2025_2026.txt",
    [path.join("Kế hoạch đào tạo", "ke-hoach-dao-tao-hk2-20251211115059-e_00001.txt")]: "ke_hoach_dao_tao_2025_2026.txt",
    [path.join("Phòng ban liên hệ", "Liên hệ.txt")]: "lien_he_phong_ban.txt",
    [path.join("Thủ tục hành chính", "Các-Quy-trình-giải-quyết-TTHC-bộ-phận-Một-cửa-final.txt")]: "cac_quy_trinh_tthc_mot_cua.txt",
    [path.join("Thủ tục hành chính", "Thủ tục hành chính.txt")]: "thu_tuc_hanh_chinh.txt",
    [path.join("Thủ tục hành chính", "MC-CTSV-02.txt")]: "bieu_mau_mc_ctsv_02.txt",
    [path.join("Thủ tục hành chính", "ĐT-SV-15.txt")]: "bieu_mau_dt_sv_15.txt",
    [path.join("Giảng viên", "20-2023.txt")]: "giang_vien_info.txt",
};

for (const [srcRel, destName] of Object.entries(filesMapping)) {
    const fullSrc = path.join(srcDir, srcRel);
    const fullDest = path.join(destDir, destName);
    
    if (fs.existsSync(fullSrc)) {
        fs.copyFileSync(fullSrc, fullDest);
        console.log(`✅ OK: ${destName}`);
    } else {
        console.log(`❌ MISSING: ${fullSrc}`);
    }
}

console.log("Done!");
