"""Compatibility shim for legacy crypto_config import."""

from services.encryption_service import encryption_service


def get_cipher():
    """Return the shared Fernet cipher used by EncryptionService."""
    return encryption_service.cipher
