#!/usr/bin/env python3
"""
Generate favicons from the existing DA SPORTZ logo image
Requires the logo PNG file to be saved as 'logo_source.png'
"""
try:
    from PIL import Image
    import os

    print("Generating favicons from DA SPORTZ logo...")

    # Check if logo file exists
    logo_path = "logo_source.png"
    if not os.path.exists(logo_path):
        print(f"❌ Error: Logo file '{logo_path}' not found!")
        print("Please save the DA SPORTZ logo as 'logo_source.png' in this directory.")
        exit(1)

    # Open the logo image
    logo = Image.open(logo_path)
    print(f"✓ Loaded logo: {logo.size[0]}x{logo.size[1]} pixels")

    # Convert to RGBA if needed
    if logo.mode != "RGBA":
        logo = logo.convert("RGBA")

    # Create a square canvas with the logo centered
    # Use the larger dimension to make it square
    max_dim = max(logo.size)
    square_size = max_dim

    # Create white background
    square_img = Image.new("RGBA", (square_size, square_size), (255, 255, 255, 255))

    # Calculate position to center the logo
    x_offset = (square_size - logo.size[0]) // 2
    y_offset = (square_size - logo.size[1]) // 2

    # Paste logo onto square canvas
    square_img.paste(logo, (x_offset, y_offset), logo if logo.mode == "RGBA" else None)

    # Add some padding (10% on each side)
    padding = int(square_size * 0.1)
    padded_size = square_size + 2 * padding
    padded_img = Image.new("RGBA", (padded_size, padded_size), (255, 255, 255, 255))
    padded_img.paste(square_img, (padding, padding))

    # Now generate all favicon sizes from the padded square image
    print("\nGenerating favicon files...")

    # 512x512 - high quality source
    favicon_512 = padded_img.resize((512, 512), Image.Resampling.LANCZOS)
    favicon_512.save("favicon-512.png", "PNG", quality=100, optimize=True)
    print("✓ Created favicon-512.png (512x512)")

    # 180x180 - Apple touch icon
    favicon_180 = padded_img.resize((180, 180), Image.Resampling.LANCZOS)
    favicon_180.save("apple-touch-icon.png", "PNG", quality=95, optimize=True)
    print("✓ Created apple-touch-icon.png (180x180)")

    # 192x192 - Android chrome
    favicon_192 = padded_img.resize((192, 192), Image.Resampling.LANCZOS)
    favicon_192.save("android-chrome-192x192.png", "PNG", quality=95, optimize=True)
    print("✓ Created android-chrome-192x192.png (192x192)")

    # 512x512 - Android chrome large
    favicon_512.save("android-chrome-512x512.png", "PNG", quality=95, optimize=True)
    print("✓ Created android-chrome-512x512.png (512x512)")

    # 32x32 - Standard favicon
    favicon_32 = padded_img.resize((32, 32), Image.Resampling.LANCZOS)
    favicon_32.save("favicon-32x32.png", "PNG", quality=95, optimize=True)
    print("✓ Created favicon-32x32.png (32x32)")

    # 16x16 - Small favicon
    favicon_16 = padded_img.resize((16, 16), Image.Resampling.LANCZOS)
    favicon_16.save("favicon-16x16.png", "PNG", quality=95, optimize=True)
    print("✓ Created favicon-16x16.png (16x16)")

    # 48x48 - Main favicon
    favicon_48 = padded_img.resize((48, 48), Image.Resampling.LANCZOS)
    favicon_48.save("favicon.png", "PNG", quality=95, optimize=True)
    print("✓ Created favicon.png (48x48)")

    print("\n✅ All favicon files created successfully from the logo!")
    print("\nGenerated files:")
    print("  • favicon.png (48x48) - main favicon")
    print("  • favicon-16x16.png, favicon-32x32.png - browser sizes")
    print("  • apple-touch-icon.png (180x180) - iOS")
    print("  • android-chrome-192x192.png, android-chrome-512x512.png - Android")
    print("  • favicon-512.png - high quality source")

except ImportError:
    print("❌ Error: PIL/Pillow is not installed")
    print("Please install it with: sudo apt-get install python3-pil")
    exit(1)
except FileNotFoundError as e:
    print(f"❌ Error: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
    exit(1)
