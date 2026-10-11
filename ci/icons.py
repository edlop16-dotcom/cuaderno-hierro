from PIL import Image, ImageDraw
import os
os.makedirs('assets', exist_ok=True)
def dumbbell(d, S, col, cx, cy, scale):
    u = S * scale
    d.rounded_rectangle([cx-1.6*u, cy-0.09*u, cx+1.6*u, cy+0.09*u], radius=0.09*u, fill=col)
    for sgn in (-1, 1):
        for (off, h, w) in ((1.05, 0.95, 0.26), (1.38, 0.66, 0.22)):
            x = cx + sgn*off*u
            d.rounded_rectangle([x-w*u/2, cy-h*u/2, x+w*u/2, cy+h*u/2], radius=0.07*u, fill=col)
S = 1024; bg = (18, 21, 25, 255); yel = (242, 194, 48, 255)
im = Image.new('RGBA', (S, S), bg); dumbbell(ImageDraw.Draw(im), S, yel, S/2, S/2, 0.2); im.save('assets/icon-only.png')
fg = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dumbbell(ImageDraw.Draw(fg), S, yel, S/2, S/2, 0.15); fg.save('assets/icon-foreground.png')
Image.new('RGBA', (S, S), bg).save('assets/icon-background.png')
for n in ('splash.png', 'splash-dark.png'):
    sp = Image.new('RGBA', (2732, 2732), bg); dumbbell(ImageDraw.Draw(sp), 2732, yel, 1366, 1366, 0.07); sp.save('assets/' + n)
