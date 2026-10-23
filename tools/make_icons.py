from PIL import Image, ImageDraw

OUT = r"D:\代码\today-block\assets"

def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask

# App icon: dark rounded square with mint ring + check
size = 256
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
d = ImageDraw.Draw(bg)
for y in range(size):
    t = y / (size - 1)
    r = int(18 + 8 * t)
    g = int(27 + 17 * t)
    b = int(38 + 22 * t)
    d.line((0, y, size, y), fill=(r, g, b, 255))
img.alpha_composite(bg)

d = ImageDraw.Draw(img)
# mint outer ring
d.ellipse((37, 37, 219, 219), outline=(110, 231, 183, 255), width=9)
# inner soft glow ring
d.ellipse((55, 55, 201, 201), outline=(110, 231, 183, 56), width=3)
# check mark
d.line([(82, 132), (113, 163), (177, 96)], fill=(167, 243, 208, 255), width=16, joint="curve")
# end caps
for x, y in [(82, 132), (177, 96)]:
    d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=(167, 243, 208, 255))
img.putalpha(rounded_mask(size, 58))
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
