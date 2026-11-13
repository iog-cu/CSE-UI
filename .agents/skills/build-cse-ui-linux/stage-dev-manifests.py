#!/usr/bin/env python3
"""Stage a client manifest export for the browser development bootstrap.

Copies <export>/*.manifest.json into <dist>/dev-manifests/ and writes the
index.json that devBootstrap reads: {manifests: {<manifestID>: {file, version}}}.

The schema version is derived from each manifest processor's own per-version key
sets, because exported manifests are not uniformly version 1 (stats and
craftingjobs are v2-only, classes needs v3, gamesettings needs v4, several
others are v2). Passing version 1 for everything makes roughly a third of them
fail validation, leaving class/race/stat/gear definitions empty.

Usage:
  python3 .agents/skills/build-cse-ui-linux/stage-dev-manifests.py <export-dir> [<dist>/dev-manifests]
"""
import glob
import json
import os
import re
import shutil
import sys

MANIFEST_SRC = os.path.normpath(
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        '..', '..', '..',
        'camelot', 'src', 'mainScreen', 'dataSources', 'manifest',
    )
)


def read_text(path):
    """Read a text file, exiting with a clear message on failure."""
    try:
        with open(path, encoding='utf-8') as handle:
            return handle.read()
    except OSError as error:
        sys.exit(f"error: cannot read {path}: {error}")


def read_json(path):
    """Read a JSON file, exiting with a clear message on failure."""
    text = read_text(path)
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        sys.exit(f"error: {path} is not valid JSON: {error}")


def write_json(path, payload):
    """Write JSON, exiting with a clear message on failure."""
    try:
        with open(path, 'w', encoding='utf-8') as handle:
            json.dump(payload, handle, indent=2)
    except OSError as error:
        sys.exit(f"error: cannot write {path}: {error}")


def processors():
    """Map manifest id -> processor source text."""
    if not os.path.isdir(MANIFEST_SRC):
        sys.exit(f"error: manifest processors not found at {MANIFEST_SRC}")
    by_id = {}
    for path in sorted(glob.glob(os.path.join(MANIFEST_SRC, '*.ts'))):
        text = read_text(path)
        match = re.search(r"export const (\w+ManifestID) = '([^']+)'", text)
        if match:
            by_id[match.group(2)] = text
    if not by_id:
        sys.exit(f"error: no manifest ids found in {MANIFEST_SRC}")
    return by_id


def version_rules(text):
    """Map schema version -> (expected key count, required key names)."""
    rules = {}
    globals_ = {k: int(v) for k, v in re.findall(r"const (num\w+) = (\d+);", text)}
    for block in re.finditer(r"case (\d+):(.*?)(?=\n\s*case \d+:|\n\s*default:)", text, re.S):
        version, body = int(block.group(1)), block.group(2)
        consts = dict(globals_)
        consts.update({k: int(v) for k, v in re.findall(r"const (num\w+) = (\d+);", body)})
        total = None
        match = re.search(r"Object\.keys\(obj\)\.length === (\d+)", body)
        if match:
            total = int(match.group(1))
        else:
            match = re.search(r"Object\.keys\(obj\)\.length === (\w+) \+ (\w+)", body)
            if match and match.group(1) in consts and match.group(2) in consts:
                total = consts[match.group(1)] + consts[match.group(2)]
        if total:
            rules.setdefault(version, (total, set(re.findall(r"'(\w+)' in obj", body))))
    return rules


def pick_version(source, payload, manifest_id):
    """Newest schema version whose rules match the payload's shape."""
    rules = version_rules(source)
    if not rules:
        # Validators that inspect a nested collection (e.g. tags) yield no top-level rule.
        return 1
    if isinstance(payload, dict) and isinstance(payload.get('defs'), list) and payload['defs']:
        sample = payload['defs'][0]
    elif isinstance(payload, dict):
        sample = payload
    else:
        print(f"  warning: {manifest_id} has an unexpected shape; using version 1")
        return 1
    count, keys = len(sample), set(sample.keys())
    matches = [
        version for version, (total, required) in rules.items()
        if total == count and required <= keys
    ]
    if matches:
        return max(matches)
    print(f"  warning: no schema version matches {manifest_id} ({count} keys); using 1")
    return 1


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    export_dir = sys.argv[1]
    if not os.path.isdir(export_dir):
        sys.exit(f"error: export directory not found: {export_dir}")
    dist_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join('camelot', 'dist', 'dev-manifests')

    source_by_id = processors()
    try:
        os.makedirs(dist_dir, exist_ok=True)
    except OSError as error:
        sys.exit(f"error: cannot create {dist_dir}: {error}")

    for stale in glob.glob(os.path.join(dist_dir, '*.manifest.json')):
        try:
            os.remove(stale)
        except OSError as error:
            sys.exit(f"error: cannot remove stale {stale}: {error}")

    index = {'manifests': {}}
    for path in sorted(glob.glob(os.path.join(export_dir, '*.manifest.json'))):
        name = os.path.basename(path)
        manifest_id = name.split('[')[0]
        payload = read_json(path)
        try:
            shutil.copy2(path, os.path.join(dist_dir, name))
        except OSError as error:
            sys.exit(f"error: cannot copy {path}: {error}")
        source = source_by_id.get(manifest_id)
        version = pick_version(source, payload, manifest_id) if source else 1
        index['manifests'][manifest_id] = {'file': name, 'version': version}

    if not index['manifests']:
        sys.exit(f"error: no *.manifest.json files found in {export_dir}")

    write_json(os.path.join(dist_dir, 'index.json'), index)
    print(f"staged {len(index['manifests'])} manifests into {dist_dir}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
