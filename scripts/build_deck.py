"""Generates Pravaah-Deck.pptx, the FAR AWAY 2026 submission deck."""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "docs", "screenshots")

BG = RGBColor(0x02, 0x06, 0x17)
GREEN = RGBColor(0x22, 0xd3, 0x7a)
BLUE = RGBColor(0x3a, 0xa0, 0xff)
RED = RGBColor(0xff, 0x4d, 0x4d)
AMBER = RGBColor(0xff, 0xb0, 0x2e)
INK = RGBColor(0xe9, 0xf0, 0xfa)
MUTED = RGBColor(0x9a, 0xb0, 0xcf)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
SW, SH = prs.slide_width, prs.slide_height


def slide():
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BG
    return s


def bar(s, color):
    b = s.shapes.add_shape(1, 0, 0, Inches(0.14), SH)
    b.fill.solid(); b.fill.fore_color.rgb = color; b.line.fill.background()


def tb(s, x, y, w, h, anchor=MSO_ANCHOR.TOP):
    box = s.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    return tf


def para(tf, text, size, color, bold=False, font="Segoe UI", space=8, align=PP_ALIGN.LEFT, first=False):
    p = tf.paragraphs[0] if first and not tf.paragraphs[0].runs else tf.add_paragraph()
    p.alignment = align; p.space_after = Pt(space)
    r = p.add_run(); r.text = text
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = font
    r.font.color.rgb = color
    return p


def kicker(s, text, color=GREEN):
    tf = tb(s, Inches(0.7), Inches(0.5), Inches(12), Inches(0.5))
    para(tf, text.upper(), 13, color, bold=True, font="Consolas", first=True)


def title(s, text, color=INK, y=0.95, size=40):
    tf = tb(s, Inches(0.7), Inches(y), Inches(12), Inches(1.3))
    para(tf, text, size, color, bold=True, first=True)


def bullets(s, items, x=0.7, y=2.2, w=6.2, size=18):
    tf = tb(s, Inches(x), Inches(y), Inches(w), Inches(4.6))
    for i, (txt, col) in enumerate(items):
        para(tf, txt, size, col, space=14, first=(i == 0))


def pic(s, name, x, y, w):
    path = os.path.join(SHOTS, name)
    if os.path.exists(path):
        s.shapes.add_picture(path, Inches(x), Inches(y), width=Inches(w))


def footer(s, text):
    tf = tb(s, Inches(0.7), Inches(7.0), Inches(12), Inches(0.4))
    para(tf, text, 11, MUTED, font="Consolas", first=True)


# 1 — TITLE
s = slide(); bar(s, GREEN)
tf = tb(s, Inches(0.9), Inches(2.1), Inches(11.5), Inches(3.2))
para(tf, "FAR AWAY 2026   ·   RAILWAYS", 15, BLUE, bold=True, font="Consolas", first=True)
para(tf, "PRAVAAH  प्रवाह", 60, INK, bold=True, space=4)
para(tf, "The Glass-Box Dispatcher", 30, GREEN, bold=True, space=16)
para(tf, "An open, explainable AI co-pilot for the Indian Railways section controller.", 19, MUTED)
footer(s, "Live: garvitsurana271.github.io/pravaah   ·   Code: github.com/garvitsurana271/pravaah   ·   Garvit Surana & team")

# 2 — THE TRAGEDY
s = slide(); bar(s, RED); kicker(s, "the problem, part 1", RED)
title(s, "A signalling failure put two trains on one track")
bullets(s, [
    ("2 June 2023. A wrongly-wired circuit sent the Coromandel Express onto an occupied loop line at 128 km/h near Bahanaga Bazar, Balasore.", INK),
    ("Close to 300 people died. The line had no Kavach.", RED),
    ("A year later a goods train ran a red signal and killed ten more on the Kanchanjunga Express. Again, no Kavach.", MUTED),
], w=11.5, size=20)

# 3 — THE DAILY PROBLEM
s = slide(); bar(s, AMBER); kicker(s, "the problem, part 2", AMBER)
title(s, "Indian Railways still dispatches by hand")
bullets(s, [
    ("A human section controller decides every crossing and every precedence call from experience.", INK),
    ("The control-room software draws charts and shows where trains are. It does not make the decision.", MUTED),
    ("Punctuality fell from 94% to about 74% in three years.", AMBER),
    ("Most of the busiest corridors now run above their rated capacity.", AMBER),
], w=11.5, size=20)

# 4 — THE GAP
s = slide(); bar(s, GREEN); kicker(s, "the gap we fill")
title(s, "Closed systems that cost crores, or nothing at all")
bullets(s, [
    ("Hitachi, Siemens and Alstom sell AI traffic management as closed systems above a thousand crore, and even those stay advisory because controllers do not trust a black box.", INK),
    ("There is no open, India-specific, explainable tool for this.", GREEN),
    ("Our contribution is the combination, not the math: open, explainable, India-specific, with safety as a hard floor.", MUTED),
    ("We did not use reinforcement learning on purpose. The evidence (the Flatland challenge) shows classical optimization beats it and RL has never been deployed.", MUTED),
], w=11.5, size=18)

