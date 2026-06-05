async function runTests() {
    const sessionId = 'test_session_' + Date.now();
    
    // Test 1: Normal Query
    console.log("=== Test 1: Normal Query ===");
    try {
        const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                message: 'học phí năm học 2025-2026 là bao nhiêu?'
            })
        });
        const data = await res.json();
        console.log("Response Source:", data.source);
        console.log("Response:", data.reply ? data.reply.substring(0, 150) + "..." : data);
    } catch (err) {
        console.error("Test 1 failed:", err);
    }

    // Test 2: Direct AI Query (ending with AI)
    console.log("\n=== Test 2: Direct AI Query ===");
    try {
        const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                message: 'Hãy làm một bài thơ ngắn 4 câu về UNETI AI!'
            })
        });
        const data = await res.json();
        console.log("Response Source:", data.source);
        console.log("Response:", data.reply);
    } catch (err) {
        console.error("Test 2 failed:", err);
    }

    // Test 3: Direct AI Query with trailing question mark (e.g., "AI?")
    console.log("\n=== Test 3: Direct AI Query with trailing question mark ===");
    try {
        const res = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                message: 'Thủ đô của nước Pháp là gì vậy AI?'
            })
        });
        const data = await res.json();
        console.log("Response Source:", data.source);
        console.log("Response:", data.reply);
    } catch (err) {
        console.error("Test 3 failed:", err);
    }
}

runTests();
