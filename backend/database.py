import ssl
import urllib.parse

from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings


def _build_engine():
    raw = settings.database_url

    if "+pg8000" in raw:
        # Strip scheme
        scheme, rest = raw.split("://", 1)
        # Split on the LAST @ to handle literal @ in the password
        at = rest.rfind("@")
        userinfo, hostinfo = rest[:at], rest[at + 1:]

        colon = userinfo.index(":")
        user = userinfo[:colon]
        # Use the raw password string — URL.create() handles encoding internally
        password = userinfo[colon + 1:]

        host_part, dbname = hostinfo.rsplit("/", 1)
        if ":" in host_part:
            host, port_str = host_part.rsplit(":", 1)
            port = int(port_str)
        else:
            host, port = host_part, 5432

        url = URL.create(
            "postgresql+pg8000",
            username=user,
            password=password,
            host=host,
            port=port,
            database=dbname,
        )
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        return create_engine(url, connect_args={"ssl_context": ssl_ctx}, pool_pre_ping=True)

    return create_engine(raw, pool_pre_ping=True)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    import models  # noqa: F401 — ensures models are registered before create_all
    Base.metadata.create_all(bind=engine)
