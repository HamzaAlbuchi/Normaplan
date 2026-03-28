#!/usr/bin/env python3
"""
Reads JSON report payload from stdin, writes PDF bytes to stdout.
Requires: pip install -r requirements.txt (reportlab)

Optional: place Syne / Fraunces / DM Mono .ttf files under pdf_report/fonts/
for closer brand match; otherwise Helvetica + Courier are used.
"""

from __future__ import annotations

import json
import sys
import uuid
from xml.sax.saxutils import escape

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from colors import (
    C_AMBER_SOFT,
    C_AMBER,
    C_BG,
    C_BG2,
    C_BORDER,
    C_BORDER2,
    C_CARD,
    C_HERO_TITLE,
    C_INK,
    C_INK2,
    C_INK3,
    C_ON_DARK_MUTED,
    C_ON_DARK_SECONDARY,
    C_RED_SOFT,
    C_RED,
    C_SIDE,
    C_STAT_CELL_BG,
    C_STAT_CELL_BORDER,
    C_WHITE,
)


def _register_fonts() -> tuple[str, str]:
    import os

    base = os.path.join(os.path.dirname(__file__), "fonts")
    sans, mono = "Helvetica", "Courier"
    dm = os.path.join(base, "DMMono-Regular.ttf")
    if os.path.isfile(dm):
        pdfmetrics.registerFont(TTFont("DMMono", dm))
        mono = "DMMono"
    syne = os.path.join(base, "Syne-SemiBold.ttf")
    if os.path.isfile(syne):
        pdfmetrics.registerFont(TTFont("SyneSemi", syne))
        sans = "SyneSemi"
    fr = os.path.join(base, "Fraunces_72pt-SemiBold.ttf")
    if not os.path.isfile(fr):
        fr = os.path.join(base, "Fraunces-SemiBold.ttf")
    if os.path.isfile(fr):
        pdfmetrics.registerFont(TTFont("FrauncesSemi", fr))
    return sans, mono


SANS, MONO = _register_fonts()


def _esc(s: object) -> str:
    return escape(str(s if s is not None else ""))


def _para(text: str, style: ParagraphStyle) -> Paragraph:
    inner = "<br/>".join(_esc(text).split("\n"))
    return Paragraph(inner, style)


def _sans_bold_name() -> str:
    return f"{SANS}-Bold" if SANS == "Helvetica" else SANS


def _hero_title_font() -> str:
    names = pdfmetrics.getRegisteredFontNames()
    return "FrauncesSemi" if "FrauncesSemi" in names else "Helvetica-Bold"


def _make_styles():
    base = getSampleStyleSheet()
    tiny_mono = ParagraphStyle(
        "tiny_mono",
        parent=base["Normal"],
        fontName=MONO,
        fontSize=8,
        leading=10,
        textColor=C_INK3,
    )
    mono_9 = ParagraphStyle(
        "mono9",
        parent=base["Normal"],
        fontName=MONO,
        fontSize=9,
        leading=12,
        textColor=C_INK2,
    )
    eyebrow = ParagraphStyle(
        "eyebrow",
        parent=base["Normal"],
        fontName=MONO,
        fontSize=8,
        leading=10,
        textColor=C_ON_DARK_MUTED,
        spaceAfter=6,
        letterSpacing=1.5,
    )
    hero_title = ParagraphStyle(
        "hero_title",
        parent=base["Normal"],
        fontName=_hero_title_font(),
        fontSize=22,
        leading=26,
        textColor=C_HERO_TITLE,
        spaceAfter=8,
    )
    hero_sub = ParagraphStyle(
        "hero_sub",
        parent=base["Normal"],
        fontName=MONO,
        fontSize=9,
        leading=13,
        textColor=C_ON_DARK_SECONDARY,
        spaceAfter=12,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=base["Normal"],
        fontName=_sans_bold_name(),
        fontSize=11,
        leading=14,
        textColor=C_INK,
        spaceBefore=14,
        spaceAfter=8,
    )
    h3 = ParagraphStyle(
        "h3",
        parent=base["Normal"],
        fontName=_sans_bold_name(),
        fontSize=10,
        leading=13,
        textColor=C_INK2,
        spaceBefore=10,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        "body",
        parent=base["Normal"],
        fontName="Helvetica" if SANS == "Helvetica" else SANS,
        fontSize=10,
        leading=14,
        textColor=C_INK,
    )
    small = ParagraphStyle(
        "small",
        parent=base["Normal"],
        fontName="Helvetica" if SANS == "Helvetica" else SANS,
        fontSize=9,
        leading=12,
        textColor=C_INK2,
    )
    return {
        "tiny_mono": tiny_mono,
        "mono9": mono_9,
        "eyebrow": eyebrow,
        "hero_title": hero_title,
        "hero_sub": hero_sub,
        "h2": h2,
        "h3": h3,
        "body": body,
        "small": small,
    }


