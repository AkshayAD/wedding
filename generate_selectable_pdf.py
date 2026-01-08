import os
from PIL import Image, ImageChops, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4))

def create_composite_bg(bg_path, ganesha_path, output_path, target_w, target_h):
    print(f"Creating composite background: {output_path}")
    try:
        # Load and resize background
        bg = Image.open(bg_path).convert("RGB")
        bg = bg.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Load and blend Ganesha
        if os.path.exists(ganesha_path):
            ganesha = Image.open(ganesha_path).convert("RGB")
            
            # Smart Contrast Stretch for Ganesha Sketch to ensure white is white
            # This helps the Multiply blend work better
            
            # Resize Ganesha (20% height)
            g_h = int(target_h * 0.18) 
            g_ratio = g_h / ganesha.height
            g_w = int(ganesha.width * g_ratio)
            ganesha = ganesha.resize((g_w, g_h), Image.Resampling.LANCZOS)
            
            # Create Ganesha Layer
            g_layer = Image.new('RGB', (target_w, target_h), (255, 255, 255))
            g_x = (target_w - g_w) // 2
            g_y = int(target_h * 0.03) # Top margin - moved up
            g_layer.paste(ganesha, (g_x, g_y))
            
            # Multiply Blend
            bg = ImageChops.multiply(bg, g_layer)
        
        bg.save(output_path)
        return True
    except Exception as e:
        print(f"Error creating composite BG: {e}")
        return False

def generate_pdf():
    # Setup
    OUTPUT_FILENAME = "Wedding Invitation - Dewalwar and Chachad Family.pdf"
    
    # Dimensions (Pixels)
    W, H = 1677, 2500
    
    # Files
    BG_SRC = "invitation PDF background.png"
    GANESHA_SRC = "assets/ganesha_v2.png"
    COMPOSITE_BG = "assets/temp_composite_bg.png"
    
    OTHER_PAGES = [
        "Haldi Final.png",
        "Sangeet Final.png",
        "Barat.png",
        "Wedding Ceremony.png"
    ]
    
    # 1. Prepare Background Image (PIL)
    if not create_composite_bg(BG_SRC, GANESHA_SRC, COMPOSITE_BG, W, H):
        return

    # 2. Setup ReportLab
    c = canvas.Canvas(OUTPUT_FILENAME, pagesize=(W, H))
    
    # Register Font
    FONT_NAME = "Gabriola"
    FONT_PATH = "C:/Windows/Fonts/Gabriola.ttf"
    try:
        pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))
    except:
        print("Gabriola font not found, using Helvetica")
        FONT_NAME = "Helvetica"

    # --- PAGE 1: Text & Composite BG ---
    
    # Draw Background
    c.drawImage(COMPOSITE_BG, 0, 0, width=W, height=H)
    
    # Setup Text Styles
    MAROON = hex_to_rgb("#4A0A1E")
    GOLD = hex_to_rgb("#C9A227")
    
    def draw_centered(text, y_center_pos_fraction, font_size, color_rgb, leading_mult=1.2, return_baseline=False):
        c.setFont(FONT_NAME, font_size)
        c.setFillColorRGB(*color_rgb)
        
        lines = text.split('\n')
        line_height = font_size * leading_mult
        
        # We calculate start Y based on the fraction from top
        # y_from_top = H * y_center_pos_fraction
        # baseline = H - y_from_top
        
        current_y = H * (1 - y_center_pos_fraction)
        
        last_baseline = current_y
        for line in lines:
            text_width = c.stringWidth(line, FONT_NAME, font_size)
            x = (W - text_width) / 2
            c.drawString(x, current_y, line)
            last_baseline = current_y
            current_y -= line_height
            
        if return_baseline:
            return last_baseline
        return current_y

    # Draw Text - Carefully spaced layout
    
    # 1. Header
    draw_centered("|| Shree Ganeshaya Namah ||", 0.22, 55, GOLD)
    draw_centered("Wedding Invitation", 0.26, 110, MAROON)
    
    # 2. Body
    body = "With the blessings of Lord Ganesha and our elders,\nwe request the pleasure of your presence at the\nauspicious wedding ceremony of"
    draw_centered(body, 0.31, 60, MAROON, leading_mult=1.15)
    
    # 3. Groom Section (tightly grouped)
    draw_centered("Akshay", 0.44, 180, MAROON)
    draw_centered("(son of Mr. Anil & Mrs. Archana Dewalwar)", 0.49, 50, MAROON)
    
    # 4. Connector
    draw_centered("with", 0.535, 55, MAROON)
    
    # 5. Bride Section (tightly grouped)
    draw_centered("Divyanka", 0.59, 180, MAROON)
    draw_centered("(daughter of Mr. Prakash & Mrs. Priyanka Chachad)", 0.64, 50, MAROON)
    
    # 6. Details
    draw_centered("Wedding Ceremony", 0.72, 90, MAROON)
    draw_centered("Fri, 6th and Sat, 7th Feb 2026", 0.76, 60, MAROON)
    
    draw_centered("Venue", 0.80, 60, MAROON)
    
    # Venue Name with Underline and Link
    venue_name = "Chillarwar Farms and Resort, Chandrapur"
    venue_y_fraction = 0.835
    venue_font_size = 55
    
    # Draw text
    venue_baseline = draw_centered(venue_name, venue_y_fraction, venue_font_size, MAROON, return_baseline=True)
    
    # Calculate text width for underline/link
    c.setFont(FONT_NAME, venue_font_size)
    vw = c.stringWidth(venue_name, FONT_NAME, venue_font_size)
    vx_start = (W - vw) / 2
    vx_end = vx_start + vw
    
    # Draw Underline
    c.setLineWidth(3)
    c.setStrokeColorRGB(*MAROON)
    c.line(vx_start, venue_baseline - 10, vx_end, venue_baseline - 10)
    
    # Add Exact Link
    # Rect is (x1, y1, x2, y2) - define a clickable box around text
    link_rect = (vx_start, venue_baseline - 15, vx_end, venue_baseline + venue_font_size)
    venue_url = "https://www.google.com/maps/search/?api=1&query=Chillarwar+Farms+and+Resort,+Chandrapur"
    c.linkURL(venue_url, link_rect, relative=0)
    
    # 7. Footer
    footer = "With best compliments from:\nAnkush Dewalwar, Riya Zinje and Riddhi Shinde"
    draw_centered(footer, 0.91, 45, MAROON, leading_mult=1.15)
    
    c.showPage() # End Page 1
    
    # --- PAGE 2+: Images ---
    print("Adding image pages...")
    for img_file in OTHER_PAGES:
        if os.path.exists(img_file):
            print(f"Adding {img_file}")
            c.drawImage(img_file, 0, 0, width=W, height=H)
            c.showPage()
        else:
            print(f"Warning: {img_file} not found")

    c.save()
    print(f"PDF Generated: {OUTPUT_FILENAME}")
    
    # Cleanup temp file
    if os.path.exists(COMPOSITE_BG):
        os.remove(COMPOSITE_BG)

if __name__ == "__main__":
    generate_pdf()
