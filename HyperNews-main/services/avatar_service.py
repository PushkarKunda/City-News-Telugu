# services/avatar_service.py
import hashlib
from typing import Optional

def generate_ui_avatar(name: Optional[str] = None, user_uid: Optional[str] = None) -> str:
    """
    Generate a UI Avatar URL for users.
    
    UI Avatars API: https://ui-avatars.com/
    Parameters:
    - background: Background color (hex)
    - color: Text color (hex)
    - rounded: Round corners (true/false)
    - size: Image size in pixels
    - name: Text to display (initials are auto-generated)
    - length: Number of characters (default 2)
    - font-size: Font size (percentage)
    - bold: Bold text (true/false)
    - uppercase: Uppercase text (true/false)
    """
    
    # Determine the display name for avatar
    if name:
        display_name = name
    elif user_uid:
        # Use UID as fallback
        display_name = user_uid[:8]
    else:
        display_name = "User"
    
    # Escape special characters for URL
    import urllib.parse
    encoded_name = urllib.parse.quote(display_name)
    
    # Build the UI Avatar URL with optimal settings for news app
    avatar_url = (
        f"https://ui-avatars.com/api/"
        f"?background=4F46E5"      # Indigo color (matches many apps)
        f"&color=ffffff"            # White text
        f"&rounded=true"            # Circular avatar
        f"&size=200"                # 200x200 pixels (good for all displays)
        f"&font-size=70"            # 70% of container size
        f"&bold=true"               # Bold text for better visibility
        f"&uppercase=true"          # Uppercase initials
        f"&name={encoded_name}"     # Name to generate initials from
        f"&length=2"                # Show 2 initials
    )
    
    return avatar_url


def generate_consistent_color_avatar(name: str, user_uid: str = None) -> str:
    """
    Generate an avatar with consistent color based on user ID.
    This gives each user a unique but consistent avatar color.
    """
    # Generate a hash from user_uid or name
    seed = user_uid or name or "User"
    hash_value = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
    
    # Generate a pleasant color from the hash
    colors = [
        "4F46E5",  # Indigo
        "EC4899",  # Pink
        "F59E0B",  # Amber
        "10B981",  # Emerald
        "3B82F6",  # Blue
        "EF4444",  # Red
        "8B5CF6",  # Purple
        "06B6D4",  # Cyan
        "84CC16",  # Lime
        "F97316",  # Orange
    ]
    
    # Pick color based on hash
    color_index = hash_value % len(colors)
    background_color = colors[color_index]
    
    import urllib.parse
    encoded_name = urllib.parse.quote(name if name else "User")
    
    avatar_url = (
        f"https://ui-avatars.com/api/"
        f"?background={background_color}"
        f"&color=ffffff"
        f"&rounded=true"
        f"&size=200"
        f"&font-size=70"
        f"&bold=true"
        f"&uppercase=true"
        f"&name={encoded_name}"
        f"&length=2"
    )
    
    return avatar_url


def get_avatar_for_user(name: Optional[str], user_uid: Optional[str] = None, gender: Optional[str] = None) -> str:
    """Main function to get avatar for a user - uses UI Avatars with gender-based colors"""
    # Determine the display name for avatar
    if name:
        display_name = name
    elif user_uid:
        # Use UID as fallback
        display_name = user_uid[:8]
    else:
        display_name = "User"
        
    import urllib.parse
    encoded_name = urllib.parse.quote(display_name)
    
    background_color = "4F46E5" # Default Indigo
    
    if gender:
        gender_lower = gender.lower()
        if gender_lower == "male":
            background_color = "3B82F6" # Blue
        elif gender_lower == "female":
            background_color = "EC4899" # Pink
        else:
            seed = user_uid or name or "User"
            hash_value = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
            colors = ["4F46E5", "F59E0B", "10B981", "8B5CF6", "06B6D4", "84CC16", "F97316"]
            background_color = colors[hash_value % len(colors)]
    else:
        seed = user_uid or name or "User"
        hash_value = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
        colors = ["4F46E5", "F59E0B", "10B981", "8B5CF6", "06B6D4", "84CC16", "F97316"]
        background_color = colors[hash_value % len(colors)]

    avatar_url = (
        f"https://ui-avatars.com/api/"
        f"?background={background_color}"
        f"&color=ffffff"
        f"&rounded=true"
        f"&size=200"
        f"&font-size=70"
        f"&bold=true"
        f"&uppercase=true"
        f"&name={encoded_name}"
        f"&length=2"
    )
    
    return avatar_url