def _stat_cell(val: str, label: str, styles: dict, val_color: object) -> Table:
    sid = uuid.uuid4().hex[:10]
    val_style = ParagraphStyle(
        f"statval_{sid}",
        parent=styles["body"],
        fontName=_hero_title_font(),
        fontSize=18,
        leading=22,
        textColor=val_color,
        alignment=TA_CENTER,
    )
    lab_style = ParagraphStyle(
        f"statlab_{sid}",
        parent=styles["tiny_mono"],
        alignment=TA_CENTER,
        fontSize=7,
        leading=9,
        textColor=C_ON_DARK_MUTED,
    )
    inner = Table(
        [
            [Paragraph(_esc(val), val_style)],
            [Paragraph(_esc(label.upper()), lab_style)],
        ],
        colWidths=[36 * mm],
    )
    inner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), C_STAT_CELL_BG),
                ("BOX", (0, 0), (-1, -1), 0.5, C_STAT_CELL_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    return inner


def _hero_block(payload: dict, styles: dict) -> Table:
    meta = payload.get("checkedAtDe") or ""
    eyebrow_txt = f"BAUPILOT · PRÜFBERICHT · {meta}"
    plan_title = payload.get("planName") or "Plan"
    sub = f'{payload.get("planFileName") or ""} · ID {payload.get("runId") or ""}'

    hero_plan = ParagraphStyle(
        "hero_plan",
        parent=styles["hero_title"],
        fontSize=14,
        leading=18,
        spaceAfter=6,
    )

    c = payload.get("counts") or {}
    stats_row = Table(
        [
            [
                _stat_cell(str(c.get("total", 0)), "Befunde gesamt", styles, C_HERO_TITLE),
                _stat_cell(str(c.get("error", 0)), "Kritisch", styles, C_RED),
                _stat_cell(str(c.get("warning", 0)), "Warnungen", styles, C_AMBER),
                _stat_cell(str(c.get("info", 0)), "Hinweise", styles, C_HERO_TITLE),
            ]
        ],
        colWidths=[40 * mm, 40 * mm, 40 * mm, 40 * mm],
    )
    stats_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))

    block = Table(
        [
            [_para(eyebrow_txt, styles["eyebrow"])],
            [_para("Prüfbericht", styles["hero_title"])],
            [_para(plan_title, hero_plan)],
            [_para(sub, styles["hero_sub"])],
            [stats_row],
        ],
        colWidths=[170 * mm],
    )
    block.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), C_SIDE),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    return block


def _sev_row_bg(sev_key: str) -> object:
    if sev_key == "error":
        return C_RED_SOFT
    if sev_key == "warning":
        return C_AMBER_SOFT
    return C_BG2


def _build_footer_canvas(payload: dict):
    gen = payload.get("generatedAtDe") or ""

    def _foot(canv: canvas.Canvas, doc):
        canv.saveState()
        canv.setFont(MONO, 7)
        canv.setFillColor(C_INK3)
        txt = f"Erstellt am {gen} · BauPilot Prüfbericht"
        canv.drawCentredString(A4[0] / 2, 12 * mm, txt)
        canv.restoreState()

    return _foot


