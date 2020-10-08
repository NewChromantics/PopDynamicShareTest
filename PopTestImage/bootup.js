Pop.Debug(`Hello.`);

const RedPixel = [255,0,0,255];
const OutputImage = new Pop.Image();
const Pixels = new Uint8Array(RedPixel);
OutputImage.WritePixels( 1, 1, Pixels, 'RGBA' );
const Png = OutputImage.GetPngData();

Pop.ExitApplication(123);
//  output png to... stdout?
//throw `Now output file`;
