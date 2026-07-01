(function init(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CommitmentTools = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const MASK_64 = (1n << 64n) - 1n;
  const RATE_BYTES = 136;

  const ROUND_CONSTANTS = [
    0x0000000000000001n,
    0x0000000000008082n,
    0x800000000000808an,
    0x8000000080008000n,
    0x000000000000808bn,
    0x0000000080000001n,
    0x8000000080008081n,
    0x8000000000008009n,
    0x000000000000008an,
    0x0000000000000088n,
    0x0000000080008009n,
    0x000000008000000an,
    0x000000008000808bn,
    0x800000000000008bn,
    0x8000000000008089n,
    0x8000000000008003n,
    0x8000000000008002n,
    0x8000000000000080n,
    0x000000000000800an,
    0x800000008000000an,
    0x8000000080008081n,
    0x8000000000008080n,
    0x0000000080000001n,
    0x8000000080008008n
  ];

  const ROTATION_OFFSETS = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14]
  ];

  function rotl64(value, shift) {
    const amount = BigInt(shift);
    if (amount === 0n) return value & MASK_64;
    return ((value << amount) | (value >> (64n - amount))) & MASK_64;
  }

  function keccakF1600(state) {
    for (const rc of ROUND_CONSTANTS) {
      const c = new Array(5).fill(0n);
      const d = new Array(5).fill(0n);
      const b = new Array(25).fill(0n);

      for (let x = 0; x < 5; x += 1) {
        c[x] =
          state[x] ^
          state[x + 5] ^
          state[x + 10] ^
          state[x + 15] ^
          state[x + 20];
      }

      for (let x = 0; x < 5; x += 1) {
        d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1);
      }

      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & MASK_64;
        }
      }

      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          const newX = y;
          const newY = (2 * x + 3 * y) % 5;
          b[newX + 5 * newY] = rotl64(
            state[x + 5 * y],
            ROTATION_OFFSETS[x][y]
          );
        }
      }

      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          state[x + 5 * y] =
            (b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y]) & b[((x + 2) % 5) + 5 * y])) &
            MASK_64;
        }
      }

      state[0] = (state[0] ^ rc) & MASK_64;
    }
  }

  function absorbBlock(state, block) {
    for (let i = 0; i < RATE_BYTES; i += 1) {
      const laneIndex = Math.floor(i / 8);
      const laneShift = BigInt((i % 8) * 8);
      state[laneIndex] ^= BigInt(block[i]) << laneShift;
      state[laneIndex] &= MASK_64;
    }
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function hexToBytes(hexValue, expectedBytes) {
    const cleaned = String(hexValue).trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
      throw new Error("hex value contains non-hex characters");
    }
    if (cleaned.length % 2 !== 0) {
      throw new Error("hex value must have an even number of characters");
    }
    if (expectedBytes !== undefined && cleaned.length !== expectedBytes * 2) {
      throw new Error(`hex value must be ${expectedBytes} bytes`);
    }

    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
      bytes[i / 2] = Number.parseInt(cleaned.slice(i, i + 2), 16);
    }
    return bytes;
  }

  function keccak256(bytes) {
    const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const state = new Array(25).fill(0n);
    let offset = 0;

    while (input.length - offset >= RATE_BYTES) {
      absorbBlock(state, input.slice(offset, offset + RATE_BYTES));
      keccakF1600(state);
      offset += RATE_BYTES;
    }

    const finalBlock = new Uint8Array(RATE_BYTES);
    finalBlock.set(input.slice(offset));
    finalBlock[input.length - offset] ^= 0x01;
    finalBlock[RATE_BYTES - 1] ^= 0x80;
    absorbBlock(state, finalBlock);
    keccakF1600(state);

    const output = new Uint8Array(32);
    for (let i = 0; i < output.length; i += 1) {
      output[i] = Number((state[Math.floor(i / 8)] >> BigInt((i % 8) * 8)) & 0xffn);
    }
    return output;
  }

  function keccak256Hex(bytes) {
    return `0x${bytesToHex(keccak256(bytes))}`;
  }

  function utf8Bytes(value) {
    return new TextEncoder().encode(value);
  }

  function concatBytes(parts) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;

    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }

    return output;
  }

  function padRightToWord(bytes) {
    const length = Math.ceil(bytes.length / 32) * 32;
    const output = new Uint8Array(length);
    output.set(bytes);
    return output;
  }

  function wordFromBigInt(value) {
    const bigintValue = BigInt(value);
    if (bigintValue < 0n || bigintValue >= 1n << 256n) {
      throw new Error("uint256 value out of range");
    }

    const output = new Uint8Array(32);
    let remaining = bigintValue;
    for (let i = 31; i >= 0; i -= 1) {
      output[i] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
    return output;
  }

  function wordFromBytes32(hexValue) {
    return hexToBytes(hexValue, 32);
  }

  function wordFromAddress(address) {
    const bytes = hexToBytes(normalizeAddress(address).slice(2), 20);
    const output = new Uint8Array(32);
    output.set(bytes, 12);
    return output;
  }

  function normalizeAddress(address) {
    const value = String(address).trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
      throw new Error("wallet address must be 0x-prefixed and 20 bytes");
    }
    return `0x${value.slice(2).toLowerCase()}`;
  }

  function normalizeBytes32(value) {
    const bytes = wordFromBytes32(value);
    return `0x${bytesToHex(bytes)}`;
  }

  function randomBytes32() {
    const bytes = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
      return `0x${bytesToHex(bytes)}`;
    }
    throw new Error("secure random generation is not available in this environment");
  }

  function abiEncodeCommitment({ answer, salt, address, bountyId }) {
    const answerBytes = utf8Bytes(String(answer));
    const answerLength = wordFromBigInt(answerBytes.length);
    const answerTail = concatBytes([answerLength, padRightToWord(answerBytes)]);

    return concatBytes([
      wordFromBigInt(128),
      wordFromBytes32(salt),
      wordFromAddress(address),
      wordFromBigInt(BigInt(bountyId)),
      answerTail
    ]);
  }

  function computeCommitment({ answer, salt, address, bountyId }) {
    return keccak256Hex(abiEncodeCommitment({ answer, salt, address, bountyId }));
  }

  return {
    abiEncodeCommitment,
    bytesToHex,
    computeCommitment,
    concatBytes,
    hexToBytes,
    keccak256,
    keccak256Hex,
    normalizeAddress,
    normalizeBytes32,
    randomBytes32,
    utf8Bytes,
    wordFromAddress,
    wordFromBigInt,
    wordFromBytes32
  };
});
