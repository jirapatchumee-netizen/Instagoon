# Encrypted FrostStory backup

`backup.sh` exports a remote D1 database and copies an R2 bucket through an existing rclone remote. It packages both into a CMS archive encrypted to an X.509 certificate. Install Wrangler and rclone and configure their access separately. The script does not create credentials or a scheduled job.

```sh
apps/froststory/scripts/backup.sh DATABASE_NAME RCLONE_REMOTE:BUCKET /absolute/backup/directory /absolute/recipient-certificate.pem
```

The destination must already exist outside the repository. The certificate must have a matching private key held separately and securely. The script temporarily stores the export and media unencrypted in a private temporary directory and removes that directory on normal exit or a caught error. An abrupt termination or machine failure can leave temporary plaintext behind. Use an encrypted temporary volume and check it after a crash. The D1 export and R2 copy happen at different times; this archive is not a consistent snapshot across services.

To inspect a backup, decrypt to a protected temporary location using the recipient certificate and private key. Do not extract archives from untrusted sources.

```sh
openssl cms -decrypt -binary -inform DER -in BACKUP.tar.cms \
  -recip RECIPIENT_CERTIFICATE.pem -inkey PRIVATE_KEY.pem -out /protected/location/restore.tar
```

A real restore requires an isolated D1 database and R2 bucket, verification of both, and a procedure that reapplies account deletions made since the backup. This script does not implement deletion replay, retention, monitoring, automatic restore, or scheduling. Configure and test those before opening beta. The most recent backup can be up to one full backup interval behind live data.
