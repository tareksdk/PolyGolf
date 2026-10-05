"""Original Saltwind brig. Metres, Z up. Kept within the discovery hit volumes."""
name='pirate-ship'
def cloth(color, vertices, axis):
    # A thin closed surface avoids coplanar front/back faces and shadow acne.
    front=[tuple(v[i]-.025*(i==axis) for i in range(3)) for v in vertices]
    back=[tuple(v[i]+.025*(i==axis) for i in range(3)) for v in vertices]
    n=len(vertices)
    faces=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    poly(name,color,front+back,faces)
stations=[(-11.5,.16),(-9,2.3),(-6,3.2),(-2,3.7),(3,3.65),(7,2.9),(10,1.5),(11.5,.06)]
def beam(y):
    for (a,wa),(b,wb) in zip(stations,stations[1:]):
        if a<=y<=b:return wa+(wb-wa)*(y-a)/(b-a)
    return .1
def deck(y):return 3.7+.012*y*y
for (ya,wa),(yb,wb) in zip(stations,stations[1:]):
    # Four chine bands give the hull a rounder, believable tumblehome silhouette.
    for side in (-1,1):
        for band,((za,fa),(zb,fb)) in enumerate(zip([(0,.23),(1.15,.67),(2.55,1.0),(3.5,.97)],[(1.15,.67),(2.55,1.0),(3.5,.97),(4.1,.96)])):
            offa=deck(ya)-3.7;offb=deck(yb)-3.7
            poly(name,['#382c24','#553c29','#765031','#b29258'][band],[(side*wa*fa,ya,za+offa),(side*wb*fa,yb,za+offb),(side*wb*fb,yb,zb+offb),(side*wa*fb,ya,zb+offa)],[(0,1,2,3)] if side==1 else [(3,2,1,0)])
        for z in (1.25,2.65,3.55):rod(name,'#362d24',(side*wa*(.98 if z>2 else .7),ya,z+deck(ya)-3.7),(side*wb*(.98 if z>2 else .7),yb,z+deck(yb)-3.7),.055,5)
        rod(name,'#d0ad69',(side*wa*.97,ya,deck(ya)+.65),(side*wb*.97,yb,deck(yb)+.65),.095,6)
    poly(name,'#af8a54',[(-wa*.96,ya,deck(ya)),(wa*.96,ya,deck(ya)),(wb*.96,yb,deck(yb)),(-wb*.96,yb,deck(yb))],[(0,1,2,3)])
for y in [i*.7 for i in range(-14,15)]:
    w=beam(y)*.94
    rod(name,'#725433',(-w,y,deck(y)+.012),(w,y,deck(y)+.012),.018,4)
for y in range(-8,10,2):
    for side in (-1,1):
        x=side*beam(y)*.965
        rod(name,'#bda16e',(x,y,deck(y)),(x,y,deck(y)+.65),.06,6)
for y in (-5,-1,3,6):
    for side in (-1,1):
        x=side*beam(y)
        box(name,'#251f1c',(x,y,2.92+deck(y)-3.7),(.12,.72,.58),.015)
        rod(name,'#354042',(x-side*.24,y,2.97+deck(y)-3.7),(x+side*.48,y,3.04+deck(y)-3.7),.18,10)
        cyl(name,'#161f20',(x+side*.50,y,3.04+deck(y)-3.7),.125,.018,10,(0,math.pi/2,0))
# Raised stern cabin, windows, carved transom and quarterdeck.
box(name,'#61432d',(0,-7.5,5.0),(4.55,3.5,1.8),.06)
box(name,'#c2a06a',(0,-7.5,5.96),(4.9,3.8,.16),.025)
for x in (-1.48,0,1.48):
    box(name,'#bc9a5a',(x,-9.29,5.0),(.97,.13,.91),.02)
    box(name,'#3c6268',(x,-9.37,5.0),(.78,.05,.7),.015)
    for dx in (-.22,.22):box(name,'#d1b47d',(x+dx,-9.41,5.0),(.045,.025,.75),0)
    box(name,'#d1b47d',(x,-9.41,5.0),(.8,.025,.045),0)
