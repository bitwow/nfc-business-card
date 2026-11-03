#!/usr/bin/env python3
"""Rebuild the education block using the source PDF's embedded Aptos fonts."""

from pathlib import Path
import re

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ByteStringObject,
    ContentStream,
    FloatObject,
    NameObject,
    NumberObject,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/Users/bitwow/Downloads/Дмитрий_Васильев_CV_2026_актуальное.pdf")
OUTPUT = ROOT / "output/pdf/Дмитрий_Васильев_CV_2026.pdf"

BLUE = (0.086275, 0.294118, 0.45098)
DARK = (0.145098, 0.156863, 0.168627)


def cmap_encoder(font_object):
    cmap = font_object.get_object()["/ToUnicode"].get_object().get_data().decode("ascii")
    reverse = {
        chr(int(unicode_hex, 16)): bytes.fromhex(code_hex)
        for code_hex, unicode_hex in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", cmap)
        if int(unicode_hex, 16) != 0
    }

    def encode(text: str) -> ByteStringObject:
        missing = sorted(set(text) - reverse.keys())
        if missing:
            raise ValueError(f"Characters absent from embedded font: {missing}")
        return ByteStringObject(b"".join(reverse[character] for character in text))

    return encode


def numbers(values):
    result = []
    for value in values:
        result.append(NumberObject(value) if isinstance(value, int) else FloatObject(value))
    return result


def text_block(x, baseline, font, size, color, lines, encode, leading=10.45):
    operations = [
        ([], b"q"),
        (numbers(color), b"rg"),
        ([], b"BT"),
        (numbers([1, 0, 0, 1, x, baseline]), b"Tm"),
        ([NameObject(font), FloatObject(size)], b"Tf"),
        ([FloatObject(leading)], b"TL"),
    ]
    for index, line in enumerate(lines):
        operations.append(([encode(line)], b"Tj"))
        if index != len(lines) - 1:
            operations.append(([], b"T*"))
    operations.extend([([], b"ET"), ([], b"Q")])
    return operations


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(SOURCE)
    page = reader.pages[2]
    fonts = page["/Resources"]["/Font"]
    encode_regular = cmap_encoder(fonts["/F3+0"])
    encode_bold = cmap_encoder(fonts["/F2+0"])

    content = ContentStream(page.get_contents(), reader)

    # The source education heading and rule end at operation 505. Replacing the
    # remaining operations avoids overlays and keeps hidden text out of the PDF.
    operations = content.operations[:506]
    operations += text_block(
        41,
        158.9,
        "/F2+0",
        8.85,
        BLUE,
        ["Основное образование"],
        encode_bold,
    )
    operations += text_block(
        41,
        148.25,
        "/F3+0",
        8.35,
        DARK,
        [
            "Магистратура, Университет ИТМО: 09.03.04 «Программная инженерия», 2023-2025. Диплом «с отличием».",
            "Бакалавриат: 11.03.02 «Инфокоммуникационные технологии и системы связи», 2019-2023.",
        ],
        encode_regular,
    )
    operations += text_block(
        41,
        120.8,
        "/F2+0",
        8.85,
        BLUE,
        ["Университет ИТМО"],
        encode_bold,
    )
    operations += text_block(
        41,
        110.15,
        "/F3+0",
        8.35,
        DARK,
        [
            "Профессиональная переподготовка: «Технологии анализа данных», 2024-2025. Квалификация «специалист по большим данным»; право на",
            "ведение профессиональной деятельности в сфере аналитики данных в соответствии с профессиональным стандартом 06.042 «Специалист",
            "по большим данным».",
        ],
        encode_regular,
    )
    operations += text_block(
        41,
        72.1,
        "/F2+0",
        8.85,
        BLUE,
        ["Санкт-Петербургский политехнический университет Петра Великого"],
        encode_bold,
    )
    operations += text_block(
        41,
        61.45,
        "/F3+0",
        8.35,
        DARK,
        ["Повышение квалификации: «Технологии киберфизических систем», 2023."],
        encode_regular,
    )

    content.operations = operations
    page[NameObject("/Contents")] = content

    writer = PdfWriter()
    writer.append_pages_from_reader(reader)
    writer.add_metadata(reader.metadata or {})
    with OUTPUT.open("wb") as handle:
        writer.write(handle)
    print(OUTPUT)


if __name__ == "__main__":
    main()
