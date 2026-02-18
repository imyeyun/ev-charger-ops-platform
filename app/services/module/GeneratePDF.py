from pathlib import Path
from typing import Optional, Tuple
import inspect
import json
import os
import re

import fpdf as fpdf_pkg
from fpdf import FPDF

# Windows 우선 한글 폰트 후보
FONT_CANDIDATES_REGULAR = [
    Path(r"C:/Windows/Fonts/gulim.ttf"),
    Path(r"C:/Windows/Fonts/malgun.ttf"),
    Path(r"C:/Windows/Fonts/batang.ttf"),
    Path(r"C:/Windows/Fonts/NanumGothic.ttf"),
    Path("/usr/share/fonts/truetype/nanum/NanumGothic.ttf"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
    Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"),
]

FONT_CANDIDATES_BOLD = [
    Path(r"C:/Windows/Fonts/malgunbd.ttf"),
    Path(r"C:/Windows/Fonts/NanumGothicBold.ttf"),
    Path("/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"),
]


def _first_existing(paths) -> Optional[Path]:
    for p in paths:
        if p.exists():
            return p.resolve()
    return None


def _resolve_font_paths(
    font_regular: Optional[str] = None,
    font_bold: Optional[str] = None,
) -> Tuple[Optional[Path], Optional[Path]]:
    regular = None
    bold = None

    if font_regular:
        p = Path(font_regular).expanduser().resolve()
        if p.exists():
            regular = p
    if font_bold:
        p = Path(font_bold).expanduser().resolve()
        if p.exists():
            bold = p

    if regular is None:
        regular = _first_existing(FONT_CANDIDATES_REGULAR)
    if bold is None:
        bold = _first_existing(FONT_CANDIDATES_BOLD)

    return regular, bold


def _strip_inline_md(text: str) -> str:
    # [label](url) -> label (url)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    # 강조/코드 마크 제거
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)
    text = text.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    return text.strip()


def _extract_md_image_path(line: str) -> Optional[str]:
    m = re.search(r"!\[[^\]]*\]\(([^)]+)\)", line.strip())
    if not m:
        return None

    raw = m.group(1).strip()
    # (path "title") 형태면 첫 토큰만 사용
    if " " in raw and not raw.startswith("http"):
        raw = raw.split(" ")[0]
    return raw.strip("\"'")


def _contains_non_ascii(text: str) -> bool:
    return any(ord(ch) > 127 for ch in text)


def _set_font(pdf: FPDF, family: str, size: int, bold: bool, bold_available: bool) -> None:
    style = "B" if (bold and bold_available) else ""
    pdf.set_font(family, style=style, size=size)

def _mc(pdf: FPDF, w, h, text, **kwargs):
    """fpdf2에서는 multi_cell 이후 X가 우측으로 이동하므로 기본값을 좌측 마진으로 고정."""
    params = inspect.signature(pdf.multi_cell).parameters
    if "new_x" in params and "new_x" not in kwargs:
        kwargs["new_x"] = "LMARGIN"
    if "new_y" in params and "new_y" not in kwargs:
        kwargs["new_y"] = "NEXT"
    return pdf.multi_cell(w, h, text, **kwargs)

def _add_ttf_font(pdf: FPDF, family: str, style: str, font_path: Path) -> None:
    """fpdf2 / pyfpdf 모두에서 TTF 등록이 되도록 호환 처리."""
    params = inspect.signature(pdf.add_font).parameters
    if "uni" in params:
        # legacy pyfpdf는 uni=True가 필요
        pdf.add_font(family, style=style, fname=str(font_path), uni=True)
    else:
        pdf.add_font(family, style=style, fname=str(font_path))


def _warn_if_legacy_fpdf() -> None:
    version = getattr(fpdf_pkg, "__version__", "unknown")
    print(f"[fpdf] version: {version}")
    try:
        major = int(str(version).split(".")[0])
    except Exception:
        major = 0
    if major < 2:
        print("[warning] legacy 'fpdf'(pyfpdf) detected. "
              "Run: pip uninstall -y fpdf && pip install -U fpdf2")



