function renderMarkdown(text) {
  let html = text
    // Escape HTML first (except we allow some tags below)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headings
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h3>$1</h3>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Unordered lists
    .replace(/^[\-\*] (.+)$/gm, "<li>$1</li>")
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Images
    .replace(
      /!\[(.+?)\]\((https?:\/\/[^\)]+)\)/g,
      '<img src="$2" alt="$1" class="chat-inline-image" style="max-width: 100%; border-radius: 8px; margin-top: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: block;">',
    )
    // Links
    .replace(
      /\[(.+?)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    )
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>(\s*<br\s*\/?>)?)+/gs, (match) => {
    const items = match.replace(/<br\s*\/?>/g, "");
    return "<ul>" + items + "</ul>";
  });

  return "<p>" + html + "</p>";
}

const testText = "Sơ đồ Khoa Cơ khí: ![Sơ đồ cơ cấu tổ chức Khoa Cơ khí](https://uneti.edu.vn/wp-content/uploads/2020/02/1-7.png)\n\nXem web: https://uneti.edu.vn/khoa-co-khi/";
console.log(renderMarkdown(testText));
