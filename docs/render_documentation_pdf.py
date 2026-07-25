#!/usr/bin/env python3
"""Render the Seniority Portal markdown documentation into a simple PDF.

This intentionally uses only the Python standard library so it works in the
current workspace without adding dependencies or requiring system PDF tools.
"""

from __future__ import annotations

import re
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Seniority_Portal_Documentation.md"
OUTPUT = ROOT / "Seniority_Portal_Documentation.pdf"

PAGE_W = 595
PAGE_H = 842
MARGIN_X = 50
MARGIN_TOP = 54
MARGIN_BOTTOM = 48
LINE_H = 13
BODY_SIZE = 9
H1_SIZE = 18
H2_SIZE = 14
H3_SIZE = 11
MAX_BODY_CHARS = 92


def escape_pdf_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\t", "    ")
    )


def strip_markdown_inline(value: str) -> str:
    value = re.sub(r"\*\*(.*?)\*\*", r"\1", value)
    value = re.sub(r"`([^`]*)`", r"\1", value)
    value = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", value)
    return value


def tokenize_markdown(md: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    in_code = False
    for raw in md.splitlines():
        line = raw.rstrip()
        if line.startswith("```"):
            in_code = not in_code
            tokens.append(("blank", ""))
            continue
        if in_code:
            tokens.append(("code", line))
            continue
        if not line.strip():
            tokens.append(("blank", ""))
        elif line.startswith("# "):
            tokens.append(("h1", strip_markdown_inline(line[2:].strip())))
        elif line.startswith("## "):
            tokens.append(("h2", strip_markdown_inline(line[3:].strip())))
        elif line.startswith("### "):
            tokens.append(("h3", strip_markdown_inline(line[4:].strip())))
        elif line.startswith("- "):
            tokens.append(("bullet", strip_markdown_inline(line[2:].strip())))
        elif re.match(r"^\d+\.\s+", line):
            tokens.append(("number", strip_markdown_inline(line.strip())))
        else:
            tokens.append(("para", strip_markdown_inline(line.strip())))
    return tokens


class PdfDoc:
    def __init__(self) -> None:
        self.pages: list[list[str]] = []
        self.current: list[str] = []
        self.y = PAGE_H - MARGIN_TOP
        self.page_no = 0
        self.new_page()

    def new_page(self) -> None:
        if self.current:
            self._footer()
            self.pages.append(self.current)
        self.page_no += 1
        self.current = [
            "BT /F2 8 Tf 50 815 Td (Seniority Portal - Enterprise Documentation Package) Tj ET",
            f"BT /F1 8 Tf 500 815 Td (Page {self.page_no}) Tj ET",
        ]
        self.y = PAGE_H - MARGIN_TOP

    def _footer(self) -> None:
        self.current.append(
            "BT /F1 8 Tf 50 28 Td (Generated from workspace source on 2026-06-10) Tj ET"
        )

    def ensure(self, amount: int) -> None:
        if self.y - amount < MARGIN_BOTTOM:
            self.new_page()

    def text(self, line: str, size: int = BODY_SIZE, font: str = "F1", indent: int = 0) -> None:
        self.ensure(LINE_H)
        x = MARGIN_X + indent
        safe = escape_pdf_text(line)
        self.current.append(f"BT /{font} {size} Tf {x} {self.y} Td ({safe}) Tj ET")
        self.y -= LINE_H

    def heading(self, line: str, level: int) -> None:
        size = H1_SIZE if level == 1 else H2_SIZE if level == 2 else H3_SIZE
        font = "F2"
        gap = 22 if level == 1 else 18 if level == 2 else 15
        self.ensure(gap * 2)
        if self.y < PAGE_H - MARGIN_TOP:
            self.y -= 4
        wrapped = textwrap.wrap(line, width=70 if level == 1 else 82) or [line]
        for part in wrapped:
            self.text(part, size=size, font=font)
        self.y -= 2

    def paragraph(self, line: str) -> None:
        for part in textwrap.wrap(line, width=MAX_BODY_CHARS) or [""]:
            self.text(part)

    def bullet(self, line: str) -> None:
        wrapped = textwrap.wrap(line, width=86)
        if not wrapped:
            return
        self.text("- " + wrapped[0])
        for part in wrapped[1:]:
            self.text("  " + part)

    def code(self, line: str) -> None:
        for part in textwrap.wrap(line, width=88, replace_whitespace=False, drop_whitespace=False) or [""]:
            self.text(part, size=8, font="F3", indent=10)

    def blank(self) -> None:
        self.y -= 5

    def finish(self) -> bytes:
        self._footer()
        self.pages.append(self.current)
        return build_pdf(self.pages)


def build_pdf(page_streams: list[list[str]]) -> bytes:
    objects: list[bytes] = []

    def add(obj: str | bytes) -> int:
        objects.append(obj.encode("latin-1") if isinstance(obj, str) else obj)
        return len(objects)

    catalog_id = add("<< /Type /Catalog /Pages 2 0 R >>")
    assert catalog_id == 1
    add("<< /Type /Pages /Kids [] /Count 0 >>")
    font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    font3 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

    page_ids: list[int] = []
    content_ids: list[int] = []
    for stream_lines in page_streams:
        stream = "\n".join(stream_lines).encode("latin-1", errors="replace")
        content_id = add(
            b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream"
        )
        page_id = add(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R /F3 {font3} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        )
        content_ids.append(content_id)
        page_ids.append(page_id)

    objects[1] = (
        f"<< /Type /Pages /Kids [{' '.join(f'{pid} 0 R' for pid in page_ids)}] "
        f"/Count {len(page_ids)} >>"
    ).encode("latin-1")

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode("ascii"))
        out.extend(obj)
        out.extend(b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects)+1}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    out.extend(
        f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return bytes(out)


def main() -> None:
    md = SOURCE.read_text(encoding="utf-8")
    doc = PdfDoc()
    previous_blank = False
    for kind, value in tokenize_markdown(md):
        if kind == "blank":
            if not previous_blank:
                doc.blank()
            previous_blank = True
            continue
        previous_blank = False
        if kind == "h1":
            doc.heading(value, 1)
        elif kind == "h2":
            doc.heading(value, 2)
        elif kind == "h3":
            doc.heading(value, 3)
        elif kind == "bullet":
            doc.bullet(value)
        elif kind == "number":
            doc.paragraph(value)
        elif kind == "code":
            doc.code(value)
        else:
            doc.paragraph(value)
    OUTPUT.write_bytes(doc.finish())
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
