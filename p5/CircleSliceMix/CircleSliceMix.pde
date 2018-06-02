PImage src1, src2;

void setup() {
  src1 = loadImage("c1.jpg");
  src2 = loadImage("c2.jpg");
  size(src1.width, src1.height);
  background(src1);
  int numberOfSlices = 6;
  int sliceSize = floor(src1.height / numberOfSlices);
  for (int i = 0; i < numberOfSlices; i++) {
    PImage src = (i % 2 == 0) ? src2 : src1;
    PImage slice = slice(src.height - (sliceSize * i), src.height - (sliceSize * i), src);
    pushMatrix();
    translate(src.width / 2, src.height / 2);
    rotate(TWO_PI / numberOfSlices * (i + 1));
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
  PImage img = _src.get((src1.width / 2 - _width / 2), (src1.height / 2 - _height / 2), _width, _height);
  img.mask(mask);
  return img;
}

