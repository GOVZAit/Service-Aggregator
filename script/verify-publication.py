"""Read-only, unauthenticated publication checks. No private records or credentials are requested."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://govza.pro'
MAX_BYTES = 12 * 1024 * 1024
ADMIN_READ_ENDPOINTS = ('/api/admin/users', '/api/admin/summary', '/api/admin/providers')

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urllib.parse.urlparse(newurl)
        if target.scheme != 'https' or target.hostname not in ('govza.pro', 'www.govza.pro'):
            raise RuntimeError('Unexpected redirect origin or HTTPS downgrade')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

opener = urllib.request.build_opener(SafeRedirect)

def validate_admin_endpoints():
    source = '\n'.join(Path(path).read_text() for path in ('server/admin-routes.ts', 'server/admin-user-routes.ts'))
    registered = set(re.findall(r'''app\.get\(\s*["']([^"']+)["']''', source))
    assert set(ADMIN_READ_ENDPOINTS) <= registered, 'Publication check must use registered admin GET routes'

def get(path, base=BASE):
    req = urllib.request.Request(base + path, headers={'User-Agent': 'GOVZA-publication-check/2', 'Cache-Control': 'no-cache'})
    try:
        response = opener.open(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise RuntimeError('Response exceeds publication-check size limit')
        return response.code, body, response.headers, response.url

def public_catalog():
    status, body, _, _ = get('/api/auto-parts/suppliers')
    assert status == 200, 'Public catalog is unavailable'
    rows = json.loads(body)
    assert isinstance(rows, list) and rows, 'Public catalog must not become empty'
    ids = sorted(row['id'] for row in rows)
    assert len(set(ids)) == len(ids), 'Duplicate catalog identifiers'
    return ids

def save_report(report):
    Path(os.environ['RUNNER_TEMP'], 'publication-check.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as target:
            target.write('## Publication verification\n\n```json\n' + json.dumps(report, indent=2) + '\n```\n')

def main():
    mode = sys.argv[1] if len(sys.argv) == 2 else ''
    assert mode in ('before', 'after'), 'Specify before or after'
    validate_admin_endpoints()
    snapshot = Path(os.environ['RUNNER_TEMP']) / 'govza-catalog-before.json'
    if mode == 'before':
        assert get('/')[0] == 200, 'HTTPS must work before deployment'
        ids = public_catalog()
        snapshot.write_text(json.dumps(ids))
        print(json.dumps({'preflight': 'passed', 'https': True, 'public_catalog_records': len(ids)}))
        return
    report = {'release': os.environ.get('GITHUB_SHA'), 'checks': [], 'all_checks_passed': False,
              'authenticated_admin_operations_tested': False}
    try:
        expected_html = Path('dist/public/index.html').read_text()
        assets = sorted(set(re.findall(r'''(?:src|href)=["'](/assets/[^"']+)["']''', expected_html)))
        assert assets, 'No build assets found'
        for page in ('/', '/doctors', '/auto-parts', '/more', '/profile', '/admin'):
            status, body, _, _ = get(page)
            matched = status == 200 and all(asset in body.decode('utf-8') for asset in assets)
            report['checks'].append({'path': page, 'https_status': status, 'expected_assets': matched})
            assert matched, 'Published page does not match this build: ' + page
        for asset in assets + ['/sw.js']:
            status, body, _, _ = get(asset)
            expected = Path('dist/public' + asset).read_bytes()
            assert status == 200 and hashlib.sha256(body).digest() == hashlib.sha256(expected).digest(), 'Published file differs from build: ' + asset
        report['assets_byte_match'] = True
        for path in ADMIN_READ_ENDPOINTS:
            status, _, headers, _ = get(path)
            no_store = 'no-store' in headers.get('Cache-Control', '')
            # Only status/cache metadata is reported; private response bodies are never printed.
            report['checks'].append({'path': path, 'anonymous_status': status, 'no_store': no_store})
            assert status == 401, 'Anonymous administrative request was not denied: ' + path
            assert no_store, 'Admin denial must not be cached'
        status, _, _, final_url = get('/', base='http://govza.pro')
        assert status == 200 and urllib.parse.urlparse(final_url).scheme == 'https', 'HTTP must redirect to HTTPS'
        report['http_redirects_to_https'] = True
        before = set(json.loads(snapshot.read_text()))
        after = set(public_catalog())
        report.update({'public_records_before': len(before), 'public_records_after': len(after),
                       'previous_public_ids_preserved': before <= after})
        assert before <= after, 'Previously public catalog entries disappeared during release'
        report['all_checks_passed'] = True
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        save_report(report)

if __name__ == '__main__':
    main()
