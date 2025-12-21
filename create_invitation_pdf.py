import os
from PIL import Image

def create_wedding_invitation():
    # Define file order
    files = [
        "Invitation Cover.png",
        "Haldi Final.png",
        "Sangeet Final.png",
        "Barat.png",
        "Wedding Ceremony.png"
    ]
    
    # Validation: Check if all files exist
    missing_files = [f for f in files if not os.path.exists(f)]
    if missing_files:
        print(f"Error: Missing files: {missing_files}")
        return

    print("Found all images. Processing...")

    # --- High Quality Version ---
    print("Generating High Quality PDF...")
    images_hq = []
    for f in files:
        img = Image.open(f)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        images_hq.append(img)
    
    images_hq[0].save(
        "Wedding_Invitation_HighQuality.pdf",
        "PDF",
        resolution=100.0,
        save_all=True,
        append_images=images_hq[1:]
    )
    print("Saved 'Wedding_Invitation_HighQuality.pdf'")

    # --- Optimized Version ---
    print("Generating Optimized PDF...")
    images_opt = []
    MAX_WIDTH = 1600  # Good balance for mobile/desktop sharing
    
    for f in files:
        img = Image.open(f)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if larger than max width
        width, height = img.size
        if width > MAX_WIDTH:
            ratio = MAX_WIDTH / width
            new_height = int(height * ratio)
            img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
            
        images_opt.append(img)

    images_opt[0].save(
        "Wedding_Invitation_Optimized.pdf",
        "PDF",
        resolution=72.0, # Standard screen resolution
        save_all=True,
        append_images=images_opt[1:],
        quality=85,
        optimize=True
    )
    print("Saved 'Wedding_Invitation_Optimized.pdf'")
    print("Done.")

if __name__ == "__main__":
    create_wedding_invitation()
