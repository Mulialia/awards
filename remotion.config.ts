import {Config} from '@remotion/cli/config';

// Production defaults for the live-event masters (see README → "Changing output specs").
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709'); // limited-range BT.709 tags (avoids full-range 'yuvj420p' on media servers / LED processors)
Config.setOverwriteOutput(true);

// Optional: point Remotion at an already-installed Chrome / Chromium / headless-shell
// (useful on machines that cannot download Remotion's own browser).
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