for i in range(7):box(name,'#a68b59',(-2.35,-5.8+i*.27,4.1+i*.25),(.78,.3,.12),.012)
for x in (-2.36,2.36):
    rod(name,'#ccb57e',(x,-9.3,6.55),(x,-5.65,6.55),.065,6)
    for y in (-9.2,-8.3,-7.4,-6.5,-5.7):rod(name,'#6c5339',(x,y,6),(x,y,6.55),.05,5)
# Main and fore masts with lower and top sails, spars, ratlines and stays.
for y,top,width in [(-1.3,22,4.8),(6.0,18,3.45)]:
    cone(name,'#795937',(0,y,(top+3.8)/2),.25,.11,top-3.8,10)
    cyl(name,'#5c4430',(0,y,top-5.2),.73,.18,10)
    for bottom,upper,sw in [(7.2,top-6.0,width),(top-4.7,top-1.7,width*.68)]:
        rod(name,'#62492e',(-sw-.35,y,upper),(sw+.35,y,upper),.105,8)
        for ix in range(8):
            for iz in range(4):
                def point(i,j):
                    u=i/8;v=j/4;x=(u*2-1)*sw*(.92+.08*v)
                    return (x,y+math.sin(u*math.pi)*math.sin(v*math.pi)*1.0, bottom+v*(upper-bottom)+.2*math.cos(u*math.pi*2)*(1-v))
                v=[point(ix,iz),point(ix+1,iz),point(ix+1,iz+1),point(ix,iz+1)]
                cloth('#d9d0af' if ix in (0,7) else '#e9e1c5',v,1)
        for side in (-1,1):rod(name,'#b4a78b',(side*sw*.93,y,bottom),(side*beam(y)*.88,y+1.4,deck(y)+.5),.022,4)
    for side in (-1,1):
        for k in range(4):rod(name,'#514a3b',(side*.3,y,top-5),(side*2.7,y-1.3+k*.8,4.3),.022,4)
        for k in range(1,13):
            z=4.3+k*.62;t=(z-4.3)/(top-9.3);x=side*(2.7-2.4*t)
            rod(name,'#817961',(x,y-1.3*(1-t),z),(x,y+1.1*(1-t),z),.018,4)
    box(name,'#253b3b',(1.0,y,top-.4),(2,.04,.92),0)
    blob(name,'#eee8cc',(1,y-.05,top-.3),(.25,.028,.23),1)
    for dx in (-.09,.09):blob(name,'#253b3b',(1+dx,y-.08,top-.29),(.055,.018,.06),1)
    for slope in (-1,1):rod(name,'#e5dfc6',(.65,y-.06,top-.7-slope*.15),(1.35,y-.06,top-.7+slope*.15),.035,4)
rod(name,'#735532',(0,9,4.8),(0,14,6.7),.13,8)
for z in (11,16):rod(name,'#736d58',(0,6,z),(0,14,6.7),.022,4)
cloth('#e1d7ba',[(.04,6.25,15.2),(.04,13.4,6.7),(.04,6.4,7.3)],0)
rod(name,'#736d58',(0,-1.3,21.5),(0,6,17.6),.026,4)
rod(name,'#736d58',(0,-1.3,21.5),(0,-10,5.4),.026,4)
# Hatches, a ship wheel, barrels and coiled rope stay clear of each other.
box(name,'#493d2a',(0,2.7,3.94),(2.1,1.9,.26),.04)
for x in (-.7,-.35,0,.35,.7):rod(name,'#aa8c5b',(x,1.8,4.1),(x,3.6,4.1),.055,5)
rod(name,'#765b39',(0,-6.3,6.0),(0,-6.3,7.1),.12,8)
ring(name,'#c4a472',(0,-6.3,7),.55,.045,12,5,(math.pi/2,0,0))
for i in range(8):
    a=i*math.tau/8;rod(name,'#b9945a',(0,-6.3,7),(.7*math.cos(a),-6.3,7+.7*math.sin(a)),.03,5)
for x,y in [(-1.7,4.3),(1.8,4.2),(-1.6,-3.5),(1.5,-3.4)]:
    z=deck(y);cone(name,'#83633e',(x,y,z+.45),.32,.36,.9,10)
    for dz in (.12,.76):ring(name,'#42483a',(x,y,z+dz),.35,.035,10,4)
for i in range(3):ring(name,'#b4a078',(2.0,0,3.76+i*.055),.45-i*.07,.03,12,4)
