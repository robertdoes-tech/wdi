import random, math, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops, ImageOps
S='/tmp/claude-0/-home-user-wdi/3c8b6b88-b986-58b3-a155-b204dcd42d8c/scratchpad'
src=Image.open(S+'/../images/1.jpg').convert('RGB')
W,H=1414,2000
PAPER=(244,240,232); INK=(28,26,24)
F=lambda n,s: ImageFont.truetype(n,s)
ANTON=S+'/fonts/anton.ttf'; CAV=S+'/fonts/caveat.ttf'
INTER='/usr/share/fonts/opentype/inter/Inter-%s.otf'
random.seed(7)

def fill(img,w,h,cx=0.5,cy=0.5):
    r=max(w/img.width,h/img.height); im=img.resize((round(img.width*r),round(img.height*r)),Image.LANCZOS)
    x=int((im.width-w)*cx); y=int((im.height-h)*cy); return im.crop((x,y,x+w,y+h))
def grade(im,warm=0,sat=0.9,con=1.08,bri=1.0):
    im=ImageEnhance.Color(im).enhance(sat); im=ImageEnhance.Contrast(im).enhance(con); im=ImageEnhance.Brightness(im).enhance(bri)
    r,g,b=im.split(); r=r.point(lambda v:min(255,v+warm)); b=b.point(lambda v:max(0,v-warm)); return Image.merge('RGB',(r,g,b))
def sharpen(im): return im.filter(ImageFilter.UnsharpMask(2,60,2))

canvas=Image.new('RGB',(W,H),PAPER)
SEAM=1000
# --- Kiko panel (top) ---
k=src.crop((300,505,1130,1085))
k=sharpen(grade(fill(k,W,SEAM,0.5,0.35),warm=-4,sat=0.85))
# vignette + bottom darkening for title
v=Image.new('L',(W,SEAM),0); d=ImageDraw.Draw(v)
for i in range(420):
    a=int(200*(i/420)**1.8); d.line([(0,SEAM-420+i),(W,SEAM-420+i)],fill=a)
for i in range(160):
    a=int(140*(1-i/160)**2); d.line([(0,i),(W,i)],fill=max(a,v.getpixel((0,i))))
k=Image.composite(Image.new('RGB',(W,SEAM),(12,14,18)),k,v)
canvas.paste(k,(0,0))
# --- Liway panel (bottom) ---
LT=SEAM; LB=1660
l=src.crop((470,1085,1110,1690))
l=sharpen(grade(fill(l,W,LB-LT,0.5,0.12),warm=6,sat=0.95))
v2=Image.new('L',l.size,0); d=ImageDraw.Draw(v2)
for i in range(260):
    a=int(170*(1-i/260)**2); d.line([(0,i),(W,i)],fill=a)
for i in range(200):
    a=int(255*(i/200)**2); d.line([(0,l.height-200+i),(W,l.height-200+i)],fill=a)
l=Image.composite(Image.new('RGB',l.size,(12,14,18)),l,v2.point(lambda a:a if a<200 else a)) 
# fade bottom of Liway into paper instead of black
fadeP=Image.new('L',l.size,0); d=ImageDraw.Draw(fadeP)
for i in range(170):
    d.line([(0,l.height-170+i),(W,l.height-170+i)],fill=int(255*(i/170)**1.6))
l=Image.composite(Image.new('RGB',l.size,PAPER),l,fadeP)
canvas.paste(l,(0,LT))
# re-fade (Liway panel's own top darkening was composited with black; redo: keep)
# --- grain ---
noise=Image.effect_noise((W,H),28).convert('L')
grain=Image.merge('RGB',(noise,noise,noise))
canvas=Image.blend(canvas,ImageChops.overlay(canvas,grain),0.22)
d=ImageDraw.Draw(canvas)

# --- pencil seam: hand-drawn line with three beats (the three notes) ---
def pencil(points,width=5,col=(244,240,232),passes=3):
    for p in range(passes):
        pts=[(x+random.uniform(-1.2,1.2),y+random.uniform(-1.2,1.2)) for x,y in points]
        d.line(pts,fill=col,width=max(1,width-p*2),joint='curve')
pts=[]; cx=W/2
beats=[cx-120,cx,cx+120]
for x in range(-10,W+12,6):
    y=SEAM
    for i,b in enumerate(beats):
        t=(x-b)/26
        y-= [34,58,34][i]*math.exp(-t*t)*math.cos(t*1.6)
    y+=math.sin(x/37)*1.6
    pts.append((x,y))

