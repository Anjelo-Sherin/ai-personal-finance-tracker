"""CLI script to generate a synthetic Indian bank statement CSV or SMS alert batch for testing."""
import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../apps/api")))

from app.services.synthetic import generate_curated_three_month_dataset, generate_random_sms_batch


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic Indian UPI/SMS bank transactions.")
    parser.add_argument("--out-csv", default="sample_indian_bank_statement.csv", help="Output CSV path")
    parser.add_argument("--out-sms", default="sample_upi_sms_alerts.txt", help="Output SMS text path")
    args = parser.parse_args()

    records = generate_curated_three_month_dataset()
    with open(args.out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Description", "Merchant", "Amount", "Type", "Channel", "Reference"])
        for r in records:
            writer.writerow(
                [
                    r["tx_date"],
                    r["raw_text"],
                    r["merchant"],
                    r["amount"],
                    r["tx_type"],
                    r["channel"],
                    r["reference_id"],
                ]
            )

    sms_lines = generate_random_sms_batch(count=12)
    with open(args.out_sms, "w", encoding="utf-8") as f:
        f.write("\n".join(sms_lines) + "\n")

    print(f"Wrote {len(records)} synthetic transactions to {args.out_csv}")
    print(f"Wrote {len(sms_lines)} sample SMS alerts to {args.out_sms}")


if __name__ == "__main__":
    main()
