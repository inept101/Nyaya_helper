from typing import Optional, Tuple

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from config import settings

INDIAN_LANGUAGE_NAMES = {
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "bn": "Bengali",
    "or": "Odia",
    "ur": "Urdu",
    "as": "Assamese",
}


def detect_language(text: str) -> str:
    """Return ISO 639-1 language code for the given text."""
    try:
        from langdetect import detect
        sample = text[:1000]
        return detect(sample)
    except Exception:
        return "en"


def translate_to_english(text: str, source_lang: str) -> str:
    """Translate text to English using the configured LLM."""
    lang_name = INDIAN_LANGUAGE_NAMES.get(source_lang, source_lang)
    llm = ChatOpenAI(
        base_url=settings.openai_api_base,
        api_key=settings.openai_api_key,
        model=settings.model_name,
        temperature=0,
    )
    # Translate in chunks to stay within context limits
    MAX_CHARS = 12000
    if len(text) <= MAX_CHARS:
        return _translate_chunk(llm, text, lang_name)

    chunks = [text[i : i + MAX_CHARS] for i in range(0, len(text), MAX_CHARS)]
    translated_chunks = [_translate_chunk(llm, chunk, lang_name) for chunk in chunks]
    return "\n".join(translated_chunks)


def _translate_chunk(llm: ChatOpenAI, text: str, lang_name: str) -> str:
    messages = [
        SystemMessage(content=(
            "You are a legal translator. Translate the following legal document "
            f"from {lang_name} to English accurately, preserving all legal terminology, "
            "party names, case numbers, and dates exactly as they appear."
        )),
        HumanMessage(content=text),
    ]
    response = llm.invoke(messages)
    return response.content


def detect_and_translate(text: str) -> Tuple[str, Optional[str]]:
    """
    Returns (language_code, translated_text_or_None).
    translated_text is None if the document is already in English.
    """
    lang = detect_language(text)
    if lang == "en" or lang not in INDIAN_LANGUAGE_NAMES:
        return lang, None
    translated = translate_to_english(text, lang)
    return lang, translated
