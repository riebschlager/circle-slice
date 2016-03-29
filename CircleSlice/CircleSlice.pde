static int NUMBER_OF_SLICES = 6;
static float ROTATION_FACTOR = 1f;

PImage src;

void setup() {

  size(3675, 3675);
  src = loadImage("photo-1441906363162-903afd0d3d52.jpeg");

  if (src.width != width || src.height != height) {
    src.resize(width, height);
  }

  image(src, 0, 0);
  int sliceSize = floor(height / NUMBER_OF_SLICES);

  for (int i = 0; i < NUMBER_OF_SLICES; i++) {
    PImage slice = slice(height - (sliceSize * i), height - (sliceSize * i), src);
    pushMatrix();
    translate(width / 2, height / 2);
    rotate(PI / NUMBER_OF_SLICES * (1 + i * ROTATION_FACTOR));
    imageMode(CENTER);
    image(slice, 0, 0);
    popMatrix();
  }

  saveFrame("output/circle-slice-" + year() + "-" + month() + "-" + day() + "-" + hour() + "-" + minute() + "-" + second() + ".png");
  exit();
}

PImage slice(int _width, int _height, PImage _src) {
  PGraphics mask = createGraphics(_width, _height);
  mask.beginDraw();
  mask.ellipseMode(CENTER);
  mask.noStroke();
  mask.ellipse(_width / 2, _height / 2, _width, _height);
  mask.endDraw();
  PImage img = _src.get((width / 2 - _width / 2), (height / 2 - _height / 2), _width, _height);
  img.mask(mask);
  return img;
}