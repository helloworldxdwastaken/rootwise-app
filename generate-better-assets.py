#!/usr/bin/env python3
"""Generate Rootwise branded assets"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_rootwise_icon(size, filename):
    """Create Rootwise icon with leaf and text"""
    # Rootwise colors
    bg_color = (253, 248, 243)  # #fdf8f3 cream background
    leaf_color = (166, 199, 163)  # #A6C7A3 green
    text_color = (79, 91, 77)  # Dark green text
    
    # Create image with cream background
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Calculate sizes
    leaf_size = int(size * 0.45)
    text_size = int(size * 0.22)
    
    # Draw leaf shape (simplified)
    leaf_x = size // 2 - leaf_size // 4
    leaf_y = size // 2 - leaf_size // 2
    
    # Main leaf body (ellipse)
    draw.ellipse(
        [leaf_x, leaf_y, leaf_x + leaf_size, leaf_y + int(leaf_size * 1.4)],
        fill=leaf_color
    )
    
    # Leaf vein (line down the middle)
    vein_start_x = leaf_x + leaf_size // 2
    vein_start_y = leaf_y + 10
    vein_end_y = leaf_y + int(leaf_size * 1.3)
    draw.line(
        [(vein_start_x, vein_start_y), (vein_start_x, vein_end_y)],
        fill=(140, 170, 137),
        width=max(2, size // 128)
    )
    
    # Add "R" text below leaf if size is big enough
    if size >= 512:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", text_size)
        except:
            font = ImageFont.load_default()
        
        text = "Rootwise"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (size - text_width) // 2
        text_y = leaf_y + int(leaf_size * 1.5)
        
        draw.text((text_x, text_y), text, fill=text_color, font=font)
    
    # Save
    img.save(filename, 'PNG')
    print(f"✅ Created {filename}")

def create_splash(filename):
    """Create splash screen with centered logo"""
    width, height = 1284, 2778
    bg_color = (253, 248, 243)  # Cream
    
    img = Image.new('RGB', (width, height), bg_color)
    
    # Add centered leaf logo
    draw = ImageDraw.Draw(img)
    leaf_color = (166, 199, 163)
    
    # Center leaf
    leaf_size = 200
    leaf_x = width // 2 - leaf_size // 4
    leaf_y = height // 2 - leaf_size
    
    draw.ellipse(
        [leaf_x, leaf_y, leaf_x + leaf_size, leaf_y + int(leaf_size * 1.4)],
        fill=leaf_color
    )
    
    # Add text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
    except:
        font = ImageFont.load_default()
    
    text = "Rootwise"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (width - text_width) // 2
    text_y = height // 2 + 150
    
    draw.text((text_x, text_y), text, fill=(79, 91, 77), font=font)
    
    img.save(filename, 'PNG')
    print(f"✅ Created {filename}")

# Create assets directory if needed
os.makedirs('assets', exist_ok=True)

# Generate all assets
create_rootwise_icon(1024, 'assets/icon.png')
create_rootwise_icon(1024, 'assets/adaptive-icon.png')
create_splash('assets/splash.png')
create_rootwise_icon(48, 'assets/favicon.png')

print("\n🎉 All Rootwise branded assets generated!")

