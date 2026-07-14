// APCA (Accessible/Advanced Perceptual Contrast Algorithm) core math, vendored
// verbatim from the reference implementation (apca-w3@0.1.9, Andrew
// Somers/Myndex — https://github.com/Myndex/SAPC-APCA) rather than added as
// an npm dependency, matching this project's existing hct-vendor/ precedent:
// only the ~60 lines this project actually needs (APCAcontrast, sRGBtoY) are
// kept, not the reference package's font-size lookup tables, colorParsley
// dependency, or the alpha-blend/reverse-APCA utilities — none of which a
// contrast solver needs.
//
// APCA's license requires using the exact approved constants unmodified to
// call the result "APCA" — this file is a byte-for-byte port of the SA98G
// "G-4g" constant set and the APCAcontrast/sRGBtoY functions, not a
// reimplementation. Treat as third-party: prefer changing contrast.ts's thin
// wrapper over editing this file.
//
// Two properties this gives that WCAG contrast lacks: (1) a non-linear
// gamma/luminance response tuned to actual perceived contrast rather than a
// raw luminance ratio, and (2) polarity-dependent exponents — light-text-on-
// dark and dark-text-on-light use different exponent pairs (normBG/normTXT
// vs. revBG/revTXT), reflecting that the two aren't perceptually symmetric
// the way a WCAG ratio assumes.

const SA98G = {
  mainTRC: 2.4, // 2.4 exponent for emulating actual monitor perception

  // sRGB coefficients
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,

  // G-4g constants for use with 2.4 exponent
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,

  // G-4g Clamps and Scalers
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
};

// Send linear-light sRGB 0-255 channel values (as from sRGBtoY below).
// Returns a signed float: negative = light text on dark background (WoB),
// positive = dark text on light background (BoW). Do not swap the two
// arguments — polarity is meaningful and intentional, not an implementation
// detail to normalize away.
export function APCAcontrast(txtY: number, bgY: number): number {
  const icp = [0.0, 1.1]; // input range clamp / input error check

  if (isNaN(txtY) || isNaN(bgY) || Math.min(txtY, bgY) < icp[0] || Math.max(txtY, bgY) > icp[1]) {
    return 0.0;
  }

  let SAPC = 0.0;
  let outputContrast = 0.0;

  // Soft clamps Y for either color if it is near black.
  txtY = txtY > SA98G.blkThrs ? txtY : txtY + Math.pow(SA98G.blkThrs - txtY, SA98G.blkClmp);
  bgY = bgY > SA98G.blkThrs ? bgY : bgY + Math.pow(SA98G.blkThrs - bgY, SA98G.blkClmp);

  // Return 0 early for extremely low delta-Y
  if (Math.abs(bgY - txtY) < SA98G.deltaYmin) return 0.0;

  if (bgY > txtY) {
    // Normal polarity: dark text on light background (BoW)
    SAPC = (Math.pow(bgY, SA98G.normBG) - Math.pow(txtY, SA98G.normTXT)) * SA98G.scaleBoW;
    outputContrast = SAPC < SA98G.loClip ? 0.0 : SAPC - SA98G.loBoWoffset;
  } else {
    // Reverse polarity: light text on dark background (WoB) — always negative.
    SAPC = (Math.pow(bgY, SA98G.revBG) - Math.pow(txtY, SA98G.revTXT)) * SA98G.scaleWoB;
    outputContrast = SAPC > -SA98G.loClip ? 0.0 : SAPC + SA98G.loWoBoffset;
  }

  return outputContrast * 100.0;
}

// Send sRGB 8-bit-per-channel values (0-255) — [r, g, b].
export function sRGBtoY(rgb: [number, number, number]): number {
  const simpleExp = (chan: number) => Math.pow(chan / 255.0, SA98G.mainTRC);
  return SA98G.sRco * simpleExp(rgb[0]) + SA98G.sGco * simpleExp(rgb[1]) + SA98G.sBco * simpleExp(rgb[2]);
}
