#!/usr/bin/env python3
"""Fix only malformed Swedish order-status literals in Manila Café.

Run from repository root: python3 fixa_orderstatus.py
Makes backups in a temporary directory and validates JS syntax.
"""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import re

STATUS_FIXES = {
    'BestÃ¤llning mottagen': 'Beställning mottagen',
    'FÃ¶rbereds': 'Förbereds',
    'Redo fÃ¶r upphÃ¤mtning': 'Redo för upphämtning',
    'UpphÃ¤mtad': 'Upphämtad',
    'PÃ¥ vÃ¤g': 'På väg',
    'InvÃ¤ntar betalning': 'Inväntar betalning',
    'Betalning mottagen - lagerkontroll krÃ¤vs': 'Betalning mottagen - lagerkontroll krävs',
}
TARGETS = [
    Path('backend/controllers/orderController.js'),
    Path('backend/models/orderModel.js'),
]
EXPECTED_STATUS = [
    'Beställning mottagen', 'Förbereds', 'Redo för upphämtning',
    'Upphämtad', 'På väg', 'Levererad', 'Avbruten'
]


def main():
    missing = [str(path) for path in TARGETS if not path.is_file()]
    if missing:
        print('Hittar inte filerna. Kör från ManilaCafe-projektroten:')
        print('\n'.join(' - ' + p for p in missing))
        return 1

    originals = {p: p.read_text(encoding='utf-8') for p in TARGETS}
    updated = {}
    for path, source in originals.items():
        target = source
        for broken, correct in STATUS_FIXES.items():
            target = target.replace('"' + broken + '"', '"' + correct + '"')
        updated[path] = target

    controller = updated[TARGETS[0]]
    statuses_match = re.search(r'const\s+ALLOWED_ORDER_STATUSES\s*=\s*\[([^\]]+)\]', controller)
    if not statuses_match or not all('"' + val + '"' in statuses_match.group(1) for val in EXPECTED_STATUS):
        print('Statuslistan i orderController.js skiljer sig från den undersökta versionen.')
        print('Inga ändringar har gjorts. Visa filen innan du ändrar något.')
        return 2

    changes = [p for p in TARGETS if updated[p] != originals[p]]
    if not changes:
        print('Statusvärdena är redan rättstavade i dessa filer.')
        print('Om arkivering fortfarande ger HTTP 400, kontrollera att Render kör den här versionen och att rätt backend används.')
        return 0

    backup_dir = Path(tempfile.mkdtemp(prefix='manilacafe-orderstatus-backup-'))
    for path in TARGETS:
        if path in changes:
            backup = backup_dir / path
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup)
            path.write_text(updated[path], encoding='utf-8')
    print('Säkerhetskopior:', backup_dir)
    try:
        for path in TARGETS:
            process = subprocess.run(['node', '--check', str(path)], text=True, capture_output=True)
            if process.returncode:
                raise RuntimeError(f'{path}: {process.stderr or process.stdout}')
    except (OSError, RuntimeError) as err:
        print('Syntaxkontrollen misslyckades:', err)
        for path in changes:
            shutil.copy2(backup_dir / path, path)
        print('Ändringarna har återställts.')
        return 3

    for path in changes:
        print('Rättad:', path)
        for broken, correct in STATUS_FIXES.items():
            matches = originals[path].count('"' + broken + '"')
            if matches:
                print(f'  {broken} -> {correct} ({matches} st)')
    print('Syntax OK. Inga ordrar, databaser eller Stripe-nycklar ändrades.')
    print('OBS: Övriga felkodade texter i filerna har inte ändrats.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
