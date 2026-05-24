from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # LLM
    openai_api_base: str = "https://api.openai.com/v1"
    openai_api_key: str
    model_name: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    # Pinecone
    pinecone_api_key: str
    pinecone_index_name: str = "nyayahelper"
    embedding_dim: int = 768  # 768 for nomic-embed-text, 1536 for text-embedding-3-small

    # Database
    database_url: str

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # App
    upload_dir: str = "./uploads"

    # Indian Kanoon legal search
    indian_kanoon_api_token: str = ""
    legal_search_mock_mode: bool = True
    legal_search_cache_ttl_hours: int = 24 * 7


settings = Settings()
