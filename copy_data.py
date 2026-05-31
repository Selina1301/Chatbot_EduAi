import os
import shutil
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

src_dir = r"c:\Code\Sup_AI_Edu\assets"
dest_dir = r"c:\Code\Sup_AI_Edu\Basic_Chatbot\data"

os.makedirs(dest_dir, exist_ok=True)

files_mapping = {
    os.path.join("Học phí & Tài chính", "Thong-bao-muc-thu-hinh-thuc-thu-hoc-phi-nam-hoc-2022-2023.txt"): "hoc_phi_2022_2023.txt",
    os.path.join("Học phí & Tài chính", "học phí.txt"): "hoc_phi_2025_2026.txt",
    os.path.join("Kế hoạch đào tạo", "ke-hoach-dao-tao-hk2-20251211115059-e_00001.txt"): "ke_hoach_dao_tao_2025_2026.txt",
    os.path.join("Phòng ban liên hệ", "Liên hệ.txt"): "lien_he_phong_ban.txt",
    os.path.join("Thủ tục hành chính", "Các-Quy-trình-giải-quyết-TTHC-bộ-phận-Một-cửa-final.txt"): "cac_quy_trinh_tthc_mot_cua.txt",
    os.path.join("Thủ tục hành chính", "Thủ tục hành chính.txt"): "thu_tuc_hanh_chinh.txt",
    os.path.join("Thủ tục hành chính", "MC-CTSV-02.txt"): "bieu_mau_mc_ctsv_02.txt",
    os.path.join("Thủ tục hành chính", "ĐT-SV-15.txt"): "bieu_mau_dt_sv_15.txt",
    os.path.join("Giảng viên", "20-2023.txt"): "giang_vien_info.txt",
}

for src_rel, dest_name in files_mapping.items():
    full_src = os.path.join(src_dir, src_rel)
    full_dest = os.path.join(dest_dir, dest_name)
    if os.path.exists(full_src):
        shutil.copy2(full_src, full_dest)
        print(f"OK: {dest_name}")
    else:
        print(f"MISSING: {full_src}")

print("Done!")
