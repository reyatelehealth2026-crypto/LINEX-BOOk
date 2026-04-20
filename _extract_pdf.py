import pypdf
r = pypdf.PdfReader("LineBook-Strategic-Analysis.pdf")
with open("_pdf_dump.txt", "w", encoding="utf-8") as f:
    f.write(f"pages: {len(r.pages)}\n")
    for i, p in enumerate(r.pages):
        f.write(f"\n===== page {i+1} =====\n")
        f.write(p.extract_text() or "[empty]")
print("written _pdf_dump.txt")