def _normalize_markdown_text(markdown_text: str) -> str:
    raw = markdown_text
    stripped = raw.strip()

    # JSON 문자열 형태("...\n...")로 저장된 마크다운 복원
    if stripped.startswith(chr(34)) and stripped.endswith(chr(34)):
        try:
            decoded = json.loads(stripped)
            if isinstance(decoded, str):
                return decoded
        except Exception:
            # 실제 줄바꿈이 있는 단순 감싼 문자열 케이스
            if "\n" in stripped:
                return stripped[1:-1]

    # 한 줄 텍스트 안에 리터럴 \n 이 많이 포함된 경우 복원
    real_newline_count = raw.count("\n")
    escaped_newline_count = raw.count("\\n")
    if escaped_newline_count > 0 and escaped_newline_count > real_newline_count and real_newline_count <= 3:
        raw = raw.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", "\t")

    return raw



def generate_pdf(
    md_input: str,
    output_pdf: Optional[str] = None,
    font_regular: Optional[str] = None,
    font_bold: Optional[str] = None,
    include_images: bool = True,
    use_bold_font: bool = False,
) -> Path:
    _warn_if_legacy_fpdf()
    input_path = Path(md_input)

    if input_path.suffix.lower() == ".md" and input_path.exists():
        markdown_text = input_path.read_text(encoding="utf-8")
        base_dir = input_path.parent.resolve()
        if output_pdf is None:
            output_pdf = str(input_path.with_suffix(".pdf"))
    else:
        markdown_text = md_input
        base_dir = Path.cwd()
        if output_pdf is None:
            output_pdf = "output.pdf"

    markdown_text = _normalize_markdown_text(markdown_text)
    print(f"[input] chars={len(markdown_text)}, lines={len(markdown_text.splitlines())}")

    regular_font, bold_font = _resolve_font_paths(font_regular=font_regular, font_bold=font_bold)
    if not use_bold_font:
        bold_font = None

    if regular_font:
        print(f"[font] regular: {regular_font}")
        if bold_font:
            print(f"[font] bold: {bold_font}")
    else:
        print("[font] 한글 폰트를 찾지 못했습니다.")

    if regular_font is None and _contains_non_ascii(markdown_text):
        raise RuntimeError(
            "유니코드(한글) 텍스트가 포함되어 있지만 사용할 폰트를 찾지 못했습니다. "
            "font_regular 인자로 폰트를 지정하세요. "
            "예: r'C:/Windows/Fonts/malgun.ttf'"
        )

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    if regular_font:
        _add_ttf_font(pdf, "KoreanFont", "", regular_font)
        bold_available = False
        if bold_font:
            try:
                _add_ttf_font(pdf, "KoreanFont", "B", bold_font)
                bold_available = True
            except Exception:
                bold_available = False
        family = "KoreanFont"
    else:
        family = "Helvetica"
        bold_available = True

    heading_size = {1: 19, 2: 16, 3: 14, 4: 13, 5: 12, 6: 11}

    heading_count = 0
    paragraph_count = 0
    bullet_count = 0
    quote_count = 0
    table_row_count = 0
    code_line_count = 0
    image_count = 0
    missing_image_count = 0

    paragraph_lines = []
    in_code_block = False
    code_lines = []

    def flush_paragraph():
        nonlocal paragraph_lines
        if not paragraph_lines:
            return
        merged = " ".join(p.strip() for p in paragraph_lines if p.strip())
        paragraph_lines = []
        if not merged:
            return
        _set_font(pdf, family, size=11, bold=False, bold_available=bold_available)
        _mc(pdf, 0, 6, _strip_inline_md(merged))
        pdf.ln(1)
        nonlocal paragraph_count
        paragraph_count += 1

    def flush_code_block():
        nonlocal code_lines
        if not code_lines:
            return
        _set_font(pdf, family, size=10, bold=False, bold_available=bold_available)
        pdf.set_fill_color(245, 245, 245)
        nonlocal code_line_count
        for c in code_lines:
            _mc(pdf, 0, 5, c if c else " ", fill=True)
            code_line_count += 1
        pdf.ln(1)
        code_lines = []

    lines = markdown_text.splitlines()
    for raw in lines:
        line = raw.rstrip("\n")
        s = line.strip()

        if s.startswith("```"):
            flush_paragraph()
            if not in_code_block:
                in_code_block = True
                code_lines = []
            else:
                in_code_block = False
                flush_code_block()
            continue

        if in_code_block:
            code_lines.append(line)
            continue

        if s == "":
            flush_paragraph()
            continue

        h = re.match(r"^(#{1,6})\s+(.*)$", s)
        if h:
            flush_paragraph()
            level = len(h.group(1))
            text = _strip_inline_md(h.group(2))
            _set_font(pdf, family, size=heading_size[level], bold=True, bold_available=bold_available)
            _mc(pdf, 0, 8 if level <= 2 else 7, text)
            pdf.ln(1)
            heading_count += 1
            continue

        if re.match(r"^[-*_]{3,}$", s):
            flush_paragraph()
            y = pdf.get_y()
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.ln(3)
            continue

        image_path_raw = _extract_md_image_path(line)
        if image_path_raw and include_images:
            flush_paragraph()
            if image_path_raw.startswith("http://") or image_path_raw.startswith("https://"):
                _set_font(pdf, family, size=10, bold=False, bold_available=bold_available)
                _mc(pdf, 0, 6, f"[외부 이미지 URL] {image_path_raw}")
                pdf.ln(1)
                continue

            img_path = Path(image_path_raw)
            if not img_path.is_absolute():
                img_path = (base_dir / img_path).resolve()

            if img_path.exists():
                try:
                    max_w = pdf.w - pdf.l_margin - pdf.r_margin
                    pdf.image(str(img_path), w=max_w)
                    pdf.ln(2)
                    image_count += 1
                except Exception as e:
                    _set_font(pdf, family, size=10, bold=False, bold_available=bold_available)
                    _mc(pdf, 0, 6, f"[이미지 삽입 실패] {img_path.name}: {e}")
                    pdf.ln(1)
            else:
                _set_font(pdf, family, size=10, bold=False, bold_available=bold_available)
                _mc(pdf, 0, 6, f"[이미지 없음] {img_path}")
                pdf.ln(1)
                missing_image_count += 1
            continue

        uq = re.match(r"^(\s*)[-*+]\s+(.*)$", line)
        if uq:
            flush_paragraph()
            indent = min(len(uq.group(1)) // 2, 6)
            text = _strip_inline_md(uq.group(2))
            _set_font(pdf, family, size=11, bold=False, bold_available=bold_available)
            pdf.set_x(pdf.l_margin + indent * 5)
            w = pdf.w - pdf.r_margin - pdf.get_x()
            _mc(pdf, w, 6, f"- {text}")
            bullet_count += 1
            continue

        oq = re.match(r"^(\s*)(\d+)\.\s+(.*)$", line)
        if oq:
            flush_paragraph()
            indent = min(len(oq.group(1)) // 2, 6)
            idx = oq.group(2)
            text = _strip_inline_md(oq.group(3))
            _set_font(pdf, family, size=11, bold=False, bold_available=bold_available)
            pdf.set_x(pdf.l_margin + indent * 5)
            w = pdf.w - pdf.r_margin - pdf.get_x()
            _mc(pdf, w, 6, f"{idx}. {text}")
            bullet_count += 1
            continue

        if s.startswith(">"):
            flush_paragraph()
            quote_text = _strip_inline_md(re.sub(r"^>+\s?", "", s))
            _set_font(pdf, family, size=10, bold=False, bold_available=bold_available)
            pdf.set_x(pdf.l_margin + 4)
            w = pdf.w - pdf.r_margin - pdf.get_x()
            _mc(pdf, w, 6, f"| {quote_text}")
            pdf.ln(1)
            quote_count += 1
            continue

        # markdown 테이블은 단순 텍스트 행으로 변환
        if "|" in s:
            sep_row = re.match(r"^\|?\s*[: -]+(\|[: -]+)+\s*\|?$", s)
            if sep_row:
                continue
            flush_paragraph()
            cols = [c.strip() for c in s.strip("|").split("|")]
            text = " | ".join(_strip_inline_md(c) for c in cols)
            _set_font(pdf, family, size=10, bold=False, bold_available=bold_available)
            _mc(pdf, 0, 6, text)
            table_row_count += 1
            continue

        paragraph_lines.append(line)

    flush_paragraph()
    if in_code_block:
        flush_code_block()

    output_path = Path(output_pdf).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output_path))
    print(
        f"[render] headings={heading_count}, paragraphs={paragraph_count}, bullets={bullet_count}, "
        f"quotes={quote_count}, table_rows={table_row_count}, code_lines={code_line_count}, "
        f"images={image_count}, missing_images={missing_image_count}"
    )
    return output_path