# 5 — WHAT IT IS
s = slide(); bar(s, BLUE); kicker(s, "the product")
title(s, "A live control room for one busy section", size=34)
pic(s, "control-room.png", 0.7, 2.05, 12.0)
footer(s, "Two dispatchers run on the same trains: the AI optimizer, and first-come-first-served, which is how it is done today.")

# 6 — RESULT
s = slide(); bar(s, GREEN); kicker(s, "the result")
title(s, "Switch the AI off and the delay climbs", size=34)
bullets(s, [
    ("Same trains, same track. The optimizer keeps total delay down by setting smart precedence at each crossing.", INK),
    ("About 20% less delay than the manual first-come-first-served baseline.", GREEN),
    ("It does not move more trains. It protects the important ones, spending a goods train's minutes to save a Superfast's.", MUTED),
    ("13 conflicts resolved automatically, zero unsafe states. Measured by the test suite.", MUTED),
], w=11.5, size=20)

# 7 — GLASS BOX
s = slide(); bar(s, GREEN); kicker(s, "what makes it different")
title(s, "It explains every call in plain words", size=32)
bullets(s, [
    ("Every decision is the optimizer's own working, written out. Nothing is invented.", INK),
    ("\"Held the Express 11 min so the Superfast could cross. Reversing it would cost 1.7 times more.\"", GREEN),
    ("This answers why AI dispatching is not adopted today: controllers do not trust black boxes.", MUTED),
], x=0.7, y=2.0, w=5.7, size=17)
pic(s, "glass-box.png", 6.7, 1.7, 6.0)

# 8 — COPILOT
s = slide(); bar(s, BLUE); kicker(s, "you can question it")
title(s, "Ask the dispatcher anything, offline", size=32)
bullets(s, [
    ("\"Why is 12801 held?\"  \"Is the section safe?\"  \"What would an override cost?\"", INK),
    ("Answers come from the same decision trace. No network call, so the demo cannot break.", MUTED),
    ("The controller stays in charge. The machine just shows the cost of each choice.", MUTED),
], x=0.7, y=2.0, w=5.7, size=17)
pic(s, "glass-box.png", 6.7, 1.7, 6.0)

# 9 — SAFETY FLOOR
s = slide(); bar(s, RED); kicker(s, "the safety floor", RED)
title(s, "It cannot cause a collision, by design", size=32)
bullets(s, [
    ("A separate interlocking layer enforces one train per block and locks single lines to one direction, no matter what the AI does.", INK),
    ("Re-stage the Balasore failure: a route set toward an occupied line is refused.", RED),
    ("Safety is a hard floor. The AI only optimizes inside what is already safe.", MUTED),
], x=0.7, y=2.0, w=5.6, size=16)
pic(s, "safety-hold.png", 6.6, 1.7, 6.1)

# 10 — REAL DATA
s = slide(); bar(s, BLUE); kicker(s, "how real it is")
title(s, "Real stations, real trains, honest simulation")
bullets(s, [
    ("The national map is 8,697 real Indian stations with real coordinates, from the open datameet dataset.", GREEN),
    ("The trains are real services that run this corridor, pulled from the open timetable.", INK),
    ("Live movement is simulated. India has no open real-time feed, so nobody can do live positions without faking them.", MUTED),
    ("The engine is built to sit on a real feed the day a railway grants access.", MUTED),
], w=11.5, size=18)

# 11 — HOW IT WORKS
s = slide(); bar(s, BLUE); kicker(s, "how it works")
title(s, "Two layers, kept separate")
bullets(s, [
    ("Interlocking (safety): one train per block, single lines locked to one direction. Unsafe states are impossible here, in code.", GREEN),
    ("Dispatcher (policy): the AI only picks the order among options that are already safe, and writes down a full trace.", BLUE),
    ("Explanation engine: turns that trace into plain English, grounded in real numbers.", INK),
    ("Pure TypeScript, 100% in the browser, no backend, no API keys, 12 passing tests.", MUTED),
], w=11.5, size=18)

# 12 — SIH + KAVACH
s = slide(); bar(s, GREEN); kicker(s, "it answers a real ask")
title(s, "The Ministry's own problem statement")
bullets(s, [
    ("SIH25022, Ministry of Railways: \"Maximizing section throughput through AI-powered, real-time train traffic control.\"", GREEN),
    ("It sits alongside Kavach, not against it. Kavach is the safety-certified anti-collision layer. Pravaah is the throughput and explainability layer above it.", INK),
    ("It is a prototype and a decision-support concept, not certified train control. We say so plainly.", MUTED),
], w=11.5, size=19)

# 13 — CLOSE
s = slide(); bar(s, GREEN)
tf = tb(s, Inches(0.9), Inches(2.3), Inches(11.5), Inches(3))
para(tf, "Pravaah · प्रवाह", 44, INK, bold=True, first=True)
para(tf, "Open. Explainable. Safe by design. The control-room brain Indian Railways does not have yet.", 22, GREEN, bold=True, space=18)
para(tf, "Try it live, then read the code. Both links below.", 15, MUTED)
footer(s, "garvitsurana271.github.io/pravaah   ·   github.com/garvitsurana271/pravaah   ·   FAR AWAY 2026")

out = os.path.join(ROOT, "Pravaah-Deck.pptx")
prs.save(out)
print("saved", out, "·", len(prs.slides._sldIdLst), "slides")
