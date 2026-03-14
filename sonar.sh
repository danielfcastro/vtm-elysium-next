#!/bin/bash

export SONAR_TOKEN=sqa_936f29d3d9d2219eab60cde534293606b4af8aaf

sonar-scanner \
  -Dsonar.projectKey=vtm-elysium-next \
  -Dsonar.host.url=http://192.168.100.16:9000/ \
  -Dsonar.login=$SONAR_TOKEN \
  -Dsonar.sources=app,src \
  -Dsonar.inclusions=**/*.ts,**/*.tsx,**/*.js,**/*.jsx,**/*.css \
  -Dsonar.exclusions=**/*.test.ts,**/*.test.tsx,**/__tests__/**,node_modules/**,.next/**,out/**,build/**,coverage/**
