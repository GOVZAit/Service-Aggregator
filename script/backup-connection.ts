/** libpq does not expand a connection URI supplied as PGDATABASE. Use explicit fields and a private password file. */
export function backupConnection(connectionString: string, passfile: string) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2 || url.hash) {
    throw new Error('Backup requires an explicit PostgreSQL URI with host, user and database.');
  }
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH, HOME: process.env.HOME, LANG: 'C', LC_ALL: 'C',
    PGHOST: decodeURIComponent(url.hostname).replace(/^\[|\]$/g, ''),
    PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGPASSFILE: passfile,
    PGCONNECT_TIMEOUT: '10', PGAPPNAME: 'govza-release-backup',
  };
  const parameters: Record<string, string> = {
    sslmode: 'PGSSLMODE', sslcert: 'PGSSLCERT', sslkey: 'PGSSLKEY', sslrootcert: 'PGSSLROOTCERT',
    sslcrl: 'PGSSLCRL', sslcrldir: 'PGSSLCRLDIR', channel_binding: 'PGCHANNELBINDING',
    ssl_min_protocol_version: 'PGSSLMINPROTOCOLVERSION', ssl_max_protocol_version: 'PGSSLMAXPROTOCOLVERSION',
    options: 'PGOPTIONS', target_session_attrs: 'PGTARGETSESSIONATTRS', application_name: 'PGAPPNAME',
  };
  const seen = new Set<string>();
  for (const [key, value] of url.searchParams) {
    if (!parameters[key] || seen.has(key) || /[\0\r\n]/.test(value)) throw new Error('Unsupported backup connection parameter.');
    env[parameters[key]] = value; seen.add(key);
  }
  const password = decodeURIComponent(url.password);
  const fields = [env.PGHOST!, env.PGPORT!, env.PGDATABASE!, env.PGUSER!, password];
  if (fields.some(value => /[\0\r\n]/.test(value))) throw new Error('Invalid backup connection field.');
  const escape = (value: string) => value.replaceAll('\\', '\\\\').replaceAll(':', '\\:');
  return { env, passwordFile: fields.map(escape).join(':') + '\n' };
}
