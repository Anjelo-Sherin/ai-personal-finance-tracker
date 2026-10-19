"""Regex and CSV parser for noisy Indian UPI/SMS bank alerts and bank statement CSVs."""
import csv
import io
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional

# Regex patterns for extracting amounts in Indian Rupee formats:
# Matches: Rs. 485.00, INR 1,249.50, ₹350, Rs 2500, INR.12,400.00
AMOUNT_PATTERNS = [
    re.compile(
        r"(?:rs\.?|inr\.?|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)",
        re.IGNORECASE,
    ),
    re.compile(
        r"([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+\.[0-9]{2})\s*(?:rs\.?|inr|₹|debited|credited|spent|paid)",
        re.IGNORECASE,
    ),
]

# Regex patterns for dates: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-Mon-YY, DD Mon YYYY
DATE_PATTERNS = [
    (re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"), ["%Y-%m-%d"]),
    (re.compile(r"\b(\d{2}[-/]\d{2}[-/]\d{4})\b"), ["%d-%m-%Y", "%d/%m/%Y"]),
    (re.compile(r"\b(\d{2}[-/]\d{2}[-/]\d{2})\b"), ["%d-%m-%y", "%d/%m/%y"]),
    (
        re.compile(
            r"\b(\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]\d{2,4})\b",
            re.IGNORECASE,
        ),
        ["%d-%b-%Y", "%d %b %Y", "%d-%b-%y", "%d %b %y", "%d %B %Y"],
    ),
]

# Reference / UTR ID extraction
REF_PATTERN = re.compile(
    r"(?:ref(?:\s*no\.?|\s*id)?|utr|txn(?:\s*id)?|upi\s*ref)[:\s#-]*([A-Za-z0-9]{6,20})|upi/(\d{8,16})/",
    re.IGNORECASE,
)

# Merchant extraction patterns from structured SMS/UPI strings
MERCHANT_PATTERNS = [
    # UPI/328910421/DR/ZOMATO MEDIA/HDFC or UPI-41239912-SWIGGY*ORDER 8812
    re.compile(r"UPI[/\-]\d{6,16}[/\-](?:DR[/\-]|CR[/\-])?([A-Za-z0-9\*\.\-\s&']{3,45}?)(?:[/\-]|$|\s+on\b|\s+ref\b)", re.IGNORECASE),
    # "to VPA zomato@hdfcbank (ZOMATO MEDIA)" or "to SWIGGY*ORDER 8812 on" or "at POS NETFLIX.COM on"
    re.compile(
        r"(?:paid\s+to|sent\s+to|debited\s+to|spent\s+at|purchase\s+at|at\s+pos|towards|to\s+vpa|trf\s+to|credited\s+by|from|to|at)\s+([A-Za-z0-9\*\.\-_@&\s]{3,48}?)(?:\s+on\s+\d|\s+dated|\s+via\s+|\s+ref\b|\s+utr\b|\s+avl\s+bal|\.\s*avl|\.$|$)",
        re.IGNORECASE,
    ),
    # Explicit merchant token with asterisk like SWIGGY*ORDER 8812, AMZN*MKTP IN, UBER*TRIP
    re.compile(r"\b([A-Za-z]{3,18}\*[A-Za-z0-9\s\-_]{2,25})\b"),
]

CREDIT_KEYWORDS = re.compile(
    r"\b(credited|received|refund|cashback|salary|neft[\-\s]cr|imps[\-\s]cr|dividend|deposit)\b",
    re.IGNORECASE,
)
DEBIT_KEYWORDS = re.compile(
    r"\b(debited|spent|paid|sent|withdrawn|purchase|charged|auto[\-\s]?debit|ach[\-\s]?d|dr)\b",
    re.IGNORECASE,
)

NOISE_TOKENS = re.compile(
    r"(?:\b(?:order|ord|txn|ref|utr|id|no|pos|vpa|upi|imps|neft|ach|dr|cr|pvt|ltd|india|ind|blr|mum|del|hyd|chn)\b|\b\d{3,16}\b|@[a-z0-9]+|x{4,}\d{2,4})",
    re.IGNORECASE,
)


def normalize_merchant_name(raw_merchant: str) -> str:
    """Clean a noisy UPI/POS merchant string into a canonical merchant token."""
    if not raw_merchant:
        return "UNKNOWN MERCHANT"
    cleaned = raw_merchant.upper().strip()
    # Replace separators like *, /, _, - with spaces
    cleaned = re.sub(r"[\*/_\-\|]+", " ", cleaned)
    # Remove card masks and noise numbers/tokens
    cleaned = NOISE_TOKENS.sub(" ", cleaned)
    # Remove punctuation except dot/ampersand
    cleaned = re.sub(r"[^A-Z0-9&\.\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) < 2:
        fallback = re.sub(r"[^A-Za-z0-9]", " ", raw_merchant.upper()).strip()
        return fallback[:32] if fallback else "GENERAL MERCHANT"
    # Keep first 3 meaningful words for grouping
    words = [w for w in cleaned.split(" ") if len(w) >= 2 or w in {"HP", "VI"}]
    return " ".join(words[:3]) if words else cleaned[:32]


def detect_channel(text: str) -> str:
    """Detect payment channel from raw SMS/statement text."""
    upper = text.upper()
    if "UPI" in upper or "VPA" in upper or "@" in upper:
        return "UPI"
    if "POS" in upper or "CARD" in upper or "VISA" in upper or "MASTERCARD" in upper:
        return "POS/Card"
    if "ACH" in upper or "MANDATE" in upper or "AUTO-DEBIT" in upper or "SI " in upper:
        return "ACH/Auto-Debit"
    if "NEFT" in upper or "IMPS" in upper or "RTGS" in upper:
        return "NEFT/IMPS"
    if "ATM" in upper or "CASH WDL" in upper:
        return "ATM"
    return "UPI"


def extract_date(text: str, default_date: Optional[str] = None) -> str:
    """Extract YYYY-MM-DD date from raw text or return today's date."""
    for pattern, fmts in DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            raw_d = re.sub(r"\s+", " ", match.group(1).strip())
            for fmt in fmts:
                try:
                    dt = datetime.strptime(raw_d, fmt).date()
                    if dt.year < 100:
                        dt = dt.replace(year=dt.year + 2000)
                    return dt.isoformat()
                except ValueError:
                    continue
    return default_date or date.today().isoformat()


def extract_amount(text: str) -> Optional[float]:
    """Extract numeric transaction amount from raw SMS or statement line."""
    for pat in AMOUNT_PATTERNS:
        m = pat.search(text)
        if m:
            raw_val = m.group(1).replace(",", "").strip()
            try:
                val = float(raw_val)
                if val > 0:
                    return round(val, 2)
            except ValueError:
                continue
    # Fallback: look for standalone number when text is a short merchant + amount line
    fallback = re.findall(r"\b(\d{2,7}(?:\.\d{1,2})?)\b", text)
    for num_str in fallback:
        val = float(num_str)
        # Skip 4-digit years like 2025, 2026 if there are other numbers
        if 2020 <= val <= 2030 and len(fallback) > 1:
            continue
        if 1.0 <= val <= 5000000.0:
            return round(val, 2)
    return None


def extract_merchant(text: str) -> str:
    """Extract raw merchant substring from SMS alert or bank narration."""
    for pat in MERCHANT_PATTERNS:
        m = pat.search(text)
        if m:
            candidate = m.group(1).strip(" .,-:/")
            # Strip trailing noise like "Avl Bal" or "Not you?"
            candidate = re.split(
                r"\s+(?:avl|bal|not\s+you|call|sms|block|ref|utr|on\s+\d)\b",
                candidate,
                flags=re.IGNORECASE,
            )[0].strip()
            if len(candidate) >= 2:
                return candidate[:120]

    # If the user pasted a direct merchant string like "SWIGGY*ORDER 8812 Rs 450"
    cleaned = re.sub(
        r"(?:rs\.?|inr\.?|₹)\s*[0-9,]+(?:\.[0-9]{1,2})?",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\b\d{2}[-/]\d{2}[-/]\d{2,4}\b", " ", cleaned)
    cleaned = re.sub(
        r"\b(debited|credited|from|your|a/c|acct|account|bank|hdfc|icici|sbi|axis|kotak|via|upi|ref|utr|avl|bal)\b",
        " ",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"x{2,}\d{2,6}", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .,-:")
    return cleaned[:120] if len(cleaned) >= 2 else "GENERAL MERCHANT"


def parse_sms_text(raw_text: str, default_date: Optional[str] = None) -> Dict[str, Any]:
    """Parse a single bank SMS / UPI alert or narration string into structured fields."""
    line = raw_text.strip()
    amount = extract_amount(line) or 0.0
    tx_date = extract_date(line, default_date=default_date)
    merchant = extract_merchant(line)
    normalized = normalize_merchant_name(merchant)
    channel = detect_channel(line)

    is_credit = bool(CREDIT_KEYWORDS.search(line)) and not bool(DEBIT_KEYWORDS.search(line))
    tx_type = "credit" if is_credit else "debit"

    ref_match = REF_PATTERN.search(line)
    ref_id = None
    if ref_match:
        ref_id = (ref_match.group(1) or ref_match.group(2) or "").strip() or None

    return {
        "raw_text": line,
        "tx_date": tx_date,
        "merchant": merchant,
        "normalized_merchant": normalized,
        "amount": amount,
        "tx_type": tx_type,
        "channel": channel,
        "reference_id": ref_id,
    }


def parse_sms_batch(text_block: str) -> List[Dict[str, Any]]:
    """Parse multiple newline-separated SMS/UPI alert strings."""
    results: List[Dict[str, Any]] = []
    for raw_line in text_block.splitlines():
        stripped = raw_line.strip()
        if not stripped or len(stripped) < 4:
            continue
        parsed = parse_sms_text(stripped)
        if parsed["amount"] > 0:
            results.append(parsed)
    return results


def parse_csv_bytes(content: bytes) -> List[Dict[str, Any]]:
    """Parse uploaded bank statement CSV bytes into structured transaction dicts.

    Supports flexible column headers:
    - Date / Txn Date / Value Date / date / tx_date
    - Description / Narration / Particulars / Merchant / Remarks / raw_text
    - Amount / Debit / Withdrawal / Credit / Deposit
    - Type / Dr/Cr / tx_type
    """
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows: List[Dict[str, Any]] = []

    for row in reader:
        if not row:
            continue
        norm_row = {str(k).strip().lower(): (v or "").strip() for k, v in row.items() if k}

        # 1. Extract date
        raw_date = (
            norm_row.get("date")
            or norm_row.get("tx_date")
            or norm_row.get("txn date")
            or norm_row.get("transaction date")
            or norm_row.get("value date")
            or ""
        )
        tx_date = extract_date(raw_date) if raw_date else date.today().isoformat()

        # 2. Extract description / merchant
        narration = (
            norm_row.get("description")
            or norm_row.get("narration")
            or norm_row.get("particulars")
            or norm_row.get("merchant")
            or norm_row.get("remarks")
            or norm_row.get("raw_text")
            or ""
        )

        # 3. Extract amount & debit/credit type
        amount = 0.0
        tx_type = norm_row.get("tx_type") or norm_row.get("type") or norm_row.get("dr/cr") or ""
        tx_type = tx_type.lower().strip()

        amt_str = norm_row.get("amount") or norm_row.get("txn amount") or ""
        debit_str = norm_row.get("debit") or norm_row.get("withdrawal") or norm_row.get("dr") or ""
        credit_str = norm_row.get("credit") or norm_row.get("deposit") or norm_row.get("cr") or ""

        def _to_float(s: str) -> float:
            cleaned = re.sub(r"[^0-9\.-]", "", s)
            try:
                return abs(float(cleaned)) if cleaned else 0.0
            except ValueError:
                return 0.0

        if debit_str and _to_float(debit_str) > 0:
            amount = _to_float(debit_str)
            tx_type = "debit"
        elif credit_str and _to_float(credit_str) > 0:
            amount = _to_float(credit_str)
            tx_type = "credit"
        elif amt_str and _to_float(amt_str) > 0:
            amount = _to_float(amt_str)
            if tx_type in {"cr", "credit", "c"} or CREDIT_KEYWORDS.search(narration):
                tx_type = "credit"
            else:
                tx_type = "debit"
        else:
            parsed_fallback = parse_sms_text(narration, default_date=tx_date)
            amount = parsed_fallback["amount"]
            tx_type = parsed_fallback["tx_type"]

        if amount <= 0:
            continue

        parsed_narr = parse_sms_text(narration, default_date=tx_date)
        merchant = norm_row.get("merchant") or parsed_narr["merchant"]
        if merchant == "GENERAL MERCHANT" and narration:
            merchant = narration[:120]

        normalized_merchant = normalize_merchant_name(merchant)
        channel = norm_row.get("channel") or detect_channel(narration)
        ref_id = norm_row.get("reference_id") or norm_row.get("ref") or parsed_narr["reference_id"]

        rows.append(
            {
                "raw_text": narration or f"{merchant} - Rs. {amount:.2f}",
                "tx_date": tx_date,
                "merchant": merchant[:180],
                "normalized_merchant": normalized_merchant[:120],
                "amount": round(amount, 2),
                "tx_type": "credit" if tx_type in {"credit", "cr", "c"} else "debit",
                "channel": channel,
                "reference_id": ref_id,
            }
        )

    return rows
