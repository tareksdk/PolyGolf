"""Darby, the black Labrador easter egg on Willow Park. Executed by build_darby.py inside Blender.

Darby lies in the sphinx pose with front paws stretched forward, facing -Y, origin on the
ground under the chest. Three separately animated parts share one palette:
  darby-body  torso, neck, legs and collar (static)
  darby-head  pivots at the top of the neck so it can lift and tilt
  darby-tail  pivots at the rump so it can wag along the grass
Head and tail objects are authored in body space; build_darby.py subtracts their pivots.
Torso, neck, head and legs are lofted through elliptical sections so they read as one
continuous animal instead of a string of spheres. About 1.5x a real Labrador so Darby
reads from the follow camera.
"""
COAT = '#2b2a30'
SHEEN = '#34333a'
DEEP = '#201f24'
PAD = '#18171b'


def loft(name, color, sections, sides=10, caps=(True, True)):
    """Sections are ((x, y, z), half-width, half-height[, roll]); rings face along the path."""
    verts, faces = [], []
    centers = [Vector(s[0]) for s in sections]
    for i, s in enumerate(sections):
        c, rx, rz = centers[i], s[1], s[2]
        a = centers[max(0, i - 1)]
        b = centers[min(len(centers) - 1, i + 1)]
        t = (b - a).normalized()
        side = Vector((1, 0, 0))
        up = t.cross(side).normalized() * -1
        side = up.cross(t).normalized()
        for k in range(sides):
            ang = k / sides * math.tau
            verts.append(c + side * math.cos(ang) * rx + up * math.sin(ang) * rz)
    n = len(sections)
    for i in range(n - 1):
        for k in range(sides):
            a, b = i * sides + k, i * sides + (k + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    if caps[0]:
        verts.append(centers[0]); faces += [(len(verts) - 1, (k + 1) % sides, k) for k in range(sides)]
    if caps[1]:
        verts.append(centers[-1]); last = (n - 1) * sides
        faces += [(len(verts) - 1, last + k, last + (k + 1) % sides) for k in range(sides)]
    o = poly(name, color, [tuple(v) for v in verts], faces)
    o.data.update()
    return o


# ---------------------------------------------------------------- body
name = 'darby-body'
# One continuous loft from rump to the top of the neck: deep chest, tucked waist.
loft(name, COAT, [
    ((0, .86, .30), .10, .09),
    ((0, .76, .33), .22, .21),
    ((0, .56, .36), .27, .25),
    ((0, .30, .37), .27, .26),
    ((0, .02, .39), .29, .29),
    ((0, -.24, .42), .30, .32),
    ((0, -.40, .50), .25, .28),
    ((0, -.50, .64), .19, .21),
    ((0, -.56, .78), .15, .16),
    ((0, -.58, .86), .08, .09),
], sides=12)
# Folded hind legs: big thighs on each side with paws tucked forward under the belly.
for s in [-1, 1]:
    loft(name, SHEEN, [
        ((s * .14, .82, .32), .05, .06),
        ((s * .20, .72, .32), .14, .19),
        ((s * .22, .56, .27), .16, .21),
        ((s * .22, .40, .20), .12, .15),
        ((s * .22, .30, .14), .05, .06),
    ], sides=9)
    loft(name, DEEP, [
        ((s * .23, .60, .07), .04, .04),
        ((s * .23, .54, .065), .085, .06),
        ((s * .24, .36, .06), .085, .055),
        ((s * .25, .24, .05), .07, .045),
        ((s * .25, .20, .045), .02, .02),
    ], sides=8)
# Front legs: shoulder, forearm on the grass, broad paws.
for s in [-1, 1]:
    loft(name, SHEEN, [
        ((s * .17, -.20, .52), .05, .06),
        ((s * .19, -.30, .42), .12, .16),
        ((s * .19, -.42, .24), .10, .12),
        ((s * .18, -.52, .11), .075, .075),
        ((s * .17, -.82, .075), .065, .065),
        ((s * .17, -.86, .07), .03, .03),
    ], sides=8)
    loft(name, DEEP, [
        ((s * .17, -.80, .06), .04, .04),
        ((s * .17, -.84, .06), .085, .055),
        ((s * .17, -.96, .05), .09, .05),
        ((s * .17, -1.02, .04), .06, .035),
        ((s * .17, -1.04, .035), .02, .02),
    ], sides=8)
    for t in [-1, 0, 1]:
        blob(name, PAD, (s * .17 + t * .045, -1.0, .022), (.026, .03, .02), 1)  # toe pads
# Red collar with a brass tag, seated just into the neck surface.
ring(name, '#b4402e', (0, -.535, .70), .182, .03, 20, 5, rot=(.52, 0, 0))
cyl(name, '#e2b14b', (0, -.725, .565), .03, .012, 8, rot=(1.1, 0, 0))

# ---------------------------------------------------------------- head (pivot 0,-.58,.84)
name = 'darby-head'
# A Labrador head: broad flat skull, clear stop and a deep, square muzzle.
loft(name, COAT, [
    ((0, -.48, .90), .07, .07),
    ((0, -.53, .93), .15, .14),
    ((0, -.63, .95), .18, .16),
    ((0, -.74, .955), .165, .14),
    ((0, -.80, .92), .12, .11),     # stop
    ((0, -.90, .885), .11, .095),
    ((0, -1.00, .875), .10, .085),
    ((0, -1.04, .87), .06, .055),
], sides=10)
loft(name, SHEEN, [                 # lower jaw and lips
    ((0, -.70, .80), .05, .03),
    ((0, -.80, .80), .095, .05),
    ((0, -.96, .81), .085, .045),
    ((0, -1.01, .82), .04, .025),
], sides=8)
blob(name, PAD, (0, -1.045, .895), (.055, .035, .04), 1)       # nose
for s in [-1, 1]:
    ear = loft(name, DEEP, [                                   # soft drop ear
        ((s * .15, -.56, 1.00), .03, .06),
        ((s * .185, -.62, .95), .035, .095),
        ((s * .195, -.66, .85), .03, .085),
        ((s * .185, -.68, .79), .015, .03),
    ], sides=6)
    blob(name, '#4a2f1a', (s * .085, -.815, .985), (.026, .018, .022), 1)   # warm brown eye
    blob(name, '#f2ead8', (s * .078, -.83, .995), (.007, .004, .007), 1)    # catchlight

# ---------------------------------------------------------------- tail (pivot 0,.84,.31)
name = 'darby-tail'
# A thick otter tail that tapers and curls out to Darby's right along the grass.
loft(name, COAT, [
    ((0, .80, .32), .08, .08),
    ((.03, .96, .26), .075, .07),
    ((.10, 1.12, .17), .06, .055),
    ((.20, 1.26, .10), .045, .04),
    ((.30, 1.36, .07), .025, .025),
    ((.33, 1.39, .065), .01, .01),
], sides=7)
bpy.context.view_layer.update()
