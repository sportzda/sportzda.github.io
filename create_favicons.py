#!/usr/bin/env python3
"""
Generate favicons from the DA SPORTZ logo.
Place your logo image as 'da_sportz_logo.png' in this directory before running.
"""

from PIL import Image
import os


def create_favicons(logo_path="da_sportz_logo.png"):
    """Generate all required favicon sizes from the logo."""

    if not os.path.exists(logo_path):
        print(f"❌ Error: {logo_path} not found!")
        print(f"Please save your DA SPORTZ logo as '{logo_path}' first.")
        return False

    print(f"Loading logo from {logo_path}...")
    logo = Image.open(logo_path)

    # Convert to RGBA if needed
    if logo.mode != "RGBA":
        logo = logo.convert("RGBA")

    print(f"✓ Loaded logo: {logo.size[0]}x{logo.size[1]} pixels\n")

    # Define all favicon sizes needed
    favicon_sizes = {
        "favicon.ico": 32,  # Standard ICO
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "favicon-48x48.png": 48,
        "apple-touch-icon.png": 180,  # iOS
        "android-chrome-192x192.png": 192,  # Android
        "android-chrome-512x512.png": 512,  # Android high-res
    }

    print("Generating favicon files...")

    for filename, size in favicon_sizes.items():
        # Create square canvas
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))

        # Calculate scaling to fit logo on canvas with some padding
        padding_percent = 0.05  # 5% padding
        target_size = int(size * (1 - 2 * padding_percent))

        # Scale logo maintaining aspect ratio
        logo_aspect = logo.size[0] / logo.size[1]
        if logo_aspect > 1:
            # Wider than tall
            new_width = target_size
            new_height = int(target_size / logo_aspect)
        else:
            # Taller than wide
            new_height = target_size
            new_width = int(target_size * logo_aspect)

        resized_logo = logo.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Center the logo on canvas
        x = (size - new_width) // 2
        y = (size - new_height) // 2
        canvas.paste(resized_logo, (x, y), resized_logo)

        # Save
        if filename.endswith(".ico"):
            canvas.save(filename, format="ICO", sizes=[(32, 32)])
        else:
            canvas.save(filename, "PNG")

        print(f"✓ Created {filename} ({size}x{size})")

    print("\n✅ All favicon files created successfully!")
    print("\nGenerated files:")
    print("  • favicon.ico (32x32) - browser icon")
    print("  • favicon-16x16.png - small browser size")
    print("  • favicon-32x32.png - standard browser size")
    print("  • favicon-48x48.png - larger browser size")
    print("  • apple-touch-icon.png (180x180) - iOS devices")
    print("  • android-chrome-192x192.png - Android devices")
    print("  • android-chrome-512x512.png - Android high-res")

    return True


if __name__ == "__main__":
    create_favicons()
