import os
from PIL import Image, ImageChops
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4))

def create_composite_bg_optimized(bg_path, ganesha_path, target_w, target_h):
    """Create composite background and return optimized version"""
    print(f"Creating optimized composite background...")
    
    bg = Image.open(bg_path).convert("RGB")
    bg = bg.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    if os.path.exists(ganesha_path):
        ganesha = Image.open(ganesha_path).convert("RGB")
        
        g_h = int(target_h * 0.18) 
        g_ratio = g_h / ganesha.height
        g_w = int(ganesha.width * g_ratio)
        ganesha = ganesha.resize((g_w, g_h), Image.Resampling.LANCZOS)
        
        g_layer = Image.new('RGB', (target_w, target_h), (255, 255, 255))
        g_x = (target_w - g_w) // 2
        g_y = int(target_h * 0.03)
        g_layer.paste(ganesha, (g_x, g_y))
        
        bg = ImageChops.multiply(bg, g_layer)
    
    buffer = io.BytesIO()
    bg.save(buffer, format='JPEG', quality=80, optimize=True)
    buffer.seek(0)
    return buffer

def generate_wedding_only_pdf():
    OUTPUT_FILENAME = "Wedding Invitation - Wedding Ceremony Only.pdf"
    
    # Optimized dimensions
    W, H = 1200, 1788
    
    BG_SRC = "invitation PDF background.png"
    GANESHA_SRC = "assets/ganesha_v2.png"
    
    # Only Wedding Ceremony page (no Haldi, Sangeet, Barat)
    OTHER_PAGES = [
        "Wedding Ceremony.png"
    ]
    
    # Create optimized background
    bg_buffer = create_composite_bg_optimized(BG_SRC, GANESHA_SRC, W, H)
    
    temp_bg = "assets/temp_optimized_bg.jpg"
    with open(temp_bg, 'wb') as f:
        f.write(bg_buffer.getvalue())
    
    c = canvas.Canvas(OUTPUT_FILENAME, pagesize=(W, H))
    
    FONT_NAME = "Gabriola"
    try:
        pdfmetrics.registerFont(TTFont(FONT_NAME, "C:/Windows/Fonts/Gabriola.ttf"))
    except:
        FONT_NAME = "Helvetica"
    
    MAROON = hex_to_rgb("#4A0A1E")
    GOLD = hex_to_rgb("#C9A227")
    
    def draw_centered(text, y_frac, font_size, color_rgb, leading_mult=1.2, return_baseline=False):
        c.setFont(FONT_NAME, font_size)
        c.setFillColorRGB(*color_rgb)
        lines = text.split('\n')
        line_height = font_size * leading_mult
        current_y = H * (1 - y_frac)
        last_baseline = current_y
        for line in lines:
            text_width = c.stringWidth(line, FONT_NAME, font_size)
            x = (W - text_width) / 2
            c.drawString(x, current_y, line)
            last_baseline = current_y
            current_y -= line_height
        return last_baseline if return_baseline else current_y

    # --- PAGE 1: Wedding Only Cover ---
    c.drawImage(temp_bg, 0, 0, width=W, height=H)
    
    scale = 0.715
    
    draw_centered("|| Shree Ganeshaya Namah ||", 0.22, int(55*scale), GOLD)
    draw_centered("Wedding Invitation", 0.26, int(110*scale), MAROON)
    
    # Modified text for wedding-only guests
    body = "With the blessings of Lord Ganesha and our elders,\nwe cordially invite you to grace the\nauspicious wedding ceremony of"
    draw_centered(body, 0.31, int(60*scale), MAROON, leading_mult=1.15)
    
    draw_centered("Akshay", 0.44, int(180*scale), MAROON)
    draw_centered("(son of Mr. Anil & Mrs. Archana Dewalwar)", 0.49, int(50*scale), MAROON)
    
    draw_centered("with", 0.535, int(55*scale), MAROON)
    
    draw_centered("Divyanka", 0.59, int(180*scale), MAROON)
    draw_centered("(daughter of Mr. Prakash & Mrs. Priyanka Chachad)", 0.64, int(50*scale), MAROON)
    
    # Simplified ceremony info - just wedding
    draw_centered("Wedding Ceremony", 0.72, int(90*scale), MAROON)
    draw_centered("Sat, 7th February 2026", 0.76, int(60*scale), MAROON)
    
    draw_centered("Venue", 0.80, int(60*scale), MAROON)
    
    venue_name = "Chillarwar Farms and Resort, Chandrapur"
    venue_font_size = int(55*scale)
    venue_baseline = draw_centered(venue_name, 0.835, venue_font_size, MAROON, return_baseline=True)
    
    c.setFont(FONT_NAME, venue_font_size)
    vw = c.stringWidth(venue_name, FONT_NAME, venue_font_size)
    vx_start = (W - vw) / 2
    vx_end = vx_start + vw
    
    c.setLineWidth(2)
    c.setStrokeColorRGB(*MAROON)
    c.line(vx_start, venue_baseline - 7, vx_end, venue_baseline - 7)
    
    link_rect = (vx_start, venue_baseline - 10, vx_end, venue_baseline + venue_font_size)
    venue_url = "https://www.google.com/maps/search/?api=1&query=Chillarwar+Farms+and+Resort,+Chandrapur"
    c.linkURL(venue_url, link_rect, relative=0)
    
    footer = "With best compliments from:\nAnkush Dewalwar, Riya Zinje and Riddhi Shinde"
    draw_centered(footer, 0.91, int(45*scale), MAROON, leading_mult=1.15)
    
    c.showPage()
    
    # --- PAGE 2: Wedding Ceremony Image Only ---
    print("Adding Wedding Ceremony page...")
    for img_file in OTHER_PAGES:
        if os.path.exists(img_file):
            print(f"Optimizing {img_file}...")
            
            img = Image.open(img_file)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            img = img.resize((W, H), Image.Resampling.LANCZOS)
            
            temp_path = f"assets/temp_{img_file.replace('.png', '.jpg')}"
            img.save(temp_path, format='JPEG', quality=75, optimize=True)
            
            c.drawImage(temp_path, 0, 0, width=W, height=H)
            c.showPage()
            
            os.remove(temp_path)
    
    c.save()
    print(f"\nWedding-only PDF saved: {OUTPUT_FILENAME}")
    
    if os.path.exists(temp_bg):
        os.remove(temp_bg)
    
    size_kb = os.path.getsize(OUTPUT_FILENAME) / 1024
    print(f"File size: {size_kb:.0f} KB")

if __name__ == "__main__":
    generate_wedding_only_pdf()
