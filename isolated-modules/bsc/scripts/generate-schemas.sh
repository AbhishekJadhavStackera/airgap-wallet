#!/bin/bash

node_modules/.bin/ts-json-schema-generator --path 'src/serializer/v3/schemas/definitions/transaction-sign-response-bsc.ts' --tsconfig 'tsconfig.json' -c > src/serializer/v3/schemas/generated/transaction-sign-response-bsc.json
node_modules/.bin/ts-json-schema-generator --path 'src/serializer/v3/schemas/definitions/transaction-sign-request-bsc-typed.ts' --tsconfig 'tsconfig.json' -c > src/serializer/v3/schemas/generated/transaction-sign-request-bsc-typed.json
node_modules/.bin/ts-json-schema-generator --path 'src/serializer/v3/schemas/definitions/transaction-sign-request-bsc.ts' --tsconfig 'tsconfig.json' -c > src/serializer/v3/schemas/generated/transaction-sign-request-bsc.json
