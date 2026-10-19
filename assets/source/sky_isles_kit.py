"""PolyGolf sky isles kit. Original low-poly assets for the Shattered Crown map of the month.

Run with Blender:   blender --background --factory-startup --python assets/source/sky_isles_kit.py
Or the bpy module:  python3.11 assets/source/sky_isles_kit.py   (bpy 4.2+)

Same conventions and export format as build_course_kit.py: every asset sits on its own origin
(Blender Z up, front facing -Y), metres, flat shading and one palette colour per triangle.
Ruins are stacked from individual stone blocks so broken tops, windows and arches read as
masonry at golf-camera distance. The playable islands are not in this kit: their surfaces and
undersides are generated in the browser from the same outline the physics uses.
"""
import bpy, bmesh, json, math, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
random.seed(82)
bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {}

STONE = ['#c3b6a2', '#b1a592', '#cdc2ad', '#a69a89']
STONE_DARK = '#8f8476'
MOSS = ['#7f9c56', '#93b062', '#6e8c4c']
UNDER = ['#9a8d8a', '#8a7f86', '#a69488', '#7c7380']


def material(hex):
    if hex not in materials:
        m = bpy.data.materials.new(hex)
        c = [int(hex[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        m.diffuse_color = tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c) + (1,)
        materials[hex] = m
    return materials[hex]


def finish(o, name, color):
    o.name = name
    o.data.materials.append(material(color))
    return o


def box(name, color, p, s, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p, rotation=rot)
    o = finish(bpy.context.object, name, color)
    o.scale = s
    return o


def cone(name, color, p, r1, r2, h, verts=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h, location=p, rotation=rot)
    return finish(bpy.context.object, name, color)


def blob(name, color, p, s, sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1, location=p)
    o = finish(bpy.context.object, name, color)
    o.scale = s
    return o


def rod(name, color, a, b, r, verts=6, taper=1.0):
    a, b = Vector(a), Vector(b)
    o = cone(name, color, (a + b) / 2, r, r * taper, (b - a).length, verts)
    o.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return o


def poly(name, color, verts, faces, both=False, closed=False):
    if both:
        # The back face sits a few millimetres behind so double-sided cloth never z-fights.
        n = len(verts)
        normal = (Vector(verts[faces[0][1]]) - Vector(verts[faces[0][0]])).cross(Vector(verts[faces[0][2]]) - Vector(verts[faces[0][0]])).normalized() * .012
        verts = list(verts) + [tuple(Vector(v) - normal) for v in verts]
        faces = list(faces) + [tuple(n + i for i in reversed(f)) for f in faces]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    if closed:
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material(color))
    return o


def voussoir(name, color, cx, cz, a0, a1, rx, rz, thick, depth):
    """A wedge-cut arch stone between angles a0 and a1, so joints stay tight on the soffit."""
    pts = []
    for a in (a0, a1):
        for k in (0, 1):
            ox, oz = (rx + thick * k) * math.cos(a), (rz + thick * k) * math.sin(a)
            pts.append((cx + ox, cz + oz))
    verts = [(x, y, z) for y in (-depth / 2, depth / 2) for x, z in pts]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return poly(name, color, verts, faces, closed=True)


def stone():
    return random.choice(STONE)


def block(name, p, s, yaw=0.0, jitter=.04, color=None):
    """One dressed stone, slightly irregular so courses never look extruded."""
    j = lambda v: v * (1 + random.uniform(-jitter, jitter))
    return box(name, color or stone(), p, (j(s[0]), j(s[1]), j(s[2])),
               (random.uniform(-.02, .02), random.uniform(-.02, .02), yaw + random.uniform(-.03, .03)))


def moss_cap(name, p, w, d, yaw=0.0):
    box(name, random.choice(MOSS), (p[0], p[1], p[2] + .07), (w * random.uniform(.7, 1.02), d * random.uniform(.7, 1.02), .16), (0, 0, yaw))


# ---------------------------------------------------------------- ruined tower
def ruin_tower(name='ruin-tower', radius=3.3, courses=12, seg=11, course_h=.86):
    # The broken crown rises toward the back so the hollow interior shows from the tee.
    for c in range(courses):
        z = c * course_h + course_h / 2
        offset = (c % 2) * .5
        for s in range(seg):
            a = (s + offset) / seg * math.tau
            top = 6.2 + 3.6 * (.5 + .5 * math.cos(a - math.pi / 2)) + 1.1 * math.sin(a * 3 + 1)
            if z > top:
                continue
            if c in (4, 5) and s in (2,) or c in (8, 9) and s in (6,):
                continue  # arched windows
            if c == 0 and s == 8:
                continue  # doorway
            if c == 1 and s == 8:
                continue
            w = math.tau * radius / seg * 1.04
            p = (math.cos(a) * radius, math.sin(a) * radius, z)
            block(name, p, (w, .95, course_h * .96), a + math.pi / 2)
            if z + course_h > top:
                if random.random() < .55:
                    moss_cap(name, (p[0], p[1], z + course_h * .48), w * .9, .9, a + math.pi / 2)
    # Window and door lintels.
    for s, c in [(2, 6), (6, 10), (8, 2)]:
        a = (s + (c % 2) * .5) / seg * math.tau
        box(name, STONE_DARK, (math.cos(a) * radius, math.sin(a) * radius, c * course_h + .2), (2.0, 1.1, .38), (0, 0, a + math.pi / 2))
    # A plinth and the rubble that fell from the crown.
    cone(name, STONE[1], (0, 0, -.25), radius + .9, radius + .7, .7, 12)
    cone(name, '#6b6258', (0, 0, .12), radius - .55, radius - .55, .1, 11)
    for i in range(9):
        a = i * 2.4 + .3
        r = radius + 1.4 + random.uniform(0, 2.4)
        block(name, (math.cos(a) * r, math.sin(a) * r, .25), (random.uniform(.6, 1.1), .7, .5), random.uniform(0, 3), .12)
    # Ivy climbing the windward side.
    for i in range(7):
        a = -1.2 + i * .12
        h = 1.2 + i * .9
        blob(name, MOSS[i % 3], (math.cos(a) * (radius + .45), math.sin(a) * (radius + .45), h), (.9, .55, 1.1 + (i % 2) * .4), 1)


ruin_tower()


# ---------------------------------------------------------------- curtain wall with a gate
def ruin_wall(name='ruin-wall', length=15.0, courses=8, course_h=.8):
    bw = 1.25
    n = int(length / bw)
    for c in range(courses):
        z = c * course_h + course_h / 2
        off = (c % 2) * bw / 2
        for i in range(n):
            x = -length / 2 + off + i * bw + bw / 2
            if x > length / 2 - .2:
                continue
            u = (x + length / 2) / length
            top = 3.4 + 3.4 * math.sin(u * math.pi) ** .7 + .9 * math.sin(u * 13) - (2.6 if u > .8 else 0)
            if z > top:
                continue
            if abs(x - 1.2) < 1.4 and z < 3.2:
                continue  # gateway
            block(name, (x, 0, z), (bw * .98, 1.35, course_h * .95))
            if z + course_h > top and random.random() < .6:
                moss_cap(name, (x, 0, z + course_h * .45), bw * .9, 1.3)
    # Gate arch voussoirs.
    for k in range(9):
        a0, a1 = math.pi * k / 9, math.pi * (k + 1) / 9
        voussoir(name, STONE_DARK if k == 4 else STONE[k % 4], 1.2, 3.0, a0 + .01, a1 - .01, 1.4, 1.0, .62, 1.45)
    # Buttresses and rubble on both faces.
    for x in (-5.6, 4.4):
        box(name, STONE[2], (x, -.95, 1.4), (1.3, .7, 2.8))
        box(name, STONE[0], (x, -1.05, 3.0), (1.1, .5, .5), (.35, 0, 0))
    for i in range(10):
        x = random.uniform(-length / 2, length / 2)
        y = random.choice([-1, 1]) * random.uniform(1.3, 3.0)
        block(name, (x, y, .22), (random.uniform(.5, 1.0), .6, .45), random.uniform(0, 3), .15)
    for i in range(5):
        blob(name, MOSS[i % 3], (-6.5 + i * 3.1, -.78, .35), (1.1, .5, .5), 1)


ruin_wall()


# ---------------------------------------------------------------- the broken gate (grand arch)
def ruin_arch(name='ruin-arch'):
    span, course_h = 7.0, .9
    for side, height in [(-1, 9.8), (1, 6.1)]:
        for c in range(int(height / course_h)):
            z = c * course_h + course_h / 2
            for dx in (-.65, .65):
                for dy in (-.65, .65):
                    if (c + (dx > 0) + (dy > 0)) % 2 and c > 3 and random.random() < .12:
                        continue
                    block(name, (side * span / 2 + dx * (1 if c % 2 else .98), dy, z), (1.3, 1.3, course_h * .95), 0, .03)
        box(name, STONE_DARK, (side * span / 2, 0, height + .2), (3.0, 3.0, .45))
        if side < 0:
            moss_cap(name, (side * span / 2, 0, height + .35), 2.6, 2.6)
    # Voussoirs spring from the tall pillar and stop mid-span where the crown fell.
    for k in range(7):
        a1, a0 = math.pi - math.pi * k / 11, math.pi - math.pi * (k + 1) / 11
        voussoir(name, STONE[k % 4], 0, 6.2, a0 + .012, a1 - .012, 2.25, 2.5, .95, 2.3)
    # Fallen keystones on the ground below the gap.
    for p, r in [((1.2, -1.6, .45), .5), ((2.6, 1.4, .4), 1.9), ((.1, 2.4, .35), 2.6)]:
        box(name, STONE[1], p, (1.0, 2.0, .85), (0, .3, r))
    # Pennant hanging from the tall pillar.
    rod(name, '#6a5644', (-span / 2 - 1.7, 0, 10.1), (-span / 2 - 1.7, 0, 5.2), .08)
    poly(name, '#7b5ca8', [(-span / 2 - 1.6, -.02, 9.9), (-span / 2 + .2, -.02, 9.9), (-span / 2 - .3, -.02, 6.1), (-span / 2 - .8, -.02, 6.9), (-span / 2 - 1.3, -.02, 5.8)],
         [(0, 1, 2, 3, 4)], both=True)
    poly(name, '#e3b95e', [(-span / 2 - 1.2, -.05, 9.4), (-span / 2 - .3, -.05, 9.4), (-span / 2 - .75, -.05, 8.2)], [(0, 1, 2)], both=True)
    cone(name, STONE[1], (0, 0, -.3), 7.0, 6.6, .7, 12)


ruin_arch()


# ---------------------------------------------------------------- columns
def ruin_columns(name='ruin-columns'):
    cone(name, STONE[2], (0, 0, -.2), 6.2, 6.0, .6, 14)
    for k in range(8):
        a = k / 8 * math.tau
        box(name, STONE[k % 4], (math.cos(a) * 5.6, math.sin(a) * 5.6, .2), (2.4, 1.0, .3), (0, 0, a + math.pi / 2))
    for i, (x, y, h) in enumerate([(-3.2, -1.8, 6.2), (2.8, -2.6, 3.4), (3.4, 2.4, 7.4), (-2.6, 3.0, 1.6)]):
        cone(name, STONE[0], (x, y, .35), 1.0, 1.0, .5, 8)
        drum = 1.15
        for d in range(int(h / drum)):
            cone(name, STONE[(d + i) % 4], (x + random.uniform(-.04, .04), y, .6 + d * drum + drum / 2), .66, .62, drum * .97, 10)
        top = .6 + int(h / drum) * drum
        if h > 6:
            box(name, STONE_DARK, (x, y, top + .25), (1.7, 1.7, .5))
            moss_cap(name, (x, y, top + .45), 1.5, 1.5)
        else:
            cone(name, random.choice(MOSS), (x, y, top + .05), .64, .5, .2, 10)
    # A toppled column broken into drums.
    for d in range(4):
        o = cone(name, STONE[d % 4], (-1.5 + d * 1.25 + d * .1, -5.2 + d * .1, .62), .64, .62, 1.12, 10)
        o.rotation_euler = (0, math.pi / 2, .1 * d)
    blob(name, MOSS[0], (0, 4.4, .2), (1.6, .9, .4), 1)


ruin_columns()


# ---------------------------------------------------------------- rubble
for i in range(11):
    a, r = i * 2.39, .4 + (i % 4) * .9
    block('rubble', (math.cos(a) * r, math.sin(a) * r, .28 + (i % 3) * .1), (random.uniform(.6, 1.2), random.uniform(.5, .8), random.uniform(.4, .6)), random.uniform(0, 3), .18)
for i in range(3):
    blob('rubble', MOSS[i], (math.cos(i * 2.1) * 1.4, math.sin(i * 2.1) * 1.4, .1), (.9, .7, .3), 1)


# ---------------------------------------------------------------- trees
def blossom_tree(name, palette, height=7.2, lean=.6):
    pts = [(0, 0, 0), (lean * .2, .1, height * .3), (lean * .7, -.2, height * .55), (lean * .4, .1, height * .78)]
    for a, b in zip(pts, pts[1:]):
        rod(name, '#7d5f4d', a, b, .42 - pts.index(a) * .09, 7, .8)
    top = Vector(pts[-1])
    for i in range(5):
        a = i * 1.26 + .4
        end = top + Vector((math.cos(a) * 2.1, math.sin(a) * 2.1, .5 + (i % 2) * .8))
        rod(name, '#7d5f4d', top, end, .16, 6, .55)
        blob(name, palette[i % len(palette)], end + Vector((0, 0, .45)), (1.55, 1.55, 1.15), 2)
    blob(name, palette[1], top + Vector((0, 0, 1.9)), (2.0, 2.0, 1.5), 2)
    blob(name, palette[0], top + Vector((.6, -.4, 2.9)), (1.2, 1.2, .95), 2)
    for i in range(3):  # petals settled at the roots
        a = i * 2.2
        box(name, palette[2], (math.cos(a) * 1.4, math.sin(a) * 1.4, .03), (1.2, .9, .06), (0, 0, a))


blossom_tree('blossom-tree', ['#f2b4c7', '#e99ab4', '#f8d3de'])
blossom_tree('lilac-tree', ['#c6a6e6', '#b18ad8', '#dccaf2'], 6.4, -.5)
blossom_tree('gold-tree', ['#f0c35f', '#e5a94b', '#f7da8a'], 7.8, .3)

# Slim cypress that frames the ruins and reads at distance.
cone('isle-cypress', '#755a46', (0, 0, 1.2), .3, .18, 2.4, 6)
for i, (z, r) in enumerate([(3.0, 1.45), (4.8, 1.25), (6.5, .95), (8.0, .55)]):
    cone('isle-cypress', ['#4f7a52', '#5f8a5b', '#6f9a63', '#7fa86a'][i], (0, 0, z), r, .15, 2.8, 8)

# Low flowering shrub to soften stone edges.
for i in range(5):
    a = i * 1.3
    blob('isle-shrub', ['#7aa45d', '#8bb766', '#6c9653'][i % 3], (math.cos(a) * .8, math.sin(a) * .6, .55), (1.0, .9, .75), 1)
for i in range(6):
    a = i * 1.05
    blob('isle-shrub', ['#f3d26c', '#f4b8ca', '#f7f0e2'][i % 3], (math.cos(a) * .95, math.sin(a) * .8, 1.05), (.16, .16, .1), 0)


# ---------------------------------------------------------------- magic crystals
def crystal(name, p, h, r, tilt, color):
    verts = [(0, 0, h)] + [(math.cos(k * math.tau / 6) * r, math.sin(k * math.tau / 6) * r, h * .25) for k in range(6)] + [(0, 0, 0)]
    faces = [(0, k + 1, (k + 1) % 6 + 1) for k in range(6)] + [(7, (k + 1) % 6 + 1, k + 1) for k in range(6)]
    o = poly(name, color, verts, faces, closed=True)
    o.location = p
    o.rotation_euler = tilt


for i, (x, y, h, r, t) in enumerate([(0, 0, 3.6, .55, (0, 0, 0)), (.8, .3, 2.4, .42, (.35, .2, 0)), (-.7, .4, 2.0, .38, (-.3, .25, 0)),
                                      (.1, -.8, 1.6, .32, (.15, -.4, 0)), (-.3, .9, 1.3, .3, (-.2, .45, 0))]):
    crystal('sky-crystal', (x, y, 0), h, r, t, ['#9cf2ff', '#b6a4ff', '#7fe0f5'][i % 3])
for i in range(4):
    a = i * 1.6
    blob('crystal-rock', UNDER[i % 4], (math.cos(a) * .85, math.sin(a) * .75, .15), (.85, .7, .5), 1)
blob('crystal-rock', MOSS[1], (-.5, -.7, .42), (.6, .45, .18), 1)


# ---------------------------------------------------------------- spring basin feeding a waterfall
def fall_basin(name='fall-basin'):
    # A round spring basin open at the front (-Y, the browser's +Z): the browser adds the
    # moving stream that runs from this gap to the island edge and the falling sheet beyond.
    r = 2.7
    for k in range(14):
        a = k / 14 * math.tau - math.pi / 2
        if abs(math.atan2(math.sin(a + math.pi / 2), math.cos(a + math.pi / 2))) < .3:
            continue
        box(name, STONE[k % 4], (math.cos(a) * r, math.sin(a) * r, .32), (1.25, .72, .64 + (k % 3) * .1), (0, 0, a + math.pi / 2))
    poly(name, '#8fd9ec', [(math.cos(k / 16 * math.tau) * (r - .3), math.sin(k / 16 * math.tau) * (r - .3), .38) for k in range(16)], [tuple(range(16))])
    cone(name, '#9c8d7d', (0, 0, .1), r + .2, r + .2, .2, 14)
    # A weathered fountain statue at the back pours into the basin.
    box(name, STONE[0], (0, r - .2, 1.1), (1.2, .9, 2.2))
    box(name, STONE_DARK, (0, r - .2, 2.35), (1.5, 1.1, .35))
    blob(name, STONE[2], (0, r - .2, 2.95), (.6, .55, .6), 1)
    box(name, '#bfeefa', (0, r - .85, 1.2), (.32, .5, 1.5))
    for i in range(4):
        blob(name, MOSS[i % 3], (math.cos(1.2 + i * .9) * (r + .4), math.sin(1.2 + i * .9) * (r + .4), .35), (.8, .55, .45), 1)


fall_basin()


# ---------------------------------------------------------------- rope bridge remnants
def bridge_end(name='bridge-end'):
    for x in (-1.6, 1.6):
        cone(name, '#6f5442', (x, 0, 1.2), .2, .17, 2.4, 6)
        cone(name, '#b4925a', (x, 0, 2.2), .24, .24, .3, 6)
    for i in range(6):  # planks hanging from the snapped ropes
        z = .1 - i * .62
        box(name, ['#8a6a4c', '#a07c56', '#7b5d43'][i % 3], (math.sin(i * .9) * .12, -.25 - i * .08, z), (2.9, .34, .09), (1.35 + i * .04, 0, math.sin(i) * .08))
    for x in (-1.55, 1.55):
        rod(name, '#c8b083', (x, 0, 2.0), (x * .9, -.6, -3.4), .045, 4)


bridge_end()


# ---------------------------------------------------------------- floating backdrop islands
def isle_body(name, radius, depth, rings, top_color, seed, palette=UNDER):
    rnd = random.Random(seed)
    seg = 14
    verts, faces = [], []
    prof = [(1.0, 0.0), (1.02, -.9)] + [(1 - (k / rings) ** 1.3 * .92, -1.2 - depth * (k / rings) ** .9) for k in range(1, rings + 1)]
    wob = [rnd.uniform(.86, 1.12) for _ in range(seg)]
    for i, (s, z) in enumerate(prof):
        for k in range(seg):
            a = k / seg * math.tau
            r = radius * s * (wob[k] if i < len(prof) - 1 else 1) * (1 + .06 * math.sin(a * 3 + i))
            verts.append((math.cos(a) * r, math.sin(a) * r, z + (rnd.uniform(-.4, .4) if i > 1 else 0)))
    tip = len(verts)
    verts.append((rnd.uniform(-.5, .5), rnd.uniform(-.5, .5), -depth * 1.25 - 2))
    centre = len(verts)
    verts.append((0, 0, .5))
    for i in range(len(prof) - 1):
        for k in range(seg):
            a, b = i * seg + k, i * seg + (k + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    last = (len(prof) - 1) * seg
    under = [f for f in faces]
    o = poly(name, palette[0], verts, under + [(last + k, last + (k + 1) % seg, tip) for k in range(seg)] + [(centre, (k + 1) % seg, k) for k in range(seg)], closed=True)
    # Colour strata: grass lip, soil, then alternating rock bands.
    mats = [material(top_color), material('#9a7a5a')] + [material(c) for c in palette]
    for m in mats[1:]:
        o.data.materials.append(m)
    o.data.materials[0] = material(top_color)
    for p in o.data.polygons:
        zc = sum(verts[v][2] for v in p.vertices) / len(p.vertices)
        if p.normal.z > .6 and zc > -.2:
            p.material_index = 0
        elif zc > -1.0:
            p.material_index = 1
        else:
            p.material_index = 2 + int((-zc) / (depth / 4) + rnd.random() * .6) % len(palette)
    return o


def distant_isle(name, radius, depth, seed, ruins=False):
    isle_body(name, radius, depth, 5, '#86b464', seed)
    rnd = random.Random(seed + 1)
    for i in range(5 if not ruins else 3):
        a, r = i * 2.4 + rnd.random(), radius * rnd.uniform(.2, .65)
        x, y = math.cos(a) * r, math.sin(a) * r
        cone(name, '#755a46', (x, y, 1.6), .28, .18, 2.6, 6)
        blob(name, ['#6f9e57', '#f2b4c7', '#86b064', '#c6a6e6'][i % 4], (x, y, 3.6), (1.7, 1.7, 1.5), 1)
    for i in range(6):  # hanging roots
        a = i * 1.05 + .3
        x, y = math.cos(a) * radius * .55, math.sin(a) * radius * .55
        rod(name, '#6d5a4a', (x, y, -1.5), (x * 1.1, y * 1.1, -1.5 - depth * rnd.uniform(.35, .6)), .14, 4, .3)
    if ruins:
        for c in range(6):
            for s in range(8):
                a = (s + (c % 2) * .5) / 8 * math.tau
                if c * .9 > 2.8 + 2.2 * math.cos(a):
                    continue
                box(name, STONE[(s + c) % 4], (math.cos(a) * 2.2 - radius * .25, math.sin(a) * 2.2, .45 + c * .9), (1.75, .8, .86), (0, 0, a + math.pi / 2))
        for i in range(4):
            box(name, STONE[i], (radius * .3 + i * 1.3, -radius * .2, .6), (1.2, .9, 1.2 + i * .5))


distant_isle('distant-isle', 16, 22, 3)
distant_isle('distant-isle-ruin', 13, 18, 9, True)
isle_body('isle-rock', 4.2, 7, 3, '#86b464', 21)
blob('isle-rock', MOSS[1], (.6, .4, .45), (1.4, 1.1, .4), 1)


# ---------------------------------------------------------------- cloud puffs
def cloud(name, count, seed):
    rnd = random.Random(seed)
    for i in range(count):
        a, r = i * 2.4, rnd.uniform(0, 1) * (1 + i * .35)
        o = blob(name, '#ffffff', (math.cos(a) * r * 1.6, math.sin(a) * r, rnd.uniform(-.1, .35)), (rnd.uniform(1.3, 2.2), rnd.uniform(1.1, 1.7), rnd.uniform(.75, 1.15)), 2)
        o.data.materials.append(material('#ece6f1'))
        o.data.materials.append(material('#d7d2e6'))
        for p in o.data.polygons:
            n = p.normal
            p.material_index = 0 if n.z > .25 else 1 if n.z > -.35 else 2


cloud('cloud-puff', 6, 4)
cloud('cloud-bank', 11, 11)


# ---------------------------------------------------------------- banner pole
cone('isle-banner', '#6a5644', (0, 0, 3.2), .11, .08, 6.4, 6)
cone('isle-banner', '#e3b95e', (0, 0, 6.5), .2, .02, .5, 6)
poly('isle-banner', '#7b5ca8', [(.1, 0, 6.1), (2.6, 0, 5.9), (2.0, 0, 5.3), (2.6, 0, 4.7), (.1, 0, 4.5)], [(0, 1, 2, 3, 4)], both=True)
poly('isle-banner', '#e3b95e', [(.5, -.02, 5.7), (1.4, -.02, 5.3), (.5, -.02, 4.9)], [(0, 1, 2)], both=True)
box('isle-banner', STONE[1], (0, 0, .2), (.9, .9, .4))


# ---------------------------------------------------------------- export
bpy.ops.object.select_all(action='SELECT')
palette, palette_index, assets = [], {}, {}
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH':
        continue
    name = o.name.split('.')[0]
    a = assets.setdefault(name, {'p': [], 'c': []})
    me = o.data
    me.calc_loop_triangles()
    matrix = o.matrix_world
    for tri in me.loop_triangles:
        color = tuple(round(c, 4) for c in me.materials[tri.material_index].diffuse_color[:3])
        if color not in palette_index:
            palette_index[color] = len(palette)
            palette.append(list(color))
        a['c'].append(palette_index[color])
        for vi in tri.vertices:
            v = matrix @ me.vertices[vi].co
            a['p'] += [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]
for a in assets.values():
    xs, ys, zs = a['p'][0::3], a['p'][1::3], a['p'][2::3]
    a['triangles'] = len(a['c'])
    a['height'] = round(max(ys), 3)
    a['radius'] = round(max(max(abs(x) for x in xs), max(abs(z) for z in zs)), 3)
out = ROOT / 'dist/assets/sky-isles-kit.json'
out.write_text(json.dumps({'version': 1, 'units': 'metres', 'palette': palette, 'assets': assets}, separators=(',', ':')))

names = sorted(assets)
for index, name in enumerate(names):
    offset = Vector(((index % 5) * 40.0, -(index // 5) * 40.0, 0))
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.split('.')[0] == name]:
        o.location = o.location + offset
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets/source/polygolf-sky-isles-kit.blend'))
print(json.dumps({'assets': {k: v['triangles'] for k, v in assets.items()}, 'bytes': out.stat().st_size}))
