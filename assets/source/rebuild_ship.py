"""Fast ship-only rebuild after editing pirate_ship.py. Run with Blender --background --python."""
import bpy,json,math,random
from pathlib import Path
from mathutils import Vector,Euler
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/polygolf-course-kit-v7.blend'))
source=(ROOT/'assets/source/build_course_kit.py').read_text()
helpers=source[source.index('materials = {}'):source.index('# ---------------------------------------------------------------- trees')]
exec(compile(helpers,'asset-helpers','exec'))
col=bpy.data.collections['pirate-ship']
for obj in list(col.objects):
    if obj.type=='MESH':bpy.data.objects.remove(obj,do_unlink=True)
before=set(bpy.data.objects)
exec(compile((ROOT/'assets/source/pirate_ship.py').read_text(),'pirate_ship.py','exec'))
objects=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
out=ROOT/'dist/assets/course-kit.json';kit=json.loads(out.read_text());palette=kit['palette'];indices={tuple(c):i for i,c in enumerate(palette)}
asset={'p':[],'c':[]}
for o in objects:
    me=o.data;me.calc_loop_triangles()
    for tri in me.loop_triangles:
        color=tuple(round(c,4) for c in me.materials[tri.material_index].diffuse_color[:3])
        if color not in indices:indices[color]=len(palette);palette.append(list(color))
        asset['c'].append(indices[color])
        for vi in tri.vertices:
            v=o.matrix_world@me.vertices[vi].co
            asset['p'] += [round(v.x,3),round(v.z,3),round(-v.y,3)]
asset['triangles']=len(asset['c']);asset['height']=round(max(asset['p'][1::3]),3);asset['radius']=round(max(abs(v) for v in asset['p'][0::3]+asset['p'][2::3]),3)
kit['assets']['pirate-ship']=asset;out.write_text(json.dumps(kit,separators=(',',':')))
names=sorted(kit['assets']);large=[n for n in names if kit['assets'][n]['radius']>12];i=large.index('pirate-ship');offset=Vector(((i%3)*720.,-900.-(i//3)*720.,0))
for o in objects:
    for c in list(o.users_collection):c.objects.unlink(o)
    col.objects.link(o);o.location+=offset
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/polygolf-course-kit-v7.blend'))
print(json.dumps({'ship_triangles':asset['triangles'],'kit_bytes':out.stat().st_size}))
