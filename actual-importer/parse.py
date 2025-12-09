import hashlib
import json
from pathlib import Path
from typing import Optional

from monopoly.banks import BankDetector, Dbs, Trust
from monopoly.pdf import PdfDocument, PdfParser
from monopoly.pipeline import Pipeline
from monopoly.statements import Transaction

STATEMENTS_DIR = Path("./bank-statements").resolve()
CACHE_FILE = STATEMENTS_DIR / Path(".parsed_cache.json")

OUTPUT_DIR = Path("./transactions")

#
#   Caching
#

def calc_md5(fp: Path) -> str:

    hash_md5 = hashlib.md5()

    with fp.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hash_md5.update(chunk)

    return hash_md5.hexdigest()

def load_cache() -> set[str]:

    if CACHE_FILE.exists():
        with CACHE_FILE.open("r", encoding="utf8") as ff:
            try:
                return set(json.load(ff))
            except json.JSONDecodeError:
                return set()

    return set()

def save_cache(parsed: set[str]) -> None:

    with CACHE_FILE.open("w", encoding="utf8") as f:
        json.dump(list(parsed), f, indent=2)

#
#   Parsing
#

def postprocess_trust(txs: list[Transaction]) -> list[Transaction]:
    
    def remove_balances(tx):
        return tx.description not in ["Previous balance", "Closing balance"]

    return list(filter(remove_balances, txs))

VALID_BANKS = [Dbs, Trust]
POSTPROCESS_FNS = {
    Trust: postprocess_trust,
}

def parse(fp) -> Optional[Path]:

    document = PdfDocument(file_path=fp)

    detector = BankDetector(document)
    bank = detector.detect_bank(banks=VALID_BANKS)

    if not bank:
        return None
    else:
        print(f"> Detected as {bank.name}")

    parser = PdfParser(bank, document)
    pipeline = Pipeline(parser)

    # Disable safety checks because they are too stringent
    statement = pipeline.extract(safety_check=False)
    transactions = pipeline.transform(statement)

    # Slightly modify the ETL with our own functions
    if bank in POSTPROCESS_FNS:
        print("> Applying postprocessing...")
        transactions = POSTPROCESS_FNS[bank](transactions)

    file_path = pipeline.load(
        transactions=transactions,
        statement=statement,
        output_directory=OUTPUT_DIR,
    )

    if validate(transactions):
        return file_path
    else:
        return None

def validate(txs: list[Transaction]) -> bool:
    
    def fmt(v: float) -> str:
        s = f'${v:.2f}'
        if v < 0:
            s = '-' + s
        return s

    deposit = 0.0
    withdrawal = 0.0
    for tx in txs:
        # NOTE: polarity field is not reliable, just ignore it
        val = float(tx.amount)
        if val > 0.0:
            deposit += val
        else:
            withdrawal += val

    print(f"> Parsed {len(txs)} transactions: ")
    print(f"    Deposit (+)   : ${deposit:.2f}")
    print(f"    Withdrawal (-): ${abs(withdrawal):.2f}")

    # TODO
    return True

if __name__ == "__main__":
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Load cache
    parsed_cache_updated = False
    parsed_cache = load_cache()

    statements = list(STATEMENTS_DIR.glob("*.pdf"))
    print(f"Found {len(statements)} in {STATEMENTS_DIR}")

    for pdf_file in statements:
        md5_hash = calc_md5(pdf_file)
        if md5_hash in parsed_cache:
            # print(f"Skipping file [{pdf_file.name}] with matching hash ({md5_hash[:8]})")
            continue

        print(f"Parsing file: {pdf_file.name}")

        output_path = parse(pdf_file)
        if not output_path:
            print("> [!] Failed to parse file, skipping...")
            continue
        else:
            parsed_cache.add(md5_hash)
            parsed_cache_updated = True
            print(f"> Successfully parsed => {output_path}")

        print()

    if parsed_cache_updated:
        save_cache(parsed_cache)
        print("Updated cache")

