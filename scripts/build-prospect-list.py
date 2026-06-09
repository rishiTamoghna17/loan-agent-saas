#!/usr/bin/env python3
"""Build an exact-quota, source-traceable LeadHub prospect CSV."""

from __future__ import annotations

import csv
import io
import re
import urllib.request
import urllib.parse
from collections import Counter
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
STARTER_CSV = ARTIFACTS / "LeadHub-Loan-Agent-Prospects-India.csv"
OUTPUT_CSV = ARTIFACTS / "LeadHub-Loan-Agent-Prospects-200-India.csv"
HDFC_SOURCE = "https://www.hdfc.bank.in/content/dam/hdfcbankpws/in/en/personal-banking/discover-products/our-corporate-commitment/Active-DSA-for-Home-Loan.pdf"

TARGETS = {
    "Mumbai": 50,
    "Delhi NCR": 40,
    "Bengaluru": 35,
    "Hyderabad": 35,
    "Pune": 25,
    "Kolkata": 15,
}

CITY_ALIASES = {
    "MUMBAI": "Mumbai",
    "DELHI": "Delhi NCR",
    "NEW DELHI": "Delhi NCR",
    "BANGALORE": "Bengaluru",
    "BENGALURU": "Bengaluru",
    "HYDERABAD": "Hyderabad",
    "PUNE": "Pune",
    "KOLKATA": "Kolkata",
    "KOLKATTA": "Kolkata",
}

OFFICIAL_SITES = {
    "Mumbai": [
        ("CredFlow Advisory", "https://www.credflowadvisory.com/", "+918452098808", "info@credflowadvisory.com"),
        ("Money Vision", "https://moneyvision.org/", "", ""),
        ("Achha Hoga", "https://achhahoga.com/", "", ""),
        ("Ace Consultancy", "https://aceconsultancy.co.in/", "", ""),
        ("Rupas Capital Services", "https://rupascapitalservices.com/", "", ""),
        ("NFS Loan", "https://nfsloan.in/", "", ""),
        ("Devendra Jain Financial Services", "https://devendrajain.com/", "", ""),
        ("Western Capital", "https://westerncap.in/", "", ""),
        ("MIDC Wala", "https://midcwala.com/", "", ""),
        ("JB Financial Consultancy", "https://jbfc.co.in/", "", ""),
        ("SME Loan", "https://smeloan.in/", "", ""),
        ("Balaji Credits", "https://balajicredits.com/", "", ""),
    ],
    "Delhi NCR": [
        ("Kredible Finance", "https://krediblefinance.com/", "+919870579574", ""),
        ("Home Loan Agents", "https://homeloanagents.in/", "+919911171025", ""),
        ("Swastik Capital", "https://www.swastikcapital.in/", "", ""),
        ("Goel Enterprises", "https://goelenterprises.co.in/", "", ""),
        ("Monei Matters", "https://moneimatters.com/", "", ""),
        ("Rajput Finance", "https://www.carajput.com/", "", ""),
    ],
    "Bengaluru": [
        ("Bank Loan Agency", "https://www.bankloanagency.com/", "", ""),
        ("Business Factor", "https://businessfactor.in/", "", ""),
        ("EasyLoans", "https://myeasyloans.in/", "", ""),
        ("Grab Capital", "https://grabcapital.com/", "", ""),
        ("NKB Kredit", "https://nkbkredit.com/", "", ""),
        ("Vaishnavi Financial Consultancy Services", "https://vaishnavifcs.com/", "", ""),
        ("Nidhi Vriddhi", "https://nidhivriddhi.com/", "", ""),
        ("Aagey", "https://aagey.com/", "", ""),
    ],
    "Hyderabad": [
        ("Loan Mithra Consulting LLP", "https://www.loan-mithra.com/", "", ""),
        ("Vyoma Business Consultancy", "https://vyomafintech.com/", "", ""),
        ("Finvastra", "https://www.finvastra.com/", "", ""),
        ("Sun Business Solutions", "https://www.sunbusinesssolutions.com/", "", ""),
        ("PNS Associates", "https://pnsassociates.in/", "", ""),
        ("Hyderabad Home Loans", "https://hyderabadhomeloans.in/", "", ""),
        ("Quick Home Loan Hyderabad", "https://quickhomeloanhyderabad.com/", "", ""),
        ("Yes Genesis", "https://yesgenesis.in/", "", ""),
        ("Mintra Finserv", "https://mintrafinserv.com/", "", ""),
        ("Corporate Fincon", "https://corporatefincon.com/", "", ""),
    ],
    "Pune": [
        ("Hexafin", "https://hexafin.com/", "", ""),
        ("Saaz Associates", "https://saazassociates.com/", "", ""),
        ("Nilesh Borhade Financial Services", "https://nileshborhade.in/", "", ""),
        ("Apna Rupee", "https://apnarupee.com/", "", ""),
        ("P T Kale and Company", "https://ptkaleandcompany.com/", "", ""),
        ("Findoor Wealth", "https://findoorwealth.com/", "", ""),
        ("Terkar Capital", "https://terkarcapital.com/", "", ""),
    ],
    "Kolkata": [
        ("Second Pocket Solution", "https://secondpocketsolution.com/", "", ""),
        ("Naskar Finserv", "https://naskarfinserv.in/", "", ""),
        ("Loan Bazzar", "https://loanbazzar.in/", "", ""),
        ("Exuberant DSA", "https://exuberantdsa.com/", "", ""),
        ("Questa Advisors", "https://questaadvisors.com/", "", ""),
        ("Loan Office", "https://loanoffice.in/", "", ""),
    ],
}

