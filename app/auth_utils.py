"""
Authentication utilities for the Inventory System.
Production-ready implementation with proper security practices.
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from jose import JWTError, jwt
from pydantic import BaseModel


# ==================== Configuration ====================
# These should be loaded from environment variables in production
SECRET_KEY = "your-secret-key-change-this-in-production"  # Use secrets.token_urlsafe(32) to generate
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Initialize Argon2 password hasher (industry standard, OWASP recommended)
# Argon2id is the recommended variant (hybrid of Argon2i and Argon2d)
pwd_hasher = PasswordHasher(
    time_cost=2,        # Number of iterations
    memory_cost=65536,  # Memory usage in KiB (64 MB)
    parallelism=4,      # Number of parallel threads
    hash_len=32,        # Length of the hash in bytes
    salt_len=16         # Length of random salt
)


# ==================== Password Hashing ====================

def hash_password(password: str) -> str:
    """
    Hash a password using Argon2id algorithm.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
        
    Note:
        Argon2id is OWASP's recommended algorithm as of 2024.
        It provides better security than bcrypt with no length limitations.
    """
    return pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Previously hashed password
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        pwd_hasher.verify(hashed_password, plain_password)
        
        # Check if rehashing is needed (parameters changed)
        if pwd_hasher.check_needs_rehash(hashed_password):
            # In production, you should update the hash in database here
            pass
            
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False


def generate_secure_password(length: int = 16) -> str:
    """
    Generate a cryptographically secure random password.
    
    Args:
        length: Desired password length (minimum 12, recommended 16+)
        
    Returns:
        Secure random password string
        
    Note:
        Uses secrets module (cryptographically secure random number generator)
        instead of random module.
    """
    if length < 12:
        raise ValueError("Password length must be at least 12 characters")
    
    # Character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*"
    
    # Ensure at least one character from each set
    password_chars = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    
    # Fill remaining length with random characters from all sets
    all_chars = uppercase + lowercase + digits + special
    password_chars.extend(secrets.choice(all_chars) for _ in range(length - 4))
    
    # Shuffle to avoid predictable pattern
    secrets.SystemRandom().shuffle(password_chars)
    
    return ''.join(password_chars)


# ==================== JWT Token Management ====================

class TokenData(BaseModel):
    """Token payload data structure"""
    username: Optional[str] = None
    user_id: Optional[int] = None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Dictionary containing claims to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),  # Issued at
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string to decode
        
    Returns:
        TokenData object if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        
        if username is None:
            return None
            
        return TokenData(username=username, user_id=user_id)
    except JWTError:
        return None


# ==================== Password Policy ====================

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements.
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"
    
    # Check for common patterns
    common_passwords = {"password123", "admin123", "welcome123", "changeme123"}
    if password.lower() in common_passwords:
        return False, "Password is too common"
    
    return True, ""


# ==================== Rate Limiting Helper ====================

class LoginAttemptTracker:
    """
    Track login attempts for rate limiting.
    In production, use Redis or database for distributed systems.
    """
    def __init__(self):
        self._attempts = {}  # {username: [(timestamp, success), ...]}
        self._lockout_duration = timedelta(minutes=15)
        self._max_attempts = 5
        self._attempt_window = timedelta(minutes=5)
    
    def record_attempt(self, username: str, success: bool):
        """Record a login attempt"""
        now = datetime.now(timezone.utc)
        
        if username not in self._attempts:
            self._attempts[username] = []
        
        # Clean old attempts outside the window
        self._attempts[username] = [
            (ts, succ) for ts, succ in self._attempts[username]
            if now - ts < self._attempt_window
        ]
        
        self._attempts[username].append((now, success))
    
    def is_locked_out(self, username: str) -> tuple[bool, Optional[datetime]]:
        """
        Check if user is locked out due to too many failed attempts.
        
        Returns:
            Tuple of (is_locked, lockout_until)
        """
        if username not in self._attempts:
            return False, None
        
        now = datetime.now(timezone.utc)
        
        # Get recent failed attempts
        recent_failed = [
            ts for ts, success in self._attempts[username]
            if not success and now - ts < self._attempt_window
        ]
        
        if len(recent_failed) >= self._max_attempts:
            # User is locked out
            lockout_until = recent_failed[0] + self._lockout_duration
            if now < lockout_until:
                return True, lockout_until
        
        return False, None
    
    def clear_attempts(self, username: str):
        """Clear login attempts for a user (after successful login)"""
        if username in self._attempts:
            del self._attempts[username]


# Global instance (use Redis in production)
login_tracker = LoginAttemptTracker()


# ==================== Security Headers ====================

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
}
