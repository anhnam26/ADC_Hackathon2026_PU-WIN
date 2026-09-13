import multiprocessing
import sys

import pytest

from office_agent.config import AppError
from office_agent.excel import recalculate_snapshot, sha


@pytest.mark.skipif(sys.platform != "win32", reason="Windows COM process watchdog")
def test_timeout_reaps_owned_worker_and_preserves_source(settings):
    import win32com.client
    service = win32com.client.Dispatch("WbemScripting.SWbemLocator").ConnectServer(".", "root\\cimv2")
    def excel_processes():
        return {int(p.ProcessId) for p in service.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name='EXCEL.EXE'")}
    before_excel = excel_processes()
    source = settings.inputs / "source.xlsx"
    before_hash = sha(source)
    before = {p.pid for p in multiprocessing.active_children()}
    with pytest.raises(AppError, match="thời gian"):
        recalculate_snapshot(source, timeout=0.001)
    assert {p.pid for p in multiprocessing.active_children()} == before
    assert sha(source) == before_hash
    assert excel_processes().issubset(before_excel)
