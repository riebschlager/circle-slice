PImage src;

void setup() {
  src = loadImage("src-2.jpg");
  size(src.width, src.height);
  background(src);
  image(src, 0, 0);
  int numberOfSlices = 10;
  int sliceSize = floor(src.height / numberOfSlices);
  for (int i = 0; i < numberOfSlices; i++) {
    PImage slice = slice(src.height - (sliceSize * i), src.height - (sliceSize * i), src);
    pushMatrix();
    translate(src.width / 2, src.height / 2);
    rotate(PI / numberOfSlices * (i + 1));
    imageMode(CENTER);
    image(slice, 0, 0);
    popMatrix();
  }
  saveFrame();
}

PImage slice(int _width, int _height, PImage _src) {
  PGraphics mask = createGraphics(_width, _height);
  mask.beginDraw();
  mask.ellipseMode(CENTER);
  mask.noStroke();
  mask.ellipse(_width / 2, _height / 2, _width, _height);
  mask.endDraw();
  PImage img = _src.get((src.width / 2 - _width / 2), (src.height / 2 - _height / 2), _width, _height);
  img.mask(mask);
  return img;
}