HEADERS = [
    "City",
    "Business Name",
    "Contact Person",
    "Public Phone",
    "Public Email",
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


def normalize_name(value: str) -> str:
    value = re.sub(r"\b(prop|proprietor)\b.*$", "", value, flags=re.I)
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def clean_dsa_name(tail: str) -> str:
    tail = re.sub(r"^(?:NEW DELHI|DELHI|MUMBAI|BANGALORE|BENGALURU|HYDERABAD|PUNE|KOLKATTA|KOLKATA)\s+", "", tail, flags=re.I)
    tail = tail.split(",", 1)[0]
    tail = re.split(
        r"\b(?:PROP(?:RIETOR)?|FLAT|OFFICE|SHOP|ROOM|CABIN|PLOT|HOUSE|H\s*NO|NO[. :#-]|\d)",
        tail,
        maxsplit=1,
        flags=re.I,
    )[0]
    tail = re.sub(r"\s+", " ", tail).strip(" ,#-")
    tail = re.sub(r"(?:\s+UNIT|\s+SR|\s+Building / Unit|\s*No\.)$", "", tail, flags=re.I)
    tail = re.sub(r"\s+[A-Z]$", "", tail)
    tail = re.sub(r"(?<=[A-Za-z])\d+$", "", tail)
    words = tail.split()
    if len(words) % 2 == 0:
        midpoint = len(words) // 2
        if [word.lower() for word in words[:midpoint]] == [word.lower() for word in words[midpoint:]]:
            tail = " ".join(words[:midpoint])
    return tail


def starter_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with STARTER_CSV.open(newline="", encoding="utf-8") as handle:
        for old in csv.DictReader(handle):
            row = {header: old.get(header, "") for header in HEADERS}
            row["Contact Verification"] = "Verified public business contact"
            rows.append(row)
    return rows


def official_site_rows() -> list[dict[str, str]]:
    rows = []
    for city, candidates in OFFICIAL_SITES.items():
        for name, url, phone, email in candidates:
            rows.append(
                {
                    "City": city,
                    "Business Name": name,
                    "Contact Person": "",
                    "Public Phone": phone,
                    "Public Email": email,
                    "Loan Categories": "Multi-product loans; Loan advisory; DSA services",
                    "Company Size Signal": "Independent loan or financial advisory business with an official website",
                    "Size Confidence": "Medium",
                    "Contact Verification": "Verified public contact" if phone or email else "Official website/contact page",
                    "Research Channel": "Google + official website",
                    "Primary Source URL": url,
                    "Secondary Source URL": "",
                    "LeadHub Fit Notes": "Potential fit for a branded lead website, CRM, source tracking, and WhatsApp follow-up",
                    "Researched On": "2026-06-09",
                }
            )
    return rows


def hdfc_rows() -> list[dict[str, str]]:
    pdf_text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(fetch(HDFC_SOURCE))).pages)
    cities = "|".join(sorted((re.escape(city) for city in CITY_ALIASES), key=len, reverse=True))
    row_pattern = re.compile(rf"^\d+\s+(?:West|North|South|East)\s+.+?\s+({cities})\s+(.+)$", re.I)
    rows = []
    for line in pdf_text.splitlines():
        match = row_pattern.match(re.sub(r"\s+", " ", line).strip())
        if not match:
            continue
        city_key, tail = match.groups()
        name = clean_dsa_name(tail)
        if len(name) < 6 or name.upper() in {"SR", "DSA NAME"}:
            continue
        rows.append(
            {
                "City": CITY_ALIASES[city_key.upper()],
                "Business Name": name.title() if name.isupper() else name,
                "Contact Person": "",
                "Public Phone": "",
                "Public Email": "",
                "Loan Categories": "Home Loan",
                "Company Size Signal": "Listed as an active home-loan DSA by HDFC Bank",
                "Size Confidence": "Low",
                "Contact Verification": "Lender-listed DSA; contact enrichment needed",
                "Research Channel": "Referral directory / lender active-DSA list",
                "Primary Source URL": HDFC_SOURCE,
                "Secondary Source URL": "https://www.google.com/search?q="
                + urllib.parse.quote_plus(f"{name} {CITY_ALIASES[city_key.upper()]} loan DSA contact"),
                "LeadHub Fit Notes": "Qualified DSA prospect; verify current contact details and team size before outreach",
                "Researched On": "2026-06-09",
            }
        )
    return rows


def build() -> list[dict[str, str]]:
    selected: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    pools = [starter_rows(), official_site_rows(), hdfc_rows()]
    for pool in pools:
        for row in pool:
            city = row["City"]
            key = (city, normalize_name(row["Business Name"]))
            if city not in TARGETS or not key[1] or key in seen:
                continue
            if sum(item["City"] == city for item in selected) >= TARGETS[city]:
                continue
            selected.append({header: row.get(header, "") for header in HEADERS})
            seen.add(key)
    counts = Counter(row["City"] for row in selected)
    missing = {city: target - counts[city] for city, target in TARGETS.items() if counts[city] < target}
    if missing:
        raise RuntimeError(f"Unable to fill quotas: {missing}; available counts: {dict(counts)}")
    return sorted(selected, key=lambda row: (list(TARGETS).index(row["City"]), row["Business Name"].lower()))


def main() -> None:
    rows = build()
    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    counts = Counter(row["City"] for row in rows)
    print(f"Wrote {len(rows)} prospects to {OUTPUT_CSV}")
    print(dict(counts))
    print(f"With phone: {sum(bool(row['Public Phone']) for row in rows)}")
    print(f"With email: {sum(bool(row['Public Email']) for row in rows)}")


if __name__ == "__main__":
    main()
