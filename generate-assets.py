#!/usr/bin/env python3
"""Generate placeholder assets for Expo app"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename, text="R"):
    """Create a simple icon with text"""
    # Rootwise green color
    bg_color = (166, 199, 163)  # #A6C7A3
    text_color = (255, 255, 255)
    
    # Create image
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a font, fall back to default if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size // 2)
    except:
        font = ImageFont.load_default()
    
    # Calculate text position (center)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2)
    
    # Draw text
    draw.text(position, text, fill=text_color, font=font)
    
    # Save
    img.save(filename, 'PNG')
    print(f"✅ Created {filename}")

def create_splash(filename):
    """Create a simple splash screen"""
    width, height = 1284, 2778  # iPhone 14 Pro Max size
    bg_color = (253, 248, 243)  # #fdf8f3
    
    img = Image.new('RGB', (width, height), bg_color)
    
    # Save
    img.save(filename, 'PNG')
    print(f"✅ Created {filename}")

# Create assets directory if it doesn't exist
os.makedirs('assets', exist_ok=True)

# Generate all required assets
create_icon(1024, 'assets/icon.png')
create_icon(1024, 'assets/adaptive-icon.png')
create_splash('assets/splash.png')
create_icon(48, 'assets/favicon.png')

print("\n🎉 All assets generated successfully!")

