"""Unit tests for the pure helpers in generate-narration.py (no network)."""

import importlib.util
import unittest
from pathlib import Path

_PATH = Path(__file__).resolve().parent / "generate-narration.py"
_spec = importlib.util.spec_from_file_location("generate_narration", _PATH)
gn = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gn)


class TicksToMs(unittest.TestCase):
    def test_converts_100ns_ticks(self):
        self.assertEqual(gn.ticks_to_ms(12_340_000), 1234)

    def test_rounds_to_nearest(self):
        self.assertEqual(gn.ticks_to_ms(15_000), 2)


class TextHash(unittest.TestCase):
    def test_stable(self):
        self.assertEqual(gn.text_hash("Hi.", "v"), gn.text_hash("Hi.", "v"))

    def test_changes_with_text_or_voice(self):
        base = gn.text_hash("Hi.", "v")
        self.assertNotEqual(base, gn.text_hash("Hi!", "v"))
        self.assertNotEqual(base, gn.text_hash("Hi.", "w"))
        self.assertEqual(len(base), 64)


class SplitSentences(unittest.TestCase):
    def test_splits_on_terminators(self):
        self.assertEqual(gn.split_sentences("A. B! C?"), ["A.", "B!", "C?"])

    def test_keeps_trailing_fragment_and_trims(self):
        self.assertEqual(gn.split_sentences("  One. Two  "), ["One.", "Two"])

    def test_empty(self):
        self.assertEqual(gn.split_sentences("  "), [])


class FallbackCues(unittest.TestCase):
    def test_contiguous_and_covering(self):
        cues = gn.fallback_cues(["Aaaa.", "Bb."], 1000)
        self.assertEqual(cues[0]["startMs"], 0)
        self.assertEqual(cues[-1]["endMs"], 1000)
        self.assertEqual(cues[0]["endMs"], cues[1]["startMs"])
        self.assertEqual([c["text"] for c in cues], ["Aaaa.", "Bb."])

    def test_proportional_to_characters(self):
        cues = gn.fallback_cues(["aaa", "a"], 400)
        self.assertEqual(cues[0]["endMs"], 300)

    def test_empty(self):
        self.assertEqual(gn.fallback_cues([], 500), [])


class NeedsRegen(unittest.TestCase):
    ENTRY = {"hash": "h1"}

    def test_missing_entry(self):
        self.assertTrue(gn.needs_regen(None, "h1", True))

    def test_hash_changed(self):
        self.assertTrue(gn.needs_regen(self.ENTRY, "h2", True))

    def test_mp3_missing(self):
        self.assertTrue(gn.needs_regen(self.ENTRY, "h1", False))

    def test_up_to_date(self):
        self.assertFalse(gn.needs_regen(self.ENTRY, "h1", True))


if __name__ == "__main__":
    unittest.main()
