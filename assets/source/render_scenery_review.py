import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/polygolf-course-kit-v7.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio atmosphere');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.66,.7,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
for m in bpy.data.materials:
    c=tuple(m.diffuse_color);m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    if bsdf:bsdf.inputs['Base Color'].default_value=c;bsdf.inputs['Roughness'].default_value=.82
for o in scene.objects:o.hide_render=True
light_data=bpy.data.lights.new('Sun','SUN');light_data.energy=2.5;light_data.angle=.08
sun=bpy.data.objects.new('Sun',light_data);scene.collection.objects.link(sun);sun.rotation_euler=(.45,-.6,-.4)
camera_data=bpy.data.cameras.new('Review');camera=bpy.data.objects.new('Review',camera_data);scene.collection.objects.link(camera);scene.camera=camera
camera_data.type='ORTHO'
for name in ['pirate-ship','coastal-headland','alpine-massif']:
    objects=[o for o in bpy.data.collections[name].objects if o.type=='MESH']
    pts=[o.matrix_world@Vector(p) for o in objects for p in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
    center=(lo+hi)/2;size=max(hi-lo)
    camera.location=center+Vector((1.3,-1.6,.95))*size
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.ortho_scale=size*1.25;camera_data.clip_end=size*20
    for o in objects:o.hide_render=False
    scene.render.filepath=str(ROOT/'artifacts'/('review-'+name+'.png'))
    bpy.ops.render.render(write_still=True)
    for o in objects:o.hide_render=True
