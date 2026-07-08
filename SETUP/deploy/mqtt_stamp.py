"""Publish a retained SPOG/system/build stamp after a successful deploy (audit §8 W4a).

Every open console learns a new build exists (the app pulses its version badge).
BEST-EFFORT ONLY: a down broker must never fail a deploy. The house broker
speaks WebSockets on 9001 (no raw-TCP 1883 listener), so paho must use the
websockets transport.
"""

import os
import json

from deploy.constants import DIST_DIR
from deploy.routes import routes_hash

MQTT_HOST = os.environ.get('TWIST_MQTT_HOST', '44.44.44.163')
MQTT_PORT = int(os.environ.get('TWIST_MQTT_PORT', '9001'))
MQTT_USER = os.environ.get('TWIST_MQTT_USER', 'guest')
MQTT_PASS = os.environ.get('TWIST_MQTT_PASS', 'guest')


def publish_build_stamp(project_dir):
    build_id = None
    try:
        with open(os.path.join(project_dir, DIST_DIR, 'build-id.json')) as f:
            build_id = json.load(f)
    except OSError:
        pass
    if not build_id:
        print("No dist/build-id.json — skipping MQTT build stamp.")
        return
    payload = json.dumps({
        'buildId': build_id,
        'routesHash': routes_hash(project_dir),
        'ts': int(__import__('time').time() * 1000),
    })
    try:
        import paho.mqtt.publish as mqtt_publish
        mqtt_publish.single(
            'SPOG/system/build', payload, retain=True, qos=0,
            hostname=MQTT_HOST, port=MQTT_PORT, transport='websockets',
            auth={'username': MQTT_USER, 'password': MQTT_PASS},
        )
        print(f"MQTT build stamp published → SPOG/system/build ({build_id.get('short', '?')})")
    except Exception as e:   # noqa: BLE001 — best-effort by design
        print(f"MQTT build stamp skipped ({e.__class__.__name__}: {e}) — consoles won't auto-announce this deploy.")
