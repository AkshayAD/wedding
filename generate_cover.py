from PIL import Image, ImageDraw, ImageFont, ImageChops
import textwrap

def generate_cover():
    # Configuration
    BG_PATH = "assets/invitation_bg_v2.png"
    GANESHA_PATH = "assets/ganesha_v2.png"
    OUTPUT_PATH = "Invitation Cover Page.png"
    
    # Target Dimensions (Matching existing pages)
    TARGET_W = 1677
    TARGET_H = 2500
    
    # Colors
    TEXT_COLOR = (74, 10, 30) # Deep Maroon #4A0A1E
    HIGHLIGHT_COLOR = (201, 162, 39) # Gold-ish #C9A227
    
    print("Loading assets...")
    # Load Background
    try:
        bg = Image.open(BG_PATH).convert("RGB")
        bg = bg.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    except FileNotFoundError:
        print(f"Error: Could not find {BG_PATH}")
        return

    draw = ImageDraw.Draw(bg)
    width, height = bg.size
    
    # --- 1. Draw Ganesha (Multiply Blend) ---
    try:
        print("Blending Ganesha...")
        ganesha = Image.open(GANESHA_PATH).convert("RGB")
        
        # Resize Ganesha (approx 20% of height)
        g_target_h = int(height * 0.18)
        g_ratio = g_target_h / ganesha.height
        g_target_w = int(ganesha.width * g_ratio)
        ganesha = ganesha.resize((g_target_w, g_target_h), Image.Resampling.LANCZOS)
        
        # Create a layer for Ganesha
        ganesha_layer = Image.new('RGB', (width, height), (255, 255, 255))
        
        # Position: Center horizontally, top margin ~5%
        g_x = (width - g_target_w) // 2
        g_y = int(height * 0.05)
        
        ganesha_layer.paste(ganesha, (g_x, g_y))
        
        # Multiply blend
        bg = ImageChops.multiply(bg, ganesha_layer)
        draw = ImageDraw.Draw(bg) # Re-create draw object after image modification
        
    except FileNotFoundError:
        print("Ganesha image not found, skipping")
    
    # --- 2. Typography ---
    
    # Font Sizes relative to height
    # 2500px height -> similar scale to original script but adjusted
    FONT_SCALE = height / 2500.0 
    
    try:
        font_regular = ImageFont.truetype("C:/Windows/Fonts/Gabriola.ttf", int(75 * FONT_SCALE))
        font_large = ImageFont.truetype("C:/Windows/Fonts/Gabriola.ttf", int(120 * FONT_SCALE))
        font_giant = ImageFont.truetype("C:/Windows/Fonts/Gabriola.ttf", int(220 * FONT_SCALE))
        font_small = ImageFont.truetype("C:/Windows/Fonts/Gabriola.ttf", int(60 * FONT_SCALE))
    except IOError:
        print("Gabriola font not found, falling back to default")
        font_regular = ImageFont.load_default()
        font_large = ImageFont.load_default()
        font_giant = ImageFont.load_default()
        font_small = ImageFont.load_default()

    def draw_centered_text(text, y, font, color=TEXT_COLOR, line_spacing=10):
        lines = text.split('\n')
        current_y = y
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            draw.text(((width - text_w) / 2, current_y), line, font=font, fill=color)
            current_y += text_h + line_spacing
        return current_y

    # --- Layout (Y positions as percent of height) ---
    
    current_y = int(height * 0.24) # Start text below Ganesha
    
    # Header
    current_y = draw_centered_text("|| Shree Ganeshaya Namah ||", current_y, font_small, color=HIGHLIGHT_COLOR)
    current_y += int(height * 0.015)
    
    current_y = draw_centered_text("Wedding Invitation", current_y, font_large)
    current_y += int(height * 0.03)

    # Body
    body_text = "With the blessings of Lord Ganesha and our elders,\nwe request the pleasure of your presence at the\nauspicious wedding ceremony of"
    current_y = draw_centered_text(body_text, current_y, font_regular, line_spacing=int(height*0.005))
    current_y += int(height * 0.03)
    
    # Groom
    current_y = draw_centered_text("Akshay", current_y, font_giant)
    # current_y += int(height * 0.005)
    current_y = draw_centered_text("(son of Mr. Anil & Mrs. Archana Dewalwar)", current_y, font_regular)
    current_y += int(height * 0.02)
    
    # Connect
    current_y = draw_centered_text("with", current_y, font_regular)
    current_y += int(height * 0.02)

    # Bride
    current_y = draw_centered_text("Divyanka", current_y, font_giant)
    # current_y += int(height * 0.005)
    current_y = draw_centered_text("(daughter of Mr. Prakash & Mrs. Priyanka Chachad)", current_y, font_regular)
    current_y += int(height * 0.05)

    # Details
    current_y = draw_centered_text("Wedding Ceremony", current_y, font_large)
    # current_y += int(height * 0.005)
    current_y = draw_centered_text("6th and 7th Feb 2026", current_y, font_regular)
    current_y += int(height * 0.02)
    
    venue_text = "Venue\nChillarwar Farms and Resort, Chandrapur"
    current_y = draw_centered_text(venue_text, current_y, font_regular, line_spacing=int(height*0.005))
    
    # Footer (Pinned to bottom)
    footer_y = int(height * 0.90)
    footer_text = "With best compliments from:\nAnkush Dewalwar, Riya Zinje and Riddhi Shinde"
    draw_centered_text(footer_text, footer_y, font_small)

    bg.save(OUTPUT_PATH)
    print(f"Successfully generated {OUTPUT_PATH} ({width}x{height})")

if __name__ == "__main__":
    generate_cover()
