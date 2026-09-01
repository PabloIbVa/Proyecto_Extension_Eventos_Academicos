import pytest
from datetime import datetime

from app.services.analyzer import _search_dates_candidates, _choose_best_candidate, _normalize_datetime_to_naive_iso


def test_search_dates_spanish_deadline():
    text = "La entrega es el próximo viernes a las 15:00."
    base = datetime(2026, 9, 1, 12, 0, 0)
    candidates = _search_dates_candidates(text, base)
    assert candidates, "No se detectaron fechas"
    chosen = _choose_best_candidate(candidates, text)
    assert chosen is not None
    _, dt = chosen
    # should be a datetime object and in the future relative to base
    assert dt > base


def test_normalize_iso():
    dt = datetime(2026, 9, 10, 15, 0, 0)
    iso = _normalize_datetime_to_naive_iso(dt)
    assert iso == "2026-09-10T15:00:00"


def test_no_date_found():
    text = "Este artículo no menciona ninguna fecha de entrega."
    base = datetime(2026, 9, 1, 12, 0, 0)
    candidates = _search_dates_candidates(text, base)
    assert candidates == [] or candidates is None

