#!/bin/bash
# Regenerate pnpm lockfile
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile=false
