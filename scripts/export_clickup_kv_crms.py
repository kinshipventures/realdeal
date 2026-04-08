#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import os
import re
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

WORKSPACE_ID = '9017085020'
FOLDER_ID = '90171097431'
BASE = 'https://api.clickup.com/api/v2'
OUT_ROOT = Path('context/imports/clickup-kv-crms')


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r'[^a-z0-9]+', '-', value)
    return value.strip('-') or 'list'


def api_get(path: str, params: dict | None = None) -> dict:
    token = os.environ.get('CLICKUP_API_KEY')
    if not token:
        raise SystemExit('CLICKUP_API_KEY is missing')
    url = f'{BASE}{path}'
    if params:
        url += '?' + urlencode(params, doseq=True)
    req = Request(url, headers={'Authorization': token, 'Content-Type': 'application/json'})
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


def ms_to_iso(value):
    if value in (None, '', 0, '0'):
        return None
    try:
        ms = int(value)
    except Exception:
        return value
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat().replace('+00:00', 'Z')


def build_option_map(field: dict) -> dict:
    tc = field.get('type_config') or {}
    options = tc.get('options') or []
    out = {}
    for opt in options:
        key = opt.get('id')
        label = opt.get('name') or opt.get('label') or opt.get('value') or opt.get('orderindex')
        if key is not None:
            out[str(key)] = label
    return out


def decode_field_value(field: dict, value):
    if value is None:
        return None
    ftype = field.get('type')
    option_map = build_option_map(field)
    if ftype == 'drop_down':
        return option_map.get(str(value), value)
    if ftype == 'labels':
        if isinstance(value, list):
            return [option_map.get(str(v), v) if not isinstance(v, dict) else option_map.get(str(v.get('id')), v.get('label') or v.get('name') or v) for v in value]
        return option_map.get(str(value), value)
    if ftype == 'checkbox':
        if isinstance(value, bool):
            return value
        return str(value) in {'1', 'true', 'True'}
    if ftype == 'date':
        return ms_to_iso(value)
    if ftype == 'users':
        if isinstance(value, list):
            return [u.get('username') or u.get('email') or u.get('id') or u for u in value]
        return value
    return value


def fetch_all_tasks(list_id: str) -> list[dict]:
    tasks = []
    page = 0
    while True:
        data = api_get(f'/list/{list_id}/task', {
            'page': page,
            'subtasks': 'true',
            'include_closed': 'true',
        })
        batch = data.get('tasks') or []
        tasks.extend(batch)
        if len(batch) < 100:
            break
        page += 1
        time.sleep(0.15)
    return tasks


def normalize_task(task: dict, field_map: dict[str, dict]) -> dict:
    custom_fields = {}
    custom_fields_raw = {}
    for cf in task.get('custom_fields') or []:
        name = cf.get('name') or cf.get('id')
        custom_fields_raw[name] = cf.get('value')
        custom_fields[name] = decode_field_value(field_map.get(cf.get('id'), cf), cf.get('value'))
    return {
        'id': task.get('id'),
        'custom_id': task.get('custom_id'),
        'name': task.get('name'),
        'text_content': task.get('text_content'),
        'description': task.get('description'),
        'url': task.get('url'),
        'status': (task.get('status') or {}).get('status'),
        'status_color': (task.get('status') or {}).get('color'),
        'priority': (task.get('priority') or {}).get('priority') if task.get('priority') else None,
        'date_created': ms_to_iso(task.get('date_created')),
        'date_updated': ms_to_iso(task.get('date_updated')),
        'date_closed': ms_to_iso(task.get('date_closed')),
        'start_date': ms_to_iso(task.get('start_date')),
        'due_date': ms_to_iso(task.get('due_date')),
        'archived': task.get('archived'),
        'parent': task.get('parent'),
        'creator': {
            'id': (task.get('creator') or {}).get('id'),
            'username': (task.get('creator') or {}).get('username'),
            'email': (task.get('creator') or {}).get('email'),
        } if task.get('creator') else None,
        'assignees': [
            {
                'id': a.get('id'),
                'username': a.get('username'),
                'email': a.get('email'),
            }
            for a in (task.get('assignees') or [])
        ],
        'tags': [t.get('name') for t in (task.get('tags') or [])],
        'list': task.get('list'),
        'folder': task.get('folder'),
        'space': task.get('space'),
        'custom_fields': custom_fields,
        'custom_fields_raw': custom_fields_raw,
    }


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for k, v in row.items()})


