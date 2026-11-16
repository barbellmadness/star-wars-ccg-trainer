#!/usr/bin/env python3
"""Forward the original import command to the shared Node.js validator."""
from pathlib import Path
import subprocess
import sys

if __name__ == "__main__":
    command = Path(__file__).with_name("import_premiere.mjs")
    raise SystemExit(subprocess.call(["node", str(command), *sys.argv[1:]]))
