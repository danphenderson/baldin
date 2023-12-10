from app.utils import clean_text, wrap_text


def test_clean_text():
    assert clean_text("  Hello  world!   ") == "Hello world!"
    assert clean_text("  Hello\n\nworld!   ") == "Hello world!"
    assert clean_text("  Hello\t\tworld!   ") == "Hello world!"
    assert clean_text("\n     Hello world!    \n") == "Hello world!"
    assert clean_text("Hello world!  New Sentence.") == "Hello world! New Sentence."
    assert clean_text("Hello world!    New Sentence.") == "Hello world! New Sentence."


def test_wrap_text():
    assert wrap_text("Hello world!", width=10) == "Hello\nworld!"
    assert wrap_text("Hello world!", width=12) == "Hello world!"
    assert (
        wrap_text("Hello world! New Sentence.", width=10)
        == "Hello\nworld! New\nSentence."  # noqa: W503
    )