# --- title over seam ---
title='KUMPAS'
tf=F(ANTON,300)
tw=d.textlength(title,font=tf)+ (len(title)-1)*14
tx=(W-tw)/2; ty=SEAM-470
shadow=Image.new('L',(W,H),0); sd=ImageDraw.Draw(shadow)
x=tx
for ch in title:
    sd.text((x,ty),ch,font=tf,fill=170); x+=d.textlength(ch,font=tf)+14
shadow=shadow.filter(ImageFilter.GaussianBlur(22))
canvas=Image.composite(Image.new('RGB',(W,H),(0,0,0)),canvas,shadow.point(lambda a:int(a*0.6)))
d=ImageDraw.Draw(canvas)
x=tx
for ch in title:
    d.text((x,ty),ch,font=tf,fill=(250,248,243)); x+=d.textlength(ch,font=tf)+14
pencil(pts,width=5)

# top line
f=F(INTER%'Medium',22)
top='DISTRICT 2  ·  SINETATSULOK  PRESENTS'
d.text(((W-d.textlength(top,font=f))/2,62),top,font=f,fill=(236,234,228),spacing=0)
f2=F(INTER%'Regular',19)
sub='ISABELA FILM ACADEMY 2.0  ·  ECHAGUE, ISABELA'
d.text(((W-d.textlength(sub,font=f2))/2,98),sub,font=f2,fill=(200,200,196))

# tagline (Liway's pencil hand) bottom-left over her panel
tg=F(CAV,64)
for i,t in enumerate(['Hindi kailangang','marinig para','maramdaman.']):
    d.text((W-90-d.textlength(t,font=tg),SEAM+250+i*70),t,font=tg,fill=(250,248,243))

# --- billing block ---
def billing(lines,y,size=24,lh=40):
    fr=F(INTER%'Regular',size); fb=F(INTER%'SemiBold',size)
    for segs in lines:
        w=sum(d.textlength(t,font=fb if b else fr) for t,b in segs)
        x=(W-w)/2
        for t,b in segs:
            d.text((x,y),t,font=fb if b else fr,fill=INK if b else (95,90,84)); x+=d.textlength(t,font=fb if b else fr)
        y+=lh
    return y
DOT='   ·   '
y=billing([
 [('STARRING  ',0),('Simone Eljhay R. Batara',1),DOT and ('   ·   ',0),('Jhohara V. Lapastora',1)],
 [('Clyde Vinzon Martin',1),('   ·   ',0),('Reign Joy S. Martinez',1)],
],1672,size=27,lh=42)
y=billing([
 [('Directed by ',0),('Paul Angelo C. Siar',1),('   ·   Assistant Director ',0),('Hydee G. Tuppil',1),('   ·   Written by ',0),('Hariet Nadia Marie C. Yanos',1)],
 [('Cinematography ',0),('Josh Ian S. Paguirigan',1),('   ·   Edited by ',0),('Gerald Gauiran',1),('   ·   Sound ',0),('Paul Angelo C. Siar & Gerald Gauiran',1)],
 [('Production Design ',0),('Clyde Vinzon Martin, Ricardo Vigan & Danielle Louie M. Penaribe',1),('   ·   Poster ',0),('Marc Robert Tretasco',1)],
],y+14,size=19,lh=31)
# logos
seal=src.crop((596,1878,690,1972)); bam=src.crop((718,1876,872,1968))
lg_y=y+20; gap=40
sw=int(seal.width*1.05); bw=int(bam.width*1.05)
seal=seal.resize((sw,int(seal.height*1.05)),Image.LANCZOS); bam=bam.resize((bw,int(bam.height*1.05)),Image.LANCZOS)
lx=(W-(sw+gap+bw))//2
for im,xx in ((seal,lx),(bam,lx+sw+gap)):
    g=im.convert('L'); hsv=im.convert('HSV').split()[1]
    m=Image.eval(g,lambda v:255 if v<200 else (0 if v>228 else int((228-v)/28*255)))
    bg=im.getpixel((1,1)); diff=ImageChops.difference(im,Image.new('RGB',im.size,bg)).convert('L')
    m=diff.point(lambda v:0 if v<14 else (255 if v>34 else int((v-14)/20*255)))
    if xx==lx: m=Image.new('L',im.size,0); ImageDraw.Draw(m).ellipse((2,2,im.width-3,im.height-3),fill=255)
    canvas.paste(im,(xx,lg_y),m.filter(ImageFilter.GaussianBlur(0.8)))
print('logo bottom',lg_y+seal.height)
canvas.save(S+'/KUMPAS_poster_v2.png'); canvas.convert('RGB').save(S+'/KUMPAS_poster_v2.jpg',quality=93)
canvas.resize((707,1000),Image.LANCZOS).save(S+'/preview.png')
