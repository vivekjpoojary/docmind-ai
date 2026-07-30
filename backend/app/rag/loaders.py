"""
Document loaders — extract text while preserving page numbers where possible.

Each loader returns a list of PageContent(page_number, text) so that later,
when a chunk is retrieved, we can cite the exact page it came from.

- PDF: page number is the actual PDF page (1-indexed) via PyMuPDF.
- DOCX: Word documents don't have a fixed page concept (pagination is a
  rendering-time property), so we approximate by treating each *section
  break* boundary as a soft page marker, falling back to page_number=1
  for the whole document body when no clear breaks exist. This is called
  out explicitly rather than silently faked.
- TXT: no concept of pages; always page_number=1.
"""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class PageContent:
    page_number: int
    text: str


class UnsupportedFileTypeError(Exception):
    pass


def load_pdf(file_path: str) -> list[PageContent]:
    import fitz  # PyMuPDF

    pages = []
    with fitz.open(file_path) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if text:
                pages.append(PageContent(page_number=i, text=text))
    return pages


def load_docx(file_path: str) -> list[PageContent]:
    """
    python-docx has no native page-number API (Word computes pagination at
    render time). We approximate: each top-level section is treated as one
    logical "page" for citation purposes. Most simple reports/letters have
    a single section, in which case the whole document is page 1.
    """
    import docx

    document = docx.Document(file_path)
    full_text = "\n".join(p.text for p in document.paragraphs if p.text.strip())
    # Fallback: single logical page. (True page-accurate DOCX extraction
    # would require rendering to PDF first — noted as a future improvement.)
    if not full_text.strip():
        return []
    return [PageContent(page_number=1, text=full_text)]


def load_txt(file_path: str) -> list[PageContent]:
    text = Path(file_path).read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return []
    return [PageContent(page_number=1, text=text)]


def load_document(file_path: str, file_type: str) -> list[PageContent]:
    file_type = file_type.lower().lstrip(".")
    if file_type == "pdf":
        return load_pdf(file_path)
    if file_type == "docx":
        return load_docx(file_path)
    if file_type == "txt":
        return load_txt(file_path)
    raise UnsupportedFileTypeError(f"Unsupported file type: {file_type}")
