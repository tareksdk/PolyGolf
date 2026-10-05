"""Original scenic meshes, executed by build_course_kit.py inside Blender.
All scenery is authored in metres; export combines each named asset into one mesh.
"""

def landscape_mesh(name, seed, island=False):
    rng = random.Random(seed)
    segments, rings = (64, 16) if island else (88, 24)
    peaks = [(rng.uniform(-.5,.5), rng.uniform(-.45,.45), rng.uniform(.55,1), rng.uniform(.16,.33)) for _ in range(7)]
    def height(x, y):
        if island:
            return 8 + 65 * max(0, 1 - (x*x + y*y)) ** .8 + 13 * math.sin(x*5+y*3) * max(0,1-x*x-y*y)
        # Long ridgelines and glacial shoulders instead of noisy isolated bumps.
        ridge = .12*math.sin(x*5+seed)+.055*math.sin(x*11)
        spine = math.exp(-abs((y-ridge)*4.1)**1.25)
        summit = .72+.18*math.cos(x*5.2+seed)+.10*math.cos(x*11.3)
        shoulder = .36*math.exp(-((y+.36)*3)**2)*max(0,1-x*x)
        gullies = 1-.075*abs(math.sin(x*19+y*4))*abs(y-ridge)
        return 8+265*(spine*summit+shoulder)*max(0,1-x*x*.7)*gullies
    verts=[]
    for r in range(rings+1):
        t=r/rings
        for i in range(segments):
            a=i/segments*math.tau
            coast=1+.11*math.sin(a*5+seed)+.055*math.sin(a*11-seed)
            x,y=math.cos(a)*t,math.sin(a)*t
            if island:
                # Steep layered rock at the shore, softer grassy headland above it.
                z=height(x,y) if t<.79 else 12-(t-.79)*80
                z+=math.sin(a*9+seed)*1.1*t
            else:
                z=height(x,y)*max(0,1-t**6)-5
            verts.append((x*(135 if island else 265)*coast,y*(95 if island else 210)*coast,z))
    faces=[]; colors=[]
    for r in range(rings):
        for i in range(segments):
            a=r*segments+i;b=r*segments+(i+1)%segments;c=a+segments;d=b+segments
            for ids in [(a,c,b),(b,c,d)]:
                faces.append(ids)
                z=sum(verts[j][2] for j in ids)/3
                if island:
                    pal=['#aa9b80','#b3a387','#bcac8f'] if r>=rings-4 else ['#738a52','#798e56','#80945b']
                else:
                    snowline=181+18*math.sin(i/segments*math.tau*3+seed)
                    pal=['#d8ddd6','#e1e5dc','#e8ebe2'] if z>snowline else ['#8a948b','#939d91','#9da599'] if z>78 else ['#536f51','#5d7856','#66805b']
                # Broad bands preserve clean faces without per-triangle colour noise.
                colors.append(pal[int((math.sin(i/segments*math.tau*2+seed)+1)*1.49)])
    o=poly(name,colors[0],verts,faces)
    for col in sorted(set(colors)):
        if col!=colors[0]:o.data.materials.append(material(col))
    idx={m.name:i for i,m in enumerate(o.data.materials)}
    for face,col in zip(o.data.polygons,colors):face.material_index=idx[col]
    # Dark pines on foothills give a readable human scale to the mountain walls.
    for i in range(110 if not island else 150):
        a=i*2.399+seed;t=.26+(i%11)*.045
        x,y=math.cos(a)*t,math.sin(a)*t
        z=height(x,y)*(1-t**6)-5 if not island else height(x,y)
        if not island and z>105:continue
        if island and abs(x-.18)<.16 and abs(y+.25)<.2:continue
        coast=1+.11*math.sin(a*5+seed)+.055*math.sin(a*11-seed)
        px,py=x*(135 if island else 265)*coast,y*(95 if island else 210)*coast
        size=.75+(i%5)*.11
        cyl(name,'#6c5840',(px,py,z+2*size),.22,4*size,5)
        for k in range(3):cone(name,['#355641','#426548','#527653'][k],(px,py,z+(3+k*2.3)*size),(3.6-k*.8)*size,.05,6*size,7)
    if island:
        # A small fishing hamlet, drystone walls and a lookout on the headland.
        for i in range(5):
            x=.1+(i%3)*.06;y=-.27+(i//3)*.11
            a=math.atan2(y,x);coast=1+.11*math.sin(a*5+seed)+.055*math.sin(a*11-seed)
            px,py=x*135*coast,y*95*coast;z=height(x,y)
            box(name,'#96977f',(px,py,z-1.9),(5.5,4.6,4),.03)
            box(name,['#ddd0b0','#b58464','#ced0ae'][i%3],(px,py,z+2.1),(5.4,4.5,4.2),.05)
            roof=gable(name,'#54675e',5.4,4.5,4.2,6.1,.3);roof.location=(px,py,z)
            box(name,'#405b52',(px,py-2.29,z+1.45),(1.05,.08,2.9),.01)
            for dx in (-1.65,1.65):box(name,'#adc8c5',(px+dx,py-2.3,z+2.7),(.9,.09,1.1),.015)
            box(name,'#a4a087',(px+1.7,py,z+5.5),(.7,.7,2.7),.03)
        for i in range(18):
            x=.06+i*.013;y=-.38;a=math.atan2(y,x);coast=1+.11*math.sin(a*5+seed)+.055*math.sin(a*11-seed)
            box(name,'#9a9c81',(x*135*coast,y*95*coast,height(x,y)+.45),(1.9,.6,.9),.04)
        # Shore boulders and pale sand coves connect the headland to the water.
        for i in range(25):
            a=i*math.tau/25;t=.955;coast=1+.11*math.sin(a*5+seed)+.055*math.sin(a*11-seed)
            blob(name,'#b2a286',(math.cos(a)*t*135*coast,math.sin(a)*t*95*coast,-.2),(3.2,2.3,1.9),1)
    return height

landscape_mesh('alpine-massif',23)
landscape_mesh('alpine-ridge',47)
landscape_mesh('coastal-headland',9,True)

# A sea arch carved through an irregular, layered rock buttress.
name='sea-arch'
for i in range(15):
    a=i*math.pi/14;b=(i+1)*math.pi/14
    if i==14:continue
    for face in range(4):
        p=[]
        for ang,rad,y in [(a,18,-6),(b,18,-6),(b,27,-6),(a,27,-6),(a,18,6),(b,18,6),(b,27,6),(a,27,6)]:
            p.append((math.cos(ang)*rad,y*(1+.08*math.sin(i*2)),math.sin(ang)*rad+2))
        ids=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7)][face]
        poly(name,['#b8a789','#c8b594','#9a917c','#889363'][face],p,[ids])
