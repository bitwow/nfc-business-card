#!/usr/bin/env python3
"""Create the public CV PDF with the requested education edits."""

from pathlib import Path

import pymupdf


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/bitwow/Downloads/Дмитрий_Васильев_CV_2026_актуальное.pdf")
OUTPUT = ROOT / "output/pdf/Дмитрий_Васильев_CV_2026.pdf"
TMP = ROOT / "tmp/pdfs"
REGULAR_FONT = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
BOLD_FONT = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    document = pymupdf.open(SOURCE)
    page = document[2]

    # This deletes the original text from the content stream instead of merely
    # hiding it under a white rectangle.
    page.add_redact_annot(pymupdf.Rect(277.5, 636.0, 570.0, 647.2), fill=(1, 1, 1))
    page.add_redact_annot(pymupdf.Rect(39.0, 728.8, 570.0, 751.2), fill=(1, 1, 1))
    page.apply_redactions()

    page.insert_text(
        pymupdf.Point(279.2, 644.7),
        "Диплом магистратуры «с отличием».",
        fontsize=8.35,
        fontname="arial-regular",
        fontfile=str(REGULAR_FONT),
    )
    page.insert_text(
        pymupdf.Point(41.0, 737.7),
        "Бакалавриат",
        fontsize=8.85,
        fontname="arial-bold",
        fontfile=str(BOLD_FONT),
    )
    page.insert_text(
        pymupdf.Point(41.0, 748.3),
        "11.03.02 «Инфокоммуникационные технологии и системы связи», 2019-2023.",
        fontsize=8.35,
        fontname="arial-regular",
        fontfile=str(REGULAR_FONT),
    )

    document.save(OUTPUT, garbage=4, deflate=True, clean=True)
    document.close()
    print(OUTPUT)


if __name__ == "__main__":
    main()
