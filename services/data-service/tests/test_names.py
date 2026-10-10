from app.domain.names import canonical_state, match_district, normalise


def test_normalise_collapses_punctuation_and_case():
    assert normalise(" Andaman & Nicobar ") == "ANDAMAN AND NICOBAR"
    assert normalise("Yamuna-Nagar District") == "YAMUNA NAGAR"


def test_state_aliases():
    assert canonical_state("Orissa") == "ODISHA"
    assert canonical_state("UTTARANCHAL") == "UTTARAKHAND"
    assert canonical_state("Chatisgarh") == "CHHATTISGARH"


def test_match_tiers():
    cands = {"YAMUNA NAGAR", "AGRA"}
    assert match_district("HARYANA", "Yamunanagar", cands)[1] == "fuzzy"
    assert match_district("UTTAR PRADESH", "Agra", cands)[1:] == ("exact", 1.0)
    assert match_district("UTTAR PRADESH", "Lucknow", cands)[0] is None


def test_no_cross_state_matching_possible():
    # candidates are supplied per state by the caller; an unrelated district never matches
    assert match_district("PUNJAB", "Ludhiana", {"AGRA"})[0] is None
