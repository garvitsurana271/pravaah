"""Generates Pravaah-Deck.pptx for FAR AWAY 2026.

Design: dark slides that match the app (#020617), full-bleed product
screenshots that blend into the background, giant single numbers for the key
results, and minimal text. Leads with the live product, not setup."""
import os
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "docs", "screenshots")

BG = RGBColor(0x02, 0x06, 0x17)
GREEN = RGBColor(0x22, 0xD3, 0x7A)
BLUE = RGBColor(0x3A, 0xA0, 0xFF)
RED = RGBColor(0xFF, 0x4D, 0x4D)
INK = RGBColor(0xEC, 0xF2, 0xFB)
MUTED = RGBColor(0x9A, 0xB0, 0xCF)

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


def tb(s, x, y, w, h, anchor=MSO_ANCHOR.TOP):
    box = s.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    return tf


def para(tf, text, size, color, bold=False, font="Segoe UI Semibold", space=8, align=PP_ALIGN.LEFT, first=False):
    p = tf.paragraphs[0] if first and not tf.paragraphs[0].runs else tf.add_paragraph()
    p.alignment = align
    p.space_after = Pt(space)
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = font
    r.font.color.rgb = color
    return p


def footer(s, text):
    tf = tb(s, Inches(0.7), Inches(7.02), Inches(12), Inches(0.4))
    para(tf, text, 10.5, MUTED, font="Consolas", first=True)


def full_bleed(s, name, kicker, caption, kcolor=BLUE):
    """A product screenshot that fills the slide; dark margins blend with bg."""
    path = os.path.join(SHOTS, name)
    if not os.path.exists(path):
        para(tb(s, Inches(1), Inches(3), Inches(11), Inches(1)), f"[missing {name}]", 24, RED, first=True)
        return
    iw, ih = Image.open(path).size
    h = 5.95
    w = h * iw / ih
    if w > 12.4:
        w = 12.4
        h = w * ih / iw
    s.shapes.add_picture(path, Inches((13.333 - w) / 2), Inches(0.62), Inches(w), Inches(h))
    ktf = tb(s, Inches(0.7), Inches(0.2), Inches(12), Inches(0.4))
    para(ktf, kicker.upper(), 12, kcolor, bold=True, font="Consolas", align=PP_ALIGN.CENTER, first=True)
    ctf = tb(s, Inches(0.7), Inches(6.75), Inches(11.93), Inches(0.6))
    para(ctf, caption, 15, INK, align=PP_ALIGN.CENTER, first=True)


def big_number(s, kicker, number, label, sub, ncolor=GREEN):
    ktf = tb(s, Inches(0.7), Inches(1.5), Inches(12), Inches(0.5))
    para(ktf, kicker.upper(), 14, MUTED, bold=True, font="Consolas", align=PP_ALIGN.CENTER, first=True)
    ntf = tb(s, Inches(0.7), Inches(2.2), Inches(12), Inches(2.4))
    para(ntf, number, 150, ncolor, bold=True, align=PP_ALIGN.CENTER, first=True)
    ltf = tb(s, Inches(1.4), Inches(4.95), Inches(10.5), Inches(0.6))
    para(ltf, label, 24, INK, bold=True, align=PP_ALIGN.CENTER, first=True)
    stf = tb(s, Inches(1.9), Inches(5.65), Inches(9.5), Inches(1))
    para(stf, sub, 15, MUTED, align=PP_ALIGN.CENTER, first=True)


def bullets(s, kicker, title_text, items, kcolor=GREEN):
    para(tb(s, Inches(0.8), Inches(0.7), Inches(12), Inches(0.5)), kicker.upper(), 13, kcolor, bold=True, font="Consolas", first=True)
    para(tb(s, Inches(0.8), Inches(1.2), Inches(12), Inches(1.2)), title_text, 36, INK, bold=True, first=True)
    tf = tb(s, Inches(0.8), Inches(2.7), Inches(11.6), Inches(4))
    for i, (t, col) in enumerate(items):
        para(tf, t, 19, col, space=16, first=(i == 0))


# 1 — TITLE
s = slide()
tf = tb(s, Inches(0.9), Inches(2.4), Inches(11.5), Inches(3))
para(tf, "FAR AWAY 2026   ·   RAILWAYS", 14, BLUE, bold=True, font="Consolas", first=True)
para(tf, "PRAVAAH", 66, INK, bold=True, space=2)
para(tf, "The Glass-Box Dispatcher", 28, GREEN, bold=True, space=14)
para(tf, "An open, explainable AI co-pilot for the Indian Railways section controller. Live and working.", 18, MUTED)
footer(s, "LIVE  garvitsurana271.github.io/pravaah      CODE  github.com/garvitsurana271/pravaah")

# 2 — the live product
full_bleed(s := slide(), "control-room.png", "this is real and running", "Two dispatchers on the same trains: an AI optimizer, and how it is done today.")

# 3 — the result
big_number(slide(), "the result", "20%", "less delay than dispatching by hand", "Same trains, same track. The AI just sets smarter precedence at every crossing. The other dispatcher is first-come, first-served, the way it works today.")

# 4 — the glass box
full_bleed(s := slide(), "glass-box.png", "what makes it different", "It explains every call in plain words, from the optimizer's own numbers. No black box.", kcolor=GREEN)

# 5 — safety
full_bleed(s := slide(), "safety-hold.png", "safe by design", "It refuses to cause a collision. Here it re-stages the 2 June 2023 Balasore failure and blocks it.", kcolor=RED)

# 6 — safety number
big_number(slide(), "the safety floor", "0", "unsafe states, ever", "A separate interlocking layer makes a collision impossible, no matter what the AI wants. Balasore, 2023: a route like that killed nearly 300 people.", ncolor=RED)

# 7 — the gap
bullets(slide(), "why this matters", "Closed crore-scale systems, or nothing", [
    ("Indian Railways still dispatches every crossing by hand. Punctuality fell from 94% to about 74% in three years.", INK),
    ("The AI systems that exist (Hitachi, Siemens, Alstom) are closed, cost over a thousand crore, and stay advisory because controllers do not trust a black box.", MUTED),
    ("Nothing open, explainable, and India-specific exists. That is the gap.", GREEN),
    ("We did not use reinforcement learning, on purpose: the evidence shows classical optimization beats it and RL has never been deployed.", MUTED),
])

# 8 — real + how
bullets(slide(), "how real, how it works", "Real data, two honest layers", [
    ("8,697 real Indian stations and real timetabled services, from the open datameet dataset.", GREEN),
    ("Interlocking layer: one train per block, single lines locked to one direction. Unsafe states impossible, in code.", INK),
    ("Dispatcher layer: the AI only orders moves that are already safe, and writes down a full trace.", INK),
    ("Pure TypeScript, runs in the browser, 12 passing tests. Movement is simulated; India has no open live feed, and the engine is built to take one.", MUTED),
])

# 9 — close
s = slide()
tf = tb(s, Inches(0.9), Inches(2.4), Inches(11.5), Inches(3))
para(tf, "Open. Explainable. Safe by design.", 40, INK, bold=True, first=True)
para(tf, "The control-room brain Indian Railways does not have yet. Answers problem statement SIH25022.", 19, GREEN, bold=True, space=18)
para(tf, "Try it live, then read the code.", 15, MUTED)
footer(s, "LIVE  garvitsurana271.github.io/pravaah      CODE  github.com/garvitsurana271/pravaah      FAR AWAY 2026")

out = os.path.join(ROOT, "Pravaah-Deck.pptx")
prs.save(out)
print("saved", out, "·", len(prs.slides._sldIdLst), "slides")
