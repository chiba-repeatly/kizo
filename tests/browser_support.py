"""Shared browser selection and artifact location for local runs and CI."""
from pathlib import Path
import os
ARTIFACTS = Path(os.environ.get('KIZO_ARTIFACTS', '/workspace/artifacts'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
def launch_browser(playwright):
    executable = os.environ.get('KIZO_CHROMIUM')
    if not executable:
        executable = '/usr/bin/chromium' if Path('/usr/bin/chromium').is_file() else playwright.chromium.executable_path
    return playwright.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox'])