for x in [-24,24]:
    blob(name,'#9c937e',(x,0,1),(10,9,7),1)

# Coastal harbor: a long weathered jetty, pilings, mooring ropes and little stores.
name='harbor-jetty'
box(name,'#ad936e',(0,0,2.7),(38,6,.6),.08)
for i in range(39):box(name,'#806e53',(-18.5+i,0,3.015),(.035,6,.025),0)
for x in [-17,-10,-3,4,11,18]:
    for y in [-2.6,2.6]:
        cyl(name,'#6f614a',(x,y,1.1),.25,5.5,8)
        ring(name,'#d1bf8f',(x,y,3.5),.26,.06,8,4)
for i in range(3):
    x=-13+i*9
    box(name,['#d1b993','#b9664e','#71938b'][i],(x,5,5.7),(6,5,5.4),.06)
    gable(name,'#526661',6,5,8.4,10.6,.4).location=(x,5,0)
    box(name,'#334e4c',(x,2.44,5),(1.5,.14,3.7),.02)
    for off in [-1.95,1.95]:
        box(name,'#abc2b7',(x+off,2.44,6),(1.05,.12,1.2),.02)
        box(name,'#e8d7b4',(x+off,2.36,6),(.09,.08,1.28),.01)
    for off in [-2.4,2.4]:box(name,'#ddc9a4',(x+off,2.36,4.8),(.15,.17,5.2),.01)

