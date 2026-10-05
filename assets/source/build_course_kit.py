"""PolyGolf course kit (v5). Original low-poly assets; Blender 4.2+ / 5.x, no add-ons.

Run with Blender:   blender --background --factory-startup --python assets/source/build_course_kit.py
Or the bpy module:  python3 assets/source/build_course_kit.py

Every asset is modelled around its own origin (Blender Z up, front facing -Y) and merged
into one vertex-coloured mesh per asset for instancing in the browser. The export uses
metres, Y up, flat face normals and linear vertex colours. The saved .blend lays the
assets out on a labelled grid so each piece can be inspected and edited.
"""
import bpy, json, math, random
from pathlib import Path
from mathutils import Vector, Euler

ROOT = Path(__file__).resolve().parents[2]
random.seed(19)
bpy.ops.wm.read_factory_settings(use_empty=True)
materials = {}


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


def box(name, color, p, s, bevel=.03, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    o = finish(bpy.context.object, name, color)
    o.scale = s
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new('Soft cut edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if rot:
        o.rotation_euler = rot
    return o


def cone(name, color, p, r1, r2, h, verts=10, rot=None):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=h, location=p)
    o = finish(bpy.context.object, name, color)
    if rot:
        o.rotation_euler = rot
    return o


def cyl(name, color, p, r, h, verts=8, rot=None):
    return cone(name, color, p, r, r, h, verts, rot)


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


def ring(name, color, p, major, minor, seg=16, minor_seg=6, rot=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=seg, minor_segments=minor_seg, location=p)
    o = finish(bpy.context.object, name, color)
    if rot:
        o.rotation_euler = rot
    return o


def poly(name, color, verts, faces):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material(color))
    return o


def gable(name, color, w, d, eave, ridge, overhang=.35):
    x, y = w / 2 + overhang, d / 2 + overhang
    return poly(name, color, [(-x, -y, eave), (x, -y, eave), (x, y, eave), (-x, y, eave), (-x, 0, ridge), (x, 0, ridge)],
                [(0, 1, 5, 4), (4, 5, 2, 3), (0, 4, 3), (1, 2, 5)])


# ---------------------------------------------------------------- trees (v4 shapes, kept)
def tree(kind):
    height = {'oak': 9, 'willow': 8.5, 'juniper': 6.4, 'pine': 11}[kind]
    cone(kind, '#806849', (0, 0, height * .27), .32, .14, height * .54)
    if kind == 'pine':
        for i in range(5):
            cone(kind, ['#3e694f', '#507b55', '#628b60'][i % 3], (0, 0, 3.6 + i * 1.45), 3.1 - i * .51, .08, 3.8, 9)
    else:
        for i in range(7):
            a = i * 2.399
            rad = 1.65 if i < 6 else .1
            top = height - 2 + (i % 3) * .65
            end = (math.cos(a) * rad, math.sin(a) * rad, top - 1)
            rod(kind, '#796044', (0, 0, height * .4), end, .15, 8, .62)
            palette = {'oak': ['#55884e', '#6c9b57', '#89af69'], 'willow': ['#779b57', '#95b670', '#abc77c'],
                       'juniper': ['#668773', '#769479', '#8ba78b']}[kind]
            blob(kind, palette[i % 3], (end[0], end[1], top), (2.25, 2.2, 2.4 if kind == 'willow' else 1.7), 2)
            if kind == 'willow' and i < 6:
                blob(kind, palette[(i + 1) % 3], (end[0] * 1.45, end[1] * 1.45, top - 1.3), (1.3, 1.1, 2.2), 1)


for kind in ['oak', 'pine', 'willow', 'juniper']:
    tree(kind)
for name, palette in [('larch', ['#b68735', '#cf9c3c', '#e5b653']), ('pine-low', ['#3e694f', '#567e50', '#73955c']),
                      ('larch-low', ['#b68735', '#d4a344', '#e5b653'])]:
    cone(name, '#735c42', (0, 0, 3), .28, .12, 6, 7)
    count = 3 if name.endswith('low') else 5
    for i in range(count):
        cone(name, palette[i % 3], (0, 0, 4 + i * (5 / count)), 3.35 - i * (2.4 / count), .04, 4.5, 7 if name.endswith('low') else 9)
