"""Stream interleaved unsigned I/Q bytes to little-endian complex float32.
Usage: python cu8_to_cf32.py input.cu8 output.cf32
"""
import argparse
from array import array
from pathlib import Path
import sys

def convert(source, destination, chunk_size=1048576):
    if Path(source).resolve() == Path(destination).resolve():
        raise ValueError("Input and output must differ")
    if Path(source).stat().st_size % 2:
        raise ValueError("CU8 input has an incomplete I/Q pair")
    with open(source, "rb") as src, open(destination, "wb") as dst:
        while block := src.read(chunk_size):
            values = array("f", ((b - 127.5) / 128 for b in block))
            if values.itemsize != 4:
                raise RuntimeError("This platform lacks 32-bit array floats")
            if sys.byteorder != "little":
                values.byteswap()
            dst.write(values.tobytes())

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    parser.add_argument("destination")
    args = parser.parse_args()
    convert(args.source, args.destination)
