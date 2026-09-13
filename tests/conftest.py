from datetime import datetime
from pathlib import Path

import pytest
from openpyxl import Workbook
from openpyxl.worksheet.table import Table

from office_agent.config import Settings
from office_agent.excel import HEADERS, build_report
from office_agent.journal import Journal
from office_agent.mail import compose, contacts


@pytest.fixture
def settings(tmp_path):
    inputs = tmp_path / "inputs"
    inputs.mkdir()
    book = Workbook()
    sheet = book.active
    sheet.title = "Orders"
    for row in [HEADERS,
                ["A", datetime(2026, 8, 1), "Synthetic", "Bắc", "Demo", 2, 1000, 0.1, "Completed", "=ROUND(F2*G2*(1-H2),0)"],
                ["B", datetime(2026, 8, 2), "Synthetic", "Nam", "Demo", 1, 501, 0.5, "Completed", "=ROUND(F3*G3*(1-H3),0)"],
                ["C", datetime(2026, 8, 3), "Synthetic", "Trung", "Demo", 10, 1000, 0, "Pending", "=ROUND(F4*G4*(1-H4),0)"],
                ["D", datetime(2026, 7, 1), "Synthetic", "Trung", "Demo", 2, 400, 0, "Completed", "=ROUND(F5*G5*(1-H5),0)"]]:
        sheet.append(row)
    sheet.add_table(Table(displayName="Orders", ref="A1:J5"))
    book.save(inputs / "source.xlsx")
    book.close()
    (inputs / "contacts.csv").write_text(
        "alias,display_name,email,allowed_for_demo\nlan_ketoan,Lan kế toán,lan@demo.test,true\n"
        "lan_kinhdoanh,Lan kinh doanh,lan2@demo.test,true\nminh_demo,Minh,minh@demo.test,false\n", encoding="utf-8")
    (inputs / "email_template.txt").write_text(
        "Subject: Báo cáo {{report_period}}\n\nChào {{recipient_display_name}},\n{{summary}}\n", encoding="utf-8")
    return Settings(tmp_path, inputs, tmp_path / "outputs", tmp_path / "runtime",
                    sender="sender@demo.test", gmail_password="synthetic-password", api_key="synthetic-key")


@pytest.fixture
def journal(settings):
    return Journal(settings.runtime / "journal.sqlite3")


@pytest.fixture
def artifact(settings):
    return build_report(settings.inputs / "source.xlsx", settings.outputs, "2026-08", excel_recalc=False)


@pytest.fixture
def preview(settings, artifact):
    return compose(settings, artifact, contacts(settings.inputs / "contacts.csv")["lan_ketoan"])
