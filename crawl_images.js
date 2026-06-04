const fs = require('fs');
const path = require('path');

const DEPARTMENTS = [
    { name: "Khoa Cơ khí", url: "https://uneti.edu.vn/khoa-co-khi/" },
    { name: "Khoa Thương mại", url: "https://uneti.edu.vn/khoa-thuong-mai/" },
    { name: "Khoa Du lịch và Khách sạn", url: "https://uneti.edu.vn/khoa-du-lich-va-khach-san/" },
    { name: "Khoa Công nghệ thực phẩm", url: "https://uneti.edu.vn/khoa-cong-nghe-thuc-pham/" },
    { name: "Khoa Công nghệ thông tin", url: "https://uneti.edu.vn/khoa-cong-nghe-thong-tin/" },
    { name: "Khoa Điện - Tự động hóa", url: "https://uneti.edu.vn/khoa-dien/" },
    { name: "Khoa Điện tử và Kỹ thuật máy tính", url: "https://uneti.edu.vn/khoa-dien-tu/" },
    { name: "Khoa Dệt may và Thời trang", url: "https://uneti.edu.vn/khoa-det-may-va-thoi-trang/" },
    { name: "Khoa Quản trị & Marketing", url: "https://uneti.edu.vn/1720/" },
    { name: "Khoa Giáo dục thể chất và Quốc phòng", url: "https://uneti.edu.vn/khoa-giao-duc-the-chat-quoc-phong/" },
    { name: "Khoa Kế toán Kiểm toán", url: "https://uneti.edu.vn/khoa-ke-toan/" },
    { name: "Khoa Tài chính - Ngân hàng và Bảo hiểm", url: "https://uneti.edu.vn/khoa-tai-chinh-ngan-hang/" },
    { name: "Khoa Khoa học ứng dụng", url: "https://uneti.edu.vn/khoa-khoa-hoc-co-ban/" },
    { name: "Khoa Ngoại ngữ", url: "https://uneti.edu.vn/khoa-ngoai-ngu/" },
    { name: "Khoa Lý luận Chính trị và Pháp luật", url: "https://uneti.edu.vn/khoa-ly-luan-chinh-tri/" }
];

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function crawl() {
    const results = [];
    
    for (const dept of DEPARTMENTS) {
        console.log(`Fetching ${dept.name} (${dept.url})...`);
        try {
            const res = await fetch(dept.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const html = await res.text();
            
            // Trích xuất phần thân bài viết
            const entryStart = html.indexOf('<div class="entry-content');
            if (entryStart === -1) {
                console.log(`  Cannot find entry content for ${dept.name}`);
                results.push({ name: dept.name, url: dept.url, images: [] });
                continue;
            }
            
            const entryEnd = html.indexOf('</article>', entryStart);
            const contentHtml = entryEnd === -1 ? html.substring(entryStart) : html.substring(entryStart, entryEnd);
            
            // Tìm tất cả thẻ ảnh
            const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
            const images = [];
            let match;
            while ((match = imgRegex.exec(contentHtml)) !== null) {
                const src = match[1];
                // Bỏ qua các icon / logo phổ biến
                if (src.includes('logo') || src.includes('FB.png') || src.includes('address.webp') || src.includes('tel.webp')) continue;
                images.push(src);
            }
            
            console.log(`  Found ${images.length} images.`);
            results.push({
                name: dept.name,
                url: dept.url,
                images: images
            });
            
        } catch (err) {
            console.error(`  Error fetching ${dept.name}:`, err.message);
            results.push({ name: dept.name, url: dept.url, error: err.message, images: [] });
        }
        await new Promise(r => setTimeout(r, 300));
    }
    
    // Ghi file raw JSON
    const assetsDir = path.join(__dirname, 'assets', 'inF Giảng Viên');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(assetsDir, 'raw_crawled_images.json'),
        JSON.stringify(results, null, 2),
        'utf-8'
    );
    console.log(`Saved raw crawled images list to assets/inF Giảng Viên/raw_crawled_images.json`);
}

crawl();
