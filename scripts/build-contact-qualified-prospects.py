#!/usr/bin/env python3
"""Build an exact-quota CSV of publicly contactable small DSA prospects."""

from __future__ import annotations

import csv
import re
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
EXISTING = ARTIFACTS / "LeadHub-Loan-Agent-Prospects-200-India.csv"
OUTPUT = ARTIFACTS / "LeadHub-Contact-Qualified-DSA-Prospects-200.csv"

TARGETS = {
    "Mumbai": 50,
    "Delhi NCR": 40,
    "Bengaluru": 35,
    "Hyderabad": 35,
    "Pune": 25,
    "Kolkata": 15,
}

DIRECTORY_CITIES = {
    "Mumbai": "Mumbai",
    "Delhi NCR": "Delhi",
    "Bengaluru": "Bangalore",
    "Hyderabad": "Hyderabad",
    "Pune": "Pune",
    "Kolkata": "Kolkata",
}

SERVICES = {
    "Education Loan": "Education-Loan-Advisor",
    "Home Loan": "Housing-Loans-Advisor",
    "Personal Loan": "Personal-Loan-Advisor",
    "Loan Against Property": "Loan-Against-Property-Advisor",
    "Gold Loan": "Gold-Loan-Advisor",
    "Credit Assistance": "Credit-Assistance-Companies-Advisor",
}

EXCLUDED_BRANDS = re.compile(
    r"\b(?:HDFC|ICICI|SBI|AXIS|KOTAK|BAJAJ|TATA|ADITYA BIRLA|LIC|IDFC|"
    r"INDUSIND|YES BANK|BANK OF|AU SMALL|PIRAMAL|MUTHOOT|MANAPPURAM|"
    r"MAHINDRA FINANCE|L&T FINANCE|POONAWALLA|SHRIRAM FINANCE)\b",
    re.I,
)
INVALID_NAMES = re.compile(r"^(?:abc|asdf|test|best|earth|assets|dreams|a{3,}(?:\s+b{3,})?)$", re.I)

HEADERS = [
    "City",
    "Business Name",
    "Contact Person",
    "Public Phone",
    "WhatsApp Number",
    "Public Email",
    "Website",
    "Loan Categories",
    "Company Size Signal",
    "Size Confidence",
    "Contact Verification",
    "Research Channel",
    "Primary Source URL",
    "Secondary Source URL",
    "LeadHub Fit Notes",
    "Researched On",
]


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 LeadHub prospect research"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def clean_text(values: list[str] | str) -> str:
    if isinstance(values, list):
        values = " ".join(values)
    return re.sub(r"\s+", " ", values).strip()


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def valid_phone(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    digits = digits[-10:]
    return len(digits) == 10 and digits[0] in "6789" and len(set(digits)) >= 4


def domain(url: str) -> str:
    if not url:
        return ""
    return urllib.parse.urlparse(url).netloc.lower().removeprefix("www.")


def directory_rows() -> list[dict[str, str]]:
    aggregated: dict[tuple[str, str, str, str], dict[str, str | set[str]]] = {}
    for city, directory_city in DIRECTORY_CITIES.items():
        for category, route in SERVICES.items():
            source_url = f"https://www.advisorkhoj.com/{directory_city}/{route}"
            document = html.fromstring(fetch(source_url))
            panels = document.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " bordercolor-panel ")]')
            for panel in panels:
                name = clean_text(panel.xpath('.//*[contains(concat(" ", normalize-space(@class), " "), " advisor-name ")]//text()'))
                phones = panel.xpath('.//a[contains(concat(" ", normalize-space(@class), " "), " advisor-mobile ")]/@title')
                emails = panel.xpath('.//a[starts-with(@href, "mailto:")]/@href')
                phone = clean_text(phones[:1])
                email = clean_text(emails[:1]).removeprefix("mailto:").lower()
                if (
                    not name
                    or INVALID_NAMES.match(name)
                    or not (phone or email)
                    or (phone and not valid_phone(phone))
                    or email.endswith("@advisorkhoj.com")
                    or EXCLUDED_BRANDS.search(name)
                ):
                    continue
                experience = clean_text(panel.xpath('.//*[contains(concat(" ", normalize-space(@class), " "), " advisor-eduexp ")]//text()'))
                listed_services = {
                    clean_text(item.xpath(".//text()"))
                    for item in panel.xpath('.//ul[contains(concat(" ", normalize-space(@class), " "), " experton ")]/li')
                    if clean_text(item.xpath(".//text()"))
                }
                listed_services.add(category)
                key = (city, normalized(name), normalized(phone), email)
                if key not in aggregated:
                    aggregated[key] = {
                        "City": city,
                        "Business Name": name,
                        "Contact Person": "" if any(word in name.upper() for word in ("SERVICES", "ADVISOR", "ASSOCIATES", "CONSULT", "FINANCE", "CAPITAL", "SOLUTIONS", "ENTERPRISE")) else name.title(),
                        "Public Phone": phone,
                        "WhatsApp Number": "",
                        "Public Email": email,
                        "Website": "",
                        "Loan Categories": set(),
                        "Company Size Signal": f"Independent public financial-adviser profile; {experience or 'local advisor listing'}",
                        "Size Confidence": "Medium",
                        "Contact Verification": "Public directory phone/email",
                        "Research Channel": "Referral directory / Advisorkhoj",
                        "Primary Source URL": source_url,
                        "Secondary Source URL": "",
                        "LeadHub Fit Notes": "Contactable independent adviser prospect; verify current services and team size before outreach",
                        "Researched On": "2026-06-09",
                    }
                aggregated[key]["Loan Categories"].update(listed_services)  # type: ignore[union-attr]
    rows = []
    for item in aggregated.values():
        item["Loan Categories"] = "; ".join(sorted(item["Loan Categories"]))  # type: ignore[arg-type]
        rows.append({header: str(item.get(header, "")) for header in HEADERS})
    return rows