def main():
    export_dir = OUT_ROOT / datetime.now(timezone.utc).strftime('%Y-%m-%d')
    export_dir.mkdir(parents=True, exist_ok=True)

    folder = api_get(f'/folder/{FOLDER_ID}')
    lists = api_get(f'/folder/{FOLDER_ID}/list', {'archived': 'false'}).get('lists') or []

    schema_frequency = Counter()
    manifest_lists = []

    for lst in lists:
        list_id = lst['id']
        list_name = lst['name']
        slug = slugify(list_name)
        list_dir = export_dir / slug

        fields = (api_get(f'/list/{list_id}/field').get('fields') or [])
        field_map = {field['id']: field for field in fields}
        tasks_raw = fetch_all_tasks(list_id)
        tasks_normalized = [normalize_task(task, field_map) for task in tasks_raw]

        for field_name in {field['name'] for field in fields}:
            schema_frequency[field_name] += 1

        rows = []
        custom_field_names = sorted({name for task in tasks_normalized for name in task['custom_fields'].keys()})
        for task in tasks_normalized:
            row = {
                'id': task['id'],
                'custom_id': task['custom_id'],
                'name': task['name'],
                'status': task['status'],
                'priority': task['priority'],
                'date_created': task['date_created'],
                'date_updated': task['date_updated'],
                'date_closed': task['date_closed'],
                'start_date': task['start_date'],
                'due_date': task['due_date'],
                'url': task['url'],
                'archived': task['archived'],
                'parent': task['parent'],
                'assignees': [a.get('username') or a.get('email') or a.get('id') for a in task['assignees']],
                'tags': task['tags'],
                'text_content': task['text_content'],
                'description': task['description'],
            }
            for name in custom_field_names:
                row[name] = task['custom_fields'].get(name)
            rows.append(row)

        write_json(list_dir / 'fields.json', fields)
        write_json(list_dir / 'tasks.raw.json', tasks_raw)
        write_json(list_dir / 'tasks.flat.json', tasks_normalized)
        write_csv(list_dir / 'tasks.flat.csv', rows, list(rows[0].keys()) if rows else ['id', 'name'])

        manifest_lists.append({
            'id': list_id,
            'name': list_name,
            'slug': slug,
            'task_count_reported': lst.get('task_count'),
            'task_count_exported': len(tasks_raw),
            'field_count': len(fields),
            'includes_subtasks': True,
            'path': str(list_dir),
        })

    manifest = {
        'exported_at': now_utc(),
        'workspace_id': WORKSPACE_ID,
        'folder': {
            'id': folder.get('id'),
            'name': folder.get('name'),
            'space': folder.get('space'),
        },
        'lists': manifest_lists,
        'common_fields': [
            {
                'name': name,
                'present_in_lists': count,
            }
            for name, count in schema_frequency.most_common()
        ],
    }
    write_json(export_dir / 'manifest.json', manifest)
    write_json(export_dir / 'folder.json', folder)

    readme_lines = [
        '# ClickUp KV CRMs export',
        '',
        f'- Exported at: {manifest["exported_at"]}',
        f'- Folder: {folder.get("name")} ({folder.get("id")})',
        f'- Space: {(folder.get("space") or {}).get("name")} ({(folder.get("space") or {}).get("id")})',
        '',
        '## Lists',
    ]
    for item in manifest_lists:
        readme_lines.append(f'- {item["name"]}: {item["task_count_exported"]} rows including subtasks, {item["field_count"]} fields -> `{item["slug"]}/`')
    readme_lines += [
        '',
        'Each list folder contains:',
        '- `fields.json` - full ClickUp field definitions',
        '- `tasks.raw.json` - raw API task payloads',
        '- `tasks.flat.json` - normalized tasks with decoded custom fields',
        '- `tasks.flat.csv` - spreadsheet-friendly export',
        '',
        'Notes:',
        '- Export includes closed tasks and subtasks for completeness.',
        '- `task_count_exported` can be higher than ClickUp list counts because ClickUp list counts do not always include subtasks.',
        '',
        'Manifest: `manifest.json`',
    ]
    (export_dir / 'README.md').write_text('\n'.join(readme_lines) + '\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
