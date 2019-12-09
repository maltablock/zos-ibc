# zos-ibc-watcher

Nodejs app running on a server that scans all blockchans for events and handles IBC.

## Deplyoment

It can be deployed on any server. For GCP deployment follow these steps:

```bash
npm run build
gcloud app deploy --stop-previous-version
```

## Testing

[Query from within GCP](https://cloud.google.com/sql/docs/postgres/quickstart):

1. Activate Cloud Shell
2. Run `PGDATABASE=zosibcprod gcloud sql connect zos-ibc --user=postgres`
3. Enter postgres user password

## Monitoring

Info/Health check can be seen on [/info or /health](https://maltablock.appspot.com/info).

Past / pending x-transfers can be seen on [/zos](https://maltablock.appspot.com/zos).
