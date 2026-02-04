import pdfplumber
import re

def parse_invoice_pdf(file):
    items = []
    shop_name = None
    invoice_no = None

    with pdfplumber.open(file) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() + "\n"

    # Extract shop
    shop_match = re.search(r"BILL TO\s+(.*?)\n", text)
    if shop_match:
        shop_name = shop_match.group(1).strip()

    # Extract invoice number
    inv_match = re.search(r"INVOICE\s+(GPM-\d+)", text)
    if inv_match:
        invoice_no = inv_match.group(1)

    # Extract items (lines with GPM code)
    lines = text.split("\n")
    for line in lines:
        parts = line.split()

        if len(parts) >= 5 and parts[0].isdigit():
            try:
                gpm_code = parts[0]
                item_code = parts[1]
                qty = int(parts[-3])
                rate = float(parts[-2])

                items.append({
                    "item_code": item_code,
                    "qty": qty,
                    "rate": rate
                })
            except:
                continue

    return shop_name, invoice_no, items
