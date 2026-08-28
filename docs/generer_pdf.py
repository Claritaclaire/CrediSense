from pathlib import Path
import re

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "GUIDE_APPLICATION_CREDISENSE.md"
OUTPUT = ROOT / "GUIDE_APPLICATION_CREDISENSE.pdf"


def inline_markup(text: str) -> str:
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def build_story():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CoverTitle", parent=styles["Title"], alignment=TA_CENTER,
        fontName="Helvetica-Bold", fontSize=24, leading=30, textColor="#312e81",
        spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name="CoverSubtitle", parent=styles["Normal"], alignment=TA_CENTER,
        fontSize=12, leading=18, textColor="#64748b", spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="H1Custom", parent=styles["Heading1"], fontName="Helvetica-Bold",
        fontSize=17, leading=21, textColor="#312e81", spaceBefore=14, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="H2Custom", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=12, leading=16, textColor="#4338ca", spaceBefore=10, spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="BodyCustom", parent=styles["BodyText"], fontSize=9.5, leading=14,
        textColor="#1f2937", spaceAfter=5,
    ))
    styles.add(ParagraphStyle(
        name="BulletCustom", parent=styles["BodyText"], leftIndent=14, firstLineIndent=-8,
        bulletIndent=3, fontSize=9.5, leading=14, textColor="#1f2937", spaceAfter=3,
    ))
    styles.add(ParagraphStyle(
        name="NoteCustom", parent=styles["BodyText"], backColor="#fff7ed",
        borderColor="#f59e0b", borderWidth=0.5, borderPadding=7, fontSize=9,
        leading=13, spaceBefore=5, spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="CodeCustom", parent=styles["Code"], fontName="Courier",
        fontSize=7.5, leading=10, backColor="#f1f5f9", borderPadding=6,
        leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=7,
    ))

    story = [
        Spacer(1, 45 * mm),
        Paragraph("CrediSense", styles["CoverTitle"]),
        Paragraph("Guide de presentation et de fonctionnement", styles["CoverSubtitle"]),
        Spacer(1, 8 * mm),
        Paragraph("Application de simulation, comparaison et demande de credit", styles["CoverSubtitle"]),
        Spacer(1, 18 * mm),
        Paragraph("Document prepare pour expliquer l'application a un interlocuteur metier ou technique.", styles["CoverSubtitle"]),
        PageBreak(),
    ]

    in_code = False
    code_lines = []
    for raw_line in SOURCE.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        if line.startswith("```"):
            if in_code:
                story.append(Preformatted("\n".join(code_lines), styles["CodeCustom"]))
                code_lines = []
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue
        if not line:
            story.append(Spacer(1, 2))
        elif line.startswith("# "):
            continue
        elif line.startswith("## "):
            story.append(Paragraph(inline_markup(line[3:]), styles["H1Custom"]))
        elif line.startswith("### "):
            story.append(Paragraph(inline_markup(line[4:]), styles["H2Custom"]))
        elif line.startswith("- "):
            story.append(Paragraph(inline_markup(line[2:]), styles["BulletCustom"], bulletText="•"))
        elif line.startswith("**") and line.endswith("**"):
            story.append(Paragraph(inline_markup(line), styles["H2Custom"]))
        elif line.startswith("`") and line.endswith("`"):
            story.append(Preformatted(line.strip("`"), styles["CodeCustom"]))
        else:
            style = styles["NoteCustom"] if "ne remplace pas" in line or "secrets" in line.lower() else styles["BodyCustom"]
            story.append(Paragraph(inline_markup(line), style))
    return story


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColorRGB(0.39, 0.45, 0.55)
    canvas.drawString(18 * mm, 12 * mm, "CrediSense - Guide de fonctionnement")
    canvas.drawRightString(192 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    document = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=18 * mm,
        title="CrediSense - Guide de presentation",
        author="CrediSense",
    )
    document.build(build_story(), onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(OUTPUT)


if __name__ == "__main__":
    main()
