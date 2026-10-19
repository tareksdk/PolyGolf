"""Builds Darby (darby.py) into dist/assets/darby.json and assets/source/darby.blend.

Run with Blender:   blender --background --factory-startup --python assets/source/build_darby.py
Or the bpy module:  python3 assets/source/build_darby.py [--review DIR]

Darby ships as its own small file so the shared course kit stays untouched. The export
matches the course kit: metres, Y up, a linear-RGB palette, 9 position values and one
palette index per triangle. Head and tail positions are relative to their pivots.
"""
import bpy, json, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
source = (ROOT / 'assets/source/build_course_kit.py').read_text()
helpers = source[source.index('materials = {}'):source.index('# ---------------------------------------------------------------- trees')]
exec(compile(helpers, 'asset-helpers', 'exec'))
exec(compile((ROOT / 'assets/source/darby.py').read_text(), 'darby.py', 'exec'))

# Blender space pivots; exported Y up as (x, z, -y).
PIVOTS = {'darby-body': (0, 0, 0), 'darby-head': (0, -.58, .84), 'darby-tail': (0, .84, .31)}
palette, indices, assets = [], {}, {}
for asset, pivot in PIVOTS.items():
    data = {'p': [], 'c': []}
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o.name.split('.')[0] == asset]:
        for mod in list(o.modifiers):
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=mod.name)
        me = o.data
        me.calc_loop_triangles()
        for tri in me.loop_triangles:
            color = tuple(round(c, 4) for c in me.materials[tri.material_index].diffuse_color[:3])
            if color not in indices:
                indices[color] = len(palette)
                palette.append(list(color))
            data['c'].append(indices[color])
            for vi in tri.vertices:
                v = o.matrix_world @ me.vertices[vi].co - Vector(pivot)
                data['p'] += [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]
    data['triangles'] = len(data['c'])
    data['pivot'] = [pivot[0], pivot[2], -pivot[1]]
    assets[asset] = data
out = ROOT / 'dist/assets/darby.json'
out.write_text(json.dumps({'version': 1, 'palette': palette, 'assets': assets}, separators=(',', ':')))
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets/source/darby.blend'))
print(json.dumps({a: d['triangles'] for a, d in assets.items()} | {'bytes': out.stat().st_size}))

if '--review' in sys.argv:
    # Flat-lit inspection renders from the game's three-quarter camera and from the side.
    review = Path(sys.argv[sys.argv.index('--review') + 1])
    review.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_shadows = True
    scene.render.resolution_x, scene.render.resolution_y = 900, 700
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
    ground = bpy.context.object
    ground.data.materials.append(material('#7fa45a'))
    world = bpy.data.worlds.new('review'); world.color = (.55, .7, .85); scene.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam); scene.camera = cam
    for label, loc in {'front': (-2.2, -3.6, 2.2), 'side': (4.2, -.2, 1.1), 'top': (1.2, 1.8, 4.6), 'face': (0, -2.4, 1.1)}.items():
        cam.location = loc
        target = Vector((0, -.25, .45)) if label != 'face' else Vector((0, -.8, .85))
        cam.rotation_euler = (target - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = 50 if label != 'face' else 85
        scene.render.filepath = str(review / f'darby-{label}.png')
        bpy.ops.render.render(write_still=True)
