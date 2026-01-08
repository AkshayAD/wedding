import os
from PIL import Image, ImageChops
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4))

def optimize_image(img_path, max_width=1200, quality=75):
    """Optimize image for smaller file size"""
    img = Image.open(img_path)
    
    # Convert to RGB if needed
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    
    # Resize if too large
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
    
    # Save to bytes with compression
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=quality, optimize=True)
    buffer.seek(0)
    
    # Return optimized image
    return Image.open(buffer), img.width, img.height

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
    
    # Save compressed
    buffer = io.BytesIO()
    bg.save(buffer, format='JPEG', quality=80, optimize=True)
    buffer.seek(0)
    return buffer

def generate_optimized_pdf():
    OUTPUT_FILENAME = "Wedding Invitation - Dewalwar and Chachad Family - Optimized.pdf"
    
    # Optimized dimensions (smaller than original 1677x2500)
    W, H = 1200, 1788  # Same aspect ratio, smaller size
    
    BG_SRC = "invitation PDF background.png"
    GANESHA_SRC = "assets/ganesha_v2.png"
    
    OTHER_PAGES = [
        "Haldi Final.png",
        "Sangeet Final.png",
        "Barat.png",
        "Wedding Ceremony.png"
    ]
    
    # Create optimized background
    bg_buffer = create_composite_bg_optimized(BG_SRC, GANESHA_SRC, W, H)
    
    # Save temp file for ReportLab
    temp_bg = "assets/temp_optimized_bg.jpg"
    with open(temp_bg, 'wb') as f:
        f.write(bg_buffer.getvalue())
    
    # Setup PDF
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

    # --- PAGE 1 ---
    c.drawImage(temp_bg, 0, 0, width=W, height=H)
    
    # Scale font sizes proportionally (1200/1677 = 0.715)
    scale = 0.715
    
    draw_centered("|| Shree Ganeshaya Namah ||", 0.22, int(55*scale), GOLD)
    draw_centered("Wedding Invitation", 0.26, int(110*scale), MAROON)
    
    body = "With the blessings of Lord Ganesha and our elders,\nwe request the pleasure of your presence at the\nauspicious wedding ceremony of"
    draw_centered(body, 0.31, int(60*scale), MAROON, leading_mult=1.15)
    
    draw_centered("Akshay", 0.44, int(180*scale), MAROON)
    draw_centered("(son of Mr. Anil & Mrs. Archana Dewalwar)", 0.49, int(50*scale), MAROON)
    
    draw_centered("with", 0.535, int(55*scale), MAROON)
    
    draw_centered("Divyanka", 0.59, int(180*scale), MAROON)
    draw_centered("(daughter of Mr. Prakash & Mrs. Priyanka Chachad)", 0.64, int(50*scale), MAROON)
    
    draw_centered("Wedding Ceremony", 0.72, int(90*scale), MAROON)
    draw_centered("Fri, 6th and Sat, 7th Feb 2026", 0.76, int(60*scale), MAROON)
    
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
    
    # --- IMAGE PAGES (Optimized) ---
    print("Adding optimized image pages...")
    for img_file in OTHER_PAGES:
        if os.path.exists(img_file):
            print(f"Optimizing {img_file}...")
            
            # Optimize and save temp
            img = Image.open(img_file)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize to match page size
            img = img.resize((W, H), Image.Resampling.LANCZOS)
            
            temp_path = f"assets/temp_{img_file.replace('.png', '.jpg')}"
            img.save(temp_path, format='JPEG', quality=75, optimize=True)
            
            c.drawImage(temp_path, 0, 0, width=W, height=H)
            c.showPage()
            
            # Cleanup
            os.remove(temp_path)
    
    c.save()
    print(f"\nOptimized PDF saved: {OUTPUT_FILENAME}")
    
    # Cleanup
    if os.path.exists(temp_bg):
        os.remove(temp_bg)
    
    # Report size
    size_mb = os.path.getsize(OUTPUT_FILENAME) / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB")

if __name__ == "__main__":
    generate_optimized_pdf()
