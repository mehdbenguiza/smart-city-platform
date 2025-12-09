#!/bin/bash
# Plugin pour accepter GraphQL (application/json)
curl -X POST http://localhost:8001/services/parking-service/plugins \
  --data "name=request-transformer" \
  --data "config.add.headers=Content-Type:application/json"

# Plugin pour que SOAP soit accepté même avec text/xml
curl -X POST http://localhost:8001/services/airquality-service/plugins \
  --data "name=pre-function" \
  --data "config.functions=phase('access') local cjson = require('cjson') kong.service.request.set_header('Content-Type', 'text/xml; charset=utf-8')"

echo "Plugins ajoutés ! Rafraîchis le frontend maintenant"