# Small sailboats: faceted hull, inset cockpit, boom, rudder and taut canvas sails.
for name,col in [('sailboat','#ece7d2'),('sailboat-red','#a85643')]:
    verts=[(-1.5,-4,1), (1.5,-4,1),(1.8,1.5,1),(0,5,1),(-1.8,1.5,1),(-.6,-3,-.5),(.6,-3,-.5),(0,3,-.3)]
    poly(name,col,verts,[(0,1,6,5),(1,2,7,6),(2,3,7),(3,4,7),(4,0,5,7),(5,6,7)])
    poly(name,'#bb9971',verts,[(0,4,3,2,1)])
    box(name,'#405f63',(0,-1.8,1.12),(1.8,2,.2),.05)
    cyl(name,'#c6bd9e',(0,.5,6.6),.10,11.2,8)
    rod(name,'#ae9a73',(0,.5,2.5),(0,-4,2.5),.08,6)
    poly(name,'#f6efd8',[(0,.5,11.9),(0,.5,2.8),(0,-4.2,2.8)],[(0,1,2),(2,1,0)])
    poly(name,'#e2bb65',[(.03,.75,10.3),(.03,4.3,1.7),(.03,.75,2.5)],[(0,1,2),(2,1,0)])

# An alpine lodge and terraced deck, distinct from the course clubhouse.
name='alpine-lodge'
box(name,'#8b8d7a',(0,0,1.4),(14,9,2.8),.08)
box(name,'#a88159',(0,0,4.4),(14,9,3.2),.04)
gable(name,'#445e50',15,10,6,10,.5)
for z in [3.2,4,4.8,5.6]:box(name,'#7c6146',(0,-4.53,z),(14,.09,.12),.01)
for x in [-5,-2.5,2.5,5]:
    box(name,'#435e57',(x,-4.61,4.5),(1.5,.1,1.65),.01)
    box(name,'#ecdcaf',(x,-4.7,4.5),(.10,.06,1.7),.01)
    box(name,'#ecdcaf',(x,-4.7,4.5),(1.6,.06,.10),.01)
box(name,'#513f30',(0,-4.65,2),(1.8,.15,3.3),.02)
box(name,'#ae9369',(0,-6.5,.4),(18,5,.8),.03)
for x in range(-8,9,2):
    box(name,'#7d694d',(x,-8.8,1.2),(.14,.14,1.6),.015)
for z in [1,1.8]:box(name,'#b69b71',(0,-8.8,z),(17,.13,.13),.01)
box(name,'#9c9982',(4,1,8.7),(1.3,1.3,5),.06)

# Cliff waterfall with exposed strata: opaque cascades keep web rendering inexpensive.
name='waterfall-crag'
# A broad stepped outcrop with sloping shoulders, not a stack of vertical monoliths.
for tier in range(5):
    z=3+tier*5.5
    for side in [-1,1]:
        x=side*(7+tier*.45)
        rock=blob(name,['#879382','#96a18d','#a1a792'][tier%3],(x,4+tier*1.1,z),(17-tier*2,12-tier,5.5),2)
        rock.rotation_euler=(.12*side,.15*side,.12*tier*side)
for i in range(5):
    z=27-i*5.3
    box(name,['#a4ccd0','#c4dfdc','#e0e9d6'][i%3],(.5*math.sin(i),-5-i*.9,z),(2.8,.4,5.8),.04,(-.17,0,.025*math.sin(i)))
for i in range(6):blob(name,'#a6ced0',((i%3-1)*1.7,-10-i*.6,.5),(2.6,2.5,.2),1)

# Small ribbed pumpkin, sized to the shared discovery hit volume.
name='halloween-pumpkin'
for i in range(10):
    a=i*math.tau/10
    blob(name,['#c7732d','#d68432','#dd913c'][i%3],(.37*math.cos(a),.37*math.sin(a),.66),(.55,.55,.64),2)
cone(name,'#54653c',(.04,0,1.39),.12,.075,.3,7,rot=(.1,.2,0))
# The face is inset-looking paint on the outward facets, never a floating sign.
for x in [-.31,.31]:
    poly(name,'#34372b',[(x-.14,-.84,.91),(x+.14,-.84,.91),(x,-.90,1.10)],[(0,1,2)])
poly(name,'#34372b',[(-.43,-.84,.57),(-.22,-.93,.42),(.21,-.93,.42),(.43,-.84,.57),(.21,-.90,.55),(0,-.95,.49),(-.21,-.90,.55)],[(0,1,6),(1,2,5),(1,5,6),(2,3,4),(2,4,5)])

# Little gull silhouettes placed in loose flocks over the coast.
name='gull'
poly(name,'#f0ead6',[(-1.7,0,.1),(-.7,.12,.5),(0,0,0),(.7,.12,.5),(1.7,0,.1),(0,-.28,.02)],[(0,1,2),(2,3,4),(1,5,3)])

bpy.context.view_layer.update()
