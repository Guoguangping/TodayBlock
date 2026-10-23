from pathlib import Path

out = Path(r"D:\代码\today-block\samples\采购合同.pdf")
text_lines = [
    "Purchase Contract - Action Items",
    "Submit signed contract by 2026-10-30.",
    "Confirm payment milestone on 2026-11-05.",
    "Renew cloud service before 2026-12-01.",
]

stream_parts = ["BT", "/F1 12 Tf", "72 720 Td"]
for index, line in enumerate(text_lines):
    escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    if index:
        stream_parts.append("0 -22 Td")
    stream_parts.append(f"({escaped}) Tj")
stream_parts.append("ET")
stream = "\n".join(stream_parts).encode("latin-1")

objects = []
objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
objects.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>")
objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
objects.append(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream")

pdf = bytearray(b"%PDF-1.4\n")
offsets = [0]
for number, body in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf.extend(f"{number} 0 obj\n".encode())
    pdf.extend(body)
    pdf.extend(b"\nendobj\n")

xref_offset = len(pdf)
pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
pdf.extend(b"0000000000 65535 f \n")
for offset in offsets[1:]:
    pdf.extend(f"{offset:010d} 00000 n \n".encode())
pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode())

out.write_bytes(pdf)
print(out)