for name, palette in [('autumn-oak', ['#aa6235', '#ca823a', '#e0a54b']), ('oak-low', ['#507847', '#779452', '#8ba45e']),
                      ('autumn-oak-low', ['#ae6035', '#d18c3d', '#e2aa52'])]:
    cone(name, '#735c42', (0, 0, 3), .33, .18, 6, 7)
    for i in range(4):
        a = i * 2.4
        blob(name, palette[i % 3], (math.cos(a) * 1.6, math.sin(a) * 1.6, 7 + i % 2), (3, 2.8, 2.6), 1 if name.endswith('low') else 2)

# Orchard fruit trees keep a full-height trunk so they match the shared trunk collisions.
for name, sub in [('fruit-tree', 2), ('fruit-tree-low', 1)]:
    cone(name, '#7b5f43', (0, 0, 2.4), .3, .17, 4.8, 7)
    for i in range(3):
        a = i * 2.1
        rod(name, '#7b5f43', (0, 0, 3.4), (math.cos(a) * 1.3, math.sin(a) * 1.3, 5.2), .12, 6, .6)
    for i in range(5):
        a = i * 1.26
        r = 1.35 if i < 4 else 0
        blob(name, ['#5f8f4f', '#76a55a', '#8cb867'][i % 3], (math.cos(a) * r, math.sin(a) * r, 5.8 + (i % 2) * .5), (2.1, 2.1, 1.7), sub)
    if name == 'fruit-tree':
        for i in range(16):
            a, e = i * 2.399, .35 + (i % 5) * .12
            p = (math.cos(a) * 2.6 * math.cos(e), math.sin(a) * 2.6 * math.cos(e), 5.9 + math.sin(e) * 1.9 - (i % 3) * .35)
            blob(name, ['#c9463d', '#d8603f', '#e0a23a'][i % 3], p, (.16, .16, .16), 1)

