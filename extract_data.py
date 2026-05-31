import os
import zipfile
import xml.etree.ElementTree as ET
import sys

# Configure stdout to use UTF-8 to prevent encoding errors on Windows terminal
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

def docx_to_text(docx_path):
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    text = []
    try:
        with zipfile.ZipFile(docx_path) as docx:
            xml_content = docx.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            for paragraph in tree.iter('{' + namespaces['w'] + '}p'):
                p_text = []
                for node in paragraph.iter('{' + namespaces['w'] + '}t'):
                    if node.text:
                        p_text.append(node.text)
                if p_text:
                    text.append("".join(p_text))
        return "\n".join(text)
    except Exception as e:
        print(f"Error reading {docx_path}: {e}")
        return None

def process_directory(base_dir):
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.docx') and not file.startswith('~$'):
                docx_path = os.path.join(root, file)
                txt_filename = file.replace('.docx', '.txt')
                txt_path = os.path.join(root, txt_filename)
                
                print(f"Extracting text from: {docx_path} -> {txt_path}")
                content = docx_to_text(docx_path)
                if content:
                    with open(txt_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Successfully saved text to {txt_path}")

if __name__ == '__main__':
    downloads_dir = r"C:\Users\tungduong\Downloads\Chatbot_AI"
    print(f"Processing directory: {downloads_dir}")
    process_directory(downloads_dir)
