declare module "base32.js" {
  class Encoder {
    constructor(options?: { type?: string; lc?: boolean });
    write(input: Uint8Array): Encoder;
    finalize(): string;
  }

  class Decoder {
    constructor(options?: { type?: string; lc?: boolean });
    write(input: string): Decoder;
    finalize(): number[];
  }

  const base32: {
    Encoder: typeof Encoder;
    Decoder: typeof Decoder;
  };

  export default base32;
}
