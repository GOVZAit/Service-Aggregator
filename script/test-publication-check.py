"""No network: validate actual route inventory and keep denial assertions intact."""
import runpy
from pathlib import Path
module = runpy.run_path('script/verify-publication.py')
module['validate_admin_endpoints']()
assert module['ADMIN_READ_ENDPOINTS'] == ('/api/admin/users', '/api/admin/summary', '/api/admin/providers')
source = Path('script/verify-publication.py').read_text()
assert 'assert status == 401' in source
assert 'assert no_store' in source
assert 'finally:\n        save_report(report)' in source
assert "report['all_checks_passed'] = True" in source
print('Publication checker: registered endpoints, strict denial assertions and failure report verified.')
