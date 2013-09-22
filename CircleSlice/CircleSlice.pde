PImage src;

void setup() {
  background(255);
  src = loadImage("http://farm4.staticflickr.com/3037/2936125672_073fdd9f6c_o.jpg");
  size(src.width, src.height);
  image(src, 0, 0);
  for (int i = 0; i < 800; i += 30) {
    PImage slice = slice(src.height - i, src.height - i, src);
    pushMatrix();
    translate(src.width / 2, src.height / 2);
    rotate(0.005 * i);
    imageMode(CENTER);
    image(slice, 0, 0);
    popMatrix();
  }
  saveFrame();
}

void draw() {
}

PImage slice(int _width, int _height, PImage _src) {
  PGraphics mask = createGraphics(_width, _height);
  mask.beginDraw();
  mask.ellipseMode(CENTER);
  mask.ellipse(_width / 2, _height / 2, _width, _height);
  mask.endDraw();
  PImage img = _src.get((src.width / 2 - _width / 2), (src.height / 2 - _height / 2), _width, _height);
  img.mask(mask);
  return img;
}

