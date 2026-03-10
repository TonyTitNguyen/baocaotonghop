module.exports = async (req, res) => {
    // 1. Cho phép tất cả các tên miền được phép gọi API này (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Xử lý request hỏi đường trước (preflight) của trình duyệt
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. Lấy Mật khẩu và Link Google Script từ Két sắt Environment Variables của Vercel
        // (Hai biến này KHÔNG BAO GIỜ có mặt trong mã nguồn Frontend)
        const GOOGLE_APP_SCRIPT_URL = process.env.GOOGLE_APP_SCRIPT_URL;
        const SECRET_TOKEN = process.env.SECRET_AUTH_TOKEN;

        if (!GOOGLE_APP_SCRIPT_URL || !SECRET_TOKEN) {
            return res.status(500).json({ error: "Server Configuration Error: Missing Environment Variables." });
        }

        // 3. Phân tích xem Frontend (Trang Báo cáo) đang muốn hỏi số liệu tháng mấy
        const { query } = req;
        const targetMonth = query.month || "";
        const targetYear = query.year || "";
        const action = query.action || "";
        const q = query.q || "";
        const monthFrom = query.monthFrom || "";

        // 4. Xây dựng đường link KÍNH MẬT gửi tới Google
        let googleApiUrl = `${GOOGLE_APP_SCRIPT_URL}?token=${SECRET_TOKEN}&month=${targetMonth}&year=${targetYear}&action=${action}&q=${encodeURIComponent(q)}&monthFrom=${monthFrom}`;

        // 5. Đóng vai Frontend, Server Vercel tự lấy thân mình đi hỏi Google Apps Script
        const googleResponse = await fetch(googleApiUrl);

        if (!googleResponse.ok) {
            throw new Error(`Google API responded with status: ${googleResponse.status}`);
        }

        const data = await googleResponse.json();

        // 6. Trả số liệu sạch (đã giấu link gốc) về cho Frontend hiển thị
        res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Proxy Error:", error);
        res.status(500).json({ error: "Internal Server Error while communicating with Google Apps Script." });
    }
};