def existing_contact_rows() -> list[dict[str, str]]:
    rows = []
    with EXISTING.open(newline="", encoding="utf-8") as handle:
        for old in csv.DictReader(handle):
            phone = old.get("Public Phone", "").strip()
            email = old.get("Public Email", "").strip().lower()
            if not (phone or email) or EXCLUDED_BRANDS.search(old["Business Name"]):
                continue
            source = old.get("Primary Source URL", "")
            official = "official website" in old.get("Research Channel", "").lower() or domain(source) not in {
                "advisorkhoj.com",
                "linkedin.com",
                "google.com",
            }
            rows.append(
                {
                    "City": old["City"],
                    "Business Name": old["Business Name"],
                    "Contact Person": old.get("Contact Person", ""),
                    "Public Phone": phone,
                    "WhatsApp Number": "",
                    "Public Email": email,
                    "Website": source if official else "",
                    "Loan Categories": old.get("Loan Categories", ""),
                    "Company Size Signal": old.get("Company Size Signal", ""),
                    "Size Confidence": old.get("Size Confidence", "Medium"),
                    "Contact Verification": old.get("Contact Verification", "Verified public business contact"),
                    "Research Channel": old.get("Research Channel", ""),
                    "Primary Source URL": source,
                    "Secondary Source URL": old.get("Secondary Source URL", ""),
                    "LeadHub Fit Notes": old.get("LeadHub Fit Notes", ""),
                    "Researched On": "2026-06-09",
                }
            )
    return rows


def build() -> list[dict[str, str]]:
    selected: list[dict[str, str]] = []
    names: set[tuple[str, str]] = set()
    phones: set[str] = set()
    emails: set[str] = set()
    domains: set[str] = set()

    candidates = existing_contact_rows() + directory_rows()
    candidates.sort(
        key=lambda row: (
            list(TARGETS).index(row["City"]),
            0 if "official website" in row["Research Channel"].lower() else 1,
            0 if row["Public Phone"] and row["Public Email"] else 1,
            row["Business Name"].lower(),
        )
    )
    for row in candidates:
        city = row["City"]
        if city not in TARGETS or sum(item["City"] == city for item in selected) >= TARGETS[city]:
            continue
        name_key = (city, normalized(row["Business Name"]))
        phone_key = normalized(row["Public Phone"])
        email_key = row["Public Email"].lower()
        domain_key = domain(row["Website"])
        if name_key in names:
            continue
        if phone_key and phone_key in phones:
            continue
        if email_key and email_key in emails:
            continue
        if domain_key and domain_key in domains:
            continue
        selected.append(row)
        names.add(name_key)
        if phone_key:
            phones.add(phone_key)
        if email_key:
            emails.add(email_key)
        if domain_key:
            domains.add(domain_key)

    counts = Counter(row["City"] for row in selected)
    missing = {city: target - counts[city] for city, target in TARGETS.items() if counts[city] < target}
    if missing:
        raise RuntimeError(f"Unable to fill quotas after strict deduplication: {missing}")
    return sorted(selected, key=lambda row: (list(TARGETS).index(row["City"]), row["Business Name"].lower()))


def main() -> None:
    rows = build()
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUTPUT}")
    print(dict(Counter(row["City"] for row in rows)))
    print("Phone:", sum(bool(row["Public Phone"]) for row in rows))
    print("Email:", sum(bool(row["Public Email"]) for row in rows))


if __name__ == "__main__":
    main()
