from PIL import Image, ImageDraw

OUT = r"D:\代码\today-block\assets"

def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask

# App icon: same rounded-square check as the tray icon
size = 256
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle(
    (16, 16, 239, 239),
    radius=64,
    fill=(15, 23, 32, 255),
    outline=(110, 231, 183, 255),
    width=8
)
d.line([(64, 136), (104, 176), (192, 80)], fill=(167, 243, 208, 255), width=24, joint="curve")
for x, y in [(64, 136), (192, 80)]:
    d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=(167, 243, 208, 255))
img.save(f"{OUT}\\icon.png")

# Tray icon: transparent, high-contrast mint check
tray = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
d = ImageDraw.Draw(tray)
d.rounded_rectangle((2, 2, 29, 29), radius=8, fill=(15, 23, 32, 240), outline=(110, 231, 183, 220), width=1)
d.line([(8, 17), (13, 22), (24, 10)], fill=(167, 243, 208, 255), width=3, joint="curve")
tray.save(f"{OUT}\\tray.png")

# Windows ICO (multi-size) for packaging
img.save(f"{OUT}\\icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icons written")
