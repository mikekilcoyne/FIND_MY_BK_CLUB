from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CANVAS_WIDTH = 1920
CANVAS_HEIGHT = 1080
FPS = 30
TOTAL_DURATION = 5.0
START_DELAY = 0.25
CHAR_STEP = 0.065

LINE_1 = "What if building a global"
LINE_2 = "community was easy...?"
FULL_TEXT = f"{LINE_1}\n{LINE_2}"

FONT_PATH = "/System/Library/Fonts/HelveticaNeue.ttc"
FONT_INDEX = 1
FONT_SIZE = 128
TEXT_COLOR = (255, 255, 255, 255)
TEXT_BOX = (170, 372, 1750, 712)
LINE_SPACING = 16


def main() -> None:
    output_dir = Path("assets/video/typeout-transparent-frames")
    if output_dir.exists():
        for path in output_dir.glob("*.png"):
            path.unlink()
    output_dir.mkdir(parents=True, exist_ok=True)

    font = ImageFont.truetype(FONT_PATH, FONT_SIZE, index=FONT_INDEX)
    frame_count = int(TOTAL_DURATION * FPS)

    for frame_index in range(frame_count):
      time = frame_index / FPS
      if time < START_DELAY:
          visible_chars = 0
      else:
          progressed = int((time - START_DELAY) // CHAR_STEP) + 1
          visible_chars = max(0, min(progressed, len(FULL_TEXT)))

      visible_text = FULL_TEXT[:visible_chars]

      image = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), (0, 0, 0, 0))
      draw = ImageDraw.Draw(image)
      draw.multiline_text(
          (TEXT_BOX[0], TEXT_BOX[1]),
          visible_text,
          fill=TEXT_COLOR,
          font=font,
          spacing=LINE_SPACING,
          align="left",
      )

      image.save(output_dir / f"frame-{frame_index:04d}.png")


if __name__ == "__main__":
    main()