# ---------------------------------------------------------------- planting and ground detail
for i in range(4):
    blob('bush', ['#4b7047', '#64834f', '#7d9859'][i % 3], ((i % 2 - .5) * .75, (i // 2 - .5) * .6, .5 + i * .08), (.8, .75, .72), 1)
for name, palette in [('flowers', ['#e7d479', '#f4e9cc', '#b38fbb']), ('autumn-flowers', ['#cc863b', '#ecc460', '#d5a45e'])]:
    for i in range(7):
        a = i * 2.4
        x, y = math.cos(a) * (.12 + i * .07), math.sin(a) * (.12 + i * .07)
        height = .25 + (i % 3) * .09
        cone(name, '#607e43', (x, y, height / 2), .02, .012, height, 5)
        for j in range(5):
            blob(name, palette[i % 3], (x + math.cos(j * 1.256) * .07, y + math.sin(j * 1.256) * .07, height), (.085, .065, .04), 1)
for i in range(3):
    blob('boulder', ['#9b9a85', '#b4b29c', '#c2bea7'][i], (i * .35 - .35, 0, .22 + i * .10), (.5, .4, .35 + i * .08), 1)
for i in range(7):
    a = i * 2.4
    r = .09 * (i % 3)
    cone('reeds', '#899b5a', (math.cos(a) * r, math.sin(a) * r, .35 + i * .035), .027, .006, .7 + i * .07, 5)
    cone('reeds', '#967a47', (math.cos(a) * r, math.sin(a) * r, .7 + i * .07), .043, .035, .16, 6)
# Floating lily pads with two blooms.
for i in range(8):
    a = i * 2.399
    r = .35 + (i % 4) * .28
    pad = cyl('lily-pads', ['#6e9460', '#7fa46b', '#5d8656'][i % 3], (math.cos(a) * r, math.sin(a) * r, .01), .26 + (i % 3) * .06, .02, 9)
for p, c in [((.3, .15, .06), '#f4d6be'), ((-.55, -.4, .06), '#fbf3e6')]:
    for j in range(5):
        blob('lily-pads', c, (p[0] + math.cos(j * 1.256) * .06, p[1] + math.sin(j * 1.256) * .06, p[2]), (.07, .04, .05), 1)
    blob('lily-pads', '#e9c052', p, (.04, .04, .04), 1)
# Dune grass tufts for the coastal links.
for i in range(13):
    a, r = i * 2.399, .05 + (i % 4) * .07
    h = .55 + (i % 5) * .09
    o = cone('dune-grass', ['#c8b778', '#a9a567', '#d6c78e'][i % 3], (math.cos(a) * r, math.sin(a) * r, h / 2), .045, .004, h, 3)
    o.rotation_euler = (math.cos(a) * .25, math.sin(a) * .25, a)
# Wet tide-pool rocks.
for i, (x, y, s) in enumerate([(0, 0, 1), (.9, .3, .6), (-.8, .5, .7), (.3, -.8, .5), (-.4, -.5, .4)]):
    blob('tide-rocks', ['#7d7f78', '#8f8f84', '#6d736f', '#9a9786', '#7a7c70'][i], (x, y, .18 * s), (.7 * s, .55 * s, .38 * s), 1)
for i in range(4):
    blob('tide-rocks', ['#e7a08d', '#f0d6b8'][i % 2], (math.cos(i * 1.7) * .45, math.sin(i * 1.7) * .45, .36), (.06, .06, .03), 1)
# Forest floor: mushrooms, a fallen log and a log pile.
for i in range(6):
    a, r = i * 2.2, .08 + i * .06
    x, y = math.cos(a) * r, math.sin(a) * r
    h = .09 + (i % 3) * .05
    cyl('mushrooms', '#efe6d2', (x, y, h / 2), .018 + (i % 2) * .008, h, 6)
    cap = cone('mushrooms', ['#c4533f', '#b0794b', '#c4533f'][i % 3], (x, y, h + .02), .06 + (i % 3) * .02, .01, .06, 8)
    if i % 3 != 1:
        for j in range(3):
            blob('mushrooms', '#fbf6ea', (x + math.cos(j * 2.1) * .03, y + math.sin(j * 2.1) * .03, h + .045), (.012, .012, .006), 1)
log = cyl('fallen-log', '#7a5c40', (0, 0, .28), .28, 3.2, 9, (0, math.pi / 2, .1))
for x in (-1.6, 1.6):
    cyl('fallen-log', '#c9a879', (x * math.cos(.1), x * math.sin(.1), .28), .24, .03, 9, (0, math.pi / 2, .1))
blob('fallen-log', '#7f9a5a', (.3, 0, .5), (.7, .3, .14), 1)
blob('fallen-log', '#6f8d52', (-.7, .05, .47), (.4, .25, .1), 1)
for i, (x, z) in enumerate([(-.45, .2), (0, .2), (.45, .2), (-.22, .56), (.22, .56), (0, .92)]):
    cyl('log-pile', ['#7a5c40', '#86674a', '#6f533b'][i % 3], (0, x, z), .2, 1.6, 8, (0, math.pi / 2, 0))
    for side in (-.8, .8):
        cyl('log-pile', '#d2b289', (side, x, z), .17, .02, 8, (0, math.pi / 2, 0))

# ---------------------------------------------------------------- tee and course furniture
# Bench with armrests.
for x in [-.65, .65]:
    box('bench', '#4a6252', (x, 0, .26), (.075, .44, .52))
for y in [-.17, 0, .17]:
    box('bench', '#bb9770', (0, y, .52), (1.8, .14, .06), .015)
for z in [.78, .96]:
    box('bench', '#bb9770', (0, .21, z), (1.8, .05, .14), .015)
for x in [-.7, .7]:
    box('bench', '#4a6252', (x, .23, .74), (.065, .07, .64), .012)
    box('bench', '#4a6252', (x, 0, .68), (.07, .44, .05), .012)
# Tee sign: framed board under a small roof; the browser paints the hole card onto its face.
for x in [-.52, .52]:
    box('tee-sign', '#887050', (x, 0, .62), (.08, .1, 1.24))
box('tee-sign', '#405e4c', (0, 0, 1.12), (1.3, .14, .62))
box('tee-sign', '#dbcea8', (0, -.078, 1.12), (1.16, .015, .48), .01)
roof = gable('tee-sign', '#526e61', .98, .12, 1.5, 1.68, .12)
box('tee-sign', '#6c8a55', (0, 0, .06), (1.5, .5, .12))
for x in [-.45, -.15, .15, .45]:
    blob('tee-sign', ['#e7d479', '#f4e9cc', '#b38fbb', '#e7a08d'][int((x + .45) / .3)], (x, -.12, .18), (.1, .08, .06), 1)
# Tee marker: a faceted ball on a short peg.
cyl('tee-marker', '#6c5a44', (0, 0, .06), .07, .12, 6)
blob('tee-marker', '#ece6d2', (0, 0, .2), (.13, .13, .13), 1)
ring('tee-marker', '#3d6b4f', (0, 0, .2), .13, .018, 12, 4)
# Ball washer with towel.
box('ball-washer', '#3f5a4a', (0, 0, .45), (.09, .09, .9), .01)
box('ball-washer', '#3f6a52', (0, 0, .98), (.3, .2, .3), .03)
cyl('ball-washer', '#d8cfb4', (0, -.11, 1.0), .07, .03, 10, (math.pi / 2, 0, 0))
rod('ball-washer', '#cfd4cd', (.16, 0, 1.2), (.16, 0, .88), .015, 6)
box('ball-washer', '#e8dcc0', (-.17, 0, .72), (.02, .16, .36), .005)
box('ball-washer', '#b4574b', (-.175, 0, .64), (.022, .165, .04), .003)
box('ball-washer', '#ded7bd', (0, 0, .03), (.4, .4, .06), .02)
# Waste bin.
cyl('bin', '#3f5a4a', (0, 0, .4), .24, .8, 10)
cyl('bin', '#2f473a', (0, 0, .83), .27, .06, 10)
cone('bin', '#2f473a', (0, 0, .9), .22, .1, .1, 10)
box('bin', '#e9dfc3', (0, -.235, .5), (.22, .02, .16), .005)
# Distance posts: white every 100 m, red in between.
for name, cap in [('distance-post-white', '#f3ecd8'), ('distance-post-red', '#c0504a')]:
    cyl(name, '#efe8d6', (0, 0, .45), .07, .9, 8)
    cyl(name, cap, (0, 0, .83), .075, .16, 8)
    cone(name, cap, (0, 0, .95), .075, .02, .08, 8)
    blob(name, '#9b9a85', (0, 0, .03), (.2, .2, .06), 1)
# Bunker rake lying on the grass.
rod('rake', '#b09061', (-.75, 0, .04), (.65, 0, .04), .022, 6)
box('rake', '#777e62', (.72, 0, .05), (.06, .48, .05), .005)
for i in range(9):
    box('rake', '#6a705a', (.76, -.2 + i * .05, .02), (.02, .015, .06), 0)
# Planter box.
box('planter', '#a07a55', (0, 0, .22), (1.2, .45, .44))
box('planter', '#6d5a41', (0, 0, .43), (1.24, .49, .04), .01)
for i in range(6):
    blob('planter', ['#e7d479', '#e7a08d', '#f4e9cc', '#b38fbb'][i % 4], (-.45 + i * .18, (i % 2 - .5) * .15, .55), (.1, .1, .08), 1)
    blob('planter', '#5f8a4c', (-.45 + i * .18, (i % 2 - .5) * .15 + .05, .47), (.12, .12, .08), 1)
# Timber fence segment (2 m) and dry-stone wall segment (3 m).
for x in [-1, 1]:
    box('fence', '#bd9a6b', (x, 0, .5), (.11, .11, 1))
    cone('fence', '#bd9a6b', (x, 0, 1.04), .08, .01, .08, 4)
for z in [.35, .75]:
    box('fence', '#dec28f', (0, 0, z), (2, .07, .08), .01)
for i in range(11):
    x = -1.35 + (i % 6) * .54 + (.27 if i >= 6 else 0)
    z = .2 if i < 6 else .55
    if x > 1.45:
        continue
    box('stone-wall', ['#b8b59a', '#a9ad93', '#c4c0a8'][i % 3], (x, 0, z), (.5, .5, .34), .06, (0, 0, (i % 3 - 1) * .05))
box('stone-wall', '#8fa46e', (0, 0, .78), (3.0, .5, .08), .03)
# Flagpole with a PolyGolf-green banner.
cyl('flagpole', '#f1ecde', (0, 0, 4), .06, 8, 8)
blob('flagpole', '#e2c67a', (0, 0, 8.05), (.1, .1, .1), 1)
poly('flagpole', '#2f5a45', [(.06, 0, 7.8), (1.7, .12, 7.35), (1.7, .12, 6.55), (.06, 0, 6.9)], [(0, 1, 2, 3), (3, 2, 1, 0)])
poly('flagpole', '#f2c45a', [(.9, .07, 7.35), (1.3, .1, 7.2), (.9, .07, 7.0)], [(0, 1, 2), (2, 1, 0)])
cyl('flagpole', '#b8b59a', (0, 0, .12), .5, .24, 8)
# Golf cart (about 2.4 x 1.3 m).
box('golf-cart', '#f5e5bd', (0, 0, .62), (1.25, 2.35, .25))
box('golf-cart', '#538874', (0, .6, .92), (1.12, .72, .42))
box('golf-cart', '#e0c89e', (0, -.35, .98), (1.05, .5, .18))
box('golf-cart', '#e0c89e', (0, -.1, 1.25), (1.05, .12, .4))
box('golf-cart', '#f2d078', (0, 0, 1.95), (1.45, 2.1, .12))
box('golf-cart', '#a9c6cb', (0, .98, 1.55), (1.1, .04, .6), .01, (-.25, 0, 0))
for x in [-.62, .62]:
    for y in [-.76, .76]:
        cyl('golf-cart', '#384c43', (x, y, .33), .29, .16, 10, (0, math.pi / 2, 0))
        cyl('golf-cart', '#cfd4cd', (x * 1.08, y, .33), .12, .02, 8, (0, math.pi / 2, 0))
    for y in [-.8, .8]:
        box('golf-cart', '#647668', (x, y, 1.4), (.05, .05, 1.05), .005)
cyl('golf-cart', '#3d6b4f', (0, -1.05, 1.05), .2, .8, 10, (.25, 0, 0))
for i in range(4):
    rod('golf-cart', '#c9cfc8', (-.08 + i * .05, -1.12, 1.35), (-.08 + i * .05, -1.2, 1.7), .015, 5)
    blob('golf-cart', ['#2f4037', '#b4574b'][i % 2], (-.08 + i * .05, -1.2, 1.72), (.04, .05, .04), 1)

# ---------------------------------------------------------------- buildings and landmarks
# Clubhouse with porch, chimney and planters.
box('clubhouse', '#c5b493', (0, 0, .16), (14, 9, .32))
box('clubhouse', '#e9ddbf', (0, 0, 2.1), (11, 6, 3.9))
gable('clubhouse', '#526e61', 11, 6.4, 4, 6.1, .6)
box('clubhouse', '#b9a98a', (3.4, 1.4, 6.2), (.9, .9, 2.2))
box('clubhouse', '#7d6a55', (3.4, 1.4, 7.3), (1.1, 1.1, .16))
for x in [-4, -2, 2, 4]:
    box('clubhouse', '#6c948e', (x, -3.025, 2.45), (1.12, .08, 1.25), .01)
    box('clubhouse', '#f2e6cc', (x, -3.085, 2.45), (.045, .05, 1.3), .006)
    box('clubhouse', '#f2e6cc', (x, -3.09, 2.45), (1.2, .05, .045), .006)
    box('clubhouse', '#9c7a55', (x, -3.2, 1.72), (1.2, .22, .2), .01)
    for j in range(4):
        blob('clubhouse', ['#e7d479', '#e7a08d', '#f4e9cc', '#b38fbb'][(j + int(x)) % 4], (x - .42 + j * .28, -3.2, 1.86), (.1, .1, .08), 1)
box('clubhouse', '#536b59', (0, -3.08, 1.34), (1.2, .13, 2.6))
box('clubhouse', '#e2c67a', (.42, -3.16, 1.3), (.06, .04, .06), .005)
box('clubhouse', '#d4bf96', (0, -4, .44), (6, 2, .26))
for i in range(3):
    box('clubhouse', '#c9b28a', (0, -5.1 - i * .3, .3 - i * .1), (2.2, .3, .12), .01)
for x in [-2.6, 2.6]:
    cyl('clubhouse', '#f0e4c8', (x, -4.7, 2.3), .12, 3.9, 8)
box('clubhouse', '#5d7664', (0, -4, 4.3), (6.3, 2.7, .24))
box('clubhouse', '#2f5a45', (0, -5.36, 3.7), (3.2, .08, .7), .01)
box('clubhouse', '#f2e6cc', (0, -5.41, 3.7), (2.6, .02, .12), .003)
box('clubhouse', '#b09872', (0, -5, .18), (6, .8, .36))
# Lighthouse with gallery railing and keeper's store.
cyl('lighthouse', '#d5cfb4', (0, 0, .25), 3.4, .5, 16)
cone('lighthouse', '#eee6ce', (0, 0, 5.7), 2, 1.4, 11, 12)
cone('lighthouse', '#b66a55', (0, 0, 4.2), 1.83, 1.76, 1.1, 12)
cone('lighthouse', '#b66a55', (0, 0, 7.4), 1.64, 1.57, 1.1, 12)
cyl('lighthouse', '#526e66', (0, 0, 11.4), 2.2, .25, 16)
cyl('lighthouse', '#84aaa6', (0, 0, 12.1), 1.3, 1.2, 12)
cone('lighthouse', '#50685f', (0, 0, 13.2), 1.9, .2, 1, 12)
blob('lighthouse', '#e2c67a', (0, 0, 13.85), (.16, .16, .16), 1)
ring('lighthouse', '#f3e7c9', (0, 0, 12.25), 2.1, .04, 24, 4)
for i in range(12):
    a = i * math.pi / 6
    cyl('lighthouse', '#f3e7c9', (math.cos(a) * 2.1, math.sin(a) * 2.1, 11.85), .035, .8, 6)
box('lighthouse', '#735e49', (0, -1.98, 1.1), (.9, .1, 1.8))
for z in [3, 6.1, 8.9]:
    box('lighthouse', '#3f5a57', (0, -1.72 + (z - 3) * .055, z), (.4, .1, .6), .01)
box('lighthouse', '#e9e0c9', (2.6, 1.6, 1.0), (2.2, 1.8, 1.8))
gable('lighthouse', '#a45e4c', 2.2, 1.8, 1.9, 2.7, .2).location = (2.6, 1.6, 0)
# Boathouse on stilts with a jetty; built to sit on a lake shore (front faces the water, -Y).
for x in [-2.6, 0, 2.6]:
    for y in [-3.2, -1, 1.2]:
        cyl('boathouse', '#6d5a41', (x, y, -.2), .16, 1.4, 6)
box('boathouse', '#a9855f', (0, -1, .55), (6.2, 4.8, .18), .02)
for i in range(12):
    box('boathouse', '#9b7a55', (-2.95 + i * .54, -1, .66), (.02, 4.8, .02), 0)
box('boathouse', '#c96f4a', (0, .2, 2.0), (5.2, 3.2, 2.8))
gable('boathouse', '#4f6b5d', 5.2, 3.2, 3.4, 4.9, .45).location = (0, .2, 0)
box('boathouse', '#4b3d2f', (0, -1.42, 1.65), (2.4, .1, 2.0))
for x in [-.6, 0, .6]:
    box('boathouse', '#e9ddbf', (x, -1.48, 1.65), (.06, .04, 2.0), .004)
box('boathouse', '#e9ddbf', (-2.61, .6, 2.3), (.06, 1.0, .8), .01)
box('boathouse', '#e9ddbf', (2.61, .6, 2.3), (.06, 1.0, .8), .01)
box('boathouse', '#b89468', (0, -5.9, .5), (1.6, 5.0, .14), .02)
for y in [-4.2, -6.2, -8.2]:
    for x in [-.72, .72]:
        cyl('boathouse', '#6d5a41', (x, y, .3), .1, 1.4, 6)
ring('boathouse', '#e7d7b6', (.9, -7.4, .75), .22, .06, 12, 5, (0, math.pi / 2, 0))
box('boathouse', '#e2c67a', (0, -1.44, 3.2), (1.4, .06, .35), .01)
# Rowboat.
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=1, location=(0, 0, .3))
hull = finish(bpy.context.object, 'rowboat', '#e9ddbf')
hull.scale = (.75, 1.9, .42)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for v in hull.data.vertices:
    v.select = v.co.z > .3
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.delete(type='VERT')
bpy.ops.object.mode_set(mode='OBJECT')
ring('rowboat', '#3f6a8a', (0, 0, .3), 1, .05, 18, 4)
bpy.context.object.scale = (.75, 1.9, 1)
for y in [-.6, .5]:
    box('rowboat', '#a9855f', (0, y, .22), (1.3, .22, .06), .01)
rod('rowboat', '#caa370', (-.5, -.8, .32), (.6, .9, .3), .03, 5)
# Garden gazebo (hexagonal).
cyl('gazebo', '#d8cfb4', (0, 0, .12), 2.3, .24, 6)
for i in range(6):
    a = i * math.pi / 3
    cyl('gazebo', '#f1ecde', (math.cos(a) * 1.95, math.sin(a) * 1.95, 1.5), .08, 2.6, 6)
    if i != 4:
        box('gazebo', '#e9e0c9', (math.cos(a + math.pi / 6) * 1.7, math.sin(a + math.pi / 6) * 1.7, .8), (1.9, .06, .07), .005, (0, 0, a + math.pi / 6 + math.pi / 2))
cone('gazebo', '#6f8f79', (0, 0, 3.35), 2.65, .15, 1.3, 6)
blob('gazebo', '#e2c67a', (0, 0, 4.05), (.14, .14, .2), 1)
box('gazebo', '#a07a55', (0, 0, .5), (1.4, .4, .06), .01)
# Heron wading bird (about 1.1 m tall).
blob('heron', '#aeb5b3', (0, 0, .78), (.16, .32, .16), 1)
blob('heron', '#8e9795', (0, .1, .8), (.14, .26, .1), 1)
rod('heron', '#c8cdca', (0, -.22, .85), (0, -.28, 1.12), .045, 5)
blob('heron', '#d8dcd8', (0, -.3, 1.15), (.07, .09, .07), 1)
cone('heron', '#e0b64a', (0, -.46, 1.14), .025, .002, .2, 5, (-math.pi / 2, 0, 0))
blob('heron', '#2f3a35', (0, -.3, 1.2), (.08, .03, .02), 1)
for x in [-.05, .05]:
    rod('heron', '#8a8f6a', (x, .02, .64), (x, .02, 0), .012, 4)
# Beach hut with striped boards.
for i in range(9):
    box('beach-hut', ['#e9ddbf', '#5f9bb3', '#e9ddbf', '#e07a5f'][i % 4], (-1.2 + i * .3, 0, 1.2), (.3, 2.2, 2.4), 0)
gable('beach-hut', '#e9ddbf', 2.7, 2.2, 2.4, 3.3, .25)
box('beach-hut', '#4b3d2f', (0, -1.12, 1.0), (.9, .06, 1.8))
box('beach-hut', '#b89468', (0, -1.6, .1), (2.8, 1.0, .12), .01)
# Autumn stone arch (about 6 m tall).
for side in (-1, 1):
    for i in range(4):
        box('stone-arch', ['#b77f63', '#c28e70', '#d49f7b', '#b38770'][i], (side * (2.6 - i * .1), 0, .55 + i * 1.1), (1.3 - i * .05, 1.2, 1.05), .12, (0, 0, side * .04 * i))
box('stone-arch', '#c99676', (0, 0, 4.95), (6.6, 1.3, 1.1), .14, (0, .03, 0))
box('stone-arch', '#d6ab88', (0, 0, 5.6), (5.2, 1.0, .4), .1)
for i in range(5):
    blob('stone-arch', ['#be9173', '#a88068'][i % 2], (math.cos(i * 1.3) * 3.6, math.sin(i * 1.3) * 1.4, .2), (.6, .5, .35), 1)
blob('stone-arch', '#8a9a5a', (-1.2, 0, 5.52), (.8, .5, .12), 1)
# Stone spring well with a timber roof and bucket.
for i in range(12):
    a = i * math.pi / 6
    box('spring-well', ['#b8b59a', '#a9ad93', '#c4c0a8'][i % 3], (math.cos(a) * .95, math.sin(a) * .95, .35), (.5, .35, .7), .05, (0, 0, a + math.pi / 2))
cyl('spring-well', '#5a8fa0', (0, 0, .55), .8, .05, 12)
for x in (-1.05, 1.05):
    box('spring-well', '#7a5c40', (x, 0, 1.2), (.12, .12, 1.7), .01)
gable('spring-well', '#8a5a3a', 1.6, 1.3, 1.95, 2.55, .15)
rod('spring-well', '#6d5a41', (-1.05, 0, 1.6), (1.05, 0, 1.6), .05, 6)
cyl('spring-well', '#9b7a55', (0, 0, 1.15), .16, .22, 8)
# Starter's hut.
box('starter-hut', '#e9ddbf', (0, 0, 1.2), (2.4, 2.0, 2.4))
gable('starter-hut', '#526e61', 2.4, 2.0, 2.4, 3.2, .4)
box('starter-hut', '#6c948e', (0, -1.01, 1.4), (1.3, .05, .8), .01)
box('starter-hut', '#b89468', (0, -1.25, .95), (1.5, .4, .07), .01)
box('starter-hut', '#2f5a45', (0, -1.03, 2.2), (1.2, .04, .3), .005)
box('starter-hut', '#b09872', (0, 0, .06), (3.2, 2.8, .12), .02)


# ---------------------------------------------------------------- Saltwind discoveries (v6)
# Original ship, 23m long, waterline at Z=0; a simple shared box set verifies hits.
exec(compile((ROOT / 'assets/source/pirate_ship.py').read_text(), 'pirate_ship.py', 'exec'))

# Eroded rock stacks have stratified silhouettes and a base sunk below the sea.
name='sea-stack'
verts=[]
for level,(z,r) in enumerate([(0,1),(3,.96),(9,.68),(13,.51),(15,.20)]):
    for i in range(9):
        a=i*math.tau/9;rj=r*(.88+.12*math.sin(i*2.7+level*.7))
        verts.append((math.cos(a)*rj*5+level*.24,math.sin(a)*rj*4,z+.5*math.sin(i*1.9)))
for l in range(4):
    for i in range(9):
        a=l*9+i;b=l*9+(i+1)%9
        poly(name,['#8c8b7b','#a39c84','#b8aa8e','#b0a286'][l],[verts[a],verts[b],verts[b+9],verts[a+9]],[(0,1,2),(0,2,3)])
poly(name,'#bdaf91',verts[36:], [tuple(range(9))])

# ---------------------------------------------------------------- export
exec(compile((ROOT / 'assets/source/scenic_landmarks.py').read_text(), 'scenic_landmarks.py', 'exec'))
# Merge each asset into a single mesh for inexpensive instancing. Compact format:
# "p" holds triangle vertex positions (millimetre precision) and "c" one palette index
# per triangle; flat normals are rebuilt in the browser.
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
out = ROOT / 'dist/assets/course-kit.json'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({'version': 8, 'units': 'metres', 'palette': palette, 'assets': assets}, separators=(',', ':')))

# Lay the assets out on a labelled grid in the saved scene for easy inspection.
names = sorted(assets)
columns = 7
small_names = [n for n in names if assets[n]['radius'] <= 12]
large_names = [n for n in names if assets[n]['radius'] > 12]
for index, name in enumerate(names):
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    if name in small_names:
        i = small_names.index(name)
        offset = Vector(((i % columns) * 34.0, -(i // columns) * 34.0, 0))
    else:
        i = large_names.index(name)
        offset = Vector(((i % 3) * 720.0, -900.0 - (i // 3) * 720.0, 0))
    for o in [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.split('.')[0] == name]:
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)
        o.location = o.location + offset
    radius = assets[name]['radius']
    bpy.ops.object.text_add(location=offset + Vector((-max(4, radius), -max(6, radius + 8), 0)))
    label = bpy.context.object
    label.data.body = name
    label.data.size = max(1, radius / 40)
    label.name = 'label: ' + name
    for c in label.users_collection:
        c.objects.unlink(label)
    col.objects.link(label)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets/source/polygolf-course-kit-v8.blend'))
print(json.dumps({'assets': {k: v['triangles'] for k, v in assets.items()}, 'bytes': out.stat().st_size}))