def build_story(payload: dict) -> list:
    styles = _make_styles()
    story: list = []

    story.append(_hero_block(payload, styles))
    story.append(Spacer(1, 5 * mm))

    disc = payload.get("disclaimer") or ""
    disc_box = Table([[Paragraph(_esc(disc), styles["mono9"])]], colWidths=[170 * mm])
    disc_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), C_CARD),
                ("BOX", (0, 0), (-1, -1), 0.75, C_BORDER2),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(disc_box)
    story.append(Spacer(1, 5 * mm))

    top = payload.get("topFindings") or []
    if top:
        story.append(_para("Top Handlungsfelder", styles["h2"]))
        th = ["Nr.", "Kategorie", "Regel", "Quelle", "Schwere", "Anz."]
        if not any(r.get("sourceBadge") for r in top):
            th = [c for c in th if c != "Quelle"]
        rows = [th]
        for i, r in enumerate(top, start=1):
            row = [
                str(i),
                r.get("category") or "",
                r.get("ruleName") or "",
            ]
            if "Quelle" in th:
                row.append(r.get("sourceBadge") or "")
            row.append(r.get("severityLabel") or "")
            row.append(str(r.get("count", "")))
            rows.append(row)
        wf = (
            [11 * mm, 34 * mm, 54 * mm, 26 * mm, 24 * mm, 15 * mm]
            if "Quelle" in th
            else [12 * mm, 42 * mm, 66 * mm, 26 * mm, 16 * mm]
        )
        t = Table(rows, colWidths=wf)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), C_WHITE),
                    ("FONTNAME", (0, 0), (-1, 0), _sans_bold_name()),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("FONTNAME", (0, 1), (-1, -1), MONO),
                    ("TEXTCOLOR", (0, 0), (-1, -1), C_INK),
                    ("GRID", (0, 0), (-1, -1), 0.5, C_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_CARD, C_BG]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 4 * mm))

    steps = payload.get("nextSteps") or []
    if steps:
        story.append(_para("Empfohlene nächste Schritte", styles["h2"]))
        for s in steps:
            story.append(Paragraph("• " + _esc(s), styles["mono9"]))
        story.append(Spacer(1, 4 * mm))

    summary = payload.get("summaryRows") or []
    if summary:
        story.append(_para("Übersicht nach Kategorie", styles["h2"]))
        rows = [["Kategorie", "Kritisch", "Warnung", "Hinweis"]]
        for r in summary:
            rows.append(
                [
                    r.get("category") or "",
                    str(r.get("error", 0)),
                    str(r.get("warning", 0)),
                    str(r.get("info", 0)),
                ]
            )
        t = Table(rows, colWidths=[70 * mm, 25 * mm, 25 * mm, 25 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), C_WHITE),
                    ("FONTNAME", (0, 0), (-1, 0), _sans_bold_name()),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("FONTNAME", (0, 1), (-1, -1), MONO),
                    ("GRID", (0, 0), (-1, -1), 0.5, C_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_CARD, C_BG]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(t)

    story.append(PageBreak())
    story.append(_para("Detaillierte Befunde", styles["h2"]))
    story.append(_para(payload.get("detailIntro") or "", styles["small"]))
    story.append(Spacer(1, 3 * mm))

    for sec in payload.get("detailSections") or []:
        sev_key = sec.get("severityKey") or "info"
        story.append(_para(sec.get("severityLabel") or "", styles["h3"]))
        drows = sec.get("rows") or []
        if not drows:
            story.append(_para("—", styles["mono9"]))
            continue
        has_src = any(x.get("sourceBadge") for x in drows)
        head = ["Regel", "Kategorie"]
        if has_src:
            head.append("Quelle")
        head.extend(["Anz.", "Wert / Soll", "Erklärung", "Vorschlag"])
        rows = [head]
        for x in drows:
            line = [x.get("ruleName") or "", x.get("category") or ""]
            if has_src:
                line.append(x.get("sourceBadge") or "—")
            line.extend(
                [
                    str(x.get("count", "")),
                    x.get("valueText") or "—",
                    x.get("message") or "",
                    x.get("suggestion") or "—",
                ]
            )
            rows.append(line)
        col_w = [32 * mm, 28 * mm]
        if has_src:
            col_w.append(22 * mm)
        col_w.extend([12 * mm, 22 * mm, 38 * mm, 28 * mm])
        t = Table(rows, colWidths=col_w, repeatRows=1)
        st = [
            ("BACKGROUND", (0, 0), (-1, 0), C_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), _sans_bold_name()),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("FONTNAME", (0, 1), (-1, -1), MONO),
            ("TEXTCOLOR", (0, 0), (-1, -1), C_INK),
            ("GRID", (0, 0), (-1, -1), 0.35, C_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
        ]
        for ri in range(1, len(rows)):
            st.append(("BACKGROUND", (0, ri), (-1, ri), _sev_row_bg(sev_key)))
        t.setStyle(TableStyle(st))
        story.append(t)
        story.append(Spacer(1, 4 * mm))

    story.append(Spacer(1, 4 * mm))
    story.append(_para("Methodik & Hinweis", styles["h2"]))
    story.append(_para(payload.get("methodology") or "", styles["mono9"]))

    appendix = payload.get("appendixRows") or []
    if appendix:
        story.append(PageBreak())
        story.append(_para("Anhang: Betroffene Elemente", styles["h2"]))
        rows = [["Element-ID", "Zugehörige Befunde"]]
        for a in appendix:
            rows.append([a.get("elementId") or "", a.get("findingsText") or ""])
        t = Table(rows, colWidths=[40 * mm, 110 * mm], repeatRows=1)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), C_WHITE),
                    ("FONTNAME", (0, 0), (-1, 0), _sans_bold_name()),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("FONTNAME", (0, 1), (-1, -1), MONO),
                    ("GRID", (0, 0), (-1, -1), 0.5, C_BORDER),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_CARD, C_BG]),
                ]
            )
        )
        story.append(t)

    return story


def run(stdin_bytes: bytes) -> bytes:
    payload = json.loads(stdin_bytes.decode("utf-8"))
    buf = sys.stdout.buffer if hasattr(sys.stdout, "buffer") else None
    if buf is None:
        raise RuntimeError("Need binary stdout")

    from io import BytesIO

    out = BytesIO()
    doc = SimpleDocTemplate(
        out,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=18 * mm,
        title="BauPilot Prüfbericht",
        onFirstPage=_build_footer_canvas(payload),
        onLaterPages=_build_footer_canvas(payload),
    )
    doc.build(build_story(payload))
    return out.getvalue()


def main():
    data = sys.stdin.buffer.read()
    pdf = run(data)
    sys.stdout.buffer.write(pdf)


if __name__ == "__main__":
    main()
