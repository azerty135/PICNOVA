#!/bin/bash
set -e
echo "==> Création des tables de la base de données..."
pnpm --filter @workspace/db run push
echo "==> Démarrage du serveur..."
node artifacts/api-server/dist/index.mjs
