#!/bin/bash

set -euo pipefail

sudo docker-compose \
    -f ./docker-compose.yml \
    -f ./caddy/docker-compose.yml \
    -f ./dockhand/docker-compose.yml \
    up -d 
